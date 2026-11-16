'use client';

import { useEffect } from 'react';

export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={wrap} role="alert">
      <div style={card}>
        <h1 style={title}>Something went wrong</h1>
        <p style={text}>
          We hit an unexpected problem. Your data is safe — please try again.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => retry()} style={primaryBtn}>
            Try again
          </button>
          <a href="/" style={secondaryBtn}>
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}

const wrap: React.CSSProperties = {
  minHeight: '70vh',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: '#F9FAFB',
};
const card: React.CSSProperties = {
  maxWidth: 440,
  textAlign: 'center',
  background: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: 16,
  padding: 32,
};
const title: React.CSSProperties = { fontSize: 22, margin: '0 0 8px', color: '#111827' };
const text: React.CSSProperties = { color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 };
const primaryBtn: React.CSSProperties = {
  background: '#3B82F6', color: '#fff', border: 0, borderRadius: 10,
  padding: '10px 18px', fontWeight: 600, cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 10,
  padding: '10px 18px', fontWeight: 600, textDecoration: 'none',
};
