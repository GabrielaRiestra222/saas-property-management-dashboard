export interface PropertyImage {
  id: number;
  image_url: string;
  image?: string;
  caption: string;
  order: number;
  is_main: boolean;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string;
  category?: string;
  description?: string;
}

export interface Property {
  id: number;
  title: string;
  slug: string;
  description: string;
  location: string;
  address: string;
  price_per_night: string;
  cleaning_fee: string;
  max_guests: number;
  rooms: number;
  bathrooms: number;
  min_nights: number;
  check_in_time: string;
  check_out_time: string;
  rules: string;
  tourist_registration_number: string;
  size_m2: number | null;
  floor: string;
  construction_year: number | null;
  renovation_year: number | null;
  distribution: Record<string, number | string>;
  beds: Array<{ label: string; size?: string; count?: number }>;
  equipment: Record<string, string[]>;
  warnings: string[];
  is_active: boolean;
  is_published: boolean;
  images: PropertyImage[];
  amenities: Amenity[];
  organization: number;
}

export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  document_id: string;
  nationality: string;
  passport: string;
  notes: string;
  created_at: string;
}

export interface Booking {
  id: number;
  apartment: number;
  apartment_title?: string;
  client: number;
  client_name?: string;
  check_in: string;
  check_out: string;
  total_price: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  num_guests: number;
  notes: string;
  total_paid: string;
  remaining_balance: string;
  payments?: BookingPayment[];
  pending_payments_count?: number;
  price_per_night?: string;
  created_at: string;
  source?: number;
  agency?: number;
  agency_name?: string;
}

export interface BookingPayment {
  id: number;
  booking: number;
  amount_due: string;
  amount_paid: string;
  due_date: string;
  payment_date: string | null;
  payment_method: string;
  status: "PENDING" | "PAID";
  receipt_url: string;
  notes: string;
}

export interface Agency {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  commission_percentage: string;
  contract_start: string | null;
  contract_end: string | null;
  is_active: boolean;
  notes: string;
}

export interface CleaningTask {
  id: number;
  property: number;
  property_title?: string;
  booking: number | null;
  assigned_to: string;
  scheduled_date: string;
  completed_at: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  notes: string;
  fee: string;
}

export interface MaintenanceRequest {
  id: number;
  property: number;
  property_title?: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  assigned_to: number | null;
  assigned_to_name?: string;
  reported_at: string;
  resolved_at: string | null;
  cost: string;
}

export interface CalendarBlock {
  id: number;
  property: number;
  start_date: string;
  end_date: string;
  reason: "BOOKING" | "MAINTENANCE" | "CLEANING" | "OWNER_USE" | "BLOCKED";
  booking: number | null;
  notes: string;
}

export interface Transaction {
  id: number;
  property: number | null;
  booking: number | null;
  category: "INCOME" | "EXPENSE";
  subcategory: string;
  amount: string;
  date: string;
  description: string;
  receipt_url: string;
}

export interface FAQ {
  id: number;
  category: number;
  question: string;
  answer: string;
  is_published: boolean;
  order: number;
}

export interface FAQCategory {
  id: number;
  name: string;
  order: number;
  faqs: FAQ[];
}

export interface DashboardStats {
  total_revenue_month: number;
  total_revenue_year: number;
  active_bookings: number;
  pending_checkins_today: number;
  pending_checkouts_today: number;
  pending_payments: number;
  pending_cleanings: number;
  open_maintenance: number;
  occupancy_rate_percent: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export type PropertyPayload = Omit<Property, "id" | "slug" | "organization" | "amenities"> & {
  amenities: number[];
};
export type BookingPayload = Omit<
  Booking,
  "id" | "created_at" | "total_paid" | "remaining_balance" | "payments" | "pending_payments_count" | "price_per_night"
>;
export type ClientPayload = Omit<Client, "id" | "created_at">;
export type PaymentPayload = Omit<BookingPayment, "id" | "receipt_url">;
export type AgencyPayload = Omit<Agency, "id">;
export type CleaningTaskPayload = Omit<CleaningTask, "id" | "completed_at">;
export type MaintenancePayload = Omit<MaintenanceRequest, "id" | "reported_at" | "resolved_at" | "property_title" | "assigned_to_name">;
export type CalendarBlockPayload = Omit<CalendarBlock, "id">;
export type TransactionPayload = Omit<Transaction, "id" | "receipt_url">;
export type FAQPayload = Omit<FAQ, "id">;
export type FAQCategoryPayload = Omit<FAQCategory, "id" | "faqs">;

export type TeamMemberRole = "CLEANING" | "CHECKIN" | "MAINTENANCE" | "ADMIN";

export interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: TeamMemberRole;
  photo_url: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export type TeamMemberPayload = Omit<TeamMember, "id" | "created_at">;
