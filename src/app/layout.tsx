import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DevOps e Infraestrutura — Chronokairo',
  description: 'CI/CD, deploy, monitoramento e cloud',
}

const icons: Record<string, React.ReactNode> = {
  '/': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  '/cicd': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
      <path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>
    </svg>
  ),
  '/deploy': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  '/docker': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12.5c-.24-1.52-1.57-2.5-3-2.5H4c-1.5 0-2.76 1.08-3 2.5"/>
      <rect x="2" y="12" width="4" height="4" rx=".5"/><rect x="7" y="12" width="4" height="4" rx=".5"/>
      <rect x="12" y="12" width="4" height="4" rx=".5"/><rect x="7" y="7" width="4" height="4" rx=".5"/>
      <rect x="12" y="7" width="4" height="4" rx=".5"/>
    </svg>
  ),
  '/kubernetes': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12M5.64 18.36l2.12-2.12m8.48-8.48 2.12-2.12"/>
    </svg>
  ),
  '/infra': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/>
      <rect x="2" y="17" width="20" height="4" rx="1"/>
      <circle cx="18" cy="5" r=".5" fill="currentColor"/><circle cx="18" cy="12" r=".5" fill="currentColor"/>
      <circle cx="18" cy="19" r=".5" fill="currentColor"/>
    </svg>
  ),
  '/servidores': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  ),
  '/redes': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
      <path d="M12 7v4m0 0-5.5 6m5.5-6 5.5 6"/>
    </svg>
  ),
  '/cloud': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
    </svg>
  ),
  '/monitoramento': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  '/observabilidade': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  '/backup': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
};

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
                  <a key={link.href} href={link.href} className="sidebar-link">
                    <span className="sidebar-icon">{icons[link.href]}</span>
                    {link.label}
                  </a>
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
