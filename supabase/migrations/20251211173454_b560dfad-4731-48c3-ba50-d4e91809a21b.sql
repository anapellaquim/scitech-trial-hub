-- Adicionar coluna display_order para persistir a ordem das tarefas
ALTER TABLE public.tasks 
ADD COLUMN display_order integer DEFAULT 0;

-- Criar índice para melhorar performance ao ordenar
CREATE INDEX idx_tasks_display_order ON public.tasks(project_id, display_order);