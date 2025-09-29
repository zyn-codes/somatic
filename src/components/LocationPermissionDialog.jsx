import React from 'react';

const LocationPermissionDialog = ({ onAccept, onDecline }) => {
  return (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50" role="dialog" aria-modal="true" aria-label="Location Permission">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
        <div className="flex flex-col items-center">
          <div className="mb-4 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Enable Location Services</h3>
          <p className="text-gray-600 text-center mb-4">
            For enhanced service quality and security, we may location information. This helps us provide localized support and verify submissions. Your privacy is important to us 
          </p>
          <button
            onClick={onAccept}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Alright
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionDialog;