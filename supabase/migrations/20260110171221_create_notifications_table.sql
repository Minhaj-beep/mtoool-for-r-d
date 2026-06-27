-- ===============================
-- Notifications table
-- ===============================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  restaurant_id uuid NOT NULL
    REFERENCES restaurants(id)
    ON DELETE CASCADE,

  title text NOT NULL,
  message text NOT NULL,

  type text NOT NULL DEFAULT 'general'
    CHECK (
      type IN (
        'general',
        'subscription_reminder',
        'subscription_expired',
        'subscription_renewed',
        'payment_failed'
      )
    ),

  is_read boolean NOT NULL DEFAULT false,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===============================
-- Indexes (performance)
-- ===============================

CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id
  ON notifications (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
  ON notifications (is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications (type);

-- ===============================
-- Enable Row Level Security
-- ===============================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ===============================
-- RLS: SELECT (owners can view)
-- ===============================

DROP POLICY IF EXISTS "Owners can view notifications" ON notifications;

CREATE POLICY "Owners can view notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  restaurant_id IN (
    SELECT id
    FROM restaurants
    WHERE owner_id = auth.uid()
  )
);

-- ===============================
-- RLS: UPDATE (mark as read)
-- ===============================

DROP POLICY IF EXISTS "Owners can update notifications" ON notifications;

CREATE POLICY "Owners can update notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
  restaurant_id IN (
    SELECT id
    FROM restaurants
    WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT id
    FROM restaurants
    WHERE owner_id = auth.uid()
  )
);

-- ===============================
-- INSERT POLICY (OPTIONAL)
-- ===============================
-- Only enable this if the CLIENT needs to insert notifications.
-- If notifications are created by backend jobs or webhooks,
-- you should rely on the service role and NOT create this policy.

-- DROP POLICY IF EXISTS "Authenticated can insert notifications" ON notifications;

-- CREATE POLICY "Authenticated can insert notifications"
-- ON notifications
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (true);
