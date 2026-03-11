-- Create freelancers table
CREATE TABLE freelancers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  expertise TEXT NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create client_requests table
CREATE TABLE client_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create team_members table
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE
);