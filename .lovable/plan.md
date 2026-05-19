
# Dashboard Executivo — Visão Geral do Sistema

Hoje o Dashboard cobre apenas Estudos, Tarefas, Visitas, Findings e Pacientes. Os demais módulos (Regulatório, Pagamentos, Riscos, Qualificações, Treinamentos, Change Control, Comitês, Comunicações, IPs, PMCF, Steering, Site Monitoring) não têm presença, o que enfraquece o papel do Dashboard como cockpit do CTMS.

A proposta abaixo o transforma em uma central única, mantendo a barra de filtros atual (estudo + período) e o Health Score por estudo.

## Estrutura proposta da página

```text
[ Filtros: Estudo • Período • Limpar ]

[ Linha Hero — Health Score por estudo ]
  Cards com semáforo (verde/amarelo/vermelho) por projeto:
  protocolo • status • % conclusão cronograma • # alertas críticos • próxima visita

[ Alertas críticos ] (já existe — manter)

[ KPIs principais — 4 colunas x 2 linhas, agrupados ]
  Operação     | Regulatório | Financeiro  | Risco/Qualidade
  -------------|-------------|-------------|----------------
  Tarefas      | Submissões  | Orçamento   | Riscos altos
  Visitas      | Pendências  | Pago/Previsto| Findings críticos
  Pacientes    | Próx. prazo | Atrasados   | CAPAs abertos
  Treinamentos | Reports due | Forecast    | Change controls

[ Linha de gráficos ]
  - Funil de pacientes (Screened → Randomized → Completed)
  - Burndown de tarefas (planejadas vs concluídas no período)
  - Aging de Findings (já existe)
  - Conclusão de checklist por site (já existe)

[ Próximas ações (14 dias) ]  [ Decisões Steering recentes ]
  tarefas + visitas + submissões + pagamentos + reports
```

## KPIs por área (novos)

**Operacional**
- Estudos ativos, em setup, encerrados
- Sites ativos / total, sites com qualificação pendente
- Pacientes: screened, randomizados, ativos, drop-out rate
- Treinamentos vencidos / próximos 30 d

**Regulatório**
- Submissões abertas por status (Submitted / Approved / Pending)
- Próximas datas regulatórias (≤ 30 d)
- Reports periódicos em atraso

**Financeiro (Payments + Budget)**
- Orçamento total vs realizado (% executado)
- Pagamentos pendentes (R$ e quantidade)
- Pagamentos atrasados
- Previsão dos próximos 30/90 d

**Risco & Qualidade**
- Riscos por nível (Low/Med/High/Critical) — usar score já existente
- Findings abertos por severidade e aging (já existe)
- Change Controls em andamento
- Decisões de Steering Committee pendentes
- IP: lotes vencendo ≤ 60 d

**Comunicações**
- Notificações não lidas críticas (do hook `useNotifications`)
- Stakeholders com pendência de contato

## Health Score do estudo

Card no topo por projeto, com cor determinada por regra simples:
- vermelho: ≥ 1 finding crítico aberto, ou ≥ 1 visita atrasada > 7 d, ou pagamento atrasado > 30 d
- amarelo: tarefas atrasadas > 0, riscos altos abertos, ou submissão regulatória em atraso
- verde: nenhum dos anteriores

Métricas exibidas: protocolo, % cronograma concluído, próxima visita, # alertas.

## Personalização leve

- Manter filtro global (estudo + período).
- Adicionar toggle "Minhas pendências" usando `auth.uid()` para filtrar por owner.
- Cada card de KPI vira link clicável para o módulo correspondente, já filtrado pelo estudo selecionado.

## Detalhes técnicos

- Reaproveitar `src/components/shared/KpiCards.tsx` para a grade de KPIs (já existe e segue o design system).
- Reaproveitar `StatCard` para o hero de Health Score.
- Adicionar queries em `loadDashboardData()`:
  - `regulatory_submissions`, `regulatory_reports`
  - `payments` (somar `amount`, comparar com `due_date` e `paid_at` usando `parseLocalDate`/`formatInBrasilia` conforme tipo do campo)
  - `study_risks` (já tem score), `change_controls`, `committees`/`steering_decisions`
  - `trainings`, `qualifications`, `investigational_product_lots`
  - `notifications` (criticidade e dismissed)
- Todas as queries devem respeitar o filtro de `selectedProject` (já implementado para tarefas/visitas/pacientes).
- Datas: usar exclusivamente `src/lib/dateUtils` — `parseLocalDate` para date-only, `formatInBrasilia` para timestamptz, formato `dd/MM/yyyy`.
- Performance: agrupar queries num único `Promise.all`; aplicar `count: 'exact', head: true` quando só precisar de contagem.
- Roles: respeitar `usePermission` — esconder cards de módulos sem permissão de leitura.
- Mobile: KPIs em 2 colunas; Health Score em coluna única; gráficos em `recharts` responsivos.

## Critério de aceite

- Dashboard exibe pelo menos 1 KPI de cada módulo ativo do CTMS.
- Health Score por estudo no topo com cor coerente com regras acima.
- Cards de KPI navegam para o módulo correspondente com o estudo já filtrado.
- Filtros existentes continuam funcionando para todos os novos blocos.
- Sem regressões: alertas, aging de findings e checklist por site continuam exibidos.

## Escopo opcional (fase 2)

- Salvar layout/cards favoritos por usuário (`user_dashboard_preferences`).
- Exportar snapshot do dashboard em PDF.
- Tendências (variação % vs período anterior) nos KPIs principais.
