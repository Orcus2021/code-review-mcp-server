interface ValidationBase {
  isValid: boolean;
}

interface ValidationInvalid extends ValidationBase {
  isValid: false;
  errorMessage: string;
}

interface ValidationValid<T> extends ValidationBase {
  isValid: true;
  data: T;
}

export type ValidationResult<T> = ValidationInvalid | ValidationValid<T>;
