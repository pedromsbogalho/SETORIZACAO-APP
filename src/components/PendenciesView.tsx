/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Person, Family, Visit } from '../types';
import { AlertTriangle, CheckCircle, Smartphone, Mail, Globe, Users, Home, Map, BookOpen, Clock, HelpCircle } from 'lucide-react';

interface PendenciesViewProps {
  people: Person[];
  onUpdatePeople: (newPeople: Person[]) => void;
  families: Family[];
  onUpdateFamilies: (newFamilies: Family[]) => void;
  isDark: boolean;
}

interface SmartPendency {
  id: string;
  type: 'post_outorga' | 'whats_group' | 'no_sector' | 'no_af' | 'no_phone';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  targetId: string; // ID of person or family
  targetName: string;
}

export default function PendenciesView({ people, onUpdatePeople, families, onUpdateFamilies, isDark }: PendenciesViewProps) {
  const [resolverPendency, setResolverPendency] = useState<SmartPendency | null>(null);
  const [resolveValue, setResolveValue] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // 1. Detect: Pessoa recebeu Ohikari mas não concluiu Pós-Outorga
  const outorgaPendencies: SmartPendency[] = people
    .filter(p => p.tipoCadastro === 'Ohikari' && !Object.values(p.cursoPosOutorga.aulas).every(v => v === 'Concluido'))
    .map(p => {
      const completedCount = Object.values(p.cursoPosOutorga.aulas).filter(v => v === 'Concluido').length;
      return {
        id: `p-outorga-${p.id}`,
        type: 'post_outorga',
        title: 'Ohikari pendente de Pós-Outorga',
        description: `Membro outorgado mas completou apenas ${completedCount} de 5 aulas do Curso Pós-Outorga.`,
        severity: 'medium',
        targetId: p.id,
        targetName: p.nome
      };
    });

  // 2. Detect: Pessoa ingressou mas ainda não entrou nos grupos do Whats
  const whatsPendencies: SmartPendency[] = people
    .filter(p => p.jornadaEtapa !== 'Primeiro atendimento' && (!p.gruposWhats.grupoSetor || !p.gruposWhats.grupoGeral))
    .map(p => ({
      id: `p-whats-${p.id}`,
      type: 'whats_group',
      title: 'Ausente dos grupos de WhatsApp',
      description: `Integrado na jornada espiritual, mas ainda não participa do grupo do setor ou geral da unidade.`,
      severity: 'low',
      targetId: p.id,
      targetName: p.nome
    }));

  // 5. Detect: Pessoa cadastrada sem setor
  const noSectorPendencies: SmartPendency[] = people
    .filter(p => !p.setor2)
    .map(p => ({
      id: `p-sector-${p.id}`,
      type: 'no_sector',
      title: 'Ficha cadastral sem Setor Externo',
      description: 'Pessoa não está vinculada a nenhum setor territorial e Assistente de Ministro.',
      severity: 'high',
      targetId: p.id,
      targetName: p.nome
    }));

  // 6. Detect: Pessoa sem Assistente de Família (AF2)
  const noAFPendencies: SmartPendency[] = people
    .filter(p => !p.af2)
    .map(p => ({
      id: `p-af-${p.id}`,
      type: 'no_af',
      title: 'Pessoa sem Assistente de Família',
      description: 'Acompanhamento residencial incompleto devido à falta de AF responsável.',
      severity: 'medium',
      targetId: p.id,
      targetName: p.nome
    }));

  // 7. Detect: Pessoa sem telefone cadastrado
  const noPhonePendencies: SmartPendency[] = people
    .filter(p => !p.celularPrincipal)
    .map(p => ({
      id: `p-phone-${p.id}`,
      type: 'no_phone',
      title: 'Pessoa sem celular de contato',
      description: 'Impossível realizar comunicações SMS ou envio de informativos mensais por WhatsApp.',
      severity: 'medium',
      targetId: p.id,
      targetName: p.nome
    }));

  const allPendencies = [
    ...outorgaPendencies,
    ...whatsPendencies,
    ...noSectorPendencies,
    ...noAFPendencies,
    ...noPhonePendencies
  ];

  const filteredPendencies = allPendencies.filter(p => {
    if (selectedType === 'ALL') return true;
    return p.type === selectedType;
  });

  // Quick Resolve trigger
  const handleResolve = (pendency: SmartPendency) => {
    setResolverPendency(pendency);
    setResolveValue('');
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolverPendency) return;

    const { type, targetId } = resolverPendency;

    if (type === 'no_phone') {
      if (!resolveValue.trim()) return;
      onUpdatePeople(people.map(p => p.id === targetId ? { ...p, celularPrincipal: resolveValue, telefoneContato: resolveValue } : p));
    } else if (type === 'no_sector') {
      if (!resolveValue.trim()) return;
      onUpdatePeople(people.map(p => p.id === targetId ? { ...p, setor2: resolveValue.toUpperCase(), am: 'PROF DANI' } : p));
    } else if (type === 'no_af') {
      if (!resolveValue.trim()) return;
      onUpdatePeople(people.map(p => p.id === targetId ? { ...p, af2: resolveValue.toUpperCase() } : p));
    } else if (type === 'whats_group') {
      onUpdatePeople(people.map(p => p.id === targetId ? { ...p, gruposWhats: { grupoSetor: true, grupoGeral: true, grupoLar: p.gruposWhats.grupoLar } } : p));
    } else if (type === 'post_outorga') {
      onUpdatePeople(people.map(p => p.id === targetId ? {
        ...p,
        cursoPosOutorga: { aulas: { 1: 'Concluido', 2: 'Concluido', 3: 'Concluido', 4: 'Concluido', 5: 'Concluido' } },
        jornadaEtapa: 'Torna-se membro ativo'
      } : p));
    }

    setResolverPendency(null);
    alert('Pendência resolvida com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Pendências Inteligentes de Acompanhamento</h2>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          O sistema monitora constantemente os cadastros para garantir que ninguém fique desassistido ou com etapas incompletas.
        </p>
      </div>

      {/* Stats indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-panel flex items-center gap-3 shadow-sm">
          <span className="p-2.5 rounded-lg bg-red-500/10 text-red-500">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Alertas Críticos</span>
            <h4 className="text-lg font-bold font-sans text-red-500">{allPendencies.length} pendências</h4>
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel flex items-center gap-3 shadow-sm">
          <span className="p-2.5 rounded-lg bg-orange-500/10 text-orange-500">
            <Map className="w-5 h-5" />
          </span>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Sem Setor Externo</span>
            <h4 className="text-lg font-bold font-sans text-orange-500">
              {allPendencies.filter(p => p.type === 'no_sector').length} fichas
            </h4>
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel flex items-center gap-3 shadow-sm">
          <span className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Smartphone className="w-5 h-5" />
          </span>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Contatos Incompletos</span>
            <h4 className="text-lg font-bold font-sans text-teal-600 dark:text-teal-400 font-display">
              {allPendencies.filter(p => p.type === 'no_phone').length} cadastros
            </h4>
          </div>
        </div>
      </div>

      {/* Pendencies list workspace */}
      <div className="p-6 rounded-xl glass-panel shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/40 dark:border-white/5 gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-sans font-bold">Workspace de Ações de Resolução</h3>
            {/* Filter Dropdown */}
            <select
              id="filter-pendency-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`text-xs py-1 px-2 rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none`}
            >
              <option value="ALL">Todas as Pendências ({allPendencies.length})</option>
              <option value="post_outorga">Pós-Outorga Incompleto ({allPendencies.filter(p => p.type === 'post_outorga').length})</option>
              <option value="whats_group">Ausente do WhatsApp ({allPendencies.filter(p => p.type === 'whats_group').length})</option>
              <option value="no_sector">Ficha Sem Setor Externo ({allPendencies.filter(p => p.type === 'no_sector').length})</option>
              <option value="no_af">Sem Assistente de Família ({allPendencies.filter(p => p.type === 'no_af').length})</option>
              <option value="no_phone">Sem Celular de Contato ({allPendencies.filter(p => p.type === 'no_phone').length})</option>
            </select>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 tracking-wider">Automação de Processos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPendencies.map(pendency => {
            let colorClass = 'border-l-4 border-l-red-500 bg-red-500/5 dark:bg-red-950/10';
            if (pendency.severity === 'medium') {
              colorClass = 'border-l-4 border-l-orange-500 bg-orange-500/5 dark:bg-orange-950/10';
            } else if (pendency.severity === 'low') {
              colorClass = 'border-l-4 border-l-teal-500 bg-teal-500/5 dark:bg-teal-950/10';
            }

            return (
              <div 
                key={pendency.id}
                className={`p-4 rounded-xl border border-slate-200/40 dark:border-white/5 ${colorClass} flex flex-col justify-between gap-3 text-xs`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-tight">{pendency.title}</span>
                    <span className="text-[9px] font-mono font-bold text-teal-600 dark:text-teal-400">{pendency.targetId}</span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-zinc-100 mt-1">{pendency.targetName}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-0.5">{pendency.description}</p>
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    id={`btn-resolve-${pendency.id}`}
                    onClick={() => handleResolve(pendency)}
                    className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    Resolver Pendência
                  </button>
                </div>
              </div>
            );
          })}

          {filteredPendencies.length === 0 && (
            <div className="col-span-2 py-12 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold">Nenhuma pendência encontrada!</p>
              <p className="text-xs text-zinc-400 font-medium">Os cadastros selecionados estão em perfeita conformidade.</p>
            </div>
          )}
        </div>
      </div>

      {/* Resolution Modal Popup */}
      {resolverPendency && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-sm rounded-xl p-5 backdrop-blur-lg ${isDark ? 'bg-zinc-900/95 text-zinc-100 border border-white/10' : 'bg-white/95 text-zinc-900 border border-slate-200/60'} shadow-2xl space-y-4`}>
            <div>
              <span className="text-[9px] font-mono text-zinc-400 block uppercase tracking-wider">RESOLVER PENDÊNCIA</span>
              <h4 className="font-bold text-sm uppercase text-teal-600 dark:text-teal-400 font-display">{resolverPendency.title}</h4>
              <p className="text-[10px] text-zinc-500 mt-1">Beneficiário: <strong className="text-zinc-700 dark:text-zinc-300">{resolverPendency.targetName}</strong></p>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              {resolverPendency.type === 'no_phone' && (
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Celular Principal (WhatsApp)</label>
                  <input 
                    id="resolve-phone-input"
                    type="text"
                    required
                    placeholder="EX: 12997367868"
                    value={resolveValue}
                    onChange={(e) => setResolveValue(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'} focus:outline-none`}
                  />
                </div>
              )}

              {resolverPendency.type === 'no_sector' && (
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Atribuir Setor Externo</label>
                  <input 
                    id="resolve-sector-input"
                    type="text"
                    required
                    placeholder="EX: CENTRO-NORTE ou SUL"
                    value={resolveValue}
                    onChange={(e) => setResolveValue(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'} focus:outline-none`}
                  />
                </div>
              )}

              {resolverPendency.type === 'no_af' && (
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Nome do Assistente de Família (AF)</label>
                  <input 
                    id="resolve-af-input"
                    type="text"
                    required
                    placeholder="EX: PAULO ou MARTA"
                    value={resolveValue}
                    onChange={(e) => setResolveValue(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'} focus:outline-none`}
                  />
                </div>
              )}

              {resolverPendency.type === 'whats_group' && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Confirmar a inclusão da pessoa nos canais e grupos de notícias oficiais do WhatsApp?</p>
              )}

              {resolverPendency.type === 'post_outorga' && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Confirmar conclusão das 5 aulas teológicas e marcar curso pós-outorga como concluído?</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  id="btn-cancel-resolve"
                  type="button" 
                  onClick={() => setResolverPendency(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200/40 dark:border-white/10 text-[10px] font-bold bg-white/40 dark:bg-zinc-900/60 cursor-pointer text-slate-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button 
                  id="btn-save-resolve"
                  type="submit" 
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold cursor-pointer shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
