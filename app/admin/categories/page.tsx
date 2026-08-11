'use client';

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
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

  // Form / Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      
      // Flatten categories tree for parent dropdown lists
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this category? Subcategories will be hidden.')) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });
      setMessage('Category deactivated successfully.');
      await loadCategories();
    } catch (err: any) {
      setError(err?.message || 'Deactivation failed.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className="spinner" />
      </div>
    );
  }

  // Render tree node recursively
  const renderCategoryNode = (category: Category, depth = 0) => {
    return (
      <div key={category.id} className={styles.treeNode} style={{ marginLeft: `${depth * 24}px` }}>
        <div className={styles.nodeCard}>
          <div className={styles.nodeInfo}>
            {category.icon ? (
              <span className={styles.nodeIcon}><i className={`fa-solid ${category.icon}`}></i></span>
            ) : (
              <span className={styles.nodeIcon}>🏷️</span>
            )}
            <div>
              <span className={styles.nodeName}>{category.name}</span>
              <span className={styles.nodeSlug}>/c/{category.slug}</span>
            </div>
          </div>

          <div className={styles.nodeActions}>
            <button className={styles.iconBtn} onClick={() => handleEditClick(category)} title="Edit category">
              <i className="fa-solid fa-pen-to-square"></i>
            </button>
            <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(category.id)} title="Deactivate category">
              <i className="fa-solid fa-trash-can"></i>
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
  };

  return (
    <div className={styles.categoriesContainer}>
      <div className={styles.headerRow}>
        <p style={{ color: 'var(--text-secondary)' }}>Manage the system taxonomy for business classification and slot search.</p>
        <button className="btn btn-primary" onClick={handleAddClick}>
          <i className="fa-solid fa-plus"></i> Add Category
        </button>
      </div>

      {message && <div className="success-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-circle-check"></i> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '20px' }}><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}

      <div className={styles.treeLayout}>
        {categories.length === 0 ? (
          <div className="glass-card text-center" style={{ padding: '60px 20px', width: '100%' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏷️</div>
            <h3>No Categories Registered</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Setup root categories for appointment listings.</p>
            <button className="btn btn-primary" onClick={handleAddClick}>Add Category</button>
          </div>
        ) : (
          <div className={styles.treeWrapper}>
            {categories.map((cat) => renderCategoryNode(cat))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3>{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="catName">Category Name</label>
                <input
                  id="catName"
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g. Dental Care or Spa & Massage"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="catSlug">SEO Slug (Optional)</label>
                <input
                  id="catSlug"
                  type="text"
                  className="input-field"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="e.g. dental-care"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="catParent">Parent Category (Optional)</label>
                <select
                  id="catParent"
                  className="input-field"
                  value={formData.parentId}
                  onChange={(e) => handleInputChange('parentId', e.target.value)}
                >
                  <option value="">-- None (Root Category) --</option>
                  {flatCategories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="catIcon">Icon Class (FontAwesome)</label>
                  <input
                    id="catIcon"
                    type="text"
                    className="input-field"
                    value={formData.icon}
                    onChange={(e) => handleInputChange('icon', e.target.value)}
                    placeholder="e.g. fa-tooth or fa-spa"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="catTags">Search Keywords</label>
                  <input
                    id="catTags"
                    type="text"
                    className="input-field"
                    value={formData.searchTags}
                    onChange={(e) => handleInputChange('searchTags', e.target.value)}
                    placeholder="e.g. teeth, whitener, ortho"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="catImage">Cover Image URL (Optional)</label>
                <input
                  id="catImage"
                  type="text"
                  className="input-field"
                  value={formData.imageUrl}
                  onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="catActive"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                />
                <label htmlFor="catActive" className="form-label" style={{ marginBottom: 0 }}>Category is Active</label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submitting}>
                {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
