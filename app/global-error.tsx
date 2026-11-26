'use client';

// Rendered only if the root layout itself crashes, so it must supply its own <html>/<body>.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f6f8fb' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }} role="alert">
          <div>
            <h1 style={{ color: '#0f172a' }}>Something went wrong</h1>
            <p style={{ color: '#6B7280' }}>Please reload the page.</p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 5, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
