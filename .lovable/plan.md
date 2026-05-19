## Goal

Eliminar bugs reais e padronizar Import/Export do sistema, garantindo que **o template baixado, o arquivo exportado e a tabela visível na tela** representem o mesmo conjunto de colunas em cada painel.

---

## 1. Correções de bugs reais

- **VisitAgenda — chave duplicada no console**
  Trocar `key={visit.id}` por `key={`${visit.source}-${visit.id}`}` nos loops dos modos calendário e lista (linhas ~738, 792, 851). A lista combina `study_visits` + `site_monitoring_visits` e ocasionalmente colide IDs.

- **RiskManagement — limpeza pós-remoção da aba KPIs/KRIs**
  Conferir e remover qualquer referência residual a `RiskIndicatorsTab` / `indicators` no arquivo.

---

## 2. Upgrade do componente `BulkImportDialog`

Tornar o componente mais robusto e didático para o usuário final:

- **Tipagem de coluna** estendida: `type?: "text" | "number" | "integer" | "date" | "boolean" | "enum"`, `enumValues?: string[]`, `example?: string`.
- **Parsing automático**:
  - `date` aceita `dd/MM/yyyy` (formato BR) e converte para `yyyy-MM-dd` (Postgres) usando `parseBrazilDate` de `@/lib/dateUtils`.
  - `number`/`integer` faz `parseFloat`/`parseInt` com fallback para `null`.
  - `boolean` aceita "Sim/Não", "Yes/No", "true/false", "1/0".
  - `enum` valida contra `enumValues` e gera erro com lista permitida.
- **Validação pré-importação** com contagem de erros por tipo e linha.
- **Template enriquecido**:
  - Linha 1: cabeçalhos.
  - Linha 2: exemplo preenchido (`example` por coluna).
  - Aba secundária "Instructions" com tipo esperado, obrigatório/opcional e valores válidos para enums.
  - `sheetName` derivado do `tableName` (ex.: "Trainings" em vez de "Data").
- **Botão "Download Template"** segue funcionando sem `templateData`/`templateSheets` (gera automaticamente a partir do `columns`).
- API mantém compatibilidade retroativa: páginas atuais continuam funcionando enquanto migramos.

---

## 3. Upgrade do `ExcelExportButton`

- Aceitar `sheetName` opcional já existe; passar nomes específicos por página.
- Garantir que o `data` chegue **na ordem das colunas da tabela visível** (não da ordem alfabética do objeto). Isso será resolvido reescrevendo cada `exportData` para usar objetos com chaves na ordem correta — JS preserva ordem de inserção.

---

## 4. Padronização página a página

Para cada página com Import e/ou Export, alinhar **template ↔ export ↔ tabela**. Campos calculados/derivados (score automático, contagens, status agregado, chave estrangeira não-editável) ficam **apenas** na tabela e no export, **nunca** no template de import.

### Páginas a ajustar

| Página | Ação |
|---|---|
| **Trainings** | Template e export reduzidos ao conjunto exibido (Title, Type, Required, Planned Date, Due Date, Status, Instructor, Duration). Description vira coluna opcional visível. |
| **Committees** | Template ganha "Location"; export ganha "Attendees" como contagem. Página tem 3 abas (Meetings, Submissions, Cohorts) — cada uma com seu Import/Export próprio. |
| **SteeringDecisions** | Hoje o template só cobre `decisions`. Adicionar segundo template para `meetings` e trocar dinamicamente com `activeTab`. |
| **Qualifications** | Remover "Documents URL" e "Notes" do template (não exibidos) OU adicioná-los à tabela. Decisão: remover do template (manter tabela enxuta). |
| **ChangeControl** | OK na tabela principal; garantir que `exportData` siga a ordem das colunas. |
| **RiskManagement** | Template enxuto: manter só campos editáveis principais (Code, Description, Category, Probability, Impact, Responsible, Status, Identified At, Next Review). Demais (Mitigation, Contingency, Monitoring, Escalation) ficam em modo "avançado" — opcional na 2ª aba de template. |
| **Regulatory** | Página tem submissions + reports — verificar se há dois Import/Export distintos; se não, adicionar. |
| **Communications** | Hoje export único de notifications. Adicionar Export específico por aba (Plans / Stakeholders / Occurrences já possuem ExcelExportButton internos em `StakeholderList` e `CommunicationPlanList`; conferir consistência). |
| **InvestigationalProducts** | Já tem 2 Import + 2 Export (products e supply). Conferir alinhamento de colunas em cada par. |
| **PMCFSurvey, SiteMonitoring** | Só têm Export. Garantir que `exportData` reflita exatamente as colunas da tabela visível. |

---

## 5. Critério de aceite

- Console limpo na VisitAgenda (sem warning de keys).
- Em cada página com Import: baixar template, preencher, importar — sem erros de tipo.
- Em cada página com Export: o arquivo gerado tem as mesmas colunas (mesma ordem e mesmos nomes) que a tabela exibida na tela.
- Mesma página com múltiplas abas/tabelas: cada aba expõe seu próprio par Import/Export quando aplicável.

---

## Detalhes técnicos

- Sem mudanças de schema do banco — apenas frontend.
- `BulkImportDialog` mantém a assinatura atual (props existentes continuam funcionando); novos props são opcionais.
- `parseBrazilDate` (já em `src/lib/dateUtils`) será o único conversor de datas no import.
- Não criar novos componentes globais além de helpers internos ao `BulkImportDialog`.

---

## Entrega

Por ser um conjunto grande de edições (10+ arquivos), entrego em **3 commits lógicos**:

1. Bugs reais (VisitAgenda + RiskManagement residual).
2. Upgrade do `BulkImportDialog` (com retrocompatibilidade) + ajuste do `ExcelExportButton`.
3. Padronização página a página de Import/Export.

Ao final, faço um checklist marcando cada página validada.
