-- Create departments table
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view departments"
ON public.departments
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage departments"
ON public.departments
FOR ALL
USING (auth.role() = 'authenticated');

-- Add department_id column to task_raci (nullable, since it can be either user or department)
ALTER TABLE public.task_raci
ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE;

-- Make user_id nullable (since it can be either user or department)
ALTER TABLE public.task_raci
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or department_id is set
ALTER TABLE public.task_raci
ADD CONSTRAINT task_raci_user_or_department_check
CHECK (
  (user_id IS NOT NULL AND department_id IS NULL) OR
  (user_id IS NULL AND department_id IS NOT NULL)
);

-- Drop the unique constraint on user_id and role, and create a new one
ALTER TABLE public.task_raci DROP CONSTRAINT IF EXISTS task_raci_task_id_user_id_role_key;

-- Create unique constraints for both user and department combinations
CREATE UNIQUE INDEX task_raci_task_user_role_unique ON public.task_raci (task_id, user_id, role) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX task_raci_task_department_role_unique ON public.task_raci (task_id, department_id, role) WHERE department_id IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert some default departments
INSERT INTO public.departments (name, description, color) VALUES
  ('Gerência de Projetos', 'Equipe responsável pela gestão de projetos', '#3b82f6'),
  ('Regulatório', 'Equipe de assuntos regulatórios', '#8b5cf6'),
  ('Qualidade', 'Equipe de controle de qualidade', '#10b981'),
  ('Operações', 'Equipe de operações clínicas', '#f59e0b'),
  ('TI', 'Tecnologia da Informação', '#6366f1');