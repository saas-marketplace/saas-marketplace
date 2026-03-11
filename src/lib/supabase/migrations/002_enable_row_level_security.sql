-- Enable row-level security for the freelancers table
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow only authenticated users to access their own data
CREATE POLICY "Freelancer access policy"
ON freelancers
FOR SELECT USING (auth.uid() = user_id);

-- Repeat for other tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product access policy"
ON products
FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client request access policy"
ON client_requests
FOR SELECT USING (auth.uid() = user_id);