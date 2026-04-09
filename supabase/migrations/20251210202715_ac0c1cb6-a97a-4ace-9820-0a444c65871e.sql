-- Add Centro de Custo and Classe de Valor columns to studies table
ALTER TABLE public.studies
ADD COLUMN cost_center text,
ADD COLUMN value_class text;