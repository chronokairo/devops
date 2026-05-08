'use client'
import { useRef, useState, useCallback } from 'react'

type DockItem = { href: string; label: string; icon: React.ReactNode }
type DockEntry = DockItem | 'sep'

const ICON_SIZE = 36   // base px
const ICON_MAX  = 62   // max px when hovered
const SPREAD    = 120  // px radius of magnification influence

const dockItems: DockEntry[] = [
  {
    href: '/', label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  'sep',
  {
    href: '/cicd', label: 'CI/CD',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/></svg>,
  },
  {
    href: '/deploy', label: 'Deploy',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  },
  'sep',
  {
    href: '/docker', label: 'Docker',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12.5c-.24-1.52-1.57-2.5-3-2.5H4c-1.5 0-2.76 1.08-3 2.5"/><rect x="2" y="12" width="4" height="4" rx=".5"/><rect x="7" y="12" width="4" height="4" rx=".5"/><rect x="12" y="12" width="4" height="4" rx=".5"/><rect x="7" y="7" width="4" height="4" rx=".5"/><rect x="12" y="7" width="4" height="4" rx=".5"/></svg>,
  },
  {
    href: '/kubernetes', label: 'Kubernetes',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12M5.64 18.36l2.12-2.12m8.48-8.48 2.12-2.12"/></svg>,
  },
  'sep',
  {
    href: '/infra', label: 'Infra',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>,
  },
  {
    href: '/servidores', label: 'Servidores',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  },
  {
    href: '/redes', label: 'Redes',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4m0 0-5.5 6m5.5-6 5.5 6"/></svg>,
  },
  {
    href: '/cloud', label: 'Cloud',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>,
  },
  'sep',
  {
    href: '/monitoramento', label: 'Monitor',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    href: '/observabilidade', label: 'Observ.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>,
  },
  {
    href: '/backup', label: 'Backup',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function getScale(mouseX: number | null, itemX: number): number {
  if (mouseX === null) return 1
  const dist = Math.abs(mouseX - itemX)
  if (dist > SPREAD) return 1
  const t = 1 - dist / SPREAD
  return lerp(1, ICON_MAX / ICON_SIZE, t)
}

export function FloatingNav() {
  const dockRef = useRef<HTMLDivElement>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setMouseX(null)
  }, [])

  // build refs index only for real items (skip separators)
  let itemIdx = 0

  return (
    <div className="dock-wrap">
      <div
        ref={dockRef}
        className="dock"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {dockItems.map((entry, i) => {
          if (entry === 'sep') {
            return <div key={`sep-${i}`} className="dock-sep" />
          }
          const refIdx = itemIdx++
          const itemEl = itemRefs.current[refIdx]
          let scale = 1
          if (itemEl && mouseX !== null) {
            const rect = itemEl.getBoundingClientRect()
            const cx = rect.left + rect.width / 2
            scale = getScale(mouseX, cx)
          }
          const size = Math.round(ICON_SIZE * scale)

          return (
            <a
              key={entry.href}
              ref={el => { itemRefs.current[refIdx] = el }}
              href={entry.href}
              className="dock-item"
              style={{ '--dock-size': `${size}px` } as React.CSSProperties}
              title={entry.label}
            >
              <span className="dock-icon">{entry.icon}</span>
              <span className="dock-label">{entry.label}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
