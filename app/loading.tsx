export default function Loading() {
  return (
    <main
      style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', background: '#f6f8fb' }}
      aria-busy="true"
      aria-live="polite"
    >
      <p style={{ color: '#6B7280' }}>Loading…</p>
    </main>
  );
}
