/**
 * widgets/github/PRStatusBadge.tsx
 * Badge visual para status de Pull Request
 */

import React from 'react';
import { GitPullRequest, GitMerge, X, CheckCircle, Circle, AlertCircle } from 'lucide-react';

export interface PRStatusBadgeProps {
  status: 'open' | 'closed' | 'merged' | 'draft';
  mergeable?: boolean;
  checks?: 'success' | 'failure' | 'pending' | 'none';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const PRStatusBadge: React.FC<PRStatusBadgeProps> = ({
  status,
  mergeable,
  checks,
  size = 'md',
  showText = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'open':
        return {
          icon: <GitPullRequest size={getSizeValue()} />,
          color: '#22C997',
          bg: '#0F2A1E',
          text: 'Aberto',
        };
      case 'merged':
        return {
          icon: <GitMerge size={getSizeValue()} />,
          color: '#8B5CF6',
          bg: '#1E0F2A',
          text: 'Merged',
        };
      case 'closed':
        return {
          icon: <X size={getSizeValue()} />,
          color: '#E55353',
          bg: '#2A1010',
          text: 'Fechado',
        };
      case 'draft':
        return {
          icon: <Circle size={getSizeValue()} />,
          color: '#888',
          bg: '#1A1A1A',
          text: 'Rascunho',
        };
    }
  };

  const getChecksIcon = () => {
    if (!checks || checks === 'none') return null;

    switch (checks) {
      case 'success':
        return <CheckCircle size={getSizeValue() - 2} style={{ color: '#22C997' }} />;
      case 'failure':
        return <AlertCircle size={getSizeValue() - 2} style={{ color: '#E55353' }} />;
      case 'pending':
        return <Circle size={getSizeValue() - 2} style={{ color: '#F5A623' }} />;
    }
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

  const config = getStatusConfig();

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
      {config.icon}
      
      {showText && <span>{config.text}</span>}
      
      {checks && checks !== 'none' && (
        <>
          <div
            style={{
              width: 1,
              height: getSizeValue(),
              background: config.color,
              opacity: 0.3,
              margin: '0 2px',
            }}
          />
          {getChecksIcon()}
        </>
      )}
      
      {mergeable === false && status === 'open' && (
        <>
          <div
            style={{
              width: 1,
              height: getSizeValue(),
              background: config.color,
              opacity: 0.3,
              margin: '0 2px',
            }}
          />
          <AlertCircle size={getSizeValue() - 2} style={{ color: '#E55353' }} />
        </>
      )}
    </div>
  );
};
