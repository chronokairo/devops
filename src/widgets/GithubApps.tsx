import React from 'react';
import { Github, ExternalLink, Shield, CheckCircle } from 'lucide-react';

const GithubApps = () => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5">
    <div className="flex items-center gap-3 mb-2">
      <Github size={22} className="text-[#1d4147]" />
      <h3 className="font-semibold text-[#1d4147]">GitHub OAuth — ThinkTrack</h3>
      <span className="text-xs border border-green-400 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
        <CheckCircle size={11} /> OAuth 2.0
      </span>
    </div>
    <p className="text-sm text-gray-500 mb-4">
      Integração segura com GitHub via Firebase Authentication. Tokens OAuth são gerenciados automaticamente por usuário.
    </p>

    <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl mb-4">
      <p className="font-medium">✅ Integração ativa: Firebase Auth + GitHub OAuth</p>
      <p className="text-xs mt-0.5 text-green-600">Usuários fazem login com GitHub e acessam seus dados automaticamente via tokens OAuth seguros.</p>
    </div>

    <hr className="border-gray-100 mb-4" />

    <div>
      <p className="text-sm font-semibold text-[#1d4147] flex items-center gap-2 mb-3">
        <Shield size={15} /> Segurança e Autenticação
      </p>
      <ul className="flex flex-col gap-2">
        {[
          ['Tokens OAuth por usuário:', 'Cada usuário tem seu próprio token seguro'],
          ['Armazenamento seguro:', 'Tokens criptografados no Firestore'],
          ['Sem configuração manual:', 'Login automático via Firebase Auth'],
          ['Scopes controlados:', 'repo, user:email, read:org, project'],
        ].map(([k, v]) => (
          <li key={k} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle size={14} className="text-green-500 shrink-0" />
            <span><strong className="text-[#1d4147]">{k}</strong> {v}</span>
          </li>
        ))}
      </ul>
    </div>

    <hr className="border-gray-100 my-4" />

    <a href="https://github.com/settings/applications" target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-[#3e838c] hover:underline font-medium">
      <ExternalLink size={14} /> Gerenciar em GitHub.com
    </a>
  </div>
);

export default GithubApps;
