-- Coordinates on itinerary items for map pins and travel time
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
