'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './gallery.module.css';

interface BusinessProfile {
  id: number;
  name: string;
  galleryUrls?: string;
}

export default function GalleryPage() {
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const loadBusiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BusinessProfile>('/api/business/profile');
      setBusiness(data);
      if (data.galleryUrls) {
        setPhotos(data.galleryUrls.split(',').map((u) => u.trim()).filter(Boolean));
      } else {
        setPhotos([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load business details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, []);

  const handleUploadFile = async (file: File | null) => {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiFetch<{ url: string; galleryUrls: string }>('/api/business/media/upload', {
        method: 'POST',
        body: formData,
      });
      const next = (result.galleryUrls || '')
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      setPhotos(next);
      setMessage('Photo uploaded successfully!');
    } catch (err: any) {
      setError(err?.message || 'Failed to upload image.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPhoto = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;

    if (!newPhotoUrl.startsWith('http://') && !newPhotoUrl.startsWith('https://') && !newPhotoUrl.startsWith('/')) {
      setError('Please enter a valid URL beginning with http://, https:// or local path.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const updatedPhotos = [...photos, newPhotoUrl.trim()];
    const galleryUrlsString = updatedPhotos.join(',');

    try {
      await apiFetch('/api/business/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: business?.name,
          galleryUrls: galleryUrlsString,
        }),
      });
      setPhotos(updatedPhotos);
      setNewPhotoUrl('');
      setMessage('Photo added to gallery successfully!');
    } catch (err: any) {
      setError(err?.message || 'Failed to update gallery.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePhoto = async (photoToDelete: string) => {
    if (!confirm('Are you sure you want to remove this photo from your gallery?')) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const updatedPhotos = photos.filter((p) => p !== photoToDelete);
    const galleryUrlsString = updatedPhotos.join(',');

    try {
      await apiFetch('/api/business/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: business?.name,
          galleryUrls: galleryUrlsString,
        }),
      });
      setPhotos(updatedPhotos);
      setMessage('Photo removed from gallery.');
    } catch (err: any) {
      setError(err?.message || 'Failed to remove photo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.galleryContainer}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Showcase your business, premises, and staff portfolio with a photo gallery.
      </p>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      <div className={styles.galleryLayout}>
        {/* Upload Form Box */}
        <div className="glass-card" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Add Gallery Photo</h3>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="photoFileInput">Upload image</label>
            <input
              id="photoFileInput"
              type="file"
              accept="image/*"
              className="input-field"
              onChange={(e) => handleUploadFile(e.target.files?.[0] || null)}
              disabled={submitting}
            />
          </div>
          <form onSubmit={handleAddPhoto} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="photoUrlInput">Or paste image URL</label>
              <input
                id="photoUrlInput"
                type="text"
                className="input-field"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://example.com/salon-interior.jpg"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || !newPhotoUrl}>
              {submitting ? 'Adding...' : 'Add Photo URL'}
            </button>
          </form>

          <div style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            <h4 style={{ color: '#ffffff', marginBottom: '8px' }}>Pro Tip:</h4>
            Use high quality landscape images to make your booking checkout page look premium and appealing to customers.
          </div>
        </div>

        {/* Previews Grid */}
        <div className={styles.gridSection}>
          {photos.length === 0 ? (
            <div className="glass-card text-center" style={{ padding: '60px 20px', width: '100%' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📸</div>
              <h3>Gallery is Empty</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Add photo URLs to show off your services and location.</p>
            </div>
          ) : (
            <div className={styles.photosGrid}>
              {photos.map((url, idx) => (
                <div key={idx} className={styles.photoCard}>
                  <div className={styles.imageWrapper}>
                    <img src={url} alt={`Gallery ${idx + 1}`} className={styles.galleryImg} />
                    <button 
                      className={styles.deleteBtn} 
                      onClick={() => handleDeletePhoto(url)}
                      title="Remove image"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                  <div className={styles.cardFooter}>
                    <span>Image {idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
