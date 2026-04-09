
# Fix Hardcoded Portuguese Text to Use English i18n

## Overview
Both `ParticipantFormViewer.tsx` and `SiteAccessDialog.tsx` contain hardcoded Portuguese text that should be replaced with i18n translation keys using English as the primary language.

## Changes Required

### 1. Update `src/components/edc/ParticipantFormViewer.tsx`

Add `useTranslation` import and replace all hardcoded Portuguese strings:

| Line | Current (Portuguese) | Translation Key |
|------|---------------------|-----------------|
| 225 | "Completo" | `t("edc:status.completed")` |
| 226 | "Em Andamento" | `t("edc:status.in_progress")` |
| 227 | "Rascunho" | `t("edc:status.draft")` |
| 276 | "Adicionar query" | `t("edc:queries.createQuery")` |
| 281 | "aberta(s)" | `t("edc:formViewer.openCount")` |
| 284 | "respondida(s)" | `t("edc:formViewer.answeredCount")` |
| 287 | "fechada(s)" | `t("edc:formViewer.closedCount")` |
| 290 | "Queries:" | `t("edc:queries.title")` |
| 318 | "Nenhum formulário encontrado nesta categoria" | `t("edc:participantForms.noForms")` |
| 352-353 | "Assinado" | `t("edc:status.signed")` |
| 450 | "Criado em" | `t("edc:formViewer.createdAt")` |
| 455 | "Somente Leitura" | `t("edc:formViewer.readOnly")` |
| 466 | "Editar" | `t("common:actions.edit")` |
| 475 | "Visualizar" | `t("common:actions.view")` |

### 2. Update `src/components/admin/SiteAccessDialog.tsx`

Replace all hardcoded Portuguese strings:

| Line | Current (Portuguese) | Translation Key |
|------|---------------------|-----------------|
| 98 | "Site não encontrado" | `t("siteAccess.siteNotFound")` |
| 100 | "Todos os projetos" | `t("siteAccess.allProjects")` |
| 109 | "Não foi possível carregar os dados de acesso" | `t("siteAccess.loadError")` |
| 125-126 | "Selecione um site" | `t("siteAccess.selectSiteError")` |
| 139 | "Acesso já existe" / "O usuário já possui acesso a este site" | `t("siteAccess.accessExists")` |
| 159-160 | "Acesso adicionado" | `t("siteAccess.accessAdded")` |
| 176 | "Não foi possível adicionar o acesso" | `t("siteAccess.addError")` |
| 193-194 | "Acesso removido" | `t("siteAccess.accessRemoved")` |
| 203 | "Não foi possível remover o acesso" | `t("siteAccess.removeError")` |
| 219 | "Gerenciar Acesso a Sites" | `t("siteAccess.title")` |
| 222 | "Configurar acesso de..." | `t("siteAccess.description")` |
| 229 | "Adicionar Novo Acesso" | `t("siteAccess.addNew")` |
| 233 | "Projeto (opcional)" | `t("siteAccess.projectOptional")` |
| 236 | "Todos os projetos" | `t("siteAccess.allProjects")` |
| 250 | "Site *" | `t("siteAccess.siteRequired")` |
| 253 | "Selecionar site" | `t("siteAccess.selectSite")` |
| 274 | "Acesso temporário" | `t("siteAccess.temporaryAccess")` |
| 294 | "Adicionar Acesso" | `t("siteAccess.addAccess")` |
| 300 | "Acessos Atuais" | `t("siteAccess.currentAccess")` |
| 304 | "Carregando..." | `t("common:loading")` |
| 309 | "Nenhum acesso a sites configurado" | `t("siteAccess.noAccess")` |
| 316 | "Site" | `t("siteAccess.site")` |
| 317 | "Projeto" | `t("siteAccess.project")` |
| 318 | "Expiração" | `t("siteAccess.expiration")` |
| 333 | "Global" | `t("siteAccess.global")` |
| 342 | "Expirado" | `t("siteAccess.expired")` |
| 351 | "Permanente" | `t("siteAccess.permanent")` |
| 374 | "Fechar" | `t("common:actions.close")` |

### 3. Add New Translation Keys

**`src/i18n/locales/en/edc.json`** - Add new keys under `formViewer`:
```json
"formViewer": {
  "createdAt": "Created at",
  "readOnly": "Read Only",
  "openCount": "open",
  "answeredCount": "answered",
  "closedCount": "closed"
}
```

**`src/i18n/locales/en/admin.json`** - Add new `siteAccess` section:
```json
"siteAccess": {
  "title": "Manage Site Access",
  "description": "Configure site access for",
  "addNew": "Add New Access",
  "projectOptional": "Project (optional)",
  "allProjects": "All projects",
  "siteRequired": "Site *",
  "selectSite": "Select site",
  "temporaryAccess": "Temporary access",
  "addAccess": "Add Access",
  "currentAccess": "Current Access",
  "noAccess": "No site access configured",
  "site": "Site",
  "project": "Project",
  "expiration": "Expiration",
  "global": "Global",
  "expired": "Expired",
  "permanent": "Permanent",
  "siteNotFound": "Site not found",
  "loadError": "Failed to load access data",
  "selectSiteError": "Select a site",
  "accessExists": "Access already exists",
  "accessExistsDesc": "User already has access to this site",
  "accessAdded": "Access added",
  "accessAddedDesc": "Site access granted successfully",
  "addError": "Failed to add access",
  "accessRemoved": "Access removed",
  "accessRemovedDesc": "Site access revoked successfully",
  "removeError": "Failed to remove access"
}
```

**`src/i18n/locales/en/common.json`** - Add common action keys if not present:
```json
"actions": {
  "edit": "Edit",
  "view": "View",
  "close": "Close"
}
```

### 4. Add Portuguese Translations

**`src/i18n/locales/pt-BR/edc.json`** - Add same structure with Portuguese values.

**`src/i18n/locales/pt-BR/admin.json`** - Add same structure with Portuguese values.

## Files to Modify

| File | Action |
|------|--------|
| `src/components/edc/ParticipantFormViewer.tsx` | Replace hardcoded text with i18n |
| `src/components/admin/SiteAccessDialog.tsx` | Replace hardcoded text with i18n |
| `src/i18n/locales/en/edc.json` | Add formViewer keys |
| `src/i18n/locales/en/admin.json` | Add siteAccess section |
| `src/i18n/locales/en/common.json` | Add actions keys |
| `src/i18n/locales/pt-BR/edc.json` | Add Portuguese translations |
| `src/i18n/locales/pt-BR/admin.json` | Add Portuguese translations |
| `src/i18n/locales/pt-BR/common.json` | Add Portuguese translations |

## Implementation Order

1. Update translation JSON files (en + pt-BR)
2. Update `ParticipantFormViewer.tsx` with useTranslation hook
3. Update `SiteAccessDialog.tsx` with proper translation keys
