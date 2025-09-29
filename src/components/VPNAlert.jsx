import React from 'react';

const VPNAlert = ({ onClose }) => {
  return (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50" role="dialog" aria-modal="true" aria-label="VPN/Proxy Alert">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
        <div className="flex flex-col items-center">
          <div className="mb-4 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">VPN/Proxy Detected</h3>
          <p className="text-gray-600 text-center mb-4">
            For security reasons, we require a direct connection to our service. Please disable your VPN or proxy to continue.
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default VPNAlert;