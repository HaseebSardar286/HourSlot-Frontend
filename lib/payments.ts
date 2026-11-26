/**
 * Payments, receipts, invoices and tickets. Duemet never holds money: customers pay businesses directly and
 * businesses pay Duemet directly. These types describe the records the platform keeps about those payments.
 */

export type MethodType = 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER' | 'RAAST' | 'CARD_AT_VENUE' | 'OTHER';

export const METHOD_LABEL: Record<MethodType, string> = {
  CASH: 'Cash',
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'Easypaisa',
  BANK_TRANSFER: 'Bank transfer',
  RAAST: 'Raast',
  CARD_AT_VENUE: 'Card at the venue',
  OTHER: 'Other',
};

export const METHOD_ICON: Record<MethodType, string> = {
  CASH: 'fa-money-bill-wave',
  JAZZCASH: 'fa-mobile-screen',
  EASYPAISA: 'fa-mobile-screen',
  BANK_TRANSFER: 'fa-building-columns',
  RAAST: 'fa-bolt',
  CARD_AT_VENUE: 'fa-credit-card',
  OTHER: 'fa-wallet',
};

/** Methods a customer pays remotely and then reports with a transaction ID. */
export const REMOTE_METHODS: MethodType[] = ['JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER', 'RAAST', 'OTHER'];

export const methodLabel = (m?: string) => m === "CARD" ? "Card (Safepay)" : METHOD_LABEL[(m || 'OTHER') as MethodType] || m || 'Other';

export type PaymentMethod = {
  id: number;
  methodType: MethodType;
  accountTitle?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  bankName?: string | null;
  instructions?: string | null;
  /** The business's own QR image (e.g. a Raast or wallet merchant QR). */
  qrImageUrl?: string | null;
  active: boolean;
  sortOrder?: number;
};

export type TransferMode = 'OFF' | 'OPTIONAL' | 'REQUIRED';

export type PaymentSettings = { transferMode: TransferMode; payWindowMinutes: number };

/** What the booking screen may offer for a business. */
export type BookingPaymentOptions = {
  transferAvailable: boolean;
  transferRequired: boolean;
  payWindowMinutes: number;
  methods: MethodType[];
};

/** Text encoded in a generated QR: the details someone needs to send money to this account. */
export function qrText(m: PaymentMethod, amount?: string) {
  return [
    METHOD_LABEL[m.methodType],
    m.accountTitle && `Title: ${m.accountTitle}`,
    m.bankName && `Bank: ${m.bankName}`,
    m.iban && `IBAN: ${m.iban}`,
    m.accountNumber && `${m.methodType === 'BANK_TRANSFER' ? 'Account' : m.methodType === 'RAAST' ? 'Raast ID' : 'Number'}: ${m.accountNumber}`,
    amount && `Amount: ${amount}`,
  ].filter(Boolean).join('\n');
}

