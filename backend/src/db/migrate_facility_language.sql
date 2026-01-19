-- Add preferred_language column to facilities table
-- Allows each facility to set their preferred language for AI-generated reports

ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- Add comment
COMMENT ON COLUMN facilities.preferred_language IS 'Preferred language for AI-generated reports (e.g., "en", "fr"). Falls back to platform default if not set.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_facilities_preferred_language ON facilities(preferred_language);

