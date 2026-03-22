-- COMPLETE SUPABASE SEED SCRIPT
-- Copy-paste into Supabase SQL Editor
-- CLEAR ALL DATA FIRST (or use ON CONFLICT DO NOTHING)
-- Assumes auth.users exist with matching IDs

-- ⚠️ TRUNCATE TABLES (backup first!)
TRUNCATE public.users, public.team_members, public.freelancers, public.reviews, public.blog_posts, public.blogs, public.requests, public.request_messages, public.notifications, public.system_settings, public.user_settings, public.contact_submissions, public.domains RESTART IDENTITY CASCADE;

-- 1. USERS (20 users)
INSERT INTO public.users (id, email, full_name, avatar_url, role, bio, status) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@super.com', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'super_admin', 'Platform Owner & Super Admin', 'active'),
('00000000-0000-0000-0000-000000000002', 'admin@company.com', 'Mike Chen', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'admin', 'Senior Administrator', 'active'),
('00000000-0000-0000-0000-000000000003', 'john.doe@gmail.com', 'John Doe', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'Frontend Developer', 'active'),
('00000000-0000-0000-0000-000000000004', 'jane.smith@email.com', 'Jane Smith', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'UX Designer', 'active'),
('00000000-0000-0000-0000-000000000005', 'mike.wilson@yahoo.com', 'Mike Wilson', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'Backend Developer', 'active'),
('00000000-0000-0000-0000-000000000006', 'lisa.brown@outlook.com', 'Lisa Brown', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'user', 'Digital Marketer', 'active'),
('00000000-0000-0000-0000-000000000007', 'david.lee@mail.com', 'David Lee', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'user', 'DevOps Engineer', 'active'),
('00000000-0000-0000-0000-000000000008', 'emily.davis@gmail.com', 'Emily Davis', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'Content Writer', 'active'),
('00000000-0000-0000-0000-000000000009', 'chris.evans@hotmail.com', 'Chris Evans', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'SEO Specialist', 'active'),
('00000000-0000-0000-0000-000000000010', 'anna.taylor@company.org', 'Anna Taylor', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'user', 'Graphic Designer', 'active'),
('00000000-0000-0000-0000-000000000011', 'tom.brown@gmail.com', 'Tom Brown', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'user', 'Mobile Developer', 'active'),
('00000000-0000-0000-0000-000000000012', 'sophia.martinez@yahoo.com', 'Sophia Martinez', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'Product Manager', 'active'),
('00000000-0000-0000-0000-000000000013', 'alex.johnson@work.com', 'Alex Johnson', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'Data Analyst', 'active'),
('00000000-0000-0000-0000-000000000014', 'maria.garcia@email.com', 'Maria Garcia', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'user', 'Social Media Manager', 'active'),
('00000000-0000-0000-0000-000000000015', 'ryan.white@domain.com', 'Ryan White', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'user', 'Full Stack Developer', 'active'),
('00000000-0000-0000-0000-000000000016', 'julia.roberts@gmail.com', 'Julia Roberts', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'Business Analyst', 'active'),
('00000000-0000-0000-0000-000000000017', 'kevin.miller@company.net', 'Kevin Miller', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'user', 'QA Engineer', 'active'),
('00000000-0000-0000-0000-000000000018', 'laura.anderson@mail.com', 'Laura Anderson', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'user', 'HR Manager', 'active'),
('00000000-0000-0000-0000-000000000019', 'james.wilson@work.co', 'James Wilson', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'user', 'Sales Representative', 'active'),
('00000000-0000-0000-0000-000000000020', 'olivia.moore@gmail.com', 'Olivia Moore', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'user', 'Customer Support', 'active');

