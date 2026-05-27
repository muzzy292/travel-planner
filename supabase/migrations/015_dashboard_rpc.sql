-- ============================================================
-- Migration 015: Dashboard summary RPC
-- Consolidates 5 parallel dashboard queries into a single call
-- Run this in Supabase SQL Editor after 014
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary(p_trip_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  -- Only allow access to own trips
  IF NOT EXISTS (
    SELECT 1 FROM trips WHERE id = p_trip_id AND user_id = auth.uid()
  ) THEN
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
