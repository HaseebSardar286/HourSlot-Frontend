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
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const handleSetCover = async (url: string) => {
    if (!business) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const filtered = photos.filter((p) => p !== url);
    const updatedPhotos = [url, ...filtered];
    const galleryUrlsString = updatedPhotos.join(',');

    try {
      await apiFetch('/api/business/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: business.name,
          galleryUrls: galleryUrlsString,
        }),
      });
      setPhotos(updatedPhotos);
      setMessage('Cover photo updated successfully!');
    } catch (err: any) {
      setError(err?.message || 'Failed to update cover photo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleUploadFile(file);
    }
  };

  const handleNextPhoto = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % photos.length);
  };

  const handlePrevPhoto = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
  };

  // Keyboard navigation support for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex]);

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

  // Calculate statistics
  const totalPhotos = photos.length;
  const coverStatus = photos.length > 0 ? 'Configured' : 'Not Configured';

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

      {photos.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-images" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{totalPhotos}</div>
              <div className={styles.statLabel}>Active Media</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-crown" style={{ color: '#d97706' }} />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{coverStatus}</div>
              <div className={styles.statLabel}>Cover Image Status</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        <div className="surface">
          <h3 className={styles.panelTitle}>Add gallery photo</h3>
          
          <div
            className={`${styles.dragZone} ${isDragOver ? styles.dragZoneActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('photoFileInput')?.click()}
          >
            <i className="fa-solid fa-cloud-arrow-up" />
            <p className={styles.dragText}>Drag & drop photo here</p>
            <p className={styles.dragSub}>or click to upload from computer</p>
            <input
              id="photoFileInput"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleUploadFile(e.target.files?.[0] || null)}
              disabled={submitting}
            />
          </div>

          <form onSubmit={handleAddPhoto} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="photoUrlInput">
              Or paste image URL:
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
                <div key={`${url}-${idx}`} className={styles.photoCard}>
                  {idx === 0 && (
                    <span className={styles.badgeCover}>
                      <i className="fa-solid fa-crown" /> Cover
                    </span>
                  )}
                  <div className={styles.imageWrapper}>
                    <img src={url} alt={`Gallery ${idx + 1}`} className={styles.galleryImg} />
                    <div className={styles.overlayActions}>
                      <button
                        type="button"
                        className={styles.overlayBtn}
                        onClick={() => setLightboxIndex(idx)}
                        title="Zoom Preview"
                      >
                        <i className="fa-solid fa-magnifying-glass-plus" />
                      </button>
                      <button
                        type="button"
                        className={`${styles.overlayBtn} ${styles.overlayDelete}`}
                        onClick={() => setDeleteUrl(url)}
                        title="Remove image"
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    <span>Image {idx + 1}</span>
                    {idx > 0 && (
                      <button
                        type="button"
                        className={styles.coverActionBtn}
                        onClick={() => handleSetCover(url)}
                      >
                        <i className="fa-solid fa-crown" style={{ fontSize: '0.7rem' }} /> Set as cover
                      </button>
                    )}
                  </div>
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

      {lightboxIndex !== null && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxIndex(null)} tabIndex={0}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.lightboxClose} onClick={() => setLightboxIndex(null)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <button type="button" className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={handlePrevPhoto}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <img src={photos[lightboxIndex]} alt={`Preview ${lightboxIndex + 1}`} className={styles.lightboxImg} />
            <button type="button" className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={handleNextPhoto}>
              <i className="fa-solid fa-chevron-right" />
            </button>
            <div className={styles.lightboxCaption}>
              Image {lightboxIndex + 1} of {photos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
