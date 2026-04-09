// Schedule types - extracted to avoid circular dependencies

export interface ScheduleTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  start_date: string | null;
  end_date: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  progress_percentage: number;
  assigned_to: string | null;
  project_id: string | null;
  display_order: number | null;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
  lag_days: number;
}

export interface TaskRACI {
  id: string;
  task_id: string;
  user_id: string | null;
  department_id: string | null;
  role: string;
}

export interface Profile {
  id: string;
  full_name: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
}
