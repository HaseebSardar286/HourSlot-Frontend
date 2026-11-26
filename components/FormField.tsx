'use client';

import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import styles from './ui.module.css';
import DatePicker, { DateTimePicker, MonthPicker, TimePicker } from './ui/DatePicker';

const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month']);

/** Date / time / month inputs use the app's own pickers; onChange still receives { target: { value } }. */
function PickerField({ id, type, value, onChange, min, max, disabled }: InputHTMLAttributes<HTMLInputElement>) {
  const v = value == null ? '' : String(value);
  const emit = (next: string) => onChange?.({ target: { value: next }, currentTarget: { value: next } } as never);
  const lo = min == null ? undefined : String(min);
  const hi = max == null ? undefined : String(max);
  if (type === 'time') return <TimePicker id={id} value={v.slice(0, 5)} onChange={emit} min={lo} max={hi} disabled={disabled} />;
  if (type === 'month') return <MonthPicker id={id} value={v} onChange={emit} disabled={disabled} />;
  if (type === 'datetime-local') return <DateTimePicker id={id} value={v} onChange={emit} min={lo?.slice(0, 10)} disabled={disabled} />;
  return <DatePicker id={id} value={v} onChange={emit} min={lo} max={hi} disabled={disabled} clearable />;
}

interface BaseProps {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  children?: ReactNode;
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };

export default function FormField(props: InputProps | TextareaProps) {
  const { label, htmlFor, error, hint, as = 'input', children, ...rest } = props as BaseProps & { as?: 'input' | 'textarea'; type?: string } & Record<string, unknown>;

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children ? (
        children
      ) : as === 'input' && PICKER_TYPES.has(String(rest.type)) ? (
        <PickerField id={htmlFor} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      ) : as === 'textarea' ? (
        <textarea
          id={htmlFor}
          className={`input-field${error ? ' input-error' : ''}`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={htmlFor}
          className={`input-field${error ? ' input-error' : ''}`}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <span className="validation-error">{error}</span>}
      {!error && hint && <span className={styles.formHint}>{hint}</span>}
    </div>
  );
}
