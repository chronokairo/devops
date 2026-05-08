/**
 * GitPage.tsx
 * Página de gerenciamento de repositórios locais estilo GitHub Desktop.
 */
import React from 'react';
import { GitBranch } from 'lucide-react';
import { T, spacing } from '@/shared/config/tokens';
import { PageHeader } from '@/shared/ui/PageHeader';
import { LocalRepoManager } from '@/features/operations/components/LocalRepoManager';

export default function GitPage() {
  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: `${spacing.lg}`, borderBottom: `1px solid ${T.border}`, background: T.bg1 }}>
        <div style={{ maxWidth: '1220px', margin: '0 auto' }}>
          <PageHeader
            icon={<GitBranch size={20} />}
            title="Repositórios"
            subtitle="Gerenciar repositórios locais e sincronização"
          />
        </div>
      </div>
      <LocalRepoManager />
    </div>
  );
}
