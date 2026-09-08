'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api';
import { useOwnerPlan } from '@/lib/owner-plan-context';
import { atLimit, limitHint } from '@/lib/plan';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DataTable from '@/components/DataTable';
import GeoFields, { type GeoSelection } from '@/components/GeoFields';
import { useOrgLocale } from '@/lib/org-locale-context';
import styles from './branches.module.css';

const LocationPicker = dynamic(
  () => import('@/components/LocationMap').then((m) => m.LocationPicker),
  { ssr: false, loading: () => <Skeleton variant="card" /> }
);

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => <Skeleton variant="card" />,
});

interface Branch {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  timezone?: string;
}

export default function BranchesPage() {
  const { plan, loaded: planLoaded, refresh: refreshPlan } = useOwnerPlan();
  const { locale } = useOrgLocale();
  const canAdd = planLoaded && !atLimit(plan, 'branches', 'max_branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 31.5204,
    longitude: 74.3587,
    phoneNumber: '',
    countryCode: '',
    region: '',
    city: '',
    postalCode: '',
    timezone: '',
  });

  const loadBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Branch[]>('/api/business/branches');
      setBranches(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load branches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (branches.length > 0 && selectedBranchId === null) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const handleEditClick = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      latitude: branch.latitude || 31.5204,
      longitude: branch.longitude || 74.3587,
      phoneNumber: branch.phoneNumber || '',
      countryCode: branch.countryCode || locale.countryCode || '',
      region: branch.region || locale.region || '',
      city: branch.city || locale.city || '',
      postalCode: branch.postalCode || '',
      timezone: branch.timezone || locale.timezone || '',
    });
    setShowForm(true);
  };

  const handleAddClick = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      address: '',
      latitude: 31.5204,
      longitude: 74.3587,
      phoneNumber: '',
      countryCode: locale.countryCode || '',
      region: locale.region || '',
      city: locale.city || '',
      postalCode: '',
      timezone: locale.timezone || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      setError('Name and address are required.');
      return;
    }
    if (!Number.isFinite(formData.latitude) || !Number.isFinite(formData.longitude)) {
      setError('Set a valid location on the map.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (editingBranch) {
        await apiFetch(`/api/business/branches/${editingBranch.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setMessage('Branch updated successfully!');
      } else {
        await apiFetch('/api/business/branches', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setMessage('Branch added successfully!');
      }
      setShowForm(false);
      await loadBranches();
      await refreshPlan();
    } catch (err: any) {
      setError(err?.message || 'Action failed. Your listing may need approval first.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/branches/${deleteId}`, { method: 'DELETE' });
      setMessage('Branch deleted successfully.');
      setDeleteId(null);
      await loadBranches();
      await refreshPlan();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete branch.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredBranches = useMemo(
    () =>
      branches.filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.address.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [branches, searchQuery]
  );

  const mapMarkers = useMemo(
    () =>
      filteredBranches
        .filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))
        .map((b) => ({
          id: b.id,
          lat: b.latitude,
          lng: b.longitude,
          label: `<strong>${b.name}</strong><br/>${b.address}`,
        })),
    [filteredBranches]
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Branches"
        subtitle={
          canAdd
            ? 'Manage locations on the map. Coordinates are stored as latitude and longitude.'
            : limitHint(plan, 'max_branches', 'branches')
        }
        actions={
          canAdd ? (
            <button type="button" className="btn btn-primary" onClick={handleAddClick}>
              <i className="fa-solid fa-plus" /> Add Branch
            </button>
          ) : undefined
        }
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

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : branches.length === 0 ? (
        <EmptyState
          icon={canAdd ? 'fa-location-dot' : 'fa-lock'}
          title={canAdd ? 'No branches added' : 'Branch limit reached'}
          description={
            canAdd
              ? 'Add a branch and pin it on the map so customers can find you.'
              : limitHint(plan, 'max_branches', 'branches')
          }
          actionLabel={canAdd ? 'Add your first branch' : undefined}
          onAction={canAdd ? handleAddClick : undefined}
        />
      ) : (
        <div className={styles.splitLayout}>
          <div className={styles.listSide}>
            <div className={styles.searchBar}>
              <div className={styles.searchContainer}>
                <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`} />
                <input
                  type="text"
                  className={`input-field ${styles.searchInput}`}
                  placeholder="Search branch name or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.branchesList}>
              {filteredBranches.map((b, index) => (
                <div
                  key={b.id}
                  className={`${styles.branchCard} ${
                    selectedBranchId === b.id ? styles.branchCardActive : ''
                  }`}
                  onMouseEnter={() => setSelectedBranchId(b.id)}
                >
                  <div className={styles.cardHeader}>
                    <h4 className={styles.branchTitle}>{b.name}</h4>
                    <div className={styles.badgesRow}>
                      {index === 0 && <span className={styles.badgeMain}>HQ / MAIN</span>}
                      <span className={styles.badgeActive}>ACTIVE</span>
                    </div>
                  </div>

                  <div className={styles.cardDetails}>
                    {b.phoneNumber && (
                      <a
                        href={`tel:${b.phoneNumber}`}
                        className={styles.detailItem}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="fa-solid fa-phone" />
                        <span>{b.phoneNumber}</span>
                      </a>
                    )}
                    <div className={styles.detailItem}>
                      <i className="fa-solid fa-map-pin" />
                      <span>{b.address}</span>
                    </div>
                    {(b.city || b.region || b.countryCode) && (
                      <div className={styles.detailItem}>
                        <i className="fa-solid fa-earth-asia" />
                        <span>{[b.city, b.region, b.countryCode].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    <div className={styles.detailItem}>
                      <i className="fa-solid fa-earth-americas" />
                      <span className={styles.coords}>
                        {Number(b.latitude).toFixed(5)}, {Number(b.longitude).toFixed(5)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardBottom}>
                    <div className={styles.cardStats}>
                      <div className={styles.statItem}>
                        <i className="fa-solid fa-users" />
                        <span>HQ Staff</span>
                      </div>
                      <div className={styles.statItem}>
                        <i className="fa-solid fa-calendar-check" />
                        <span>Active Shifts</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(b);
                        }}
                      >
                        <i className="fa-regular fa-pen-to-square" style={{ marginRight: 4 }} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(b.id);
                        }}
                      >
                        <i className="fa-regular fa-trash-can" style={{ marginRight: 4 }} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredBranches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2rem', marginBottom: 12 }} />
                  <p>No locations match your search query.</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.mapSide}>
            <LocationMap
              markers={mapMarkers}
              selectedId={selectedBranchId}
              onMarkerClick={(id) => setSelectedBranchId(Number(id))}
              fitMarkers={true}
              height="100%"
            />
          </div>
        </div>
      )}

      <Modal
        open={showForm}
        title={editingBranch ? 'Edit branch' : 'Add new branch'}
        onClose={() => setShowForm(false)}
        wide
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="branch-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingBranch ? 'Update branch' : 'Add branch'}
            </button>
          </>
        }
      >
        <form id="branch-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="branchName">
              Branch name
            </label>
            <input
              id="branchName"
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Downtown Office"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="branchPhone">
              Phone number
            </label>
            <input
              id="branchPhone"
              type="text"
              className="input-field"
              value={formData.phoneNumber}
              onChange={(e) => setFormData((p) => ({ ...p, phoneNumber: e.target.value }))}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </div>

          <GeoFields
            value={{
              countryCode: formData.countryCode,
              region: formData.region,
              city: formData.city,
              timezone: formData.timezone,
            }}
            onChange={(geo: GeoSelection) =>
              setFormData((p) => ({
                ...p,
                countryCode: geo.countryCode,
                region: geo.region,
                city: geo.city,
                timezone: geo.timezone || p.timezone,
              }))
            }
            showCurrency={false}
            geocodeOnCity
            onGeocoded={({ lat, lon, displayName }) =>
              setFormData((p) => ({
                ...p,
                latitude: lat,
                longitude: lon,
                address: p.address || displayName,
              }))
            }
          />

          <LocationPicker
            address={formData.address}
            latitude={formData.latitude}
            longitude={formData.longitude}
            onAddressChange={(address) => setFormData((p) => ({ ...p, address }))}
            onCoordinatesChange={(latitude, longitude) =>
              setFormData((p) => ({ ...p, latitude, longitude }))
            }
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete branch"
        message="Are you sure you want to delete this branch? Associated staff may be impacted."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
