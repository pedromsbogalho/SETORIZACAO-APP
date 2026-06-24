/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Person, Family, UserRole, JohreiCenterStructure } from './types';
import { INITIAL_PEOPLE, INITIAL_FAMILIES } from './demoData';
import DashboardView from './components/DashboardView';
import PeopleView from './components/PeopleView';
import FrequentersView from './components/FrequentersView';
import TreeView from './components/TreeView';
import JourneyView from './components/JourneyView';
import CoursesView from './components/CoursesView';
import FamiliesView from './components/FamiliesView';
import PendenciesView from './components/PendenciesView';
import ReportsView from './components/ReportsView';
import StructureView from './components/StructureView';
import { parseCSV, generateSampleCSVString } from './utils/csvParser';
import {
  fetchPeopleFromFirebase,
  savePeopleBatchToFirebase,
  fetchStructureFromFirebase,
  saveStructureToFirebase,
  clearAllFirebaseData
} from './utils/firebase';

// Icons
import { 
  Compass, Users, Landmark, Award, BookOpen, Home, AlertTriangle, FileText, 
  Sun, Moon, Shield, Sparkles, LogOut, CheckCircle, Search, HelpCircle, Heart,
  Menu, X, ChevronLeft, ChevronRight, Upload, Database, Check
} from 'lucide-react';

