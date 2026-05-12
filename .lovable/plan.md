## Objetivo

Tornar o fluxo de envio de blocos resiliente a falhas inesperadas, evitando blocos "pendurados" em `sending`, e melhorar a confiabilidade do envio HTTP e do carregamento da lista.

## Mudanças

### 1. `src/components/BatchesSection.tsx` — `handleSendBatch`

Envolver o envio em `try/catch/finally`:

- `try`: lógica atual (verificação de limite, `updateBatch(sending)`, `sendToWebhook`, sucesso/erro tratados).
- `catch (e)`: marcar bloco como erro e registrar no histórico.
  - `await updateBatch(batch.id, { status: 'error' })`
  - `await addHistoryItem({ block_number, contacts_count, status: 'error', error_message: e?.message ?? 'Erro inesperado' })`
  - Toast destrutivo informando falha inesperada.
- `finally`: continuar limpando `sendingBatchIds` (já existe).

Isso garante que qualquer exceção entre `updateBatch(sending)` e o desfecho deixe o bloco em estado consistente (`error`), e não `sending`.

### 2. `src/utils/webhook.ts` — `sendToWebhook`

- Adicionar `AbortController` com timeout de 30s na primeira tentativa (`fetch` com CORS). Em timeout, retornar `{ success: false, error: 'Timeout: webhook não respondeu em 30s' }`.
- Remover o tratamento que assume sucesso no fallback `no-cors`. Em vez disso, retornar `{ success: false, error: 'Resposta opaca (no-cors): não foi possível confirmar entrega. Configure CORS no n8n.' }` — tratado como incerto/falha para não marcar como `sent` indevidamente.
- Limpar timeout no `finally` da requisição.

### 3. `src/hooks/useBatches.tsx` — `fetchBatches`

- Em caso de falha, em vez de manter o array atual em memória silenciosamente, refazer o fetch com backoff exponencial (ex.: 1s, 2s, 4s, máx. 3 tentativas).
- Após esgotar tentativas, exibir toast de erro mas manter `loading=false`.
- A subscription realtime continua sendo a fonte de verdade incremental; o reload com backoff garante reconciliação inicial.

### 4. Recovery passivo de blocos `sending` órfãos

Ao montar `BatchesSection` (ou dentro de `useBatches` após o fetch inicial):

- Para cada batch com `status === 'sending'`, comparar `created_at`/`updated_at` (ou um novo campo `sending_started_at`) com `Date.now()`.
- Se passou mais de **X minutos** (sugestão: 5 min) sem confirmação, sobrescrever local para `error` e disparar `updateBatch(id, { status: 'error' })` no banco, com nota no histórico ("Envio interrompido: timeout de confirmação").
- Como hoje não há campo dedicado para "início do envio", usar `updated_at` do registro como referência. Se `updated_at` não estiver disponível no select, ampliar o `select('*')` (já é o caso em `fetchBatches`) e expor no tipo `BatchInfo`.

```text
Fluxo de recovery
─────────────────
mount → fetchBatches → para cada b em batches:
  if b.status === 'sending' && now - b.updated_at > 5min:
     updateBatch(b.id, { status: 'error' })
     addHistoryItem({status: 'error', error_message: 'Envio interrompido'})
```

## Notas técnicas

- Não há mudanças de schema obrigatórias. Opcionalmente, podemos adicionar `sending_started_at timestamptz` em `batches` para precisão maior do recovery; sem isso, usamos `updated_at`.
- Sem mudanças em edge functions.
- Sem mudanças em RLS.

## Fora de escopo

- Retentativas automáticas de envio bem-sucedido parcial.
- Reaproveitamento do mesmo bloco após erro (mantém fluxo manual atual).  
  
