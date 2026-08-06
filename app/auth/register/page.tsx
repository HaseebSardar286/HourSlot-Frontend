'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import styles from './register.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'CUSTOMER',
    password: '',
    confirmPassword: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errors: Record<string, string | null> = {};

  if (touched.firstName && !formData.firstName) {
    errors.firstName = 'Required.';
  }
  if (touched.lastName && !formData.lastName) {
    errors.lastName = 'Required.';
  }
  if (touched.email) {
    if (!formData.email) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }
  }
  if (touched.phoneNumber) {
    if (!formData.phoneNumber) {
      errors.phoneNumber = 'Phone number is required.';
    } else if (!/^[0-9+ ]{10,15}$/.test(formData.phoneNumber)) {
      errors.phoneNumber = 'Invalid phone format (digits & spaces only, 10-15 chars).';
    }
  }
  if (touched.password) {
    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
  }
  if (touched.confirmPassword) {
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Mark all as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Re-check validation
    const hasErrors = 
      !formData.firstName ||
      !formData.lastName ||
      !formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ||
      !formData.phoneNumber || !/^[0-9+ ]{10,15}$/.test(formData.phoneNumber) ||
      !formData.password || formData.password.length < 6 ||
      formData.password !== formData.confirmPassword;

    if (hasErrors) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      email: formData.email,
      password: formData.password,
      role: formData.role,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber
    };

    try {
      await register(payload);
      setLoading(false);
      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.error?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={`glass-card ${styles.authCard}`}>
        <div className={styles.authHeader}>
          <span className={styles.authLogoIcon}>⏳</span>
          <h2>Create Account</h2>
          <p className={styles.authSubtitle}>Join HourSlot to easily book or list services</p>
        </div>

        {errorMessage && (
          <div className="error-alert">
            <span>⚠️</span> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="success-alert">
            <span>✅</span> {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          <div className="form-row">
            <div className="form-group half-width">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                id="firstName"
                type="text"
                className={`input-field${errors.firstName ? ' input-error' : ''}`}
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onBlur={() => handleBlur('firstName')}
              />
              {errors.firstName && <span className="validation-error">{errors.firstName}</span>}
            </div>

            <div className="form-group half-width">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                id="lastName"
                type="text"
                className={`input-field${errors.lastName ? ' input-error' : ''}`}
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                onBlur={() => handleBlur('lastName')}
              />
              {errors.lastName && <span className="validation-error">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              className={`input-field${errors.email ? ' input-error' : ''}`}
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
            />
            {errors.email && <span className="validation-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
            <input
              id="phoneNumber"
              type="text"
              className={`input-field${errors.phoneNumber ? ' input-error' : ''}`}
              placeholder="+1 555 123 4567"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              onBlur={() => handleBlur('phoneNumber')}
            />
            {errors.phoneNumber && <span className="validation-error">{errors.phoneNumber}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">I want to register as a:</label>
            <div className={styles.roleSelector}>
              <label className={`${styles.roleOption} ${formData.role === 'CUSTOMER' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="CUSTOMER"
                  className={styles.hiddenRadio}
                  checked={formData.role === 'CUSTOMER'}
                  onChange={() => handleInputChange('role', 'CUSTOMER')}
                />
                <span className={styles.roleIcon}>👤</span>
                <span className={styles.roleText}>Customer</span>
              </label>
              <label className={`${styles.roleOption} ${formData.role === 'BUSINESS_ADMIN' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="BUSINESS_ADMIN"
                  className={styles.hiddenRadio}
                  checked={formData.role === 'BUSINESS_ADMIN'}
                  onChange={() => handleInputChange('role', 'BUSINESS_ADMIN')}
                />
                <span className={styles.roleIcon}>💼</span>
                <span className={styles.roleText}>Business</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className={`input-field${errors.password ? ' input-error' : ''}`}
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
            />
            {errors.password && <span className="validation-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className={`input-field${errors.confirmPassword ? ' input-error' : ''}`}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
            />
            {errors.confirmPassword && <span className="validation-error">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div className={styles.authFooter}>
          <p>Already have an account? <Link href="/auth/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
