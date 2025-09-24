import { useEffect } from 'react';

const Step4 = ({ formData }) => {
  useEffect(() => {
    const submitFormData = async () => {
      try {
        const response = await fetch('/api/log-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            formSubmission: true,
            submittedAt: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages ? navigator.languages.join(',') : navigator.language
          })
        });

        if (!response.ok) {
          throw new Error('Form submission failed');
        }

        const data = await response.json();
        console.log('Form submitted successfully:', data);
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    };

    if (formData) {
      submitFormData();
    }
  }, [formData]);

  return (
    <div className="space-y-4 fade-in text-center">
      <h2 className="text-2xl font-bold text-blue-800 mb-4 font-inter">Step 4: Confirmation</h2>
      <p className="text-lg text-gray-600">Your slot is reserved. Expect confirmation email within 10 minutes.</p>
      <p className="text-sm text-gray-500">Join 100+ satisfied clients who've transformed their sessions.</p>
      <div className="text-green-600 text-4xl">✔</div>
      <div className="mt-4 text-sm text-gray-400">
        Reference ID: {formData?.id || 'Processing...'}
      </div>
    </div>
  );
};

export default Step4;