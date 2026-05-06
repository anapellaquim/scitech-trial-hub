## Correção do erro de navegação na Agenda de Visitas

### Problema
Em `src/pages/VisitReport.tsx`, dois pontos navegam para `/visit-agenda`, mas a rota registrada em `App.tsx` é `/agenda`. Isso gera 404 ao salvar relatório ou clicar em voltar.

### Alteração
Arquivo: `src/pages/VisitReport.tsx`
- Linha ~113: `navigate("/visit-agenda")` → `navigate("/agenda")`
- Linha ~276: `navigate("/visit-agenda")` → `navigate("/agenda")`

### Validação
- Acessar um relatório de visita, clicar em "Voltar" e em "Salvar" para confirmar que retorna corretamente para `/agenda` sem 404.
