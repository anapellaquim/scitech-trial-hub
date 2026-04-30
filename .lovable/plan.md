# Correção: Não consigo criar novos riscos

## Causa raiz

A página `Risk Management` está em **loop infinito de re-renders**. Os logs de rede mostram dezenas de requisições `GET /risks` em menos de 2 segundos, e o session replay registra a tela alternando continuamente entre "Loading..." e "No risks found.". Esse loop trava o estado do dialog "New Risk" — quando você clica em "Create", o componente é remontado antes do `INSERT` concluir, ou o toast some sem efeito.

A origem é o `useEffect` da página:

```ts
useEffect(() => {
  if (selectedProject) { setProjectId(selectedProject); loadData(); }
}, [selectedProject, loadData, setProjectId]);
```

A função `setProjectId` vem do hook `usePersistedFilters`, onde é redefinida a cada render (não está memoizada). Isso dispara o efeito a cada render → novo fetch → novo render → e assim por diante.

Não há nenhum `POST /risks` nos logs, confirmando que a tentativa de salvar nunca chega ao servidor.

## Correção

Remover `loadData` e `setProjectId` das dependências do `useEffect` em `src/pages/RiskManagement.tsx`, mantendo apenas `selectedProject`. Esse é exatamente o padrão usado em outras páginas do projeto (ex.: o original já não tinha `setProjectId` na lista).

```ts
useEffect(() => {
  if (selectedProject) { setProjectId(selectedProject); loadData(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedProject]);
```

## Validação adicional

Também vou:

1. Confirmar com `supabase--read_query` que a tabela `risks` aceita um INSERT mínimo com os novos campos (especialmente `review_frequency NOT NULL DEFAULT 'quarterly'` e o `residual_risk_score` gerado).
2. Revisar a função `handleSave` para garantir que o estado do dialog seja limpo apenas após sucesso, evitando que validações erradas pareçam silenciosas.

Nenhuma alteração de schema é necessária — a migração anterior já está correta. O bug é puramente de React (efeito em loop).

## Arquivos a alterar

- `src/pages/RiskManagement.tsx` — corrigir dependências do `useEffect`.
