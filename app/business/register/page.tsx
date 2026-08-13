'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import FormField from '@/components/FormField';
import styles from './register-business.module.css';

export default function RegisterBusinessPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errors: Record<string, string | null> = {};
  if (touched.name && !formData.name) {
    errors.name = 'Business name is required.';
  }
  if (touched.description && !formData.description) {
    errors.description = 'Business description is required.';
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, description: true });

    if (!formData.name || !formData.description) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiFetch<{ message?: string }>('/api/business/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setLoading(false);
      setSuccessMessage(res.message || 'Business application submitted!');
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Failed to submit application. Please try again.');
    }
  };

  return (
    <div className={styles.businessRegContainer}>
      <div className={`surface ${styles.registrationCard}`}>
        <div className={styles.registrationHeader}>
          <div className={styles.regIcon}>
            <i className="fa-solid fa-briefcase" />
          </div>
          <h2>Register your business</h2>
          <p className={styles.regSubtitle}>
            Enter your details to submit an application for platform verification.
          </p>
        </div>

        {errorMessage && (
          <div className="error-alert">
            <i className="fa-solid fa-triangle-exclamation" /> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="success-alert">
            <i className="fa-solid fa-circle-check" /> {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.registrationForm} noValidate>
          <FormField
            label="Business name"
            htmlFor="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="e.g. Apex Health Clinic or Glow Salon"
            error={errors.name}
          />

          <FormField
            as="textarea"
            label="Business description"
            htmlFor="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            onBlur={() => handleBlur('description')}
            placeholder="Describe the services you offer and what sets you apart..."
            error={errors.description}
            rows={5}
          />

          <FormField
            label="Logo image URL"
            htmlFor="logoUrl"
            value={formData.logoUrl}
            onChange={(e) => handleInputChange('logoUrl', e.target.value)}
            placeholder="https://example.com/logo.png"
            hint="Optional — you can add this later from your dashboard."
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Submitting application...
              </>
            ) : (
              'Submit application'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
