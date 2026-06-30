/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Person } from '../types';
import { 
  Gift, 
  Calendar, 
  Search, 
  Smartphone, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserCheck, 
  Cake, 
  Sparkles, 
  Clock, 
  Filter,
  MessageCircle,
  Hash
} from 'lucide-react';

interface BirthdaysViewProps {
  people: Person[];
  isDark: boolean;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface BirthdayPerson {
  person: Person;
  day: number;
  month: number;
  year: number | null;
  ageThisYear: number | null;
  isToday: boolean;
}

export default function BirthdaysView({ people, isDark }: BirthdaysViewProps) {
  const today = useMemo(() => new Date(), []);
  const currentMonthIdx = today.getMonth(); // 0-11
  const currentDay = today.getDate();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx + 1); // 1-12
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MEMBRO' | 'FREQUENTADOR'>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');

  // Parse all birthdays
  const allBirthdays = useMemo(() => {
    const list: BirthdayPerson[] = [];
    
    people.forEach(p => {
      if (!p.nascimento) return;
      
      let year: number | null = null;
      let month = 0;
      let day = 0;

      // Format YYYY-MM-DD
      const matchYMD = p.nascimento.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchYMD) {
        year = parseInt(matchYMD[1], 10);
        month = parseInt(matchYMD[2], 10);
        day = parseInt(matchYMD[3], 10);
      } else {
        // Format DD/MM/YYYY
        const matchDMY = p.nascimento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (matchDMY) {
          year = parseInt(matchDMY[3], 10);
          month = parseInt(matchDMY[2], 10);
          day = parseInt(matchDMY[1], 10);
        } else {
          // Format MM-DD
          const matchMD = p.nascimento.match(/^(\d{2})-(\d{2})$/);
          if (matchMD) {
            month = parseInt(matchMD[1], 10);
            day = parseInt(matchMD[2], 10);
          }
        }
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const isToday = day === currentDay && month === (currentMonthIdx + 1);
        const ageThisYear = year ? (today.getFullYear() - year) : null;

        list.push({
          person: p,
          day,
          month,
          year,
          ageThisYear,
          isToday
        });
      }
    });

    return list;
  }, [people, currentDay, currentMonthIdx, today]);

  // Extract unique sectors for filter
  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    people.forEach(p => {
      if (p.setor2) {
        sectors.add(p.setor2);
      }
    });
    return Array.from(sectors).sort();
  }, [people]);

  // Filter and sort birthdays for the selected month
  const filteredBirthdays = useMemo(() => {
    return allBirthdays
      .filter(item => {
        // Month filter
        if (item.month !== selectedMonth) return false;

        // Search query filter
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const nameMatch = item.person.nome.toLowerCase().includes(query);
          const phoneMatch = item.person.celularPrincipal?.includes(query);
          const sectorMatch = item.person.setor2?.toLowerCase().includes(query);
          if (!nameMatch && !phoneMatch && !sectorMatch) return false;
        }

        // Category filter
        if (categoryFilter !== 'ALL' && item.person.subtipoCadastro !== categoryFilter) return false;

        // Sector filter
        if (sectorFilter !== 'ALL' && item.person.setor2 !== sectorFilter) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort by day first, then by name
        if (a.day !== b.day) return a.day - b.day;
        return a.person.nome.localeCompare(b.person.nome);
      });
  }, [allBirthdays, selectedMonth, searchQuery, categoryFilter, sectorFilter]);

  // Calculate statistics for the selected month
  const stats = useMemo(() => {
    const monthlyItems = allBirthdays.filter(item => item.month === selectedMonth);
    const total = monthlyItems.length;
    const members = monthlyItems.filter(item => item.person.subtipoCadastro === 'MEMBRO').length;
    const frequenters = monthlyItems.filter(item => item.person.subtipoCadastro === 'FREQUENTADOR').length;
    
    // Find today's birthdays (anywhere or in this month)
    const todaysCount = allBirthdays.filter(item => item.isToday).length;

    // Upcoming next in this month (from today onwards)
    const upcoming = monthlyItems
      .filter(item => item.day >= currentDay)
      .sort((a, b) => a.day - b.day);

    return {
      total,
      members,
      frequenters,
      todaysCount,
      nextUpcoming: upcoming[0] || null
    };
  }, [allBirthdays, selectedMonth, currentDay]);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => (prev === 1 ? 12 : prev - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => (prev === 12 ? 1 : prev + 1));
  };

  const jumpToCurrentMonth = () => {
    setSelectedMonth(currentMonthIdx + 1);
  };

  const formatWhatsAppUrl = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const greeting = `Olá, ${name}! Feliz aniversário! 🥳🎉\n\nQue Meishu-Sama te abençoe grandemente hoje e sempre com muita saúde, paz, amor e luz divina neste novo ciclo de vida! Parabéns!`;
    const message = encodeURIComponent(greeting);
    return `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${message}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display flex items-center gap-2">
            <Gift className="w-6 h-6 text-orange-500 animate-bounce" />
            Aniversariantes do Mês
          </h2>
          <p className={`text-xs md:text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Organize e envie felicitações para os aniversariantes do Johrei Center Caraguatatuba.
          </p>
        </div>

        {/* Quick actions */}
        <button
          onClick={jumpToCurrentMonth}
          className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all border cursor-pointer flex items-center gap-2
            ${selectedMonth === currentMonthIdx + 1 
              ? 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400' 
              : isDark 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Mês Atual ({MONTH_NAMES[currentMonthIdx]})
        </button>
      </div>

      {/* MONTH NAVIGATION CAROUSEL */}
      <div className={`p-4 rounded-xl border backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4
        ${isDark ? 'bg-zinc-900/50 border-zinc-800/60' : 'bg-white border-slate-200/60 shadow-xs'}`}>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className={`p-2 rounded-lg border transition-all hover:scale-105 cursor-pointer
              ${isDark ? 'border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-300' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="w-40 text-center">
            <span className="text-lg font-bold font-display text-teal-600 dark:text-teal-400 block">
              {MONTH_NAMES[selectedMonth - 1]}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              {selectedMonth === currentMonthIdx + 1 ? 'Mês Vigente' : 'Outro Período'}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className={`p-2 rounded-lg border transition-all hover:scale-105 cursor-pointer
              ${isDark ? 'border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-300' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop month grid buttons for instant jump */}
        <div className="hidden lg:flex flex-wrap gap-1.5 justify-end flex-1 max-w-4xl">
          {MONTH_NAMES.map((name, idx) => {
            const mNum = idx + 1;
            const isCurrent = mNum === currentMonthIdx + 1;
            const isSelected = mNum === selectedMonth;
            return (
              <button
                key={mNum}
                onClick={() => setSelectedMonth(mNum)}
                className={`px-2.5 py-1.5 text-xxs font-semibold rounded-md transition-all cursor-pointer border
                  ${isSelected
                    ? 'bg-teal-500 text-white border-teal-500 shadow-xs'
                    : isCurrent
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                      : isDark
                        ? 'bg-zinc-950/40 border-zinc-850 hover:bg-zinc-800 text-zinc-400'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-150 text-slate-600'
                  }`}
              >
                {name.substring(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* QUICK STATS WIDGETS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total birthdays count */}
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-white border-slate-200 shadow-xxs'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Total no Mês</p>
              <h4 className="text-2xl font-bold font-display mt-0.5">{stats.total}</h4>
            </div>
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-500">
              <Cake className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1.5">
            <span>{stats.members} membros • {stats.frequenters} freq.</span>
          </div>
        </div>

        {/* Today's birthdays alert */}
        <div className={`p-4 rounded-xl border ${stats.todaysCount > 0 ? 'border-orange-500/30 bg-orange-500/5' : isDark ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-white border-slate-200 shadow-xxs'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Aniversários Hoje</p>
              <h4 className={`text-2xl font-bold font-display mt-0.5 ${stats.todaysCount > 0 ? 'text-orange-500' : ''}`}>
                {stats.todaysCount}
              </h4>
            </div>
            <span className={`p-1.5 rounded-lg ${stats.todaysCount > 0 ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
              <Sparkles className="w-4 h-4 animate-pulse" />
            </span>
          </div>
          <div className="mt-2 text-[10px] text-zinc-500">
            {stats.todaysCount > 0 ? (
              <span className="text-orange-600 dark:text-orange-400 font-semibold">Parabéns aos aniversariantes! 🎉</span>
            ) : (
              <span>Nenhum hoje</span>
            )}
          </div>
        </div>

        {/* Next Birthday Up */}
        <div className={`p-4 rounded-xl border col-span-2 ${isDark ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-white border-slate-200 shadow-xxs'}`}>
          <div className="flex justify-between items-start">
            <div className="truncate max-w-[80%]">
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Próximo Aniversário</p>
              {stats.nextUpcoming ? (
                <div>
                  <h4 className="text-sm font-bold truncate mt-1 text-teal-600 dark:text-teal-400">
                    Dia {stats.nextUpcoming.day} - {stats.nextUpcoming.person.nome}
                  </h4>
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {stats.nextUpcoming.person.subtipoCadastro} • Fará {stats.nextUpcoming.ageThisYear ?? 'N/A'} anos
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 mt-2">Sem próximos aniversários este mês</p>
              )}
            </div>
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-500">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row gap-3 items-center justify-between
        ${isDark ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-white border-slate-200/50 shadow-xxs'}`}>
        
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou setor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-hidden transition-all
              ${isDark 
                ? 'bg-zinc-950 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:border-teal-500/50' 
                : 'bg-slate-55 border-slate-200 placeholder-slate-400 focus:border-teal-500 focus:bg-white'
              }`}
          />
        </div>

        {/* Filter Badges / Selects */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Category tabs */}
          <div className="flex rounded-lg border border-slate-200 dark:border-zinc-800 p-0.5 bg-slate-50 dark:bg-zinc-950">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-2.5 py-1 text-xxs font-semibold rounded-md transition-all cursor-pointer
                ${categoryFilter === 'ALL' 
                  ? 'bg-white dark:bg-zinc-850 shadow-xs text-slate-800 dark:text-zinc-100' 
                  : 'text-zinc-400 hover:text-zinc-300'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setCategoryFilter('MEMBRO')}
              className={`px-2.5 py-1 text-xxs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1
                ${categoryFilter === 'MEMBRO' 
                  ? 'bg-white dark:bg-zinc-850 shadow-xs text-teal-600 dark:text-teal-400 font-bold' 
                  : 'text-zinc-400 hover:text-zinc-300'
                }`}
            >
              <UserCheck className="w-3 h-3" />
              Membros
            </button>
            <button
              onClick={() => setCategoryFilter('FREQUENTADOR')}
              className={`px-2.5 py-1 text-xxs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1
                ${categoryFilter === 'FREQUENTADOR' 
                  ? 'bg-white dark:bg-zinc-850 shadow-xs text-emerald-600 dark:text-emerald-400 font-bold' 
                  : 'text-zinc-400 hover:text-zinc-300'
                }`}
            >
              <Users className="w-3 h-3" />
              Freq.
            </button>
          </div>

          {/* Sector Select filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-zinc-400" />
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className={`text-xxs px-2.5 py-1.5 rounded-lg border outline-hidden font-semibold cursor-pointer
                ${isDark 
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-teal-500/50' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
            >
              <option value="ALL">Todos os Setores</option>
              {availableSectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* BIRTHDAYS LIST */}
      {filteredBirthdays.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3
          ${isDark ? 'border-zinc-800 bg-zinc-950/20' : 'border-slate-200 bg-slate-50/50'}`}>
          <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400">
            <Gift className="w-6 h-6" />
          </div>
          <div className="max-w-xs space-y-1">
            <p className="text-sm font-semibold">Nenhum aniversariante encontrado</p>
            <p className="text-xs text-zinc-400">
              Não encontramos aniversariantes para os filtros aplicados neste mês de {MONTH_NAMES[selectedMonth - 1]}.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBirthdays.map((item) => {
            const isMembro = item.person.subtipoCadastro === 'MEMBRO';
            return (
              <div
                key={item.person.id}
                className={`group rounded-xl border p-4 transition-all relative overflow-hidden flex gap-4
                  ${item.isToday 
                    ? 'border-orange-500/40 bg-orange-500/[0.03] ring-1 ring-orange-500/30' 
                    : isDark 
                      ? 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60' 
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
              >
                {/* Decorative confetti/gift for today's birthday */}
                {item.isToday && (
                  <div className="absolute top-0 right-0 p-1 bg-gradient-to-l from-orange-500 to-amber-500 text-white rounded-bl-lg">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                )}

                {/* Day representation */}
                <div className="flex flex-col items-center justify-center flex-shrink-0">
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border transition-colors
                    ${item.isToday 
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400' 
                      : isDark
                        ? 'bg-zinc-950 border-zinc-850 text-zinc-200'
                        : 'bg-slate-50 border-slate-200/60 text-slate-700'
                    }`}
                  >
                    <span className="text-[9px] font-mono tracking-wider uppercase opacity-75">Dia</span>
                    <span className="text-xl font-bold font-display leading-tight">{item.day}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <h5 className="font-semibold text-xs md:text-sm truncate pr-2 group-hover:text-teal-500 transition-colors">
                      {item.person.nome}
                    </h5>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    {/* Role badge */}
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide flex items-center gap-1
                      ${isMembro 
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' 
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isMembro ? <UserCheck className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
                      {item.person.subtipoCadastro}
                    </span>

                    {/* Sector Badge */}
                    {item.person.setor2 && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono tracking-wider
                        ${isDark ? 'bg-zinc-950 text-zinc-400 border border-zinc-850' : 'bg-slate-100 text-slate-500 border border-slate-200/50'}`}>
                        {item.person.setor2}
                      </span>
                    )}

                    {/* Age */}
                    {item.ageThisYear !== null && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold flex items-center gap-0.5
                        ${item.isToday 
                          ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' 
                          : isDark ? 'bg-zinc-950 text-zinc-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Cake className="w-2.5 h-2.5 text-orange-500" />
                        {item.ageThisYear} anos
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 pt-1 text-[10px] text-zinc-400 font-mono">
                    {item.person.nascimento && (
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        Nasc.: {item.person.nascimento.split('-').reverse().join('/')}
                      </p>
                    )}
                    {item.person.celularPrincipal && (
                      <p className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-zinc-500" />
                        Tel: {item.person.celularPrincipal}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp send congratulation action */}
                  {item.person.celularPrincipal && (
                    <div className="pt-2 flex justify-start">
                      <a
                        href={formatWhatsAppUrl(item.person.celularPrincipal, item.person.nome)}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all shadow-xs"
                      >
                        <MessageCircle className="w-3 h-3 fill-white text-emerald-500" />
                        Parabenizar no WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}