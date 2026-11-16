import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F9FAFB' }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, margin: 0, color: '#3B82F6' }}>404</h1>
        <h2 style={{ margin: '8px 0', color: '#111827' }}>Page not found</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.5 }}>
          The page you are looking for doesn&apos;t exist or was moved.
        </p>
        <Link
          href="/"
          style={{ display: 'inline-block', marginTop: 12, background: '#3B82F6', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 600, textDecoration: 'none' }}
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
