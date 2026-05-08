'use client';

// DeploymentsList — GitHub Deployments grouped by environment
import React, { useState } from 'react';
import {
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  GitBranch,
  GitCommit,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { T } from '@/shared/config/tokens';
import type { EnvironmentStatus, GitHubDeployment, GitHubDeploymentStatus } from '../types';

interface DeploymentsListProps {
  environmentStatuses: EnvironmentStatus[];
  isLoading: boolean;
  onRefresh: () => void;
}

function statusInfo(status: GitHubDeploymentStatus['state'] | undefined) {
  switch (status) {
    case 'success':
      return { icon: <CheckCircle2 size={14} />, color: T.green, bg: T.greenBg, label: 'Success' };
    case 'failure':
    case 'error':
      return { icon: <XCircle size={14} />, color: T.red, bg: T.redBg, label: status === 'failure' ? 'Failed' : 'Error' };
    case 'in_progress':
      return { icon: <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />, color: T.blue, bg: T.blueBg, label: 'In progress' };
    case 'queued':
    case 'pending':
      return { icon: <Clock size={14} />, color: T.amber, bg: T.amberBg, label: 'Pending' };
    case 'inactive':
      return { icon: <AlertCircle size={14} />, color: T.text3, bg: T.bg3, label: 'Inactive' };
    default:
      return { icon: <Clock size={14} />, color: T.text3, bg: T.bg2, label: 'Unknown' };
  }
}

function envColor(name: string) {
  const n = name.toLowerCase();
  if (n === 'production') return { color: T.green, bg: T.greenBg };
  if (n === 'staging') return { color: T.amber, bg: T.amberBg };
  if (n === 'preview') return { color: T.blue, bg: T.blueBg };
  return { color: T.text3, bg: T.bg2 };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function shortSha(sha: string) {
  return sha.substring(0, 7);
}

function DeploymentRow({ dep, isLatest }: { dep: GitHubDeployment; isLatest?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 0',
      borderTop: isLatest ? 'none' : `1px solid ${T.border}`,
      fontSize: '12px', color: T.text3,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: T.text2 }}>
        <GitCommit size={11} />
        <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>{shortSha(dep.sha)}</code>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <GitBranch size={11} />
        {dep.ref}
      </span>
      <span style={{ flex: 1 }}>por {dep.creator?.login}</span>
      <span>{timeAgo(dep.created_at)}</span>
    </div>
  );
}

function EnvironmentCard({ env }: { env: EnvironmentStatus }) {
  const [expanded, setExpanded] = useState(false);
  const colors = envColor(env.name);
  const si = statusInfo(env.latest_status?.state);
  const historyDeps = env.deployments.slice(1); // skip latest which is shown in header

  return (
    <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: '10px', overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Env badge */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Globe size={16} style={{ color: colors.color }} />
        </div>

        {/* Env info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: T.text1, textTransform: 'capitalize' }}>{env.name}</span>
            {env.latest_status && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 500, padding: '1px 7px', borderRadius: '20px',
                background: si.bg, color: si.color,
              }}>
                {si.icon}
                {si.label}
              </span>
            )}
          </div>

          {env.latest_deployment ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: T.text3, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: T.text2 }}>
                <GitCommit size={11} />
                <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>{shortSha(env.latest_deployment.sha)}</code>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <GitBranch size={11} />
                {env.latest_deployment.ref}
              </span>
              <span>por {env.latest_deployment.creator?.login}</span>
              <span>{timeAgo(env.latest_deployment.created_at)}</span>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: T.text3, marginTop: '4px' }}>Sem deploys registrados</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {env.latest_status?.environment_url && (
            <a
              href={env.latest_status.environment_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir ambiente"
              style={{
                display: 'flex', alignItems: 'center', padding: '5px 8px',
                borderRadius: '6px', border: `1px solid ${T.border}`,
                background: T.bg2, color: T.blue, textDecoration: 'none', fontSize: '11px', gap: '4px',
              }}
            >
              <ExternalLink size={12} />
              <span>Abrir</span>
            </a>
          )}
          {env.latest_status?.log_url && (
            <a
              href={env.latest_status.log_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver log"
              style={{
                display: 'flex', alignItems: 'center', padding: '5px',
                borderRadius: '6px', border: `1px solid ${T.border}`,
                background: T.bg2, color: T.text2, textDecoration: 'none',
              }}
            >
              <ExternalLink size={12} />
            </a>
          )}
          {historyDeps.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 8px', borderRadius: '6px', border: `1px solid ${T.border}`,
                background: 'none', color: T.text3, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
              }}
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {historyDeps.length} anterior{historyDeps.length !== 1 ? 'es' : ''}
            </button>
          )}
        </div>
      </div>

      {/* History */}
      {expanded && historyDeps.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: '4px 16px 12px', background: T.bg0 }}>
          {historyDeps.map(dep => (
            <DeploymentRow key={dep.id} dep={dep} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DeploymentsList({ environmentStatuses, isLoading, onRefresh }: DeploymentsListProps) {
  if (isLoading && environmentStatuses.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: T.text3, gap: '8px', fontSize: '13px' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Carregando deployments...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isLoading && environmentStatuses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: T.text3 }}>
        <Globe size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
        <div style={{ fontSize: '14px', fontWeight: 500, color: T.text2, marginBottom: '4px' }}>Sem deployments registrados</div>
        <div style={{ fontSize: '12px', marginBottom: '16px' }}>
          Configure GitHub Actions com steps de deployment para começar.
        </div>
        <button
          onClick={onRefresh}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '6px',
            border: `1px solid ${T.border}`, background: T.bg2, color: T.text2,
            cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={13} />
          Tentar novamente
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {environmentStatuses.map(env => (
        <EnvironmentCard key={env.name} env={env} />
      ))}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
