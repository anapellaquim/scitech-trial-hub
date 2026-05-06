## Plano: Vincular Fase às tarefas (individual + via modelo)

Complementa o plano anterior (criação de `project_phases`, `tasks.phase_id`, numeração hierárquica e ordenação por `planned_start_date`).

### 1. Editor individual de Fase na tarefa
- Em `ScheduleTaskDialog.tsx`, adicionar campo **Fase** (Select) logo abaixo do título.
  - Opções: fases do projeto atual (consulta a `project_phases` por `project_id`, ordenadas por `display_order`), com indicador de cor.
  - Opção “Sem fase” (limpa `phase_id`).
  - Botão “+ Gerenciar fases” abre o `ManagePhasesDialog` para criar/editar/reordenar fases sem sair do diálogo.
- Salvar `phase_id` no `tasks` ao criar/atualizar.

### 2. Gerenciar fases do projeto
- Novo `ManagePhasesDialog.tsx` (acessível pelo botão acima e por um botão “Fases” no header de `ProjectSchedule.tsx`):
  - Listar, criar, renomear, escolher cor, reordenar (drag) e remover fases.
  - Ao remover uma fase usada, perguntar: mover tarefas para “Sem fase” ou cancelar.

### 3. Modelos de projeto definem fases
- Migração adicional:
  - `project_template_phases` (id, template_id, name, display_order, color)
  - `project_template_tasks.phase_id` (FK opcional para `project_template_phases`)
- `ManageProjectTemplatesDialog.tsx`:
  - Seção “Fases do modelo” (CRUD análogo ao do projeto).
  - No editor de tarefa do modelo, dropdown de Fase com as fases do próprio modelo.
- `ApplyProjectTemplateDialog.tsx` / lógica de aplicação:
  - Ao aplicar um modelo: criar as fases do modelo em `project_phases` (preservando ordem/cor) e mapear `template_phase_id → project_phase_id` para preencher `tasks.phase_id` ao inserir as tarefas.
  - Se o projeto já tiver fases com mesmo nome, reutilizar (match case-insensitive) em vez de duplicar.

### 4. UI Gantt/Lista
- Coluna **Fase** (já planejada) passa a refletir o vínculo. Tarefas sem fase aparecem agrupadas como “Sem fase” na numeração `0.x`.

### Detalhes técnicos
- Tipos: adicionar `phase_id?: string | null` em `ScheduleTask` e `Phase { id, project_id, name, display_order, color }` em `src/types/schedule.ts`.
- Hook `usePhases(projectId)` para buscar/cachear fases do projeto (reutilizado pelo dialog de tarefa, dialog de gerenciamento e Gantt/Lista).
- RLS de `project_phases` e `project_template_phases`: mesmas regras já aplicadas a `tasks` / `project_templates`.

### Arquivos impactados (além do plano anterior)
- `src/components/schedule/ScheduleTaskDialog.tsx` (novo campo Fase)
- `src/components/schedule/ManagePhasesDialog.tsx` (novo)
- `src/components/ManageProjectTemplatesDialog.tsx` (CRUD de fases + select nas tarefas do modelo)
- `src/components/ApplyProjectTemplateDialog.tsx` (mapear/criar fases ao aplicar)
- `src/pages/ProjectSchedule.tsx` (botão “Fases” no header)
- `src/hooks/usePhases.ts` (novo)
- Migração: `project_template_phases` + `project_template_tasks.phase_id`
