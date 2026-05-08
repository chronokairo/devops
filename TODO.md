# TODO — Chronokairo DevOps

Status do pacote `packages/devops`. As páginas, APIs e o painel de configurações já estão funcionando; este arquivo lista o que ainda falta para sair do estágio "ferramenta operacional local" rumo a um produto multi-usuário em produção.

Legenda: 🔴 crítico · 🟡 importante · 🟢 melhoria · ✅ feito

---

## ✅ Implementado nesta rodada

- ✅ Endpoint **`GET /api/health`** ([api/health/route.ts](src/app/api/health/route.ts))
- ✅ Endpoint **`GET /api/metrics`** em formato Prometheus + store em memória ([api/metrics/route.ts](src/app/api/metrics/route.ts), [lib/metrics-store.ts](src/lib/metrics-store.ts))
- ✅ **Audit log** file-based `.audit.log` ([lib/audit-log.ts](src/lib/audit-log.ts)) + endpoint **`GET /api/audit`** ([api/audit/route.ts](src/app/api/audit/route.ts))
- ✅ Wiring de auditoria em **`/api/ssh/exec`** + métrica `ssh_exec_total{result}`
- ✅ Headers de segurança (CSP, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, Permissions-Policy) e `output: 'standalone'` em [next.config.ts](next.config.ts)
- ✅ **CI/CD trigger manual** (`workflow_dispatch`) — `POST /api/cicd/dispatch` + botão "▶ Run" na tela `/cicd`
- ✅ **CI/CD cancel run** — `POST /api/cicd/cancel` + botão "⊘ Cancel" por linha em runs `in_progress|queued`
- ✅ **Backup restore** — `POST /api/backup/restore` (proxy para `BACKUP_RESTORE_URL`) + botão funcional em `/backup`
- ✅ [README.md](README.md), [Dockerfile](Dockerfile) multi-stage com healthcheck, [.dockerignore](.dockerignore)

---

## 1. Segurança & Autenticação

- 🔴 **Não há autenticação alguma**. Qualquer pessoa com acesso à URL pode executar comandos SSH em qualquer servidor cadastrado. Adicionar login (NextAuth, Clerk, ou cookie + middleware próprio) e proteger todas as rotas `/api/ssh/*`, `/api/monitor`, `/api/networks/*`, `/api/config`.
- 🔴 **Chaves SSH (.pem) ficam em `localStorage`** do navegador em texto puro (`devops:manual-servers`). Mover para um cofre server-side (BD criptografado + chave de master no servidor) e nunca expor o conteúdo da chave para o browser depois de salva.
- 🔴 **Nenhuma autorização por servidor**. Qualquer usuário logado executaria comandos em todas as máquinas. Modelar `users`, `servers`, `permissions` (RBAC).
- ✅ **Audit log** básico implementado para SSH/CI-CD/Backup em `.audit.log` (file-based). Falta cobrir deploy, monitor, networks e adicionar `userId` quando houver auth.
- 🟡 **Rate limiting** em `/api/ssh/exec*`, `/api/networks/scan`, `/api/monitor/[id]/check`.
- ✅ **CSP / headers de segurança** configurados em [next.config.ts](next.config.ts) (CSP, X-Frame-Options DENY, Referrer-Policy, X-Content-Type-Options, Permissions-Policy).
- 🟡 **Validação de entrada com schema** (Zod) nas API routes — hoje usam `await req.json()` sem validar.
- 🟢 **Mascaramento de segredos nos logs**. Saída de `docker logs` ou `journalctl` pode vazar tokens. Filtro opcional por regex configurável.

## 2. Persistência

- 🔴 **Servidores e pipelines vivem em `localStorage`** ([servidores/page.tsx](src/app/servidores/page.tsx), [deploy/page.tsx](src/app/deploy/page.tsx)). Não há sincronização entre dispositivos nem backup. Migrar para BD (SQLite via Prisma é o caminho mais leve).
- 🔴 **Monitores HTTP em memória** ([http-monitor-store.ts](src/lib/http-monitor-store.ts)). Reiniciar o servidor apaga tudo. Persistir em BD e ter um worker de polling com `setInterval` ressuscitado no boot.
- 🔴 **Webhooks GitHub guardados em memória** ([api/webhooks/github/route.ts](src/app/api/webhooks/github/route.ts)) com cap de 200. Persistir em BD com paginação.
- 🟡 **Sessões SSH interativas** ([ssh-sessions.ts](src/lib/ssh-sessions.ts)) também são em-memória; OK por design (efêmero), mas precisa de TTL e cleanup quando o usuário fecha a aba.

