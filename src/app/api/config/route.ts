import { NextResponse } from 'next/server';

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  example?: string;
  set: boolean;
  preview?: string;
}

interface IntegrationGroup {
  id: string;
  title: string;
  description: string;
  page: string;
  vars: EnvVar[];
}

function readVar(name: string, opts: { required: boolean; description: string; example?: string; secret?: boolean }): EnvVar {
  const raw = process.env[name];
  const set = typeof raw === 'string' && raw.length > 0;
  let preview: string | undefined;
  if (set) {
    if (opts.secret) {
      preview = raw!.length <= 8 ? '••••' : `${raw!.slice(0, 4)}••••${raw!.slice(-2)}`;
    } else if (raw!.length > 80) {
      preview = `${raw!.slice(0, 77)}...`;
    } else {
      preview = raw;
    }
  }
  return {
    name,
    required: opts.required,
    description: opts.description,
    example: opts.example,
    set,
    preview,
  };
}

export async function GET() {
  const groups: IntegrationGroup[] = [
    {
      id: 'github',
      title: 'GitHub (CI/CD + Deploy)',
      description: 'Integração com GitHub Actions para listar workflows, runs e deployments. Necessário também para webhooks.',
      page: '/cicd',
      vars: [
        readVar('GITHUB_TOKEN', {
          required: true,
          description: 'Personal Access Token com escopos repo, workflow, read:org.',
          example: 'ghp_xxxxxxxxxxxxxxxxxxxx',
          secret: true,
        }),
        readVar('GITHUB_REPO', {
          required: true,
          description: 'Repositório no formato owner/repo.',
          example: 'chronokairo/chronokairo',
        }),
        readVar('GITHUB_WEBHOOK_SECRET', {
          required: false,
          description: 'Segredo HMAC-SHA256 usado para validar webhooks recebidos em /api/webhooks/github.',
          example: 'um-segredo-aleatorio-longo',
          secret: true,
        }),
      ],
    },
    {
      id: 'kubernetes',
      title: 'Kubernetes',
      description: 'API do cluster K8s para listar namespaces, pods, deployments e nodes. Dentro de um pod com ServiceAccount as variáveis são injetadas automaticamente.',
      page: '/kubernetes',
      vars: [
        readVar('KUBERNETES_API_URL', {
          required: true,
          description: 'URL completa do API server (ex: https://k8s.exemplo.com:6443).',
          example: 'https://kubernetes.default.svc',
        }),
        readVar('KUBERNETES_TOKEN', {
          required: true,
          description: 'Bearer token com permissão de leitura nos recursos.',
          example: 'eyJhbGciOiJSUzI1NiIs...',
          secret: true,
        }),
      ],
    },
    {
      id: 'docker',
      title: 'Docker (daemon local)',
      description: 'Conexão com o daemon Docker local via socket TCP. Habilite o socket no Docker Desktop ou exponha via tcp://2375. Para hosts remotos use a tela Docker (via SSH).',
      page: '/docker',
      vars: [
        readVar('DOCKER_HOST', {
          required: false,
          description: 'URL HTTP do daemon Docker (ex: http://localhost:2375).',
          example: 'http://localhost:2375',
        }),
      ],
    },
    {
      id: 'cloud',
      title: 'Cloud (Inventário AWS / GCP / Azure)',
      description: 'Fonte do inventário de recursos cloud, separada por provedor. Cada provedor aceita um arquivo JSON local OU um endpoint HTTP que retorne { resources: [...] }. Os recursos são unidos numa lista única.',
      page: '/cloud',
      vars: [
        readVar('AWS_INVENTORY_FILE', {
          required: false,
          description: 'AWS — caminho absoluto para JSON local com array "resources".',
          example: 'C:\\dados\\aws-inventory.json',
        }),
        readVar('AWS_INVENTORY_URL', {
          required: false,
          description: 'AWS — URL HTTP que devolve o inventário JSON.',
          example: 'https://inventory.exemplo.com/aws.json',
        }),
        readVar('GCP_INVENTORY_FILE', {
          required: false,
          description: 'GCP — caminho absoluto para JSON local com array "resources".',
          example: 'C:\\dados\\gcp-inventory.json',
        }),
        readVar('GCP_INVENTORY_URL', {
          required: false,
          description: 'GCP — URL HTTP que devolve o inventário JSON.',
          example: 'https://inventory.exemplo.com/gcp.json',
        }),
        readVar('AZURE_INVENTORY_FILE', {
          required: false,
          description: 'Azure — caminho absoluto para JSON local com array "resources".',
          example: 'C:\\dados\\azure-inventory.json',
        }),
        readVar('AZURE_INVENTORY_URL', {
          required: false,
          description: 'Azure — URL HTTP que devolve o inventário JSON.',
          example: 'https://inventory.exemplo.com/azure.json',
        }),
      ],
    },
    {
      id: 'backup',
      title: 'Backup',
      description: 'Fonte do status de jobs de backup e pontos de restore. Use um arquivo JSON local ou endpoint HTTP com { jobs: [...], restores: [...] }.',
      page: '/backup',
      vars: [
        readVar('BACKUP_CONFIG_FILE', {
          required: false,
          description: 'Caminho absoluto para JSON local com jobs e restores.',
          example: 'C:\\dados\\backup-status.json',
        }),
        readVar('BACKUP_STATUS_URL', {
          required: false,
          description: 'URL HTTP que devolve o status dos backups em JSON.',
          example: 'https://backup.exemplo.com/status',
        }),
      ],
    },
    {
      id: 'monitoring',
      title: 'Monitoramento (Health Checks)',
      description: 'Lista de URLs HTTP a serem verificadas periodicamente. Configure como JSON.',
      page: '/monitoramento',
      vars: [
        readVar('HEALTH_CHECK_ENDPOINTS', {
          required: false,
          description: 'Array JSON de endpoints a monitorar.',
          example: '[{"name":"API","url":"http://localhost:3000/health","group":"Backend"}]',
        }),
      ],
    },
    {
      id: 'observability',
      title: 'Observabilidade (Prometheus + Loki)',
      description: 'Endpoints de Prometheus (métricas + alertas) e Loki (logs). PROMETHEUS_URL também é usado em /servidores para coletar métricas via node_exporter.',
      page: '/observabilidade',
      vars: [
        readVar('PROMETHEUS_URL', {
          required: false,
          description: 'URL da API HTTP do Prometheus (ex: http://prometheus:9090).',
          example: 'http://prometheus:9090',
        }),
        readVar('LOKI_URL', {
          required: false,
          description: 'URL da API HTTP do Loki (ex: http://loki:3100).',
          example: 'http://loki:3100',
        }),
      ],
    },
    {
      id: 'networks',
      title: 'Redes (Inventário remoto)',
      description: 'Endpoint que retorna VPCs, sub-redes, regras de firewall, DNS e LBs. As ferramentas Port Scanner / SSL / DNS funcionam sem configuração.',
      page: '/redes',
      vars: [
        readVar('NETWORK_INVENTORY_URL', {
          required: false,
          description: 'URL HTTP que devolve o inventário de redes em JSON.',
          example: 'https://inventory.exemplo.com/networks.json',
        }),
      ],
    },
    {
      id: 'app',
      title: 'Aplicação',
      description: 'Configuração interna do app Next.js.',
      page: '/',
      vars: [
        readVar('NEXTAUTH_URL', {
          required: false,
          description: 'URL pública da aplicação (usada por chamadas internas entre rotas API).',
          example: 'http://localhost:3000',
        }),
      ],
    },
  ];

  return NextResponse.json({ groups });
}
