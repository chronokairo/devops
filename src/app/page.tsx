const MODULES = [
  { href: '/cicd', title: 'CI/CD', desc: 'Pipelines de integração e entrega contínua via GitHub Actions.' },
  { href: '/deploy', title: 'Deploy', desc: 'Pipelines de deploy executando comandos via SSH com saída em tempo real.' },
  { href: '/docker', title: 'Docker', desc: 'Contêineres, imagens e logs em servidores remotos via SSH.' },
  { href: '/kubernetes', title: 'Kubernetes', desc: 'Namespaces, deployments, pods e nodes do cluster K8s.' },
  { href: '/cloud', title: 'Cloud', desc: 'Inventário consolidado de recursos AWS, GCP e Azure.' },
  { href: '/infra', title: 'Infraestrutura', desc: 'Gerenciamento de serviços systemd em servidores Linux.' },
  { href: '/servidores', title: 'Servidores', desc: 'Cadastro e gestão de VMs e servidores físicos com acesso SSH.' },
  { href: '/redes', title: 'Redes', desc: 'Port scanner, verificador SSL/TLS e DNS lookup.' },
  { href: '/monitoramento', title: 'Monitoramento', desc: 'Health checks HTTP com latência e status em tempo real.' },
  { href: '/observabilidade', title: 'Observabilidade', desc: 'Logs, métricas Prometheus e alertas centralizados.' },
  { href: '/backup', title: 'Backup', desc: 'Jobs agendados e pontos de restauração gerenciados.' },
  { href: '/configuracoes', title: 'Configurações', desc: 'Variáveis de ambiente para todas as integrações.' },
];

export default function Home() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">DevOps e Infraestrutura</h1>
        <p className="page-subtitle">Painel central — CI/CD, contêineres, cloud, monitoramento e operações</p>
      </div>
      <div className="page-content">
        <div className="grid-3">
          {MODULES.map(m => (
            <a key={m.href} href={m.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
                <h2 className="card-title">{m.title}</h2>
                <p className="card-text">{m.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
