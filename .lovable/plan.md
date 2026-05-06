## Plano: Restaurar codificação hierárquica e coluna "Fase" no Gantt/Lista

As alterações anteriores criaram o vínculo de Fase na tarefa (`phase_id`) mas as colunas visuais ("#" e "Fase") não foram adicionadas ao Gantt nem à Lista. Este plano cobre apenas isso.

### 1. Carregar fases do projeto
- Em `ProjectSchedule.tsx`:
  - Usar `usePhases(projectId)` (já existente) e passar `phases` como prop para `GanttChart` e `TaskListView`.
  - Garantir ordenação das tarefas por `planned_start_date` ASC (já está, mas remover prioridade do `display_order`, conforme decisão prévia).

### 2. Numeração hierárquica `Fase.Tarefa`
- Calcular um `Map<taskId, code>` baseado na ordem exibida:
  - Para cada fase do projeto (ordem = `display_order`), índice `1..N`.
  - Tarefas sem fase ficam em `0.x`.
  - Dentro de cada fase, contar pela ordem em que as tarefas aparecem (já ordenadas por `planned_start_date`).
- Resultado: `1.1`, `1.2`, `2.1`, `0.1`, etc.

### 3. `GanttChart.tsx` — colunas à esquerda
- Antes da coluna do título, adicionar:
  - **Coluna "#"** (largura fixa ~56px): exibe o código hierárquico em `font-mono text-xs text-muted-foreground`.
  - **Coluna "Fase"** (largura fixa ~140px): badge com `backgroundColor: phase.color` (texto contrastante) e nome da fase. "Sem fase" cinza quando `phase_id` nulo.
- Atualizar o cabeçalho da grade (header sticky) com os mesmos rótulos.
- Tooltip: mostrar código + fase ao passar o mouse na barra.
- Em viewport estreito, colunas mantêm largura mínima e o conteúdo do título trunca com ellipsis.

### 4. `TaskListView.tsx` — colunas equivalentes
- Adicionar `<TableHead>` "#" e "Fase" antes da coluna de título.
- Cada `<TableRow>`: célula "#" com código e célula "Fase" com badge colorido.

### 5. Acessibilidade / pequenos ajustes
- Adicionar `<DialogDescription>` ao `ManagePhasesDialog` e ao `ScheduleTaskDialog` para silenciar o warning de aria atual.

### Arquivos impactados
- `src/pages/ProjectSchedule.tsx` (carregar e propagar `phases`)
- `src/components/schedule/GanttChart.tsx` (2 novas colunas + cálculo de código)
- `src/components/schedule/TaskListView.tsx` (2 novas colunas + cálculo de código)
- `src/components/schedule/ScheduleTaskDialog.tsx` (DialogDescription)
- (opcional) pequeno helper `src/lib/phaseNumbering.ts` para reusar o cálculo entre Gantt e Lista.

Sem mudanças no schema; tudo é frontend, usando `phase_id` e `project_phases` que já existem.
