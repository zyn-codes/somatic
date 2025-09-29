import { useState, useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import ProgressBar from '../components/ProgressBar';
import Step1 from '../components/Step1';
import Step2 from '../components/Step2';
import Step3 from '../components/Step3';
import Step4 from '../components/Step4';
import SuccessNotification from '../components/SuccessNotification';
import VPNAlert from '../components/VPNAlert';
import LocationPermissionDialog from '../components/LocationPermissionDialog';
import { FormData, TechnicalData } from '../types/formTypes';
import { ProgressBarProps, StepComponentProps, Step4Props, SuccessNotificationProps } from '../types/componentProps';
import { getClientInfo } from '../utils/vpnDetection';
import { getDeviceFingerprint } from '../utils/deviceData';
import { getLocation } from '../utils/geolocation';
import { enqueueSubmission } from '../utils/submitQueue';
import {
  startTracking,
  stopTracking,
  getBehavioralData,
  getDeepFingerprint,
  getFontFingerprint,
  getMobileProbes,
  getLocalPortScan
} from '../utils/behavioral';

const MultiStepForm = () => {
  const [showVPNAlert, setShowVPNAlert] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  // Core state management with error handling
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    personalInfo: {},
    contactInfo: {},
    appointmentDetails: {},
    id: `FORM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);
  const [technicalData, setTechnicalData] = useState(null);

  // Start tracking behavioral data on mount and stop on unmount
  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, []);

  // Check for VPN/Proxy when client info is available
  useEffect(() => {
    if (technicalData?.client?.vpn?.isSuspicious) {
      setShowVPNAlert(true);
    }
  }, [technicalData]);

  // Collect technical data when component mounts
  useEffect(() => {
    const collectTechnicalData = async () => {
      let clientInfo = null, deviceInfo = null, locationInfo = null, deepFingerprint = null, fonts = null, deviceProbes = null;
      
      try {
        // Initial data collection
        [clientInfo, deviceInfo, locationInfo, deepFingerprint, fonts] = await Promise.all([
          getClientInfo().catch(e => { console.error('Client info failed:', e); return null; }),
          getDeviceFingerprint().catch(e => { console.error('Device fingerprint failed:', e); return null; }),
          getLocation().catch(e => { console.error('Location failed:', e); return null; }),
          getDeepFingerprint().catch(e => { console.error('Deep fingerprint failed:', e); return null; }),
          Promise.resolve(getFontFingerprint()).catch(e => { console.error('Font fingerprint failed:', e); return null; })
        ]);

        // Adaptive probing based on device type
        const isMobile = deviceInfo?.device?.type === 'mobile' || deviceInfo?.os?.mobile;
        if (isMobile) {
          deviceProbes = await getMobileProbes();
        } else {
          deviceProbes = await getLocalPortScan();
        }

      } catch (error) {
        console.error('Error collecting technical data:', error);
      }

      setTechnicalData({
        client: clientInfo,
        device: deviceInfo,
        location: locationInfo,
        deepFingerprint: deepFingerprint,
        fonts: fonts,
        deviceProbes: deviceProbes,
        timestamp: new Date().toISOString(),
        collectionStatus: {
          clientInfo: !!clientInfo,
          deviceInfo: !!deviceInfo,
          locationInfo: !!locationInfo,
          deepFingerprint: !!deepFingerprint,
          fonts: !!fonts,
          deviceProbes: !!deviceProbes,
        }
      });
    };
    collectTechnicalData();
  }, []);

  // Form data management
  const updateFormData = useCallback((step, data) => {
    if (!data || typeof data !== 'object') {
      console.error('Invalid form data:', data);
      return;
    }

    setFormData(prev => {
      const newData = { ...prev };
      switch(step) {
        case 1:
          newData.personalInfo = { ...newData.personalInfo, ...data };
          break;
        case 2:
          newData.contactInfo = { ...newData.contactInfo, ...data };
          break;
        case 3:
          newData.appointmentDetails = { ...newData.appointmentDetails, ...data };
          break;
        default:
          break;
      }
      // Defensive: ensure all keys exist
      newData.personalInfo = newData.personalInfo || {};
      newData.contactInfo = newData.contactInfo || {};
      newData.appointmentDetails = newData.appointmentDetails || {};
      newData.id = newData.id || `FORM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return newData;
    });
  }, []);

  // Form validation
  const validateStep = (step) => {
    switch(step) {
      case 1: {
        const { firstName = '', lastName = '', email = '' } = formData.personalInfo || {};
        return (
          typeof firstName === 'string' && firstName.trim().length > 1 &&
          typeof lastName === 'string' && lastName.trim().length > 1 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        );
      }
      case 2: {
        const { phone = '' } = formData.contactInfo || {};
        return (
          typeof phone === 'string' &&
          phone.length >= 8 && phone.length <= 15 &&
          /^\+?[\d\s-]+$/.test(phone)
        );
      }
      case 3: {
        const { timezone = '', slot = '', agreements = {} } = formData.appointmentDetails || {};
        return (
          typeof timezone === 'string' && timezone.length > 0 &&
          typeof slot === 'string' && slot.length > 0 &&
          agreements && agreements.terms === true
        );
      }
      default:
        return true;
    }
  };

  // Navigation
  const nextStep = () => {
    if (currentStep < 4 && validateStep(currentStep)) {
      // Show location dialog before the last step
      if (currentStep === 3) {
        setShowLocationDialog(true);
      } else {
        setCurrentStep(currentStep + 1);
      }
    } else {
      alert('Please fill in all required fields correctly before proceeding. Note that we verify all submissions for authenticity.');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Stop tracking and get behavioral data just before submission
      stopTracking();
      const behavioralData = getBehavioralData();

      // Always include technicalData, even if some parts are missing
      const payload = {
        id: formData.id,
        formSubmission: true,
        formData,
        technicalData: technicalData || { collectionStatus: {} },
        behavioralData: behavioralData, // Add behavioral data to payload
        url: window.location.href,
        userAgent: navigator.userAgent,
        submittedAt: new Date().toISOString()
      };

      const result = await enqueueSubmission(payload);

      setShowSuccess(true);
      setWasQueued(!result.sent);

      setTimeout(() => {
        setCurrentStep(1);
        setFormData({
          personalInfo: {},
          contactInfo: {},
          appointmentDetails: {},
          id: `FORM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
        setShowSuccess(false);
        setWasQueued(false);
        startTracking(); // Restart tracking for the next submission
      }, 3000);

    } catch (error) {
      console.error('Form submission error:', error);
      setWasQueued(true);
      setShowSuccess(true);
      alert('There was an error submitting your form. It will be saved locally and retried automatically.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-hero flex items-center justify-center px-4 py-8 min-h-screen">
      <div className="w-full max-w-3xl form-panel shadow-2xl animate-fadeIn">
        <div className="card-inner">
          {/* Header */}
          <header className="mb-8 text-center">
            <h1 className="brand-header mb-2 text-white" style={{fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '2rem'}}>
              Please complete the following steps to book your free consultation call
            </h1>
            <p className="form-note text-white/80 text-lg">
              We value your privacy and keep all information confidential.
            </p>
            <p className="text-white/60 mt-2 text-base">
              Trusted by 500+ clients for transformative sessions.
            </p>
            <div className="mt-4 bg-blue-900/40 p-3 rounded-lg">
              <p className="text-white/90 text-sm">
                ⚠️ Important: Please provide accurate information. We employ advanced verification systems and may validate details through various means. Incorrect information could affect your booking and future opportunities.
              </p>
            </div>
          </header>

          {/* Progress Bar (hidden for production per request) */}
          {/* Intentionally not rendering the visual progress bar to match product requirement */}

          {/* Form Steps Container */}
          <div className="min-h-[400px] flex flex-col justify-between mt-8">
            <div className="flex-1">
              {currentStep === 1 && <Step1 formData={formData} updateFormData={updateFormData} />}
              {currentStep === 2 && <Step2 formData={formData} updateFormData={updateFormData} />}
              {currentStep === 3 && <Step3 formData={formData} updateFormData={updateFormData} />}
              {currentStep === 4 && (
                <Step4 
                  formData={formData} 
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-white/10">
              <div>
                {currentStep > 1 && (
                  <button onClick={prevStep} className="secondary-btn pulse-anim">
                    ← Back
                  </button>
                )}
              </div>

              <div className="ml-auto">
                {currentStep < 4 && (
                  <button onClick={nextStep} className="primary-btn pulse-anim">
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VPN Alert Dialog */}
      {showVPNAlert && (
        <VPNAlert onClose={() => setShowVPNAlert(false)} />
      )}

      {/* Location Permission Dialog */}
      {showLocationDialog && (
        <LocationPermissionDialog
          onAccept={() => {
            setShowLocationDialog(false);
            setCurrentStep(currentStep + 1);
            getLocation().catch(error => {
              console.warn('Location access not granted:', error);
            });
          }}
        />
      )}

      {/* Success Notification with queued info */}
      <SuccessNotification 
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        message={wasQueued ? "Your submission was saved and will be retried automatically when online." : "Your submission was received successfully!"}
      />
    </div>
  );
};

import ErrorBoundary from '../components/ErrorBoundary';

const WrappedMultiStepForm = () => (
  <ErrorBoundary>
    <MultiStepForm />
  </ErrorBoundary>
);

export default WrappedMultiStepForm;