import { useState } from 'react';

const Step4 = ({ formData, onSubmit, isSubmitting }) => {
  const handleManualResend = () => {
    if (!isSubmitting) {
      onSubmit();
    }
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

      <button
        type="button"
        onClick={handleManualResend}
        disabled={isSubmitting}
        className="primary-btn mx-auto mt-6"
      >
        {isSubmitting ? 'Confirming...' : 'Book your free call now'}
      </button>
    </div>
  );
};

export default Step4;