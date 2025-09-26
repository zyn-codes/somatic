import { useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const Step2 = ({ formData, updateFormData }) => {
  const [phoneError, setPhoneError] = useState('');
  
  const handlePhoneChange = (value) => {
    try {
      // Update via parent-provided updater for consistency
      updateFormData(2, { phone: value });
      // Clear error when input changes
      setPhoneError('');
    } catch (error) {
      console.error('Error updating phone:', error);
      setPhoneError('Invalid phone number format');
    }
  };

  const handleMessageChange = (e) => {
    updateFormData(2, { message: e.target.value });
  };

  const handleVipChange = (e) => {
    updateFormData(2, { isVip: e.target.checked });
  };

  return (
    <div className="space-y-4 fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-4 font-inter">Step 2: Contact Details</h2>
      
      {/* Phone Input with proper validation */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
        <div className="phone-input-container">
          <PhoneInput
            international
            countryCallingCodeEditable={false}
            defaultCountry="US"
            value={formData.contactInfo?.phone || ''}
            onChange={handlePhoneChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
        {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Secondary Email (optional)</label>
        <input 
          type="email" 
          placeholder="backup@example.com" 
          value={formData.contactInfo?.secondaryEmail || ''}
            onChange={(e) => updateFormData(2, { secondaryEmail: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition"
        />
      </div>

      {/* Message Box */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Additional Message</label>
        <textarea
          placeholder="Enter any additional information..."
          value={formData.contactInfo?.message || ''}
          onChange={handleMessageChange}
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 transition resize-none"
        />
      </div>

      {/* VIP Checkbox */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="vip-checkbox"
          checked={formData.contactInfo?.isVip || false}
          onChange={handleVipChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
        />
        <label htmlFor="vip-checkbox" className="text-sm font-medium text-gray-700 cursor-pointer">
          Priority Processing (VIP Fast Track)
        </label>
      </div>
    </div>
  );
};

export default Step2;