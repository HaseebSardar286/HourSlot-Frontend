'use client';

import styles from './ui.module.css';

interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  current: number;
}

export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className={styles.stepper} aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}>
              <div className={styles.stepDot}>
                {done ? <i className="fa-solid fa-check" aria-hidden /> : i + 1}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`${styles.stepConnector} ${done ? styles.stepConnectorDone : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
