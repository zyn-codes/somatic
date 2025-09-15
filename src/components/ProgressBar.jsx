const ProgressBar = ({ currentStep }) => {
  return (
    <div className="flex justify-between mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex-1 text-center">
          <div
            className={`w-10 h-10 mx-auto rounded-full text-lg flex items-center justify-center transition-all duration-300 ${
              step < currentStep ? 'bg-blue-600 text-white' : step === currentStep ? 'bg-blue-400 text-white' : 'bg-gray-300 text-gray-600'
            }`}
          >
            {step < currentStep ? '✔' : step}
          </div>
          <p className="text-sm mt-2 font-inter">Step {step}</p>
        </div>
      ))}
    </div>
  );
};

export default ProgressBar;