## Problema

A lista suspensa "Site" em "New monitoring visit" está vazia porque o módulo lê de `study_sites`, mas os centros são cadastrados no módulo Studies → Centros, que grava em `research_centers` — uma tabela diferente. Além disso, `site_monitoring_visits.site_id` tem foreign key para `study_sites(id)`, então não é possível simplesmente trocar a fonte de dados.

## Já feito agora

Espelhei os 5 centros existentes do projeto atual de `research_centers` para `study_sites` usando os mesmos UUIDs. **Recarregando a tela, o dropdown já vai mostrar HUPE-UERJ, Hospital Ana Nery, Afya Hospital Dia, Real Hospital Português e HC-UFMG.**

## O que ainda precisa ser implementado (próxima etapa, em build mode)

Para que **novos centros adicionados em Studies → Centros apareçam automaticamente** sem ação manual, alterar `src/pages/SiteMonitoring.tsx`:

1. Em `loadData`, ler do `research_centers` (mapeando `code` → `site_code`) em vez de `study_sites`.
2. Logo após carregar, comparar com `study_sites` e inserir (mirror) qualquer centro ainda não espelhado, usando o mesmo `id`. Isso mantém a FK `site_monitoring_visits.site_id → study_sites(id)` válida sem precisar de migration.
3. Nenhuma mudança visual além da que já foi feita (label "Site").

## Detalhe técnico

- O mirror é idempotente: só insere os IDs ausentes.
- Usa o `id` do `research_centers` como `id` do `study_sites`, garantindo unicidade e referência consistente.
- Alternativa "limpa" seria uma migration trocando a FK para `research_centers(id)` e descontinuando `study_sites`, mas exigiria também ajustar `study_visits`, `study_tasks` e o Dashboard. Fica como melhoria futura.

Aprove para eu aplicar a alteração no código.
