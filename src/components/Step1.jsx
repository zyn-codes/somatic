import { useState, useEffect } from 'react';

const Step1 = ({ formData, updateFormData }) => {
  const [formState, setFormState] = useState({
    firstName: formData?.personalInfo?.firstName || '',
    lastName: formData?.personalInfo?.lastName || '',
    email: formData?.personalInfo?.email || ''
  });

  const [errors, setErrors] = useState({});

  const validateField = (name, value) => {
    switch(name) {
      case 'firstName':
      case 'lastName':
        return value.trim() ? '' : `${name === 'firstName' ? 'First' : 'Last'} name is required`;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Valid email is required';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    updateFormData(1, { [name]: value });
  };

  useEffect(() => {
    if (formData?.personalInfo) {
      setFormState(formData.personalInfo);
    }
  }, [formData]);

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-2xl font-bold text-blue-800 mb-6 font-inter">Step 1: Personal Info</h2>
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input
          type="text"
          name="firstName"
          value={formState.firstName}
          onChange={handleChange}
          placeholder="First Name"
          className={`w-full p-4 border ${errors.firstName ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md`}
        />
        {errors.firstName ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 text-sm bg-white px-2">{errors.firstName}</span>
        ) : (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm bg-white px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">E.g., John</span>
        )}
      </div>
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input
          type="text"
          name="lastName"
          value={formState.lastName}
          onChange={handleChange}
          placeholder="Last Name"
          className={`w-full p-4 border ${errors.lastName ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md`}
        />
        {errors.lastName ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 text-sm bg-white px-2">{errors.lastName}</span>
        ) : (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm bg-white px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">E.g., Doe</span>
        )}
      </div>
      <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
        <input
          type="email"
          name="email"
          value={formState.email}
          onChange={handleChange}
          placeholder="Email"
          className={`w-full p-4 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md`}
        />
        {errors.email ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 text-sm bg-white px-2">{errors.email}</span>
        ) : (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm bg-white px-2 transition-opacity duration-300 opacity-60 hover:opacity-100">We value your privacy</span>
        )}
      </div>
    </div>
  );
};

export default Step1;