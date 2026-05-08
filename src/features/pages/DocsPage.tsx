'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText, Plus, Search, FolderOpen, Clock, Loader2,
  AlertCircle, Edit3, Trash2, Eye, Archive, MoreHorizontal,
  Layout, ChevronRight, BookOpen, Code, Layers, MessageSquare,
  Filter, Sparkles, ArrowUpRight, Share2, Pin
} from 'lucide-react';
import { useDocs } from '@/features/operations/hooks/useDocs';
import type { Doc, DocType } from '@/features/operations/types/doc.types';
import { T, spacing, borderRadius, shadows } from '@/shared/config/index';
import { PageHeader } from '@/shared/ui/PageHeader';

const DocsPage: React.FC = () => {
  const { 
    docs, folders, recentDocs, stats, loading, error, 
    createDoc, searchDocs, publishDoc, archiveDoc, deleteDoc, createFolder 
  } = useDocs();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DocType | 'all'>('all');
  const [newDoc, setNewDoc] = useState({ title: '', type: 'guide' as DocType, content: '' });

  const handleCreate = async () => {
    if (!newDoc.title) return;
    try {
      await createDoc({
        title: newDoc.title,
        type: newDoc.type,
        content: newDoc.content || '',
        tags: [],
      });
      setNewDoc({ title: '', type: 'guide', content: '' });
      setShowNewForm(false);
    } catch (err) {
      console.error('Erro ao criar documento:', err);
    }
  };

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      await searchDocs(searchTerm);
    }
  };

  const filteredDocs = useMemo(() => {
    if (activeCategory === 'all') return docs;
    return docs.filter(d => d.type === activeCategory);
  }, [docs, activeCategory]);

  const getStatusBadge = (status: Doc['status']) => {
    switch (status) {
      case 'published': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Publicado' };
      case 'archived': return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', label: 'Arquivado' };
      default: return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Rascunho' };
    }
  };

  const getTypeInfo = (type: DocType) => {
    switch (type) {
      case 'api': return { icon: <Code size={16} />, label: 'API Reference', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
      case 'architecture': return { icon: <Layers size={16} />, label: 'Arquitetura', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
      case 'readme': return { icon: <BookOpen size={16} />, label: 'Guia Rápido', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'changelog': return { icon: <Clock size={16} />, label: 'Changelog', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' };
      default: return { icon: <FileText size={16} />, label: 'Documentação', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' };
    }
  };

  const CATEGORIES = [
    { id: 'all', label: 'Todos', icon: <Layout size={18} /> },
    { id: 'guide', label: 'Guias', icon: <BookOpen size={18} /> },
    { id: 'api', label: 'API', icon: <Code size={18} /> },
    { id: 'architecture', label: 'Arquitetura', icon: <Layers size={18} /> },
    { id: 'changelog', label: 'Histórico', icon: <Clock size={18} /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: T.bg0 }}>
      {/* Dynamic Header */}
      <div className="px-8 pt-8 pb-6 border-b" style={{ borderColor: T.border, background: `linear-gradient(180deg, ${T.bg1} 0%, ${T.bg0} 100%)` }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full mb-6">
          <PageHeader
            icon={<Sparkles size={20} />}
            title="Knowledge Hub"
            subtitle="Central de conhecimento técnico e operacional"
            actions={
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
                style={{ background: T.accent, color: '#fff', fontSize: '13px' }}
              >
                <Plus size={18} />
                Criar Documento
              </button>
            }
          />
        </div>

        {/* Search & Categories Bar */}
        <div className="max-w-7xl mx-auto w-full mt-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Pesquisar na base de conhecimento... (Press /)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none transition-all duration-300"
              style={{ 
                background: T.bg1, 
                borderColor: T.border, 
                color: T.text1, 
                fontSize: '14px',
                boxShadow: shadows.hover
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold whitespace-nowrap transition-all duration-200`}
                style={{
                  background: activeCategory === cat.id ? T.bg1 : 'transparent',
                  color: activeCategory === cat.id ? T.accent : T.text3,
                  border: `1px solid ${activeCategory === cat.id ? T.accent : 'transparent'}`,
                  fontSize: '13px'
                }}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
        <div className="max-w-7xl mx-auto w-full">
          
          {/* Main Content Area */}
          {loading && docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin mb-4" size={32} style={{ color: T.accent }} />
              <p className="font-medium" style={{ color: T.text3 }}>Indexando conhecimento...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Sidebar: Stats & Folders */}
              <div className="lg:col-span-3 space-y-6">
                <div className="p-6 rounded-2xl border" style={{ background: T.bg1, borderColor: T.border }}>
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: T.text3 }}>Insights</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span style={{ color: T.text2, fontSize: '13px' }}>Documentos</span>
                      <span className="font-bold" style={{ color: T.text1 }}>{stats?.totalDocs || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden" style={{ background: T.bg2 }}>
                       <div className="h-full rounded-full" style={{ background: T.accent, width: `${Math.min(100, (stats?.publishedDocs || 0) / (stats?.totalDocs || 1) * 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[11px]" style={{ color: T.text3 }}>
                      <span>{stats?.publishedDocs || 0} publicados</span>
                      <span>{stats?.draftDocs || 0} rascunhos</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl border" style={{ background: T.bg1, borderColor: T.border }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.text3 }}>Espaços</h3>
                    <button onClick={() => createFolder({ name: 'Nova Pasta' })} className="p-1 hover:bg-(--bg2) rounded-lg transition-colors">
                      <Plus size={16} style={{ color: T.text3 }} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {folders.map(folder => (
                      <div key={folder.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-(--bg2) cursor-pointer group transition-all">
                        <FolderOpen size={18} style={{ color: T.amber }} className="group-hover:scale-110 transition-transform" />
                        <span className="flex-1 truncate font-medium" style={{ color: T.text2, fontSize: '13px' }}>{folder.name}</span>
                      </div>
                    ))}
                    {folders.length === 0 && <p className="text-center py-4 text-xs italic" style={{ color: T.text3 }}>Crie pastas para organizar</p>}
                  </div>
                </div>
              </div>

              {/* Main List */}
              <div className="lg:col-span-9">
                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl mb-6 animate-in fade-in slide-in-from-top-4 duration-300" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <AlertCircle size={20} style={{ color: '#ef4444' }} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: '#ef4444' }}>Ocorreu um problema</h4>
                      <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{error}</p>
                    </div>
                  </div>
                )}

                {showNewForm && (
                  <div className="rounded-3xl border p-8 mb-8 shadow-2xl animate-in zoom-in-95 duration-300" style={{ background: T.bg1, borderColor: T.border }}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold" style={{ color: T.text1 }}>Compor Novo Conhecimento</h3>
                      <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Archive size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider ml-1" style={{ color: T.text3 }}>Título</label>
                        <input
                          type="text"
                          placeholder="Título impactante..."
                          value={newDoc.title}
                          onChange={(e) => setNewDoc(s => ({ ...s, title: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 ring-blue-500/20"
                          style={{ background: T.bg2, borderColor: T.border, color: T.text1, fontSize: '14px' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider ml-1" style={{ color: T.text3 }}>Tipo de Recurso</label>
                        <select
                          value={newDoc.type}
                          onChange={(e) => setNewDoc(s => ({ ...s, type: e.target.value as DocType }))}
                          className="w-full px-4 py-3 rounded-xl border outline-none cursor-pointer appearance-none"
                          style={{ background: T.bg2, borderColor: T.border, color: T.text1, fontSize: '14px' }}
                        >
                          <option value="guide">📖 Guia do Usuário</option>
                          <option value="api">⚙️ API Reference</option>
                          <option value="architecture">🏗️ Arquitetura</option>
                          <option value="changelog">🚀 Changelog</option>
                          <option value="other">📄 Documento Geral</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2 mb-6">
                      <label className="text-xs font-bold uppercase tracking-wider ml-1" style={{ color: T.text3 }}>Conteúdo</label>
                      <textarea
                        placeholder="Descreva o conhecimento aqui... (Markdown habilitado)"
                        value={newDoc.content}
                        onChange={(e) => setNewDoc(s => ({ ...s, content: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border outline-none min-h-60 resize-none font-mono"
                        style={{ background: T.bg2, borderColor: T.border, color: T.text1, fontSize: '13px' }}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowNewForm(false)} className="px-6 py-2.5 rounded-xl font-bold transition-colors" style={{ background: T.bg2, color: T.text2, fontSize: '13px' }}>
                        Descartar
                      </button>
                      <button onClick={handleCreate} className="px-8 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105" style={{ background: T.accent, color: '#fff', fontSize: '13px' }}>
                        Salvar e Publicar
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocs.map((doc, idx) => {
                    const info = getTypeInfo(doc.type);
                    const badge = getStatusBadge(doc.status);
                    return (
                      <div 
                        key={doc.id} 
                        className="group relative p-6 rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1" 
                        style={{ 
                          background: T.bg1, 
                          borderColor: T.border,
                          animationDelay: `${idx * 50}ms`
                        }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 rounded-2xl shadow-sm" style={{ background: info.bg, color: info.color }}>
                            {info.icon}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => deleteDoc(doc.id)} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                              <Trash2 size={16} />
                            </button>
                            <button className="p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
                              <MoreHorizontal size={18} />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-base font-bold mb-1 truncate" style={{ color: T.text1 }}>{doc.title}</h4>
                        <p className="text-xs line-clamp-2 mb-4" style={{ color: T.text3 }}>{doc.content || 'Sem descrição disponível para este documento.'}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t" style={{ borderColor: T.bg2 }}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center overflow-hidden">
                              <span className="text-[10px] font-bold text-blue-600">UN</span>
                            </div>
                            <span style={{ fontSize: '11px', color: T.text3 }}>Atualizado 2h atrás</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Hover reveal link */}
                        <div className="absolute top-4 right-4 group-hover:block hidden">
                           <ArrowUpRight size={20} className="text-blue-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!loading && filteredDocs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6" style={{ background: T.bg1 }}>
                      <FileText size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: T.text1 }}>Nenhum conhecimento encontrado</h3>
                    <p className="max-w-xs text-sm" style={{ color: T.text3 }}>Refine sua busca ou crie um novo documento para começar a construir sua base.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
