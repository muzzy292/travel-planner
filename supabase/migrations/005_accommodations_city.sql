-- Add city column to accommodations for reliable widget matching
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS city TEXT;
