import { useState, useEffect } from 'react';
import ProgressBar from '../components/ProgressBar';
import Step1 from '../components/Step1';
import Step2 from '../components/Step2';
import Step3 from '../components/Step3';
import Step4 from '../components/Step4';
import SuccessNotification from '../components/SuccessNotification';
import { getClientInfo } from '../utils/vpnDetection';
import { getDeviceFingerprint } from '../utils/deviceData';
import { getLocation } from '../utils/geolocation';
import { enqueueSubmission } from '../utils/submitQueue';

const MultiStepForm = () => {
  // Core state management
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    personalInfo: {},
    contactInfo: {},
    appointmentDetails: {},
    id: `FORM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);
  const [technicalData, setTechnicalData] = useState(null);

  // Collect technical data when component mounts
  useEffect(() => {
    const collectTechnicalData = async () => {
      try {
        const [clientInfo, deviceInfo, locationInfo] = await Promise.all([
          getClientInfo(),
          getDeviceFingerprint(),
          getLocation()
        ]);

        setTechnicalData({
          client: clientInfo,
          device: deviceInfo,
          location: locationInfo,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error collecting technical data:', error);
      }
    };

    collectTechnicalData();
  }, []);

  // Form data management
  const updateFormData = (step, data) => {
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
      return newData;
    });
  };

  // Form validation
  const validateStep = (step) => {
    switch(step) {
      case 1:
        const { firstName, lastName, email } = formData.personalInfo || {};
        return firstName?.trim() && lastName?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      case 2:
        const { phone } = formData.contactInfo || {};
        return phone && phone.length >= 8 && phone.length <= 15 && /^\+?[\d\s-]+$/.test(phone);
      case 3:
        const { timezone, slot, agreements } = formData.appointmentDetails || {};
        return timezone && slot && agreements?.terms;
      default:
        return true;
    }
  };

  // Navigation
  const nextStep = () => {
    if (currentStep < 4 && validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      alert('Please fill in all required fields correctly before proceeding.');
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
      const payload = {
        id: formData.id,
        formSubmission: true,
        formData,
        technicalData,
        url: window.location.href,
        userAgent: navigator.userAgent,
        submittedAt: new Date().toISOString()
      };

      const result = await enqueueSubmission(payload);

      if (result.sent) {
        setShowSuccess(true);
        setWasQueued(false);
      } else {
        setWasQueued(true);
        setShowSuccess(true);
      }

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
      }, 3000);

    } catch (error) {
      console.error('Form submission error:', error);
      alert('There was an error submitting your form. It will be saved locally and retried automatically.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl form-panel">
        <div className="card-inner">
          {/* Header */}
          <header className="mb-8 text-center">
            <h1 className="brand-header mb-2">
              Please complete the following steps to book your free consultation call
            </h1>
            <p className="form-note">
              We value your privacy and keep all information confidential.
            </p>
          </header>

          {/* Progress Bar */}
          <ProgressBar currentStep={currentStep} />

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
                  <button onClick={prevStep} className="secondary-btn">
                    ← Back
                  </button>
                )}
              </div>

              <div className="ml-auto">
                {currentStep < 4 && (
                  <button onClick={nextStep} className="primary-btn">
                    Next →
                  </button>
                )}

                {currentStep === 4 && (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="primary-btn"
                  >
                    {isSubmitting ? 'Submitting...' : 'Book your free call now'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      <SuccessNotification 
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default MultiStepForm;