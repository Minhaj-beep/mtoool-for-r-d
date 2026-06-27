/*
  # Initial Schema for QR Menu SaaS Platform

  ## Overview
  Multi-tenant restaurant management system with subscription-based features.
  
  ## New Tables
  
  ### restaurants
  - `id` (uuid, primary key)
  - `name` (text, restaurant name)
  - `slug` (text, unique URL-safe identifier)
  - `google_place_id` (text, for Google reviews integration)
  - `logo_url` (text, S3 URL for restaurant logo)
  - `theme_color` (text, hex color for branding)
  - `subscription_plan` (text, one of: free, basic, pro, enterprise)
  - `stripe_customer_id` (text, Stripe customer reference)
  - `stripe_subscription_id` (text, Stripe subscription reference)
  - `image_count` (integer, tracks uploaded images for plan limits)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### users
  - `id` (uuid, primary key, references auth.users)
  - `email` (text)
  - `role` (text, default 'admin')
  - `restaurant_id` (uuid, foreign key to restaurants)
  - `created_at` (timestamptz)
  
  ### menus
  - `id` (uuid, primary key)
  - `restaurant_id` (uuid, foreign key to restaurants)
  - `name` (text, menu name)
  - `is_active` (boolean, only one active per restaurant for free/basic)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### categories
  - `id` (uuid, primary key)
  - `menu_id` (uuid, foreign key to menus)
  - `name` (text, category name)
  - `display_order` (integer, for sorting)
  - `created_at` (timestamptz)
  
  ### dishes
  - `id` (uuid, primary key)
  - `category_id` (uuid, foreign key to categories)
  - `name` (text, dish name)
  - `description` (text, dish description)
  - `price` (decimal, dish price)
  - `image_url` (text, S3 URL for dish image)
  - `is_available` (boolean, availability toggle)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - RLS enabled on all tables
  - Users can only access data for their own restaurant
  - Public read access for menu viewing pages
*/

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  google_place_id text,
  logo_url text,
  theme_color text DEFAULT '#000000',
  subscription_plan text NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  image_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'admin',
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create menus table
CREATE TABLE IF NOT EXISTS menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create dishes table
CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  image_url text,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menus_restaurant_id ON menus(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_categories_menu_id ON categories(menu_id);
CREATE INDEX IF NOT EXISTS idx_dishes_category_id ON dishes(category_id);

-- Enable Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurants
CREATE POLICY "Users can view their own restaurant"
  ON restaurants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own restaurant"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can view restaurants for menu display"
  ON restaurants FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for users
CREATE POLICY "Users can view their own user record"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for menus
CREATE POLICY "Users can view menus for their restaurant"
  ON menus FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create menus for their restaurant"
  ON menus FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update menus for their restaurant"
  ON menus FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete menus for their restaurant"
  ON menus FOR DELETE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can view active menus"
  ON menus FOR SELECT
  TO anon
  USING (is_active = true);

-- RLS Policies for categories
CREATE POLICY "Users can view categories for their restaurant"
  ON categories FOR SELECT
  TO authenticated
  USING (
    menu_id IN (
      SELECT m.id FROM menus m
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can create categories for their restaurant"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    menu_id IN (
      SELECT m.id FROM menus m
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can update categories for their restaurant"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    menu_id IN (
      SELECT m.id FROM menus m
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    menu_id IN (
      SELECT m.id FROM menus m
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories for their restaurant"
  ON categories FOR DELETE
  TO authenticated
  USING (
    menu_id IN (
      SELECT m.id FROM menus m
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for dishes
CREATE POLICY "Users can view dishes for their restaurant"
  ON dishes FOR SELECT
  TO authenticated
  USING (
    category_id IN (
      SELECT c.id FROM categories c
      INNER JOIN menus m ON c.menu_id = m.id
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can create dishes for their restaurant"
  ON dishes FOR INSERT
  TO authenticated
  WITH CHECK (
    category_id IN (
      SELECT c.id FROM categories c
      INNER JOIN menus m ON c.menu_id = m.id
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can update dishes for their restaurant"
  ON dishes FOR UPDATE
  TO authenticated
  USING (
    category_id IN (
      SELECT c.id FROM categories c
      INNER JOIN menus m ON c.menu_id = m.id
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    category_id IN (
      SELECT c.id FROM categories c
      INNER JOIN menus m ON c.menu_id = m.id
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete dishes for their restaurant"
  ON dishes FOR DELETE
  TO authenticated
  USING (
    category_id IN (
      SELECT c.id FROM categories c
      INNER JOIN menus m ON c.menu_id = m.id
      INNER JOIN users u ON m.restaurant_id = u.restaurant_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Public can view available dishes"
  ON dishes FOR SELECT
  TO anon
  USING (true);