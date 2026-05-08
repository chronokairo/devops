// PipelineStatsCard Component
import React from 'react';
import { T } from '@/shared/config/tokens';
import type { PipelineStats } from '../types';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Rocket 
} from 'lucide-react';

interface PipelineStatsCardProps {
  stats: PipelineStats;
}

export function PipelineStatsCard({ stats }: PipelineStatsCardProps) {
  const statItems = [
    {
      icon: Activity,
      label: 'Execuções (7 dias)',
      value: stats.runs_this_week,
      color: T.accent,
    },
    {
      icon: CheckCircle2,
      label: 'Taxa de Sucesso',
      value: `${stats.success_rate.toFixed(0)}%`,
      color: T.green,
    },
    {
      icon: Clock,
      label: 'Tempo Médio',
      value: stats.avg_duration_minutes > 0 
        ? `${stats.avg_duration_minutes.toFixed(0)}min` 
        : '-',
      color: T.blue,
    },
    {
      icon: Rocket,
      label: 'Deploys (7 dias)',
      value: stats.deployments_this_week,
      color: T.accent,
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 12,
      marginBottom: 24,
    }}>
      {statItems.map((item, index) => (
        <div
          key={index}
          style={{
            padding: 16,
            backgroundColor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <item.icon size={18} color={item.color} />
            <span style={{ fontSize: 12, color: T.text2 }}>
              {item.label}
            </span>
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 600,
            color: T.text1,
          }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
