/**
 * widgets/github/WorkflowStatusBadge.tsx
 * Badge para status de GitHub Actions workflows
 */

import React from 'react';
import { CheckCircle, XCircle, Clock, Circle, Ban, AlertTriangle } from 'lucide-react';

export interface WorkflowStatusBadgeProps {
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animated?: boolean;
}

export const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({
  status,
  conclusion,
  size = 'md',
  showText = true,
  animated = true,
}) => {
  const getConfig = () => {
    // Status: completed
    if (status === 'completed' && conclusion) {
      switch (conclusion) {
        case 'success':
          return {
            icon: <CheckCircle size={getSizeValue()} />,
            color: '#22C997',
            bg: '#0F2A1E',
            text: 'Sucesso',
          };
        case 'failure':
          return {
            icon: <XCircle size={getSizeValue()} />,
            color: '#E55353',
            bg: '#2A1010',
            text: 'Falha',
          };
        case 'cancelled':
          return {
            icon: <Ban size={getSizeValue()} />,
            color: '#888',
            bg: '#1A1A1A',
            text: 'Cancelado',
          };
        case 'timed_out':
          return {
            icon: <Clock size={getSizeValue()} />,
            color: '#F5A623',
            bg: '#2A1E0A',
            text: 'Timeout',
          };
        case 'skipped':
        case 'neutral':
          return {
            icon: <Circle size={getSizeValue()} />,
            color: '#888',
            bg: '#1A1A1A',
            text: 'Ignorado',
          };
        case 'action_required':
          return {
            icon: <AlertTriangle size={getSizeValue()} />,
            color: '#F5A623',
            bg: '#2A1E0A',
            text: 'Ação Necessária',
          };
      }
    }

    // Status: in_progress
    if (status === 'in_progress') {
      return {
        icon: <Clock size={getSizeValue()} />,
        color: '#4BA3F5',
        bg: '#0A1E2A',
        text: 'Em execução',
      };
    }

    // Status: queued
    return {
      icon: <Clock size={getSizeValue()} />,
      color: '#888',
      bg: '#1A1A1A',
      text: 'Na fila',
    };
  };

  const getSizeValue = () => {
    switch (size) {
      case 'sm':
        return 12;
      case 'md':
        return 14;
      case 'lg':
        return 16;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '4px 8px';
      case 'md':
        return '6px 10px';
      case 'lg':
        return '8px 12px';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 'var(--text-2xs, 10px)';
      case 'md':
        return 'var(--text-xs, 11px)';
      case 'lg':
        return 'var(--text-sm, 12px)';
    }
  };

  const config = getConfig();
  const isInProgress = status === 'in_progress';

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded"
      style={{
        padding: getPadding(),
        background: config.bg,
        border: `1px solid ${config.color}`,
        color: config.color,
        fontSize: getFontSize(),
        fontWeight: 500,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          animation: isInProgress && animated ? 'spin 2s linear infinite' : undefined,
        }}
      >
        {config.icon}
      </span>
      
      {showText && <span>{config.text}</span>}
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
