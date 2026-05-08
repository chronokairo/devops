// WorkflowsList Component
import React from 'react';
import { T } from '@/shared/config/tokens';
import type { Workflow } from '../types';
import { 
  Settings, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Pause 
} from 'lucide-react';

interface WorkflowsListProps {
  workflows: Workflow[];
}

export function WorkflowsList({ workflows }: WorkflowsListProps) {
  const getStateIcon = (state: Workflow['state']) => {
    switch (state) {
      case 'active':
        return <CheckCircle2 size={16} color={T.green} />;
      case 'disabled_manually':
      case 'disabled_inactivity':
        return <Pause size={16} color={T.text3} />;
      default:
        return <XCircle size={16} color={T.red} />;
    }
  };

  const getStateLabel = (state: Workflow['state']) => {
    switch (state) {
      case 'active':
        return 'Ativo';
      case 'disabled_manually':
        return 'Desativado';
      case 'disabled_inactivity':
        return 'Inativo';
      case 'deleted':
        return 'Deletado';
      default:
        return state;
    }
  };

  if (workflows.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 48, 
        color: T.text2 
      }}>
        <Settings size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
        <p>Nenhum workflow encontrado.</p>
        <p style={{ fontSize: 13 }}>
          Crie um arquivo .github/workflows/*.yml para começar.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {workflows.map(workflow => (
        <div
          key={workflow.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            backgroundColor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Settings size={20} color={T.text2} />
            <div>
              <div style={{ 
                color: T.text1, 
                fontWeight: 500,
                fontSize: 14,
              }}>
                {workflow.name}
              </div>
              <div style={{ 
                color: T.text3, 
                fontSize: 12,
                marginTop: 2,
              }}>
                {workflow.path}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: T.text2,
            }}>
              {getStateIcon(workflow.state)}
              {getStateLabel(workflow.state)}
            </div>
            
            <a
              href={workflow.html_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: T.accent,
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              <ExternalLink size={14} />
              Ver no GitHub
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
