import Link from 'next/link';
import Image from 'next/image';
import HeaderNav from '@/components/HeaderNav';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="app-header">
        <div className="header-container">
          <Link href="/" className="logo-area">
            <Image
              src="/logo-hourslot.png"
              alt="HourSlot"
              width={140}
              height={38}
              className="logo-image"
              priority
              style={{ height: '38px', width: 'auto' }}
            />
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
          <p>© 2026 HourSlot Inc. Smart Booking — Everytime, Everywhere.</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </>
  );
}
