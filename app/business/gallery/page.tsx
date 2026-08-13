'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
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
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBusiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BusinessProfile>('/api/business/profile');
      setBusiness(data);
      if (data.galleryUrls) {
        setPhotos(
          data.galleryUrls
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean)
        );
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
      setError('Please enter a valid URL beginning with http://, https:// or a local path.');
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

  const handleDeletePhoto = async () => {
    if (!deleteUrl) return;
    setDeleting(true);
    setError(null);
    setMessage(null);

    const updatedPhotos = photos.filter((p) => p !== deleteUrl);
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
      setDeleteUrl(null);
      setMessage('Photo removed from gallery.');
    } catch (err: any) {
      setError(err?.message || 'Failed to remove photo.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="title" />
        <div className={styles.layout}>
          <Skeleton variant="card" height={280} />
          <Skeleton variant="card" height={280} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Gallery"
        subtitle="Showcase your premises, work, and team with a photo gallery."
      />

      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div className={styles.layout}>
        <div className="surface">
          <h3 className={styles.panelTitle}>Add gallery photo</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="photoFileInput">
              Upload image
            </label>
            <input
              id="photoFileInput"
              type="file"
              accept="image/*"
              className="input-field"
              onChange={(e) => handleUploadFile(e.target.files?.[0] || null)}
              disabled={submitting}
            />
          </div>
          <form onSubmit={handleAddPhoto} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="photoUrlInput">
                Or paste image URL
              </label>
              <input
                id="photoUrlInput"
                type="text"
                className="input-field"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://example.com/salon-interior.jpg"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting || !newPhotoUrl}>
              {submitting ? 'Adding...' : 'Add photo URL'}
            </button>
          </form>
          <p className={styles.tip}>
            Use high-quality landscape images to make your booking page look polished.
          </p>
        </div>

        <div className={styles.gridSection}>
          {photos.length === 0 ? (
            <EmptyState
              icon="fa-images"
              title="Gallery is empty"
              description="Upload photos or paste URLs to show off your services and location."
            />
          ) : (
            <div className={styles.photosGrid}>
              {photos.map((url, idx) => (
                <div key={`${url}-${idx}`} className={`surface ${styles.photoCard}`}>
                  <div className={styles.imageWrapper}>
                    <img src={url} alt={`Gallery ${idx + 1}`} className={styles.galleryImg} />
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => setDeleteUrl(url)}
                      title="Remove image"
                    >
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                  <div className={styles.cardFooter}>Image {idx + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteUrl}
        title="Remove photo"
        message="Remove this photo from your gallery?"
        confirmLabel="Remove"
        danger
        loading={deleting}
        onConfirm={handleDeletePhoto}
        onCancel={() => setDeleteUrl(null)}
      />
    </div>
  );
}
