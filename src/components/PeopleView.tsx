/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Person, SubtipoCadastro, StatusAtual, JornadaEtapa, JohreiCenterStructure } from '../types';
import { Search, UserPlus, Upload, FileText, Trash2, Edit2, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseCSV, generateSampleCSVString } from '../utils/csvParser';

interface PeopleViewProps {
  people: Person[];
  onUpdatePeople: (newPeople: Person[]) => void;
  isDark: boolean;
  currentUserRole: 'ADMIN' | 'AM';
  currentAMName?: string;
  structure: JohreiCenterStructure;
}

export default function PeopleView({
  people,
  onUpdatePeople,
  isDark,
  currentUserRole,
  currentAMName,
  structure
}: PeopleViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL'); // Filters Ohikari vs other types
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortField, setSortField] = useState<string>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Row limits & pagination
  const [rowsLimit, setRowsLimit] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState<number>(0);

  // Form state
  const [formId, setFormId] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formTipo, setFormTipo] = useState('Ohikari');
  const [formStatus, setFormStatus] = useState<StatusAtual>('ATIVO');
  const [formNascimento, setFormNascimento] = useState('1980-01-01');
  const [formIdade, setFormIdade] = useState(45);
  const [formCelular, setFormCelular] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formEndCompleto, setFormEndCompleto] = useState('');
  const [formAM, setFormAM] = useState('');
  const [formSetor, setFormSetor] = useState('');
  const [formAF, setFormAF] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formIdFamilia, setFormIdFamilia] = useState('');
  const [formJornada, setFormJornada] = useState<JornadaEtapa>('Torna-se membro ativo');
  const [formWhatsSetor, setFormWhatsSetor] = useState(false);
  const [formWhatsGeral, setFormWhatsGeral] = useState(false);
  const [formWhatsLar, setFormWhatsLar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormId('');
    setFormNome('');
    setFormTipo('Ohikari');
    setFormStatus('ATIVO');
    setFormNascimento('1980-01-01');
    setFormIdade(45);
    setFormCelular('');
    setFormEmail('');
    setFormEndCompleto('');
    setFormAM('');
    setFormSetor('');
    setFormAF('');
    setFormBairro('');
    setFormIdFamilia('');
    setFormJornada('Torna-se membro ativo');
    setFormWhatsSetor(false);
    setFormWhatsGeral(false);
    setFormWhatsLar(false);
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
    setFormWhatsSetor(person.gruposWhats.grupoSetor);
    setFormWhatsGeral(person.gruposWhats.grupoGeral);
    setFormWhatsLar(person.gruposWhats.grupoLar);
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
    if (confirm('Tem certeza que deseja excluir este membro do cadastro?')) {
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
      subtipoCadastro: 'MEMBRO',
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
      dataOutorga: selectedPerson?.dataOutorga || (formTipo === 'Ohikari' ? new Date().toISOString().substring(0, 10) : ''),
      tempoMembro: selectedPerson?.tempoMembro || (formTipo === 'Ohikari' ? 'Recente' : ''),
      anoOutorga: selectedPerson?.anoOutorga || (formTipo === 'Ohikari' ? String(new Date().getFullYear()) : ''),
      idFamilia: formIdFamilia || `FAM-${Math.floor(Math.random() * 800) + 100}`,
      jornadaEtapa: formJornada,
      jornadaDatas: selectedPerson?.jornadaDatas || {
        'Primeiro atendimento': '2026-01-01',
        'Recebe Johrei': '2026-01-10',
        'Recebe Ohikari': new Date().toISOString().substring(0, 10),
        'Torna-se membro ativo': new Date().toISOString().substring(0, 10)
      },
      cursoIniciacao: selectedPerson?.cursoIniciacao || {
        data: new Date().toISOString().substring(0, 10),
        instrutor: formAM || 'PROF DANI',
        presenca: true,
        concluido: true
      },
      cursoPosOutorga: selectedPerson?.cursoPosOutorga || {
        aulas: { 1: 'Não iniciou', 2: 'Não iniciou', 3: 'Não iniciou', 4: 'Não iniciou', 5: 'Não iniciou' }
      },
      gruposWhats: {
        grupoSetor: formWhatsSetor,
        grupoGeral: formWhatsGeral,
        grupoLar: formWhatsLar
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
        setErrorMsg('Nenhuma linha válida encontrada no CSV.');
        return;
      }

      // Enforce subtipo as MEMBRO for this page
      const finalImported: Person[] = parsed.map(p => ({
        ...p,
        subtipoCadastro: 'MEMBRO' as SubtipoCadastro,
        tipoCadastro: p.tipoCadastro || 'Ohikari',
        jornadaDatas: p.jornadaDatas || { 'Torna-se membro ativo': new Date().toISOString().substring(0, 10) },
        cursoIniciacao: p.cursoIniciacao || { data: '', instrutor: '', presenca: true, concluido: true },
        cursoPosOutorga: p.cursoPosOutorga || { aulas: { 1: 'Concluido', 2: 'Concluido', 3: 'Concluido', 4: 'Concluido', 5: 'Concluido' } },
        gruposWhats: p.gruposWhats || { grupoSetor: true, grupoGeral: true, grupoLar: true }
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
      alert(`${finalImported.length} membros importados com sucesso!`);
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

  // Filter ONLY Members
  let filtered = people.filter(p => p.subtipoCadastro === 'MEMBRO');

  if (currentUserRole === 'AM' && currentAMName) {
    filtered = filtered.filter(p => p.am === currentAMName || p.am === '');
  }

  // Filtro de Grau (tipoCadastro) removido: sempre mostra todos os membros.


  if (filterStatus !== 'ALL') {
    filtered = filtered.filter(p => p.statusAtual === filterStatus);
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
        (p.tipoCadastro || '').toLowerCase().includes(q) ||
        (p.statusAtual || '').toLowerCase().includes(q)
      );
    });
  }

  // Export
  const handleExportCSV = () => {
    const headers = [
      'Código Cadastro',
      'Nome',
      'Status atual',
      'Nascimento',
      'Idade',
      'Tempo Membro',
      'Celular Principal',
      'Email',
      'AM',
      'SETOR2',
      'AF2',
      'Bairro Ajustado',
      'ID Familia',
      'Jornada Etapa'
    ];

    
    const rows = filtered.map(p => [
      p.id,
      p.nome,
      p.statusAtual,
      p.nascimento,
      p.idade,
      p.tempoMembro,
      p.celularPrincipal,
      p.email,
      p.am,
      p.setor2,
      p.af2,
      p.bairroAjustado,
      p.idFamilia,
      p.jornadaEtapa
    ]);


    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Membros_Johrei_Center.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sorting and pagination logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPageIndex(0);
  };

  const sortedPeople = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
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
        case 'tempoMembro':
          valA = a.tempoMembro || '';
          valB = b.tempoMembro || '';
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
        case 'nascimento':
          valA = a.nascimento || '';
          valB = b.nascimento || '';
          break;
        case 'idade':
          valA = Number(a.idade) || 0;
          valB = Number(b.idade) || 0;
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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight font-display">Membros (Ohikari)</h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Gerenciamento geral de membros messiânicos outorgados, histórico espiritual e situação cadastral.
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
            Cadastrar Membro
          </button>
        </div>
      </div>

      {/* Filter and Control Area */}
      <div className="p-4 rounded-xl glass-panel shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-teal-600 dark:text-teal-400" />
            <input 
              type="text"
              placeholder="Pesquisar por nome, bairro, AM, celular, código..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPageIndex(0); }}
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-white/60 border-slate-200 text-slate-900 placeholder-slate-400'} focus:outline-none focus:border-teal-500`}
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
              {/* Outorga filter removido (Grau) */}
              <div className="hidden" aria-hidden="true" />


            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Status:</span>
              <select 
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPageIndex(0); }}
                className={`text-xs py-1.5 px-2.5 rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
              >
                <option value="ALL">Todos os Status</option>
                <option value="ATIVO">ATIVO</option>
                <option value="AFASTADO">AFASTADO</option>
                <option value="FALECIDO">FALECIDO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </div>

            {/* Sorting selection */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Ordenar:</span>
              <select 
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field);
                  setSortOrder(order as 'asc' | 'desc');
                  setPageIndex(0);
                }}
                className={`text-xs py-1.5 px-2.5 rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
              >
                <option value="nome-asc">Nome (A-Z)</option>
                <option value="nome-desc">Nome (Z-A)</option>
                <option value="nascimento-asc">Nasc. (Mais Antigo)</option>
                <option value="nascimento-desc">Nasc. (Mais Recente)</option>
                <option value="idade-asc">Idade (Menor para Maior)</option>
                <option value="idade-desc">Idade (Maior para Menor)</option>
                <option value="id-asc">Código (Crescente)</option>
                <option value="id-desc">Código (Decrescente)</option>
                <option value="setor2-asc">Setor (A-Z)</option>
                <option value="bairroAjustado-asc">Bairro (A-Z)</option>
              </select>
            </div>

            {/* Row limit selection */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Exibir:</span>
              <select 
                value={rowsLimit}
                onChange={(e) => { setRowsLimit(Number(e.target.value)); setPageIndex(0); }}
                className={`text-xs py-1.5 px-2.5 rounded-lg border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-200' : 'bg-white/60 border-slate-200 text-slate-700'} focus:outline-none`}
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

      {/* Main Table with horizontal scroll support */}
      <div className="rounded-xl overflow-hidden shadow-sm glass-panel">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? 'bg-zinc-950/40 text-zinc-400' : 'bg-slate-100/40 text-slate-500'} border-b border-slate-200/40 dark:border-white/5`}>
                <th 
                  onClick={() => handleSort('id')} 
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Código {sortField === 'id' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nome')} 
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Nome Completo {sortField === 'nome' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('tempoMembro')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Tempo de Membro {sortField === 'tempoMembro' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                </th>


                <th 
                  onClick={() => handleSort('setor2')} 
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Setor / AM {sortField === 'setor2' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('bairroAjustado')} 
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Bairro / Família {sortField === 'bairroAjustado' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('celularPrincipal')} 
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Celular {sortField === 'celularPrincipal' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold text-right select-none">Ações</th>
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

                // Prioriza o AM salvo no cadastro do membro; fallback para o AM da estrutura do setor
                const sectorAM = structure.amList.find(am => am.sector.toUpperCase() === (person.setor2 || '').toUpperCase());
                const displayAM = person.am || (sectorAM ? sectorAM.name : '');

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
                    <td className="py-3 px-4 font-mono">
                      {person.tempoMembro || <span className="text-zinc-400 italic">N/A</span>}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold">{person.setor2 || <span className="text-red-400 italic">Sem Setor</span>}</div>
                      <div className="text-xxs text-zinc-400">AM: {displayAM || <span className="text-red-400/80 italic">Sem AM</span>}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{person.bairroAjustado || <span className="text-zinc-400 font-mono">N/A</span>}</div>
                      <div className="text-xxs text-zinc-400 font-mono">
                        {/* Exibe idFamilia apenas se tiver formato válido (FAM-xxxxx) */}
                        {person.idFamilia && /^FAM-/.test(person.idFamilia)
                          ? person.idFamilia
                          : <span className="italic text-zinc-300">Sem Família</span>
                        }
                      </div>
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
                  <td colSpan={7} className="py-12 text-center text-zinc-500 italic">
                    Nenhum membro encontrado com estes critérios.
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
              Mostrando {pageIndex * rowsLimit + 1} - {Math.min((pageIndex + 1) * rowsLimit, totalRows)} de {totalRows} membros
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
                {selectedPerson ? `Editar Membro: ${formNome}` : 'Cadastrar Novo Membro'}
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
                  <label className="block text-xxs font-mono uppercase text-zinc-400 mb-1">Grau de Outorga</label>
                  <select 
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'} focus:outline-none`}
                  >
                    <option value="Ohikari">Ohikari</option>
                    <option value="Okomitama">Okomitama</option>
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

              {/* WhatsApp groups checks */}
              <div className="pt-4 border-t border-slate-200/40 dark:border-white/5 space-y-2">
                <h4 className="text-[10px] font-mono uppercase text-zinc-400">Grupos de WhatsApp Integrados</h4>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formWhatsSetor}
                      onChange={(e) => setFormWhatsSetor(e.target.checked)}
                      className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500" 
                    />
                    <span>Grupo do Setor</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formWhatsGeral}
                      onChange={(e) => setFormWhatsGeral(e.target.checked)}
                      className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500" 
                    />
                    <span>Grupo Geral</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formWhatsLar}
                      onChange={(e) => setFormWhatsLar(e.target.checked)}
                      className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500" 
                    />
                    <span>Culto no Lar</span>
                  </label>
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
              <h3 className="text-sm font-sans font-bold">Importar Planilha de Membros (CSV)</h3>
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
