-- ============================================================
-- Migration 014: Full ownership RLS model
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add user_id to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Step 2: Backfill existing trips to the first (only) user
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE trips SET user_id = v_uid WHERE user_id IS NULL;
  END IF;
END $$;

-- Step 3: Trigger to auto-set user_id on new trip inserts
CREATE OR REPLACE FUNCTION set_trip_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_trip_owner ON trips;
CREATE TRIGGER trg_set_trip_owner
  BEFORE INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION set_trip_owner();

-- Step 4: Create allowed_users whitelist table
CREATE TABLE IF NOT EXISTS allowed_users (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "check own email" ON allowed_users;
CREATE POLICY "check own email" ON allowed_users
  FOR SELECT USING (email = auth.email());

-- Step 5: Drop old blanket RLS policies and replace with ownership-based ones

-- trips
DROP POLICY IF EXISTS "Authenticated users can do everything on trips" ON trips;
CREATE POLICY "Owner can manage own trips" ON trips
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- itinerary_items
DROP POLICY IF EXISTS "Authenticated users can do everything on itinerary_items" ON itinerary_items;
CREATE POLICY "Owner can manage own itinerary items" ON itinerary_items
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- accommodations
DROP POLICY IF EXISTS "Authenticated users can do everything on accommodations" ON accommodations;
CREATE POLICY "Owner can manage own accommodations" ON accommodations
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- expenses
DROP POLICY IF EXISTS "Authenticated users can do everything on expenses" ON expenses;
CREATE POLICY "Owner can manage own expenses" ON expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- wishlist_items
DROP POLICY IF EXISTS "Authenticated users can do everything on wishlist_items" ON wishlist_items;
CREATE POLICY "Owner can manage own wishlist items" ON wishlist_items
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- calendar_events
DROP POLICY IF EXISTS "Authenticated users can do everything on calendar_events" ON calendar_events;
CREATE POLICY "Owner can manage own calendar events" ON calendar_events
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- ============================================================
-- After running this migration, insert your email:
--   INSERT INTO allowed_users (email) VALUES ('your@email.com');
-- ============================================================
