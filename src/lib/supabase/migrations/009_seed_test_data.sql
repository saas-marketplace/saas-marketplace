-- Seed test data for NexusHub Platform

-- ============================================
-- DOMAINS (Freelancer Categories)
-- ============================================

INSERT INTO public.domains (name, slug, description, icon, freelancer_count) VALUES
('Web Development', 'web-development', 'Full-stack web developers specializing in modern frameworks and responsive design', 'code', 45),
('UI/UX Design', 'ui-ux-design', 'Creative designers focused on user experience and visual design', 'palette', 32),
('Mobile Development', 'mobile-development', 'iOS and Android app developers with cross-platform expertise', 'smartphone', 28),
('Data Science', 'data-science', 'Machine learning engineers and data analysts', 'bar-chart', 15),
('DevOps & Cloud', 'devops-cloud', 'Cloud architects and infrastructure specialists', 'cloud', 20)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- FREELANCERS
-- ============================================

INSERT INTO public.freelancers (
  display_name, title, bio, avatar_url, skills, hourly_rate, rating, review_count,
  is_available, completed_projects, location, languages
) VALUES
(
  'Sarah Chen',
  'Senior Full-Stack Developer',
  'Passionate developer with 8+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud architecture.',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  ARRAY['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
  95.00, 4.9, 47, TRUE, 120, 'San Francisco, CA', ARRAY['English', 'Mandarin']
),
(
  'Marcus Rodriguez',
  'UI/UX Design Lead',
  'Award-winning designer focused on creating intuitive and beautiful user experiences. Former design lead at top tech companies.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
  ARRAY['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research'],
  85.00, 4.8, 35, TRUE, 89, 'Austin, TX', ARRAY['English', 'Spanish']
),
(
  'Emily Watson',
  'Mobile App Developer',
  'iOS and Android developer creating performant mobile applications. Specialized in React Native and Swift.',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
  ARRAY['React Native', 'Swift', 'Kotlin', 'Firebase', 'Redux'],
  90.00, 4.7, 28, TRUE, 65, 'London, UK', ARRAY['English', 'French']
)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRODUCTS (Marketplace Items)
-- ============================================

INSERT INTO public.products (
  title, slug, description, long_description, price, sale_price, category,
  image_url, file_size, file_format, tags, features, like_count, download_count,
  is_featured, is_active, author_name, author_avatar
) VALUES
(
  'Modern Dashboard UI Kit',
  'modern-dashboard-ui-kit',
  'A comprehensive dashboard UI kit with 50+ components',
  'This premium dashboard UI kit includes over 50 carefully crafted components including charts, tables, forms, cards, and navigation elements. Built with modern design principles and fully responsive.',
  49.99, 39.99, 'design',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
  '15 MB', 'Figma',
  ARRAY['dashboard', 'ui-kit', 'figma', 'components'],
  ARRAY['50+ components', 'Dark & light themes', 'Responsive layouts', 'Free updates'],
  234, 156, TRUE, TRUE, 'Sarah Chen', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop'
),
(
  'Complete SaaS Starter Kit',
  'complete-saas-starter-kit',
  'Full-stack Next.js SaaS boilerplate with authentication, payments, and admin panel',
  'Launch your SaaS faster with this complete starter kit. Includes user authentication with Supabase, Stripe integration, email notifications, admin dashboard, and comprehensive documentation.',
  149.99, NULL, 'templates',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
  '8 MB', 'ZIP (Next.js)',
  ARRAY['saas', 'nextjs', 'starter', 'fullstack', 'supabase', 'stripe'],
  ARRAY['Supabase Auth', 'Stripe Payments', 'Admin Dashboard', 'Email System', 'API Routes'],
  189, 98, TRUE, TRUE, 'Marcus Rodriguez', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop'
),
(
  'E-Commerce Email Templates',
  'ecommerce-email-templates',
  'Professional transactional email templates for online stores',
  'A collection of 25 professionally designed email templates for e-commerce businesses. Includes order confirmations, shipping updates, promotional emails, and more.',
  29.99, 19.99, 'templates',
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop',
  '5 MB', 'HTML',
  ARRAY['email', 'templates', 'ecommerce', 'marketing'],
  ARRAY['25 templates', 'Responsive design', 'Easy customization', 'Mailchimp ready'],
  156, 87, FALSE, TRUE, 'Emily Watson', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- BLOG POSTS
-- ============================================

INSERT INTO public.blog_posts (
  title, slug, excerpt, content, cover_image, author_name, author_avatar,
  category, tags, read_time, is_published, published_at
) VALUES
(
  'How to Build a Successful Freelance Career in 2025',
  'build-successful-freelance-career-2025',
  'Discover the key strategies that top freelancers use to build thriving careers in the modern gig economy.',
  'The freelance economy is booming in 2025. With more companies embracing remote work and digital transformation, skilled professionals have unprecedented opportunities...',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
  'Sarah Chen', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop',
  'Career Advice',
  ARRAY['freelance', 'career', 'remote-work', 'success'],
  8, TRUE, '2025-01-15'
),
(
  'Top 10 UI Design Trends for Web Applications',
  'top-10-ui-design-trends-web-apps',
  'Stay ahead of the curve with these cutting-edge UI design trends shaping the future of web applications.',
  'Design trends are constantly evolving. In this comprehensive guide, we explore the top 10 UI design trends that will define web application design in 2025...',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=400&fit=crop',
  'Marcus Rodriguez', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop',
  'Design',
  ARRAY['ui', 'design', 'trends', 'web-design'],
  6, TRUE, '2025-01-20'
),
(
  'Scaling Node.js Applications: Best Practices',
  'scaling-nodejs-applications-best-practices',
  'Learn how to build high-performance Node.js applications that can handle millions of users.',
  'Building scalable applications requires careful planning and implementation of proven patterns. In this article, we dive deep into the best practices for scaling Node.js...',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
  'Sarah Chen', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop',
  'Development',
  ARRAY['nodejs', 'scaling', 'backend', 'performance'],
  12, TRUE, '2025-02-05'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- CLIENT REVIEWS (Testimonials)
-- ============================================

INSERT INTO public.client_reviews (
  reviewer_name, reviewer_title, reviewer_company, reviewer_avatar, rating, comment, is_featured
) VALUES
(
  'James Mitchell',
  'CTO',
  'TechStart Inc.',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop',
  5,
  'Working with Sarah was an incredible experience. She delivered our project on time and exceeded our expectations. The code quality was outstanding and she was responsive throughout the entire process.',
  TRUE
),
(
  'Lisa Park',
  'Product Manager',
  'Innovate Labs',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=50&h=50&fit=crop',
  5,
  'Marcus transformed our design vision into reality. His attention to detail and understanding of user experience elevated our product to a completely new level. Highly recommended!',
  TRUE
),
(
  'David Chen',
  'Founder',
  'StartupHub',
  'https://images.unsplash.com/photo-1500648767791-00dcc4aac51a?w=50&h=50&fit=crop',
  4,
  'Emily built us a fantastic mobile app that our users love. She was professional, communicative, and delivered exactly what we needed. Will definitely work with her again.',
  FALSE
)
ON CONFLICT DO NOTHING;

-- ============================================
-- SELECT QUERIES TO VERIFY DATA
-- ============================================

-- Check freelancers
SELECT id, display_name, title, rating, hourly_rate, location FROM public.freelancers LIMIT 5;

-- Check products  
SELECT id, title, price, sale_price, category, download_count, is_featured FROM public.products LIMIT 5;

-- Check domains
SELECT id, name, slug, freelancer_count FROM public.domains;

-- Check blog posts
SELECT id, title, author_name, category, read_time, published_at FROM public.blog_posts LIMIT 5;

-- Check testimonials
SELECT reviewer_name, reviewer_company, rating, comment FROM public.client_reviews WHERE is_featured = true;

-- ============================================
-- ADDITIONAL TEST DATA (NO IMAGES)
-- ============================================

-- Add more freelancers (without images) - each domain should have 4+ freelancers

-- Freelancers for Web Development domain
INSERT INTO public.freelancers (
  display_name, title, bio, avatar_url, skills, hourly_rate, rating, review_count,
  is_available, completed_projects, location, languages, domain_id
) VALUES
(
  'Alex Thompson', 'Full-Stack Developer', 'Experienced developer specializing in React, Vue, and Node.js. Building modern web solutions for 6 years.', NULL, ARRAY['React', 'Vue.js', 'Node.js', 'MongoDB', 'GraphQL'], 75.00, 4.6, 32, TRUE, 85, 'New York, NY', ARRAY['English'], (SELECT id FROM public.domains WHERE slug = 'web-development')
),
(
  'Jordan Lee', 'Backend Engineer', 'Python and Go expert focused on building scalable APIs and microservices architecture.', NULL, ARRAY['Python', 'Django', 'Go', 'Docker', 'Kubernetes'], 80.00, 4.7, 28, TRUE, 72, 'Seattle, WA', ARRAY['English', 'Korean'], (SELECT id FROM public.domains WHERE slug = 'web-development')
),
(
  'Priya Sharma', 'Frontend Specialist', 'Pixel-perfect UI developer with expertise in modern CSS, animations, and accessibility.', NULL, ARRAY['JavaScript', 'TypeScript', 'CSS', 'SASS', 'React'], 65.00, 4.5, 41, TRUE, 95, 'Toronto, Canada', ARRAY['English', 'Hindi'], (SELECT id FROM public.domains WHERE slug = 'web-development')
),
(
  'Carlos Mendez', 'WordPress Expert', 'Specializing in custom WordPress themes, plugins, and WooCommerce solutions.', NULL, ARRAY['WordPress', 'PHP', 'MySQL', 'JavaScript', 'WooCommerce'], 55.00, 4.4, 56, TRUE, 110, 'Miami, FL', ARRAY['English', 'Spanish'], (SELECT id FROM public.domains WHERE slug = 'web-development')
),
(
  'Nina Petrov', 'Java Developer', 'Enterprise Java developer with Spring Boot expertise and microservices experience.', NULL, ARRAY['Java', 'Spring Boot', 'Microservices', 'AWS', 'PostgreSQL'], 90.00, 4.8, 22, TRUE, 58, 'Berlin, Germany', ARRAY['English', 'German'], (SELECT id FROM public.domains WHERE slug = 'web-development')
);

-- Freelancers for UI/UX Design domain
INSERT INTO public.freelancers (
  display_name, title, bio, avatar_url, skills, hourly_rate, rating, review_count,
  is_available, completed_projects, location, languages, domain_id
) VALUES
(
  'Emma Wilson', 'Product Designer', 'Designing user-centered digital products that drive engagement and conversions.', NULL, ARRAY['Figma', 'Product Design', 'Prototyping', 'User Research', 'Design Systems'], 88.00, 4.9, 38, TRUE, 92, 'Sydney, Australia', ARRAY['English'], (SELECT id FROM public.domains WHERE slug = 'ui-ux-design')
),
(
  'David Kim', 'Visual Designer', 'Creating stunning visual designs for web and mobile applications.', NULL, ARRAY['Adobe XD', 'Illustrator', 'Photoshop', 'UI Design', 'Branding'], 75.00, 4.6, 29, TRUE, 78, 'Seoul, South Korea', ARRAY['English', 'Korean'], (SELECT id FROM public.domains WHERE slug = 'ui-ux-design')
),
(
  'Sofia Garcia', 'UX Researcher', 'Data-driven UX research to understand user behavior and improve product experience.', NULL, ARRAY['User Research', 'Usability Testing', 'Surveys', 'Analytics', 'Interviewing'], 70.00, 4.7, 24, TRUE, 55, 'Madrid, Spain', ARRAY['English', 'Spanish'], (SELECT id FROM public.domains WHERE slug = 'ui-ux-design')
),
(
  'Michael Brown', 'Motion Designer', 'Bringing interfaces to life with smooth animations and micro-interactions.', NULL, ARRAY['After Effects', 'Lottie', 'Principle', 'Animation', 'Prototyping'], 82.00, 4.5, 31, TRUE, 67, 'Los Angeles, CA', ARRAY['English'], (SELECT id FROM public.domains WHERE slug = 'ui-ux-design')
);

-- Freelancers for Mobile Development domain
INSERT INTO public.freelancers (
  display_name, title, bio, avatar_url, skills, hourly_rate, rating, review_count,
  is_available, completed_projects, location, languages, domain_id
) VALUES
(
  'Kevin Zhang', 'iOS Developer', 'Building native iOS apps with Swift and SwiftUI for 7+ years.', NULL, ARRAY['Swift', 'SwiftUI', 'iOS', 'CoreData', 'CocoaPods'], 95.00, 4.8, 35, TRUE, 82, 'San Jose, CA', ARRAY['English', 'Chinese'], (SELECT id FROM public.domains WHERE slug = 'mobile-development')
),
(
  'Anna Kowalski', 'Android Developer', 'Native Android development with Kotlin and modern Jetpack libraries.', NULL, ARRAY['Kotlin', 'Jetpack', 'Android', 'Room', 'Coroutines'], 85.00, 4.7, 27, TRUE, 68, 'Warsaw, Poland', ARRAY['English', 'Polish'], (SELECT id FROM public.domains WHERE slug = 'mobile-development')
),
(
  'Omar Hassan', 'Flutter Developer', 'Cross-platform mobile apps with beautiful Flutter UIs.', NULL, ARRAY['Flutter', 'Dart', 'Firebase', 'Provider', 'Riverpod'], 80.00, 4.6, 33, TRUE, 75, 'Dubai, UAE', ARRAY['English', 'Arabic'], (SELECT id FROM public.domains WHERE slug = 'mobile-development')
),
(
  'Lisa Chen', 'React Native Specialist', 'Building cross-platform mobile apps with React Native and TypeScript.', NULL, ARRAY['React Native', 'TypeScript', 'Redux', 'Firebase', 'Expo'], 78.00, 4.5, 29, TRUE, 70, 'Vancouver, Canada', ARRAY['English', 'Mandarin'], (SELECT id FROM public.domains WHERE slug = 'mobile-development')
);

-- Freelancers for Data Science domain
INSERT INTO public.freelancers (
  display_name, title, bio, avatar_url, skills, hourly_rate, rating, review_count,
  is_available, completed_projects, location, languages, domain_id
) VALUES
(
  'Robert Taylor', 'Data Scientist', 'Machine learning expert specializing in predictive modeling and data analysis.', NULL, ARRAY['Python', 'TensorFlow', 'scikit-learn', 'Pandas', 'SQL'], 100.00, 4.9, 21, TRUE, 45, 'Boston, MA', ARRAY['English'], (SELECT id FROM public.domains WHERE slug = 'data-science')
),
(
  'Maria Santos', 'ML Engineer', 'Deploying machine learning models at scale for production systems.', NULL, ARRAY['Machine Learning', 'PyTorch', 'MLOps', 'AWS SageMaker', 'Docker'], 105.00, 4.8, 18, TRUE, 38, 'Lisbon, Portugal', ARRAY['English', 'Portuguese'], (SELECT id FROM public.domains WHERE slug = 'data-science')
),
(
  'James Wilson', 'Data Analyst', 'Turning raw data into actionable insights with visualization and reporting.', NULL, ARRAY['SQL', 'Tableau', 'PowerBI', 'Excel', 'Python'], 65.00, 4.6, 44, TRUE, 88, 'Chicago, IL', ARRAY['English'], (SELECT id FROM public.domains WHERE slug = 'data-science')
),
(
  'Yuki Tanaka', 'NLP Specialist', 'Natural language processing and text analysis expert.', NULL, ARRAY['NLP', 'Python', 'Transformers', 'spaCy', 'BERT'], 95.00, 4.7, 15, TRUE, 32, 'Tokyo, Japan', ARRAY['English', 'Japanese'], (SELECT id FROM public.domains WHERE slug = 'data-science')
);

-- Freelancers for DevOps & Cloud domain
INSERT INTO public.freelancers (
  display_name, title, bio, avatar_url, skills, hourly_rate, rating, review_count,
  is_available, completed_projects, location, languages, domain_id
) VALUES
(
  'Daniel Martinez', 'DevOps Engineer', 'Building and maintaining CI/CD pipelines and infrastructure automation.', NULL, ARRAY['Jenkins', 'GitLab CI', 'Ansible', 'Terraform', 'Docker'], 92.00, 4.8, 26, TRUE, 55, 'Denver, CO', ARRAY['English', 'Spanish'], (SELECT id FROM public.domains WHERE slug = 'devops-cloud')
),
(
  'Sarah Johnson', 'Cloud Architect', 'Designing scalable cloud infrastructure on AWS, Azure, and GCP.', NULL, ARRAY['AWS', 'Azure', 'GCP', 'CloudFormation', 'Serverless'], 110.00, 4.9, 19, TRUE, 42, 'Portland, OR', ARRAY['English'], (SELECT id FROM public.domains WHERE slug = 'devops-cloud')
),
(
  'Thomas Mueller', 'Kubernetes Expert', 'Container orchestration and microservices deployment specialist.', NULL, ARRAY['Kubernetes', 'Helm', 'Istio', 'Prometheus', 'Grafana'], 98.00, 4.7, 22, TRUE, 48, 'Munich, Germany', ARRAY['English', 'German'], (SELECT id FROM public.domains WHERE slug = 'devops-cloud')
),
(
  'Amy Clarke', 'Site Reliability Engineer', 'Ensuring system reliability and performance at scale.', NULL, ARRAY['SRE', 'Linux', 'Python', 'Monitoring', 'Incident Management'], 88.00, 4.6, 31, TRUE, 62, 'Austin, TX', ARRAY['English'], (SELECT id FROM public.domains WHERE slug = 'devops-cloud')
);

-- Add more products (without images)
INSERT INTO public.products (
  title, slug, description, long_description, price, sale_price, category,
  image_url, file_size, file_format, tags, features, like_count, download_count,
  is_featured, is_active, author_name, author_avatar
) VALUES
(
  'React Admin Dashboard Template', 'react-admin-dashboard-template',
  'Professional admin dashboard template built with React and Material UI',
  'A comprehensive admin dashboard template featuring ready-to-use components, charts, tables, and forms. Built with React 18 and Material UI v5. Includes dark mode support and is fully responsive.',
  79.99, 59.99, 'templates', NULL, '12 MB', 'ZIP (React)',
  ARRAY['react', 'admin', 'dashboard', 'material-ui', 'template'],
  ARRAY['50+ components', 'Dark mode', 'Responsive', 'Documentation included'],
  187, 124, TRUE, TRUE, 'Alex Thompson', NULL
),
(
  'Vue.js Ecommerce Starter', 'vuejs-ecommerce-starter',
  'Complete e-commerce frontend built with Vue 3 and Pinia',
  'Launch your online store with this Vue 3 e-commerce starter kit. Includes product listing, cart, checkout flow, user authentication, and admin panel integration.',
  129.99, NULL, 'templates', NULL, '15 MB', 'ZIP (Vue.js)',
  ARRAY['vue', 'ecommerce', 'store', 'pinia', 'vite'],
  ARRAY['Vue 3', 'Pinia State', 'Router ready', 'API integration'],
  156, 89, FALSE, TRUE, 'Jordan Lee', NULL
),
(
  'UI Design Components Pack', 'ui-design-components-pack',
  'Collection of 200+ premium UI components for web applications',
  'A massive collection of over 200 professionally designed UI components including buttons, forms, cards, modals, navigation elements, and more. Perfect for rapid prototyping.',
  89.99, 69.99, 'design', NULL, '25 MB', 'Figma',
  ARRAY['ui', 'components', 'figma', 'design-system', 'web'],
  ARRAY['200+ components', 'Organized layers', 'Auto-layout', 'Free updates'],
  245, 178, TRUE, TRUE, 'Emma Wilson', NULL
),
(
  'Icon Pack - Business Suite', 'icon-pack-business-suite',
  '500+ business and finance icons in multiple formats',
  'A comprehensive icon pack with over 500 icons tailored for business and finance applications. Includes SVG, PNG, and icon font formats.',
  34.99, 24.99, 'assets', NULL, '8 MB', 'SVG/PNG',
  ARRAY['icons', 'business', 'finance', 'svg', 'png'],
  ARRAY['500+ icons', 'Multiple formats', 'Easy to customize', 'Commercial license'],
  312, 245, FALSE, TRUE, 'David Kim', NULL
),
(
  'Node.js API Boilerplate', 'nodejs-api-boilerplate',
  'Production-ready REST API boilerplate with authentication and testing',
  'Build robust APIs faster with this Node.js boilerplate. Includes JWT authentication, error handling, validation, logging, testing setup, and Docker support.',
  59.99, NULL, 'templates', NULL, '3 MB', 'ZIP (Node.js)',
  ARRAY['nodejs', 'api', 'rest', 'boilerplate', 'express'],
  ARRAY['JWT Auth', 'Jest testing', 'Docker ready', 'API docs'],
  198, 132, TRUE, TRUE, 'Robert Taylor', NULL
),
(
  'Flutter Ecommerce App', 'flutter-ecommerce-app',
  'Full-featured e-commerce mobile app built with Flutter',
  'A complete e-commerce mobile app template with product catalog, cart, checkout, user profile, and admin panel. Beautiful UI with smooth animations.',
  149.99, 119.99, 'templates', NULL, '28 MB', 'ZIP (Flutter)',
  ARRAY['flutter', 'ecommerce', 'mobile', 'dart', 'app'],
  ARRAY['Full features', 'Clean architecture', 'Firebase ready', 'Documentation'],
  167, 98, FALSE, TRUE, 'Kevin Zhang', NULL
),
(
  'Python Data Analysis Toolkit', 'python-data-analysis-toolkit',
  'Collection of Python scripts for data analysis and visualization',
  'A comprehensive toolkit with Python scripts for data cleaning, analysis, and visualization. Includes Jupyter notebooks and pandas workflows.',
  44.99, NULL, 'ebooks', NULL, '5 MB', 'ZIP (Python)',
  ARRAY['python', 'data-analysis', 'pandas', 'visualization', 'jupyter'],
  ARRAY['50+ scripts', 'Jupyter notebooks', 'Sample datasets', 'Tutorial included'],
  134, 87, FALSE, TRUE, 'Maria Santos', NULL
),
(
  'AWS Infrastructure Templates', 'aws-infrastructure-templates',
  'Terraform templates for AWS infrastructure deployment',
  'Production-ready Terraform templates for common AWS infrastructure patterns including VPC, ECS, RDS, and more. Includes best practices and security configurations.',
  69.99, NULL, 'templates', NULL, '4 MB', 'ZIP (Terraform)',
  ARRAY['aws', 'terraform', 'devops', 'infrastructure', 'cloud'],
  ARRAY['10+ templates', 'Best practices', 'Security hardened', 'Variable configs'],
  178, 112, TRUE, TRUE, 'Sarah Johnson', NULL
),
(
  'Mobile App UI Kit - Fitness', 'mobile-app-ui-kit-fitness',
  'Complete fitness app UI kit with 80+ screens',
  'A beautiful fitness app UI kit with over 80 screens including workout plans, progress tracking, diet plans, and social features. Built in Figma with complete design system.',
  79.99, 59.99, 'design', NULL, '18 MB', 'Figma',
  ARRAY['mobile', 'fitness', 'ui-kit', 'figma', 'app-design'],
  ARRAY['80+ screens', 'Design system', 'Dark & light themes', 'Icon library'],
  223, 156, TRUE, TRUE, 'Anna Kowalski', NULL
),
(
  'GraphQL API Starter Kit', 'graphql-api-starter-kit',
  'Production-ready GraphQL API with Node.js and TypeScript',
  'Build modern APIs with this GraphQL starter kit. Includes Apollo Server, TypeScript, authentication, subscriptions, and database integration.',
  89.99, NULL, 'templates', NULL, '6 MB', 'ZIP (Node.js)',
  ARRAY['graphql', 'apollo', 'typescript', 'api', 'nodejs'],
  ARRAY['Full GraphQL', 'TypeScript', 'Subscriptions', 'Testing setup'],
  145, 78, FALSE, TRUE, 'Daniel Martinez', NULL
);

-- Verify counts
SELECT 'Freelancers' as table_name, COUNT(*) as count FROM public.freelancers
UNION ALL
SELECT 'Products', COUNT(*) FROM public.products
UNION ALL
SELECT 'Domains', COUNT(*) FROM public.domains;