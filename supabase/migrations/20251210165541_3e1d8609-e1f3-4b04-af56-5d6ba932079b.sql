-- Add status_date column to participants table
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS status_date date;

-- Add comment for clarity
COMMENT ON COLUMN public.participants.status_date IS 'Date when the participant status changed (e.g., early exit date, lost to follow-up date)';