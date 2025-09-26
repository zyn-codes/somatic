import { useState } from 'react';

const Step4 = ({ formData, onSubmit, isSubmitting }) => {
  const [resendStatus, setResendStatus] = useState(null);

  const handleManualResend = async () => {
    if (!onSubmit) return;
    try {
      setResendStatus('sending');
      await onSubmit();
      setResendStatus('sent');
    } catch (e) {
      setResendStatus('error');
    }
  };

  return (
    <div className="space-y-4 fade-in text-center">
      <h2 className="text-2xl font-bold text-blue-800 mb-4 font-inter">Step 4: Confirmation</h2>
      <p className="text-lg text-gray-600">Your slot is reserved. Expect confirmation email within 10 minutes.</p>
      <p className="text-sm text-gray-500">Join 100+ satisfied clients who've transformed their sessions.</p>
      <div className="text-green-600 text-4xl">✔</div>
      <div className="mt-4 text-sm text-gray-400">
        Reference ID: {formData?.id || 'Processing...'}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleManualResend}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Resend Confirmation'}
        </button>
        {resendStatus === 'sent' && <p className="text-sm text-green-600 mt-2">Resend successful</p>}
        {resendStatus === 'error' && <p className="text-sm text-red-600 mt-2">Resend failed</p>}
      </div>
    </div>
  );
};

export default Step4;