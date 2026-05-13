-- Add cost column to itinerary_items
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2);
