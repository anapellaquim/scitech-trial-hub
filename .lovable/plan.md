## Problema

Os filtros do card "Monitoring Visits" (Search, Site, Type, Status) só estão sendo aplicados às abas **All**, **Planned** e **Completed**. As abas **Oversight** e **Notes** ignoram completamente os filtros — elas iteram sobre `findings` e `notes` brutos, e os contadores (`Oversight (N)`, `Notes (N)`) mostram o total geral.

Além disso, os KPIs do topo (Pending Items, eCRF Queries, Protocol Deviations, AE Deviations, Critical Open, Avg Days to Due) também usam `findings` bruto, então não respeitam o filtro por site/visita.

## Solução proposta

Fazer com que **todos os filtros** (Search, Site, Type, Status) restrinjam de forma consistente todo o conteúdo do módulo — visitas, oversight items, notes e KPIs.

### Mudanças em `src/pages/SiteMonitoring.tsx`

1. **Derivar listas filtradas de oversight e notes** a partir das visitas filtradas:
   ```ts
   const filteredVisitIds = new Set(filtered.map(v => v.id));
   const filteredFindings = useMemo(
     () => findings.filter(f => filteredVisitIds.has(f.monitoring_visit_id)),
     [findings, filtered]
   );
   const filteredNotes = useMemo(
     () => notes.filter(n => filteredVisitIds.has(n.monitoring_visit_id)),
     [notes, filtered]
   );
   ```

2. **Atualizar contadores das abas**:
   - `Oversight ({findings.length})` → `Oversight ({filteredFindings.length})`
   - `Notes ({notes.length})` → `Notes ({filteredNotes.length})`

3. **Atualizar tabelas das abas Oversight e Notes** para iterar sobre `filteredFindings` / `filteredNotes` em vez de `findings` / `notes`.

4. **Atualizar os KPIs do topo** (Pending Items, eCRF Queries, Protocol Deviations, AE Deviations, Critical Open, Avg Days to Due) para serem calculados a partir de `filteredFindings`, garantindo coerência com os filtros aplicados.

5. **Mensagens de empty state**: Quando os filtros estiverem ativos e não houver resultado, manter a mensagem atual ("No oversight items recorded yet." / "No monitor notes recorded yet.") — opcionalmente trocar para "No oversight items match the current filters." quando há filtro ativo. (Decisão menor; mantenho a mensagem atual a menos que você prefira outra.)

### Fora de escopo

- Não alteramos os filtros em si (continuam Search, Site, Type, Status).
- Não alteramos schema do banco nem edge functions.
- Não tocamos em outras páginas.

## Resultado esperado

Selecionar um site (ou outro filtro) passa a restringir simultaneamente: visitas, oversight items, notes e KPIs do topo, mantendo coerência total entre as 5 abas.