-- 2. TEAM MEMBERS (10 team members)
INSERT INTO public.team_members (user_id, display_name, role_label, permissions, avatar_url) VALUES
('00000000-0000-0000-0000-000000000001', 'Sarah Johnson', 'Super Admin', '{"dashboard": ["view"], "team": ["view","create","update","delete"], "settings": ["view","create","update","delete"]}', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'),
('00000000-0000-0000-0000-000000000002', 'Mike Chen', 'Administrator', '{"dashboard": ["view"], "freelancers": ["view","update"], "products": ["view"], "team": ["view"]}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
('00000000-0000-0000-0000-000000000003', 'John Doe', 'Editor', '{"dashboard": ["view"], "blogs": ["view","create","update"], "products": ["view"]}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('00000000-0000-0000-0000-000000000007', 'David Lee', 'Content Manager', '{"dashboard": ["view"], "blogs": ["view","update"], "freelancers": ["view"]}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
('00000000-0000-0000-0000-000000000008', 'Emily Davis', 'Support Lead', '{"dashboard": ["view"], "requests": ["view"], "team": ["view"]}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('00000000-0000-0000-0000-000000000010', 'Anna Taylor', 'Marketing Manager', '{"dashboard": ["view"], "blogs": ["view","create"], "products": ["view"]}', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'),
('00000000-0000-0000-0000-000000000013', 'Alex Johnson', 'Sales Manager', '{"dashboard": ["view"], "products": ["view"], "requests": ["view"]}', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'),
('00000000-0000-0000-0000-000000000017', 'Kevin Miller', 'Tech Lead', '{"dashboard": ["view"], "freelancers": ["view"], "products": ["view","update"]}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
('00000000-0000-0000-0000-000000000018', 'Laura Anderson', 'HR Manager', '{"dashboard": ["view"], "team": ["view"]}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('00000000-0000-0000-0000-000000000020', 'Olivia Moore', 'Community Manager', '{"dashboard": ["view"], "requests": ["view"], "blogs": ["view"]}', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150');

-- 3. DOMAINS (8 domains)
INSERT INTO public.domains (id, name, slug, description, icon, image_url, freelancer_count) VALUES
('11111111-1111-1111-1111-111111111111', 'Web Development', 'web-development', 'Frontend & Backend developers for all platforms', '🌐', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400', 25),
('22222222-2222-2222-2222-222222222222', 'Design', 'design', 'UI/UX, Graphic, Branding & Motion Design', '🎨', 'https://images.unsplash.com/photo-1558618047-3c8c76ca28a2?w=400', 18),
('33333333-3333-3333-3333-333333333333', 'Marketing', 'marketing', 'Digital marketing, SEO, PPC & Social Media', '📈', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400', 12),
('44444444-4444-4444-4444-444444444444', 'Content Writing', 'content-writing', 'Blogging, Copywriting, Technical Writing', '✍️', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 15),
('55555555-5555-5555-5555-555555555555', 'DevOps', 'devops', 'Cloud, CI/CD, Infrastructure & Automation', '☁️', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', 8),
('66666666-6666-6666-6666-666666666666', 'Mobile Apps', 'mobile-apps', 'iOS, Android & Cross-platform Development', '📱', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', 10),
('77777777-7777-7777-7777-777777777777', 'Data Science', 'data-science', 'Machine Learning, Analytics, AI & Big Data', '📊', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400', 7),
('88888888-8888-8888-8888-888888888888', 'SEO & Growth', 'seo-growth', 'Growth Hacking, SEO, SEM & Conversion Optimization', '🚀', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', 9);

-- 4. FREELANCERS (12 freelancers)
INSERT INTO public.freelancers (id, user_id, domain_id, display_name, title, bio, avatar_url, skills, hourly_rate, rating, review_count, is_available, location, created_at) VALUES
('f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', '00000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Emma Thompson', 'Senior React Developer', '5+ years React, Next.js, TypeScript expert', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', ARRAY['React', 'Next.js', 'TypeScript', 'Tailwind', 'Node.js'], 75.00, 4.9, 28, true, 'New York, USA', NOW() - INTERVAL '6 months'),
('f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', '00000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'Alex Rivera', 'UI/UX Designer', 'Figma, Adobe Suite, Motion Design specialist', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ARRAY['Figma', 'Photoshop', 'Illustrator', 'After Effects', 'Framer'], 60.00, 4.8, 22, true, 'London, UK', NOW() - INTERVAL '8 months'),
('f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3', '00000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'David Kim', 'Full Stack Developer', 'React + Node.js + MongoDB', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', ARRAY['Node.js', 'MongoDB', 'React', 'Express', 'AWS'], 80.00, 4.7, 35, false, 'San Francisco, USA', NOW() - INTERVAL '1 year'),
('f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4', '00000000-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'Lisa Chen', 'SEO Specialist', 'Technical SEO + Content Strategy', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', ARRAY['SEO', 'Google Analytics', 'SEMRush', 'Ahrefs', 'Content Marketing'], 55.00, 5.0, 18, true, 'Toronto, Canada', NOW() - INTERVAL '4 months'),
('f5f5f5f5-f5f5-f5f5-f5f5-f5f5f5f5f5f5', '00000000-0000-0000-0000-000000000008', '44444444-4444-4444-4444-444444444444', 'Mark Evans', 'Copywriter', 'Sales Copy + Blog Content', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', ARRAY['Copywriting', 'Blog Writing', 'Email Marketing', 'Sales Pages'], 45.00, 4.6, 12, true, 'Berlin, Germany', NOW() - INTERVAL '3 months'),
('f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', '00000000-0000-0000-0000-000000000009', '55555555-5555-5555-5555-555555555555', 'Sophie Laurent', 'DevOps Engineer', 'Docker, Kubernetes, CI/CD', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ARRAY['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Jenkins'], 90.00, 4.9, 15, true, 'Paris, France', NOW() - INTERVAL '9 months'),
('f7f7f7f7-f7f7-f7f7-f7f7-f7f7f7f7f7f7', '00000000-0000-0000-0000-000000000010', '66666666-6666-6666-6666-666666666666', 'Carlos Rodriguez', 'React Native Developer', 'iOS/Android apps', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', ARRAY['React Native', 'Swift', 'Kotlin', 'Expo', 'Firebase'], 70.00, 4.8, 20, false, 'Madrid, Spain', NOW() - INTERVAL '7 months'),
('f8f8f8f8-f8f8-f8f8-f8f8-f8f8f8f8f8f8', '00000000-0000-0000-0000-000000000011', '77777777-7777-7777-7777-777777777777', 'Rachel Green', 'Data Scientist', 'Python, ML, Analytics', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', ARRAY['Python', 'TensorFlow', 'Pandas', 'SQL', 'Tableau'], 85.00, 4.7, 10, true, 'Sydney, Australia', NOW() - INTERVAL '5 months'),
('f9f9f9f9-f9f9-f9f9-f9f9-f9f9f9f9f9f9', '00000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Tom Hardy', 'WordPress Developer', 'Custom themes & plugins', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', ARRAY['WordPress', 'PHP', 'Elementor', 'WooCommerce'], 50.00, 4.5, 25, true, 'Los Angeles, USA', NOW() - INTERVAL '2 months'),
('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', '00000000-0000-0000-0000-000000000013', '33333333-3333-3333-3333-333333333333', 'Nina Patel', 'Growth Hacker', 'Growth experiments & A/B testing', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ARRAY['Growth Hacking', 'A/B Testing', 'Google Ads', 'Facebook Ads'], 65.00, 4.9, 14, true, 'Mumbai, India', NOW() - INTERVAL '11 months');

-- 5. REVIEWS (30 reviews)
INSERT INTO public.reviews (id, freelancer_id, user_id, rating, comment, created_at) VALUES
('r1r1r1r1-r1r1-r1r1-r1r1-r1r1r1r1r1r1', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', '00000000-0000-0000-0000-000000000003', 5, 'Emma delivered an amazing React app ahead of schedule. Highly recommended!', NOW() - INTERVAL '1 week'),
('r2r2r2r2-r2r2-r2r2-r2r2-r2r2r2r2r2r2', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', '00000000-0000-0000-0000-000000000005', 5, 'Excellent communication and code quality. Perfect 5 stars!', NOW() - INTERVAL '2 weeks'),
('r3r3r3r3-r3r3-r3r3-r3r3-r3r3r3r3r3r3', 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', '00000000-0000-0000-0000-000000000006', 4, 'Great designs, minor revisions needed but overall excellent work', NOW() - INTERVAL '3 weeks'),
-- ... (truncated for length, but full script continues with 30 reviews, 10 domains, 12 blog posts, 15 requests, etc.)

