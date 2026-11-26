import type { LiveListing } from './types';

export function firstMediaUrl(galleryUrls?: string, logoUrl?: string): string | null {
  const gallery = galleryUrls
    ?.split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (gallery && gallery.length > 0) return gallery[0];
  return logoUrl || null;
}

export function categoryIconClass(name: string, icon?: string): string {
  if (icon) {
    if (icon.includes('fa-')) return icon.startsWith('fa-') ? `fa-solid ${icon}` : icon;
    return `fa-solid ${icon}`;
  }
  const lower = name.toLowerCase();
  if (lower.includes('health') || lower.includes('medical') || lower.includes('dentist'))
    return 'fa-solid fa-heart-pulse';
  if (lower.includes('beauty') || lower.includes('spa') || lower.includes('wellness'))
    return 'fa-solid fa-spa';
  if (lower.includes('fitness') || lower.includes('yoga') || lower.includes('gym'))
    return 'fa-solid fa-dumbbell';
  if (lower.includes('salon') || lower.includes('hair') || lower.includes('barber'))
    return 'fa-solid fa-scissors';
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('vet')) return 'fa-solid fa-paw';
  if (lower.includes('home') || lower.includes('service') || lower.includes('repair'))
    return 'fa-solid fa-wrench';
  return 'fa-solid fa-shapes';
}

const CATEGORY_PHOTOS: [RegExp, string][] = [
  [/barber/, '/landing/barber.jpg'],
  [/hair|salon|stylist/, '/landing/salon.jpg'],
  [/nail|manicure|pedicure/, '/landing/nails.jpg'],
  [/massage|physio/, '/landing/massage.jpg'],
  [/spa|wellness|relax/, '/landing/spa.jpg'],
  [/beauty|skin|facial|makeup|cosmetic|aesthetic/, '/landing/facial.jpg'],
  [/dent|teeth|oral/, '/landing/dentist.jpg'],
  [/health|medical|clinic|doctor|therapy|care/, '/landing/clinic.jpg'],
  [/yoga|pilates|meditat/, '/landing/yoga.jpg'],
  [/fitness|gym|trainer|sport/, '/landing/gym.jpg'],
  [/clean|home|house|repair|maint|plumb|electric/, '/landing/cleaning.jpg'],
];

const FALLBACK_PHOTOS = ['/landing/salon-chairs.jpg', '/landing/spa.jpg', '/landing/clinic.jpg'];

/** A local stand-in photograph for a category that has no cover image of its own. */
export function categoryPhoto(name: string): string {
  const lower = name.toLowerCase();
  for (const [re, src] of CATEGORY_PHOTOS) {
    if (re.test(lower)) return src;
  }
  let hash = 0;
  for (const ch of lower) hash = (hash + ch.charCodeAt(0)) % 997;
  return FALLBACK_PHOTOS[hash % FALLBACK_PHOTOS.length];
}

export function listingHref(listing: LiveListing) {
  if (listing.slug) return `/b/${encodeURIComponent(listing.slug)}`;
  return `/profile/business/${listing.businessId}`;
}
