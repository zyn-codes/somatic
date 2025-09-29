// Form validation utilities with enhanced patterns
const EMAIL_REGEX = /^(?!.*\.{2})[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/; // E.164 format
const NAME_REGEX = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s'-]+$/; // Unicode letters, spaces, hyphens, apostrophes
const MESSAGE_MAX_LENGTH = 1000;

// Common disposable email domains
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'throwawaymail.com',
  // Add more as needed
];

// Profanity/spam check - basic implementation
const containsProfanity = (text) => {
  const profanityList = ['spam', 'test', 'fuck', 'shit'];
  return profanityList.some(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );
};

export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  if (email.length > 254) return 'Email address is too long';
  if (!EMAIL_REGEX.test(email)) {
    if (!email.includes('@')) return 'Email address must contain an @ symbol';
    if (!email.includes('.')) return 'Email address must contain a domain';
    return 'Please enter a valid email address';
  }
  
  const [local, domain] = email.split('@');
  if (local.length > 64) return 'The part before @ is too long';
  if (domain.length > 255) return 'The domain name is too long';
  
  if (DISPOSABLE_DOMAINS.includes(domain.toLowerCase())) {
    return 'Please use a non-disposable email address';
  }

  return '';
};

export const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required';
  
  // Remove all non-digit characters for validation
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 8) return 'Phone number must have at least 8 digits';
  if (digits.length > 15) return 'Phone number must have at most 15 digits';
  
  if (!PHONE_REGEX.test(digits)) {
    if (digits.startsWith('0')) return 'Phone number should not start with 0';
    return 'Please enter a valid phone number';
  }

  // Check for repeating patterns that might indicate spam
  const repeatingPattern = /(.)\1{4,}/;
  if (repeatingPattern.test(digits)) {
    return 'Please enter a genuine phone number';
  }

  return '';
};

export const validateRequired = (value, fieldName, options = {}) => {
  const {
    minLength = 0,
    maxLength = 255,
    pattern = null,
    customValidation = null
  } = options;

  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }

  const strValue = String(value).trim();

  if (minLength && strValue.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }

  if (maxLength && strValue.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`;
  }

  if (pattern && !pattern.test(strValue)) {
    return `${fieldName} contains invalid characters`;
  }

  if (typeof customValidation === 'function') {
    const customError = customValidation(strValue);
    if (customError) return customError;
  }

  return '';
};

// Form step validation
export const validateStep = (step, formData) => {
  const errors = {};

  switch(step) {
    case 1:
      // Personal Info validation with enhanced checks
      const { firstName, lastName, email } = formData.personalInfo || {};
      
      const firstNameError = validateRequired(firstName, 'First name', {
        minLength: 2,
        maxLength: 50,
        pattern: NAME_REGEX,
        customValidation: (value) => {
          if (containsProfanity(value)) return 'Please enter your real name';
          if (/\d/.test(value)) return 'Name should not contain numbers';
          return null;
        }
      });
      if (firstNameError) errors.firstName = firstNameError;
      
      const lastNameError = validateRequired(lastName, 'Last name', {
        minLength: 2,
        maxLength: 50,
        pattern: NAME_REGEX,
        customValidation: (value) => {
          if (containsProfanity(value)) return 'Please enter your real name';
          if (/\d/.test(value)) return 'Name should not contain numbers';
          return null;
        }
      });
      if (lastNameError) errors.lastName = lastNameError;

      // Additional name validation
      if (firstName === lastName) {
        errors.lastName = 'Last name should be different from first name';
      }
      
      const emailError = validateEmail(email);
      if (emailError) errors.email = emailError;
      break;

    case 2:
      // Contact validation with message checks
      const { phone, message } = formData.contactInfo || {};
      
      const phoneError = validatePhone(phone);
      if (phoneError) errors.phone = phoneError;
      
      // Message validation
      if (message) {
        if (message.length > MESSAGE_MAX_LENGTH) {
          errors.message = `Message must be no more than ${MESSAGE_MAX_LENGTH} characters`;
        }
        if (containsProfanity(message)) {
          errors.message = 'Please keep your message professional';
        }
        // Check for excessive links/URLs
        const urlCount = (message.match(/https?:\/\/\S+/g) || []).length;
        if (urlCount > 2) {
          errors.message = 'Too many links in message';
        }
        // Check for repetitive text
        const words = message.toLowerCase().split(/\s+/);
        const wordCounts = {};
        words.forEach(word => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
          if (wordCounts[word] > 5 && word.length > 3) {
            errors.message = 'Message appears to be spam (repetitive text)';
          }
        });
      }
      break;

    case 3:
      // Appointment validation with enhanced checks
      const { timezone, slot, agreements } = formData.appointmentDetails || {};
      const now = new Date();
      
      if (!timezone) {
        errors.timezone = 'Please select your timezone';
      } else {
        try {
          // Verify timezone is valid
          Intl.DateTimeFormat(undefined, { timeZone: timezone });
        } catch (e) {
          errors.timezone = 'Invalid timezone selected';
        }
      }

      if (!slot) {
        errors.slot = 'Please select an available time slot';
      } else {
        const slotTime = new Date(slot);
        // Check if slot is in the past
        if (slotTime < now) {
          errors.slot = 'Please select a future time slot';
        }
        // Check if slot is too far in the future (e.g., > 3 months)
        const threeMonthsFromNow = new Date(now.setMonth(now.getMonth() + 3));
        if (slotTime > threeMonthsFromNow) {
          errors.slot = 'Please select a time slot within the next 3 months';
        }
        // Check if slot is during acceptable hours (e.g., 9 AM - 6 PM)
        const hour = slotTime.getHours();
        if (hour < 9 || hour >= 18) {
          errors.slot = 'Please select a time between 9 AM and 6 PM';
        }
      }

      // Agreements validation
      const requiredAgreements = ['terms', 'privacy'];
      requiredAgreements.forEach(agreement => {
        if (!agreements?.[agreement]) {
          errors[agreement] = `Please agree to the ${agreement.replace('_', ' ')}`;
        }
      });

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