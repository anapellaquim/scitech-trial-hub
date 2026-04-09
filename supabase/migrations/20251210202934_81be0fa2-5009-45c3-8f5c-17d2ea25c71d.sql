-- Add Centro de Custo and Classe de Valor columns to projects table
ALTER TABLE public.projects
ADD COLUMN cost_center text,
ADD COLUMN value_class text;