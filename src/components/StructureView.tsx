/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { JohreiCenterStructure, AMMember, AFMember, AssessorMember, Person } from '../types';
import { Shield, Plus, Trash2, UserCheck, Heart, Users, MapPin, Award, Sparkles, Search } from 'lucide-react';

interface StructureViewProps {
  structure: JohreiCenterStructure;
  onUpdateStructure: (newStructure: JohreiCenterStructure) => void;
  people: Person[];
  isDark: boolean;
}

export default function StructureView({ structure, onUpdateStructure, people, isDark }: StructureViewProps) {
  // Tabs for subcategories of structure
  const [activeSubTab, setActiveSubTab] = useState<'am' | 'af' | 'assessores'>('am');

  // Input states
  const [amName, setAmName] = useState('');
  const [amSector, setAmSector] = useState('');
  const [manualAM, setManualAM] = useState(false);
  const [amSearch, setAmSearch] = useState('');

  const [afName, setAfName] = useState('');
  const [afSector, setAfSector] = useState('');
  const [manualAF, setManualAF] = useState(false);
  const [afSearch, setAfSearch] = useState('');

  const [assessorName, setAssessorName] = useState('');
  const [assessorRole, setAssessorRole] = useState('Assessor');
  const [manualAssessor, setManualAssessor] = useState(false);
  const [assessorSearch, setAssessorSearch] = useState('');

  // Get sectors list dynamically from people
  const sectorsList = useMemo(() => {
    const uniqueSectors = Array.from(
      new Set(
        people
          .map(p => p.setor2)
          .filter(Boolean)
          .map(s => s.trim().toUpperCase())
      )
    )
      .filter(s => s !== 'N/A' && s !== '')
      .sort();
    return uniqueSectors.length > 0 ? uniqueSectors : ['CENTRO-NORTE', 'SUL', 'LESTE', 'OESTE'];
  }, [people]);

  // Set initial sector when sectors list changes
  useEffect(() => {
    if (sectorsList.length > 0) {
      if (!amSector || !sectorsList.includes(amSector)) {
        setAmSector(sectorsList[0]);
      }
      if (!afSector || !sectorsList.includes(afSector)) {
        setAfSector(sectorsList[0]);
      }
    }
  }, [sectorsList]);

  // Extract suggested AMs from people database (how many members reference them and what is their main sector)
  const amSuggestions = useMemo(() => {
    const amMap: Record<string, { count: number; sectors: Record<string, number> }> = {};
    
    people.forEach(p => {
      if (p.am) {
        const name = p.am.trim().toUpperCase();
        if (name && name !== 'N/A' && name !== '-') {
          if (!amMap[name]) {
            amMap[name] = { count: 0, sectors: {} };
          }
          amMap[name].count += 1;
          if (p.setor2) {
            const s = p.setor2.trim().toUpperCase();
            amMap[name].sectors[s] = (amMap[name].sectors[s] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(amMap)
      .map(([name, data]) => {
        const sortedSectors = Object.entries(data.sectors).sort((a, b) => b[1] - a[1]);
        const deducedSector = sortedSectors.length > 0 ? sortedSectors[0][0] : (sectorsList[0] || '');
        return {
          name,
          count: data.count,
          deducedSector
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [people, sectorsList]);

  // Extract suggested AFs from people database
  const afSuggestions = useMemo(() => {
    const afMap: Record<string, { count: number; sectors: Record<string, number> }> = {};
    
    people.forEach(p => {
      if (p.af2) {
        const name = p.af2.trim().toUpperCase();
        if (name && name !== 'N/A' && name !== '-') {
          if (!afMap[name]) {
            afMap[name] = { count: 0, sectors: {} };
          }
          afMap[name].count += 1;
          if (p.setor2) {
            const s = p.setor2.trim().toUpperCase();
            afMap[name].sectors[s] = (afMap[name].sectors[s] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(afMap)
      .map(([name, data]) => {
        const sortedSectors = Object.entries(data.sectors).sort((a, b) => b[1] - a[1]);
        const deducedSector = sortedSectors.length > 0 ? sortedSectors[0][0] : (sectorsList[0] || '');
        return {
          name,
          count: data.count,
          deducedSector
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [people, sectorsList]);

  // Get members base candidates
  const memberCandidates = people
    .filter(p => p.subtipoCadastro === 'MEMBRO')
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Search filtered candidates
  const filteredAMCandidates = memberCandidates.filter(m => 
    m.nome.toLowerCase().includes(amSearch.toLowerCase()) || 
    m.id.includes(amSearch)
  );

  const filteredAFCandidates = memberCandidates.filter(m => 
    m.nome.toLowerCase().includes(afSearch.toLowerCase()) || 
    m.id.includes(afSearch)
  );

  const filteredAssessorCandidates = memberCandidates.filter(m => 
    m.nome.toLowerCase().includes(assessorSearch.toLowerCase()) || 
    m.id.includes(assessorSearch)
  );

  const handleSelectAMSuggestion = (name: string, sector: string) => {
    const matchingMember = memberCandidates.find(m => 
      m.nome.toUpperCase() === name.toUpperCase() ||
      m.nome.toUpperCase().includes(name.toUpperCase()) ||
      name.toUpperCase().includes(m.nome.toUpperCase())
    );

    if (matchingMember) {
      setManualAM(false);
      setAmName(matchingMember.nome);
    } else {
      setManualAM(true);
      setAmName(name);
    }
    
    if (sector && sectorsList.includes(sector)) {
      setAmSector(sector);
    }
  };

  const handleSelectAFSuggestion = (name: string, sector: string) => {
    const matchingMember = memberCandidates.find(m => 
      m.nome.toUpperCase() === name.toUpperCase() ||
      m.nome.toUpperCase().includes(name.toUpperCase()) ||
      name.toUpperCase().includes(m.nome.toUpperCase())
    );

    if (matchingMember) {
      setManualAF(false);
      setAfName(matchingMember.nome);
    } else {
      setManualAF(true);
      setAfName(name);
    }
    
    if (sector && sectorsList.includes(sector)) {
      setAfSector(sector);
    }
  };

  const handleAddAM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amName.trim()) {
      alert('Por favor, selecione ou digite o nome do AM.');
      return;
    }
    
    const newAM: AMMember = {
      id: `am-${Date.now()}`,
      name: amName.trim().toUpperCase(),
      sector: amSector.toUpperCase()
    };

    onUpdateStructure({
      ...structure,
      amList: [...structure.amList, newAM]
    });
    setAmName('');
    setAmSearch('');
  };

  const handleDeleteAM = (id: string) => {
    onUpdateStructure({
      ...structure,
      amList: structure.amList.filter(am => am.id !== id)
    });
  };

  const handleAddAF = (e: React.FormEvent) => {
    e.preventDefault();
    if (!afName.trim()) {
      alert('Por favor, selecione ou digite o nome do AF.');
      return;
    }

    const newAF: AFMember = {
      id: `af-${Date.now()}`,
      name: afName.trim().toUpperCase(),
      sector: afSector.toUpperCase()
    };

    onUpdateStructure({
      ...structure,
      afList: [...structure.afList, newAF]
    });
    setAfName('');
    setAfSearch('');
  };

  const handleDeleteAF = (id: string) => {
    onUpdateStructure({
      ...structure,
      afList: structure.afList.filter(af => af.id !== id)
    });
  };

  const handleAddAssessor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessorName.trim()) {
      alert('Por favor, selecione ou digite o nome do assessor.');
      return;
    }

    const newAssessor: AssessorMember = {
      id: `assessor-${Date.now()}`,
      name: assessorName.trim().toUpperCase(),
      role: assessorRole.trim()
    };

    onUpdateStructure({
      ...structure,
      assessoresList: [...structure.assessoresList, newAssessor]
    });
    setAssessorName('');
    setAssessorSearch('');
  };

  const handleDeleteAssessor = (id: string) => {
    onUpdateStructure({
      ...structure,
      assessoresList: structure.assessoresList.filter(as => as.id !== id)
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Estrutura Organizacional</h2>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Defina o organograma do Johrei Center. Assistentes de Ministro (AM), Assistentes de Família (AF) e Assessores. Toda a base se adequará automaticamente a esta hierarquia.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200/40 dark:border-white/5 gap-2 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('am')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'am'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Award className="w-4 h-4" />
          Assistentes de Ministro (AM)
        </button>
        <button
          onClick={() => setActiveSubTab('af')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'af'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Heart className="w-4 h-4" />
          Assistentes de Família (AF)
        </button>
        <button
          onClick={() => setActiveSubTab('assessores')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'assessores'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          Assessores e Cargos de Apoio
        </button>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="p-5 rounded-xl glass-panel shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-sans font-bold flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
            <Plus className="w-4 h-4" />
            Adicionar à Estrutura
          </h3>

          {activeSubTab === 'am' && (
            <form onSubmit={handleAddAM} className="space-y-4">
              {/* Planilha Suggestions */}
              {amSuggestions.length > 0 && (
                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-lg border border-teal-100/30 dark:border-teal-900/20">
                  <span className="block text-[10px] font-mono uppercase text-teal-600 dark:text-teal-400 mb-1.5 flex items-center gap-1 font-bold">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    Responsáveis Detectados na Planilha
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {amSuggestions.map(sug => {
                      const isAdded = structure.amList.some(am => am.name.toUpperCase() === sug.name.toUpperCase());
                      return (
                        <button
                          key={sug.name}
                          type="button"
                          onClick={() => handleSelectAMSuggestion(sug.name, sug.deducedSector)}
                          disabled={isAdded}
                          title={isAdded ? 'Já adicionado' : `Clique para selecionar. Setor presumido: ${sug.deducedSector}`}
                          className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 font-medium transition-all border cursor-pointer ${
                            isAdded
                              ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-400 border-transparent cursor-not-allowed line-through'
                              : 'bg-teal-500/10 dark:bg-teal-500/5 text-teal-700 dark:text-teal-300 border-teal-200/40 dark:border-teal-800/20 hover:bg-teal-500/20'
                          }`}
                        >
                          <span>{sug.name}</span>
                          <span className="bg-teal-500/20 text-teal-800 dark:text-teal-400 px-1 py-0.2 rounded font-mono text-[9px]">
                            {sug.count} membros
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-mono uppercase text-zinc-400">Nome do AM</label>
                  <label className="flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={manualAM}
                      onChange={(e) => {
                        setManualAM(e.target.checked);
                        setAmName('');
                      }}
                      className="rounded text-teal-600 focus:ring-0 w-3 h-3 cursor-pointer"
                    />
                    Digitar manual
                  </label>
                </div>
                
                {manualAM ? (
                  <input
                    type="text"
                    placeholder="EX: PROF DANI"
                    value={amName}
                    onChange={(e) => setAmName(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${
                      isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                    } focus:outline-none focus:border-teal-500`}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar membro..."
                        value={amSearch}
                        onChange={(e) => setAmSearch(e.target.value)}
                        className={`w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border ${
                          isDark ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        } focus:outline-none focus:border-teal-500`}
                      />
                    </div>
                    <select
                      value={amName}
                      onChange={(e) => {
                        setAmName(e.target.value);
                        // Auto-fill sector of that person if available
                        const personObj = people.find(p => p.nome === e.target.value);
                        if (personObj && personObj.setor2) {
                          const s = personObj.setor2.trim().toUpperCase();
                          if (sectorsList.includes(s)) {
                            setAmSector(s);
                          }
                        }
                      }}
                      className={`w-full p-2.5 text-xs rounded-lg border ${
                        isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                      } focus:outline-none`}
                    >
                      <option value="">Selecione um membro da base...</option>
                      {filteredAMCandidates.map(m => (
                        <option key={m.id} value={m.nome}>{m.nome} (Cód: {m.id})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Setor Responsável</label>
                <select
                  value={amSector}
                  onChange={(e) => setAmSector(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-lg border ${
                    isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                  } focus:outline-none`}
                >
                  {sectorsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Salvar AM
              </button>
            </form>
          )}

          {activeSubTab === 'af' && (
            <form onSubmit={handleAddAF} className="space-y-4">
              {/* Planilha Suggestions */}
              {afSuggestions.length > 0 && (
                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-lg border border-teal-100/30 dark:border-teal-900/20">
                  <span className="block text-[10px] font-mono uppercase text-teal-600 dark:text-teal-400 mb-1.5 flex items-center gap-1 font-bold">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    Responsáveis Detectados na Planilha
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {afSuggestions.map(sug => {
                      const isAdded = structure.afList.some(af => af.name.toUpperCase() === sug.name.toUpperCase());
                      return (
                        <button
                          key={sug.name}
                          type="button"
                          onClick={() => handleSelectAFSuggestion(sug.name, sug.deducedSector)}
                          disabled={isAdded}
                          title={isAdded ? 'Já adicionado' : `Clique para selecionar. Setor presumido: ${sug.deducedSector}`}
                          className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 font-medium transition-all border cursor-pointer ${
                            isAdded
                              ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-400 border-transparent cursor-not-allowed line-through'
                              : 'bg-teal-500/10 dark:bg-teal-500/5 text-teal-700 dark:text-teal-300 border-teal-200/40 dark:border-teal-800/20 hover:bg-teal-500/20'
                          }`}
                        >
                          <span>{sug.name}</span>
                          <span className="bg-teal-500/20 text-teal-800 dark:text-teal-400 px-1 py-0.2 rounded font-mono text-[9px]">
                            {sug.count} famílias
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-mono uppercase text-zinc-400">Nome do AF</label>
                  <label className="flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={manualAF}
                      onChange={(e) => {
                        setManualAF(e.target.checked);
                        setAfName('');
                      }}
                      className="rounded text-teal-600 focus:ring-0 w-3 h-3 cursor-pointer"
                    />
                    Digitar manual
                  </label>
                </div>

                {manualAF ? (
                  <input
                    type="text"
                    placeholder="EX: YOKO"
                    value={afName}
                    onChange={(e) => setAfName(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${
                      isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                    } focus:outline-none focus:border-teal-500`}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar membro..."
                        value={afSearch}
                        onChange={(e) => setAfSearch(e.target.value)}
                        className={`w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border ${
                          isDark ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        } focus:outline-none focus:border-teal-500`}
                      />
                    </div>
                    <select
                      value={afName}
                      onChange={(e) => {
                        setAfName(e.target.value);
                        const personObj = people.find(p => p.nome === e.target.value);
                        if (personObj && personObj.setor2) {
                          const s = personObj.setor2.trim().toUpperCase();
                          if (sectorsList.includes(s)) {
                            setAfSector(s);
                          }
                        }
                      }}
                      className={`w-full p-2.5 text-xs rounded-lg border ${
                        isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                      } focus:outline-none`}
                    >
                      <option value="">Selecione um membro da base...</option>
                      {filteredAFCandidates.map(m => (
                        <option key={m.id} value={m.nome}>{m.nome} (Cód: {m.id})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Setor de Atuação</label>
                <select
                  value={afSector}
                  onChange={(e) => setAfSector(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-lg border ${
                    isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                  } focus:outline-none`}
                >
                  {sectorsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Salvar AF
              </button>
            </form>
          )}

          {activeSubTab === 'assessores' && (
            <form onSubmit={handleAddAssessor} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-mono uppercase text-zinc-400">Nome do Assessor</label>
                  <label className="flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={manualAssessor}
                      onChange={(e) => {
                        setManualAssessor(e.target.checked);
                        setAssessorName('');
                      }}
                      className="rounded text-teal-600 focus:ring-0 w-3 h-3 cursor-pointer"
                    />
                    Digitar manual
                  </label>
                </div>

                {manualAssessor ? (
                  <input
                    type="text"
                    placeholder="EX: CARLOS TANAKA"
                    value={assessorName}
                    onChange={(e) => setAssessorName(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${
                      isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                    } focus:outline-none focus:border-teal-500`}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar membro..."
                        value={assessorSearch}
                        onChange={(e) => setAssessorSearch(e.target.value)}
                        className={`w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border ${
                          isDark ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        } focus:outline-none focus:border-teal-500`}
                      />
                    </div>
                    <select
                      value={assessorName}
                      onChange={(e) => setAssessorName(e.target.value)}
                      className={`w-full p-2.5 text-xs rounded-lg border ${
                        isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                      } focus:outline-none`}
                    >
                      <option value="">Selecione um membro da base...</option>
                      {filteredAssessorCandidates.map(m => (
                        <option key={m.id} value={m.nome}>{m.nome} (Cód: {m.id})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Função / Cargo</label>
                <input
                  type="text"
                  placeholder="EX: Assessor de Iniciação"
                  value={assessorRole}
                  onChange={(e) => setAssessorRole(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-lg border ${
                    isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                  } focus:outline-none focus:border-teal-500`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Salvar Assessor
              </button>
            </form>
          )}
        </div>

        {/* List panel */}
        <div className="p-5 rounded-xl glass-panel shadow-sm space-y-4 md:col-span-2">
          <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-zinc-200">
            {activeSubTab === 'am' && `Assistentes de Ministro Cadastrados (${structure.amList.length})`}
            {activeSubTab === 'af' && `Assistentes de Família Cadastrados (${structure.afList.length})`}
            {activeSubTab === 'assessores' && `Assessores / Apoios Ativos (${structure.assessoresList.length})`}
          </h3>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {activeSubTab === 'am' && (
              structure.amList.map(am => (
                <div
                  key={am.id}
                  className={`p-3 rounded-lg flex justify-between items-center text-xs border ${
                    isDark ? 'bg-zinc-950/20 border-zinc-850' : 'bg-white border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-teal-500/10 text-teal-600 rounded-lg">
                      <Award className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200 uppercase">{am.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">Setor: {am.sector}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAM(am.id)}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}

            {activeSubTab === 'af' && (
              structure.afList.map(af => (
                <div
                  key={af.id}
                  className={`p-3 rounded-lg flex justify-between items-center text-xs border ${
                    isDark ? 'bg-zinc-950/20 border-zinc-850' : 'bg-white border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
                      <Heart className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200 uppercase">{af.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">Setor de Atuação: {af.sector}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAF(af.id)}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}

            {activeSubTab === 'assessores' && (
              structure.assessoresList.map(ass => (
                <div
                  key={ass.id}
                  className={`p-3 rounded-lg flex justify-between items-center text-xs border ${
                    isDark ? 'bg-zinc-950/20 border-zinc-850' : 'bg-white border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                      <Shield className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200 uppercase">{ass.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">Função: {ass.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAssessor(ass.id)}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}

            {((activeSubTab === 'am' && structure.amList.length === 0) ||
              (activeSubTab === 'af' && structure.afList.length === 0) ||
              (activeSubTab === 'assessores' && structure.assessoresList.length === 0)) && (
              <div className="text-center py-10 text-zinc-400 italic">
                Nenhum registro cadastrado para esta categoria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
