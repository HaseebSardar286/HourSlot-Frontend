import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import HeaderNav from '@/components/HeaderNav';

export const metadata: Metadata = {
  title: 'HourSlot — Appointments Simplified',
  description: 'Book appointments easily with businesses near you, or manage your business schedule with HourSlot.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <header className="app-header">
            <div className="header-container">
              <Link href="/" className="logo-area">
                <span className="logo-icon">⏳</span>
                <span className="logo-text">
                  Hour<span className="logo-highlight">Slot</span>
                </span>
              </Link>

              <nav className="nav-links">
                <a className="nav-link" href="#">Explore</a>
                <a className="nav-link" href="#">Categories</a>
                <a className="nav-link" href="#">About</a>
              </nav>

              <HeaderNav />
            </div>
          </header>

          <main className="app-main">
            {children}
          </main>

          <footer className="app-footer">
            <div className="footer-container">
              <p>© 2026 HourSlot Inc. Appointments Simplified. Everytime. Everywhere.</p>
              <div className="footer-links">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Support</a>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
