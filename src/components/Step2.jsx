import { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import { validatePhone } from '../utils/validation';
import { LoadingSpinner } from '../utils/animations';

const Step2 = ({ formData, updateFormData }) => {
  const [local, setLocal] = useState({
    phone: formData?.contactInfo?.phone || '',
    message: formData?.contactInfo?.message || '',
    isVip: formData?.contactInfo?.isVip || false
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (formData?.contactInfo) {
      setLocal(formData.contactInfo);
    }
  }, [formData]);

  const handlePhoneChange = (value) => {
    setLocal(prev => ({ ...prev, phone: value }));
    
    // Show validation in progress
    setIsValidating(true);
    
    // Debounced validation
    setTimeout(() => {
      setErrors(prev => ({ ...prev, phone: validatePhone(value) }));
      setIsValidating(false);
    }, 300);

    updateFormData(2, { phone: value });
  };

  const [showNotificationMsg, setShowNotificationMsg] = useState(false);

  const handlePhoneBlur = () => {
    setTouched(prev => ({ ...prev, phone: true }));
    setErrors(prev => ({ ...prev, phone: validatePhone(local.phone) }));
    // Show notification permission message after phone is entered
    if (local.phone && !showNotificationMsg) {
      setShowNotificationMsg(true);
    }
  };

  const handleNotificationPermission = async () => {
    setShowNotificationMsg(false);
    try {
      if ('Notification' in window && Notification.requestPermission) {
        await Notification.requestPermission().catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  };

  const handleMessageChange = (e) => {
    const { value } = e.target;
    setLocal(prev => ({ ...prev, message: value }));
    updateFormData(2, { message: value });
  };

  const handleVipChange = (e) => {
    const { checked } = e.target;
    setLocal(prev => ({ ...prev, isVip: checked }));
    updateFormData(2, { isVip: checked });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="mb-4 text-blue-900/40 p-2 rounded-lg text-center">
        <span className="text-white/90 text-xs">Accurate contact details help us reach you and verify your booking.</span>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-white/90">Contact Details</h2>

      {/* Phone Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">Phone Number</label>
        <div className="relative">
          <PhoneInput
            international
            defaultCountry="US"
            value={local.phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            className={`w-full p-4 bg-white/5 border ${
              touched.phone && errors.phone ? 'border-red-400' : 'border-white/10'
            } rounded-lg focus-within:ring-2 focus-within:ring-[rgba(72,148,137,0.2)] focus-within:border-[rgba(72,148,137,1)] transition-all duration-300 text-white/90`}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            {isValidating && <LoadingSpinner />}
            {touched.phone && errors.phone && (
              <span className="text-red-400 text-sm bg-[rgb(18,24,31)]/80 px-2">{errors.phone}</span>
            )}
          </div>
        </div>
      </div>

      {showNotificationMsg && (
        <div className="text-sm text-center text-white/70 p-3 bg-white/3 rounded-md max-w-md mx-auto">
          To hear back from us quickly, please allow notifications. You can still complete your booking if you decline.
          <button
            type="button"
            onClick={handleNotificationPermission}
            className="primary-btn w-full max-w-md mx-auto mt-4 pulse-anim"
          >
            Allow Notifications
          </button>
        </div>
      )}

      {/* Message Box */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">
          Why are you hoping to do Somatic work and what are you hoping to work on?
        </label>
        <div className="relative">
          <textarea
            placeholder="Share your goals and what brings you here..."
            value={local.message}
            onChange={handleMessageChange}
            rows={4}
            className="w-full p-4 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-[rgba(72,148,137,0.2)] focus:border-[rgba(72,148,137,1)] transition-all duration-300 text-white/90 placeholder-white/50 resize-none"
          />
          <div className="absolute right-4 bottom-4 text-white/40 text-sm">
            Optional
          </div>
        </div>
      </div>

      {/* Free consultation slot checkbox */}
      <div className="flex items-center space-x-3 mt-6">
        <input
          type="checkbox"
          id="vip-checkbox"
          checked={local.isVip}
          onChange={handleVipChange}
          className="h-5 w-5 text-[rgb(72,148,137)] focus:ring-[rgba(72,148,137,0.5)] border-white/20 rounded cursor-pointer bg-white/5"
        />
        <label htmlFor="vip-checkbox" className="text-sm font-medium text-white/80 cursor-pointer select-none">
          Reserve a free consultation phone call (recommended)
        </label>
      </div>
    </div>
  );
};

export default Step2;