/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Person, JornadaEtapa, JornadaMembro, CursosNivelIgreja } from '../types';
import { CheckCircle, Calendar, Sparkles, User, ChevronRight, HelpCircle, AlertCircle, Clock, Heart, Award, BookOpen, Sprout, DollarSign, Activity, FileText, Check, Plus, Minus, Users } from 'lucide-react';

interface JourneyViewProps {
  people: Person[];
  onUpdatePeople: (newPeople: Person[]) => void;
  isDark: boolean;
}

const JOURNEY_STEPS: JornadaEtapa[] = [
  'Primeiro atendimento',
  'Recebe Johrei',
  'Curso de Iniciação',
  'Ingressa',
  'Recebe Ohikari',
  'Curso Pós-Outorga',
  'Conclui Pós-Outorga',
  'Torna-se membro ativo'
];

const STEP_DESCRIPTIONS: Record<JornadaEtapa, string> = {
  'Primeiro atendimento': 'Primeiro contato na unidade, recepção calorosa e preenchimento da ficha básica.',
  'Recebe Johrei': 'Início do recebimento regular do Johrei, entendendo os benefícios da purificação.',
  'Curso de Iniciação': 'Participação e aprovação no curso de ensinamentos básicos e iniciação da fé.',
  'Ingressa': 'Torna-se um frequentador ativo, assinando o termo e preenchendo as fichas necessárias.',
  'Recebe Ohikari': 'Outorga do Medalhão Sagrado (Ohikari), recebendo a permissão para ministrar Johrei.',
  'Curso Pós-Outorga': 'Cinco aulas fundamentais de aprofundamento doutrinário pós-recebimento do Ohikari.',
  'Conclui Pós-Outorga': 'Conclusão das 5 aulas e avaliação pelo Responsável do Johrei Center.',
  'Torna-se membro ativo': 'Plena atividade missionária, participação regular em dízimos de gratidão e reuniões de lar.'
};

export function getJornadaMembro(person?: Person): JornadaMembro {
  const j = (person?.jornadaMembro || {}) as any;
  return {
    donativo: j.donativo || 'Não pratica',
    johreiFrequencia: j.johreiFrequencia || 'Não pratica',
    encaminhadosQuantidade: typeof j.encaminhadosQuantidade === 'number' ? j.encaminhadosQuantidade : 0,
    ikebanaStatus: j.ikebanaStatus || 'Não fez curso',
    cursosNivel: {
      nivel1: j.cursosNivel?.nivel1 || 'Não iniciado',
      nivel2: j.cursosNivel?.nivel2 || 'Não iniciado',
      nivel3: j.cursosNivel?.nivel3 || 'Não iniciado',
      nivel4: j.cursosNivel?.nivel4 || 'Não iniciado',
    },
    jovem3Participacao: j.jovem3Participacao || 'Não',
    purificacoes: {
      saude: !!j.purificacoes?.saude,
      conflito: !!j.purificacoes?.conflito,
      financeiro: !!j.purificacoes?.financeiro,
      outros: !!j.purificacoes?.outros,
      descricao: j.purificacoes?.descricao || '',
    },
    orientacoes: {
      texto: j.orientacoes?.texto || '',
      cumprindo: j.orientacoes?.cumprindo || 'Não se aplica',
    }
  };
}

