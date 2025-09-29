import { useState } from 'react';
import { getLocation } from '../utils/geolocation';

const Step4 = ({ formData, onSubmit, isSubmitting }) => {
  const [showLocationMsg, setShowLocationMsg] = useState(false);
  const [locationState, setLocationState] = useState(null);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    // Show a small explanatory message before requesting location
    setShowLocationMsg(true);

    // Attempt to get location; if it fails or user denies, continue flow
    try {
      const loc = await getLocation();
      setLocationState(loc);
    } catch (e) {
      setLocationState({ error: true });
    }

    // Small delay so user can read the message
    setTimeout(async () => {
      // Request Notification permission non-blocking
      try {
        if ('Notification' in window && Notification.requestPermission) {
          // Show explanatory notice before asking for notification permission
          // This request is intentionally non-blocking; we proceed regardless
          await Notification.requestPermission().catch(() => {});
        }
      } catch (e) {
        // ignore
      }

      // Proceed with submission regardless of permission outcomes
      onSubmit();
    }, 700);
  };

  return (
    <div className="space-y-6 fade-in text-center">
      <h2 className="text-2xl font-bold mb-6 text-white/90">Almost There!</h2>

      <div className="p-6 rounded-lg bg-white/5 border border-white/10">
        <div className="space-y-4">
          <p className="text-lg text-white/90">Review Your Information</p>

          <div className="text-left space-y-3">
            <div>
              <span className="text-white/60 text-sm">Name:</span>
              <p className="text-white/90">{formData.personalInfo?.firstName} {formData.personalInfo?.lastName}</p>
            </div>

            <div>
              <span className="text-white/60 text-sm">Email:</span>
              <p className="text-white/90">{formData.personalInfo?.email}</p>
            </div>

            <div>
              <span className="text-white/60 text-sm">Phone:</span>
              <p className="text-white/90">{formData.contactInfo?.phone}</p>
            </div>

            <div>
              <span className="text-white/60 text-sm">Scheduled Time:</span>
              <p className="text-white/90">
                {formData.appointmentDetails?.timezone} - Slot {formData.appointmentDetails?.slot}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-lg text-white/90">
        Ready to confirm your free consultation call?
      </p>

      <div className="text-sm text-white/60">
        You'll receive a confirmation email with call details shortly.
      </div>

      {showLocationMsg && (
        <div className="text-sm text-center text-white/70 p-3 bg-white/3 rounded-md max-w-md mx-auto">
          We ask for your location to help prevent automated/spam submissions. If you decline, that's fine — the booking will still complete.
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isSubmitting}
        className="primary-btn w-full max-w-md mx-auto mt-6 pulse-anim"
      >
        {isSubmitting ? 'Confirming...' : 'Book your free call now →'}
      </button>
    </div>
  );
};

export default Step4;