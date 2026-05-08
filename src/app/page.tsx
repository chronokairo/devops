const MODULES = [
  { href: '/cicd', title: 'CI/CD', desc: 'Pipelines de integração e entrega contínua com verificações automatizadas.', stat: '12 workflows', statColor: '#22c55e' },
  { href: '/deploy', title: 'Deploy', desc: 'Ambientes de produção, staging e preview com histórico completo.', stat: '4 ambientes', statColor: '#3b82f6' },
  { href: '/docker', title: 'Docker', desc: 'Contêineres, imagens e volumes locais e remotos.', stat: '34 contêineres', statColor: '#0ea5e9' },
  { href: '/kubernetes', title: 'Kubernetes', desc: 'Cluster GKE gerenciado com namespaces, deployments e pods.', stat: '18 pods', statColor: '#8b5cf6' },
  { href: '/cloud', title: 'Cloud', desc: 'Recursos AWS e GCP com controle de custos e inventário.', stat: 'R$ 1.678/mês', statColor: '#f59e0b' },
  { href: '/infra', title: 'Infraestrutura', desc: 'Visão consolidada de todos os recursos de infraestrutura.', stat: '8 servidores', statColor: '#6366f1' },
  { href: '/servidores', title: 'Servidores', desc: 'Gerenciamento de VMs e servidores físicos com métricas em tempo real.', stat: '7 online', statColor: '#22c55e' },
  { href: '/redes', title: 'Redes', desc: 'VPCs, firewall, DNS e load balancers.', stat: '4 redes', statColor: '#14b8a6' },
  { href: '/monitoramento', title: 'Monitoramento', desc: 'Saúde dos serviços, uptime e alertas ativos.', stat: '99.97% uptime', statColor: '#22c55e' },
  { href: '/observabilidade', title: 'Observabilidade', desc: 'Logs, métricas, traces e regras de alerta centralizados.', stat: '2 alertas', statColor: '#ef4444' },
  { href: '/backup', title: 'Backup', desc: 'Jobs de backup agendados com pontos de restauração gerenciados.', stat: '8 jobs', statColor: '#64748b' },
];

export default function Home() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">DevOps e Infraestrutura</h1>
        <p className="page-subtitle">Painel central — CI/CD, contêineres, cloud, monitoramento e operações</p>
      </div>
      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 32 }}>
          <div className="card stat"><p className="stat-value">99.97%</p><p className="stat-label">Uptime</p></div>
          <div className="card stat"><p className="stat-value">12</p><p className="stat-label">Workflows</p></div>
          <div className="card stat"><p className="stat-value">34</p><p className="stat-label">Contêineres</p></div>
          <div className="card stat"><p className="stat-value" style={{ color: '#ef4444' }}>2</p><p className="stat-label">Alertas Ativos</p></div>
        </div>
        <div className="grid-3">
          {MODULES.map(m => (
            <a key={m.href} href={m.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h2 className="card-title" style={{ marginBottom: 0 }}>{m.title}</h2>
                  <span style={{ fontSize: 11, fontWeight: 600, color: m.statColor }}>{m.stat}</span>
                </div>
                <p className="card-text">{m.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
