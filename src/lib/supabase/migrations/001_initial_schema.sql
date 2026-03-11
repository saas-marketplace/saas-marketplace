-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'freelancer')),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domains (freelancer categories)
CREATE TABLE public.domains (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  freelancer_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Freelancers
CREATE TABLE public.freelancers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  skills TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  portfolio_urls TEXT[] DEFAULT '{}',
  portfolio_images TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT TRUE,
  completed_projects INT DEFAULT 0,
  location TEXT,
  languages TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (marketplace)
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  category TEXT NOT NULL CHECK (category IN ('ebooks', 'templates', 'design', 'assets')),
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  file_url TEXT,
  file_size TEXT,
  file_format TEXT,
  tags TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  like_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  author_name TEXT,
  author_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product likes
CREATE TABLE public.product_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Cart
CREATE TABLE public.cart (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  items JSONB NOT NULL DEFAULT '[]',
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Freelancer reviews
CREATE TABLE public.freelancer_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  freelancer_id UUID REFERENCES public.freelancers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client reviews (testimonials)
CREATE TABLE public.client_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_title TEXT,
  reviewer_company TEXT,
  reviewer_avatar TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact submissions
CREATE TABLE public.contact_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  phone TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog posts
CREATE TABLE public.blog_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  cover_image TEXT,
  author_name TEXT,
  author_avatar TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  read_time INT DEFAULT 5,
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON public.domains FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.freelancers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access" ON public.client_reviews FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.freelancer_reviews FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);

-- Authenticated user policies
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own likes" ON public.product_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read likes" ON public.product_likes FOR SELECT USING (true);

CREATE POLICY "Users manage own cart" ON public.cart FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can review" ON public.freelancer_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can submit testimonials" ON public.client_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can submit contact" ON public.contact_submissions FOR INSERT WITH CHECK (true);

-- Functions
CREATE OR REPLACE FUNCTION update_freelancer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.freelancers
  SET
    rating = (SELECT AVG(rating) FROM public.freelancer_reviews WHERE freelancer_id = NEW.freelancer_id),
    review_count = (SELECT COUNT(*) FROM public.freelancer_reviews WHERE freelancer_id = NEW.freelancer_id)
  WHERE id = NEW.freelancer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_trigger
AFTER INSERT ON public.freelancer_reviews
FOR EACH ROW EXECUTE FUNCTION update_freelancer_rating();

CREATE OR REPLACE FUNCTION update_product_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET like_count = like_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET like_count = like_count - 1 WHERE id = OLD.product_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_likes_trigger
AFTER INSERT OR DELETE ON public.product_likes
FOR EACH ROW EXECUTE FUNCTION update_product_likes();

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed Data

-- Domains
INSERT INTO public.domains (name, slug, description, icon, freelancer_count) VALUES
('Web Development', 'web-development', 'Full-stack web development services including React, Next.js, and more', 'code', 24),
('Graphic Design', 'graphic-design', 'Creative design services for branding, UI/UX, and marketing materials', 'palette', 18),
('Video Editing', 'video-editing', 'Professional video editing, motion graphics, and post-production', 'video', 12),
('Marketing', 'marketing', 'Digital marketing, SEO, social media management, and advertising', 'megaphone', 15),
('Copywriting', 'copywriting', 'Compelling copy for websites, blogs, ads, and content marketing', 'pencil', 20);

-- Products
INSERT INTO public.products (title, slug, description, long_description, price, sale_price, category, image_url, tags, features, like_count, download_count, is_featured, author_name) VALUES
('Ultimate SaaS Landing Page Kit', 'saas-landing-page-kit', 'A comprehensive landing page template kit for SaaS products with 20+ sections.', 'Build stunning SaaS landing pages in minutes with our comprehensive template kit. Includes 20+ pre-designed sections, responsive layouts, dark mode support, and Tailwind CSS styling. Perfect for startups, product launches, and marketing campaigns.', 49.99, 39.99, 'templates', '/images/products/saas-kit.jpg', ARRAY['nextjs', 'tailwind', 'saas', 'landing-page'], ARRAY['20+ Pre-built Sections', 'Dark/Light Mode', 'Fully Responsive', 'Tailwind CSS', 'React Components', 'Free Updates'], 234, 156, true, 'Sarah Chen'),
('Digital Marketing Playbook', 'digital-marketing-playbook', 'Complete guide to modern digital marketing strategies for 2024.', 'Master digital marketing with our comprehensive playbook. Learn SEO, social media marketing, email campaigns, content strategy, and paid advertising. Includes real case studies, templates, and actionable frameworks used by top marketing agencies.', 29.99, NULL, 'ebooks', '/images/products/marketing-ebook.jpg', ARRAY['marketing', 'seo', 'social-media', 'ebook'], ARRAY['300+ Pages', 'Case Studies', 'Templates Included', 'Video Tutorials', 'Community Access', 'Quarterly Updates'], 189, 423, true, 'Alex Rivera'),
('Premium Icon Pack - 2000+ Icons', 'premium-icon-pack', '2000+ beautifully crafted icons in multiple formats for modern applications.', 'Elevate your designs with our premium icon collection. 2000+ pixel-perfect icons in SVG, PNG, and Figma formats. Includes solid, outline, and duotone styles across 30+ categories. Regular updates with new icons added monthly.', 19.99, 14.99, 'design', '/images/products/icon-pack.jpg', ARRAY['icons', 'svg', 'figma', 'design-resources'], ARRAY['2000+ Icons', 'SVG & PNG Formats', 'Figma File Included', '30+ Categories', 'Regular Updates', 'Commercial License'], 567, 892, true, 'Maya Patel'),
('React Component Library', 'react-component-library', '50+ production-ready React components with TypeScript and Storybook.', 'Accelerate your React development with our battle-tested component library. 50+ components built with TypeScript, fully accessible, and beautifully styled. Includes form elements, data displays, navigation, overlays, and more.', 79.99, 59.99, 'assets', '/images/products/react-lib.jpg', ARRAY['react', 'typescript', 'components', 'ui-library'], ARRAY['50+ Components', 'TypeScript', 'Storybook Docs', 'Accessibility Ready', 'Theme Customization', 'Unit Tests'], 345, 234, true, 'James Wilson'),
('Brand Identity Toolkit', 'brand-identity-toolkit', 'Complete brand identity design system with templates and guidelines.', 'Create a cohesive brand identity with our comprehensive toolkit. Includes logo templates, color palette generators, typography guidelines, brand book templates, social media kits, and business card designs. Everything you need to build a professional brand.', 39.99, NULL, 'design', '/images/products/brand-kit.jpg', ARRAY['branding', 'identity', 'design-system', 'templates'], ARRAY['Logo Templates', 'Color Palettes', 'Typography Guide', 'Social Media Kit', 'Business Cards', 'Brand Book Template'], 198, 167, false, 'Emily Zhang'),
('Startup Financial Model', 'startup-financial-model', 'Professional financial modeling templates for startups and small businesses.', 'Plan your startup finances with confidence using our professional financial model. Includes revenue projections, expense tracking, cash flow analysis, and investor-ready presentation templates. Built for seed-stage to Series A startups.', 34.99, 24.99, 'assets', '/images/products/financial-model.jpg', ARRAY['startup', 'finance', 'spreadsheet', 'business'], ARRAY['Revenue Models', 'Cash Flow Analysis', 'Investor Deck', 'KPI Dashboard', 'Multiple Scenarios', 'Video Walkthrough'], 145, 298, false, 'David Kim'),
('Modern Blog Template', 'modern-blog-template', 'A beautiful, fast blog template built with Next.js and MDX support.', 'Launch your blog with our modern, SEO-optimized template. Built with Next.js 14, MDX support, dark mode, newsletter integration, and beautiful typography. Includes reading progress bar, table of contents, and social sharing.', 24.99, NULL, 'templates', '/images/products/blog-template.jpg', ARRAY['nextjs', 'blog', 'mdx', 'template'], ARRAY['Next.js 14', 'MDX Support', 'SEO Optimized', 'Dark Mode', 'Newsletter Ready', 'Analytics Integration'], 276, 445, false, 'Lisa Park'),
('UX Research Handbook', 'ux-research-handbook', 'Comprehensive guide to UX research methods, tools, and best practices.', 'Become a UX research pro with our in-depth handbook. Covers user interviews, usability testing, surveys, analytics, persona creation, journey mapping, and more. Includes downloadable templates and real-world examples.', 22.99, 17.99, 'ebooks', '/images/products/ux-handbook.jpg', ARRAY['ux', 'research', 'design', 'user-experience'], ARRAY['200+ Pages', 'Research Templates', 'Case Studies', 'Video Lessons', 'Tool Recommendations', 'Certificate'], 312, 534, false, 'Chris Anderson');

-- Freelancers
INSERT INTO public.freelancers (display_name, title, bio, skills, hourly_rate, rating, review_count, is_available, completed_projects, location, languages, domain_id)
SELECT
  'Alex Thompson',
  'Senior Full-Stack Developer',
  'Passionate full-stack developer with 8+ years of experience building scalable web applications. Specialized in React, Next.js, and Node.js ecosystems.',
  ARRAY['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
  95.00,
  4.9,
  47,
  true,
  89,
  'San Francisco, CA',
  ARRAY['English', 'Spanish'],
  id
FROM public.domains WHERE slug = 'web-development';

INSERT INTO public.freelancers (display_name, title, bio, skills, hourly_rate, rating, review_count, is_available, completed_projects, location, languages, domain_id)
SELECT
  'Priya Sharma',
  'React & Next.js Specialist',
  'Frontend specialist focused on creating performant, accessible web experiences. Love turning complex designs into pixel-perfect code.',
  ARRAY['React', 'Next.js', 'Tailwind CSS', 'Figma', 'Framer Motion'],
  85.00,
  4.8,
  36,
  true,
  62,
  'New York, NY',
  ARRAY['English', 'Hindi'],
  id
FROM public.domains WHERE slug = 'web-development';

INSERT INTO public.freelancers (display_name, title, bio, skills, hourly_rate, rating, review_count, is_available, completed_projects, location, languages, domain_id)
SELECT
  'Marcus Webb',
  'Backend Engineer',
  'Experienced backend engineer specializing in microservices, API design, and cloud infrastructure. Building reliable systems that scale.',
  ARRAY['Python', 'Go', 'Docker', 'Kubernetes', 'GraphQL', 'MongoDB'],
  110.00,
  4.7,
  28,
  true,
  45,
  'Austin, TX',
  ARRAY['English'],
  id
FROM public.domains WHERE slug = 'web-development';

INSERT INTO public.freelancers (display_name, title, bio, skills, hourly_rate, rating, review_count, is_available, completed_projects, location, languages, domain_id)
SELECT
  'Sophie Laurent',
  'UI/UX Designer & Brand Strategist',
  'Creative designer with a passion for crafting beautiful, intuitive user experiences. I believe great design tells a story and drives results.',
  ARRAY['Figma', 'Adobe Creative Suite', 'UI Design', 'Brand Identity', 'Prototyping'],
  90.00,
  4.9,
  52,
  true,
  78,
  'Paris, France',
  ARRAY['English', 'French'],
  id
FROM public.domains WHERE slug = 'graphic-design';

INSERT INTO public.freelancers (display_name, title, bio, skills, hourly_rate, rating, review_count, is_available, completed_projects, location, languages, domain_id)
SELECT
  'Kai Nakamura',
  'Motion Graphics Artist',
  'Award-winning motion designer creating stunning visual content for brands worldwide. Specializing in 2D/3D animation and visual effects.',
  ARRAY['After Effects', 'Cinema 4D', 'Premiere Pro', 'DaVinci Resolve', 'Blender'],
  100.00,
  4.8,
  41,
  true,
  67,
  'Tokyo, Japan',
  ARRAY['English', 'Japanese'],
  id
FROM public.domains WHERE slug = 'video-editing';

INSERT INTO public.freelancers (display_name, title, bio, skills, hourly_rate, rating, review_count, is_available, completed_projects, location, languages, domain_id)
SELECT
  'Emma Rodriguez',
  'Digital Marketing Strategist',
  'Data-driven marketing expert helping startups and enterprises grow through strategic digital campaigns and content marketing.',
  ARRAY['SEO', 'Google Ads', 'Social Media', 'Analytics', 'Content Strategy', 'Email Marketing'],
  80.00,
  4.7,
  38,
  true,
  55,
  'Miami, FL',
  ARRAY['English', 'Spanish', 'Portuguese'],
  id
FROM public.domains WHERE slug = 'marketing';

INSERT INTO public.freelancers (display_name, title, bio, skills, hourly_rate, rating, review_count, is_available, completed_projects, location, languages, domain_id)
SELECT
  'Oliver Hayes',
  'Senior Copywriter',
  'Words are my craft. I create compelling copy that converts, from website content to email campaigns and everything in between.',
  ARRAY['Copywriting', 'Content Writing', 'SEO Writing', 'Brand Voice', 'Email Copy', 'Ad Copy'],
  75.00,
  4.8,
  63,
  true,
  112,
  'London, UK',
  ARRAY['English'],
  id
FROM public.domains WHERE slug = 'copywriting';

INSERT INTO public.freelancers (display_name, title, bio, skills, hourly_rate, rating, review_count, is_available, completed_projects, location, languages, domain_id)
SELECT
  'Zara Mitchell',
  'Illustration & Visual Designer',
  'Digital illustrator and visual designer creating unique, eye-catching artwork for brands, publications, and digital products.',
  ARRAY['Illustration', 'Photoshop', 'Procreate', 'Vector Art', 'Character Design'],
  70.00,
  4.6,
  29,
  true,
  43,
  'Melbourne, Australia',
  ARRAY['English'],
  id
FROM public.domains WHERE slug = 'graphic-design';

-- Client Reviews
INSERT INTO public.client_reviews (reviewer_name, reviewer_title, reviewer_company, rating, comment, is_featured) VALUES
('Michael Chen', 'CTO', 'TechFlow Inc', 5, 'Incredible platform! We found an amazing developer who built our entire SaaS product. The quality of freelancers here is outstanding. Would recommend to any startup looking for top talent.', true),
('Sarah Williams', 'Founder', 'DesignCraft Studio', 5, 'The digital products marketplace saved us hundreds of hours. We purchased a template kit and customized it for our client in just 2 days. Absolute game changer for our agency.', true),
('David Park', 'Marketing Director', 'GrowthLab', 4, 'Found our go-to copywriter and marketing strategist through this platform. Our conversion rates increased by 40% after implementing their strategies. Highly professional service.', true),
('Rachel Torres', 'Product Manager', 'InnovateTech', 5, 'The freelancer quality is unmatched. We have been working with the same video editor for 6 months now and the content quality has been consistently excellent. Love this platform!', true),
('James Liu', 'CEO', 'StartupEngine', 5, 'As a startup founder, finding reliable talent was always a challenge. This platform made it seamless. The vetting process ensures you only work with top-tier professionals.', true),
('Anonymous', NULL, NULL, 4, 'Great marketplace for digital products. The ebooks and templates are high quality and reasonably priced. The checkout process is smooth and downloads are instant.', false),
('Lisa Anderson', 'Creative Director', 'Pixel Perfect Agency', 5, 'We have purchased multiple design resources and template kits. Every single one has been exceptional quality. The attention to detail in these products is remarkable.', true),
('Anonymous', NULL, NULL, 5, 'Found an incredible graphic designer who transformed our brand identity. The portfolio review feature made it easy to evaluate freelancers before hiring. 10/10 experience.', false);

-- Blog Posts
INSERT INTO public.blog_posts (title, slug, excerpt, content, author_name, category, tags, read_time) VALUES
('The Future of Remote Work in 2024', 'future-of-remote-work-2024', 'Explore the latest trends shaping remote work and how freelancers can stay ahead.', 'Full blog content here...', 'Alex Rivera', 'Industry', ARRAY['remote-work', 'freelancing', 'trends'], 8),
('10 Essential Tools Every Designer Needs', '10-essential-designer-tools', 'A curated list of must-have design tools for modern digital designers.', 'Full blog content here...', 'Sophie Laurent', 'Design', ARRAY['design', 'tools', 'productivity'], 6),
('How to Build a Profitable SaaS Product', 'build-profitable-saas', 'Step-by-step guide to building, launching, and scaling a SaaS product.', 'Full blog content here...', 'James Wilson', 'Development', ARRAY['saas', 'startup', 'development'], 12),
('Content Marketing Strategies That Actually Work', 'content-marketing-strategies', 'Proven content marketing strategies to grow your audience and drive conversions.', 'Full blog content here...', 'Emma Rodriguez', 'Marketing', ARRAY['marketing', 'content', 'strategy'], 7),
('The Complete Guide to Brand Identity Design', 'guide-brand-identity-design', 'Everything you need to know about creating a compelling brand identity.', 'Full blog content here...', 'Maya Patel', 'Design', ARRAY['branding', 'design', 'identity'], 10),
('AI and the Future of Freelancing', 'ai-future-freelancing', 'How artificial intelligence is transforming the freelance economy.', 'Full blog content here...', 'David Kim', 'Industry', ARRAY['ai', 'freelancing', 'technology'], 9);