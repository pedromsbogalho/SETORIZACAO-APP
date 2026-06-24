/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Person, Family } from '../types';
import { Users, Shield, Compass, AlertTriangle, TrendingUp, Home, Award } from 'lucide-react';

interface DashboardViewProps {
  people: Person[];
  families: Family[];
  onNavigate: (tab: string) => void;
  isDark: boolean;
}

export default function DashboardView({ people, families, onNavigate, isDark }: DashboardViewProps) {
  // Stats calculations
  const totalMembros = people.filter(p => p.subtipoCadastro === 'MEMBRO').length;
  const membrosAtivos = people.filter(p => p.subtipoCadastro === 'MEMBRO' && p.statusAtual === 'ATIVO').length;
  const membrosAfastados = people.filter(p => p.subtipoCadastro === 'MEMBRO' && p.statusAtual === 'AFASTADO').length;
  const membrosFalecidos = people.filter(p => p.subtipoCadastro === 'MEMBRO' && p.statusAtual === 'FALECIDO').length;

  const totalFrequentadores = people.filter(p => p.subtipoCadastro === 'FREQUENTADOR').length;

  // "Novos este mês" - Let's say people created or first attended in June 2026
  const novosEsteMes = people.filter(p => {
    const firstAttend = p.jornadaDatas['Primeiro atendimento'];
    return firstAttend && firstAttend.startsWith('2026-06');
  }).length;

  // Conclusão de Pós-Outorga
  const concluiuPos = people.filter(p => {
    if (p.subtipoCadastro !== 'MEMBRO') return false;
    const aulas = p.cursoPosOutorga.aulas;
    return Object.values(aulas).every(v => v === 'Concluido');
  }).length;

  const posOutorgaRatio = totalMembros > 0 ? Math.round((concluiuPos / totalMembros) * 100) : 0;

  // Famílias assistidas (famílias com membros ou frequentadores)
  const familiasAssistidasCount = families.filter(f => people.some(p => p.idFamilia === f.id)).length;

  // Famílias sem Assistente de Família (AF) definido
  const familiasSemAF = families.filter(f => !f.afResponsavel);

  // Frequentadores sem acompanhamento (frequentadores sem telefone OU sem grupo do Whats OU sem setor)
  const freqSemAcompanhamento = people.filter(p => {
    if (p.subtipoCadastro !== 'FREQUENTADOR') return false;
    const semWhats = !p.gruposWhats.grupoSetor && !p.gruposWhats.grupoGeral;
    const semCelular = !p.celularPrincipal;
    const semSetor = !p.setor2;

    return semWhats || semCelular || semSetor || !p.am;
  });

  // Growth / Distribution by Sector
  const sectorsMap: Record<string, { membros: number; freq: number }> = {};
  people.forEach(p => {
    const sector = p.setor2 || 'SEM SETOR';
    if (!sectorsMap[sector]) {
      sectorsMap[sector] = { membros: 0, freq: 0 };
    }
    if (p.subtipoCadastro === 'MEMBRO') {
      sectorsMap[sector].membros++;
    } else {
      sectorsMap[sector].freq++;
    }
  });

  const sectorsArray = Object.entries(sectorsMap)
    .map(([name, counts]) => ({
      name,
      membros: counts.membros,
      freq: counts.freq,
      total: counts.membros + counts.freq
    }))
    .sort((a, b) => b.total - a.total);

  // Neighborhood Heatmap Data
  const bairoMap: Record<string, { total: number; membros: number; freq: number }> = {};
  people.forEach(p => {
    const bairro = p.bairroAjustado || 'Não Informado';
    if (!bairoMap[bairro]) {
      bairoMap[bairro] = { total: 0, membros: 0, freq: 0 };
    }
    bairoMap[bairro].total++;
    if (p.subtipoCadastro === 'MEMBRO') {
      bairoMap[bairro].membros++;
    } else {
      bairoMap[bairro].freq++;
    }
  });

  const neighborhoodHeatmap = Object.entries(bairoMap)
    .map(([bairro, counts]) => ({
      bairro,
      ...counts
    }))
    .sort((a, b) => b.total - a.total);

  // Smart Warnings summary count
  const missingPostOutorgaCount = people.filter(
    p => p.tipoCadastro === 'Ohikari' && !Object.values(p.cursoPosOutorga.aulas).every(v => v === 'Concluido')
  ).length;

  const noWhatsCount = people.filter(
    p => p.jornadaEtapa !== 'Primeiro atendimento' && !p.gruposWhats.grupoSetor && !p.gruposWhats.grupoGeral
  ).length;

  const noSectorCount = people.filter(p => !p.setor2).length;
  const noPhoneCount = people.filter(p => !p.celularPrincipal).length;

  const totalPendencies =
    missingPostOutorgaCount +
    noWhatsCount +
    familiasSemAF.length +
    freqSemAcompanhamento.length +
    noSectorCount +
    noPhoneCount;

  // Journey stage distribution
  const journeyStagesMap: Record<string, number> = {};
  people.forEach(p => {
    const stage = p.jornadaEtapa || 'Não Informado';
    journeyStagesMap[stage] = (journeyStagesMap[stage] || 0) + 1;
  });

  const journeyStagesList = Object.entries(journeyStagesMap)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl glass-panel transition-all duration-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-sans font-semibold tracking-tight font-display">Painel de Indicadores — Johrei Center</h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Acompanhamento em tempo real da jornada espiritual, assistência familiar e pendências de desenvolvimento.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            id="btn-goto-people"
            onClick={() => onNavigate('people')}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm cursor-pointer"
          >
            Fazer Upload / Ver Membros
          </button>
          <button
            id="btn-goto-pendencies"
            onClick={() => onNavigate('pendencies')}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Pendências ({totalPendencies})
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Membros (clicável) */}
        <button
          type="button"
          onClick={() => onNavigate('people')}
          className="text-left p-5 rounded-xl glass-panel shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>Total de Membros</p>
              <h3 className="text-3xl font-sans font-bold tracking-tight mt-1">{totalMembros}</h3>
            </div>
            <span className="p-2 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
              <Shield className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-zinc-500">
              <span>
                Ativos: <strong className="text-emerald-500">{membrosAtivos}</strong>
              </span>
              <span>
                Afastados: <strong className="text-amber-500">{membrosAfastados}</strong>
              </span>
              <span>
                Falecidos: <strong className="text-red-500">{membrosFalecidos}</strong>
              </span>
            </div>
          </div>
        </button>

        {/* Total Frequentadores (clicável) */}
        <button
          type="button"
          onClick={() => onNavigate('frequenters')}
          className="text-left p-5 rounded-xl glass-panel shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>Frequentadores</p>
              <h3 className="text-3xl font-sans font-bold tracking-tight mt-1">{totalFrequentadores}</h3>
            </div>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{novosEsteMes} novos este mês</span>
          </div>
        </button>

        {/* Famílias Assistidas (clicável) */}
        <button
          type="button"
          onClick={() => onNavigate('families')}
          className="text-left p-5 rounded-xl glass-panel shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>Famílias Assistidas</p>
              <h3 className="text-3xl font-sans font-bold tracking-tight mt-1">
                {familiasAssistidasCount} <span className="text-sm font-normal text-zinc-500">/ {families.length}</span>
              </h3>
            </div>
            <span className="p-2 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Home className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{familiasSemAF.length} sem AF definido</span>
          </div>
        </button>

        {/* Conclusão Pós-Outorga (não clicável) */}
        <div className="p-5 rounded-xl glass-panel shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>Pós-Outorga Concluído</p>
              <h3 className="text-3xl font-sans font-bold tracking-tight mt-1">{posOutorgaRatio}%</h3>
            </div>
            <span className="p-2 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
              <Compass className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 text-xs text-zinc-500 flex items-center justify-between">
            <span>
              {concluiuPos} de {totalMembros} membros
            </span>
            <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${posOutorgaRatio}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Rápidos de Acompanhamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={() => onNavigate('tree')}
          className="p-5 rounded-xl glass-panel shadow-sm space-y-4 md:col-span-2 text-left hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/40 dark:border-white/5">
            <h4 className="font-sans font-semibold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Compass className="w-4 h-4 text-teal-600" />
              Distribuição e Engajamento por Setor
            </h4>
            <span className={`text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Total de Setores: {sectorsArray.length}</span>
          </div>

          {/* Custom SVG Bar Chart */}
          <div className="space-y-4">
            {sectorsArray.map((sector) => {
              const maxTotal = Math.max(...sectorsArray.map(s => s.total), 1);
              const membroPercent = (sector.membros / maxTotal) * 100;
              const freqPercent = (sector.freq / maxTotal) * 100;

              return (
                <div key={sector.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="truncate">{sector.name || 'SEM SETOR'}</span>
                    <span className="font-mono text-zinc-400 text-[11px]">
                      {sector.total} pessoas{' '}
                      <span className="text-teal-600 dark:text-teal-400">({sector.membros} M</span> /{' '}
                      <span className="text-emerald-500">{sector.freq} F)</span>
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-100/60 dark:bg-zinc-800/40 rounded-lg flex overflow-hidden">
                    <div
                      className="bg-teal-600 h-full transition-all duration-500"
                      style={{ width: `${membroPercent}%` }}
                      title={`Membros: ${sector.membros}`}
                    />
                    <div
                      className="bg-emerald-400 h-full transition-all duration-500"
                      style={{ width: `${freqPercent}%` }}
                      title={`Frequentadores: ${sector.freq}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex gap-4 text-xxs font-mono text-zinc-500 justify-end">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-teal-600 rounded-sm" />
              Membros (Ohikari)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-sm" />
              Frequentadores
            </span>
          </div>
        </button>

        {/* Heatmap dos Bairros (não clicável) */}
        <div className="p-5 rounded-xl glass-panel shadow-sm space-y-4">
          <div className="pb-2 border-b border-slate-200/40 dark:border-white/5">
            <h4 className="font-sans font-semibold text-sm flex items-center gap-2 text-slate-800 dark:text-zinc-200">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Densidade de Bairros (Mapa de Calor)
            </h4>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {neighborhoodHeatmap.slice(0, 6).map((item) => {
              const maxCount = Math.max(...neighborhoodHeatmap.map(h => h.total), 1);
              const intensity = (item.total / maxCount) * 100;

              let bgClass = 'bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300';
              if (intensity > 75) bgClass = 'bg-red-500 text-white';
              else if (intensity > 40) bgClass = 'bg-orange-400 text-white';

              return (
                <div key={item.bairro} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-slate-700 dark:text-zinc-200">{item.bairro}</p>
                    <span className="text-zinc-400 text-xxs font-mono">
                      {item.membros} Membros • {item.freq} Frequentadores
                    </span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xxs font-mono font-bold ${bgClass}`}>
                    {item.total} p.
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xxs text-zinc-400 font-mono text-center pt-2 border-t border-slate-200/40 dark:border-white/5">
            Mostrando os bairros com maior concentração.
          </p>
        </div>
      </div>

      {/* Grid: Próximas Visitas e Pendências Críticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl glass-panel shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/40 dark:border-white/5">
            <h4 className="font-sans font-semibold text-sm text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Frequentadores Sem Acompanhamento ({freqSemAcompanhamento.length})
            </h4>
            <button
              id="btn-all-pendencies"
              onClick={() => onNavigate('pendencies')}
              className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
            >
              Ver Todas
            </button>
          </div>

          <div className="space-y-3">
            {freqSemAcompanhamento.slice(0, 4).map(person => (
              <div
                key={person.id}
                className="p-3 rounded-lg bg-white/50 dark:bg-zinc-950/20 border border-slate-200/30 dark:border-white/5 flex justify-between items-start text-xs gap-3"
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-zinc-100">{person.nome}</p>
                  <div className="flex gap-2 mt-1 text-xxs text-zinc-400 font-medium">
                    <span>{person.tipoCadastro}</span>
                    <span>•</span>
                    <span>Setor: {person.setor2 || 'Sem Setor'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {!person.celularPrincipal && (
                      <span className="px-1.5 py-0.5 rounded text-xxs bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-mono">Sem Telefone</span>
                    )}
                    {!person.am && (
                      <span className="px-1.5 py-0.5 rounded text-xxs bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 font-mono font-medium">Sem Setor/AM</span>
                    )}
                    {!person.gruposWhats.grupoSetor && (
                      <span className="px-1.5 py-0.5 rounded text-xxs bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400 font-mono font-medium">Fora do WhatsApp</span>
                    )}
                  </div>
                </div>
                <button
                  id={`btn-track-${person.id}`}
                  onClick={() => onNavigate('journey')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded text-xxs cursor-pointer font-bold transition-all shadow-xs"
                >
                  Acompanhar
                </button>
              </div>
            ))}
            {freqSemAcompanhamento.length === 0 && (
              <p className="text-xs text-zinc-500 italic text-center py-4">Excelente! Nenhum frequentador sem assistência ativa.</p>
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl glass-panel shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/40 dark:border-white/5">
            <h4 className="font-sans font-semibold text-sm flex items-center gap-2 text-slate-800 dark:text-zinc-200">
              <Award className="w-4 h-4 text-emerald-500" />
              Etapas de Desenvolvimento Espiritual
            </h4>
            <button
              id="btn-goto-journey"
              onClick={() => onNavigate('journey')}
              className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
            >
              Ver Jornada
            </button>
          </div>

          <div className="space-y-3">
            {journeyStagesList.slice(0, 5).map(({ stage, count }) => {
              const maxCount = Math.max(...journeyStagesList.map(j => j.count), 1);
              const percentage = Math.round((count / maxCount) * 100);

              return (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="truncate">{stage}</span>
                    <span className="font-mono text-zinc-400 text-[11px]">{count} pessoas</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100/60 dark:bg-zinc-800/40 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

