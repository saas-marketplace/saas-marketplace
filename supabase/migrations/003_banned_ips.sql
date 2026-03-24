-- Create banned_ips table for IP blocking
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) NOT NULL UNIQUE, -- IPv4 or IPv6
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast IP lookups
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip_address ON banned_ips(ip_address);

-- Create function to check if IP is banned (for use in other places)
CREATE OR REPLACE FUNCTION is_banned_ip(p_ip VARCHAR(45))
RETURNS BOOLEAN AS $$
DECLARE
  v_banned BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM banned_ips 
    WHERE ip_address = p_ip 
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_banned;
  
  RETURN v_banned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Ban an IP address
-- INSERT INTO banned_ips (ip_address, reason) VALUES ('192.168.1.100', 'Spam activity');

-- Example: Remove a ban
-- DELETE FROM banned_ips WHERE ip_address = '192.168.1.100';
