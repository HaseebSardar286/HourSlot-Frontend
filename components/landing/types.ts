export interface DiscoverBranch {
  id: number;
  name: string;
  city?: string;
  address?: string;
  business?: {
    id: number;
    name: string;
    slug?: string;
    rating?: number;
    verified?: boolean;
    logoUrl?: string;
    galleryUrls?: string;
    primaryCategory?: { id?: number; name?: string; slug?: string };
  };
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  imageUrl?: string;
  subcategories?: ApiCategory[];
}

export interface LiveListing {
  businessId: number;
  slug?: string;
  name: string;
  category: string;
  categoryId?: number;
  rating: number;
  location: string;
  verified: boolean;
  imageUrl: string | null;
}

export interface LandingCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  imageUrl: string | null;
  listingCount: number;
  /** Specialties inside this category (subcategory names). */
  subcategories: string[];
  /** Best-rated live providers in this category. */
  providers: { id: number; name: string; slug?: string; rating: number; location: string; imageUrl: string | null }[];
  /** Average rating of rated providers here; 0 when none are rated yet. */
  avgRating: number;
}
