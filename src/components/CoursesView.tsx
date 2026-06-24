/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Person } from '../types';
import { BookOpen, CheckCircle, Award, Calendar, User, Search, Play, HelpCircle } from 'lucide-react';

interface CoursesViewProps {
  people: Person[];
  onUpdatePeople: (newPeople: Person[]) => void;
  isDark: boolean;
}

export default function CoursesView({ people, onUpdatePeople, isDark }: CoursesViewProps) {
  const [activeTab, setActiveTab] = useState<'iniciacao' | 'pos-outorga'>('iniciacao');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');

  // Extract unique sectors list
  const sectorsList = Array.from(new Set(people.map(p => p.setor2 || 'SEM SETOR').filter(Boolean)));

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
        <div className="p-6 rounded-xl glass-panel shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-white/5">
            <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-sans font-bold">Acompanhamento das 5 Aulas Teológicas do Curso Pós-Outorga</h3>
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
                {filteredPeople.filter(p => p.subtipoCadastro === 'MEMBRO' || p.tipoCadastro === 'Ohikari').map(p => {
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
                {filteredPeople.filter(p => p.subtipoCadastro === 'MEMBRO' || p.tipoCadastro === 'Ohikari').length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400 italic">
                      Nenhum membro outorgado encontrado para acompanhar o curso pós-outorga.
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
