/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Person, Family, JohreiCenterStructure } from '../types';
import { MapPin, Users, Home, Shield, Compass, Landmark, ChevronDown, ChevronRight, User } from 'lucide-react';

interface TreeViewProps {
  people: Person[];
  families: Family[];
  structure: JohreiCenterStructure;
  isDark: boolean;
}

export default function TreeView({ people, families, structure, isDark }: TreeViewProps) {
  // Expanded states for Sectors, Bairros and Families
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
  const [expandedBairros, setExpandedBairros] = useState<Record<string, boolean>>({});
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});

  const toggleSector = (sectorName: string) => {
    setExpandedSectors(prev => ({ ...prev, [sectorName]: !prev[sectorName] }));
  };

  const toggleBairro = (bairroId: string) => {
    setExpandedBairros(prev => ({ ...prev, [bairroId]: !prev[bairroId] }));
  };

  const toggleFamily = (famId: string) => {
    setExpandedFamilies(prev => ({ ...prev, [famId]: !prev[famId] }));
  };

  // Group data dynamically: Setor -> Bairro -> Familia -> Pessoas
  const sectors: Record<string, {
    bairros: Record<string, {
      familias: Record<string, {
        famObj?: Family;
        pessoas: Person[];
      }>;
    }>;
  }> = {};

  people.forEach(p => {
    const sector = p.setor2 || 'SEM SETOR';
    const bairro = p.bairroAjustado || 'BAIRRO NÃO INFORMADO';
    const famId = p.idFamilia || 'SEM FAMÍLIA';

    if (!sectors[sector]) {
      sectors[sector] = { bairros: {} };
    }
    if (!sectors[sector].bairros[bairro]) {
      sectors[sector].bairros[bairro] = { familias: {} };
    }
    if (!sectors[sector].bairros[bairro].familias[famId]) {
      const famObj = families.find(f => f.id === famId);
      sectors[sector].bairros[bairro].familias[famId] = { famObj, pessoas: [] };
    }

    sectors[sector].bairros[bairro].familias[famId].pessoas.push(p);
  });

  // Unique sector names list
  const sectorNames = Object.keys(sectors).sort();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Setorização e Distribuição Territorial</h2>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Navegue pelas divisões pastorais do Johrei Center. Visualize os líderes responsáveis e a estrutura familiar em cada setor.
        </p>
      </div>

      {/* Main Grid for Sector Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sectorNames.map(sectorName => {
          const sectorData = sectors[sectorName];
          
          // Total people in this sector
          const totalPeople = Object.values(sectorData.bairros).reduce((acc, b) => {
            return acc + Object.values(b.familias).reduce((sum, f) => sum + f.pessoas.length, 0);
          }, 0);

          // Total families in this sector
          const totalFamilies = Object.values(sectorData.bairros).reduce((acc, b) => {
            return acc + Object.keys(b.familias).filter(id => id !== 'SEM FAMÍLIA').length;
          }, 0);

          // Find Assistente de Ministro (AM) assigned to this sector
          const assignedAM = structure.amList.find(
            am => am.sector.toUpperCase() === sectorName.toUpperCase()
          );

          // Find Assistentes de Família (AF) in this sector
          const assignedAFs = structure.afList.filter(
            af => af.sector.toUpperCase() === sectorName.toUpperCase()
          );

          const isSectorExpanded = expandedSectors[sectorName] !== false; // expanded by default

          return (
            <div 
              key={sectorName} 
              className="rounded-2xl glass-panel p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200/40 dark:border-white/5 space-y-4"
            >
              <div>
                {/* Sector Card Header */}
                <div 
                  onClick={() => toggleSector(sectorName)}
                  className="flex justify-between items-center cursor-pointer select-none pb-2 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-sm tracking-tight text-slate-800 dark:text-zinc-100 uppercase flex items-center gap-1.5">
                        {sectorName}
                        {isSectorExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        )}
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-400">Setor Externo</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white shadow-xs">
                      {totalPeople} {totalPeople === 1 ? 'Pessoa' : 'Pessoas'}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">{totalFamilies} Famílias</p>
                  </div>
                </div>

                {isSectorExpanded && (
                  <div className="mt-4 space-y-4 transition-all duration-300">

                {/* Responsible Leaders (AM & AFs) */}
                <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200/30 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      Assistente de Ministro (AM)
                    </span>
                    {assignedAM ? (
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        {assignedAM.name}
                      </p>
                    ) : (
                      <p className="text-xs text-orange-500 font-semibold italic">Sem AM definido</p>
                    )}
                  </div>

                  <div>
                    <span className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-500" />
                      Assistentes de Família (AF)
                    </span>
                    {assignedAFs.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {assignedAFs.map(af => (
                          <span 
                            key={af.id} 
                            className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded uppercase"
                          >
                            {af.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">Nenhum AF vinculado</p>
                    )}
                  </div>
                </div>

                {/* Territorial Hierarchy Tree (Bairros) */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Distribuição por Bairro</span>
                  
                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {Object.entries(sectorData.bairros).map(([bairroName, bairroData]) => {
                      const bairroId = `${sectorName}-${bairroName}`;
                      const isBairroExpanded = !!expandedBairros[bairroId];
                      const totalInBairro = Object.values(bairroData.familias).reduce((sum, f) => sum + f.pessoas.length, 0);

                      return (
                        <div key={bairroName} className="border border-slate-200/30 dark:border-white/5 rounded-lg overflow-hidden bg-white/40 dark:bg-zinc-950/10">
                          {/* Bairro Header Bar */}
                          <div 
                            onClick={() => toggleBairro(bairroId)}
                            className="p-2.5 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-500" />
                              <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200 uppercase">{bairroName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-zinc-400 font-bold">({totalInBairro} p.)</span>
                              {isBairroExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                            </div>
                          </div>

                          {/* Bairro Families List */}
                          {isBairroExpanded && (
                            <div className="p-2 bg-slate-50/30 dark:bg-zinc-900/10 border-t border-slate-150 dark:border-white/5 pl-5 space-y-1">
                              {Object.entries(bairroData.familias).map(([famId, famData]) => {
                                const fullFamId = `${bairroId}-fam-${famId}`;
                                const isFamExpanded = !!expandedFamilies[fullFamId];
                                const famName = famData.famObj?.nome || `Família ${famId}`;
                                const membersCount = famData.pessoas.length;

                                return (
                                  <div key={famId} className="border-l border-teal-500/30 dark:border-teal-950/30 pl-2 py-0.5">
                                    <div 
                                      onClick={() => toggleFamily(fullFamId)}
                                      className="py-1 flex justify-between items-center cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 select-none"
                                    >
                                      <div className="flex items-center gap-1.5 text-xxs">
                                        <Home className="w-3 h-3 text-emerald-500" />
                                        <span className="font-medium text-slate-700 dark:text-zinc-300">
                                          {famName} <span className="text-zinc-400 font-normal">({famId})</span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-mono text-zinc-400 font-bold">{membersCount} p.</span>
                                        {isFamExpanded ? <ChevronDown className="w-2.5 h-2.5 text-zinc-400" /> : <ChevronRight className="w-2.5 h-2.5 text-zinc-400" />}
                                      </div>
                                    </div>

                                    {/* Family Members Detail List */}
                                    {isFamExpanded && (
                                      <div className="pl-4 py-1 space-y-1">
                                        {famData.pessoas.map(p => {
                                          const isMembro = p.subtipoCadastro === 'MEMBRO';
                                          return (
                                            <div 
                                              key={p.id} 
                                              className="flex items-center gap-2 py-1 px-2.5 rounded bg-white/60 dark:bg-zinc-950/30 border border-slate-100 dark:border-white/5 text-[10px]"
                                            >
                                              <span className={`w-1.5 h-1.5 rounded-full ${isMembro ? 'bg-teal-500' : 'bg-orange-400'}`} />
                                              <span className="font-semibold text-slate-800 dark:text-zinc-200 uppercase">{p.nome}</span>
                                              <span className="text-zinc-400 text-[9px] font-mono">({p.tipoCadastro})</span>
                                              <span className={`ml-auto px-1 py-0.2 rounded text-[8px] font-mono uppercase font-bold ${
                                                isMembro 
                                                  ? 'bg-teal-50/80 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' 
                                                  : 'bg-orange-50/80 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400'
                                              }`}>
                                                {p.subtipoCadastro}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
