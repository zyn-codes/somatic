import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const SuccessNotification = ({ show, onClose, message, duration = 3000 }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (show) {
      // Reset progress when shown
      setProgress(0);
      
      // Animate progress bar
      const interval = 50; // Update every 50ms
      const steps = duration / interval;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        setProgress((currentStep / steps) * 100);
        
        if (currentStep >= steps) {
          clearInterval(timer);
          onClose();
        }
      }, interval);
      
      // Cleanup timer on unmount or when show changes
      return () => clearInterval(timer);
    }
  }, [show, onClose, duration]);
  
  if (!show) return null;
  
  return (
    <div className="fixed bottom-4 right-4 max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transform transition-transform duration-300 ease-in-out" role="alert">
      <div className="flex items-start">
        {/* Success Icon */}
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Verification Successful
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {message || 'Your submission has been verified and is being processed.'}
          </p>
        </div>
        
        {/* Close Button */}
        <div className="ml-4 flex-shrink-0 flex">
          <button
            type="button"
            className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onClose}
            aria-label="Close notification"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-3 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

SuccessNotification.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.string,
  duration: PropTypes.number
};

export default SuccessNotification;