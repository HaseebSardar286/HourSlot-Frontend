import { Syne, Figtree } from 'next/font/google';
import LandingPage from '@/components/landing/LandingPage';

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-hs-display',
  display: 'swap',
});

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hs-body',
  display: 'swap',
});

export default function HomePage() {
  return (
    <div className={`${syne.variable} ${figtree.variable}`}>
      <LandingPage />
    </div>
  );
}
