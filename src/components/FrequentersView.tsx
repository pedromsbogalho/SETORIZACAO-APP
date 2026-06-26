/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Person, SubtipoCadastro, StatusAtual, JornadaEtapa, JohreiCenterStructure } from '../types';
import { Search, UserPlus, Upload, FileText, Trash2, Edit2, Download, Filter, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import { parseCSV, generateSampleCSVString } from '../utils/csvParser';

interface FrequentersViewProps {
  people: Person[];
  onUpdatePeople: (newPeople: Person[]) => void;
  isDark: boolean;
  currentUserRole: 'ADMIN' | 'AM';
  currentAMName?: string;
  structure: JohreiCenterStructure;
}

export default function FrequentersView({
  people,
  onUpdatePeople,
  isDark,
  currentUserRole,
  currentAMName,
  structure
}: FrequentersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSector, setFilterSector] = useState<string>('ALL');
  const [sortField, setSortField] = useState<string>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Column resizing state (initial widths for columns)
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    id: 110,
    nome: 240,
    tipo: 100,
    etapa: 200,
    setor: 180,
    bairro: 180,
    celular: 140,
    acoes: 100
  });

  const handleMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colKey] || 120;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + (moveEvent.pageX - startX));
      setColWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPageIndex(0);
  };

  // Get sector statistics for frequenters
  const sectorStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    people.forEach(p => {
      if (p.subtipoCadastro === 'FREQUENTADOR') {
        const sector = p.setor2 || 'SEM SETOR';
        stats[sector] = (stats[sector] || 0) + 1;
      }
    });
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [people]);

  // Unique list of sectors for filter
  const sectorsList = React.useMemo(() => {
    return sectorStats.map(s => s.name).sort();
  }, [sectorStats]);

  // Row limits & pagination
  const [rowsLimit, setRowsLimit] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState<number>(0);

  // Form state
  const [formId, setFormId] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formTipo, setFormTipo] = useState('Frequente');
  const [formStatus, setFormStatus] = useState<StatusAtual>('ATIVO');
  const [formNascimento, setFormNascimento] = useState('1995-01-01');
  const [formIdade, setFormIdade] = useState(30);
  const [formCelular, setFormCelular] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formEndCompleto, setFormEndCompleto] = useState('');
  const [formAM, setFormAM] = useState('');
  const [formSetor, setFormSetor] = useState('');
  const [formAF, setFormAF] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formIdFamilia, setFormIdFamilia] = useState('');
  const [formJornada, setFormJornada] = useState<JornadaEtapa>('Primeiro atendimento');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormId('');
    setFormNome('');
    setFormTipo('Frequente');
    setFormStatus('ATIVO');
    setFormNascimento('1995-01-01');
    setFormIdade(30);
    setFormCelular('');
    setFormEmail('');
    setFormEndCompleto('');
    setFormAM('');
    setFormSetor('');
    setFormAF('');
    setFormBairro('');
    setFormIdFamilia('');
    setFormJornada('Primeiro atendimento');
    setSelectedPerson(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setFormId(String(Math.floor(Math.random() * 900000) + 100000));
    // Default to first AM if available
    if (structure.amList.length > 0) {
      setFormAM(structure.amList[0].name);
      setFormSetor(structure.amList[0].sector);
    }
    // Default to first AF if available
    if (structure.afList.length > 0) {
      setFormAF(structure.afList[0].name);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (person: Person) => {
    setSelectedPerson(person);
    setFormId(person.id);
    setFormNome(person.nome);
    setFormTipo(person.tipoCadastro);
    setFormStatus(person.statusAtual);
    setFormNascimento(person.nascimento);
    setFormIdade(person.idade);
    setFormCelular(person.celularPrincipal);
    setFormEmail(person.email);
    setFormEndCompleto(person.endCompleto);
    setFormAM(person.am);
    setFormSetor(person.setor2);
    setFormAF(person.af2);
    setFormBairro(person.bairroAjustado);
    setFormIdFamilia(person.idFamilia);
    setFormJornada(person.jornadaEtapa);
    setIsModalOpen(true);
  };

  // Auto-fill Sector when AM changes
  const handleAMChange = (amName: string) => {
    setFormAM(amName);
    const matchedAM = structure.amList.find(am => am.name === amName);
    if (matchedAM) {
      setFormSetor(matchedAM.sector);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este frequentador do cadastro?')) {
      onUpdatePeople(people.filter(p => p.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('Por favor, informe o nome completo.');
      return;
    }

    const updatedPerson: Person = {
      id: formId,
      nome: formNome.toUpperCase(),
      tipoCadastro: formTipo,
      subtipoCadastro: 'FREQUENTADOR',
      statusAtual: formStatus,
      nascimento: formNascimento,
      idade: Number(formIdade) || 0,
      celularPrincipal: formCelular,
      telefoneContato: formCelular,
      email: formEmail,
      ultimoAcessoApp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      endCompleto: formEndCompleto,
      am: formAM.toUpperCase(),
      setor2: formSetor.toUpperCase(),
      af2: formAF.toUpperCase(),
      endGoogle: `${formEndCompleto} - ${formBairro}`,
      bairroAjustado: formBairro,
      dataOutorga: '',
      tempoMembro: '',
      anoOutorga: '',
      idFamilia: formIdFamilia || `FAM-${Math.floor(Math.random() * 800) + 100}`,
      jornadaEtapa: formJornada,
      jornadaDatas: selectedPerson?.jornadaDatas || {
        'Primeiro atendimento': new Date().toISOString().substring(0, 10)
      },
      cursoIniciacao: selectedPerson?.cursoIniciacao || {
        data: '',
        instrutor: '',
        presenca: false,
        concluido: false
      },
      cursoPosOutorga: selectedPerson?.cursoPosOutorga || {
        aulas: { 1: 'Não iniciou', 2: 'Não iniciou', 3: 'Não iniciou', 4: 'Não iniciou', 5: 'Não iniciou' }
      },
      gruposWhats: selectedPerson?.gruposWhats || {
        grupoSetor: false,
        grupoGeral: false,
        grupoLar: false
      }
    };

    if (selectedPerson) {
      onUpdatePeople(people.map(p => p.id === formId ? updatedPerson : p));
    } else {
      if (people.some(p => p.id === formId)) {
        alert('Este Código de Cadastro já está sendo utilizado.');
        return;
      }
      onUpdatePeople([updatedPerson, ...people]);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleImportCSVText = () => {
    try {
      if (!csvText.trim()) {
        setErrorMsg('Cole o conteúdo CSV.');
        return;
      }
      const parsed = parseCSV(csvText);
      if (parsed.length === 0) {
        setErrorMsg('Nenhuma linha válida encontrada.');
        return;
      }

      // Enforce subtipo as FREQUENTADOR
      const finalImported: Person[] = parsed.map(p => ({
        ...p,
        subtipoCadastro: 'FREQUENTADOR' as SubtipoCadastro,
        tipoCadastro: p.tipoCadastro || 'Frequente',
        jornadaDatas: p.jornadaDatas || { 'Primeiro atendimento': new Date().toISOString().substring(0, 10) },
        cursoIniciacao: p.cursoIniciacao || { data: '', instrutor: '', presenca: false, concluido: false },
        cursoPosOutorga: p.cursoPosOutorga || { aulas: { 1: 'Não iniciou', 2: 'Não iniciou', 3: 'Não iniciou', 4: 'Não iniciou', 5: 'Não iniciou' } },
        gruposWhats: p.gruposWhats || { grupoSetor: false, grupoGeral: false, grupoLar: false }
      } as Person));

      // Match AM Sector if AM exists in structure
      finalImported.forEach(p => {
        if (p.am) {
          const matchedAM = structure.amList.find(am => am.name.toUpperCase() === p.am.toUpperCase());
          if (matchedAM) {
            p.setor2 = matchedAM.sector;
          }
        }
      });

      const peopleMap = new Map(people.map(p => [p.id, p]));
      finalImported.forEach(imp => {
        peopleMap.set(imp.id, imp);
      });

      onUpdatePeople(Array.from(peopleMap.values()));
      setIsImportModalOpen(false);
      setCsvText('');
      setErrorMsg('');
      alert(`${finalImported.length} frequentadores importados com sucesso!`);
    } catch (e: any) {
      setErrorMsg(`Erro ao processar: ${e.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  // Filter ONLY Frequenters
  let filtered = people.filter(p => p.subtipoCadastro === 'FREQUENTADOR');

  if (currentUserRole === 'AM' && currentAMName) {
    filtered = filtered.filter(p => p.am === currentAMName || p.am === '');
  }

  if (filterStatus !== 'ALL') {
    filtered = filtered.filter(p => p.statusAtual === filterStatus);
  }

  if (filterSector !== 'ALL') {
    filtered = filtered.filter(p => (p.setor2 || 'SEM SETOR').toUpperCase() === filterSector.toUpperCase());
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => {
      return (
        p.nome.toLowerCase().includes(q) ||
        (p.bairroAjustado || '').toLowerCase().includes(q) ||
        (p.celularPrincipal || '').toLowerCase().includes(q) ||
        (p.setor2 || '').toLowerCase().includes(q) ||
        (p.am || '').toLowerCase().includes(q) ||
        (p.af2 || '').toLowerCase().includes(q) ||
        (p.tipoCadastro || '').toLowerCase().includes(q)
      );
    });
  }

  // Sort logic
  const sortedPeople = React.useMemo(() => {
    const sorted = [...filtered];
    return sorted.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'id':
          valA = a.id || '';
          valB = b.id || '';
          break;
        case 'nome':
          valA = a.nome || '';
          valB = b.nome || '';
          break;
        case 'setor2':
          valA = a.setor2 || '';
          valB = b.setor2 || '';
          break;
        case 'bairroAjustado':
          valA = a.bairroAjustado || '';
          valB = b.bairroAjustado || '';
          break;
        case 'celularPrincipal':
          valA = a.celularPrincipal || '';
          valB = b.celularPrincipal || '';
          break;
        case 'jornadaEtapa':
          valA = a.jornadaEtapa || '';
          valB = b.jornadaEtapa || '';
          break;
        default:
          valA = a.nome || '';
          valB = b.nome || '';
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const comparison = String(valA).localeCompare(String(valB), 'pt-BR', { numeric: true, sensitivity: 'base' });
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortField, sortOrder]);

  // Export
  const handleExportCSV = () => {
    const headers = [
      'Código Cadastro', 'Nome', 'Tipo Cadastro', 'Status atual', 
      'Nascimento', 'Idade', 'Celular Principal', 'Email', 'AM', 'SETOR2', 'AF2', 
      'Bairro Ajustado', 'ID Familia', 'Jornada Etapa'
    ];
    
    const rows = filtered.map(p => [
      p.id, p.nome, p.tipoCadastro, p.statusAtual,
      p.nascimento, p.idade, p.celularPrincipal, p.email, p.am, p.setor2, p.af2,
      p.bairroAjustado, p.idFamilia, p.jornadaEtapa
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Frequentadores_Johrei_Center.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination slice
  const totalRows = sortedPeople.length;
  const pageCount = Math.ceil(totalRows / rowsLimit);
  const displayedPeople = sortedPeople.slice(pageIndex * rowsLimit, (pageIndex + 1) * rowsLimit);

  const handlePageChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < pageCount) {
      setPageIndex(newIndex);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Frequentadores</h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Menu específico para cadastro e acompanhamento de frequentadores, visitantes e primeiro contato.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            <Upload className="w-3.5 h-3.5 text-teal-600" />
            Importar Planilha
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            Exportar CSV
          </button>
          <button 
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cadastrar Frequentador
          </button>
        </div>
      </div>

      {/* Sector Segment Cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Frequentadores por Setor</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            onClick={() => { setFilterSector('ALL'); setPageIndex(0); }}
            className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden backdrop-blur-md cursor-pointer ${
              filterSector === 'ALL'
                ? 'bg-teal-600/10 border-teal-500/50 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'bg-white/40 dark:bg-zinc-900/40 border-slate-200/60 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <span className="block text-[10px] font-mono uppercase tracking-wider opacity-60">Todos</span>
            <span className="block text-2xl font-bold font-display mt-1">{people.filter(p => p.subtipoCadastro === 'FREQUENTADOR').length}</span>
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-teal-500" />
          </button>

          {sectorStats.map(stat => (
            <button
              key={stat.name}
              onClick={() => { setFilterSector(stat.name); setPageIndex(0); }}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden backdrop-blur-md cursor-pointer ${
                filterSector.toUpperCase() === stat.name.toUpperCase()
                  ? 'bg-teal-600/10 border-teal-500/50 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'bg-white/40 dark:bg-zinc-900/40 border-slate-200/60 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <span className="block text-[10px] font-mono uppercase tracking-wider opacity-60 truncate">{stat.name}</span>
              <span className="block text-2xl font-bold font-display mt-1">{stat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Control Bar (Search + Filters + Row Limiter) */}
      <div className="p-4 rounded-xl glass-panel shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-teal-600 dark:text-teal-400" />
            <input 
              type="text"
              placeholder="Pesquisa rápida de frequentadores (nome, bairro, AM, celular...)"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPageIndex(0); }}
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-white/60 border-slate-200 text-slate-900 placeholder-slate-400'} focus:outline-none focus:border-teal-500`}
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Filter by Sector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Setor:</span>
              <select 
                value={filterSector}
                onChange={(e) => { setFilterSector(e.target.value); setPageIndex(0); }}
                className={`text-xs py-1.5 px-2.5 rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
              >
                <option value="ALL">Todos os Setores</option>
                {sectorsList.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Status:</span>
              <select 
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPageIndex(0); }}
                className={`text-xs py-1.5 px-2.5 rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
              >
                <option value="ALL">Todos os Status</option>
                <option value="ATIVO">Ativos</option>
                <option value="INATIVO">Inativos</option>
                <option value="AFASTADO">Afastados</option>
              </select>
            </div>

            {/* Row Limiter (Line Limit) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Exibir:</span>
              <select 
                value={rowsLimit}
                onChange={(e) => { setRowsLimit(Number(e.target.value)); setPageIndex(0); }}
                className={`text-xs py-1.5 px-2 rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
              >
                <option value={10}>10 linhas</option>
                <option value={20}>20 linhas</option>
                <option value={55}>55 linhas</option>
                <option value={100}>100 linhas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table with horizontal scroll optimization */}
      <div className="rounded-xl overflow-hidden shadow-sm glass-panel">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? 'bg-zinc-950/40 text-zinc-400' : 'bg-slate-100/40 text-slate-500'} border-b border-slate-200/40 dark:border-white/5`}>
                <th 
                  onClick={() => handleSort('id')}
                  className="relative py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none group"
                  style={{ width: colWidths.id, minWidth: colWidths.id }}
                >
                  <div className="flex items-center gap-1">
                    Código {sortField === 'id' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleMouseDown(e, 'id')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 bg-transparent transition-colors z-10"
                  />
                </th>
                <th 
                  onClick={() => handleSort('nome')}
                  className="relative py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none group"
                  style={{ width: colWidths.nome, minWidth: colWidths.nome }}
                >
                  <div className="flex items-center gap-1">
                    Nome Completo {sortField === 'nome' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleMouseDown(e, 'nome')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 bg-transparent transition-colors z-10"
                  />
                </th>
                <th 
                  onClick={() => handleSort('tipoCadastro')}
                  className="relative py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none group"
                  style={{ width: colWidths.tipo, minWidth: colWidths.tipo }}
                >
                  <div className="flex items-center gap-1">
                    Tipo {sortField === 'tipoCadastro' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleMouseDown(e, 'tipo')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 bg-transparent transition-colors z-10"
                  />
                </th>
                <th 
                  onClick={() => handleSort('jornadaEtapa')}
                  className="relative py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none group"
                  style={{ width: colWidths.etapa, minWidth: colWidths.etapa }}
                >
                  <div className="flex items-center gap-1">
                    Acompanhamento {sortField === 'jornadaEtapa' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleMouseDown(e, 'etapa')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 bg-transparent transition-colors z-10"
                  />
                </th>
                <th 
                  onClick={() => handleSort('setor2')}
                  className="relative py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none group"
                  style={{ width: colWidths.setor, minWidth: colWidths.setor }}
                >
                  <div className="flex items-center gap-1">
                    Setor / AM {sortField === 'setor2' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleMouseDown(e, 'setor')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 bg-transparent transition-colors z-10"
                  />
                </th>
                <th 
                  onClick={() => handleSort('bairroAjustado')}
                  className="relative py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none group"
                  style={{ width: colWidths.bairro, minWidth: colWidths.bairro }}
                >
                  <div className="flex items-center gap-1">
                    Bairro / Família {sortField === 'bairroAjustado' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleMouseDown(e, 'bairro')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 bg-transparent transition-colors z-10"
                  />
                </th>
                <th 
                  onClick={() => handleSort('celularPrincipal')}
                  className="relative py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none group"
                  style={{ width: colWidths.celular, minWidth: colWidths.celular }}
                >
                  <div className="flex items-center gap-1">
                    Celular {sortField === 'celularPrincipal' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleMouseDown(e, 'celular')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 bg-transparent transition-colors z-10"
                  />
                </th>
                <th 
                  className="relative py-3.5 px-4 font-bold text-right select-none group"
                  style={{ width: colWidths.acoes, minWidth: colWidths.acoes }}
                >
                  Ações
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleMouseDown(e, 'acoes')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500/50 bg-transparent transition-colors z-10"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
              {displayedPeople.map(person => {
                const statusClasses = {
                  ATIVO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                  INATIVO: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                  AFASTADO: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                  FALECIDO: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                };

                const sectorAM = structure.amList.find(am => am.sector.toUpperCase() === (person.setor2 || '').toUpperCase());
                const displayAM = sectorAM ? sectorAM.name : (person.am || '');

                return (
                  <tr key={person.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-all">
                    <td className="py-3 px-4 font-mono font-medium text-zinc-400">{person.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{person.nome}</div>
                      <div className="text-xxs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <span>Idade: {person.idade || 'N/A'}</span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusClasses[person.statusAtual as keyof typeof statusClasses] || 'bg-zinc-100'}`}>
                          {person.statusAtual}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-teal-600 dark:text-teal-400">
                      {person.tipoCadastro}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">{person.jornadaEtapa}</div>
                      <div className="text-[10px] text-zinc-400">Acesso: {person.ultimoAcessoApp || 'Sem registro'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{person.setor2 || <span className="text-red-400 italic">Sem Setor</span>}</div>
                      <div className="text-xxs text-zinc-400">AM: {displayAM || <span className="text-red-400/80 italic">Sem AM</span>}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{person.bairroAjustado || <span className="text-zinc-400">N/A</span>}</div>
                      <div className="text-xxs text-zinc-400 font-mono">{person.idFamilia || 'Sem Família'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">{person.celularPrincipal || <span className="text-red-400 italic text-xxs">Sem fone</span>}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <button 
                          onClick={() => handleOpenEdit(person)}
                          className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(person.id)}
                          className="p-1.5 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayedPeople.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 italic">
                    Nenhum frequentador encontrado com estes critérios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination Section */}
        {pageCount > 1 && (
          <div className="p-4 border-t border-slate-200/40 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">
              Mostrando {pageIndex * rowsLimit + 1} - {Math.min((pageIndex + 1) * rowsLimit, totalRows)} de {totalRows} frequentadores
            </span>
            <div className="flex gap-1">
              <button
                disabled={pageIndex === 0}
                onClick={() => handlePageChange(pageIndex - 1)}
                className="p-2 rounded-lg border border-slate-200/60 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pageIndex === pageCount - 1}
                onClick={() => handlePageChange(pageIndex + 1)}
                className="p-2 rounded-lg border border-slate-200/60 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Insert/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl rounded-2xl p-6 ${isDark ? 'bg-zinc-900 text-zinc-100 border border-zinc-800' : 'bg-white text-zinc-900 border border-zinc-200'} shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-sans font-semibold">
                {selectedPerson ? `Editar Frequentador: ${formNome}` : 'Cadastrar Novo Frequentador'}
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 font-mono text-zinc-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Código Cadastro</label>
                  <input 
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    disabled={!!selectedPerson}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700 disabled:opacity-50' : 'bg-white border-zinc-200 disabled:opacity-50'} focus:outline-none`}
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Nome Completo</label>
                  <input 
                    type="text"
                    placeholder="EX: YOKO ONISHI"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Tipo de Frequentador</label>
                  <select 
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  >
                    <option value="Frequente">Frequente (Recebe Johrei constantemente)</option>
                    <option value="Primeiro Contato">Primeiro Contato</option>
                    <option value="Membro de Apoio">Membro de Apoio (Visitante)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Status de Cadastro</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as StatusAtual)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                    <option value="AFASTADO">AFASTADO</option>
                    <option value="FALECIDO">FALECIDO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Assistente de Ministro (AM)</label>
                  <select 
                    value={formAM}
                    onChange={(e) => handleAMChange(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  >
                    <option value="">Selecione um AM...</option>
                    {structure.amList.map(am => (
                      <option key={am.id} value={am.name}>{am.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Setor Auto-Preenchido</label>
                  <input 
                    type="text"
                    disabled
                    value={formSetor}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700 disabled:opacity-60' : 'bg-white border-zinc-200 disabled:opacity-60'} focus:outline-none`}
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Celular Principal (WhatsApp)</label>
                  <input 
                    type="text"
                    placeholder="EX: 12997367868"
                    value={formCelular}
                    onChange={(e) => setFormCelular(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">E-mail</label>
                  <input 
                    type="email"
                    placeholder="EX: email@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Endereço de Residência</label>
                  <input 
                    type="text"
                    placeholder="EX: RUA DAS PALMEIRAS, 120"
                    value={formEndCompleto}
                    onChange={(e) => setFormEndCompleto(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Bairro Ajustado</label>
                  <input 
                    type="text"
                    placeholder="EX: JARDIM AMÉRICA"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  />
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Assistente de Família (AF)</label>
                  <select 
                    value={formAF}
                    onChange={(e) => setFormAF(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  >
                    <option value="">Selecione um AF...</option>
                    {structure.afList.map(af => (
                      <option key={af.id} value={af.name}>{af.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Código de Família Associado</label>
                  <input 
                    type="text"
                    placeholder="EX: FAM-101 (Deixe em branco para auto-gerar)"
                    value={formIdFamilia}
                    onChange={(e) => setFormIdFamilia(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/40 dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-4 py-2 rounded-lg border border-slate-200/60 dark:border-zinc-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-xl rounded-2xl p-6 ${isDark ? 'bg-zinc-900 text-zinc-100 border border-zinc-800' : 'bg-white text-zinc-900 border border-zinc-200'} shadow-2xl space-y-4`}>
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-sans font-bold">Importar Planilha de Frequentadores (CSV)</h3>
              <button 
                onClick={() => { setIsImportModalOpen(false); setCsvText(''); setErrorMsg(''); }}
                className="p-1 font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Você pode selecionar um arquivo <strong>.CSV</strong> do seu computador ou colar o conteúdo no editor abaixo. O sistema identificará automaticamente os campos de endereço, nome, contato e AM.
              </p>

              <div>
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/10 file:text-teal-600 dark:file:text-teal-400 cursor-pointer"
                />
              </div>

              <textarea 
                rows={6}
                placeholder="Código Cadastro;Nome;Tipo Cadastro;Status atual;Nascimento;Idade;Celular Principal SMS;AM;SETOR2;AF2;Bairro Ajustado;End completo..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className={`w-full p-3 font-mono text-[11px] rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-800'} focus:outline-none`}
              />

              {errorMsg && (
                <div className="p-2.5 bg-red-500/10 text-red-500 rounded-lg text-xxs font-mono flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span className="flex-1">{errorMsg}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCsvText(generateSampleCSVString())}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                Carregar Exemplo
              </button>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsImportModalOpen(false); setCsvText(''); setErrorMsg(''); }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-zinc-800 text-xs hover:bg-slate-50 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleImportCSVText}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Importar Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
