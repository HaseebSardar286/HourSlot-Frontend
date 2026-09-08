'use client';

import type { Branch, Staff } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import CustomSelect from '@/components/CustomSelect';
import styles from './booking.module.css';

interface DetailsStepProps {
  branches: Branch[];
  staff: Staff[];
  selectedBranchId: string;
  selectedStaffId: string;
  onBranchChange: (branchId: string) => void;
  onStaffChange: (staffId: string) => void;
}

export default function DetailsStep({
  branches,
  staff,
  selectedBranchId,
  selectedStaffId,
  onBranchChange,
  onStaffChange,
}: DetailsStepProps) {
  const branchStaff = staff.filter(
    (s) => !selectedBranchId || s.branch?.id?.toString() === selectedBranchId
  );

  return (
    <>
      {branches.length > 1 && (
        <div className={styles.fieldBlock}>
          <label htmlFor="bookingBranch">Location</label>
          <CustomSelect
            id="bookingBranch"
            options={branches.map((b) => ({
              value: String(b.id),
              label: b.name,
              sublabel: b.address,
            }))}
            value={String(selectedBranchId || '')}
            onChange={onBranchChange}
            placeholder="Select a location"
            searchable={branches.length > 6}
          />
        </div>
      )}

      {branches.length === 1 && selectedBranchId && (
        <div className={styles.fieldBlock}>
          <label>Location</label>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-location-dot" style={{ color: 'var(--accent-primary)', marginRight: 8 }} />
            {branches[0].name} — {branches[0].address}
          </p>
        </div>
      )}

      <div className={styles.fieldBlock}>
        <label>Specialist (optional)</label>
        <div className={styles.staffList}>
          <button
            type="button"
            className={`${styles.staffCard} ${selectedStaffId === '' ? styles.staffCardOn : ''}`}
            onClick={() => onStaffChange('')}
          >
            <div className={styles.staffAvatar}>
              <i className="fa-solid fa-user-group" />
            </div>
            <div>
              <strong>No preference</strong>
              <span>First available team member</span>
            </div>
            {selectedStaffId === '' && <i className={`fa-solid fa-check ${styles.staffCheck}`} />}
          </button>
          {branchStaff.length === 0 ? (
            <EmptyState
              icon="fa-user-group"
              title="No specialists listed"
              description="You can still book with any available staff."
            />
          ) : (
            branchStaff.map((s) => {
              const on = selectedStaffId === String(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.staffCard} ${on ? styles.staffCardOn : ''}`}
                  onClick={() => onStaffChange(String(s.id))}
                >
                  <div className={styles.staffAvatar}>{s.name.charAt(0)}</div>
                  <div>
                    <strong>{s.name}</strong>
                    <span>{s.specialty || s.designation || 'Team member'}</span>
                  </div>
                  {on && <i className={`fa-solid fa-check ${styles.staffCheck}`} />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
