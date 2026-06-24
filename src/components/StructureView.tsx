/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { JohreiCenterStructure, AMMember, AFMember, AssessorMember, Person } from '../types';
import { Shield, Plus, Trash2, UserCheck, Heart, Users, MapPin, Award } from 'lucide-react';

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
  const [amSector, setAmSector] = useState('CENTRO-NORTE');
  const [manualAM, setManualAM] = useState(false);

  const [afName, setAfName] = useState('');
  const [afSector, setAfSector] = useState('CENTRO-NORTE');
  const [manualAF, setManualAF] = useState(false);

  const [assessorName, setAssessorName] = useState('');
  const [assessorRole, setAssessorRole] = useState('Assessor');
  const [manualAssessor, setManualAssessor] = useState(false);

  // Get members base candidates
  const memberCandidates = people
    .filter(p => p.subtipoCadastro === 'MEMBRO')
    .sort((a, b) => a.nome.localeCompare(b.nome));

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
                  <select
                    value={amName}
                    onChange={(e) => setAmName(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${
                      isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                    } focus:outline-none`}
                  >
                    <option value="">Selecione um membro da base...</option>
                    {memberCandidates.map(m => (
                      <option key={m.id} value={m.nome}>{m.nome} (Cód: {m.id})</option>
                    ))}
                  </select>
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
                  <option value="CENTRO-NORTE">CENTRO-NORTE</option>
                  <option value="SUL">SUL</option>
                  <option value="LESTE">LESTE</option>
                  <option value="OESTE">OESTE</option>
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
                  <select
                    value={afName}
                    onChange={(e) => setAfName(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${
                      isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                    } focus:outline-none`}
                  >
                    <option value="">Selecione um membro da base...</option>
                    {memberCandidates.map(m => (
                      <option key={m.id} value={m.nome}>{m.nome} (Cód: {m.id})</option>
                    ))}
                  </select>
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
                  <option value="CENTRO-NORTE">CENTRO-NORTE</option>
                  <option value="SUL">SUL</option>
                  <option value="LESTE">LESTE</option>
                  <option value="OESTE">OESTE</option>
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
                  <select
                    value={assessorName}
                    onChange={(e) => setAssessorName(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${
                      isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                    } focus:outline-none`}
                  >
                    <option value="">Selecione um membro da base...</option>
                    {memberCandidates.map(m => (
                      <option key={m.id} value={m.nome}>{m.nome} (Cód: {m.id})</option>
                    ))}
                  </select>
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
