export default function Home() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">DevOps e Infraestrutura</h1>
        <p className="page-subtitle">CI/CD, deploy, monitoramento e cloud</p>
      </div>
      <div className="page-content">
        <div className="grid-3">
          <div className="card stat">
            <p className="stat-value">98%</p>
            <p className="stat-label">Uptime</p>
          </div>
          <div className="card stat">
            <p className="stat-value">12</p>
            <p className="stat-label">Pipelines</p>
          </div>
          <div className="card stat">
            <p className="stat-value">3s</p>
            <p className="stat-label">Deploy Medio</p>
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 24 }}>
          <div className="card">
            <h2 className="card-title">CI/CD</h2>
            <p className="card-text">Pipelines de integracao e deploy continuo com verificacoes automaticas.</p>
          </div>
          <div className="card">
            <h2 className="card-title">Infraestrutura</h2>
            <p className="card-text">Servidores, redes e recursos cloud gerenciados como codigo.</p>
          </div>
        </div>
      </div>
    </>
  )
}
