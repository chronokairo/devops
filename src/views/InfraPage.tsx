// InfraPage - Environments, Releases & Changelog
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tag,
  Globe,
  RefreshCw,
  ExternalLink,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Package,
  GitBranch,
  GitCommit,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Activity,
  Terminal,
  Server,
  Zap,
  Info,
  Box
} from 'lucide-react';
import { T, spacing, borderRadius } from '@/shared/config/tokens';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useGitHubContext } from '@/features/security/hooks/useGitHubContext';
import { useAuthContext } from '@/features/security/services/AuthProvider';
import { githubService } from '@/shared/api/github';
import type { GitHubDeployment, GitHubDeploymentStatus } from '@/features/operations/types/types';

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  html_url: string;
  author: { login: string; avatar_url: string };
  assets: { name: string; size: number; download_count: number; browser_download_url: string }[];
}

interface EnvInfo {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  deployment: GitHubDeployment | null;
  deploymentStatus: GitHubDeploymentStatus | null;
}

const ENVS_ORDER = ['production', 'staging', 'development', 'preview'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortSha(sha: string) { return sha.substring(0, 7); }

function deployStatusInfo(state?: GitHubDeploymentStatus['state']) {
  switch (state) {
    case 'success': return { icon: <CheckCircle2 size={12} />, color: T.success, bg: T.successBg, label: 'Operational' };
    case 'failure':
    case 'error': return { icon: <XCircle size={12} />, color: T.danger, bg: T.dangerBg, label: 'Degraded' };
    case 'in_progress': return { icon: <Loader2 size={12} className="animate-spin" />, color: T.info, bg: T.infoBg, label: 'Deploying' };
    default: return { icon: <Clock size={12} />, color: T.text3, bg: T.bg2, label: 'Idle' };
  }
}

export default function InfraPage() {
  const { selectedRepository, availableRepos } = useGitHubContext();
  const { user } = useAuthContext();
  const userId = user?.uid || (user as any)?.id;

  const [releases, setReleases] = useState<Release[]>([]);
  const [envInfos, setEnvInfos] = useState<EnvInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'releases' | 'environments'>('environments');
  const [expandedRelease, setExpandedRelease] = useState<number | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>('');

  useEffect(() => {
    const repo = typeof selectedRepository === 'string'
      ? selectedRepository
      : (selectedRepository as any)?.full_name ?? '';
    if (repo) setSelectedRepo(repo);
  }, [selectedRepository]);

  const load = useCallback(async () => {
    if (!selectedRepo || !userId) return;
    const parts = selectedRepo.split('/');
    if (parts.length < 2) return;
    const [owner, repo] = parts;

    setLoading(true);
    setError(null);
    try {
      const [relResult, envResult, depsResult] = await Promise.allSettled([
        githubService.getReleases(owner, repo, userId, { per_page: 20 }),
        githubService.getRepositoryEnvironments(owner, repo, userId),
        githubService.getRepositoryDeployments(owner, repo, userId, { per_page: 50 }),
      ]);

      if (relResult.status === 'fulfilled') {
        setReleases(Array.isArray(relResult.value) ? relResult.value : []);
      }

      if (envResult.status === 'fulfilled') {
        const rawEnvs: any[] = envResult.value?.environments ?? [];
        rawEnvs.sort((a, b) => {
          const ai = ENVS_ORDER.indexOf(a.name.toLowerCase());
          const bi = ENVS_ORDER.indexOf(b.name.toLowerCase());
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        const deploys: GitHubDeployment[] = depsResult.status === 'fulfilled'
          ? (Array.isArray(depsResult.value) ? depsResult.value : [])
          : [];

        const latestPerEnv = new Map<string, GitHubDeployment>();
        for (const dep of deploys) {
          if (!latestPerEnv.has(dep.environment)) latestPerEnv.set(dep.environment, dep);
        }

        const infos: EnvInfo[] = await Promise.all(
          rawEnvs.map(async (env: any): Promise<EnvInfo> => {
            const dep = latestPerEnv.get(env.name) ?? null;
            let depStatus: GitHubDeploymentStatus | null = null;
            if (dep) {
              try {
                const statuses: GitHubDeploymentStatus[] = await githubService.getDeploymentStatuses(
                  owner, repo, dep.id, userId
                ) || [];
                depStatus = statuses[0] ?? null;
              } catch { /* ignore */ }
            }
            return { id: env.id, name: env.name, created_at: env.created_at, updated_at: env.updated_at, deployment: dep, deploymentStatus: depStatus };
          })
        );

        setEnvInfos(infos);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [selectedRepo, userId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Dynamic Command Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: `${spacing.md} ${spacing.lg}`, borderRadius: borderRadius.lg, border: `1px solid ${T.border}`, background: T.bg1 }}>
        <PageHeader
          icon={<Server size={20} />}
          title="Infraestrutura"
          subtitle="Ambientes, Releases & Deployments"
          actions={
            <div className="flex items-center gap-3">
              {availableRepos.length > 0 && (
                <div className="relative group">
                  <select
                    value={selectedRepo}
                    onChange={e => setSelectedRepo(e.target.value)}
                    className="pl-4 pr-10 py-2.5 rounded-xl border outline-none appearance-none cursor-pointer transition-all hover:bg-(--bg2) font-semibold"
                    style={{ background: T.bg1, borderColor: T.border, color: T.text1, fontSize: '13px' }}
                  >
                    {availableRepos.map((r: any) => (
                      <option key={r.full_name ?? r.name} value={r.full_name ?? r.name}>{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                </div>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-50"
                style={{ background: T.text1, color: T.bg0, fontSize: '13px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Sync
              </button>
            </div>
          }
        />
      </div>

      {/* Status Line */}
      <div className="flex items-center gap-2 px-6 py-2" style={{ color: '#10b981' }}>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-widest">System Operational</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl border w-fit" style={{ background: T.bg1, borderColor: T.border }}>
        {(['environments', 'releases'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab ? 'shadow-sm' : 'hover:bg-(--bg2)'}`}
            style={{
              background: activeTab === tab ? T.bg0 : 'transparent',
              color: activeTab === tab ? T.text1 : T.text3,
              border: activeTab === tab ? `1px solid ${T.border}` : '1px solid transparent'
            }}
          >
            {tab === 'environments' ? 'Ambientes' : 'Releases'}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Main Panel */}
        <div className="lg:col-span-8 space-y-4">
          {activeTab === 'environments' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {envInfos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', gridColumn: '1 / -1' }}>
                  <Globe size={48} color={T.text3} style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: T.text1, margin: '0 0 8px' }}>
                    Nenhum ambiente encontrado
                  </p>
                  <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
                    Ambientes de deployment aparecerão aqui quando configurados
                  </p>
                </div>
              ) : (
                envInfos.map((env, idx) => {
                  const si = deployStatusInfo(env.deploymentStatus?.state);
                  const isProd = env.name.toLowerCase() === 'production';
                  return (
                    <div key={env.id}
                      className="group p-6 rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      style={{ background: T.bg1, borderColor: T.border, animationDelay: `${idx * 100}ms` }}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProd ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {isProd ? <Zap size={20} /> : <Terminal size={20} />}
                          </div>
                          <div>
                            <h3 className="font-bold capitalize" style={{ color: T.text1 }}>{env.name}</h3>
                            <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: si.color }}>{si.label}</span>
                          </div>
                        </div>
                        {env.deploymentStatus?.environment_url && (
                          <a href={env.deploymentStatus.environment_url} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 transition-colors">
                            <ExternalLink size={18} />
                          </a>
                        )}
                      </div>

                      {env.deployment ? (
                        <div className="space-y-4">
                          <div className="p-3 rounded-2xl border flex items-center justify-between" style={{ background: T.bg0, borderColor: T.border }}>
                            <div className="flex items-center gap-2 text-xs font-mono" style={{ color: T.text2 }}>
                              <GitCommit size={14} className="text-gray-400" />
                              {shortSha(env.deployment.sha)}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: T.text3 }}>
                              <GitBranch size={14} />
                              {env.deployment.ref}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px]" style={{ color: T.text3 }}>
                            <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(env.deployment.created_at)}</span>
                            <span className="font-medium">by {env.deployment.creator?.login}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: T.bg2 }}>
                          <Info size={20} className="mx-auto mb-2 text-gray-400" />
                          <p className="text-xs font-medium" style={{ color: T.text3 }}>Aguardando primeira implantação</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {releases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <Box size={48} color={T.text3} style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: T.text1, margin: '0 0 8px' }}>
                    Nenhuma release encontrada
                  </p>
                  <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
                    Releases publicadas aparecerão aqui quando criadas
                  </p>
                </div>
              ) : (
                releases.map((rel, idx) => (
                  <div key={rel.id}
                    className="p-6 rounded-3xl border transition-all hover:shadow-lg"
                    style={{ background: T.bg1, borderColor: T.border, animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                          <Tag size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold" style={{ color: T.text1 }}>{rel.name || rel.tag_name}</h4>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: T.text3 }}>
                            <Calendar size={12} /> {formatDate(rel.published_at || rel.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${rel.prerelease ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {rel.prerelease ? 'Pré-venda' : 'Produção'}
                        </span>
                        <a href={rel.html_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                          <ExternalLink size={18} />
                        </a>
                      </div>
                    </div>
                    {rel.body && (
                      <div className="mt-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent group hover:border-blue-500/20 transition-all">
                        <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-hidden max-h-32 group-hover:max-h-full transition-all" style={{ color: T.text2 }}>
                          {rel.body}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl border" style={{ background: T.bg1, borderColor: T.border }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: T.text3 }}>
              <Activity size={16} /> Cluster Metrics
            </h3>
            <div className="space-y-4">
              <MetricItem label="Nodes Online" value="12/12" color={T.green} percent={100} />
              <MetricItem label="Load Average" value="0.24" color={T.blue} percent={24} />
              <MetricItem label="Network Latency" value="14ms" color={T.emerald} percent={14} />
            </div>
          </div>

          <div className="p-6 rounded-3xl border" style={{ background: T.bg1, borderColor: T.border }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: T.text3 }}>
              <Package size={16} /> Build Artifacts
            </h3>
            <div className="text-xs space-y-3" style={{ color: T.text2 }}>
              <p className="flex justify-between items-center">
                <span style={{ color: T.text3 }}>Último Build</span>
                <span className="font-bold">Há 24 min</span>
              </p>
              <p className="flex justify-between items-center">
                <span style={{ color: T.text3 }}>Build Time</span>
                <span className="font-bold">4m 12s</span>
              </p>
              <p className="flex justify-between items-center">
                <span style={{ color: T.text3 }}>Artifact Size</span>
                <span className="font-bold">42.4 MB</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, color, percent }: { label: string; value: string; color: string; percent: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span style={{ color: T.text2 }}>{label}</span>
        <span className="font-bold" style={{ color: T.text1 }}>{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ background: color, width: `${percent}%` }} />
      </div>
    </div>
  );
}
