-- Create subtasks table
CREATE TABLE public.task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for subtasks
CREATE POLICY "Authenticated users can manage task_subtasks" 
ON public.task_subtasks FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view task_subtasks" 
ON public.task_subtasks FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for comments
CREATE POLICY "Authenticated users can manage task_comments" 
ON public.task_comments FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view task_comments" 
ON public.task_comments FOR SELECT USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE TRIGGER update_task_subtasks_updated_at
BEFORE UPDATE ON public.task_subtasks
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();