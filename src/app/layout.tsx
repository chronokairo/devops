import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DevOps e Infraestrutura — Chronokairo',
  description: 'CI/CD, deploy, monitoramento e cloud',
}

const nav = [
  { section: 'Geral', links: [{ href: '/', label: 'Dashboard' }] },
  { section: 'Pipelines', links: [
    { href: '/cicd', label: 'CI/CD' },
    { href: '/deploy', label: 'Deploy' },
  ]},
  { section: 'Conteineres', links: [
    { href: '/docker', label: 'Docker' },
    { href: '/kubernetes', label: 'Kubernetes' },
  ]},
  { section: 'Infraestrutura', links: [
    { href: '/infra', label: 'Infraestrutura' },
    { href: '/servidores', label: 'Servidores' },
    { href: '/redes', label: 'Redes' },
    { href: '/cloud', label: 'Cloud' },
  ]},
  { section: 'Operacoes', links: [
    { href: '/monitoramento', label: 'Monitoramento' },
    { href: '/observabilidade', label: 'Observabilidade' },
    { href: '/backup', label: 'Backup' },
  ]},
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">Chronokairo</div>
          </div>
          <nav className="sidebar-nav">
            {nav.map((group) => (
              <div key={group.section} className="sidebar-section">
                <div className="sidebar-section-title">{group.section}</div>
                {group.links.map((link) => (
                  <a key={link.href} href={link.href} className="sidebar-link">{link.label}</a>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="main">{children}</main>
      </body>
    </html>
  )
}
