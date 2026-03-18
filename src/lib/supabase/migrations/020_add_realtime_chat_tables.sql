-- Create request_typing table to track typing status
CREATE TABLE IF NOT EXISTS request_typing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, user_id)
);

-- Enable RLS on request_typing
ALTER TABLE request_typing ENABLE ROW LEVEL SECURITY;

-- Create policy for users to update their own typing status
CREATE POLICY "Users can update own typing status"
  ON request_typing
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for authenticated users to read typing status
CREATE POLICY "Authenticated users can read typing status"
  ON request_typing
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create user_status table to track online/offline status
CREATE TABLE IF NOT EXISTS user_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_status
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

-- Create policy for users to update their own status
CREATE POLICY "Users can update own status"
  ON user_status
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for authenticated users to read user status
CREATE POLICY "Authenticated users can read user status"
  ON user_status
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_request_typing_request_id ON request_typing(request_id);
CREATE INDEX IF NOT EXISTS idx_request_typing_user_id ON request_typing(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_user_id ON user_status(user_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE request_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE user_status;
