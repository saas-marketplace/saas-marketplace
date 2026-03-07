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
  avatar_url: string | null;
  skills: string[];
  hourly_rate: number | null;
  rating: number;
  review_count: number;
  portfolio_urls: string[];
  portfolio_images: string[];
  is_available: boolean;
  completed_projects: number;
  location: string | null;
  languages: string[];
  created_at: string;
  updated_at: string;
  domain?: Domain;
}

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
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  status: "pending" | "processing" | "completed" | "cancelled" | "refunded";
  total_amount: number;
  currency: string;
  items: any[];
  customer_email: string | null;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
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

export interface ContactSubmission {
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
}