## 3. Páginas — funcionalidades faltantes

### `/servidores`
- 🟡 Coluna "CPU / Memória / Disco / Uptime" mostra `—` mesmo com `PROMETHEUS_URL` definido — verificar wiring entre [api/servers/route.ts](src/app/api/servers/route.ts) e a tabela.
- 🟡 Sem teste de conectividade ao adicionar (TCP ping no IP/porta SSH antes de salvar).
- 🟢 Tags / agrupamento por ambiente (prod/staging/dev).
- 🟢 Importar servidores em lote (CSV / JSON).

### `/deploy`
- 🟡 Sem **rollback** (executar comando inverso ou apontar para release anterior).
- 🟡 Sem **agendamento** (cron) nem trigger por webhook GitHub.
- 🟡 Sem **aprovação** (deploy de produção exigir clique de outro usuário).
- 🟢 Variáveis de ambiente por pipeline.
- 🟢 Histórico de runs com diff entre execuções.

### `/docker`
- 🟡 **Sem ações em imagens** (pull, rmi, prune).
- 🟡 **Sem volumes nem networks** (apenas containers + images).
- 🟡 **Exec interativo** num container (`docker exec -it`) — só existe stream de logs.
- 🟢 Filtro por status (running/stopped/exited).

### `/kubernetes`
- 🟡 **Read-only**. Falta scale deployment, restart, delete pod, logs por pod.
- 🟡 Sem suporte a múltiplos clusters (só uma URL/token por instância).
- 🟢 Top de uso de CPU/memória dos nodes via `metrics.k8s.io`.

### `/cloud`
- 🟡 Depende de JSON externo. Adicionar coletores nativos opcionais (`@aws-sdk/client-ec2`, `@google-cloud/compute`, `@azure/arm-compute`) com credenciais por env.
- 🟡 Gráfico de custo por provedor / por tag.

### `/infra` (systemd)
- 🟡 `journalctl` por unit (botão "Ver logs do serviço") — atualmente só `systemctl status`.
- 🟢 Editar/criar unit files via SSH.

### `/monitoramento` (HTTP)
- 🔴 **Polling automático não persiste** (precisa de BD + worker; ver §2).
- 🟡 **Notificações** (email / Slack / Discord) quando um monitor cair.
- 🟡 Histórico de uptime + gráfico de latência (já existe `CheckResult[]` mas não é renderizado).
- 🟢 Suporte a método POST com body.

### `/observabilidade`
- 🟡 **Sem suporte a Loki** (log streaming via API HTTP). A var `LOKI_URL` existe mas não é usada na UI.
- 🟡 **Sem traces** (Tempo / Jaeger / OTLP).
- 🟡 **Painel de alertas Prometheus** mostra alerta bruto; falta agrupamento e silenciamento.
- 🟢 Painéis salvos (queries PromQL favoritas).

### `/redes`
- 🟢 Traceroute, MTR, whois.
- 🟢 Histórico de scans salvos.
- 🟢 Inventário remoto (`NETWORK_INVENTORY_URL`) é lido pela API mas não renderizado em nenhuma aba.

### `/cicd`
- ✅ **Trigger manual de workflow** (`workflow_dispatch`) — botão "▶ Run" + campo `ref` na aba Workflows.
- ✅ **Cancelar run em andamento** — botão "⊘ Cancel" em runs com status `in_progress|queued`.
- 🟢 Logs de step do run direto na UI.

### `/backup`
- 🟡 Apenas leitura de JSON. Sem execução de jobs nem agendamento.
- ✅ Botão "Restaurar" agora chama `POST /api/backup/restore` (proxy para `BACKUP_RESTORE_URL`).

### Dashboard `/`
- 🟢 Cards mostram apenas título e descrição. Voltar com indicadores reais (consumindo `/api/servers`, `/api/monitor`, etc.) em vez dos números fake removidos.

### `AppBar`
- 🟢 Botão **Notificações** não faz nada — implementar painel ou remover.
- 🟢 Avatar `N` não abre menu — implementar logout + perfil quando houver auth.

