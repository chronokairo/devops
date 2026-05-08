'use client';
import { useState } from 'react';

const NETWORKS = [
  { id: 'vpc-01', name: 'vpc-production', cidr: '10.0.0.0/16', provider: 'AWS', region: 'sa-east-1', subnets: 4, status: 'available' },
  { id: 'vpc-02', name: 'vpc-staging', cidr: '10.1.0.0/16', provider: 'AWS', region: 'sa-east-1', subnets: 2, status: 'available' },
  { id: 'net-01', name: 'gke-network', cidr: '10.100.0.0/16', provider: 'GCP', region: 'southamerica-east1', subnets: 3, status: 'active' },
  { id: 'net-02', name: 'docker-bridge', cidr: '172.17.0.0/16', provider: 'Local', region: 'host', subnets: 1, status: 'active' },
];

const RULES = [
  { id: 'sg-01', name: 'allow-https-inbound', direction: 'inbound', protocol: 'TCP', port: '443', source: '0.0.0.0/0', action: 'allow', network: 'vpc-production', priority: 100 },
  { id: 'sg-02', name: 'allow-http-inbound', direction: 'inbound', protocol: 'TCP', port: '80', source: '0.0.0.0/0', action: 'allow', network: 'vpc-production', priority: 110 },
  { id: 'sg-03', name: 'allow-ssh-internal', direction: 'inbound', protocol: 'TCP', port: '22', source: '10.0.0.0/8', action: 'allow', network: 'vpc-production', priority: 200 },
  { id: 'sg-04', name: 'deny-ssh-public', direction: 'inbound', protocol: 'TCP', port: '22', source: '0.0.0.0/0', action: 'deny', network: 'vpc-production', priority: 201 },
  { id: 'sg-05', name: 'allow-postgres-internal', direction: 'inbound', protocol: 'TCP', port: '5432', source: '10.0.0.0/16', action: 'allow', network: 'vpc-production', priority: 300 },
  { id: 'sg-06', name: 'deny-postgres-public', direction: 'inbound', protocol: 'TCP', port: '5432', source: '0.0.0.0/0', action: 'deny', network: 'vpc-production', priority: 301 },
  { id: 'sg-07', name: 'allow-outbound-all', direction: 'outbound', protocol: 'ALL', port: '*', source: '10.0.0.0/16', action: 'allow', network: 'vpc-production', priority: 1000 },
];

const DNS = [
  { name: 'app.chronokairo.com', type: 'A', value: '54.232.110.45', ttl: '300', status: 'active' },
  { name: 'staging.chronokairo.com', type: 'A', value: '54.232.110.50', ttl: '60', status: 'active' },
  { name: 'api.chronokairo.com', type: 'CNAME', value: 'app.chronokairo.com', ttl: '300', status: 'active' },
  { name: 'cdn.chronokairo.com', type: 'CNAME', value: 'd1abc2def.cloudfront.net', ttl: '86400', status: 'active' },
  { name: 'mail.chronokairo.com', type: 'MX', value: '10 mail.google.com', ttl: '3600', status: 'active' },
  { name: 'chronokairo.com', type: 'TXT', value: 'v=spf1 include:_spf.google.com ~all', ttl: '3600', status: 'active' },
];

const LBS = [
  { name: 'prod-alb', type: 'Application LB', provider: 'AWS', dns: 'prod-alb-123.sa-east-1.elb.amazonaws.com', targets: 2, status: 'active', requests: '4.2k/min' },
  { name: 'staging-alb', type: 'Application LB', provider: 'AWS', dns: 'staging-alb-456.sa-east-1.elb.amazonaws.com', targets: 1, status: 'active', requests: '180/min' },
  { name: 'gke-ingress', type: 'HTTP(S) LB', provider: 'GCP', dns: '34.95.123.45', targets: 3, status: 'active', requests: '2.8k/min' },
];

