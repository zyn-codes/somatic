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

const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    personalInfo: {},
    contactInfo: {},
    appointmentDetails: {},
    id: `FORM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const validateStep = (step) => {
    switch(step) {
      case 1:
        const { firstName, lastName, email } = formData.personalInfo || {};
        return firstName?.trim() && lastName?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      case 2:
        const { phone } = formData.contactInfo || {};
        // Check if phone is valid and has correct length
        return phone && phone.length >= 8 && phone.length <= 15 && /^\+?[\d\s-]+$/.test(phone);
      case 3:
        const { timezone, slot, agreements } = formData.appointmentDetails || {};
        return timezone && slot && agreements?.terms;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < 4 && validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      console.log(`Navigated to Step ${currentStep + 1}`, formData);
    } else {
      alert('Please fill in all required fields correctly before proceeding.');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      console.log(`Navigated to Step ${currentStep - 1}`);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Send form data and technical data to server's visit endpoint
      const response = await fetch('/api/log-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formSubmission: true,
          formData,
          technicalData,
          url: window.location.href,
          userAgent: navigator.userAgent,
          submittedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Submission failed');

      // Show success notification
      setShowSuccess(true);

      // Reset form after short timeout
      setTimeout(() => {
        setCurrentStep(1);
        setFormData({
          personalInfo: {},
          contactInfo: {},
          appointmentDetails: {},
          id: `FORM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
        setShowSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Form submission error:', error);
      alert('There was an error submitting your form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-neumorphic rounded-lg p-8 transform transition-all duration-500 hover:shadow-lg">
        <ProgressBar currentStep={currentStep} />
        <div className="min-h-[400px] flex flex-col justify-between">
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
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-md"
              >
                ← Back
              </button>
            ) : <div />}
            {currentStep < 4 && (
              <button
                onClick={nextStep}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-md ml-auto"
              >
                Next →
              </button>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            )}
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-auto"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
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