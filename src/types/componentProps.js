import { FormData } from '../types/formTypes';
import PropTypes from 'prop-types';

export const StepComponentProps = {
  formData: FormData.isRequired,
  updateFormData: PropTypes.func.isRequired
};

export const SuccessNotificationProps = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired
};

export const ProgressBarProps = {
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number
};

export const Step4Props = {
  ...StepComponentProps,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired
};