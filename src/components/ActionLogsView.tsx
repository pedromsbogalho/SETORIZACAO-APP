import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  User, 
  Tag, 
  Trash2, 
  Edit2, 
  PlusCircle, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight,
  Database
} from 'lucide-react';
import { ActionLog } from '../types';
import { fetchActionLogsFromFirebase } from '../utils/firebase';

interface ActionLogsViewProps {
  isDark: boolean;
}

export default function ActionLogsView({ isDark }: ActionLogsViewProps) {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  
  // Pagination
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(15);

  const loadLogs = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);

    try {
      const fetched = await fetchActionLogsFromFirebase();
      setLogs(fetched);
    } catch (err) {
      console.error("Erro ao carregar logs de ações:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Filter actions options
  const actionTypes = React.useMemo(() => {
    const list = logs.map(l => l.action).filter(Boolean);
    return Array.from(new Set(list));
  }, [logs]);

  // Filter logs based on search and selected action
  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;

      // Search query filter (user email, user name, details, target name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emailMatch = log.userEmail?.toLowerCase().includes(q);
        const nameMatch = log.userName?.toLowerCase().includes(q);
        const detailsMatch = log.details?.toLowerCase().includes(q);
        const targetMatch = log.targetName?.toLowerCase().includes(q);
        const actionMatch = log.action?.toLowerCase().includes(q);

        return emailMatch || nameMatch || detailsMatch || targetMatch || actionMatch;
      }

      return true;
    });
  }, [logs, filterAction, searchQuery]);

  // Paginated logs
  const paginatedLogs = React.useMemo(() => {
    const start = pageIndex * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, pageIndex, rowsPerPage]);

  const pageCount = Math.ceil(filteredLogs.length / rowsPerPage);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ADICIONAR_PESSOA':
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-bold font-sans uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40">
            <PlusCircle className="w-3 h-3" />
            Adicionar Membro
          </span>
        );
      case 'EDITAR_PESSOA':
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-bold font-sans uppercase bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40">
            <Edit2 className="w-3 h-3" />
            Editar Membro
          </span>
        );
      case 'EXCLUIR_PESSOA':
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-bold font-sans uppercase bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40">
            <Trash2 className="w-3 h-3" />
            Excluir Membro
          </span>
        );
      case 'EDITAR_ESTRUTURA':
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-bold font-sans uppercase bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40">
            <Database className="w-3 h-3" />
            Estrutura JC
          </span>
        );
      case 'CONTROLE_DE_ACESSO':
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-bold font-sans uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40">
            <ShieldAlert className="w-3 h-3" />
            Acesso & Cargos
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-bold font-sans uppercase bg-slate-50 text-slate-700 border border-slate-100 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800">
            {action}
          </span>
        );
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Auditoria & Logs de Ações
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Veja em tempo real o histórico completo de todas as adições, alterações e exclusões feitas por todos os usuários do sistema.
          </p>
        </div>
        <button
          onClick={() => loadLogs(true)}
          disabled={refreshing}
          className="px-3 py-1.5 bg-indigo-550 hover:bg-indigo-650 disabled:bg-indigo-300 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5 font-sans"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar Logs'}
        </button>
      </div>

      {/* Filter Section */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/20 border-zinc-850' : 'bg-white border-slate-200/50'} shadow-xs flex flex-col md:flex-row gap-4 items-center`}>
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação, descrição ou afetado..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPageIndex(0); }}
            className={`w-full text-xs pl-9 pr-4 py-2 rounded-lg border ${
              isDark 
                ? 'bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:border-indigo-500' 
                : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-500'
            } focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
          />
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-zinc-400 flex-shrink-0" />
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPageIndex(0); }}
            className={`w-full md:w-48 text-xs py-2 px-3 rounded-lg border ${
              isDark 
                ? 'bg-zinc-900/50 border-zinc-800 text-zinc-200 focus:border-indigo-500' 
                : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-500'
            } focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
          >
            <option value="ALL">Todas as Ações</option>
            {actionTypes.map(type => (
              <option key={type} value={type}>
                {type === 'ADICIONAR_PESSOA' && 'Adicionar Membro'}
                {type === 'EDITAR_PESSOA' && 'Editar Membro'}
                {type === 'EXCLUIR_PESSOA' && 'Excluir Membro'}
                {type === 'EDITAR_ESTRUTURA' && 'Estrutura JC'}
                {type === 'CONTROLE_DE_ACESSO' && 'Acesso & Cargos'}
                {!['ADICIONAR_PESSOA', 'EDITAR_PESSOA', 'EXCLUIR_PESSOA', 'EDITAR_ESTRUTURA', 'CONTROLE_DE_ACESSO'].includes(type) && type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-zinc-500 font-medium">Carregando logs de auditoria...</span>
        </div>
      ) : (
        <div className={`border ${isDark ? 'border-zinc-850 bg-zinc-950/10' : 'border-slate-200/60 bg-white'} rounded-xl overflow-hidden shadow-xs`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${isDark ? 'border-zinc-850 bg-zinc-900/40 text-zinc-400' : 'border-slate-200/50 bg-slate-50/50 text-slate-500'} text-[10px] font-bold font-sans uppercase tracking-wider`}>
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Descrição das Mudanças</th>
                  <th className="py-3 px-4">Membro Afetado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                {paginatedLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className={`text-xs hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 transition-colors ${
                      log.action === 'EXCLUIR_PESSOA' 
                        ? 'bg-red-500/5 hover:bg-red-500/10' 
                        : log.action === 'CONTROLE_DE_ACESSO' 
                        ? 'bg-indigo-500/5 hover:bg-indigo-500/10'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ${
                          isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.userName ? log.userName.charAt(0) : log.userEmail.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-zinc-200 truncate leading-tight">
                            {log.userName || log.userEmail.split('@')[0]}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate leading-none mt-0.5">
                            {log.userEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm text-slate-700 dark:text-zinc-300">
                      <p className="font-sans text-xs break-words">{log.details}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-zinc-200 whitespace-nowrap">
                      {log.targetName ? (
                        <div className="flex items-center gap-1">
                          <span className="p-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-[10px] font-mono leading-none">
                            {log.targetId ? log.targetId.split('-')[1] || log.targetId : ''}
                          </span>
                          <span className="truncate max-w-[150px]" title={log.targetName}>
                            {log.targetName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic text-xxs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-zinc-500 italic">
                      Nenhum registro de log encontrado com estes critérios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pageCount > 1 && (
            <div className={`py-3 px-4 border-t ${isDark ? 'border-zinc-850' : 'border-slate-100'} flex items-center justify-between`}>
              <span className="text-[11px] text-zinc-400 font-mono">
                Mostrando {pageIndex * rowsPerPage + 1} - {Math.min((pageIndex + 1) * rowsPerPage, filteredLogs.length)} de {filteredLogs.length} logs
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex(prev => prev - 1)}
                  className="p-1 rounded-md border border-slate-200/60 dark:border-zinc-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer text-zinc-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-zinc-500 px-3">
                  Página {pageIndex + 1} de {pageCount}
                </span>
                <button
                  disabled={pageIndex === pageCount - 1}
                  onClick={() => setPageIndex(prev => prev + 1)}
                  className="p-1 rounded-md border border-slate-200/60 dark:border-zinc-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-zinc-900 cursor-pointer text-zinc-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