## 4. Tipagem e qualidade de código

- 🟡 [features/api/github.ts](src/features/api/github.ts) — arquivo gigante com múltiplos `@ts-ignore` e `Promise<any[]>`. Tipar com `Octokit` ou remover se não estiver sendo usado.
- 🟡 [views/](src/views/) e parte de [features/components/](src/features/components/) parecem legado de outro pacote (DocsPage, GitPage, BranchCompare, etc.) e não são linkadas pelo `app/`. Auditar e remover o que não for usado.
- 🟡 `entities/`, `widgets/` e `views/` praticamente não são consumidos pelo App Router atual — consolidar arquitetura.
- 🟡 Substituir `any` em [api/cicd/route.ts](src/app/api/cicd/route.ts), [api/deploy/route.ts](src/app/api/deploy/route.ts), [api/kubernetes/route.ts](src/app/api/kubernetes/route.ts), [api/observability/route.ts](src/app/api/observability/route.ts), [api/servers/route.ts](src/app/api/servers/route.ts) por interfaces ou `unknown` + narrowing.
- 🟢 Habilitar `eslint-plugin-no-explicit-any` em modo erro.

## 5. Build / Dev / CI

- 🟡 `pnpm-lock.yaml` está com problemas reportados (tarefas anteriores apontaram que `pnpm` está quebrado). Validar instalação limpa em CI.
- ✅ **Dockerfile** multi-stage com healthcheck criado. Falta `docker-compose.yml` quando houver BD.
- 🟡 Não há **CI** (`.github/workflows/`). Adicionar workflow de `lint + typecheck + build`.
- 🟡 Não há **testes** (unit/integration). Vitest + Playwright para fluxos críticos (criar servidor → conectar SSH → executar comando).
- 🟢 Pré-commit hook (`lefthook` ou `husky`) com `tsc --noEmit` e `eslint`.

## 6. UX / Acessibilidade

- 🟢 **Sem sistema de notificações/toasts**. Erros aparecem como `<p>` em vermelho dentro do card. Adicionar toast global (sonner ou um próprio).
- 🟢 **Modais não fecham com Esc** nem clicando no backdrop.
- 🟢 Foco e navegação por teclado nas tabelas de ações (start/stop/restart).
- 🟢 Suporte a tema claro (hoje só escuro).
- 🟢 i18n — strings em pt-BR estão hardcoded; mover para um catálogo se houver previsão de inglês.

## 7. Documentação

- ✅ **README.md** criado (pré-requisitos, setup, envs, endpoints, build/Docker, segurança).
- 🟡 Sem documentação das rotas `/api/*` (gerar com OpenAPI ou um `API.md`).
- 🟢 Diagrama de arquitetura (Mermaid) — fluxo browser → API → SSH/Prometheus/K8s.

## 8. Operacional / Observabilidade do próprio app

- ✅ Health check `/api/health` implementado.
- ✅ Métricas Prometheus expostas em `/api/metrics` (uptime, ssh_exec_total, monitor_check_total). Falta instrumentar mais rotas.
- 🟡 Logs estruturados (pino) com correlação de request — pendente.
- 🟢 OpenTelemetry trace.

## 9. Itens menores / dívida técnica

- Coluna "Manuais" em [servidores/page.tsx](src/app/servidores/page.tsx) sempre exibe a soma — alinhar com totais reais.
- Servidor de teste fictício ("servidor teste manual" com IP `172.26.15.223`) está no `localStorage` da máquina de dev — limpar ao publicar.
- Filtro "todos / running / failed / inactive" do [/infra](src/app/infra/page.tsx) precisa de teste com lista grande (>500 services).
- ✅ `next.config.ts` agora tem `output: 'standalone'` + headers de segurança.

---

## Próximos passos sugeridos (ordem)

1. Adicionar autenticação básica + middleware bloqueando rotas API.
2. Migrar servidores/pipelines/monitores para SQLite + Prisma.
3. Mover chaves SSH para o servidor (cofre criptografado).
4. Implementar rollback em deploy + agendamento por cron.
5. Coletor Prometheus → exibir CPU/Mem na lista de servidores.
6. Notificações (toast + e-mail/Slack quando monitor cair).
7. README, Dockerfile, CI lint+build.
