## Corrigir "Não atribuído" nas tarefas do cronograma

A coluna Responsável da Lista e do Gantt mostra "Não atribuído" porque ainda lê `tasks.assigned_to` (que agora é sempre `null`), enquanto o responsável real foi gravado em `tasks.assigned_stakeholder_id` (vinculado aos Stakeholders do estudo).

### Mudanças

1. **`src/pages/ProjectSchedule.tsx`**
   - Buscar `communication_stakeholders` filtrados pelo `project_id`.
   - Guardar em estado `stakeholders` e passar para `TaskListView` e `GanttChart`.

2. **`src/components/schedule/TaskListView.tsx`**
   - Aceitar nova prop `stakeholders`.
   - Função `getResponsibleName(task)`: retorna `stakeholder.name` (com `organization` em parênteses se houver) quando `assigned_stakeholder_id` existir; fallback para `profiles` via `assigned_to` (tarefas legadas); senão "Não atribuído".
   - Trocar `getProfileName(task.assigned_to)` por `getResponsibleName(task)`.

3. **`src/components/schedule/GanttChart.tsx`**
   - Aceitar nova prop `stakeholders`.
   - Mesma função `getResponsibleName`.
   - Atualizar o filtro "Responsável": opções listadas a partir dos stakeholders do projeto; comparação por `assigned_stakeholder_id` (mantendo "Todos" e "Não atribuído").
   - Trocar a renderização da linha que mostra o responsável.

4. **`src/types/schedule.ts`** — já tem `Stakeholder`; nada a alterar.

### Observação
Não é necessária migração — o campo `assigned_stakeholder_id` já existe e os Stakeholders já são carregados corretamente no diálogo de tarefa.