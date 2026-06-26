/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Person } from '../types';
import { BookOpen, CheckCircle, Award, Calendar, User, Search, Play, HelpCircle, Clock } from 'lucide-react';

interface CoursesViewProps {
  people: Person[];
  onUpdatePeople: (newPeople: Person[]) => void;
  isDark: boolean;
}

export default function CoursesView({ people, onUpdatePeople, isDark }: CoursesViewProps) {
  const [activeTab, setActiveTab] = useState<'iniciacao' | 'pos-outorga'>('iniciacao');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [memberTimeFilter, setMemberTimeFilter] = useState<'all' | 'recent' | '1-3' | '3plus' | 'none'>('all');
  const [selectedPosOutorgaSectors, setSelectedPosOutorgaSectors] = useState<string[]>([]);

  // Extract unique sectors list
  const sectorsList = Array.from(new Set(people.map(p => p.setor2 || 'SEM SETOR').filter(Boolean)));

  // Memoized stats for Curso Pós-Outorga
  const posOutorgaStats = useMemo(() => {
    const lessons: Record<1 | 2 | 3 | 4 | 5, { completed: number; inProgress: number; notStarted: number }> = {
      1: { completed: 0, inProgress: 0, notStarted: 0 },
      2: { completed: 0, inProgress: 0, notStarted: 0 },
      3: { completed: 0, inProgress: 0, notStarted: 0 },
      4: { completed: 0, inProgress: 0, notStarted: 0 },
      5: { completed: 0, inProgress: 0, notStarted: 0 },
    };

    const sectors: Record<string, number> = {};

    const members = people.filter(p => p.subtipoCadastro === 'MEMBRO' || p.tipoCadastro === 'Ohikari');

    members.forEach(m => {
      const aulas = m.cursoPosOutorga?.aulas || {};
      const sector = m.setor2 || 'SEM SETOR';

      let hasParticipated = false;

      ([1, 2, 3, 4, 5] as const).forEach(num => {
        const status = aulas[num] || 'Não iniciou';
        if (status === 'Concluido' || status === 'Concluído') {
          lessons[num].completed++;
          hasParticipated = true;
        } else if (status === 'Em andamento') {
          lessons[num].inProgress++;
          hasParticipated = true;
        } else {
          lessons[num].notStarted++;
        }
      });

      if (hasParticipated) {
        sectors[sector] = (sectors[sector] || 0) + 1;
      }
    });

    return { lessons, sectors };
  }, [people]);

  // Course handlers
  const handleIniciacaoChange = (id: string, field: string, value: any) => {
    const updated = people.map(p => {
      if (p.id === id) {
        const nextIniciacao = { ...p.cursoIniciacao, [field]: value };
        // Auto mark as concluded if presence or date exists
        if (field === 'concluido' && value === true) {
          nextIniciacao.presenca = true;
        }
        return { ...p, cursoIniciacao: nextIniciacao };
      }
      return p;
    });
    onUpdatePeople(updated);
  };

  const handlePosOutorgaLessonToggle = (id: string, lessonNumber: 1 | 2 | 3 | 4 | 5) => {
    const updated = people.map(p => {
      if (p.id === id) {
        const currentStatus = p.cursoPosOutorga.aulas[lessonNumber];
        let nextStatus: 'Não iniciou' | 'Em andamento' | 'Concluído' = 'Não iniciou';
        
        if (currentStatus === 'Não iniciou' || !currentStatus) {
          nextStatus = 'Em andamento';
        } else if (currentStatus === 'Em andamento') {
          nextStatus = 'Concluído';
        } else {
          nextStatus = 'Não iniciou';
        }

        const nextAulas = { ...p.cursoPosOutorga.aulas, [lessonNumber]: nextStatus };
        return {
          ...p,
          cursoPosOutorga: { aulas: nextAulas }
        };
      }
      return p;
    });
    onUpdatePeople(updated);
  };

  const filteredPeople = people.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || (p.setor2 || 'SEM SETOR') === selectedSector;
    return matchesSearch && matchesSector;
  });

  const posOutorgaFiltered = useMemo(() => {
    let list = filteredPeople.filter(p => p.subtipoCadastro === 'MEMBRO' || p.tipoCadastro === 'Ohikari');

    if (memberTimeFilter !== 'all') {
      list = list.filter(p => {
        const ano = p.anoOutorga ? Number(p.anoOutorga) : null;
        if (!ano) return memberTimeFilter === 'none';
        const currentYear = 2026;
        const diff = currentYear - ano;
        if (memberTimeFilter === 'recent') return diff <= 1;
        if (memberTimeFilter === '1-3') return diff > 1 && diff <= 3;
        if (memberTimeFilter === '3plus') return diff > 3;
        return true;
      });
    }

    if (selectedPosOutorgaSectors.length > 0) {
      list = list.filter(p => selectedPosOutorgaSectors.includes(p.setor2 || 'SEM SETOR'));
    }

    return list;
  }, [filteredPeople, memberTimeFilter, selectedPosOutorgaSectors]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Controle de Cursos e Formação Teológica</h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Acompanhe o preenchimento de requisitos espirituais fundamentais da Igreja Messiânica Mundial.
          </p>
        </div>

        {/* Tab switchers */}
        <div className={`p-1 rounded-lg border flex gap-1 backdrop-blur-md ${isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-100/40 border-slate-200'}`}>
          <button 
            id="tab-iniciacao"
            onClick={() => setActiveTab('iniciacao')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'iniciacao' 
                ? 'bg-teal-600 text-white shadow-xs' 
                : 'text-zinc-500 hover:text-teal-500'
            }`}
          >
            Curso de Iniciação
          </button>
          <button 
            id="tab-pos-outorga"
            onClick={() => setActiveTab('pos-outorga')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'pos-outorga' 
                ? 'bg-teal-600 text-white shadow-xs' 
                : 'text-zinc-500 hover:text-teal-500'
            }`}
          >
            Curso Pós-Outorga (5 Aulas)
          </button>
        </div>
      </div>

      {/* Global Filter Bar with Search and Sector Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-teal-600 dark:text-teal-400" />
          <input 
            id="course-search"
            type="text"
            placeholder="Buscar por nome para acompanhar cursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-850 text-zinc-100 focus:border-teal-500' : 'bg-white/60 border-slate-200 text-slate-900 focus:border-teal-500'} focus:outline-none backdrop-blur-xs`}
          />
        </div>

        <div>
          <select
            id="course-sector-filter"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className={`w-full p-2 py-2 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-850 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none`}
          >
            <option value="ALL">Todos os Setores</option>
            {sectorsList.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab 1: Curso de Iniciação */}
      {activeTab === 'iniciacao' && (
        <div className="p-6 rounded-xl glass-panel shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-white/5">
            <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-sans font-bold">Participantes e Conclusão do Curso de Iniciação</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b border-slate-200/40 dark:border-white/5 font-mono text-[10px] uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">Status Geral</th>
                  <th className="py-2.5 px-3">Data da Aula</th>
                  <th className="py-2.5 px-3">Instrutor</th>
                  <th className="py-2.5 px-3">Frequência</th>
                  <th className="py-2.5 px-3 text-right">Aprovação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredPeople.map(p => {
                  const ci = p.cursoIniciacao;
                  return (
                    <tr key={p.id} className="hover:bg-slate-100/30 dark:hover:bg-zinc-850/20">
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {p.nome}
                        <span className="block text-[10px] text-zinc-400 font-normal">{p.subtipoCadastro} • {p.setor2 || 'Sem Setor'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ci.concluido 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {ci.concluido ? 'CONCLUÍDO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <input 
                            id={`ci-date-${p.id}`}
                            type="date" 
                            value={ci.data || ''} 
                            onChange={(e) => handleIniciacaoChange(p.id, 'data', e.target.value)}
                            className={`p-1 rounded border text-[10px] ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-700'} focus:outline-none font-mono`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <input 
                            id={`ci-instructor-${p.id}`}
                            type="text" 
                            placeholder="Nome do Instrutor"
                            value={ci.instrutor || ''} 
                            onChange={(e) => handleIniciacaoChange(p.id, 'instrutor', e.target.value)}
                            className={`p-1 rounded border text-[10px] w-32 ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-700'} focus:outline-none`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <label className="flex items-center gap-1.5 select-none cursor-pointer">
                          <input 
                            id={`ci-presenca-${p.id}`}
                            type="checkbox" 
                            checked={ci.presenca}
                            onChange={(e) => handleIniciacaoChange(p.id, 'presenca', e.target.checked)}
                            className="rounded accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="font-medium text-slate-700 dark:text-zinc-300">Presença</span>
                        </label>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <label className="inline-flex items-center gap-1.5 select-none cursor-pointer">
                          <input 
                            id={`ci-concluido-${p.id}`}
                            type="checkbox" 
                            checked={ci.concluido}
                            onChange={(e) => handleIniciacaoChange(p.id, 'concluido', e.target.checked)}
                            className="rounded accent-teal-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="font-bold text-teal-600 dark:text-teal-400">Aprovado</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Curso Pós-Outorga (5 Aulas) */}
      {activeTab === 'pos-outorga' && (
        <div className="p-6 rounded-xl glass-panel shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-sans font-bold">Acompanhamento das 5 Aulas Teológicas do Curso Pós-Outorga</h3>
            </div>
          </div>

          {/* Time Filter Option */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200/30 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Tempo de Outorga (Tempo de Membro):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'recent', '1-3', '3plus', 'none'] as const).map(option => {
                const labels = {
                  all: 'Todos',
                  recent: 'Recente (≤ 1 ano)',
                  '1-3': '1 a 3 anos',
                  '3plus': 'Mais de 3 anos',
                  none: 'Sem ano'
                };
                return (
                  <button
                    key={option}
                    onClick={() => setMemberTimeFilter(option)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      memberTimeFilter === option
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-slate-50'
                    }`}
                  >
                    {labels[option]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lessons Cards */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Pessoas por Aula</h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {([1, 2, 3, 4, 5] as const).map(lessonNum => {
                const stats = posOutorgaStats.lessons[lessonNum];
                return (
                  <div key={lessonNum} className="p-3.5 rounded-xl border border-slate-200/40 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
                    <span className="block text-xs font-bold text-teal-600 dark:text-teal-400 font-display">Aula {lessonNum}</span>
                    <div className="mt-2 space-y-1.5 text-[10px] font-mono">
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Fizeram:</span>
                        <span>{stats.completed}</span>
                      </div>
                      <div className="flex justify-between text-orange-500 font-semibold">
                        <span>Fazendo:</span>
                        <span>{stats.inProgress}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Pendente:</span>
                        <span>{stats.notStarted}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sectors Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Participantes por Setor (Clique para filtrar/combinar)</h4>
              {selectedPosOutorgaSectors.length > 0 && (
                <button
                  onClick={() => setSelectedPosOutorgaSectors([])}
                  className="text-[10px] text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-semibold cursor-pointer underline underline-offset-2"
                >
                  Limpar filtro de setores
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(posOutorgaStats.sectors).map(([sectorName, count]) => {
                const isSelected = selectedPosOutorgaSectors.includes(sectorName);
                const hasFiltersActive = selectedPosOutorgaSectors.length > 0;
                
                let cardClass = "";
                if (isSelected) {
                  cardClass = "bg-teal-600 border-teal-600 text-white shadow-xs font-bold scale-102";
                } else if (hasFiltersActive) {
                  cardClass = "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/10 text-zinc-400 dark:text-zinc-500 opacity-50 hover:opacity-80";
                } else {
                  cardClass = "border-teal-500/10 bg-teal-500/5 text-teal-700 dark:text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/20";
                }

                return (
                  <button
                    key={sectorName}
                    onClick={() => {
                      setSelectedPosOutorgaSectors(prev => {
                        if (prev.includes(sectorName)) {
                          return prev.filter(s => s !== sectorName);
                        } else {
                          return [...prev, sectorName];
                        }
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] uppercase flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${cardClass}`}
                  >
                    {isSelected ? (
                      <CheckCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                    )}
                    {sectorName}: {count} {count === 1 ? 'membro' : 'membros'}
                  </button>
                );
              })}
              {Object.keys(posOutorgaStats.sectors).length === 0 && (
                <div className="text-[10px] text-zinc-400 italic">Nenhum membro participando ativamente das aulas no momento.</div>
              )}
            </div>
          </div>

          <p className="text-xs text-zinc-400 italic">
            💡 Dica: Clique no botão da aula para alternar entre: <span className="text-red-400 font-semibold">Não iniciou</span> ➔ <span className="text-orange-500 font-semibold">Em andamento</span> ➔ <span className="text-emerald-500 font-semibold">Concluído</span>.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b border-slate-200/40 dark:border-white/5 font-mono text-[10px] uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <th className="py-2.5 px-3">Membro Outorgado</th>
                  <th className="py-2.5 px-3">Progresso</th>
                  <th className="py-2.5 px-3 text-center">Aula 1</th>
                  <th className="py-2.5 px-3 text-center">Aula 2</th>
                  <th className="py-2.5 px-3 text-center">Aula 3</th>
                  <th className="py-2.5 px-3 text-center">Aula 4</th>
                  <th className="py-2.5 px-3 text-center">Aula 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {posOutorgaFiltered.map(p => {
                  const aulas = p.cursoPosOutorga.aulas;
                  const completedCount = Object.values(aulas).filter(v => v === 'Concluido' || v === 'Concluído').length;
                  const progressPercentage = completedCount * 20;

                  return (
                    <tr key={p.id} className="hover:bg-slate-100/30 dark:hover:bg-zinc-850/20">
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {p.nome}
                        <span className="block text-[10px] text-zinc-400 font-normal">Outorgado: {p.anoOutorga || 'N/A'} • Setor: {p.setor2 || 'N/A'}</span>
                      </td>
                      
                      {/* Progress gauge bar */}
                      <td className="py-3 px-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-200/30 dark:bg-zinc-850 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                progressPercentage === 100 ? 'bg-emerald-500' : progressPercentage > 40 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-zinc-600 dark:text-zinc-200">
                            {progressPercentage}%
                          </span>
                        </div>
                      </td>

                      {/* Lesson buttons */}
                      {([1, 2, 3, 4, 5] as const).map(lessonNum => {
                        const lessonStatus = aulas[lessonNum] || 'Não iniciou';
                        let btnStyle = 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-400 border border-zinc-200 dark:border-zinc-700';
                        if (lessonStatus === 'Concluido' || lessonStatus === 'Concluído') {
                          btnStyle = 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold border border-emerald-600 shadow-xs';
                        } else if (lessonStatus === 'Em andamento') {
                          btnStyle = 'bg-orange-500 hover:bg-orange-600 text-white font-bold border border-orange-500 shadow-xs';
                        }

                        return (
                          <td key={lessonNum} className="py-3 px-1 text-center">
                            <button 
                              id={`btn-toggle-lesson-${p.id}-${lessonNum}`}
                              onClick={() => handlePosOutorgaLessonToggle(p.id, lessonNum)}
                              className={`px-3 py-1 text-[10px] rounded transition-colors cursor-pointer w-22 font-semibold ${btnStyle}`}
                            >
                              {lessonStatus}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {posOutorgaFiltered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400 italic">
                      Nenhum membro outorgado encontrado para acompanhar o curso pós-outorga com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
