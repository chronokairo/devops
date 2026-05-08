import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DevOps e Infraestrutura — Chronokairo',
  description: 'CI/CD, deploy, monitoramento e cloud',
}

const nav = {"devops":{"name":"DevOps e Infraestrutura","links":[{"href":"/","label":"Dashboard"},{"href":"/cicd","label":"CI/CD"},{"href":"/deploy","label":"Deploy"},{"href":"/monitoramento","label":"Monitoramento"},{"href":"/infra","label":"Infraestrutura"}]}}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">Chronokairo</div>
          </div>
          <nav className="sidebar-nav">
            {Object.entries(nav).map(([key, section]) => (
              <div key={key} className="sidebar-section">
                <div className="sidebar-section-title">{section.name}</div>
                {section.links.map((link: { href: string; label: string }) => (
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
