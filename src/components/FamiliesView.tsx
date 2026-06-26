/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Person, Family } from '../types';
import { Home, Plus, MapPin, Users, Heart, Award } from 'lucide-react';
import FamilyGoogleMap from './FamilyGoogleMap';

interface FamiliesViewProps {
  families: Family[];
  onUpdateFamilies: (newFamilies: Family[]) => void;
  people: Person[];
  isDark: boolean;
}

export default function FamiliesView({ families, onUpdateFamilies, people, isDark }: FamiliesViewProps) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(families[0]?.id || '');
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);

  // New Family Form state
  const [newFamId, setNewFamId] = useState('');
  const [newFamNome, setNewFamNome] = useState('');
  const [newFamEnd, setNewFamEnd] = useState('');
  const [newFamAF, setNewFamAF] = useState('');
  const [newFamHist, setNewFamHist] = useState('');
  const [newFamObs, setNewFamObs] = useState('');

  const selectedFamily = families.find(f => f.id === selectedFamilyId) || families[0];

  // Dynamic calculations for selected family
  const famPeople = people.filter(p => p.idFamilia === selectedFamily?.id);
  const mCount = famPeople.filter(p => p.subtipoCadastro === 'MEMBRO').length;
  const fCount = famPeople.filter(p => p.subtipoCadastro === 'FREQUENTADOR').length;

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamNome.trim() || !newFamId.trim()) {
      alert('Preencha pelo menos o ID e Nome da Família.');
      return;
    }

    if (families.some(f => f.id === newFamId)) {
      alert('Já existe uma família com este ID cadastrado.');
      return;
    }

    const created: Family = {
      id: newFamId.toUpperCase(),
      nome: newFamNome,
      endereco: newFamEnd,
      afResponsavel: newFamAF.toUpperCase(),
      historico: newFamHist,
      observacoes: newFamObs
    };

    onUpdateFamilies([...families, created]);
    setSelectedFamilyId(created.id);
    setIsAddFamilyOpen(false);
    
    // Reset form
    setNewFamId('');
    setNewFamNome('');
    setNewFamEnd('');
    setNewFamAF('');
    setNewFamHist('');
    setNewFamObs('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Gestão de Famílias</h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Mapeamento residencial de assistência, contagem de membresia familiar e relatórios de acompanhamento pastoral nos lares.
          </p>
        </div>
        <button 
          id="btn-open-add-fam"
          onClick={() => setIsAddFamilyOpen(true)}
          className="px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Cadastrar Nova Família
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Family List */}
        <div className="p-4 rounded-xl glass-panel shadow-sm space-y-4">
          <span className="block text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Diretório de Famílias ({families.length})</span>
          <div className="space-y-2 max-h-120 overflow-y-auto pr-1">
            {families.map(f => {
              const active = f.id === selectedFamilyId;
              const fPeople = people.filter(p => p.idFamilia === f.id);
              const totalPeople = fPeople.length;
              return (
                <div 
                  key={f.id}
                  onClick={() => setSelectedFamilyId(f.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
                    active 
                      ? 'border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-300 font-bold' 
                      : `${isDark ? 'border-zinc-800 bg-zinc-950/10 hover:bg-zinc-800/40 text-zinc-300' : 'border-slate-200/40 bg-white/40 hover:bg-slate-100/50 text-slate-700'}`
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-xs uppercase flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      {f.nome}
                    </p>
                    <span className="text-[10px] text-zinc-400 block truncate mt-0.5">{f.endereco}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-zinc-850 text-slate-600 dark:text-zinc-400 font-mono text-[10px] rounded-sm flex-shrink-0 ml-2 font-bold">
                    {totalPeople} pessoas
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Selected Family details & Members list */}
        {selectedFamily ? (
          <div className="md:col-span-2 space-y-6">
            {/* Family overview Card */}
            <div className="p-6 rounded-xl glass-panel shadow-sm space-y-6">
              <div className="flex justify-between items-start border-b border-slate-200/40 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold uppercase text-teal-600 dark:text-teal-400 font-display">{selectedFamily.nome}</h3>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">CÓDIGO FAMILIAR: {selectedFamily.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 block uppercase tracking-wider">Assistente Familiar (AF)</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{selectedFamily.afResponsavel || 'Não definido'}</span>
                </div>
              </div>

              {/* Counts metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-white/40 dark:bg-zinc-950/40 border border-slate-200/40 dark:border-white/5 rounded-lg backdrop-blur-xs">
                  <span className="text-[9px] text-zinc-400 block font-mono tracking-wider">TOTAL INTEGRANTES</span>
                  <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{famPeople.length}</span>
                </div>
                <div className="p-3 bg-white/40 dark:bg-zinc-950/40 border border-slate-200/40 dark:border-white/5 rounded-lg backdrop-blur-xs">
                  <span className="text-[9px] text-zinc-400 block font-mono tracking-wider">MEMBROS</span>
                  <span className="text-lg font-bold text-emerald-500">{mCount}</span>
                </div>
                <div className="p-3 bg-white/40 dark:bg-zinc-950/40 border border-slate-200/40 dark:border-white/5 rounded-lg backdrop-blur-xs">
                  <span className="text-[9px] text-zinc-400 block font-mono tracking-wider">FREQUENTADORES</span>
                  <span className="text-lg font-bold text-orange-500">{fCount}</span>
                </div>
              </div>

              {/* Text metadata */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-0.5">Endereço da Residência</span>
                  <p className="text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    {selectedFamily.endereco}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-0.5">Histórico Familiar</span>
                  <p className="text-slate-500 dark:text-zinc-400 italic">
                    &ldquo;{selectedFamily.historico || 'Sem histórico registrado.'}&rdquo;
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-0.5">Observações da Unidade</span>
                  <p className="text-slate-500 dark:text-zinc-400">
                    {selectedFamily.observacoes || 'Sem observações.'}
                  </p>
                </div>
              </div>

              {/* Schematic Map & Live Google Map */}
              <FamilyGoogleMap 
                address={selectedFamily.endereco} 
                familyName={selectedFamily.nome} 
                isDark={isDark} 
              />
            </div>

            {/* Family Members base table */}
            <div className="p-6 rounded-xl glass-panel shadow-sm space-y-4">
              <div className="pb-2 border-b border-slate-200/40 dark:border-white/5">
                <h4 className="font-sans font-bold text-sm flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
                  <Users className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                  Integrantes da Família no Cadastro ({famPeople.length})
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/40 dark:border-white/5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      <th className="py-2 px-3 font-semibold">Nome</th>
                      <th className="py-2 px-3 font-semibold">Categoria</th>
                      <th className="py-2 px-3 font-semibold">Idade</th>
                      <th className="py-2 px-3 font-semibold">Celular</th>
                      <th className="py-2 px-3 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-medium">
                    {famPeople.map(p => (
                      <tr key={p.id} className="hover:bg-slate-100/30 dark:hover:bg-zinc-850/20">
                        <td className="py-2.5 px-3 text-zinc-900 dark:text-zinc-100 uppercase font-semibold">{p.nome}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            p.subtipoCadastro === 'MEMBRO' 
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/20' 
                              : 'bg-orange-50 text-orange-700 dark:bg-orange-950/20'
                          }`}>
                            {p.subtipoCadastro}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{p.idade} anos</td>
                        <td className="py-2.5 px-3 font-mono">{p.celularPrincipal || <span className="text-zinc-400 italic">Sem fone</span>}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            p.statusAtual === 'ATIVO' 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' 
                              : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {p.statusAtual}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {famPeople.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-400 italic">
                          Nenhum membro ou frequentador associado a esta família no cadastro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 italic md:col-span-2">
            Nenhuma família selecionada. Crie uma família para começar.
          </div>
        )}
      </div>

      {/* Add Family Modal */}
      {isAddFamilyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-zinc-900 text-zinc-100 border border-zinc-800' : 'bg-white text-zinc-900 border border-zinc-200'} shadow-2xl space-y-4`}>
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-sans font-semibold">Cadastrar Nova Família</h3>
              <button 
                id="btn-close-add-fam"
                onClick={() => setIsAddFamilyOpen(false)}
                className="p-1 font-mono text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">ID Família (Código único)</label>
                <input 
                  id="new-fam-id"
                  type="text"
                  placeholder="EX: FAM-555"
                  value={newFamId}
                  onChange={(e) => setNewFamId(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                />
              </div>

              <div>
                <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Nome de Referência (Ex: Família Silva)</label>
                <input 
                  id="new-fam-nome"
                  type="text"
                  placeholder="Família Silva"
                  value={newFamNome}
                  onChange={(e) => setNewFamNome(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                />
              </div>

              <div>
                <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Endereço Completo</label>
                <input 
                  id="new-fam-address"
                  type="text"
                  placeholder="AVENIDA BRASIL, 120 - JARDIM FLORESTA"
                  value={newFamEnd}
                  onChange={(e) => setNewFamEnd(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                />
              </div>

              <div>
                <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Assistente Responsável (AF)</label>
                <input 
                  id="new-fam-af"
                  type="text"
                  placeholder="PAULO"
                  value={newFamAF}
                  onChange={(e) => setNewFamAF(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                />
              </div>

              <div>
                <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Histórico Inicial</label>
                <textarea 
                  id="new-fam-history"
                  rows={2}
                  placeholder="Descreva brevemente a situação de assistência..."
                  value={newFamHist}
                  onChange={(e) => setNewFamHist(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  id="btn-cancel-fam"
                  type="button" 
                  onClick={() => setIsAddFamilyOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs bg-white dark:bg-zinc-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  id="btn-save-fam"
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-semibold cursor-pointer"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
