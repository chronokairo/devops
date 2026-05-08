'use client';
import { useState, useCallback } from 'react';

// ── Port Scanner ───────────────────────────────────────────────────
const DEFAULT_PORTS = '22,80,443,3306,5432,6379,8080,8443,9200,27017';

function PortScanner() {
  const [host, setHost]       = useState('');
  const [ports, setPorts]     = useState(DEFAULT_PORTS);
  const [scanning, setScanning] = useState(false);
  const [results, setResults]   = useState<{ port: number; open: boolean; latencyMs?: number }[]>([]);
  const [err, setErr]           = useState('');

  const scan = useCallback(async () => {
    if (!host.trim()) { setErr('Host obrigatório'); return; }
    setErr(''); setScanning(true); setResults([]);
    try {
      const portNums = ports.split(',').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n) && n > 0 && n < 65536);
      if (portNums.length === 0) { setErr('Nenhuma porta válida'); return; }
      const r = await fetch('/api/networks/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: host.trim(), ports: portNums }) });
      const data = await r.json();
      if (data.error) { setErr(data.error); return; }
      setResults(data.results);
    } catch (e) { setErr(String(e)); }
    finally { setScanning(false); }
  }, [host, ports]);

  const open   = results.filter(r => r.open).length;
  const closed = results.filter(r => !r.open).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <p className="card-title" style={{ marginBottom: 16 }}>Escaneador de Portas TCP</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ flex: 1, minWidth: 180 }} placeholder="Host ou IP" value={host} onChange={e => setHost(e.target.value)} />
          <input className="form-input" style={{ flex: 2, minWidth: 220 }} placeholder="Portas separadas por vírgula" value={ports} onChange={e => setPorts(e.target.value)} />
          <button className="btn-primary" onClick={scan} disabled={scanning} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {scanning ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
            Escanear
          </button>
        </div>
        {err && <p className="modal-error" style={{ marginBottom: 0 }}>{err}</p>}
      </div>
      {results.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 16, borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>● {open} aberta{open !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>○ {closed} fechada{closed !== 1 ? 's' : ''}</span>
          </div>
          <table className="table">
            <thead><tr><th>Porta</th><th>Estado</th><th>Latência</th></tr></thead>
            <tbody>
              {results.map(r => (
                <tr key={r.port}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.port}</td>
                  <td>{r.open ? <span className="badge badge-green">● Aberta</span> : <span className="badge badge-gray">○ Fechada</span>}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.latencyMs ? `${r.latencyMs}ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── SSL Checker ────────────────────────────────────────────────────
function SSLChecker() {
  const [host, setHost]   = useState('');
  const [port, setPort]   = useState('443');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Record<string, unknown> | null>(null);
  const [err, setErr]         = useState('');

  const check = useCallback(async () => {
    if (!host.trim()) { setErr('Host obrigatório'); return; }
    setErr(''); setLoading(true); setResult(null);
    try {
      const r = await fetch('/api/networks/ssl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: host.trim(), port: parseInt(port, 10) || 443 }) });
      const data = await r.json();
      if (!data.ok && data.error) { setErr(data.error); return; }
      setResult(data);
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }, [host, port]);

  const days = result?.daysRemaining as number | undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <p className="card-title" style={{ marginBottom: 16 }}>Verificador de Certificado SSL/TLS</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="domínio.com" value={host} onChange={e => setHost(e.target.value)} />
          <input className="form-input" style={{ width: 80 }} placeholder="443" value={port} onChange={e => setPort(e.target.value)} />
          <button className="btn-primary" onClick={check} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            Verificar
          </button>
        </div>
        {err && <p className="modal-error" style={{ marginBottom: 0 }}>{err}</p>}
      </div>
      {result && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            {result.expired
              ? <span className="badge badge-red">✕ Expirado</span>
              : (result.expiringSoon ? <span className="badge badge-yellow">⚠ Expirando</span> : <span className="badge badge-green">● Válido</span>)}
            <span style={{ fontWeight: 600, fontSize: 14 }}>{String(result.host)}</span>
          </div>
          {[
            ['Sujeito (CN)', result.subject],
            ['Emissor', result.issuer],
            ['Válido de', new Date(result.validFrom as string).toLocaleDateString('pt-BR')],
            ['Válido até', new Date(result.validTo as string).toLocaleDateString('pt-BR')],
            ['Dias restantes', days !== undefined ? (days < 0 ? `${Math.abs(days)} dias expirado` : `${days} dias`) : '—'],
            ['Fingerprint', result.fingerprint],
          ].map(([label, value]) => (
            <div key={String(label)} className="metric-row">
              <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{label}</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{String(value ?? '—')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DNS Lookup ─────────────────────────────────────────────────────
const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'CNAME', 'NS', 'PTR', 'SOA'] as const;

function DNSLookup() {
  const [hostname, setHostname] = useState('');
  const [type, setType]         = useState<typeof DNS_TYPES[number]>('A');
  const [loading, setLoading]   = useState(false);
  const [records, setRecords]   = useState<unknown[] | null>(null);
  const [err, setErr]           = useState('');

  const lookup = useCallback(async () => {
    if (!hostname.trim()) { setErr('Hostname obrigatório'); return; }
    setErr(''); setLoading(true); setRecords(null);
    try {
      const r = await fetch('/api/networks/dns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostname: hostname.trim(), type }) });
      const data = await r.json();
      if (data.error && !data.records?.length) { setErr(data.error); return; }
      setRecords(data.records ?? []);
      if (data.error) setErr(data.error);
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }, [hostname, type]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <p className="card-title" style={{ marginBottom: 16 }}>DNS Lookup</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ flex: 1, minWidth: 180 }} placeholder="exemplo.com" value={hostname} onChange={e => setHostname(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()} />
          <select className="form-input" style={{ width: 90 }} value={type} onChange={e => setType(e.target.value as typeof DNS_TYPES[number])}>
            {DNS_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="btn-primary" onClick={lookup} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
            Consultar
          </button>
        </div>
        {err && <p className="modal-error" style={{ marginBottom: 0 }}>{err}</p>}
      </div>
      {records !== null && (
        <div className="card">
          <p className="card-title" style={{ marginBottom: 12 }}>{records.length} registro{records.length !== 1 ? 's' : ''} {type} para <code style={{ fontFamily: 'var(--font-mono)' }}>{hostname}</code></p>
          {records.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-400)' }}>Nenhum registro encontrado</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {records.map((r, i) => (
                <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 10px', background: 'var(--color-muted)', borderRadius: 6 }}>
                  {typeof r === 'object' ? JSON.stringify(r) : String(r)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function Page() {
  const [tab, setTab] = useState<'scan' | 'ssl' | 'dns'>('scan');
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Ferramentas de Rede</h1>
        <p className="page-subtitle">Port scanner, verificador SSL e DNS lookup</p>
      </div>
      <div className="page-content">
        <div className="tab-bar">
          <button className={`tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')}>Port Scanner</button>
          <button className={`tab ${tab === 'ssl'  ? 'active' : ''}`} onClick={() => setTab('ssl')}>SSL / TLS</button>
          <button className={`tab ${tab === 'dns'  ? 'active' : ''}`} onClick={() => setTab('dns')}>DNS Lookup</button>
        </div>
        {tab === 'scan' && <PortScanner />}
        {tab === 'ssl'  && <SSLChecker />}
        {tab === 'dns'  && <DNSLookup />}
      </div>
    </>
  );
}
