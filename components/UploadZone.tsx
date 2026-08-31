'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import styles from './ui.module.css';

interface UploadZoneProps {
  id?: string;
  accept?: string;
  maxSizeMB?: number;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  hint?: string;
}

export default function UploadZone({
  id = 'file-upload',
  accept = '*/*',
  maxSizeMB = 15,
  selectedFile,
  onFileChange,
  hint,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size <= maxSizeMB * 1024 * 1024) {
        onFileChange(file);
      } else {
        alert(`File is too large. Max size is ${maxSizeMB}MB.`);
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size <= maxSizeMB * 1024 * 1024) {
        onFileChange(file);
      } else {
        alert(`File is too large. Max size is ${maxSizeMB}MB.`);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('image')) return 'fa-file-image';
    if (type.includes('word') || type.includes('document')) return 'fa-file-word';
    return 'fa-file';
  };

  return (
    <div style={{ width: '100%' }}>
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        style={{ display: 'none' }}
        accept={accept}
        onChange={handleFileChange}
      />

      {!selectedFile ? (
        <div
          className={`${styles.uploadZone} ${isDragActive ? styles.uploadZoneActive : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <div className={styles.uploadIcon}>
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <div className={styles.uploadTitle}>Drag and drop your file here</div>
          <div className={styles.uploadSub}>
            or <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>browse files</span> on your computer
          </div>
          {hint && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>}
        </div>
      ) : (
        <div className={styles.filePreview}>
          <div className={styles.fileMeta}>
            <div className={styles.fileIcon}>
              <i className={`fa-solid ${getFileIcon(selectedFile.type)}`}></i>
            </div>
            <div>
              <div className={styles.fileName}>{selectedFile.name}</div>
              <div className={styles.fileSize}>{formatBytes(selectedFile.size)}</div>
            </div>
          </div>
          <button
            type="button"
            className={styles.removeFileBtn}
            onClick={() => onFileChange(null)}
            aria-label="Remove file"
            title="Remove file"
          >
            <i className="fa-solid fa-circle-xmark"></i>
          </button>
        </div>
      )}
    </div>
  );
}
