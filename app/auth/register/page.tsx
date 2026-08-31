'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Category } from '@/lib/types';
import { safeReturnUrl } from '@/lib/auth-redirect';
import Stepper from '@/components/Stepper';
import shared from '../auth-shared.module.css';
import styles from './register.module.css';

const FALLBACK_CATEGORY_ICONS: Record<string, string> = {
  salon: 'fa-scissors',
  clinic: 'fa-house-medical',
  spa: 'fa-spa',
  dental: 'fa-tooth',
  fitness: 'fa-dumbbell',
  auto: 'fa-car',
  education: 'fa-graduation-cap',
  legal: 'fa-scale-balanced',
};

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

function roleFromQuery(raw: string | null): 'CUSTOMER' | 'BUSINESS_OWNER' {
  if (!raw) return 'CUSTOMER';
  const v = raw.toLowerCase();
  if (v === 'business' || v === 'business_owner' || v === 'owner') return 'BUSINESS_OWNER';
  return 'CUSTOMER';
}

function RegisterForm() {
  const { register, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const isBookingReturn = Boolean(returnUrl?.includes('/profile/book/'));
  const loginHrefPath = returnUrl
    ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/auth/login';

  const getDashboardRoute = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '/admin/dashboard';
      case 'BUSINESS_OWNER':
      case 'BUSINESS_STAFF':
        return '/business/dashboard';
      default:
        return '/profile/explore';
    }
  };

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'CUSTOMER' as string,
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
  const [categories, setCategories] = useState<{ id: string; icon: string; label: string }[]>([]);

  useEffect(() => {
    const fromQuery = roleFromQuery(searchParams.get('role'));
    setFormData((prev) => ({ ...prev, role: fromQuery }));
  }, [searchParams]);

  const isBusiness = formData.role === 'BUSINESS_OWNER';

  useEffect(() => {
    apiFetch<Category[]>('/api/public/categories', { skipAuth: true })
      .then((data) => {
        const flat: { id: string; icon: string; label: string }[] = [];
        const walk = (nodes: Category[]) => {
          nodes.forEach((n) => {
            flat.push({
              id: n.slug || n.name,
              icon: FALLBACK_CATEGORY_ICONS[(n.slug || '').toLowerCase()] || 'fa-building',
              label: n.name,
            });
            if (n.subcategories?.length) walk(n.subcategories);
          });
        };
        walk(data || []);
        setCategories(
          flat.length
            ? flat
            : [
                { id: 'salon', icon: 'fa-scissors', label: 'Salon' },
                { id: 'clinic', icon: 'fa-house-medical', label: 'Clinic' },
                { id: 'spa', icon: 'fa-spa', label: 'Spa' },
              ]
        );
      })
      .catch(() => {
        setCategories([
          { id: 'salon', icon: 'fa-scissors', label: 'Salon' },
          { id: 'clinic', icon: 'fa-house-medical', label: 'Clinic' },
          { id: 'spa', icon: 'fa-spa', label: 'Spa' },
        ]);
      });
  }, []);

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
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords don't match.";
  }
  if (isBusiness && touched.businessName && !formData.businessName) errors.businessName = 'Business name is required.';

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const canProceedStep1 = formData.role !== '';

  const canProceedStep2 = () =>
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.phoneNumber &&
    /^[0-9+ ]{10,15}$/.test(formData.phoneNumber) &&
    formData.password &&
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword;

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setTouched((prev) => ({
        ...prev,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        password: true,
        confirmPassword: true,
      }));
      if (canProceedStep2()) {
        if (isBusiness) setStep(3);
        else handleSubmit();
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
      const session = await login({ email: formData.email, password: formData.password });
      document.cookie = `hourslot_user_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400`;
      const dest = safeReturnUrl(returnUrl, getDashboardRoute(session.role));
      router.push(dest);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setLoading(false);
      setErrorMessage(e?.error?.message || 'Registration failed. Please try again.');
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const stepperSteps = isBusiness
    ? [
        { id: 'role', label: 'Role' },
        { id: 'info', label: 'Details' },
        { id: 'business', label: 'Business' },
      ]
    : [
        { id: 'role', label: 'Role' },
        { id: 'info', label: 'Details' },
      ];

  if (success) {
    return (
      <div className={shared.authCard}>
        <div className={shared.successState}>
          <div className={shared.successIcon}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <h2 className={shared.successTitle}>Account created</h2>
          <p className={shared.successMessage}>Redirecting you now…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shared.authCard}>
      {isBookingReturn && (
        <div className={shared.contextBanner}>
          <i className="fa-solid fa-circle-info" />
          <div>
            <strong>Complete your booking</strong>
            Create an account to confirm your appointment. Your selections are saved.
          </div>
        </div>
      )}
      <div className={shared.authHeader}>
        <div className={shared.authHeaderIcon}>
          <i className="fa-solid fa-user-plus" />
        </div>
        <h2 className={shared.authTitle}>Create account</h2>
        <p className={shared.authSubtitle}>Join HourSlot to book services or list your business</p>
      </div>

      <div className={styles.stepperWrap}>
        <Stepper steps={stepperSteps} current={step - 1} />
      </div>

      {errorMessage && (
        <div className={shared.alertError}>
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{errorMessage}</span>
        </div>
      )}

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
                <i className="fa-solid fa-user" />
              </span>
              <span className={styles.roleText}>Customer</span>
              <span className={styles.roleDescription}>Book appointments at your favorite places</span>
            </label>
            <label
              className={`${styles.roleOption} ${formData.role === 'BUSINESS_OWNER' ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="role"
                value="BUSINESS_OWNER"
                className={styles.hiddenRadio}
                checked={formData.role === 'BUSINESS_OWNER'}
                onChange={() => handleChange('role', 'BUSINESS_OWNER')}
              />
              <span className={styles.roleIcon}>
                <i className="fa-solid fa-store" />
              </span>
              <span className={styles.roleText}>Business owner</span>
              <span className={styles.roleDescription}>List your services and manage bookings</span>
            </label>
          </div>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={shared.submitBtn}
              onClick={handleNext}
              disabled={!canProceedStep1}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.stepContent}>
          <p className={styles.stepTitle}>Personal information</p>
          <div className={shared.authForm}>
            <div className={shared.row2}>
              <div className={shared.fieldGroup}>
                <label htmlFor="reg-firstName">First name</label>
                <input
                  id="reg-firstName"
                  type="text"
                  className={`${shared.fieldInput}${errors.firstName ? ` ${shared.fieldInputError}` : ''}`}
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                />
                {errors.firstName && <span className={shared.fieldError}>{errors.firstName}</span>}
              </div>
              <div className={shared.fieldGroup}>
                <label htmlFor="reg-lastName">Last name</label>
                <input
                  id="reg-lastName"
                  type="text"
                  className={`${shared.fieldInput}${errors.lastName ? ` ${shared.fieldInputError}` : ''}`}
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                />
                {errors.lastName && <span className={shared.fieldError}>{errors.lastName}</span>}
              </div>
            </div>

            <div className={shared.fieldGroup}>
              <label htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                type="email"
                className={`${shared.fieldInput}${errors.email ? ` ${shared.fieldInputError}` : ''}`}
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                autoComplete="email"
              />
              {errors.email && <span className={shared.fieldError}>{errors.email}</span>}
            </div>

            <div className={shared.fieldGroup}>
              <label htmlFor="reg-phone">Phone number</label>
              <input
                id="reg-phone"
                type="text"
                className={`${shared.fieldInput}${errors.phoneNumber ? ` ${shared.fieldInputError}` : ''}`}
                placeholder="+92 300 1234567"
                value={formData.phoneNumber}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                onBlur={() => handleBlur('phoneNumber')}
              />
              {errors.phoneNumber && <span className={shared.fieldError}>{errors.phoneNumber}</span>}
            </div>

            <div className={shared.fieldGroup}>
              <label htmlFor="reg-password">Password</label>
              <div className={shared.passwordWrap}>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${shared.fieldInput}${errors.password ? ` ${shared.fieldInputError}` : ''}`}
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={shared.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
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
                  <span className={styles.strengthText}>{passwordStrength.text}</span>
                </>
              )}
              {errors.password && <span className={shared.fieldError}>{errors.password}</span>}
            </div>

            <div className={shared.fieldGroup}>
              <label htmlFor="reg-confirmPassword">Confirm password</label>
              <input
                id="reg-confirmPassword"
                type="password"
                className={`${shared.fieldInput}${errors.confirmPassword ? ` ${shared.fieldInputError}` : ''}`}
                placeholder="Repeat your password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <span className={shared.fieldError}>{errors.confirmPassword}</span>}
            </div>

            <div className={styles.buttonRow}>
              <button type="button" className={shared.secondaryBtn} onClick={handleBack}>
                Back
              </button>
              <button type="button" className={shared.submitBtn} onClick={handleNext} disabled={loading}>
                {isBusiness ? (
                  'Continue'
                ) : loading ? (
                  <>
                    <span className="spinner" /> Creating…
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && isBusiness && (
        <div className={styles.stepContent}>
          <p className={styles.stepTitle}>Business details</p>
          <div className={shared.authForm}>
            <div className={shared.fieldGroup}>
              <label htmlFor="reg-bizName">Business name</label>
              <input
                id="reg-bizName"
                type="text"
                className={`${shared.fieldInput}${errors.businessName ? ` ${shared.fieldInputError}` : ''}`}
                placeholder="e.g., Elite Salon & Spa"
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                onBlur={() => handleBlur('businessName')}
              />
              {errors.businessName && <span className={shared.fieldError}>{errors.businessName}</span>}
            </div>

            <div className={shared.fieldGroup}>
              <label>Business category</label>
              <div className={styles.categoryGrid}>
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    className={`${styles.categoryOption} ${formData.businessCategory === cat.id ? styles.selected : ''}`}
                    onClick={() => handleChange('businessCategory', cat.id)}
                  >
                    <span className={styles.categoryIcon}>
                      <i className={`fa-solid ${cat.icon}`} />
                    </span>
                    <span className={styles.categoryText}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={shared.fieldGroup}>
              <label htmlFor="reg-bizDesc">Description (optional)</label>
              <textarea
                id="reg-bizDesc"
                className={`${shared.fieldInput} ${styles.textarea}`}
                placeholder="Tell customers about your business…"
                value={formData.businessDescription}
                onChange={(e) => handleChange('businessDescription', e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.buttonRow}>
              <button type="button" className={shared.secondaryBtn} onClick={handleBack}>
                Back
              </button>
              <button type="button" className={shared.submitBtn} onClick={() => handleSubmit()} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" /> Registering…
                  </>
                ) : (
                  'Register business'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={shared.authFooter}>
        <p>
          Already have an account? <Link href={loginHrefPath}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className={shared.authCard} style={{ textAlign: 'center', padding: 40 }}>
          Loading…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
