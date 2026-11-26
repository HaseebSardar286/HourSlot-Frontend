export type Kind = 'business' | 'provider' | 'member';

export type Mention = { id: number; name: string; slug: string; kind: Kind };

export type Author = {
  id: number;
  name: string;
  kind: Kind;
  businessName?: string;
  businessSlug?: string;
  verified?: boolean;
};

export type MediaItem = { url: string; type: 'image' | 'video' };

export type FeedPost = {
  id: number;
  communityId?: number | null;
  communityName?: string | null;
  type: 'POST' | 'REVIEW' | 'QUESTION';
  rating?: number | null;
  title?: string | null;
  body: string;
  media: MediaItem[];
  mentions: Mention[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: Author;
  subject?: { id: number; name: string; slug: string; kind: Kind; verified?: boolean };
};

export type FeedComment = {
  id: number;
  parentId: number | null;
  body: string;
  mentions: Mention[];
  createdAt: string;
  author: Author;
};

export type Mentionable = {
  id: number;
  name: string;
  slug: string;
  kind: Kind;
  verified?: boolean;
  category?: string;
  rating?: number | null;
  city?: string | null;
};

export type CommunityInfo = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  city?: string;
  members: number;
  posts: number;
};

export type Sidebar = {
  communities: CommunityInfo[];
  trending: (Mentionable & { mentions: number })[];
  stats: { posts: number; reviews: number; members: number };
};

export function timeAgo(value: string) {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'D';
}

const TONES = ['#2563eb', '#0891b2', '#7c3aed', '#059669', '#d97706', '#db2777', '#4f46e5', '#0f766e'];
export function tone(seed: string | number) {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

export function profileHref(m: { slug: string }) {
  return `/b/${m.slug}`;
}

/** Converts "@Name" spans the user picked from the mention menu into server tokens "@[Name](b:id)". */
export function encodeMentions(text: string, picked: Mention[]) {
  let out = text;
  const seen = new Set<number>();
  for (const m of [...picked].sort((a, b) => b.name.length - a.name.length)) {
    if (seen.has(m.id)) continue;
    const plain = `@${m.name}`;
    if (out.includes(plain)) {
      out = out.split(plain).join(`@[${m.name}](b:${m.id})`);
      seen.add(m.id);
    }
  }
  return out;
}
