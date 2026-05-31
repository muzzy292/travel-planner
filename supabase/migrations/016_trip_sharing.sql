-- ============================================================
-- Migration 016: Trip sharing / member access
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. trip_members table
CREATE TABLE IF NOT EXISTS trip_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL until claimed
  invited_email text NOT NULL,
  role          text NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor')),
  invited_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(trip_id, invited_email)
);
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

-- Owner can fully manage members for their trips
DROP POLICY IF EXISTS "Owner can manage trip members" ON trip_members;
CREATE POLICY "Owner can manage trip members" ON trip_members
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- Members can see their own rows
DROP POLICY IF EXISTS "Member can view own membership" ON trip_members;
CREATE POLICY "Member can view own membership" ON trip_members
  FOR SELECT USING (
    user_id = auth.uid() OR lower(invited_email) = lower(auth.email())
  );

-- 2. Helper: is this trip accessible to the current user (owner OR claimed member)?
CREATE OR REPLACE FUNCTION is_trip_accessible(p_trip_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    EXISTS (SELECT 1 FROM trips WHERE id = p_trip_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM trip_members WHERE trip_id = p_trip_id AND user_id = auth.uid())
$$;

-- 3. Update trips RLS — owner manages, members can read
DROP POLICY IF EXISTS "Owner can manage own trips" ON trips;
CREATE POLICY "Owner can manage own trips" ON trips
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can view shared trips" ON trips;
DROP POLICY IF EXISTS "Members can view shared trips" ON trips;
CREATE POLICY "Members can view shared trips" ON trips
  FOR SELECT USING (
    id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

-- 4. Update child table RLS to use is_trip_accessible
DROP POLICY IF EXISTS "Owner can manage own itinerary items" ON itinerary_items;
DROP POLICY IF EXISTS "Owner or member can access itinerary items" ON itinerary_items;
CREATE POLICY "Owner or member can access itinerary items" ON itinerary_items
  FOR ALL USING (is_trip_accessible(trip_id))
  WITH CHECK (is_trip_accessible(trip_id));

DROP POLICY IF EXISTS "Owner can manage own accommodations" ON accommodations;
DROP POLICY IF EXISTS "Owner or member can access accommodations" ON accommodations;
CREATE POLICY "Owner or member can access accommodations" ON accommodations
  FOR ALL USING (is_trip_accessible(trip_id))
  WITH CHECK (is_trip_accessible(trip_id));

DROP POLICY IF EXISTS "Owner can manage own expenses" ON expenses;
DROP POLICY IF EXISTS "Owner or member can access expenses" ON expenses;
CREATE POLICY "Owner or member can access expenses" ON expenses
  FOR ALL USING (is_trip_accessible(trip_id))
  WITH CHECK (is_trip_accessible(trip_id));

DROP POLICY IF EXISTS "Owner can manage own wishlist items" ON wishlist_items;
DROP POLICY IF EXISTS "Owner or member can access wishlist items" ON wishlist_items;
CREATE POLICY "Owner or member can access wishlist items" ON wishlist_items
  FOR ALL USING (is_trip_accessible(trip_id))
  WITH CHECK (is_trip_accessible(trip_id));

DROP POLICY IF EXISTS "Owner can manage own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Owner or member can access calendar events" ON calendar_events;
CREATE POLICY "Owner or member can access calendar events" ON calendar_events
  FOR ALL USING (is_trip_accessible(trip_id))
  WITH CHECK (is_trip_accessible(trip_id));

-- 5. invite_to_trip — owner invites by email, auto-whitelists them
CREATE OR REPLACE FUNCTION invite_to_trip(p_trip_id uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM trips WHERE id = p_trip_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: only the trip owner can invite members';
  END IF;
  -- Auto-whitelist the invited email so they can sign in
  INSERT INTO allowed_users (email) VALUES (lower(trim(p_email))) ON CONFLICT DO NOTHING;
  -- Add to trip_members (no-op if already invited)
  INSERT INTO trip_members (trip_id, invited_email, invited_by)
  VALUES (p_trip_id, lower(trim(p_email)), auth.uid())
  ON CONFLICT (trip_id, invited_email) DO NOTHING;
END $$;

-- 6. remove_trip_member — owner removes a member by email
CREATE OR REPLACE FUNCTION remove_trip_member(p_trip_id uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM trips WHERE id = p_trip_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM trip_members
  WHERE trip_id = p_trip_id AND lower(invited_email) = lower(trim(p_email));
END $$;

-- 7. claim_pending_invites — call after sign-in to link invites to the signed-in user
CREATE OR REPLACE FUNCTION claim_pending_invites()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE trip_members
  SET user_id = auth.uid()
  WHERE lower(invited_email) = lower(auth.email()) AND user_id IS NULL;
END $$;

-- 8. Update dashboard RPC to allow member access (replaces migration 015 version)
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_trip_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  IF NOT is_trip_accessible(p_trip_id) THEN
    RETURN NULL;
  END IF;
  SELECT json_build_object(
    'flight_count',    (SELECT COUNT(*) FROM itinerary_items WHERE trip_id = p_trip_id AND item_type = 'flight'),
    'activity_count',  (SELECT COUNT(*) FROM itinerary_items WHERE trip_id = p_trip_id AND item_type = 'activity'),
    'stay_count',      (SELECT COUNT(*) FROM accommodations WHERE trip_id = p_trip_id),
    'expense_total',   (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE trip_id = p_trip_id),
    'stay_cost_total', (SELECT COALESCE(SUM(price), 0) FROM accommodations WHERE trip_id = p_trip_id AND price IS NOT NULL),
    'itin_cost_total', (SELECT COALESCE(SUM(cost), 0) FROM itinerary_items WHERE trip_id = p_trip_id AND cost IS NOT NULL)
  ) INTO result;
  RETURN result;
END $$;
