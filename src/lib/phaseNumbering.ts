import { ScheduleTask } from "@/types/schedule";
import { ProjectPhase } from "@/hooks/usePhases";

export interface PhaseInfo {
  code: string;
  phase: ProjectPhase | null;
}

/**
 * Compute hierarchical numbering Phase.Task based on the order
 * of `orderedTasks`. Phases are indexed by their display_order in
 * `phases`; tasks without a phase get index 0.
 */
export function buildPhaseNumbering(
  orderedTasks: ScheduleTask[],
  phases: ProjectPhase[]
): Map<string, PhaseInfo> {
  const phaseIndex = new Map<string, number>();
  const phaseById = new Map<string, ProjectPhase>();
  [...phases]
    .sort((a, b) => a.display_order - b.display_order)
    .forEach((p, i) => {
      phaseIndex.set(p.id, i + 1);
      phaseById.set(p.id, p);
    });

  const counters = new Map<string, number>(); // key = phaseId or "0"
  const out = new Map<string, PhaseInfo>();

  for (const t of orderedTasks) {
    const pid = t.phase_id ?? null;
    const key = pid ?? "0";
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    const phaseIdx = pid ? phaseIndex.get(pid) ?? 0 : 0;
    out.set(t.id, {
      code: `${phaseIdx}.${next}`,
      phase: pid ? phaseById.get(pid) ?? null : null,
    });
  }
  return out;
}

/** Pick black/white text for contrast against a hex background. */
export function contrastText(hex?: string | null): string {
  if (!hex) return "#000";
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#000";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#000" : "#fff";
}
