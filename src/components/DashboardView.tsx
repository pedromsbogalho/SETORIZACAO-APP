/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Person, Family } from '../types';
import { Users, Shield, Compass, AlertTriangle, TrendingUp, Home, Award, Calendar } from 'lucide-react';

type PeriodPreset = 'CURRENT_MONTH' | 'PREVIOUS_MONTH' | 'LAST_2_MONTHS' | 'LAST_3_MONTHS' | 'CURRENT_YEAR' | 'CUSTOM';

const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'CURRENT_MONTH', label: 'Mês atual' },
  { key: 'PREVIOUS_MONTH', label: 'Mês anterior' },
  { key: 'LAST_2_MONTHS', label: 'Últimos 2 meses' },
  { key: 'LAST_3_MONTHS', label: 'Últimos 3 meses' },
  { key: 'CURRENT_YEAR', label: 'Ano atual' },
  { key: 'CUSTOM', label: 'Personalizado' },
];

function periodToRange(preset: PeriodPreset, custom: { from: string; to: string }): { from: Date; to: Date; label: string } {
  const now = new Date();
  const to = new Date();
  const from = new Date();
  let label = '';

  switch (preset) {
    case 'CURRENT_MONTH':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      label = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      break;
    case 'PREVIOUS_MONTH': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      from.setTime(prev.getTime());
      to.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime());
      label = prev.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      break;
    }
    case 'LAST_2_MONTHS':
      from.setMonth(now.getMonth() - 1);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      label = 'Últimos 2 meses';
      break;
    case 'LAST_3_MONTHS':
      from.setMonth(now.getMonth() - 2);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      label = 'Últimos 3 meses';
      break;
    case 'CURRENT_YEAR':
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      label = `Ano ${now.getFullYear()}`;
      break;
    case 'CUSTOM': {
      const f = custom.from ? new Date(custom.from) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = custom.to ? new Date(custom.to) : now;
      f.setHours(0, 0, 0, 0);
      t.setHours(23, 59, 59, 999);
      label = `${f.toLocaleDateString('pt-BR')} – ${t.toLocaleDateString('pt-BR')}`;
      return { from: f, to: t, label };
    }
  }
  to.setHours(23, 59, 59, 999);
  return { from, to, label };
}

function parseOutorgaDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  let iso = String(raw).trim();
  if (!iso) return null;
  if (iso.includes('/')) {
    const parts = iso.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

interface PeriodSelectorProps {
  preset: PeriodPreset;
  onPresetChange: (p: PeriodPreset) => void;
  custom: { from: string; to: string };
  onCustomChange: (c: { from: string; to: string }) => void;
  isDark: boolean;
}

function PeriodSelector({ preset, onPresetChange, custom, onCustomChange, isDark }: PeriodSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PERIOD_PRESETS.map(p => {
          const active = preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onPresetChange(p.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 cursor-pointer ${active
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                  : isDark
                    ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80 border border-white/5'
                    : 'bg-white/70 text-slate-600 hover:bg-white border border-slate-200/60'
                }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {preset === 'CUSTOM' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={custom.from}
            onChange={e => onCustomChange({ ...custom, from: e.target.value })}
            className={`text-[11px] px-2 py-1 rounded-md border ${isDark ? 'bg-zinc-800/60 border-white/10 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'}`}
          />
          <span className="text-[10px] text-zinc-400 font-mono">até</span>
          <input
            type="date"
            value={custom.to}
            onChange={e => onCustomChange({ ...custom, to: e.target.value })}
            className={`text-[11px] px-2 py-1 rounded-md border ${isDark ? 'bg-zinc-800/60 border-white/10 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'}`}
          />
        </div>
      )}
    </div>
  );
}

interface DashboardViewProps {
  people: Person[];
  families: Family[];
  onNavigate: (tab: string) => void;
  isDark: boolean;
  currentUserRole?: string;
  currentUserSectors?: string[];
}

export default function DashboardView({
  people: rawPeople,
  families: rawFamilies,
  onNavigate,
  isDark,
  currentUserRole,
  currentUserSectors
}: DashboardViewProps) {
  // If restricted to a sector, filter people and families first
  const people = React.useMemo(() => {
    if (currentUserRole === 'AM' && currentUserSectors && currentUserSectors.length > 0) {
      const sectorsUpper = currentUserSectors.map(s => s.toUpperCase());
      return rawPeople.filter(p => sectorsUpper.includes((p.setor2 || '').toUpperCase()));
    }
    return rawPeople;
  }, [rawPeople, currentUserRole, currentUserSectors]);

  const families = React.useMemo(() => {
    if (currentUserRole === 'AM' && currentUserSectors && currentUserSectors.length > 0) {
      const sectorsUpper = currentUserSectors.map(s => s.toUpperCase());
      return rawFamilies.filter(f =>
        rawPeople.some(p => p.idFamilia === f.id && sectorsUpper.includes((p.setor2 || '').toUpperCase()))
      );
    }
    return rawFamilies;
  }, [rawFamilies, rawPeople, currentUserRole, currentUserSectors]);

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

  // ── Period selector (shared by outorgas + novos) ─────────────────────────
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('CURRENT_MONTH');
  const [periodCustom, setPeriodCustom] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const currentRange = useMemo(
    () => periodToRange(periodPreset, periodCustom),
    [periodPreset, periodCustom]
  );

  // Novos no período selecionado (substitui o hardcoded 2026-06)
  const novosNoPeriodo = useMemo(() => {
    return people.filter(p => {
      const firstAttend = p.jornadaDatas['Primeiro atendimento'];
      if (!firstAttend) return false;
      const d = new Date(firstAttend);
      if (isNaN(d.getTime())) return false;
      return d >= currentRange.from && d <= currentRange.to;
    }).length;
  }, [people, currentRange]);

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

  // ── Outorgas por mês (últimos 24 meses com dados) ────────────────────────
  const outorgasByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    people.forEach(p => {
      if (!p.dataOutorga) return;
      // dataOutorga pode estar em YYYY-MM-DD ou DD/MM/YYYY
      let iso = p.dataOutorga.trim();
      if (iso.includes('/')) {
        const parts = iso.split('/');
        if (parts.length === 3 && parts[2].length === 4) {
          iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const monthKey = iso.substring(0, 7); // YYYY-MM
      if (/^\d{4}-\d{2}$/.test(monthKey)) {
        map[monthKey] = (map[monthKey] || 0) + 1;
      }
    });
    // Ordenar por data e pegar os últimos 24 meses com dados
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([month, count]) => {
        const [year, m] = month.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return { key: month, label: `${monthNames[parseInt(m) - 1]}/${year.slice(2)}`, count };
      });
  }, [people]);

  // ── Outorgas por setor ─────────────────────────────────────────────────────
  const outorgasBySector = useMemo(() => {
    const map: Record<string, number> = {};
    people.forEach(p => {
      if (!p.dataOutorga || p.subtipoCadastro !== 'MEMBRO') return;
      const setor = p.setor2 || 'SEM SETOR';
      map[setor] = (map[setor] || 0) + 1;
    });
    return Object.entries(map)
      .map(([setor, count]) => ({ setor, count }))
      .sort((a, b) => b.count - a.count);
  }, [people]);

  const maxOutorgaMonth = Math.max(...outorgasByMonth.map(m => m.count), 1);
  const maxOutorgaSector = Math.max(...outorgasBySector.map(s => s.count), 1);

  // Filtro de setor para o gráfico mensal
  const [outorgaSectorFilter, setOutorgaSectorFilter] = useState<string>('TODOS');

  const outorgasByMonthFiltered = useMemo(() => {
    if (outorgaSectorFilter === 'TODOS') return outorgasByMonth;
    const map: Record<string, number> = {};
    people
      .filter(p => p.dataOutorga && (p.setor2 || 'SEM SETOR') === outorgaSectorFilter)
      .forEach(p => {
        let iso = (p.dataOutorga || '').trim();
        if (iso.includes('/')) {
          const parts = iso.split('/');
          if (parts.length === 3 && parts[2].length === 4)
            iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        const monthKey = iso.substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(monthKey)) map[monthKey] = (map[monthKey] || 0) + 1;
      });
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([month, count]) => {
        const [year, m] = month.split('-');
        return { key: month, label: `${monthNames[parseInt(m) - 1]}/${year.slice(2)}`, count };
      });
  }, [people, outorgaSectorFilter, outorgasByMonth]);

  const maxFiltered = Math.max(...outorgasByMonthFiltered.map(m => m.count), 1);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  const allSectorsForFilter = useMemo(() => {
    const set = new Set(people.filter(p => p.setor2).map(p => p.setor2!));
    return Array.from(set).sort();
  }, [people]);

  // Journey stage distribution
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

      {/* ── Gráfico de Outorgas ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras: Outorgas por mês */}
        <div className="lg:col-span-2 p-5 rounded-xl glass-panel shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-200/40 dark:border-white/5">
            <div>
              <h4 className="font-sans font-semibold text-sm flex items-center gap-2 text-slate-800 dark:text-zinc-200">
                <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Outorgas por Mês
              </h4>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                Total geral: {people.filter(p => p.dataOutorga).length} outorgas registradas
              </p>
            </div>
            {/* Filtro de setor */}
            <select
              value={outorgaSectorFilter}
              onChange={e => setOutorgaSectorFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-200 focus:outline-none"
            >
              <option value="TODOS">Todos os Setores</option>
              {allSectorsForFilter.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {outorgasByMonthFiltered.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-400 italic text-sm">
              Nenhuma outorga registrada com data válida.
            </div>
          ) : (
            <div className="relative">
              {/* Tooltip */}
              {hoveredMonth && (() => {
                const item = outorgasByMonthFiltered.find(m => m.key === hoveredMonth);
                return item ? (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-zinc-900 text-white text-[11px] font-mono rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
                    {item.label}: <strong>{item.count}</strong> outorga{item.count !== 1 ? 's' : ''}
                  </div>
                ) : null;
              })()}

              {/* Barras */}
              <div className="flex items-end gap-1 h-48 overflow-x-auto pb-6 pt-6">
                {outorgasByMonthFiltered.map(item => {
                  const heightPct = (item.count / maxFiltered) * 100;
                  const isHovered = hoveredMonth === item.key;
                  return (
                    <div
                      key={item.key}
                      className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
                      style={{ minWidth: outorgasByMonthFiltered.length > 16 ? '28px' : '36px' }}
                      onMouseEnter={() => setHoveredMonth(item.key)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      <div className="w-full flex items-end" style={{ height: '140px' }}>
                        <div
                          className={`w-full rounded-t-md transition-all duration-200 ${isHovered ? 'bg-teal-500' : 'bg-teal-600/70'}`}
                          style={{ height: `${Math.max(heightPct, 3)}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-mono mt-1 rotate-45 origin-left whitespace-nowrap ${isHovered ? 'text-teal-600 font-bold' : 'text-zinc-400'}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Linhas de grade */}
              <div className="absolute inset-x-0 top-6 bottom-6 pointer-events-none flex flex-col justify-between">
                {[maxFiltered, Math.round(maxFiltered * 0.5), 0].map(val => (
                  <div key={val} className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-zinc-300 w-4 text-right">{val}</span>
                    <div className="flex-1 border-t border-slate-200/30 dark:border-white/5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barras horizontais: Outorgas por setor */}
        <div className="p-5 rounded-xl glass-panel shadow-sm space-y-4">
          <div className="pb-2 border-b border-slate-200/40 dark:border-white/5">
            <h4 className="font-sans font-semibold text-sm flex items-center gap-2 text-slate-800 dark:text-zinc-200">
              <Compass className="w-4 h-4 text-orange-500" />
              Outorgas por Setor
            </h4>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
              Membros com Ohikari por setor
            </p>
          </div>

          <div className="space-y-3">
            {outorgasBySector.map(item => {
              const pct = (item.count / maxOutorgaSector) * 100;
              const isHov = hoveredSector === item.setor;
              return (
                <div
                  key={item.setor}
                  className="space-y-1 cursor-default"
                  onMouseEnter={() => setHoveredSector(item.setor)}
                  onMouseLeave={() => setHoveredSector(null)}
                >
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={`truncate ${isHov ? 'text-teal-600 dark:text-teal-400' : ''}`}>
                      {item.setor}
                    </span>
                    <span className="font-mono text-zinc-400 text-[11px] ml-2 flex-shrink-0">
                      {item.count}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100/60 dark:bg-zinc-800/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isHov ? 'bg-teal-500' : 'bg-teal-600/75'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {outorgasBySector.length === 0 && (
              <p className="text-xs text-zinc-400 italic text-center py-4">Sem dados de outorga por setor.</p>
            )}
          </div>
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

