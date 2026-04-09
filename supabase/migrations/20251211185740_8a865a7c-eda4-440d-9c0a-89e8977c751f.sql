-- Add notes field to research_centers
ALTER TABLE public.research_centers
ADD COLUMN notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.research_centers.notes IS 'Notas e observações sobre o centro de pesquisa';