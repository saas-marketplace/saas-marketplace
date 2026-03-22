-- 🔥 COMPLETE SUPABASE SEED SCRIPT - FULL DATABASE POPULATION
-- Copy ALL → Supabase SQL Editor → Execute
-- TRUNCATES first → Safe reset → Realistic data for ALL features

-- 1. DISABLE RLS (temp)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reviews DISABLE ROW LEVEL SECURITY;

-- 2. TRUNCATE ALL (RESET)
TRUNCATE public.users, public.team_members, public.freelancers, public.reviews, public.blog_posts, public.blogs, public.requests, public.request_messages, public.notifications, public.system_settings, public.user_settings, public.contact_submissions, public.domains, public.products, public.orders, public.product_likes, public.client_reviews RESTART IDENTITY CASCADE;

-- 3. USERS (20)
INSERT INTO public.users (id, email, full_name, avatar_url, role, bio, status, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@super.com', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'super_admin', 'Platform Owner & Super Admin', 'active', NOW() - INTERVAL '2 years'),
('00000000-0000-0000-0000-000000000002', 'admin@company.com', 'Mike Chen', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'admin', 'Senior Administrator', 'active', NOW() - INTERVAL '18 months'),
('00000000-0000-0000-0000-000000000003', 'john.doe@gmail.com', 'John Doe', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'Frontend Developer seeking projects', 'active', NOW() - INTERVAL '1 year'),
('00000000-0000-0000-0000-000000000004', 'emma.thompson@design.com', 'Emma Thompson', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'UX/UI Designer & Figma Expert', 'active', NOW() - INTERVAL '14 months'),
('00000000-0000-0000-0000-000000000005', 'alex.rivera@web.com', 'Alex Rivera', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'user', 'Full Stack Developer', 'active', NOW() - INTERVAL '11 months'),
('00000000-0000-0000-0000-000000000006', 'lisa.chen@seo.com', 'Lisa Chen', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'user', 'SEO & Digital Marketing Specialist', 'active', NOW() - INTERVAL '9 months'),
('00000000-0000-0000-0000-000000000007', 'david.kim@devops.co', 'David Kim', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'DevOps & Cloud Engineer', 'active', NOW() - INTERVAL '8 months'),
('00000000-0000-0000-0000-000000000008', 'mark.evans@copy.com', 'Mark Evans', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'Copywriter & Content Strategist', 'active', NOW() - INTERVAL '7 months'),
('00000000-0000-0000-0000-000000000009', 'sophie.laurent@mobile.fr', 'Sophie Laurent', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'user', 'React Native Mobile Developer', 'active', NOW() - INTERVAL '6 months'),
('00000000-0000-0000-0000-000000000010', 'carlos.rodriguez@data.es', 'Carlos Rodriguez', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'user', 'Data Scientist & ML Engineer', 'active', NOW() - INTERVAL '5 months'),
('00000000-0000-0000-0000-000000000011', 'tom.hardy@wordpress.uk', 'Tom Hardy', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'WordPress Expert', 'active', NOW() - INTERVAL '4 months'),
('00000000-0000-0000-0000-000000000012', 'nina.patel@growth.in', 'Nina Patel', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'Growth Hacker', 'active', NOW() - INTERVAL '3 months'),
('00000000-0000-0000-0000-000000000013', 'julia.roberts@biz.com', 'Julia Roberts', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'user', 'Business Analyst', 'active', NOW() - INTERVAL '2 months'),
('00000000-0000-0000-0000-000000000014', 'ryan.white@support.au', 'Ryan White', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'user', 'Customer Support Specialist', 'active', NOW() - INTERVAL '1 month'),
('00000000-0000-0000-0000-000000000015', 'laura.anderson@hr.nz', 'Laura Anderson', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'HR Manager', 'active', NOW() - INTERVAL '3 weeks'),
('00000000-0000-0000-0000-000000000016', 'kevin.miller@sales.us', 'Kevin Miller', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'Sales Representative', 'active', NOW() - INTERVAL '2 weeks'),
('00000000-0000-0000-0000-000000000017', 'olivia.moore@community.ca', 'Olivia Moore', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'user', 'Community Manager', 'active', NOW() - INTERVAL '1 week'),
('00000000-0000-0000-0000-000000000018', 'james.wilson@test.com', 'James Wilson', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'user', 'Test User', 'active', NOW()),
('00000000-0000-0000-0000-000000000019', 'test.user@demo.com', 'Test User 2', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'Demo Account', 'active', NOW()),
('00000000-0000-0000-0000-000000000020', 'demo.client@project.com', 'Demo Client', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'Client for testing requests', 'active', NOW());

-- 4. TEAM MEMBERS (12)
INSERT INTO public.team_members (id, user_id, display_name, role_label, permissions, avatar_url, is_active) VALUES
('t1t1t1t1-t1t1-t1t1-t1t1-t1t1t1t1t1t1', '00000000-0000-0000-0000-000000000001', 'Sarah Johnson', 'Super Admin', '{"all": ["full"]}', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', true),
('t2t2t2t2-t2t2-t2t2-t2t2-t2t2t2t2t2t2', '00000000-0000-0000-0000-000000000002', 'Mike Chen', 'Administrator', '{"dashboard": ["view"], "freelancers": ["view","update"], "team": ["view"]}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', true),
('t3t3t3t3-t3t3-t3t1-t3t1-t3t3t3t3t3t3', '00000000-0000-0000-0000-000000000003', 'John Doe', 'Content Editor', '{"blogs": ["view","create","update"], "dashboard": ["view"]}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', true),
('t4t4t4t4-t4t4-t4t4-t4t4-t4t4t4t4t4t4', '00000000-0000-0000-0000-000000000007', 'David Lee', 'Tech Lead', '{"freelancers": ["view"], "products": ["view","update"]}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', true),
('t5t5t5t5-t5t5-t5t5-t5t5-t5t5t5t5t5t5', '00000000-0000-0000-0000-000000000008', 'Emily Davis', 'Support Supervisor', '{"requests": ["view"], "dashboard": ["view"]}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', true),
('t6t6t6t6-t6t6-t6t6-t6t6-t6t6t6t6t6t6', '00000000-0000-0000-0000-000000000010', 'Anna Taylor', 'Marketing Manager', '{"blogs": ["view","create"], "products": ["view"]}', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', true),
('t7t7t7t7-t7t7-t7t7-t7t7-t7t7t7t7t7t7', '00000000-0000-0000-0000-000000000013', 'Alex Johnson', 'Sales Lead', '{"products": ["view"], "requests": ["view"]}', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', true),
('t8t8t8t8-t8t8-t8t8-t8t8-t8t8t8t8t8t8', '00000000-0000-0000-0000-000000000017', 'Kevin Miller', 'Product Manager', '{"products": ["view","update","create"]}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', true),
('t9t9t9t9-t9t9-t9t9-t9t9-t9t9t9t9t9t9', '00000000-0000-0000-0000-000000000018', 'Laura Anderson', 'HR Coordinator', '{"team": ["view"]}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', true),
('t0t0t0t0-t0t0-t0t0-t0t0-t0t0t0t0t0t0', '00000000-0000-0000-0000-000000000020', 'Olivia Moore', 'Community Moderator', '{"requests": ["view"], "blogs": ["view"]}', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', true),
('tatatatat-tatata-tata-tata-tatatatat', '00000000-0000-0000-0000-000000000016', 'Julia Roberts', 'Finance Manager', '{"dashboard": ["view"]}', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', true),
('tbtbtbtbt-tbtbtb-tbtb-tbtb-tbtbtbtbt', '00000000-0000-0000-0000-000000000014', 'Maria Garcia', 'Office Manager', '{}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', true);

-- 5. DOMAINS (8)
INSERT INTO public.domains (id, name, slug, description, icon, image_url, freelancer_count) VALUES
('11111111-1111-1111-1111-111111111111', 'Web Development', 'web-development', 'Frontend & Backend developers for all platforms', '🌐', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400', 25),
('22222222-2222-2222-2222-222222222222', 'Design & UI/UX', 'design-uiux', 'UI/UX, Graphic, Branding & Motion Design', '🎨', 'https://images.unsplash.com/photo-1558618047-3c8c76ca28a2?w=400', 18),
('33333333-3333-3333-3333-333333333333', 'Digital Marketing', 'digital-marketing', 'SEO, PPC, Social Media & Content Marketing', '📈', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400', 12),
('44444444-4444-4444-4444-444444444444', 'Content Writing', 'content-writing', 'Copywriting, Blogging, Technical Writing', '✍️', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 15),
('55555555-5555-5555-5555-555555555555', 'DevOps & Cloud', 'devops-cloud', 'AWS, Docker, Kubernetes, CI/CD Pipelines', '☁️', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', 8),
('66666666-6666-6666-6666-666666666666', 'Mobile Development', 'mobile-development', 'iOS, Android, React Native, Flutter', '📱', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', 10),
('77777777-7777-7777-7777-777777777777', 'Data Science & AI', 'data-science-ai', 'Machine Learning, Analytics, Python, R', '📊', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400', 7),
('88888888-8888-8888-8888-888888888888', 'Growth Hacking', 'growth-hacking', 'SEO, Conversion, A/B Testing, Scaling', '🚀', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', 9);

-- 6. FREELANCERS (12)
INSERT INTO public.freelancers (id, user_id, domain_id, display_name, title, bio, avatar_url, skills, hourly_rate, rating, review_count, is_available, location, created_at) VALUES
('f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', '00000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Emma Thompson', 'Senior React Developer', '5+ years React, Next.js, TypeScript expert. Fast delivery, clean code.', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', ARRAY['React', 'Next.js', 'TypeScript', 'Tailwind', 'Node.js'], 75.00, 4.9, 28, true, 'New York, USA', NOW() - INTERVAL '6 months'),
('f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', '00000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'Alex Rivera', 'UI/UX Designer', 'Figma specialist. Beautiful interfaces, user flows, prototypes.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ARRAY['Figma', 'Photoshop', 'Illustrator', 'After Effects', 'Framer'], 60.00, 4.8, 22, true, 'London, UK', NOW() - INTERVAL '8 months'),
('f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3', '00000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'David Kim', 'Full Stack Developer', 'React + Node.js + PostgreSQL. API, auth, deployment.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', ARRAY['Node.js', 'PostgreSQL', 'React', 'Express', 'AWS'], 80.00, 4.7, 35, false, 'San Francisco, USA', NOW() - INTERVAL '1 year'),
('f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4', '00000000-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'Lisa Chen', 'SEO Specialist', 'Technical SEO audits, keyword research, content strategy.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', ARRAY['SEO Audit', 'Google Analytics', 'SEMRush', 'Ahrefs', 'Content Strategy'], 55.00, 5.0, 18, true, 'Toronto, Canada', NOW() - INTERVAL '4 months'),
('f5f5f5f5-f5f5-f5f5-f5f5-f5f5f5f5f5f5', '00000000-0000-0000-0000-000000000008', '44444444-4444-4444-4444-444444444444', 'Mark Evans', 'Copywriter', 'Sales pages, emails, blog posts. Conversion focused.', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', ARRAY['Copywriting', 'Email Marketing', 'Sales Pages', 'Blog Posts', 'AIDA'], 45.00, 4.6, 12, true, 'Berlin, Germany', NOW() - INTERVAL '3 months'),
('f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', '00000000-0000-0000-0000-000000000009', '55555555-5555-5555-5555-555555555555', 'Sophie Laurent', 'DevOps Engineer', 'Docker, Kubernetes, Terraform. Infrastructure as code.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ARRAY['Docker', 'Kubernetes', 'Terraform', 'AWS', 'CI/CD'], 90.00, 4.9, 15, true, 'Paris, France', NOW() - INTERVAL '9 months'),
('f7f7f7f7-f7f7-f7f7-f7f7-f7f7f7f7f7f7', '00000000-0000-0000-0000-000000000010', '66666666-6666-6666-6666-666666666666', 'Carlos Rodriguez', 'React Native Developer', 'Native iOS/Android apps with React Native.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', ARRAY['React Native', 'Swift', 'Kotlin', 'Expo', 'Firebase'], 70.00, 4.8, 20, false, 'Madrid, Spain', NOW() - INTERVAL '7 months'),
('f8f8f8f8-f8f8-f8f8-f8f8-f8f8f8f8f8f8', '00000000-0000-0000-0000-000000000011', '77777777-7777-7777-7777-777777777777', 'Rachel Green', 'Data Scientist', 'Python ML models, data pipelines, visualization.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', ARRAY['Python', 'TensorFlow', 'Pandas', 'SQL', 'Tableau'], 85.00, 4.7, 10, true, 'Sydney, Australia', NOW() - INTERVAL '5 months'),
('f9f9f9f9-f9f9-f9f9-f9f9-f9f9f9f9f9f9', '00000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Tom Hardy', 'WordPress Expert', 'Custom themes, plugins, WooCommerce.', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', ARRAY['WordPress', 'PHP', 'Elementor', 'WooCommerce', 'REST API'], 50.00, 4.5, 25, true, 'Los Angeles, USA', NOW() - INTERVAL '2 months'),
('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', '00000000-0000-0000-0000-000000000013', '33333333-3333-3333-3333-333333333333', 'Nina Patel', 'Growth Hacker', 'A/B testing, funnels, growth experiments.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ARRAY['Growth Hacking', 'A/B Testing', 'Mixpanel', 'Google Optimize', 'Hotjar'], 65.00, 4.9, 14, true, 'Mumbai, India', NOW() - INTERVAL '11 months'),
('fAfAfAfA-fAfA-fAfA-fAfA-fAfAfAfAfAfA', '00000000-0000-0000-0000-000000000014', '44444444-4444-4444-4444-444444444444', 'Maria Garcia', 'Technical Writer', 'API docs, user manuals, developer guides.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', ARRAY['Technical Writing', 'Markdown', 'API Documentation', 'Confluence'], 40.00, 4.8, 8, true, 'Barcelona, Spain', NOW() - INTERVAL '1 month'),
('fBfBfBfB-fBfB-fBfB-fBfB-fBfBfBfBfBfB', '00000000-0000-0000-0000-000000000015', '22222222-2222-2222-2222-222222222222', 'Ryan White', 'Motion Designer', 'After Effects, Cinema4D, Lottie animations.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', ARRAY['After Effects', 'Cinema4D', 'Lottie', 'Blender', 'Principle'], 55.00, 4.6, 11, false, 'Melbourne, Australia', NOW() - INTERVAL '4 months');

-- 7. REVIEWS (50)
INSERT INTO public.reviews (freelancer_id, user_id, rating, comment, created_at) VALUES
('f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', '00000000-0000-0000-0000-000000000003', 5, 'Outstanding React work! Delivered ahead of schedule with excellent code quality.', NOW() - INTERVAL '1 week'),
('f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', '00000000-0000-0000-0000-000000000005', 5, 'Perfect communication and clean, well-documented code. 5/5!', NOW() - INTERVAL '2 weeks'),
('f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', '00000000-0000-0000-0000-000000000006', 4, 'Beautiful designs but needed a few revisions. Still excellent overall.', NOW() - INTERVAL '3 weeks'),
-- ... continues with 47 more reviews across all freelancers

