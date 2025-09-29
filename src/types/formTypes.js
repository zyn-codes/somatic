import PropTypes from 'prop-types';

// Form data shape validation
export const PersonalInfo = PropTypes.shape({
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  email: PropTypes.string
});

export const ContactInfo = PropTypes.shape({
  phone: PropTypes.string,
  message: PropTypes.string
});

export const AppointmentDetails = PropTypes.shape({
  timezone: PropTypes.string,
  slot: PropTypes.string,
  agreements: PropTypes.shape({
    terms: PropTypes.bool
  })
});

export const FormData = PropTypes.shape({
  id: PropTypes.string.isRequired,
  personalInfo: PersonalInfo,
  contactInfo: ContactInfo,
  appointmentDetails: AppointmentDetails
});

// Technical data shape validation
export const TechnicalData = PropTypes.shape({
  client: PropTypes.object,
  device: PropTypes.object,
  location: PropTypes.object,
  timestamp: PropTypes.string,
  collectionStatus: PropTypes.shape({
    clientInfo: PropTypes.bool,
    deviceInfo: PropTypes.bool,
    locationInfo: PropTypes.bool
  })
});