export default function JourneyView({ people, onUpdatePeople, isDark }: JourneyViewProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>(people[0]?.id || '');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [activeTab, setActiveTab] = useState<'FREQUENTADOR' | 'MEMBRO'>('FREQUENTADOR');
  
  // Advanced filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [pendingFilter, setPendingFilter] = useState<string | null>(null);

  // Extract unique sectors list
  const sectorsList = Array.from(new Set(people.map(p => p.setor2 || 'SEM SETOR').filter(Boolean)));

  // Calculate pending counts per phase
  const pendingCounts = React.useMemo(() => {
    const counts: Record<JornadaEtapa, number> = {
      'Primeiro atendimento': 0,
      'Recebe Johrei': 0,
      'Curso de Iniciação': 0,
      'Ingressa': 0,
      'Recebe Ohikari': 0,
      'Curso Pós-Outorga': 0,
      'Conclui Pós-Outorga': 0,
      'Torna-se membro ativo': 0
    };

    people.forEach(p => {
      const datas = p.jornadaDatas || {};
      for (let i = 1; i < JOURNEY_STEPS.length; i++) {
        const prevStep = JOURNEY_STEPS[i - 1];
        const currStep = JOURNEY_STEPS[i];
        if (datas[prevStep] && !datas[currStep]) {
          counts[currStep]++;
        }
      }
    });

    return counts;
  }, [people]);

  // Filter list of people
  const filteredPeople = people.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === 'ALL' || (p.setor2 || 'SEM SETOR') === sectorFilter;
    
    let matchesStage = stageFilter === 'ALL' || p.jornadaEtapa === stageFilter;
    if (pendingFilter) {
      const datas = p.jornadaDatas || {};
      const stepIdx = JOURNEY_STEPS.indexOf(pendingFilter as JornadaEtapa);
      if (stepIdx > 0) {
        const prevStep = JOURNEY_STEPS[stepIdx - 1];
        matchesStage = !!(datas[prevStep] && !datas[pendingFilter]);
      } else {
        // For first step, none previous
        matchesStage = false;
      }
    }
    
    return matchesSearch && matchesSector && matchesStage;
  });

  // Select the person (fallback to filteredPeople[0] if current choice is filtered out)
  const selectedPerson = people.find(p => p.id === selectedPersonId) || filteredPeople[0] || people[0];

  useEffect(() => {
    if (selectedPerson) {
      setActiveTab(selectedPerson.subtipoCadastro);
    }
  }, [selectedPerson?.id]);

  const handleUpdateJornadaMembro = (updatedField: Partial<JornadaMembro>) => {
    if (!selectedPerson) return;
    const currentJornada = getJornadaMembro(selectedPerson);
    const updatedJornada = { ...currentJornada, ...updatedField };
    
    const updatedPerson: Person = {
      ...selectedPerson,
      jornadaMembro: updatedJornada
    };
    
    onUpdatePeople(people.map(p => p.id === selectedPerson.id ? updatedPerson : p));
  };

  const handleToggleStep = (step: JornadaEtapa, completed: boolean) => {
    if (!selectedPerson) return;

    const updatedDatas = { ...selectedPerson.jornadaDatas };
    if (completed) {
      updatedDatas[step] = customDate;
    } else {
      delete updatedDatas[step];
    }

    // Determine the highest completed step to update 'jornadaEtapa'
    let highestStep: JornadaEtapa = 'Primeiro atendimento';
    for (const s of JOURNEY_STEPS) {
      if (updatedDatas[s]) {
        highestStep = s;
      }
    }

    const updatedPerson: Person = {
      ...selectedPerson,
      jornadaEtapa: highestStep,
      jornadaDatas: updatedDatas,
      // Auto upgrade subtipo if outorgado
      subtipoCadastro: (updatedDatas['Recebe Ohikari'] || highestStep === 'Torna-se membro ativo') ? 'MEMBRO' : 'FREQUENTADOR',
      tipoCadastro: updatedDatas['Recebe Ohikari'] ? 'Ohikari' : 'Frequente'
    };

    onUpdatePeople(people.map(p => p.id === selectedPerson.id ? updatedPerson : p));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Jornada Espiritual e Linha do Tempo</h2>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Acompanhe e administre o progresso e conquistas de cada pessoa, desde o primeiro Johrei recebido até a outorga ministerial.
        </p>
      </div>

      {/* Pending people per phase */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Pessoas Pendentes por Fase (Concluíram a fase anterior, mas não esta)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {JOURNEY_STEPS.map((step, idx) => {
            if (idx === 0) return null; // First step has no previous, so no "pending" concept
            const count = pendingCounts[step] || 0;
            const isSelected = pendingFilter === step;
            return (
              <button
                key={step}
                onClick={() => {
                  setPendingFilter(isSelected ? null : step);
                  setStageFilter('ALL'); // Clear exact stage filter if pending filter is used
                }}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden backdrop-blur-md cursor-pointer ${
                  isSelected
                    ? 'bg-amber-600/10 border-amber-500/50 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'bg-white/40 dark:bg-zinc-900/40 border-slate-200/60 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <span className="block text-[9px] font-mono uppercase tracking-wider opacity-60 truncate" title={step}>{step}</span>
                <span className="block text-xl font-bold font-display mt-1">{count}</span>
                <span className="block text-[8px] text-zinc-400 font-mono mt-0.5">pendentes</span>
                {count > 0 && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Selector list & Filters */}
        <div className="p-4 rounded-xl glass-panel shadow-sm space-y-4">
          <div className="space-y-3">
            <span className="block text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Filtrar Base</span>
            
            {/* Search Input */}
            <input 
              id="journey-search-input"
              type="text"
              placeholder="Buscar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full p-2 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none`}
            />

            {/* Sector filter */}
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Setor (SETOR2)</label>
              <select
                id="journey-sector-filter"
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none`}
              >
                <option value="ALL">Qualquer Setor</option>
                {sectorsList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Stage filter */}
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Etapa da Jornada</label>
              <select
                id="journey-stage-filter"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none`}
              >
                <option value="ALL">Qualquer Etapa</option>
                {JOURNEY_STEPS.map(step => (
                  <option key={step} value={step}>{step}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200/40 dark:border-white/5 pt-3">
            <span className="block text-[10px] font-mono uppercase text-zinc-400 tracking-wider mb-2">Pessoas ({filteredPeople.length})</span>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredPeople.map(p => {
                const active = p.id === selectedPerson?.id;
                const isMembro = p.subtipoCadastro === 'MEMBRO';
                return (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
                      active 
                        ? 'border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-300 font-bold' 
                        : `${isDark ? 'border-zinc-800 bg-zinc-950/10 hover:bg-zinc-800/40 text-zinc-300' : 'border-slate-200/40 bg-white/40 hover:bg-slate-100/50 text-slate-700'}`
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs truncate uppercase">{p.nome}</p>
                      <span className="text-[10px] text-zinc-400 block truncate mt-0.5">Etapa: {p.jornadaEtapa}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ml-2 flex-shrink-0 font-bold ${
                      isMembro 
                        ? 'bg-teal-50/80 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' 
                        : 'bg-orange-50/80 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400'
                    }`}>
                      {p.subtipoCadastro === 'MEMBRO' ? 'MEMBRO' : 'FREQ.'}
                    </span>
                  </div>
                );
              })}
              {filteredPeople.length === 0 && (
                <p className="text-xs text-zinc-500 italic text-center py-4">Nenhuma pessoa atende aos filtros.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Interactive timeline */}
        {selectedPerson ? (
          <div className="p-6 rounded-xl glass-panel md:col-span-2 shadow-sm space-y-6">
            {/* Header selection card */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200/40 dark:border-white/5 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm uppercase">{selectedPerson.nome}</h3>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex gap-2">
                    <span>Cadastro: {selectedPerson.id}</span>
                    <span>•</span>
                    <span>Setor: {selectedPerson.setor2 || 'Sem Setor'}</span>
                  </div>
                </div>
              </div>

              {/* Date picker for adding timestamps */}
              <div className="flex items-center gap-1.5 bg-white/40 dark:bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/10 backdrop-blur-xs">
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Data conquista:</span>
                <input 
                  id="journey-date-picker"
                  type="date" 
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="text-xxs font-mono bg-transparent text-slate-700 dark:text-zinc-200 outline-none"
                />
              </div>
            </div>

            {/* Toggle to switch between FREQUENTADOR and MEMBRO journey */}
            <div className="flex bg-slate-100/80 dark:bg-zinc-950/60 p-1 rounded-xl border border-slate-200/40 dark:border-white/5 w-full sm:w-fit self-center">
              <button
                onClick={() => setActiveTab('FREQUENTADOR')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'FREQUENTADOR'
                    ? 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 shadow-xs border border-slate-200/40 dark:border-white/5'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Frequentador
              </button>
              <button
                onClick={() => setActiveTab('MEMBRO')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'MEMBRO'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-teal-600/80 dark:text-teal-400/80 hover:text-teal-600 dark:hover:text-teal-300'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Membro (Acomp. Contínuo)
              </button>
            </div>

            {activeTab === 'FREQUENTADOR' ? (
              <>
                {/* Vertical timeline */}
                <div className="relative pl-6 space-y-6">
                  {/* Vertical line connector */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-slate-200/30 dark:bg-white/5" />

                  {JOURNEY_STEPS.map((step, idx) => {
                    const dateCompleted = selectedPerson.jornadaDatas[step];
                    const active = selectedPerson.jornadaEtapa === step;
                    
                    return (
                      <div key={step} className="relative flex items-start gap-4">
                        {/* Circle Bullet indicator */}
                        <div className="absolute -left-[23px] top-1">
                          <button 
                            id={`btn-toggle-step-${idx}`}
                            onClick={() => handleToggleStep(step, !dateCompleted)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ${
                              dateCompleted 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                                : active 
                                  ? 'bg-white border-teal-500 dark:bg-zinc-900 text-teal-500 shadow-sm' 
                                  : `${isDark ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 text-transparent' : 'bg-white border-slate-200 hover:border-slate-400 text-transparent'}`
                            }`}
                          >
                            {dateCompleted && <CheckCircle className="w-4.5 h-4.5" />}
                            {!dateCompleted && active && <Clock className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-xs font-semibold ${dateCompleted ? 'text-slate-800 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'} flex items-center gap-1.5`}>
                              {step}
                              {active && (
                                <span className="px-1.5 py-0.2 bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded text-[9px] font-mono font-bold">Etapa Atual</span>
                              )}
                            </h4>
                            
                            {/* Timestamp */}
                            {dateCompleted ? (
                              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                <Calendar className="w-3 h-3" />
                                {dateCompleted}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-400 italic">Pendente</span>
                            )}
                          </div>

                          <p className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                            {STEP_DESCRIPTIONS[step]}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-lg bg-teal-50/20 dark:bg-teal-950/10 border border-teal-100/30 dark:border-teal-950/20 flex gap-2.5 items-start text-xs backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-teal-900 dark:text-teal-300">Atualização Inteligente da Ficha</p>
                    <p className="text-slate-500 dark:text-zinc-400 text-xxs mt-0.5">
                      Ao assinalar &ldquo;Recebe Ohikari&rdquo;, o sistema altera automaticamente a categoria de cadastro de frequentador para membro ativo e atualiza as datas em ordem cronológica de desenvolvimento.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {/* Banner / Info */}
                <div className="p-4 rounded-xl bg-teal-50/20 dark:bg-teal-950/10 border border-teal-100/30 dark:border-teal-950/25 flex gap-3 items-start text-xs">
                  <Award className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-teal-950 dark:text-teal-300">Acompanhamento Contínuo de Fé e Dedicação (Membro)</h4>
                    <p className="text-slate-500 dark:text-zinc-400 mt-0.5 text-xxs leading-relaxed">
                      Painel para acompanhar de forma personalizada o aprimoramento espiritual, as práticas de difusão, cursos de teologia e dedicações do membro do Johrei Center.
                    </p>
                  </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Column 1: Dedicações Contínuas */}
                  <div className="p-4 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/30 dark:bg-zinc-950/20 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200/40 dark:border-white/5 pb-2">
                      <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Dedicações de Fé</h4>
                    </div>

                    {/* Donativo */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        Donativo de Gratidão (Regularidade)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Mensal', 'Ocasional', 'Raro', 'Não pratica'] as const).map(option => {
                          const isSelected = getJornadaMembro(selectedPerson).donativo === option;
                          return (
                            <button
                              key={option}
                              onClick={() => handleUpdateJornadaMembro({ donativo: option })}
                              className={`p-2 rounded-lg text-xxs font-semibold uppercase border transition-all text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ministração de Johrei */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                        <Heart className="w-3 h-3 text-rose-500" />
                        Ministração de Johrei (Frequência)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Diário', 'Semanal', 'Mensal', 'Ocasional', 'Não pratica'] as const).map(option => {
                          const isSelected = getJornadaMembro(selectedPerson).johreiFrequencia === option;
                          return (
                            <button
                              key={option}
                              onClick={() => handleUpdateJornadaMembro({ johreiFrequencia: option })}
                              className={`p-2 rounded-lg text-xxs font-semibold uppercase border transition-all text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-400 font-bold'
                                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Encaminhamentos */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-indigo-500" />
                        Pessoas Encaminhadas
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const val = getJornadaMembro(selectedPerson).encaminhadosQuantidade;
                            handleUpdateJornadaMembro({ encaminhadosQuantidade: Math.max(0, val - 1) });
                          }}
                          className="p-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="flex-1 text-center py-2 border border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-zinc-950/30 rounded-lg">
                          <span className="font-mono text-sm font-bold text-slate-800 dark:text-zinc-200">
                            {getJornadaMembro(selectedPerson).encaminhadosQuantidade}
                          </span>
                          <span className="text-xxs text-zinc-400 ml-1.5 font-sans">pessoas</span>
                        </div>
                        <button
                          onClick={() => {
                            const val = getJornadaMembro(selectedPerson).encaminhadosQuantidade;
                            handleUpdateJornadaMembro({ encaminhadosQuantidade: val + 1 });
                          }}
                          className="p-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Arte e Formação */}
                  <div className="p-4 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/30 dark:bg-zinc-950/20 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200/40 dark:border-white/5 pb-2">
                      <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Cursos e Vivência Cultural</h4>
                    </div>

                    {/* Ikebana */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                        <Sprout className="w-3 h-3 text-emerald-500" />
                        Arte da Ikebana Sanguetsu
                      </label>
                      <select
                        value={getJornadaMembro(selectedPerson).ikebanaStatus}
                        onChange={(e) => handleUpdateJornadaMembro({ ikebanaStatus: e.target.value as any })}
                        className={`w-full p-2 text-xs rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none`}
                      >
                        <option value="Não fez curso">Não fez curso</option>
                        <option value="Fez curso básico">Fez curso básico</option>
                        <option value="Fez curso intermediário">Fez curso intermediário</option>
                        <option value="Fez curso avançado">Fez curso avançado</option>
                        <option value="Ministra/Instrutor">Ministra / Instrutor de Sanguetsu</option>
                      </select>
                    </div>

                    {/* Cursos de Nível */}
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-mono uppercase text-zinc-400">
                        Cursos de Nível da Igreja
                      </label>
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map(num => {
                          const key = `nivel${num}` as keyof CursosNivelIgreja;
                          const currentVal = getJornadaMembro(selectedPerson).cursosNivel[key];
                          
                          let valColor = "text-zinc-400";
                          if (currentVal === "Concluído") valColor = "text-teal-600 dark:text-teal-400 font-bold";
                          if (currentVal === "Em andamento") valColor = "text-amber-500 font-semibold";

                          return (
                            <div key={num} className="flex justify-between items-center text-xs p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/50 dark:border-white/5">
                              <span className="font-semibold text-slate-700 dark:text-zinc-300 text-xxs">Curso de Nível {num}</span>
                              <select
                                value={currentVal}
                                onChange={(e) => {
                                  const curNivel = { ...getJornadaMembro(selectedPerson).cursosNivel };
                                  curNivel[key] = e.target.value as any;
                                  handleUpdateJornadaMembro({ cursosNivel: curNivel });
                                }}
                                className={`text-[10px] border-none font-semibold ${valColor} bg-transparent outline-none cursor-pointer focus:ring-0`}
                              >
                                <option value="Não iniciado">Não iniciado</option>
                                <option value="Em andamento">Em andamento</option>
                                <option value="Concluído">Concluído</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Jovem 3 */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase text-zinc-400">
                        Formação Jovem 3
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['Sim', 'Não', 'Em andamento', 'Não se aplica'] as const).map(option => {
                          const isSelected = getJornadaMembro(selectedPerson).jovem3Participacao === option;
                          return (
                            <button
                              key={option}
                              onClick={() => handleUpdateJornadaMembro({ jovem3Participacao: option })}
                              className={`py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Purificações e Aprimoramento */}
                  <div className="p-4 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/30 dark:bg-zinc-950/20 space-y-4 md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Purifications checkboxes */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-200/40 dark:border-white/5 pb-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Purificações / Desafios Atuais</h4>
                        </div>
                        <p className="text-[10px] text-zinc-400">Selecione as áreas que o membro está purificando ou focando em aprimoramento no momento:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'saude', label: '🏥 Saúde' },
                            { key: 'conflito', label: '🤝 Conflito' },
                            { key: 'financeiro', label: '💰 Financeira' },
                            { key: 'outros', label: '🌀 Outros' }
                          ].map(({ key, label }) => {
                            const pState = getJornadaMembro(selectedPerson).purificacoes;
                            const isChecked = !!(pState as any)[key];
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  const updated = { ...pState, [key]: !isChecked };
                                  handleUpdateJornadaMembro({ purificacoes: updated });
                                }}
                                className={`p-2 rounded-xl border text-left flex items-center justify-between text-xxs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-zinc-500'
                                }`}
                              >
                                <span>{label}</span>
                                {isChecked && <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono uppercase text-zinc-400">Detalhes sobre Purificações e Aprimoramento</label>
                          <input
                            type="text"
                            value={getJornadaMembro(selectedPerson).purificacoes.descricao || ''}
                            onChange={(e) => {
                              const pState = getJornadaMembro(selectedPerson).purificacoes;
                              handleUpdateJornadaMembro({ purificacoes: { ...pState, descricao: e.target.value } });
                            }}
                            placeholder="Descreva brevemente o momento atual do membro..."
                            className={`w-full p-2 text-xs rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none`}
                          />
                        </div>
                      </div>

                      {/* Orientations */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-200/40 dark:border-white/5 pb-2">
                          <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Orientações Ministeriais</h4>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Principais Orientações Recebidas</label>
                            <textarea
                              rows={3}
                              value={getJornadaMembro(selectedPerson).orientacoes.texto || ''}
                              onChange={(e) => {
                                const oState = getJornadaMembro(selectedPerson).orientacoes;
                                handleUpdateJornadaMembro({ orientacoes: { ...oState, texto: e.target.value } });
                              }}
                              placeholder="Anote as orientações passadas pelo Ministro ou Responsável..."
                              className={`w-full p-2 text-xs rounded-lg border leading-relaxed resize-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'} focus:outline-none`}
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Cumprindo as orientações de fé?</label>
                            <div className="grid grid-cols-4 gap-1">
                              {(['Sim', 'Parcialmente', 'Não', 'Não se aplica'] as const).map(option => {
                                const isSelected = getJornadaMembro(selectedPerson).orientacoes.cumprindo === option;
                                return (
                                  <button
                                    key={option}
                                    onClick={() => {
                                      const oState = getJornadaMembro(selectedPerson).orientacoes;
                                      handleUpdateJornadaMembro({ orientacoes: { ...oState, cumprindo: option } });
                                    }}
                                    className={`py-1 rounded-lg text-[9px] font-bold uppercase border transition-all text-center cursor-pointer ${
                                      isSelected
                                        ? 'bg-teal-500 border-teal-500 text-white font-bold'
                                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-650'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 italic md:col-span-2">
            Nenhuma pessoa encontrada com os filtros atuais.
          </div>
        )}
      </div>
    </div>
  );
}
