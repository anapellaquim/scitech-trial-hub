## Melhorar a visualização do Gantt

Hoje o Gantt sempre renderiza **todos os dias** entre o início e o fim do projeto, com cabeçalho fixo de "mês + dia". Em projetos longos isso gera milhares de células estreitas (4–8 px no zoom Anual/Semestral) — os dias somem, os meses ficam ilegíveis e a barra horizontal não cabe na tela.

### O que vamos mudar (`src/components/schedule/GanttChart.tsx`)

1. **Escala de tempo adaptativa por zoom**
   Em vez de sempre mostrar dias, a unidade do cabeçalho/grade muda conforme o zoom:
   - `xxxs` (Anual) → unidade = **trimestre**, agrupador = **ano**
   - `xxs` (Semestral) → unidade = **mês**, agrupador = **ano**
   - `xs` (Trimestral) → unidade = **semana**, agrupador = **mês**
   - `sm` / `md` / `lg` / `xl` → unidade = **dia**, agrupador = **mês** (comportamento atual)

   Isso elimina a renderização de milhares de células finas e mantém o cabeçalho sempre legível, qualquer que seja a duração do projeto.

2. **Botão "Ajustar à tela" (Fit)**
   Novo botão ao lado do zoom que calcula automaticamente o melhor `ZoomLevel` para que todo o período (ou a janela filtrada) caiba na largura disponível do container, sem rolagem horizontal.

3. **Coluna esquerda "Tarefa" colapsável + redimensionável**
   - Botão para colapsar a coluna fixa de 256 px para ~40 px (só ícone), liberando espaço para a timeline.
   - Largura padrão reduzida de `w-64` para `w-56` e respeita um state `taskColWidth`.

4. **Indicador de "hoje" sempre visível + auto-scroll**
   - Ao montar (e ao trocar período), rolar a timeline até a posição de hoje (ou até o início da primeira tarefa visível, se hoje estiver fora).
   - Linha vertical de "hoje" reforçada em todas as escalas.

5. **Marcadores de tarefa com largura mínima legível**
   - Garantir `width >= 6px` para a barra mesmo em escalas comprimidas, para tarefas curtas não desaparecerem em zoom Anual/Semestral.
   - Tooltip continua mostrando datas exatas.

6. **Rolagem horizontal melhorada**
   - Manter `ScrollArea` mas exibir a `ScrollBar` horizontal sempre visível (não só ao hover) e adicionar atalho **Shift + roda do mouse** para rolar a timeline.

7. **Pequenos ajustes de UX**
   - "Resetar zoom" passa a chamar "Ajustar à tela" (em vez de fixar em `md`).
   - Preset de período "Todo o projeto" passa a usar as datas de `project.start_date`/`end_date` quando existirem (fallback atual continua válido).

### Detalhes técnicos

- Refatorar o `useMemo` que gera `months`/`days` para retornar uma estrutura única `timeline = { groups: [...], units: [...] }` parametrizada pela escala atual; o restante do componente usa `units` para a grade e `groups` para o cabeçalho superior.
- `getTaskPosition` passa a calcular `left/width` em função de `unitWidth` e `unitDurationDays` (1, 7, 30 ou ~91), em vez de assumir 1 dia por célula.
- Novo hook interno `useFitZoom(containerRef, totalUnits)` que escolhe o maior `ZoomLevel` cujo `unitWidth * totalUnits` ≤ largura do container.
- Estado adicional: `taskColCollapsed: boolean`, `taskColWidth: number`.

### Fora do escopo

- Não altera lógica de dados, filtros de responsável, caminho crítico ou exportação.
- Não muda o schema do banco.
