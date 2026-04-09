-- Add window_days column to visit_types for protocol window
ALTER TABLE public.visit_types 
ADD COLUMN IF NOT EXISTS window_days integer DEFAULT 0;