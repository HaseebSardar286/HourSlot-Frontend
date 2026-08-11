'use client';

import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

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
  const { label, htmlFor, error, hint, as = 'input', children, ...rest } = props as any;

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={htmlFor}>{label}</label>
      {children ? (
        children
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
      {!error && hint && <span className="validation-error" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}
