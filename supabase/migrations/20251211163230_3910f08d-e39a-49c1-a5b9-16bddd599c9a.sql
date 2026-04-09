-- Add notes column to participants table
ALTER TABLE public.participants
ADD COLUMN notes text;