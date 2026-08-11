export type UserRole =
  | 'CUSTOMER'
  | 'BUSINESS_OWNER'
  | 'BUSINESS_STAFF'
  | 'SUPER_ADMIN'
  | 'ADMIN';

export type BusinessStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'IN_PROGRESS'
  | 'RESCHEDULED';

export interface Category {
  id: number;
  name: string;
  slug: string;
  iconClass?: string;
  subcategories?: Category[];
}

export interface UserSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
}

export interface Business {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  status: BusinessStatus;
  verified: boolean;
  commissionRate?: number;
  rating?: number;
  rejectionReason?: string;
  slug?: string;
  registrationNumber?: string;
  galleryUrls?: string;
  primaryCategory?: Category | null;
  secondaryCategories?: Category[];
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phoneNumber?: string;
  business: Business;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  bufferMinutes?: number;
}

export interface Staff {
  id: number;
  name: string;
  designation?: string;
  specialty?: string;
  branch: { id: number; name: string };
  rating?: number;
}

export interface Booking {
  id: number;
  customer: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string;
    };
  };
  branch: Branch;
  service: Service;
  staff?: Staff;
  bookingTime: string;
  endTime: string;
  status: BookingStatus;
  price: number;
  paymentStatus?: string;
  clientNotes?: string;
}

export interface WorkingHour {
  id: number;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  closed: boolean;
}

export interface Review {
  id: number;
  customer: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface PublicBusinessProfile {
  business: Business;
  branches: Branch[];
  services: Service[];
  staff: Staff[];
  reviews: Review[];
  averageRating: number;
}

export interface ApiError {
  code?: string;
  message?: string;
}
