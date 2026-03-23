-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email character varying NOT NULL,
  action character varying NOT NULL,
  section character varying NOT NULL,
  details text,
  ip_address character varying,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_image text,
  author_name text,
  author_avatar text,
  category text,
  tags ARRAY DEFAULT '{}'::text[],
  read_time integer DEFAULT 5,
  is_published boolean DEFAULT true,
  published_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blogs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text,
  image_url text,
  author text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blogs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cart (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  product_id uuid,
  quantity integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_pkey PRIMARY KEY (id),
  CONSTRAINT cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT cart_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.client_reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  reviewer_name text NOT NULL,
  reviewer_title text,
  reviewer_company text,
  reviewer_avatar text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  is_anonymous boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT client_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT client_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.contact_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  phone text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_submissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.domains (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  image_url text,
  freelancer_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT domains_pkey PRIMARY KEY (id)
);
CREATE TABLE public.freelancers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  domain_id uuid,
  display_name text NOT NULL,
  title text,
  bio text,
  avatar_url text,
  skills ARRAY DEFAULT '{}'::text[],
  hourly_rate numeric,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  portfolio_urls ARRAY DEFAULT '{}'::text[],
  portfolio_images ARRAY DEFAULT '{}'::text[],
  is_available boolean DEFAULT true,
  completed_projects integer DEFAULT 0,
  location text,
  languages ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  experience_level text,
  description text,
  CONSTRAINT freelancers_pkey PRIMARY KEY (id),
  CONSTRAINT freelancers_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  link character varying,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  stripe_session_id text,
  stripe_payment_intent text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'cancelled'::text, 'refunded'::text])),
  total_amount numeric NOT NULL,
  currency text DEFAULT 'usd'::text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_email text,
  customer_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.product_likes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  product_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_likes_pkey PRIMARY KEY (id),
  CONSTRAINT product_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT product_likes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  long_description text,
  price numeric NOT NULL,
  sale_price numeric,
  category text NOT NULL CHECK (category = ANY (ARRAY['ebooks'::text, 'templates'::text, 'design'::text, 'assets'::text])),
  image_url text,
  gallery_urls ARRAY DEFAULT '{}'::text[],
  file_url text,
  file_size text,
  file_format text,
  tags ARRAY DEFAULT '{}'::text[],
  features ARRAY DEFAULT '{}'::text[],
  like_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  author_name text,
  author_avatar text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.request_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  request_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT request_messages_pkey PRIMARY KEY (id),
  CONSTRAINT request_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id),
  CONSTRAINT request_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.request_typing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_typing boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT request_typing_pkey PRIMARY KEY (id),
  CONSTRAINT request_typing_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id),
  CONSTRAINT request_typing_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'received'::text, 'answered'::text])),
  created_at timestamp with time zone DEFAULT now(),
  freelancer_id uuid,
  freelancer_domain text,
  freelancer_characteristics jsonb,
  subject_type text DEFAULT 'custom'::text CHECK (subject_type = ANY (ARRAY['hire'::text, 'info'::text, 'project'::text, 'custom'::text])),
  freelancer_data jsonb,
  CONSTRAINT requests_pkey PRIMARY KEY (id),
  CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT requests_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.freelancers(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  freelancer_id uuid NOT NULL,
  user_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.freelancers(id)
);
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key character varying NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  role_label text NOT NULL DEFAULT 'Member'::text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  needs_access_restored boolean NOT NULL DEFAULT false,
  avatar_url text,
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT team_members_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  notification_settings jsonb DEFAULT '{"weekly_summary": false, "security_alerts": true, "dashboard_alerts": true, "new_message_alerts": true, "new_request_alerts": true, "blog_comment_alerts": true, "email_notifications": true, "product_update_alerts": true, "team_invitation_alerts": true}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_online boolean DEFAULT false,
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_status_pkey PRIMARY KEY (id),
  CONSTRAINT user_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user'::text CHECK (role IS NULL OR role = 'user'::text OR role = 'admin'::text OR role = 'super_admin'::text),
  bio text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = 'active'::text OR status = 'suspended'::text OR status = 'removed'::text OR status = 'restored'::text),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
--Policies 
blog_posts


Name	Command	Applied to	Actions

Public read access
SELECT	
public

blogs


Name	Command	Applied to	Actions

Allow authenticated users to delete blogs
DELETE	
public


Allow authenticated users to insert blogs
INSERT	
public


Allow authenticated users to update blogs
UPDATE	
public


Allow public read access to blogs
SELECT	
public


authenticated_full_access
ALL	
public



cart



Name	Command	Applied to	Actions

authenticated_full_access
ALL	
public


Users manage own cart
ALL	
public



client_reviews


Name	Command	Applied to	Actions

Authenticated users can submit testimonials
INSERT	
public


Public read access
SELECT	
public

contact_submissions

Name	Command	Applied to	Actions

Anyone can submit contact
INSERT	
public



domains


Name	Command	Applied to	Actions

Admin can delete domains1
DELETE	
public


Admin can insert domains1
INSERT	
public


Admin can update domains1
UPDATE	
public


Allow authenticated delete domains
DELETE	
public


Allow authenticated insert domains
INSERT	
public


Allow authenticated update domains
UPDATE	
public


Allow public read access to domains
SELECT	
public


authenticated_full_access
ALL	
public


Public read access
SELECT	
public



freelancers

Name	Command	Applied to	Actions

Admin can delete freelancers
DELETE	
public


Admin can insert freelancers
INSERT	
public


Admin can update freelancers
UPDATE	
public


authenticated_full_access
ALL	
public


Freelancers are viewable by everyone
SELECT	
public


Public read access
SELECT	
public



orders


Name	Command	Applied to	Actions

Users create orders
INSERT	
public


Users view own orders
SELECT	
public

product_likes

Disable RLS

Create policy

Name	Command	Applied to	Actions

Public read likes
SELECT	
public


Users manage own likes
ALL	
public



products


Name	Command	Applied to	Actions

Admin can delete products
DELETE	
public


Admin can insert products
INSERT	
public


Admin can update products
UPDATE	
public


authenticated_full_access
ALL	
public


Products are viewable by everyone
SELECT	
public


Public read access
SELECT	
public



request_messages

Name	Command	Applied to	Actions

Admins can create request messages
INSERT	
public


Admins can view all request messages
SELECT	
public


authenticated_full_access
ALL	
public


Users can create own request messages
INSERT	
public


Users can view own request messages
SELECT	
public



requests


Name	Command	Applied to	Actions

Admins can update all requests
UPDATE	
public


Admins can view all requests
SELECT	
public


authenticated_full_access
ALL	
public


Users can create requests
INSERT	
public


Users can update own requests
UPDATE	
public


Users can view own requests
SELECT	
public

reviews

Name	Command	Applied to	Actions

Anyone can read reviews
SELECT	
public


Public read access for reviews
SELECT	
public


Users can create reviews
INSERT	
authenticated


Users can delete own reviews
DELETE	
public


Users can insert own reviews
INSERT	
public


Users can update own reviews
UPDATE	
public



team_members


Name	Command	Applied to	Actions

Admin users can view team members
SELECT	
public


authenticated_full_access
ALL	
public


Super admin can delete team members
DELETE	
public


Super admin can insert team members
INSERT	
public


Super admin can update team members
UPDATE	
public



users


Name	Command	Applied to	Actions

authenticated_full_access
ALL	
public


Public read users
SELECT	
public


Users can insert own profile
INSERT	
public


Users can update own profile
UPDATE	
public 