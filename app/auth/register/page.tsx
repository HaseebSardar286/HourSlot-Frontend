'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import styles from './register.module.css';

const CATEGORIES = [
  { id: 'salon', icon: 'fa-scissors', label: 'Salon' },
  { id: 'clinic', icon: 'fa-house-medical', label: 'Clinic' },
  { id: 'spa', icon: 'fa-spa', label: 'Spa' },
  { id: 'dental', icon: 'fa-tooth', label: 'Dental' },
  { id: 'fitness', icon: 'fa-dumbbell', label: 'Fitness' },
  { id: 'auto', icon: 'fa-car', label: 'Auto Service' },
  { id: 'education', icon: 'fa-graduation-cap', label: 'Education' },
  { id: 'legal', icon: 'fa-scale-balanced', label: 'Legal' },
  { id: 'other', icon: 'fa-building', label: 'Other' },
];

const TOTAL_STEPS = 3; // Step 1: Role, Step 2: Info, Step 3: Business (conditional) or Password

function getPasswordStrength(password: string): { level: number; text: string; color: string } {
  if (!password) return { level: 0, text: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 1, text: 'Weak', color: 'weak' };
  if (score <= 3) return { level: 2, text: 'Medium', color: 'medium' };
  return { level: 3, text: 'Strong', color: 'strong' };
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'CUSTOMER',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessCategory: '',
    businessDescription: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isBusiness = formData.role === 'BUSINESS_OWNER';
  const totalSteps = isBusiness ? 3 : 2;

  // Validation
  const errors: Record<string, string | null> = {};
  if (touched.firstName && !formData.firstName) errors.firstName = 'Required.';
  if (touched.lastName && !formData.lastName) errors.lastName = 'Required.';
  if (touched.email) {
    if (!formData.email) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email address.';
  }
  if (touched.phoneNumber) {
    if (!formData.phoneNumber) errors.phoneNumber = 'Phone number is required.';
    else if (!/^[0-9+ ]{10,15}$/.test(formData.phoneNumber)) errors.phoneNumber = 'Invalid format (10-15 chars).';
  }
  if (touched.password) {
    if (!formData.password) errors.password = 'Password is required.';
    else if (formData.password.length < 6) errors.password = 'At least 6 characters.';
  }
  if (touched.confirmPassword) {
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm.';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords don\'t match.';
  }
  if (isBusiness && touched.businessName && !formData.businessName) errors.businessName = 'Business name is required.';

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const canProceedStep1 = formData.role !== '';

  const canProceedStep2 = () => {
    return formData.firstName && formData.lastName && formData.email &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.phoneNumber && /^[0-9+ ]{10,15}$/.test(formData.phoneNumber) &&
      formData.password && formData.password.length >= 6 &&
      formData.password === formData.confirmPassword;
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Mark all step 2 fields as touched
      setTouched((prev) => ({
        ...prev,
        firstName: true, lastName: true, email: true,
        phoneNumber: true, password: true, confirmPassword: true,
      }));
      if (canProceedStep2()) {
        if (isBusiness) {
          setStep(3);
        } else {
          handleSubmit();
        }
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (isBusiness) {
      setTouched((prev) => ({ ...prev, businessName: true }));
      if (!formData.businessName) return;
    }

    setLoading(true);
    setErrorMessage(null);

    const payload: Record<string, string> = {
      email: formData.email,
      password: formData.password,
      role: formData.role,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
    };

    if (isBusiness) {
      payload.businessName = formData.businessName;
      payload.businessCategory = formData.businessCategory;
      payload.businessDescription = formData.businessDescription;
    }

    try {
      await register(payload);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setLoading(false);
      setErrorMessage(e?.error?.message || 'Registration failed. Please try again.');
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  if (success) {
    return (
      <>
        <div className="auth-page-bg" />
        <div className={styles.authWrapper}>
          <div className={`glass-card ${styles.authCard}`}>
            <div className={styles.successState}>
              <span className={styles.successIcon}>
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-secondary)' }}></i>
              </span>
              <h2 className={styles.successTitle}>Account Created!</h2>
              <p className={styles.successMessage}>
                {isBusiness
                  ? 'Your business registration is pending verification. You\'ll be notified once approved.'
                  : 'Your account has been created successfully. Redirecting to login...'}
              </p>
              <Link href="/auth/login" className="btn btn-primary btn-block">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="auth-page-bg" />
      <div className={styles.authWrapper}>
        <div className={`glass-card ${styles.authCard}`}>
          <div className={styles.authLogo}>
            <Image
              src="/logo-hourslot.png"
              alt="HourSlot"
              width={150}
              height={48}
              className={styles.authLogoImg}
              priority
            />
          </div>

          <div className={styles.authHeader}>
            <h2 className={styles.authTitle}>Create Account</h2>
            <p className={styles.authSubtitle}>Join HourSlot to book or list services</p>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressBar}>
            {Array.from({ length: totalSteps }, (_, i) => {
              const stepNum = i + 1;
              return (
                <div key={stepNum} className={styles.stepItem}>
                  <div className={`${styles.stepCircle} ${step === stepNum ? styles.active : ''} ${step > stepNum ? styles.completed : ''}`}>
                    {step > stepNum ? <i className="fa-solid fa-check" style={{ fontSize: '0.8rem' }}></i> : stepNum}
                  </div>
                  {stepNum < totalSteps && (
                    <div className={`${styles.stepConnector} ${step > stepNum ? styles.active : ''}`} />
                  )}
                </div>
              );
            })}
          </div>

          {errorMessage && (
            <div className="error-alert">
              <i className="fa-solid fa-triangle-exclamation"></i> {errorMessage}
            </div>
          )}

          {/* Step 1: Choose Role */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <p className={styles.stepTitle}>I want to register as</p>
              <div className={styles.roleSelector}>
                <label className={`${styles.roleOption} ${formData.role === 'CUSTOMER' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="CUSTOMER"
                    className={styles.hiddenRadio}
                    checked={formData.role === 'CUSTOMER'}
                    onChange={() => handleChange('role', 'CUSTOMER')}
                  />
                  <span className={styles.roleIcon}>
                    <i className="fa-solid fa-user"></i>
                  </span>
                  <span className={styles.roleText}>Customer</span>
                  <span className={styles.roleDescription}>Book appointments at your favorite places</span>
                </label>
                <label className={`${styles.roleOption} ${formData.role === 'BUSINESS_OWNER' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="BUSINESS_OWNER"
                    className={styles.hiddenRadio}
                    checked={formData.role === 'BUSINESS_OWNER'}
                    onChange={() => handleChange('role', 'BUSINESS_OWNER')}
                  />
                  <span className={styles.roleIcon}>
                    <i className="fa-solid fa-store"></i>
                  </span>
                  <span className={styles.roleText}>Business Owner</span>
                  <span className={styles.roleDescription}>List your services and manage bookings</span>
                </label>
              </div>
              <div className={styles.buttonRow} style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={handleNext}
                  disabled={!canProceedStep1}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Personal Info + Password */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <p className={styles.stepTitle}>Personal Information</p>
              <div className={styles.authForm}>
                <div className="form-row">
                  <div className="form-group half-width">
                    <label htmlFor="reg-firstName" className="form-label">First Name</label>
                    <input
                      id="reg-firstName"
                      type="text"
                      className={`input-field${errors.firstName ? ' input-error' : ''}`}
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      onBlur={() => handleBlur('firstName')}
                    />
                    {errors.firstName && <span className="validation-error">{errors.firstName}</span>}
                  </div>
                  <div className="form-group half-width">
                    <label htmlFor="reg-lastName" className="form-label">Last Name</label>
                    <input
                      id="reg-lastName"
                      type="text"
                      className={`input-field${errors.lastName ? ' input-error' : ''}`}
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      onBlur={() => handleBlur('lastName')}
                    />
                    {errors.lastName && <span className="validation-error">{errors.lastName}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-email" className="form-label">Email Address</label>
                  <input
                    id="reg-email"
                    type="email"
                    className={`input-field${errors.email ? ' input-error' : ''}`}
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    autoComplete="email"
                  />
                  {errors.email && <span className="validation-error">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-phone" className="form-label">Phone Number</label>
                  <input
                    id="reg-phone"
                    type="text"
                    className={`input-field${errors.phoneNumber ? ' input-error' : ''}`}
                    placeholder="+92 300 1234567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    onBlur={() => handleBlur('phoneNumber')}
                  />
                  {errors.phoneNumber && <span className="validation-error">{errors.phoneNumber}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-password" className="form-label">Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`input-field${errors.password ? ' input-error' : ''}`}
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <i className="fa-solid fa-eye-slash"></i>
                      ) : (
                        <i className="fa-solid fa-eye"></i>
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <>
                      <div className={styles.passwordStrength}>
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`${styles.strengthBar} ${i <= passwordStrength.level ? styles[passwordStrength.color] : ''}`}
                          />
                        ))}
                      </div>
                      <span className={`${styles.strengthText} text-muted`}>{passwordStrength.text}</span>
                    </>
                  )}
                  {errors.password && <span className="validation-error">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-confirmPassword" className="form-label">Confirm Password</label>
                  <input
                    id="reg-confirmPassword"
                    type="password"
                    className={`input-field${errors.confirmPassword ? ' input-error' : ''}`}
                    placeholder="Repeat your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    autoComplete="new-password"
                  />
                  {errors.confirmPassword && <span className="validation-error">{errors.confirmPassword}</span>}
                </div>

                <div className={styles.buttonRow}>
                  <button type="button" className="btn btn-outline" onClick={handleBack}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={loading}
                  >
                    {isBusiness ? 'Continue →' : (loading ? <><span className="spinner" /> Creating...</> : 'Create Account')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Business Details (only for BUSINESS_OWNER) */}
          {step === 3 && isBusiness && (
            <div className={styles.stepContent}>
              <p className={styles.stepTitle}>Business Details</p>
              <div className={styles.authForm}>
                <div className="form-group">
                  <label htmlFor="reg-bizName" className="form-label">Business Name</label>
                  <input
                    id="reg-bizName"
                    type="text"
                    className={`input-field${errors.businessName ? ' input-error' : ''}`}
                    placeholder="e.g., Elite Salon & Spa"
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    onBlur={() => handleBlur('businessName')}
                  />
                  {errors.businessName && <span className="validation-error">{errors.businessName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Business Category</label>
                  <div className={styles.categoryGrid}>
                    {CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        className={`${styles.categoryOption} ${formData.businessCategory === cat.id ? styles.selected : ''}`}
                        onClick={() => handleChange('businessCategory', cat.id)}
                      >
                        <span className={styles.categoryIcon}>
                          <i className={`fa-solid ${cat.icon}`}></i>
                        </span>
                        <span className={styles.categoryText}>{cat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-bizDesc" className="form-label">Description (Optional)</label>
                  <textarea
                    id="reg-bizDesc"
                    className="input-field"
                    placeholder="Tell customers about your business..."
                    value={formData.businessDescription}
                    onChange={(e) => handleChange('businessDescription', e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>

                <div className={styles.buttonRow}>
                  <button type="button" className="btn btn-outline" onClick={handleBack}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSubmit()}
                    disabled={loading}
                  >
                    {loading ? <><span className="spinner" /> Registering...</> : 'Register Business'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.authFooter}>
            <p>Already have an account? <Link href="/auth/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
