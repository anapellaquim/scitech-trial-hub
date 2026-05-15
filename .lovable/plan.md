# Forçar fuso horário de Brasília (America/Sao_Paulo)

## Objetivo
Garantir que toda data/hora exibida e persistida pelo app respeite **America/Sao_Paulo**, independentemente do fuso do navegador do usuário. Formato continua MM/dd/yyyy.

## Abordagem

1. **Adicionar `date-fns-tz`** como dependência (já usamos `date-fns`).
2. **Estender `src/lib/dateUtils.ts`** com helpers centrais:
   - `formatInBrasilia(date, pattern)` — usa `formatInTimeZone` para qualquer timestamp.
   - `nowInBrasilia()` — Date "agora" deslocada para o fuso de Brasília.
   - `todayDateOnlyBrasilia()` — substitui `todayDateOnly` para datas-only baseadas em hoje (ex.: defaults de inputs).
   - Atualizar `parseLocalDate` / `formatDateOnly` para usar componentes de Brasília quando a entrada for um `Date` com hora (timestamp), preservando o comportamento atual para strings "YYYY-MM-DD".
3. **Substituir nos componentes** todas as ocorrências de:
   - `format(new Date(x), "...")` em campos `created_at`, `updated_at`, `signed_at`, `due_date`, auditoria, comunicações, visitas, pagamentos → `formatInBrasilia(x, "...")`.
   - `new Date().toISOString().split("T")[0]` e `new Date().toLocaleDateString()` → helpers do dateUtils.
   - Defaults de `<Input type="date">` que usam `new Date()` → `todayDateOnlyBrasilia()`.
4. **Auditoria de cobertura**: rodar `rg` para `new Date\(|toLocaleDateString|toISOString` em `src/**` e revisar caso a caso (componentes mais sensíveis: `AuditTrail`, `Communications`, `Payments`, `PatientManagement`, `VisitAgenda`, `SiteMonitoring`, `RegulatoryReports`, dialogs com assinatura eletrônica).
5. **Banco**: timestamps continuam em UTC (`timestamptz`) — conversão é só na UI. Não há migração SQL.
6. **Memory**: atualizar `mem://index.md` com regra core "All dates rendered/serialized in America/Sao_Paulo via dateUtils helpers; never use raw `new Date()`/`toLocaleDateString` for display."

## Detalhes técnicos

- `formatInTimeZone(value, "America/Sao_Paulo", "MM/dd/yyyy HH:mm")` é a chamada base.
- Para campos date-only (`YYYY-MM-DD` no Postgres) o comportamento atual já está correto via `parseLocalDate`; o risco está nos `timestamptz` exibidos sem fuso.
- Edge function `generate-alerts` permanece em UTC para comparações internas; só formata em Brasília se enviar texto ao usuário.

## Critérios de aceite

- Usuário em qualquer fuso vê data/hora idêntica a um usuário em São Paulo.
- Defaults de inputs `type="date"` refletem a data corrente em Brasília.
- Nenhuma regressão em datas-only existentes (enrollment, target days, etc.).
