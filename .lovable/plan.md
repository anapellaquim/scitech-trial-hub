
## Objetivo

Expandir o módulo **Communications** para rastrear todas as comunicações obrigatórias de cada estudo. Hoje ele só agrega alertas automáticos dos demais módulos. Vamos adicionar um sub-módulo de **Plano de Comunicação** onde o usuário programa quem comunica, quem é comunicado, com que periodicidade e por qual canal — e o sistema gera automaticamente as ocorrências (instâncias) e seus alertas correspondentes.

## Modelo conceitual

```text
Estudo (project)
  └── Plano de Comunicação (communication_plans)        ← regra recorrente
        ├── Stakeholders Emissores (sender)             ← quem comunica
        ├── Stakeholders Destinatários (recipients)     ← quem é comunicado
        ├── Periodicidade (once / weekly / biweekly / monthly / quarterly / annual / on_event)
        ├── Canal (email / etmf / portal / meeting / letter / phone / other)
        └── Ocorrências (communication_occurrences)     ← instâncias programadas
              └── status (scheduled / sent / overdue / acknowledged)
```

Stakeholders são tipados (sponsor, ethics_committee, regulatory_authority, research_center, vendor, dsmb, steering_committee, investigator, internal_team, other), com nome livre e contato opcional.

## Mudanças no banco

Migrações novas (4 tabelas + enums):

1. **`communication_stakeholders`** — catálogo de stakeholders por estudo
   - `id`, `project_id`, `stakeholder_type` (enum), `name`, `contact_email`, `contact_phone`, `organization`, `notes`, timestamps
2. **`communication_plans`** — regras de comunicação recorrentes
   - `id`, `project_id`, `title`, `description`, `purpose` (ex.: "Relatório mensal de recrutamento")
   - `frequency` (enum: once, weekly, biweekly, monthly, quarterly, semiannual, annual, on_event)
   - `channel` (enum: email, etmf, portal, meeting, letter, phone, system, other)
   - `start_date`, `end_date`, `due_day_offset` (ex.: dia 5 do mês), `lead_time_days` (antecedência do alerta)
   - `sender_stakeholder_id`, `is_mandatory` (bool), `is_active` (bool)
   - `responsible_user_id`, timestamps, `created_by`
3. **`communication_plan_recipients`** — N:N plano↔stakeholders destinatários
   - `id`, `plan_id`, `stakeholder_id`, `role` (to / cc / bcc / informed)
4. **`communication_occurrences`** — ocorrências geradas a partir do plano
   - `id`, `plan_id`, `project_id`, `due_date`, `sent_date`, `status` (scheduled / sent / overdue / acknowledged / skipped)
   - `evidence_url` (link p/ documento eTMF), `notes`, `completed_by`, `completed_at`, timestamps

Todas com RLS `auth.role() = 'authenticated'` (padrão do projeto) e índices por `project_id` / `due_date` / `status`.

## Geração automática de ocorrências e alertas

- **Função SQL `generate_communication_occurrences(plan_id uuid)`** materializa as próximas ocorrências (janela rolante de 12 meses) conforme a periodicidade do plano.
- A edge function existente **`generate-alerts`** será estendida para varrer `communication_occurrences` com `due_date <= now() + lead_time_days` ou `status = 'overdue'` e criar `notifications` com novos `notification_type`:
  - `communication_due_soon` (warning)
  - `communication_overdue` (critical)
  - `communication_today` (warning)
- Trigger `BEFORE UPDATE` em `communication_occurrences`: marca `status = 'overdue'` quando `due_date < today` e ainda `scheduled`.

## Mudanças no frontend

### Novo sub-módulo dentro de `/communications` (Tabs no topo)

```text
Communications
 ├── Tab "Alerts"            (UI atual — já existe)
 ├── Tab "Communication Plan" (NOVO)
 └── Tab "Stakeholders"       (NOVO)
```

### Arquivos a criar

- `src/components/communications/CommunicationPlanList.tsx` — tabela de planos com filtro por estudo (GlobalStudySelector), busca, exportação Excel e bulk import.
- `src/components/communications/CommunicationPlanDialog.tsx` — formulário de criação/edição: título, propósito, emissor (select de stakeholders), destinatários (multi-select com role to/cc), canal, frequência, datas, lead time, obrigatoriedade, responsável.
- `src/components/communications/StakeholderList.tsx` — CRUD de stakeholders por estudo.
- `src/components/communications/StakeholderDialog.tsx` — form simples (tipo, nome, organização, contatos).
- `src/components/communications/CommunicationOccurrencesPanel.tsx` — calendário/tabela das próximas ocorrências do plano selecionado, com ações "Marcar como enviada", "Anexar evidência", "Pular".
- `src/hooks/useCommunicationPlans.ts` — fetch/CRUD de planos e ocorrências.

### Mudanças em arquivos existentes

- `src/pages/Communications.tsx`: envolver conteúdo atual em `<Tabs>` com 3 abas; manter Alerts como default.
- `supabase/functions/generate-alerts/index.ts`: adicionar bloco de scan de `communication_occurrences` gerando notifications.
- `src/integrations/supabase/types.ts`: regenerado automaticamente após migrações.

### UX padrão do projeto

- Reusa `GlobalStudySelector`, `ExcelExportButton`, `BulkImportDialog`, `ModulePageLayout` para os listings.
- Datas em formato `MM/dd/yyyy`, textos UI em English (US) — segue regras do projeto.
- Filtros persistidos via `usePersistedFilters` (canal, frequência, status, obrigatoriedade).

## Fluxo do usuário

1. Em `/communications`, abre a aba **Stakeholders** e cadastra (ou importa via Excel) os stakeholders do estudo (Sponsor X, CEP Y, Vendor Z…).
2. Vai em **Communication Plan** → "New Plan", define: "Monthly enrollment report", emissor = Coordinator, destinatários = Sponsor (to), Steering (cc), canal = email, frequência = monthly, dia 5, lead time 3 dias, obrigatório.
3. Sistema cria automaticamente as ocorrências mensais até `end_date` (ou 12 meses).
4. 3 dias antes de cada `due_date`, edge function `generate-alerts` cria notification em **Alerts** ("Monthly enrollment report due in 3 days").
5. Quando enviada, usuário marca a ocorrência como "Sent", anexa link da evidência (eTMF / e-mail).
6. Atrasos viram automaticamente `communication_overdue` (critical).

## Itens fora de escopo (deste plano)

- Envio real automático de e-mail (apenas registro/tracking; pode ser feito depois com Resend).
- Templates de mensagem reutilizáveis.
- Cron automático (continua o botão "Update Alerts" manual; podemos adicionar `pg_cron` em outro passo se desejado).
