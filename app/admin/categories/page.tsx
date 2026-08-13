'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import styles from './categories.module.css';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  imageUrl?: string;
  searchTags?: string;
  active: boolean;
  parent?: Category | null;
  subcategories?: Category[];
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    imageUrl: '',
    searchTags: '',
    parentId: '',
    active: true,
  });

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Category[]>('/api/public/categories');
      setCategories(data);
      const flat: Category[] = [];
      const traverse = (node: Category) => {
        flat.push(node);
        if (node.subcategories && node.subcategories.length > 0) {
          node.subcategories.forEach(traverse);
        }
      };
      data.forEach(traverse);
      setFlatCategories(flat);
    } catch (err: any) {
      setError(err?.message || 'Could not load categories catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: category.icon || '',
      imageUrl: category.imageUrl || '',
      searchTags: category.searchTags || '',
      parentId: category.parent ? category.parent.id.toString() : '',
      active: category.active,
    });
    setShowModal(true);
  };

  const handleAddClick = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      icon: '',
      imageUrl: '',
      searchTags: '',
      parentId: '',
      active: true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Category name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      ...formData,
      parentId: formData.parentId ? parseInt(formData.parentId) : null,
    };

    try {
      if (editingCategory) {
        await apiFetch(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Category updated successfully!');
      } else {
        await apiFetch('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Category added successfully!');
      }
      setShowModal(false);
      await loadCategories();
    } catch (err: any) {
      setError(err?.message || 'Action failed.');
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
      await apiFetch(`/api/admin/categories/${deleteId}`, { method: 'DELETE' });
      setMessage('Category deactivated successfully.');
      setDeleteId(null);
      await loadCategories();
    } catch (err: any) {
      setError(err?.message || 'Deactivation failed.');
    } finally {
      setDeleting(false);
    }
  };

  const renderCategoryNode = (category: Category, depth = 0) => (
    <div key={category.id} className={styles.treeNode} style={{ marginLeft: depth * 20 }}>
      <div className={`surface ${styles.nodeCard}`}>
        <div className={styles.nodeInfo}>
          <span className={styles.nodeIcon}>
            <i className={`fa-solid ${category.icon || 'fa-tag'}`} />
          </span>
          <div>
            <span className={styles.nodeName}>{category.name}</span>
            <span className={styles.nodeSlug}>/c/{category.slug}</span>
          </div>
        </div>
        <div className={styles.nodeActions}>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(category)}>
            Edit
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(category.id)}>
            Deactivate
          </button>
        </div>
      </div>
      {category.subcategories && category.subcategories.length > 0 && (
        <div className={styles.childContainer}>
          {category.subcategories.map((child) => renderCategoryNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.categoriesContainer}>
      <PageHeader
        title="Categories"
        subtitle="Manage taxonomy for business classification and discovery."
        actions={
          <button type="button" className="btn btn-primary" onClick={handleAddClick}>
            <i className="fa-solid fa-plus" /> Add Category
          </button>
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
        <Skeleton variant="row" count={5} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon="fa-tags"
          title="No categories registered"
          description="Set up root categories for appointment listings."
          actionLabel="Add category"
          onAction={handleAddClick}
        />
      ) : (
        <div className={styles.treeWrapper}>{categories.map((cat) => renderCategoryNode(cat))}</div>
      )}

      <Modal
        open={showModal}
        title={editingCategory ? 'Edit category' : 'Create category'}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="cat-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingCategory ? 'Update category' : 'Create category'}
            </button>
          </>
        }
      >
        <form id="cat-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="catName">
              Category name
            </label>
            <input
              id="catName"
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="catSlug">
              SEO slug
            </label>
            <input
              id="catSlug"
              type="text"
              className="input-field"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="catParent">
              Parent category
            </label>
            <select
              id="catParent"
              className="select-field"
              value={formData.parentId}
              onChange={(e) => handleInputChange('parentId', e.target.value)}
            >
              <option value="">-- None (root) --</option>
              {flatCategories
                .filter((c) => !editingCategory || c.id !== editingCategory.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className={styles.twoCol}>
            <div className="form-group">
              <label className="form-label" htmlFor="catIcon">
                Icon class
              </label>
              <input
                id="catIcon"
                type="text"
                className="input-field"
                value={formData.icon}
                onChange={(e) => handleInputChange('icon', e.target.value)}
                placeholder="fa-tooth"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="catTags">
                Search keywords
              </label>
              <input
                id="catTags"
                type="text"
                className="input-field"
                value={formData.searchTags}
                onChange={(e) => handleInputChange('searchTags', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="catImage">
              Cover image URL
            </label>
            <input
              id="catImage"
              type="text"
              className="input-field"
              value={formData.imageUrl}
              onChange={(e) => handleInputChange('imageUrl', e.target.value)}
            />
          </div>
          <div className={styles.checkRow}>
            <input
              id="catActive"
              type="checkbox"
              checked={formData.active}
              onChange={(e) => handleInputChange('active', e.target.checked)}
            />
            <label htmlFor="catActive" className="form-label">
              Category is active
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Deactivate category"
        message="Deactivate this category? Subcategories will be hidden."
        confirmLabel="Deactivate"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
