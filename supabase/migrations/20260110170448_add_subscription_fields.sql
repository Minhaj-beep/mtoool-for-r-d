/*
  # Add Subscription Management Fields

  ## Overview
  Adds comprehensive subscription tracking and service hold functionality to the restaurants table.
  
  ## Changes
  
  1. New Columns Added
    - `subscription_cycle` (text, 'monthly' or 'yearly') - Billing cycle
    - `subscription_status` (text, 'active', 'expired', or 'canceled') - Current status
    - `subscription_started_at` (timestamptz) - When subscription began
    - `subscription_expires_at` (timestamptz) - Expiration date
    - `is_on_hold` (boolean, default false) - Service hold flag
    - `owner_id` (uuid) - Owner user reference
    - `razorpay_customer_id` (text) - Razorpay customer ID
    - `razorpay_subscription_id` (text) - Razorpay subscription ID  
    - `razorpay_order_id` (text) - Razorpay order ID
  
  2. Security
    - No RLS changes needed (existing policies remain)
  
  ## Important Notes
  - Expired subscriptions will block menu access and content creation
  - is_on_hold flag allows manual service suspension
  - No existing data will be deleted
*/

-- Add subscription_cycle column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'subscription_cycle'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN subscription_cycle text DEFAULT 'monthly' CHECK (subscription_cycle IN ('monthly', 'yearly'));
  END IF;
END $$;

-- Add subscription_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'canceled'));
  END IF;
END $$;

-- Add subscription_started_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'subscription_started_at'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN subscription_started_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add subscription_expires_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN subscription_expires_at timestamptz;
  END IF;
END $$;

-- Add is_on_hold column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'is_on_hold'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN is_on_hold boolean DEFAULT false;
  END IF;
END $$;

-- Add owner_id column with foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add Razorpay fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'razorpay_customer_id'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN razorpay_customer_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'razorpay_subscription_id'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN razorpay_subscription_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN razorpay_order_id text;
  END IF;
END $$;

-- Create index on owner_id for better query performance
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);

-- Create index on subscription_status for filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_subscription_status ON restaurants(subscription_status);