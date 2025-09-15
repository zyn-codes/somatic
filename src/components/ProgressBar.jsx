const ProgressBar = ({ currentStep }) => {
  return (
    <div className="flex justify-between mb-12 relative">
      {/* Connecting line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
      <div
        className="absolute top-5 left-0 h-0.5 bg-blue-500 transition-all duration-500 ease-in-out"
        style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
      />
      
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex-1 text-center relative z-10">
          <div
            className={`w-12 h-12 mx-auto rounded-full text-lg flex items-center justify-center transition-all duration-300 transform
              ${step < currentStep 
                ? 'bg-blue-600 text-white scale-110 shadow-lg' 
                : step === currentStep 
                  ? 'bg-blue-400 text-white scale-110 shadow-lg ring-4 ring-blue-100' 
                  : 'bg-gray-300 text-gray-600'
              }
              ${step <= currentStep ? 'hover:scale-125' : 'hover:scale-105'}
            `}
          >
            {step < currentStep ? '✔' : step}
          </div>
          <p className={`text-sm mt-3 font-inter transition-colors duration-300 
            ${step <= currentStep ? 'text-blue-800 font-semibold' : 'text-gray-500'}`}>
            Step {step}
          </p>
          {step === currentStep && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgressBar;