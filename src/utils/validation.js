// Form validation utilities
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s-]{8,}$/;

export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address';
  return '';
};

export const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required';
  if (!PHONE_REGEX.test(phone)) return 'Please enter a valid phone number';
  if (phone.length < 8) return 'Phone number is too short';
  if (phone.length > 15) return 'Phone number is too long';
  return '';
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return '';
};

// Form step validation
export const validateStep = (step, formData) => {
  const errors = {};

  switch(step) {
    case 1:
      // Personal Info validation
      const { firstName, lastName, email } = formData.personalInfo || {};
      
      const firstNameError = validateRequired(firstName, 'First name');
      if (firstNameError) errors.firstName = firstNameError;
      
      const lastNameError = validateRequired(lastName, 'Last name');
      if (lastNameError) errors.lastName = lastNameError;
      
      const emailError = validateEmail(email);
      if (emailError) errors.email = emailError;
      break;

    case 2:
      // Contact validation
      const { phone, message } = formData.contactInfo || {};
      
      const phoneError = validatePhone(phone);
      if (phoneError) errors.phone = phoneError;
      
      // Optional message has no validation
      break;

    case 3:
      // Appointment validation
      const { timezone, slot, agreements } = formData.appointmentDetails || {};
      
      if (!timezone) errors.timezone = 'Please select your timezone';
      if (!slot) errors.slot = 'Please select an available time slot';
      if (!agreements?.terms) errors.terms = 'Please agree to the terms';
      break;

    default:
      break;
  }

  return {
    hasErrors: Object.keys(errors).length > 0,
    errors
  };
};

export const getFieldError = (fieldName, value) => {
  switch(fieldName) {
    case 'email':
      return validateEmail(value);
    case 'phone':
      return validatePhone(value);
    case 'firstName':
    case 'lastName':
      return validateRequired(value, fieldName === 'firstName' ? 'First name' : 'Last name');
    default:
      return '';
  }
};