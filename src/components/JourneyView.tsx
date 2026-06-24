/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Person, JornadaEtapa } from '../types';
import { CheckCircle, Calendar, Sparkles, User, ChevronRight, HelpCircle, AlertCircle, Clock } from 'lucide-react';

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

export default function JourneyView({ people, onUpdatePeople, isDark }: JourneyViewProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>(people[0]?.id || '');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().substring(0, 10));
  
  // Advanced filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');

  // Extract unique sectors list
  const sectorsList = Array.from(new Set(people.map(p => p.setor2 || 'SEM SETOR').filter(Boolean)));

  // Filter list of people
  const filteredPeople = people.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === 'ALL' || (p.setor2 || 'SEM SETOR') === sectorFilter;
    const matchesStage = stageFilter === 'ALL' || p.jornadaEtapa === stageFilter;
    return matchesSearch && matchesSector && matchesStage;
  });

  // Select the person (fallback to filteredPeople[0] if current choice is filtered out)
  const selectedPerson = people.find(p => p.id === selectedPersonId) || filteredPeople[0] || people[0];

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