**Adendos ao plano (ajustes obrigatórios antes de implementar)**
  **1. Sobre o item 4 — coluna de referência do recovery**
  A tabela `public.batches` **não possui** `updated_at` (verificado em `information_schema.columns`). Portanto, NÃO use `updated_at` como referência do recovery.
  Em vez disso, inclua nesta mesma entrega:
  - Uma migração SQL que adicione a coluna `sending_started_at timestamptz null` à tabela `public.batches` (sem default, sem trigger).
  - Atualização em `src/hooks/useBatches.tsx` → `updateBatch`: quando `updates.status === 'sending'`, gravar também `sending_started_at = new Date().toISOString()`. Quando `updates.status` for `'sent'`, `'error'` ou `'ready'`, gravar `sending_started_at = null`.
  - Expor `sending_started_at` no tipo `BatchInfo` e no mapeamento de `data` para `BatchInfo` no fetch e na subscription realtime.
  - O recovery passivo deve usar `sending_started_at` (não `created_at`, não `updated_at`) como referência de "há quanto tempo está em sending".
  - Janela de tolerância definida como constante no topo de `src/components/BatchesSection.tsx`:
  ts
  ```ts
    const SENDING_TIMEOUT_MIN = 10;
  ```
  Comece com 10 minutos (não 5) para evitar falso-positivo em webhooks que demoram a confirmar.
  - Mensagem do histórico ao recovery: `"Envio interrompido: sem confirmação após ${SENDING_TIMEOUT_MIN} minutos"`.
  **2. Sobre o item 2 — escopo limitado para o webhook**
  Nesta iteração, implemente APENAS:
  - `AbortController` com timeout de 30s na primeira tentativa (fetch com CORS).
  - Limpeza do timeout no `finally`.
  - Retorno `{ success: false, error: 'Timeout: webhook não respondeu em 30s' }` em caso de abort.
  **NÃO altere** o comportamento atual do fallback `mode: 'no-cors'` que hoje assume sucesso. Mantenha intacto e adicione apenas um comentário marcador onde está esse bloco:
  ts
  ```ts
  // TODO(cors): retornar { success:false, error:'Resposta opaca (no-cors)...' }
  // após confirmarmos que o webhook n8n responde com Access-Control-Allow-Origin
  ```
  Motivo: hoje há usuários cujo webhook n8n responde sem headers CORS e estão funcionando via essa "suposição de sucesso". Mudar agora geraria falsos `error` em produção. Faremos essa mudança em uma segunda iteração, após habilitarmos CORS no n8n.
  **3. Sobre o item 3 — backoff e estado de erro do** `useBatches`
  Ajustes:
  - Backoff exponencial com **500ms, 1500ms, 3000ms** (3 tentativas), não 1s/2s/4s.
  - Em falha definitiva após as 3 tentativas: **NÃO preserve** o array `batches` anterior. Esvazie para `[]` e exponha um novo estado `fetchError: string | null` no retorno do hook.
  - Em `BatchesSection.tsx`, quando `fetchError` estiver presente e `batches.length === 0`, renderize um bloco de erro com texto curto e um botão **"Tentar novamente"** que chama uma função `refetch()` exposta pelo hook (que reexecuta `fetchBatches` com o mesmo backoff).
  - Mantenha `loading=false` após o erro definitivo, para a UI sair do skeleton.
  Justificativa: preservar o array anterior em memória foi exatamente o que causou o badge fantasma "Enviando..." que motivou esta correção.
  **4. Garantias gerais (não alterar)**
  - **Não tocar** em RLS, policies, edge functions ou triggers além da migração de `sending_started_at` descrita no item 1.
  - **Não criar** nenhuma outra coluna além de `sending_started_at`.
  - **Não alterar** a estrutura do payload enviado ao webhook (`WebhookPayload`).
  - **Não modificar** `ImportSection.tsx` nem o parser/IndexedDB — o fluxo de upload local está correto.
  - Manter os toasts existentes; apenas adicionar os novos casos (recovery, timeout do webhook, fetchError).
  **5. Saída esperada**
  Após implementar, retornar:
  - Lista de arquivos alterados.
  - Conteúdo da migração SQL (para eu revisar manualmente antes de aplicar em produção).
  - Confirmação explícita de que NÃO houve alteração em RLS, edge functions ou em qualquer outro arquivo fora do escopo acima.