export default function Page() {
  const [tab, setTab] = useState<'networks' | 'rules' | 'dns' | 'lb'>('networks');

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Redes</h1>
        <p className="page-subtitle">VPCs, regras de firewall, DNS e load balancers</p>
      </div>
      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card stat"><p className="stat-value">{NETWORKS.length}</p><p className="stat-label">Redes</p></div>
          <div className="card stat"><p className="stat-value">{RULES.length}</p><p className="stat-label">Regras de Firewall</p></div>
          <div className="card stat"><p className="stat-value">{DNS.length}</p><p className="stat-label">Registros DNS</p></div>
          <div className="card stat"><p className="stat-value">{LBS.length}</p><p className="stat-label">Load Balancers</p></div>
        </div>

        <div className="tab-bar">
          <button className={`tab ${tab === 'networks' ? 'active' : ''}`} onClick={() => setTab('networks')}>VPCs / Redes</button>
          <button className={`tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>Firewall</button>
          <button className={`tab ${tab === 'dns' ? 'active' : ''}`} onClick={() => setTab('dns')}>DNS</button>
          <button className={`tab ${tab === 'lb' ? 'active' : ''}`} onClick={() => setTab('lb')}>Load Balancers</button>
        </div>

        {tab === 'networks' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Nome</th><th>CIDR</th><th>Provedor</th><th>Região</th><th>Sub-redes</th><th>Status</th></tr></thead>
              <tbody>
                {NETWORKS.map(n => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 500 }}>{n.name}</td>
                    <td><code style={{ fontSize: 12 }}>{n.cidr}</code></td>
                    <td><span className={`badge ${n.provider === 'AWS' ? 'badge-yellow' : n.provider === 'GCP' ? 'badge-blue' : 'badge-gray'}`}>{n.provider}</span></td>
                    <td><code style={{ fontSize: 11 }}>{n.region}</code></td>
                    <td style={{ fontSize: 13 }}>{n.subnets}</td>
                    <td><span className="badge badge-green">● {n.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'rules' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Prioridade</th><th>Nome</th><th>Direção</th><th>Protocolo</th><th>Porta</th><th>Origem/Destino</th><th>Ação</th></tr></thead>
              <tbody>
                {RULES.sort((a, b) => a.priority - b.priority).map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{r.priority}</td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</td>
                    <td><span className={`badge ${r.direction === 'inbound' ? 'badge-blue' : 'badge-purple'}`}>{r.direction}</span></td>
                    <td><code style={{ fontSize: 11 }}>{r.protocol}</code></td>
                    <td><code style={{ fontSize: 12 }}>{r.port}</code></td>
                    <td><code style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>{r.source}</code></td>
                    <td><span className={`badge ${r.action === 'allow' ? 'badge-green' : 'badge-red'}`}>{r.action === 'allow' ? '✓ allow' : '✗ deny'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'dns' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Valor</th><th>TTL</th><th>Status</th></tr></thead>
              <tbody>
                {DNS.map(d => (
                  <tr key={d.name}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500 }}>{d.name}</td>
                    <td><span className="badge badge-gray">{d.type}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-neutral-500)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.value}</td>
                    <td style={{ fontSize: 12 }}>{d.ttl}s</td>
                    <td><span className="badge badge-green">● {d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'lb' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Provedor</th><th>DNS / IP</th><th>Targets</th><th>Requests</th><th>Status</th></tr></thead>
              <tbody>
                {LBS.map(lb => (
                  <tr key={lb.name}>
                    <td style={{ fontWeight: 500 }}>{lb.name}</td>
                    <td><span className="badge badge-gray">{lb.type}</span></td>
                    <td><span className={`badge ${lb.provider === 'AWS' ? 'badge-yellow' : 'badge-blue'}`}>{lb.provider}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-neutral-500)' }}>{lb.dns}</td>
                    <td style={{ fontSize: 13 }}>{lb.targets}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{lb.requests}</td>
                    <td><span className="badge badge-green">● {lb.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
