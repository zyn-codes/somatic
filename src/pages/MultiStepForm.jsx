import { useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import Step1 from '../components/Step1';
import Step2 from '../components/Step2';
import Step3 from '../components/Step3';
import Step4 from '../components/Step4';

const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      console.log(`Navigated to Step ${currentStep + 1}`);
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
            {currentStep === 1 && <Step1 />}
            {currentStep === 2 && <Step2 />}
            {currentStep === 3 && <Step3 />}
            {currentStep === 4 && <Step4 />}
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