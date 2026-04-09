-- Add research_center column to participants table
ALTER TABLE public.participants 
ADD COLUMN research_center text;