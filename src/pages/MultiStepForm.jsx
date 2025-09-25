import { useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import Step1 from '../components/Step1';
import Step2 from '../components/Step2';
import Step3 from '../components/Step3';
import Step4 from '../components/Step4';

const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    personalInfo: {},
    contactInfo: {},
    appointmentDetails: {},
    id: `FORM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });

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
        const { firstName, lastName, email } = formData.personalInfo;
        return firstName?.trim() && lastName?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      case 2:
        const { phone } = formData.contactInfo;
        return phone?.trim().length >= 10;
      case 3:
        const { timezone, slot, agreements } = formData.appointmentDetails;
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-4xl w-full bg-white shadow-neumorphic rounded-lg p-8 transform transition-all duration-500 hover:shadow-lg">
        <ProgressBar currentStep={currentStep} />
        <div className="min-h-[400px] flex flex-col justify-between">
          <div className="flex-1">
            {currentStep === 1 && <Step1 formData={formData} updateFormData={updateFormData} />}
            {currentStep === 2 && <Step2 formData={formData} updateFormData={updateFormData} />}
            {currentStep === 3 && <Step3 formData={formData} updateFormData={updateFormData} />}
            {currentStep === 4 && <Step4 formData={formData} />}
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
        </div>
      </div>
    </div>
  );
};

export default MultiStepForm;