export function windowLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} hour${h === 1 ? '' : 's'}` : `${Math.floor(h)} h ${minutes % 60} min`;
}

export type PaymentRecord = {
  id: number;
  bookingId: number;
  amount: number;
  currency: string;
  methodType: MethodType;
  reference?: string | null;
  note?: string | null;
  status: 'SUBMITTED' | 'CONFIRMED' | 'REJECTED';
  submittedBy: 'CUSTOMER' | 'BUSINESS';
  receiptNumber?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  /** A customer's payment screenshot is attached. */
  hasProof?: boolean;
  bookingCode?: string;
  bookingTime?: string;
  bookingStatus?: string;
  totalPrice?: number;
  serviceName?: string;
  customerName?: string;
};

export type BookingTicket = {
  booking: {
    id: number;
    publicCode: string;
    businessId: number;
    bookingTime: string;
    endTime?: string;
    status: string;
    totalPrice?: number;
    currency?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    /** Unpaid transfer bookings hold their slot until this time. */
    paymentDueAt?: string | null;
    /** Owed back to the customer after a paid booking was cancelled. */
    refundDueAmount?: number | null;
    refundedAt?: string | null;
    businessName: string;
    businessSlug?: string;
    businessPhone?: string;
    branchName?: string;
    branchAddress?: string;
    serviceName?: string;
    durationMinutes?: number;
    staffName?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
  payments: PaymentRecord[];
  paymentMethods: PaymentMethod[];
  total: number;
  paid: number;
  due: number;
  pendingReview: boolean;
  /** Booked with "pay now by transfer" and not yet confirmed. */
  awaitingPayment?: boolean;
};

export type Receipt = PaymentRecord & {
  businessName: string;
  businessPhone?: string;
  branchAddress?: string;
  totalPrice?: number;
  customerEmail?: string;
};

export type Payee = {
  companyName: string;
  companyAddress?: string | null;
  companyEmail?: string | null;
  accountTitle?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  jazzcash?: string | null;
  easypaisa?: string | null;
  instructions?: string | null;
  configured: boolean;
};

export type InvoiceStatus = 'ISSUED' | 'PAYMENT_SUBMITTED' | 'PAID' | 'VOID';

export type Invoice = {
  id: number;
  /** Set only once the payment is confirmed and the plan is active. */
  invoiceNumber?: string | null;
  /** The payment request's number while it is unpaid. */
  requestNumber?: string | null;
  organizationId: number;
  organizationName?: string;
  businessName?: string;
  billingEmail?: string;
  planId: number;
  planCode: string;
  planName: string;
  months: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate?: string | null;
  paymentMethod?: MethodType | null;
  paymentReference?: string | null;
  paymentNote?: string | null;
  /** The account the business paid Duemet from. */
  payerName?: string | null;
  payerAccount?: string | null;
  submittedAt?: string | null;
  paidAt?: string | null;
  adminNote?: string | null;
  createdAt: string;
  /** ACTIVE: plan switched on while the payment is verified; REVERTED: not verified in time. */
  provisionalState?: 'ACTIVE' | 'CONFIRMED' | 'REVERTED' | null;
  provisionalUntil?: string | null;
  wasRejected?: boolean;
  payee?: Payee;
};

/** Invoice number once paid, otherwise the payment request number. */
export function billNumber(inv: Pick<Invoice, 'invoiceNumber' | 'requestNumber'>): string {
  return inv.invoiceNumber || inv.requestNumber || '—';
}

export type BillingOverview = {
  plan: { planCode: string; planName: string; status?: string; price?: number; currency?: string };
  subscription: { status?: string; autoRenew?: boolean; safepayStatus?: string | null; currentPeriodStart?: string | null; currentPeriodEnd?: string | null; planCode?: string; planName?: string };
  plans: { id: number; code: string; name: string; price: number; currency: string; billingInterval?: string; cardReady?: boolean }[];
  invoices: Invoice[];
  payee: Payee;
  terms: number[];
  /** Days a bank/wallet plan stays on while the payment is verified. */
  provisionalDays?: number;
};

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: 'amber' | 'blue' | 'green' | 'slate' }> = {
  ISSUED: { label: 'Unpaid', tone: 'amber' },
  PAYMENT_SUBMITTED: { label: 'Payment being checked', tone: 'blue' },
  PAID: { label: 'Paid', tone: 'green' },
  VOID: { label: 'Cancelled', tone: 'slate' },
};

export const PAYMENT_STATUS: Record<PaymentRecord['status'], { label: string; tone: 'amber' | 'green' | 'rose' }> = {
  SUBMITTED: { label: 'To confirm', tone: 'amber' },
  CONFIRMED: { label: 'Confirmed', tone: 'green' },
  REJECTED: { label: 'Not matched', tone: 'rose' },
};

/** "PKR 2,500" — whole rupees unless there are paisa. */
export function money(amount: number | string | null | undefined, currency = 'PKR') {
  const n = Number(amount || 0);
  const digits = Number.isInteger(n) ? 0 : 2;
  return `${(currency || 'PKR').trim()} ${n.toLocaleString('en-PK', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function dateLabel(value?: string | null, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

export type SupportCategory = 'BOOKING' | 'PAYMENT' | 'SUBSCRIPTION' | 'ACCOUNT' | 'VERIFICATION' | 'OTHER';
export type SupportStatus = 'OPEN' | 'WAITING_ON_USER' | 'RESOLVED' | 'CLOSED';

export const SUPPORT_CATEGORY: Record<SupportCategory, string> = {
  BOOKING: 'Booking',
  PAYMENT: 'Payment',
  SUBSCRIPTION: 'Subscription & invoices',
  ACCOUNT: 'Account & sign-in',
  VERIFICATION: 'Verification',
  OTHER: 'Something else',
};

export const SUPPORT_STATUS: Record<SupportStatus, { label: string; tone: 'amber' | 'blue' | 'green' | 'slate' }> = {
  OPEN: { label: 'Open', tone: 'amber' },
  WAITING_ON_USER: { label: 'Replied', tone: 'blue' },
  RESOLVED: { label: 'Resolved', tone: 'green' },
  CLOSED: { label: 'Closed', tone: 'slate' },
};

export type SupportTicket = {
  id: number;
  ticketNumber: string;
  userId: number;
  businessId?: number | null;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
  lastMessageAt: string;
  userName?: string;
  userEmail?: string;
  businessName?: string | null;
  messageCount?: number;
  lastFromStaff?: boolean | null;
  messages?: { id: number; body: string; fromStaff: boolean; createdAt: string; authorName: string }[];
};
