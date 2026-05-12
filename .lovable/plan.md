# Findings → Oversight no Site Monitoring

Renomear a estrutura "Findings" do módulo Site Monitoring para "Oversight" e ampliá-la para servir como supervisão geral da visita, contabilizando pendências, queries de eCRF, desvios de protocolo e desvios de eventos adversos, com prazo de solução.

Escopo limitado a `site_monitoring_findings` / página `Site Monitoring`. NÃO afeta `visit_findings` (Visit Report), Dashboard nem Communications, que continuam usando seu próprio modelo.

## 1) Banco de dados (migração)

- Renomear tabela `site_monitoring_findings` → `site_monitoring_oversight`.
- Renomear coluna `monitoring_visit_id` mantida (já é correta).
- Padronizar `category` como uma das opções: `pending`, `ecrf_query`, `protocol_deviation`, `ae_deviation`, `other` (texto livre, validado por trigger leve — sem CHECK constraint imutável).
- Renomear políticas RLS e índices para refletir o novo nome.
- Atualizar `get_module_from_table()`: mapear `site_monitoring_oversight` → módulo `monitoring`.
- Permissions: nenhuma alteração — segue herdando a permissão de Site Monitoring.

## 2) UI — `src/pages/SiteMonitoring.tsx`

- Renomear todas as ocorrências visíveis de "Findings" → "Oversight" (aba, KPIs, dialog, tabela, exports, mensagens, ícones de ação).
- Substituir o input livre de **Category** por um `Select` com as 5 opções padronizadas (rótulos legíveis: "Pending Item", "eCRF Query", "Protocol Deviation", "AE Deviation", "Other").
- KPIs no topo (substituem Open/Critical Findings):
  - Pending Items (count category=pending, status open/in_progress)
  - eCRF Queries (count category=ecrf_query, open/in_progress)
  - Protocol Deviations (count category=protocol_deviation, open/in_progress)
  - AE Deviations (count category=ae_deviation, open/in_progress)
  - Critical Open (qualquer categoria, severity=critical)
  - Avg Days to Due (média de dias entre hoje e `due_date` para itens em aberto)
- Tabela de Oversight: adicionar coluna **Category** (badge colorida por tipo) e **Days Left** (calculado a partir de `due_date`).
- Coluna "Findings" da tabela de visitas vira "Oversight" e mostra contagem total + breakdown rápido por categoria (tooltip).
- Export: campo `Findings` → `Oversight`.

## 3) Edge Function — `supabase/functions/generate-alerts/index.ts`

- Atualizar referências a `site_monitoring_findings` → `site_monitoring_oversight` (4 ocorrências). Sem mudança de lógica.

## 4) Tipos TS

- `interface Finding` → `interface OversightItem` em `SiteMonitoring.tsx`.
- Após a migração ser aprovada, `src/integrations/supabase/types.ts` é regenerado automaticamente.

## Fora de escopo

- Não toca em `visit_findings`, `VisitReport.tsx`, `Dashboard.tsx`, módulos Communications.
- Não cria módulos novos para eCRF, desvios ou EAs — as contagens são manuais/derivadas da categoria.
