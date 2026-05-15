-- Add confirmation status to accommodations
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';
