export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin" | "freelancer";
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  freelancer_count: number;
  created_at: string;
}

export interface Freelancer {
  id: string;
  user_id: string | null;
  domain_id: string | null;
  display_name: string;
  title: string | null;
  bio: string | null;
  description: string | null;
  avatar_url: string | null;
  skills: string[];
  rating: number;
  review_count: number;
  portfolio_urls: string[];
  portfolio_images: string[];
  is_available: boolean;
  completed_projects: number;
  location: string | null;
  languages: string[];
  experience_level: string | null;
  created_at: string;
  updated_at: string;
  domain?: Domain;
}

/** A subscription plan that can be purchased via Flouci recurring subscriptions. */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_tnd: number;
  currency: string;
  interval: "month" | "year";
  interval_count: number;
  features: string[];
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type ProductType = "one_time" | "subscription";

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  price: number;
  sale_price: number | null;
  category: "ebooks" | "templates" | "design" | "assets";
  image_url: string | null;
  gallery_urls: string[];
  file_url: string | null;
  file_size: string | null;
  file_format: string | null;
  tags: string[];
  features: string[];
  like_count: number;
  download_count: number;
  is_featured: boolean;
  is_active: boolean;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  product_type?: ProductType;
  subscription_plans?: SubscriptionPlan[];
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string | null;
  payment_provider: "flouci" | null;
  payment_reference: string | null;
  status: "pending" | "processing" | "completed" | "cancelled" | "refunded";
  total_amount: number;
  currency: string;
  items: any[];
  customer_email: string | null;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
  paid_at?: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  flouci_subscription_id: string | null;
  developer_tracking_id: string | null;
  flouci_client_id: string | null;
  status: "incomplete" | "incomplete_expired" | "active" | "past_due" | "unpaid" | "canceled";
  price_tnd: number;
  amount_millimes: number;
  currency: string;
  interval: "month" | "year";
  interval_count: number;
  current_period_start: string | null;
  current_period_end: string | null;
  next_charge_at: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  plan_id: string | null;
  flouci_payment_id: string | null;
  flouci_subscription_id: string | null;
  amount_millimes: number;
  amount_tnd: number;
  currency: string;
  status: "success" | "pending" | "expired" | "failure" | "preauth_success" | "system_failure";
  payment_type: "subscription_create" | "subscription_cycle" | "subscription_retry" | "one_time";
  billing_reason: string | null;
  settlement_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlouciWebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  subscription_id: string | null;
  payment_id: string | null;
  payload: Record<string, unknown>;
  received_at: string;
  processed_at: string | null;
  processing_status: "pending" | "processed" | "failed";
}

export interface FreelancerReview {
  id: string;
  freelancer_id: string;
  user_id: string | null;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  freelancer_id: string;
  user_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export interface ClientReview {
  id: string;
  user_id: string | null;
  reviewer_name: string;
  reviewer_title: string | null;
  reviewer_company: string | null;
  reviewer_avatar: string | null;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  is_featured: boolean;
  created_at: string;
}

export interface Request {
  id: string;
  user_id: string;
  title: string | null;
  status: 'pending' | 'received' | 'answered';
  created_at: string;
}

export interface RequestMessage {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface UserRequest {
  id: string;
  user_id: string;
  freelancer_id: string | null;
  recipient_id: string | null;
  request_type: 'admin' | 'freelancer';
  subject: string | null;
  message: string;
  status: 'pending' | 'received' | 'answered';
  created_at: string;
  updated_at: string;
  freelancer?: {
    id: string;
    display_name: string;
    title?: string;
    avatar_url?: string;
  } | null;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  freelancer_name?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  author_name: string | null;
  author_avatar: string | null;
  category: string | null;
  tags: string[];
  read_time: number;
  is_published: boolean;
  published_at: string;
  created_at: string;
}

export interface Blog {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  author: string | null;
  created_at: string;
}

export interface ContactSubmission {
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  role_label: string;
  permissions: import('./permissions').Permissions;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}