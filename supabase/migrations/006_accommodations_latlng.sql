-- Store lat/lng from Google Places for future map view
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
