/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Person, Family } from '../types';
import { FileText, Download, Printer, Filter, Shield, BookOpen, Heart, AlertTriangle } from 'lucide-react';

interface ReportsViewProps {
  people: Person[];
  families: Family[];
  isDark: boolean;
}

export default function ReportsView({ people, families, isDark }: ReportsViewProps) {
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [bairroFilter, setBairroFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Extract unique sectors, neighborhoods, etc.
  const sectorsList = Array.from(new Set(people.map(p => p.setor2 || 'SEM SETOR').filter(Boolean)));
  const bairrosList = Array.from(new Set(people.map(p => p.bairroAjustado || 'N/A').filter(Boolean)));

  // Filter people based on selection
  const filtered = people.filter(p => {
    const sectorMatch = sectorFilter === 'ALL' || (p.setor2 || 'SEM SETOR') === sectorFilter;
    const bairroMatch = bairroFilter === 'ALL' || (p.bairroAjustado || 'N/A') === bairroFilter;
    const statusMatch = statusFilter === 'ALL' || p.statusAtual === statusFilter;
    
    let courseMatch = true;
    if (courseFilter === 'CI_OK') {
      courseMatch = p.cursoIniciacao.concluido;
    } else if (courseFilter === 'CI_PEND') {
      courseMatch = !p.cursoIniciacao.concluido;
    } else if (courseFilter === 'PO_OK') {
      courseMatch = Object.values(p.cursoPosOutorga.aulas).every(v => v === 'Concluido');
    } else if (courseFilter === 'PO_PEND') {
      courseMatch = !Object.values(p.cursoPosOutorga.aulas).every(v => v === 'Concluido');
    }

    return sectorMatch && bairroMatch && statusMatch && courseMatch;
  });

  // Export filtered list to CSV
  const handleExportCSV = () => {
    const headers = [
      'Código Cadastro', 'Nome Completo', 'Tipo Cadastro', 'Subtipo', 'Status', 'Idade', 
      'Telefone', 'Email', 'Endereço', 'Bairro', 'Setor', 'Assistente Ministro', 'Assistente Família'
    ];

    const rows = filtered.map(p => [
      p.id, p.nome, p.tipoCadastro, p.subtipoCadastro, p.statusAtual, p.idade,
      p.celularPrincipal, p.email, p.endCompleto, p.bairroAjustado, p.setor2, p.am, p.af2
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Filtrado_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Central de Relatórios e Exportação</h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Filtre e extraia planilhas compatíveis com Excel/Looker para análise regional de outorgas e engajamento pastoral.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            id="btn-print-report"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-200/40 dark:border-white/10 bg-white/40 dark:bg-zinc-900/60 hover:bg-slate-100/50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-zinc-300"
          >
            <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Imprimir Relatório
          </button>
          <button 
            id="btn-download-csv-report"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar CSV Filtrado
          </button>
        </div>
      </div>

      {/* Interactive Report Filters */}
      <div className="p-5 rounded-xl glass-panel shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-white/5">
          <Filter className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
          <h3 className="text-[10px] font-mono uppercase tracking-wider font-bold">Filtros Avançados de Extração</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Sector Selector */}
          <div>
            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Setor Externo (SETOR2)</label>
            <select 
              id="report-sector-select"
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
            >
              <option value="ALL">Qualquer Setor</option>
              {sectorsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Bairro Selector */}
          <div>
            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Bairro Ajustado</label>
            <select 
              id="report-bairro-select"
              value={bairroFilter}
              onChange={(e) => setBairroFilter(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
            >
              <option value="ALL">Qualquer Bairro</option>
              {bairrosList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Course completion filter */}
          <div>
            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Curso / Formação</label>
            <select 
              id="report-course-select"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
            >
              <option value="ALL">Qualquer Formação</option>
              <option value="CI_OK">Concluiu Curso Iniciação</option>
              <option value="CI_PEND">Não Concluiu Iniciação</option>
              <option value="PO_OK">Concluiu Pós-Outorga</option>
              <option value="PO_PEND">Pós-Outorga Incompleto</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Status de Cadastro</label>
            <select 
              id="report-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
            >
              <option value="ALL">Todos os Status</option>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
              <option value="AFASTADO">AFASTADO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Tabular preview */}
      <div className="p-6 rounded-xl glass-panel shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200/40 dark:border-white/5">
          <h3 className="text-sm font-sans font-bold">Pré-visualização do Relatório ({filtered.length} pessoas encontradas)</h3>
          <span className="text-[10px] font-mono text-zinc-400 tracking-wider">Tabela de Conformidade</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b border-slate-200/40 dark:border-white/5 font-mono text-[10px] uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                <th className="py-2 px-3">Código</th>
                <th className="py-2 px-3">Nome</th>
                <th className="py-2 px-3">Subtipo</th>
                <th className="py-2 px-3">Setor (SETOR2)</th>
                <th className="py-2 px-3">Bairro</th>
                <th className="py-2 px-3">Iniciação</th>
                <th className="py-2 px-3">Pós-Outorga</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-medium">
              {filtered.map(p => {
                const isCiOk = p.cursoIniciacao.concluido;
                const isPoOk = Object.values(p.cursoPosOutorga.aulas).every(v => v === 'Concluido' || v === 'Concluído');

                return (
                  <tr key={p.id} className="hover:bg-slate-100/30 dark:hover:bg-zinc-850/20">
                    <td className="py-3 px-3 font-mono text-teal-600 dark:text-teal-400 font-bold">{p.id}</td>
                    <td className="py-3 px-3 text-zinc-900 dark:text-zinc-100 uppercase font-semibold">{p.nome}</td>
                    <td className="py-3 px-3 font-bold">{p.subtipoCadastro}</td>
                    <td className="py-3 px-3">{p.setor2 || <span className="text-red-400 italic font-normal">Pendente</span>}</td>
                    <td className="py-3 px-3">{p.bairroAjustado || <span className="text-zinc-400">N/A</span>}</td>
                    <td className="py-3 px-3">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isCiOk ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' : 'bg-red-50 text-red-600 dark:bg-red-950/20'}`}>
                        {isCiOk ? 'Ok' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isPoOk ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' : 'bg-red-50 text-red-600 dark:bg-red-950/20'}`}>
                        {isPoOk ? 'Ok' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.statusAtual === 'ATIVO' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' 
                          : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {p.statusAtual}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 italic">
                    Nenhum cadastro atende aos filtros de relatório selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
