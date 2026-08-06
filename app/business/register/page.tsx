'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
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
      <div className={`glass-card ${styles.registrationCard}`}>
        <div className={styles.registrationHeader}>
          <span className={styles.regIcon}>💼</span>
          <h2>Register Your Business</h2>
          <p className={styles.regSubtitle}>
            Enter your business details to submit an application for platform verification
          </p>
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

        <form onSubmit={handleSubmit} className={styles.registrationForm} noValidate>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Business Name</label>
            <input
              id="name"
              type="text"
              className={`input-field${errors.name ? ' input-error' : ''}`}
              placeholder="e.g. Apex Health Clinic or Glow Salon"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
            />
            {errors.name && <span className="validation-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">Business Description</label>
            <textarea
              id="description"
              className={`input-field ${styles.textareaField}${errors.description ? ' input-error' : ''}`}
              placeholder="Describe the services you offer, your specialization, and what sets you apart..."
              rows={5}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onBlur={() => handleBlur('description')}
            />
            {errors.description && <span className="validation-error">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="logoUrl" className="form-label">Logo Image URL</label>
            <input
              id="logoUrl"
              type="text"
              className="input-field"
              placeholder="https://example.com/logo.png"
              value={formData.logoUrl}
              onChange={(e) => handleInputChange('logoUrl', e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><span className="spinner" /> Submitting application...</> : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
