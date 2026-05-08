# Chronokairo DevOps

Painel operacional Next.js 16 para SSH, Docker, Kubernetes, observabilidade Prometheus, monitoramento HTTP, CI/CD GitHub e gestao de cloud/backup.

> Status: ferramenta operacional local — **sem autenticacao** ainda, com persistencia em `localStorage` + arquivos de auditoria. Veja [TODO.md](TODO.md) para a lista de proximos passos.

## Pre-requisitos

- Node.js 20+
- `pnpm` (recomendado) ou `npm`
- Para SSH funcional: cliente `ssh` no PATH (Windows: OpenSSH Client habilitado)
- Opcional: Prometheus, Loki, cluster Kubernetes, Docker Engine acessivel

## Setup

```bash
pnpm install         # ou: npm install
cp .env.local.example .env.local   # ajuste as variaveis
pnpm dev             # http://localhost:3001
```

Se `pnpm` falhar, use `npm install --legacy-peer-deps && npm run dev`.

## Variaveis de ambiente

Veja a tela `/configuracoes` em runtime — ela lista as 15 variaveis em 9 grupos (GitHub, Kubernetes, Docker, Cloud, Backup, Monitoring, Observability, Networks, App) com status de cada uma e snippet `.env` por grupo.

Principais:

| Grupo | Variaveis |
|---|---|
| GitHub | `GITHUB_TOKEN`, `GITHUB_REPO` (`owner/repo`), `GITHUB_WEBHOOK_SECRET` |
| Kubernetes | `K8S_API_URL`, `K8S_TOKEN` |
| Docker | `DOCKER_HOST` |
| Cloud | `AWS_INVENTORY_FILE` / `AWS_INVENTORY_URL`, `GCP_…`, `AZURE_…` |
| Backup | `BACKUP_CONFIG_FILE` ou `BACKUP_STATUS_URL`, `BACKUP_RESTORE_URL` |
| Monitoring | `PROMETHEUS_URL`, `ALERT_MANAGER_URL` |
| Observability | `LOKI_URL` |
| Networks | `NETWORK_INVENTORY_URL` |
| App | `NEXTAUTH_URL`, `NEXTAUTH_SECRET` |

## Estrutura

```
src/
  app/                # rotas (App Router)
    api/              # endpoints (cicd, ssh, monitor, networks, backup, cloud, …)
    cicd/, deploy/, docker/, kubernetes/, observabilidade/, redes/,
    monitoramento/, servidores/, backup/, infra/, cloud/, configuracoes/
  features/
    components/, hooks/, services/, integrations/, types/
  lib/
    ssh-exec.ts          # one-shot SSH + SSE stream
    ssh-sessions.ts      # sessoes interativas
    http-monitor-store.ts# monitores HTTP em memoria
    audit-log.ts         # log de auditoria (.audit.log)
    metrics-store.ts     # metricas Prometheus em memoria
```

## Endpoints uteis

- `GET /api/health` — healthcheck JSON
- `GET /api/metrics` — texto Prometheus (uptime, ssh_exec_total, monitor_check_total)
- `GET /api/audit?limit=200` — ultimas linhas de `.audit.log`
- `GET /api/config` — status de todas as envs
- `GET /api/cicd` — workflows + runs do GitHub
- `POST /api/cicd/dispatch` — `{ workflow_id, ref?, inputs? }`
- `POST /api/cicd/cancel` — `{ run_id }`
- `POST /api/backup/restore` — `{ restoreId, job? }` (requer `BACKUP_RESTORE_URL`)

## Build / Producao

```bash
pnpm build            # gera .next/standalone (output: 'standalone')
node .next/standalone/server.js
```

Container:

```bash
docker build -t chronokairo-devops -f Dockerfile .
docker run -p 3001:3001 --env-file .env.local chronokairo-devops
```

## Seguranca

Atualmente **nao ha autenticacao**. Nao exponha esta aplicacao a internet sem antes:
1. Adicionar auth (NextAuth/Clerk/middleware proprio)
2. Mover chaves SSH do `localStorage` para um cofre server-side
3. Configurar RBAC por servidor

Headers CSP, X-Frame-Options, Referrer-Policy e Permissions-Policy ja estao habilitados via `next.config.ts`.

## Roadmap

Veja [TODO.md](TODO.md).
