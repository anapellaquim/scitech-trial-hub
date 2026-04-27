import type { ModuleKey, ModuleAction } from "@/hooks/usePermission";

export type TemplateGrants = Partial<Record<ModuleKey, ModuleAction[]>>;

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  grants: TemplateGrants;
}

// Each grant lists actions to enable. "create" implies "view".
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "coordinator",
    name: "Study Coordinator",
    description:
      "Day-to-day study operations: visits, participants, tasks, agenda, communications.",
    grants: {
      dashboard: ["view"],
      projects: ["view"],
      agenda: ["view", "create"],
      tasks: ["view", "create"],
      visits: ["view", "create"],
      site_monitoring: ["view"],
      communications: ["view", "create"],
      participants: ["view", "create"] as any, // ignored if not in MODULE_KEYS
      library: ["view"],
    },
  },
  {
    id: "investigator",
    name: "Principal Investigator",
    description:
      "Clinical oversight: participants, visits, committees, steering, read-only on operations.",
    grants: {
      dashboard: ["view"],
      projects: ["view"],
      agenda: ["view"],
      tasks: ["view"],
      visits: ["view", "create"],
      site_monitoring: ["view"],
      committees: ["view", "create"],
      steering: ["view"],
      regulatory: ["view"],
      communications: ["view"],
      library: ["view"],
    },
  },
  {
    id: "qa_manager",
    name: "QA Manager",
    description:
      "Quality oversight: monitoring, change control, risks, regulatory, full read access.",
    grants: {
      dashboard: ["view"],
      projects: ["view"],
      site_monitoring: ["view", "create"],
      change_control: ["view", "create"],
      risks: ["view", "create"],
      qualifications: ["view", "create"],
      trainings: ["view", "create"],
      regulatory: ["view", "create"],
      pmcf_survey: ["view"],
      committees: ["view"],
      steering: ["view"],
      communications: ["view"],
      library: ["view"],
    },
  },
  {
    id: "monitor",
    name: "Clinical Monitor (CRA)",
    description:
      "Monitoring focus: visits, site monitoring, queries, regulatory read access.",
    grants: {
      dashboard: ["view"],
      projects: ["view"],
      visits: ["view", "create"],
      site_monitoring: ["view", "create"],
      tasks: ["view", "create"],
      regulatory: ["view"],
      communications: ["view"],
      library: ["view"],
    },
  },
  {
    id: "regulatory",
    name: "Regulatory Affairs",
    description:
      "Regulatory submissions, committees, change control, library access.",
    grants: {
      dashboard: ["view"],
      projects: ["view"],
      regulatory: ["view", "create"],
      committees: ["view", "create"],
      change_control: ["view", "create"],
      library: ["view", "create"],
      communications: ["view", "create"],
    },
  },
  {
    id: "viewer",
    name: "Read-only Viewer",
    description: "View access to all modules, no create rights.",
    grants: {
      dashboard: ["view"], communications: ["view"], projects: ["view"],
      agenda: ["view"], tasks: ["view"], visits: ["view"],
      site_monitoring: ["view"], pmcf_survey: ["view"], qualifications: ["view"],
      trainings: ["view"], change_control: ["view"], risks: ["view"],
      committees: ["view"], steering: ["view"], regulatory: ["view"],
      payments: ["view"], library: ["view"],
    },
  },
];
