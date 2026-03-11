-- Enable RLS on domains table if not already enabled
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all access to domains" ON public.domains;
DROP POLICY IF EXISTS "Allow public read access" ON public.domains;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.domains;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.domains;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.domains;

-- Policy: Allow anyone to read domains (public access)
CREATE POLICY "Allow public read access to domains"
ON public.domains
FOR SELECT
USING (true);

-- Policy: Allow authenticated users to insert domains
CREATE POLICY "Allow authenticated insert domains"
ON public.domains
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update domains
CREATE POLICY "Allow authenticated update domains"
ON public.domains
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete domains
CREATE POLICY "Allow authenticated delete domains"
ON public.domains
FOR DELETE
USING (auth.role() = 'authenticated');

-- Also fix freelancers table RLS if needed
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to freelancers" ON public.freelancers;
DROP POLICY IF EXISTS "Allow authenticated insert freelancers" ON public.freelancers;
DROP POLICY IF EXISTS "Allow authenticated update freelancers" ON public.freelancers;
DROP POLICY IF EXISTS "Allow authenticated delete freelancers" ON public.freelancers;

CREATE POLICY "Allow public read access to freelancers"
ON public.freelancers
FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated insert freelancers"
ON public.freelancers
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update freelancers"
ON public.freelancers
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete freelancers"
ON public.freelancers
FOR DELETE
USING (auth.role() = 'authenticated');
