import { useState, useEffect } from 'react';
import { getFieldError } from '../utils/validation';
import { LoadingSpinner } from '../utils/animations';

const Step1 = ({ formData, updateFormData }) => {
  const [formState, setFormState] = useState({
    firstName: formData?.personalInfo?.firstName || '',
    lastName: formData?.personalInfo?.lastName || '',
    email: formData?.personalInfo?.email || ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (formData?.personalInfo) {
      setFormState(formData.personalInfo);
    }
  }, [formData]);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    
    // Show validation in progress
    setIsValidating(true);
    
    // Debounced validation
    setTimeout(() => {
      setErrors(prev => ({ ...prev, [name]: getFieldError(name, value) }));
      setIsValidating(false);
    }, 300);

    updateFormData(1, { [name]: value });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: getFieldError(name, formState[name]) }));
  };

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-2xl font-bold mb-6 text-white/90">Personal Information</h2>
      
      {/* First Name */}
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input
          type="text"
          name="firstName"
          value={formState.firstName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="First name"
          className={`w-full p-4 bg-white/5 border ${
            touched.firstName && errors.firstName ? 'border-red-400' : 'border-white/10'
          } rounded-lg focus:ring-2 focus:ring-[rgba(72,148,137,0.2)] focus:border-[rgba(72,148,137,1)] transition-all duration-300 text-white/90 placeholder-white/50`}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          {isValidating && <LoadingSpinner />}
          {touched.firstName && errors.firstName ? (
            <span className="text-red-400 text-sm bg-[rgb(18,24,31)]/80 px-2">{errors.firstName}</span>
          ) : (
            <span className="text-white/40 text-sm bg-[rgb(18,24,31)]/80 px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">First name</span>
          )}
        </div>
      </div>

      {/* Last Name */}
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input
          type="text"
          name="lastName"
          value={formState.lastName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Last name"
          className={`w-full p-4 bg-white/5 border ${
            touched.lastName && errors.lastName ? 'border-red-400' : 'border-white/10'
          } rounded-lg focus:ring-2 focus:ring-[rgba(72,148,137,0.2)] focus:border-[rgba(72,148,137,1)] transition-all duration-300 text-white/90 placeholder-white/50`}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          {isValidating && <LoadingSpinner />}
          {touched.lastName && errors.lastName ? (
            <span className="text-red-400 text-sm bg-[rgb(18,24,31)]/80 px-2">{errors.lastName}</span>
          ) : (
            <span className="text-white/40 text-sm bg-[rgb(18,24,31)]/80 px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">Last name</span>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input
          type="email"
          name="email"
          value={formState.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Email address"
          className={`w-full p-4 bg-white/5 border ${
            touched.email && errors.email ? 'border-red-400' : 'border-white/10'
          } rounded-lg focus:ring-2 focus:ring-[rgba(72,148,137,0.2)] focus:border-[rgba(72,148,137,1)] transition-all duration-300 text-white/90 placeholder-white/50`}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          {isValidating && <LoadingSpinner />}
          {touched.email && errors.email ? (
            <span className="text-red-400 text-sm bg-[rgb(18,24,31)]/80 px-2">{errors.email}</span>
          ) : (
            <span className="text-white/40 text-sm bg-[rgb(18,24,31)]/80 px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">We value your privacy</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step1;