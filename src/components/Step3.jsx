import { useState, useEffect } from 'react';
import { validateRequired } from '../utils/validation';
import { LoadingSpinner } from '../utils/animations';

const Step3 = ({ formData, updateFormData }) => {
  const [local, setLocal] = useState({
    timezone: formData?.appointmentDetails?.timezone || '',
    slot: formData?.appointmentDetails?.slot || '',
    agreements: formData?.appointmentDetails?.agreements || { terms: false }
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (formData?.appointmentDetails) {
      setLocal(formData.appointmentDetails);
    }
  }, [formData]);

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setLocal(prev => ({ ...prev, [name]: value }));
    
    // Show validation in progress
    setIsValidating(true);
    
    // Debounced validation
    setTimeout(() => {
      setErrors(prev => ({ ...prev, [name]: validateRequired(value, name === 'timezone' ? 'Time zone' : 'Time slot') }));
      setIsValidating(false);
    }, 300);

    updateFormData(3, { [name]: value });
  };

  const handleSelectBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateRequired(local[name], name === 'timezone' ? 'Time zone' : 'Time slot') }));
  };

  const handleAgreementChange = (e) => {
    const { checked } = e.target;
    const newAgreements = { ...local.agreements, terms: checked };
    setLocal(prev => ({ ...prev, agreements: newAgreements }));
    
    setTouched(prev => ({ ...prev, terms: true }));
    setErrors(prev => ({ ...prev, terms: !checked ? 'Please agree to the terms' : '' }));

    updateFormData(3, { agreements: newAgreements });
  };

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-2xl font-bold mb-6 text-white/90">Schedule Your Call</h2>
      
      <div className="space-y-4">
        {/* Timezone Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/80">Your Time Zone</label>
          <div className="relative">
            <select
              name="timezone"
              className={`w-full p-4 bg-white/5 border ${
                touched.timezone && errors.timezone ? 'border-red-400' : 'border-white/10'
              } rounded-lg focus:ring-2 focus:ring-[rgba(72,148,137,0.2)] focus:border-[rgba(72,148,137,1)] transition-all duration-300 text-white/90`}
              value={local.timezone}
              onChange={handleSelectChange}
              onBlur={handleSelectBlur}
            >
              <option value="">Select Time Zone</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              {isValidating && <LoadingSpinner />}
              {touched.timezone && errors.timezone && (
                <span className="text-red-400 text-sm bg-[rgb(18,24,31)]/80 px-2">{errors.timezone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Time Slot Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/80">Available Slots</label>
          <div className="relative">
            <select
              name="slot"
              className={`w-full p-4 bg-white/5 border ${
                touched.slot && errors.slot ? 'border-red-400' : 'border-white/10'
              } rounded-lg focus:ring-2 focus:ring-[rgba(72,148,137,0.2)] focus:border-[rgba(72,148,137,1)] transition-all duration-300 text-white/90`}
              value={local.slot}
              onChange={handleSelectChange}
              onBlur={handleSelectBlur}
            >
              <option value="">Select Available Slot</option>
              <option value="1">Monday, 10:00 AM - free consultation phone call</option>
              <option value="2">Monday, 2:00 PM - free consultation phone call</option>
              <option value="3">Tuesday, 11:00 AM - free consultation phone call</option>
              <option value="4">Tuesday, 3:00 PM - free consultation phone call</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              {isValidating && <LoadingSpinner />}
              {touched.slot && errors.slot && (
                <span className="text-red-400 text-sm bg-[rgb(18,24,31)]/80 px-2">{errors.slot}</span>
              )}
            </div>
          </div>
        </div>

        {/* Terms Agreement */}
        <div className="flex items-center space-x-3 mt-6">
          <input
            type="checkbox"
            id="terms"
            checked={local.agreements?.terms || false}
            onChange={handleAgreementChange}
            className={`h-5 w-5 text-[rgb(72,148,137)] focus:ring-[rgba(72,148,137,0.5)] border-white/20 rounded cursor-pointer bg-white/5 ${
              touched.terms && errors.terms ? 'border-red-400' : ''
            }`}
          />
          <label htmlFor="terms" className="text-sm font-medium text-white/80 cursor-pointer select-none">
            I understand this is a consultation call and agree to the terms of service
          </label>
        </div>
        {touched.terms && errors.terms && (
          <p className="text-red-400 text-sm mt-1">{errors.terms}</p>
        )}
      </div>
    </div>
  );
};

export default Step3;