const DEFAULT_STRUCTURE: JohreiCenterStructure = {
  amList: [
    { id: 'am-1', name: 'PROF DANI', sector: 'CENTRO-NORTE' },
    { id: 'am-2', name: 'MARISA', sector: 'SUL' },
    { id: 'am-3', name: 'MÁRIO TANAKA', sector: 'CENTRO-NORTE' },
    { id: 'am-4', name: 'MINISTRO ROBERTO', sector: 'SUL' },
    { id: 'am-5', name: 'MINISTRA CLARA', sector: 'LESTE' }
  ],
  afList: [
    { id: 'af-1', name: 'YOKO', sector: 'CENTRO-NORTE' },
    { id: 'af-2', name: 'PAULO', sector: 'CENTRO-NORTE' },
    { id: 'af-3', name: 'MARTA', sector: 'LESTE' },
    { id: 'af-4', name: 'CARLOS', sector: 'SUL' }
  ],
  assessoresList: [
    { id: 'ass-1', name: 'MÁRIO TANAKA', role: 'Assessor de Iniciação' },
    { id: 'ass-2', name: 'CARLOS REIS', role: 'Apoio de Secretaria' }
  ]
};

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(false);

  // Sidebar responsive collapse states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Role Session state
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [currentAMName, setCurrentAMName] = useState<string>('PROF DANI');

  // Loading state for Firebase
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Core Data states
  const [people, setPeople] = useState<Person[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [structure, setStructure] = useState<JohreiCenterStructure>(DEFAULT_STRUCTURE);

  // Onboarding upload states
  const [onboardingCSV, setOnboardingCSV] = useState('');
  const [onboardingError, setOnboardingError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const onboardingFileRef = useRef<HTMLInputElement>(null);

  // Helper to dynamically link family IDs based on identical household addresses (person with oldest age is head)
  // Respeita o idFamilia original da planilha quando já preenchido
  const enrichPeopleWithFamilyIds = (pList: Person[]): Person[] => {
    const groups: Record<string, Person[]> = {};
    
    // Só agrupa por endereço pessoas que NÃO têm idFamilia original válido
    pList.forEach(p => {
      // Se já tem um idFamilia válido (ex: FAM-444 vindo da planilha), preserva
      if (p.idFamilia && /^FAM-/.test(p.idFamilia)) {
        return;
      }
      const addr = (p.endCompleto || '').trim().toUpperCase();
      if (addr && addr !== 'N/A' && addr !== 'SEM ENDEREÇO' && addr.length >= 5) {
        if (!groups[addr]) {
          groups[addr] = [];
        }
        groups[addr].push(p);
      }
    });
    
    const getOldest = (list: Person[]): Person => {
      return list.reduce((oldest, current) => {
        const ageOldest = oldest.idade || 0;
        const ageCurrent = current.idade || 0;
        if (ageCurrent > ageOldest) return current;
        if (current.nascimento && oldest.nascimento) {
          if (current.nascimento < oldest.nascimento) return current;
        }
        return oldest;
      }, list[0]);
    };
    
    return pList.map(p => {
      // Se já tem idFamilia válido, preserva
      if (p.idFamilia && /^FAM-/.test(p.idFamilia)) {
        return p;
      }
      const addr = (p.endCompleto || '').trim().toUpperCase();
      if (addr && addr !== 'N/A' && addr !== 'SEM ENDEREÇO' && addr.length >= 5) {
        const list = groups[addr];
        if (list && list.length > 0) {
          const oldest = getOldest(list);
          return {
            ...p,
            idFamilia: `FAM-${oldest.id}`
          };
        }
      }
      return {
        ...p,
        idFamilia: `FAM-${p.id}`
      };
    });
  };

  // Load from Firebase on application start
  useEffect(() => {
    const cachedTheme = localStorage.getItem('jc_theme');
    if (cachedTheme) {
      setIsDark(cachedTheme === 'dark');
    }

    async function loadData() {
      setIsLoading(true);
      try {
        const fbPeople = await fetchPeopleFromFirebase();
        const fbStructure = await fetchStructureFromFirebase();
        
        if (fbPeople && fbPeople.length > 0) {
          setPeople(fbPeople);
          localStorage.setItem('jc_people', JSON.stringify(fbPeople));
        } else {
          // If Firebase is empty, check if we have LocalStorage cached data to migrate
          const cachedPeople = localStorage.getItem('jc_people');
          if (cachedPeople) {
            const parsed = JSON.parse(cachedPeople);
            if (parsed.length > 0) {
              setPeople(parsed);
              // Migrate to Firebase asynchronously to keep app ready
              savePeopleBatchToFirebase(parsed).catch(err => console.error("Auto-migration of people failed:", err));
            }
          } else {
            setPeople([]);
          }
        }

        if (fbStructure) {
          setStructure(fbStructure);
          localStorage.setItem('jc_structure', JSON.stringify(fbStructure));
        } else {
          // If structure is not in Firebase, check LocalStorage
          const cachedStructure = localStorage.getItem('jc_structure');
          if (cachedStructure) {
            const parsed = JSON.parse(cachedStructure);
            setStructure(parsed);
            saveStructureToFirebase(parsed).catch(err => console.error("Auto-migration of structure failed:", err));
          } else {
            setStructure(DEFAULT_STRUCTURE);
            saveStructureToFirebase(DEFAULT_STRUCTURE).catch(err => console.error("Initial structure save failed:", err));
          }
        }
      } catch (error) {
        console.error("Failed to load database from Firebase, falling back to LocalStorage:", error);
        // Fallback to LocalStorage
        const cachedPeople = localStorage.getItem('jc_people');
        const cachedStructure = localStorage.getItem('jc_structure');
        if (cachedPeople) {
          setPeople(JSON.parse(cachedPeople));
        }
        if (cachedStructure) {
          setStructure(JSON.parse(cachedStructure));
        } else {
          setStructure(DEFAULT_STRUCTURE);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Compute families dynamically whenever the people list changes
  useEffect(() => {
    if (people.length === 0) {
      setFamilies([]);
      return;
    }
    
    const groups: Record<string, Person[]> = {};
    const noAddressPeople: Person[] = [];
    
    people.forEach(p => {
      const addr = (p.endCompleto || '').trim().toUpperCase();
      if (!addr || addr === 'N/A' || addr === 'SEM ENDEREÇO' || addr.length < 5) {
        noAddressPeople.push(p);
      } else {
        if (!groups[addr]) {
          groups[addr] = [];
        }
        groups[addr].push(p);
      }
    });
    
    const derived: Family[] = [];
    
    const getOldest = (list: Person[]): Person => {
      return list.reduce((oldest, current) => {
        const ageOldest = oldest.idade || 0;
        const ageCurrent = current.idade || 0;
        if (ageCurrent > ageOldest) return current;
        if (current.nascimento && oldest.nascimento) {
          if (current.nascimento < oldest.nascimento) return current;
        }
        return oldest;
      }, list[0]);
    };
    
    Object.entries(groups).forEach(([addr, list]) => {
      const oldest = getOldest(list);
      derived.push({
        id: `FAM-${oldest.id}`,
        nome: `FAMÍLIA DE ${oldest.nome}`,
        endereco: oldest.endCompleto || addr,
        afResponsavel: oldest.af2 || oldest.am || 'Sem AF',
        historico: '',
        observacoes: `Grupo residencial com ${list.length} integrantes.`
      });
    });
    
    noAddressPeople.forEach(p => {
      derived.push({
        id: `FAM-${p.id}`,
        nome: `FAMÍLIA DE ${p.nome} (S/ End.)`,
        endereco: p.endCompleto || 'Endereço não informado',
        afResponsavel: p.af2 || p.am || 'Sem AF',
        historico: '',
        observacoes: 'Cadastro individual.'
      });
    });
    
    setFamilies(derived);
  }, [people]);

  // Sync to LocalStorage & Firebase
  const handleUpdatePeople = async (newPeople: Person[]) => {
    const enriched = enrichPeopleWithFamilyIds(newPeople);
    setPeople(enriched);
    localStorage.setItem('jc_people', JSON.stringify(enriched));
    try {
      await savePeopleBatchToFirebase(enriched);
    } catch (err) {
      console.error("Error syncing updated people list to Firebase:", err);
    }
  };

  const handleUpdateFamilies = (newFamilies: Family[]) => {
    // Families are now derived, but keep handle for backward compatibility
    setFamilies(newFamilies);
    localStorage.setItem('jc_families', JSON.stringify(newFamilies));
  };

  const handleUpdateStructure = async (newStructure: JohreiCenterStructure) => {
    setStructure(newStructure);
    localStorage.setItem('jc_structure', JSON.stringify(newStructure));
    try {
      await saveStructureToFirebase(newStructure);
    } catch (err) {
      console.error("Error syncing updated structure to Firebase:", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem('jc_theme', nextTheme ? 'dark' : 'light');
  };

  // Helper for quick load demo database
  const handleLoadDemoData = async () => {
    const enriched = enrichPeopleWithFamilyIds(INITIAL_PEOPLE);
    setPeople(enriched);
    localStorage.setItem('jc_people', JSON.stringify(enriched));
    try {
      await savePeopleBatchToFirebase(enriched);
      alert('Banco de dados de demonstração carregado e salvo no Firebase com sucesso!');
    } catch (err) {
      console.error("Error syncing demo data to Firebase:", err);
      alert('Banco de dados de demonstração carregado localmente (erro ao sincronizar na nuvem).');
    }
  };

  // Handle onboarding manual CSV import
  const handleOnboardingImport = async () => {
    try {
      if (!onboardingCSV.trim()) {
        setOnboardingError('Cole ou faça o upload de um arquivo CSV válido.');
        return;
      }
      const parsed = parseCSV(onboardingCSV);
      if (parsed.length === 0) {
        setOnboardingError('Nenhum dado válido encontrado.');
        return;
      }
      const enriched = enrichPeopleWithFamilyIds(parsed as Person[]);
      setPeople(enriched);
      localStorage.setItem('jc_people', JSON.stringify(enriched));
      setOnboardingError('');
      setOnboardingCSV('');
      try {
        await savePeopleBatchToFirebase(enriched);
        alert(`${enriched.length} registros cadastrados e salvos na nuvem com sucesso!`);
      } catch (err) {
        console.error("Error syncing imported CSV to Firebase:", err);
        alert(`${enriched.length} registros cadastrados localmente (erro ao salvar na nuvem).`);
      }
    } catch (e: any) {
      setOnboardingError(`Erro: ${e.message}`);
    }
  };

  // Drag & Drop Handlers for Onboarding
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const text = evt.target?.result as string;
          setOnboardingCSV(text);
          // Auto import on drop to streamline experience
          try {
            const parsed = parseCSV(text);
            if (parsed.length > 0) {
              const enriched = enrichPeopleWithFamilyIds(parsed as Person[]);
              setPeople(enriched);
              localStorage.setItem('jc_people', JSON.stringify(enriched));
              setOnboardingError('');
              setOnboardingCSV('');
              try {
                await savePeopleBatchToFirebase(enriched);
                alert(`${enriched.length} registros importados e salvos na nuvem com sucesso via arrastar e soltar!`);
              } catch (err) {
                console.error("Error syncing dropped CSV to Firebase:", err);
                alert(`${enriched.length} registros importados localmente (erro ao sincronizar na nuvem).`);
              }
            } else {
              setOnboardingError('Nenhum registro válido encontrado no CSV.');
            }
          } catch (err: any) {
            setOnboardingError(`Erro ao ler CSV: ${err.message}`);
          }
        };
        reader.readAsText(file);
      } else {
        setOnboardingError('Por favor, envie apenas arquivos .CSV');
      }
    }
  };

  // Onboarding file upload trigger
  const handleOnboardingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      setOnboardingCSV(text);
      try {
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          const enriched = enrichPeopleWithFamilyIds(parsed as Person[]);
          setPeople(enriched);
          localStorage.setItem('jc_people', JSON.stringify(enriched));
          setOnboardingError('');
          setOnboardingCSV('');
          try {
            await savePeopleBatchToFirebase(enriched);
            alert(`${enriched.length} registros importados e salvos na nuvem com sucesso!`);
          } catch (err) {
            console.error("Error syncing uploaded CSV to Firebase:", err);
            alert(`${enriched.length} registros salvos localmente (erro ao salvar na nuvem).`);
          }
        } else {
          setOnboardingError('Nenhum registro válido encontrado no CSV.');
        }
      } catch (err: any) {
        setOnboardingError(`Erro ao ler CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDatabaseFully = () => {
    setShowResetModal(true);
  };

  const confirmResetDatabase = async () => {
    setPeople([]);
    localStorage.removeItem('jc_people');
    setOnboardingCSV('');
    setOnboardingError('');
    setShowResetModal(false);
    setActiveTab('dashboard');
    try {
      await clearAllFirebaseData();
      alert('Banco de dados excluído do Firebase e localmente com sucesso!');
    } catch (err) {
      console.error("Error clearing data from Firebase:", err);
      alert('Banco de dados limpo localmente (falha ao limpar no Firebase).');
    }
  };

  // Navigation config (with collapse responsive capabilities)
  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: Landmark },
    { id: 'people', label: 'Membros', icon: Users },
    { id: 'frequenters', label: 'Frequentadores', icon: Heart },
    { id: 'tree', label: 'Setorização', icon: Compass },
    { id: 'journey', label: 'Jornada Espiritual', icon: Sparkles },
    { id: 'courses', label: 'Controle de Cursos', icon: BookOpen },
    { id: 'families', label: 'Famílias', icon: Home },
    { id: 'structure', label: 'Estrutura JC', icon: Award },
    { id: 'pendencies', label: 'Pendências', icon: AlertTriangle, alertCount: true },
    { id: 'reports', label: 'Relatórios', icon: FileText }
  ];

  // Calculate total alerts to display inside badge
  const missingPostOutorgaCount = people.filter(p => p.subtipoCadastro === 'MEMBRO' && p.tipoCadastro === 'Ohikari' && !Object.values(p.cursoPosOutorga.aulas).every(v => v === 'Concluido')).length;
  const noWhatsCount = people.filter(p => p.subtipoCadastro === 'MEMBRO' && p.jornadaEtapa !== 'Primeiro atendimento' && !p.gruposWhats.grupoSetor && !p.gruposWhats.grupoGeral).length;
  
  // Families sem Assistente de Família (AF) definido
  const familiesSemAFCount = families.filter(f => !f.afResponsavel).length;

  const noSectorCount = people.filter(p => !p.setor2).length;
  const noPhoneCount = people.filter(p => !p.celularPrincipal).length;
  const totalAlerts = missingPostOutorgaCount + noWhatsCount + familiesSemAFCount + noSectorCount + noPhoneCount;

  // Loading screen during Firebase connection/retrieval
  if (isLoading) {
    return (
      <div className={`min-h-screen font-sans flex items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-[#09090c] text-zinc-100' : 'bg-[#f4f5f7] text-slate-800'}`}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide">Conectando ao Firebase...</p>
          <p className="text-xs text-zinc-400 font-mono">Sincronizando base de dados do Johrei Center</p>
        </div>
      </div>
    );
  }

  // Onboarding screen layout if database is empty
  if (people.length === 0) {
    return (
      <div className={`min-h-screen font-sans flex relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#09090c] text-zinc-100' : 'bg-[#f4f5f7] text-slate-800'}`}>
        {/* Decorative background spots */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-400/10 dark:bg-teal-500/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/10 dark:bg-orange-500/5 blur-[120px] pointer-events-none"></div>

        <div className="w-full flex flex-col md:flex-row min-h-screen z-10">
          
          {/* LEFT SIDE: Brand & Welcome Presentation */}
          <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/40 dark:border-white/5 bg-slate-500/[0.02] dark:bg-white/[0.01]">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-lg tracking-tight block font-display">Johrei Center</span>
                  <span className="text-[10px] text-zinc-400 font-mono tracking-wider">GESTÃO & CRM</span>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight leading-tight">
                  Acompanhamento Espiritual Integrado
                </h1>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'} leading-relaxed`}>
                  Simplifique a gestão de membros e frequentadores, organize visitas domésticas, gerencie turmas de cursos doutrinários e acompanhe a evolução na jornada da fé em uma única interface inteligente.
                </p>
              </div>

              {/* Functional highlights */}
              <div className="space-y-3 pt-6">
                <div className="flex items-start gap-3 text-xs">
                  <div className="p-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Árvore Territorial Inteligente</h4>
                    <p className={`text-xxs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Organização por Setor, Bairro, Família e Assistentes responsáveis de forma automática.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="p-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Painel de Acompanhamento de Cursos</h4>
                    <p className={`text-xxs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Aulas de Iniciação e Pós-Outorga com atualização dinâmica de progresso.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="p-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Alertas de Acompanhamento Crítico</h4>
                    <p className={`text-xxs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Identificação rápida de membros sem grupos de WhatsApp ou sem atendimento recente.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Unidade: Caraguatatuba</span>
              <button
                onClick={toggleTheme}
                className={`py-1.5 px-3 rounded-lg border text-xxs font-bold hover:bg-slate-100 dark:hover:bg-zinc-850/60 transition-all flex items-center gap-1 cursor-pointer ${isDark ? 'border-zinc-800 text-zinc-300' : 'border-slate-200 text-slate-700'}`}
              >
                {isDark ? <Moon className="w-3.5 h-3.5 text-teal-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                {isDark ? 'Escuro' : 'Claro'}
              </button>
            </div>
          </div>

          {/* RIGHT SIDE: Drag and Drop & Paste Input */}
          <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-transparent">
            <div className="max-w-md w-full mx-auto space-y-6">
              
              <div>
                <h2 className="text-2xl font-sans font-bold tracking-tight">Insira os dados para iniciar</h2>
                <p className={`text-xs mt-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Para alimentar o sistema, você pode arrastar sua planilha de membros, colar os dados em formato CSV ou utilizar nossa base de demonstração.
                </p>
              </div>

              {/* Drag and Drop Zone Container */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => onboardingFileRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                  isDragging 
                    ? 'border-teal-500 bg-teal-500/10 scale-[1.02] shadow-md shadow-teal-500/5' 
                    : `${isDark ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20' : 'border-slate-200 hover:border-slate-300 bg-white/40'} hover:shadow-xs`
                }`}
              >
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={onboardingFileRef}
                  onChange={handleOnboardingFileUpload}
                  className="hidden"
                />
                
                <div className={`p-4 rounded-full ${isDragging ? 'bg-teal-500 text-white' : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'} transition-all`}>
                  <Upload className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Arraste e solte o arquivo CSV aqui
                  </p>
                  <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    ou clique para navegar no seu computador
                  </p>
                </div>

                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-900 text-[9px] font-mono font-bold text-zinc-400">
                  Apenas planilhas .CSV
                </span>
              </div>

              {/* Optional Manual Copy/Paste Fallback */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 uppercase font-bold">
                  <span>Ou cole o texto formatado em CSV</span>
                  <button 
                    onClick={() => {
                      setOnboardingCSV(generateSampleCSVString());
                      setOnboardingError('');
                    }}
                    className="text-xxs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-sans"
                  >
                    Carregar Exemplo
                  </button>
                </div>

                <textarea
                  rows={3}
                  placeholder="ID,Nome,Idade,Setor,EndereçoCompleto..."
                  value={onboardingCSV}
                  onChange={(e) => setOnboardingCSV(e.target.value)}
                  className={`w-full p-2.5 font-mono text-[10px] rounded-lg border focus:outline-none focus:border-teal-500 ${isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-800'}`}
                />

                {onboardingError && (
                  <p className="text-xxs text-red-500 font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> {onboardingError}
                  </p>
                )}

                {onboardingCSV.trim() && (
                  <button
                    onClick={handleOnboardingImport}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Importar do Editor
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px bg-slate-200/60 dark:bg-white/5 flex-1"></span>
                <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">ou use dados de teste</span>
                <span className="h-px bg-slate-200/60 dark:bg-white/5 flex-1"></span>
              </div>

              {/* Quick demo loader */}
              <button
                onClick={handleLoadDemoData}
                className={`w-full py-2.5 rounded-xl border font-bold text-xs hover:bg-slate-50 dark:hover:bg-zinc-850/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md ${isDark ? 'border-zinc-800 text-teal-400 bg-zinc-950/20' : 'border-slate-200 text-teal-600 bg-slate-50/50'}`}
              >
                <Sparkles className="w-4 h-4" />
                Iniciar com Dados de Demonstração
              </button>

            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 relative overflow-hidden ${isDark ? 'bg-[#09090c] text-[#fafafa]' : 'bg-[#f4f5f7] text-[#0f172a]'}`}>
      {/* Frosted Glass background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-400/10 dark:bg-teal-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/10 dark:bg-orange-500/5 blur-[120px] pointer-events-none"></div>
      
      <div className="flex h-screen overflow-hidden relative z-10">
        
        {/* SIDEBAR NAVIGATION */}
        <aside 
          className={`flex-shrink-0 flex flex-col justify-between glass-sidebar transition-all duration-300 relative z-30
            ${isSidebarCollapsed ? 'w-16' : 'w-64'} 
            ${isMobileSidebarOpen ? 'translate-x-0 fixed inset-y-0 left-0 w-64' : 'max-md:-translate-x-full max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:w-64'}
          `}
        >
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Header / Logo */}
            <div className="p-4 border-b border-slate-200/40 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="p-1.5 bg-teal-600 rounded-lg text-white font-bold shadow-xs">
                  <Landmark className="w-5 h-5 flex-shrink-0" />
                </span>
                {!isSidebarCollapsed && (
                  <div>
                    <span className="font-semibold text-sm tracking-tight block font-display truncate">Johrei Center</span>
                    <span className="text-[9px] text-zinc-400 font-mono tracking-wider">CRM</span>
                  </div>
                )}
              </div>

              {/* Desktop Collapse Button */}
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:block p-1.5 rounded-lg border border-slate-200/40 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              {/* Mobile Close Button */}
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-lg border border-slate-200/40 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation links */}
            <nav className="p-3 space-y-1 flex-1">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    id={`sidebar-${item.id}`}
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileSidebarOpen(false); // Auto-close on mobile selection
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                      isActive 
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-l-2 border-teal-500' 
                        : `${isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isSidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!isSidebarCollapsed && item.alertCount && totalAlerts > 0 && (
                      <span className="px-1.5 py-0.2 bg-orange-500 text-white rounded-full font-mono text-[9px] font-bold">
                        {totalAlerts}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer controls (Theme & Role switchers) */}
          <div className="p-3 border-t border-slate-200/40 dark:border-white/5 space-y-2">
            {/* Theme toggle */}
            <button 
              id="btn-toggle-theme"
              onClick={toggleTheme}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xxs font-semibold rounded-lg border cursor-pointer ${
                isDark ? 'border-zinc-850 hover:bg-zinc-850' : 'border-slate-200/60 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                {isDark ? <Moon className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" /> : <Sun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                {!isSidebarCollapsed && `Tema ${isDark ? 'Escuro' : 'Claro'}`}
              </span>
            </button>

            {/* Profile access switcher */}
            {!isSidebarCollapsed && (
              <div className={`p-2.5 rounded-lg text-xxs ${isDark ? 'bg-zinc-950/40' : 'bg-slate-100/40'} border ${isDark ? 'border-zinc-850' : 'border-slate-200/50'} backdrop-blur-xs`}>
                <div className="flex items-center gap-1 mb-1 text-zinc-400 font-mono uppercase truncate">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                  Perfil de Acesso
                </div>
                <select 
                  id="role-switcher"
                  value={userRole}
                  onChange={(e) => {
                    setUserRole(e.target.value as UserRole);
                    setActiveTab('dashboard');
                  }}
                  className={`w-full bg-transparent border-none outline-none font-bold text-xxs p-0.5 rounded cursor-pointer ${
                    isDark ? 'text-zinc-200' : 'text-zinc-800'
                  }`}
                >
                  <option value="ADMIN" className={isDark ? 'bg-zinc-900 text-zinc-200' : 'bg-white text-zinc-700'}>Admin (Total)</option>
                  <option value="AM" className={isDark ? 'bg-zinc-900 text-zinc-200' : 'bg-white text-zinc-700'}>AM (Filtro)</option>
                </select>
                {userRole === 'AM' && (
                  <div className="mt-1 text-[8px] text-zinc-400 italic truncate font-mono">
                    AM: PROF DANI
                  </div>
                )}
              </div>
            )}

            {/* Completely Clear database button for full admin reset */}
            {!isSidebarCollapsed && userRole === 'ADMIN' && (
              <button 
                onClick={handleResetDatabaseFully}
                className="w-full text-center text-[10px] font-bold text-red-500 hover:underline py-1.5 rounded hover:bg-red-500/5 cursor-pointer block"
              >
                Limpar Banco de Dados
              </button>
            )}
          </div>
        </aside>

        {/* Mobile Sidebar backdrop overlay */}
        {isMobileSidebarOpen && (
          <div 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-xs transition-opacity duration-300"
          ></div>
        )}

        {/* MAIN BODY AREA */}
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
          
          {/* Top minimal bar with hamburger trigger on mobile */}
          <header className="px-6 py-4 flex items-center glass-header md:hidden">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 rounded-lg border border-slate-200/40 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </header>

          {/* Tab View switching workspace */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView 
                people={people} 
                families={families} 
                onNavigate={setActiveTab}
                isDark={isDark}
              />
            )}

            {activeTab === 'people' && (
              <PeopleView 
                people={people} 
                onUpdatePeople={handleUpdatePeople} 
                isDark={isDark}
                currentUserRole={userRole}
                currentAMName={userRole === 'AM' ? currentAMName : undefined}
                structure={structure}
              />
            )}

            {activeTab === 'frequenters' && (
              <FrequentersView 
                people={people} 
                onUpdatePeople={handleUpdatePeople} 
                isDark={isDark}
                currentUserRole={userRole}
                currentAMName={userRole === 'AM' ? currentAMName : undefined}
                structure={structure}
              />
            )}

            {activeTab === 'tree' && (
              <TreeView 
                people={people} 
                families={families} 
                structure={structure}
                isDark={isDark} 
              />
            )}

            {activeTab === 'journey' && (
              <JourneyView 
                people={people} 
                onUpdatePeople={handleUpdatePeople} 
                isDark={isDark} 
              />
            )}

            {activeTab === 'courses' && (
              <CoursesView 
                people={people} 
                onUpdatePeople={handleUpdatePeople} 
                isDark={isDark} 
              />
            )}

            {activeTab === 'families' && (
              <FamiliesView 
                families={families} 
                onUpdateFamilies={handleUpdateFamilies}
                people={people} 
                isDark={isDark} 
              />
            )}

            {activeTab === 'structure' && (
              <StructureView 
                structure={structure}
                onUpdateStructure={handleUpdateStructure}
                people={people}
                isDark={isDark}
              />
            )}

            {activeTab === 'pendencies' && (
              <PendenciesView 
                people={people} 
                onUpdatePeople={handleUpdatePeople}
                families={families} 
                onUpdateFamilies={handleUpdateFamilies}
                isDark={isDark} 
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView 
                people={people} 
                families={families} 
                isDark={isDark} 
              />
            )}
          </div>
        </main>
      </div>

      {/* Custom Confirmation Modal for Database Reset */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl border animate-fade-in ${
            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">Exclusão Permanente de Dados</h3>
            </div>
            
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'} leading-relaxed mb-6`}>
              Atenção: Isso excluirá <strong>permanentemente</strong> todos os dados salvos neste Johrei Center, incluindo membros, frequentadores, históricos de acompanhamento e vínculos territoriais. Esta operação é irreversível e o sistema retornará ao estado de alimentação inicial. Deseja prosseguir?
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer ${
                  isDark ? 'text-zinc-300' : 'text-slate-600'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmResetDatabase}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Apagar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
