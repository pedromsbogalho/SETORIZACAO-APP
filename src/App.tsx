/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Person, Family, UserRole, JohreiCenterStructure, AppUser } from './types';
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
import UserApprovalsView from './components/UserApprovalsView';
import AIBulkEditor from './components/AIBulkEditor';
import { parseCSV, generateSampleCSVString } from './utils/csvParser';
import {
  auth,
  logoutUser,
  fetchPeopleFromFirebase,
  savePeopleBatchToFirebase,
  savePersonToFirebase,
  deletePersonFromFirebase,
  fetchStructureFromFirebase,
  saveStructureToFirebase,
  clearAllFirebaseData,
  createAppUserOrGet,
  onAppUserChangeRealtime,
  fetchAllAppUsers,
  updateAppUserApproval
} from './utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthView from './components/AuthView';

// Icons
import { 
  Compass, Users, Landmark, Award, BookOpen, Home, AlertTriangle, FileText, 
  Sun, Moon, Shield, Sparkles, LogOut, CheckCircle, Search, HelpCircle, Heart,
  Menu, X, ChevronLeft, ChevronRight, Upload, Database, Check,
  LayoutDashboard, GraduationCap, Building2, BarChart3, Network
} from 'lucide-react';

const DEFAULT_STRUCTURE: JohreiCenterStructure = {
  amList: [
    { id: 'am-1', name: 'Daniela Almeida', sector: 'CENTRO-NORTE' },
    { id: 'am-2', name: 'Graziela Paiva', sector: 'SUL' },
    { id: 'am-3', name: 'Min Clelia', sector: 'ILHA BELA' },
    { id: 'am-4', name: 'Min CLelia', sector: 'SÃO SEBASTIÃO' },
    { id: 'am-5', name: 'Anna Julia', sector: 'INDAIÁ-SERRA' }
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
  
  // Theme fixa: removido toggle (mantemos tema light por simplicidade)
  const isDark = false;


  // Sidebar responsive collapse states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Role Session state
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [currentAMName, setCurrentAMName] = useState<string>('PROF DANI');

  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentAppUser, setCurrentAppUser] = useState<AppUser | null>(null);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Loading state for Firebase
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
  const enrichPeopleWithFamilyIds = (pList: Person[]): Person[] => {
    // De-duplicate people by ID to prevent key-uniqueness issues in React
    const seenIds = new Set<string>();
    const uniqueList = pList.filter(p => {
      if (!p.id) return false;
      const key = p.id.trim();
      if (seenIds.has(key)) return false;
      seenIds.add(key);
      return true;
    });

    const normalizeAddress = (addrStr: string): string => {
      return (addrStr || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ' ') // replace non-alphanumeric with spaces
        .replace(/\s+/g, ' ') // collapse multiple spaces
        .trim();
    };

    const groups: Record<string, Person[]> = {};
    
    // Group people strictly by normalized address
    uniqueList.forEach(p => {
      const rawAddr = (p.endCompleto || '').trim();
      const addrUpper = rawAddr.toUpperCase();
      
      if (
        rawAddr && 
        addrUpper !== 'N/A' && 
        addrUpper !== 'SEM ENDERECO' && 
        addrUpper !== 'SEM ENDEREÇO' && 
        addrUpper !== 'ENDEREÇO NÃO INFORMADO' && 
        addrUpper !== 'ENDERECO NAO INFORMADO' && 
        rawAddr.length >= 5
      ) {
        const norm = normalizeAddress(rawAddr);
        if (norm) {
          if (!groups[norm]) {
            groups[norm] = [];
          }
          groups[norm].push(p);
        }
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
    
    return uniqueList.map(p => {
      const rawAddr = (p.endCompleto || '').trim();
      const addrUpper = rawAddr.toUpperCase();
      
      if (
        rawAddr && 
        addrUpper !== 'N/A' && 
        addrUpper !== 'SEM ENDERECO' && 
        addrUpper !== 'SEM ENDEREÇO' && 
        addrUpper !== 'ENDEREÇO NÃO INFORMADO' && 
        addrUpper !== 'ENDERECO NAO INFORMADO' && 
        rawAddr.length >= 5
      ) {
        const norm = normalizeAddress(rawAddr);
        const list = groups[norm];
        if (list && list.length > 0) {
          const oldest = getOldest(list);
          return {
            ...p,
            idFamilia: `FAM-${oldest.id}`
          };
        }
      }
      
      // For people without a valid address, they belong to their own single-person family
      return {
        ...p,
        idFamilia: `FAM-${p.id}`
      };
    });
  };

  // Helper to de-duplicate, sanitize, and clean loaded people
  const cleanAndDeDuplicatePeople = (pList: Person[]): Person[] => {
    const seenIds = new Set<string>();
    
    // Parse malformed names containing commas (e.g. from comma/semicolon CSV export split glitches)
    const sanitizedList = pList.map(p => {
      let name = (p.nome || '').trim();
      if (name.includes(',')) {
        const parts = name.split(',').map(x => x.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const firstPartIsNumber = /^\d+$/.test(parts[0]);
          if (firstPartIsNumber || parts.length >= 4) {
            let offset = firstPartIsNumber ? 1 : 0;
            const af = parts[offset] || '';
            const sector = parts[offset + 1] || '';
            const realName = parts[offset + 2] || '';
            const address = parts.slice(offset + 3).join(', ') || '';
            
            const updated = { ...p };
            if (realName) updated.nome = realName.toUpperCase();
            if (af) updated.af2 = af.toUpperCase();
            if (sector) updated.setor2 = sector.toUpperCase();
            if (address && (!p.endCompleto || p.endCompleto === 'Endereço não informado' || p.endCompleto.length < 5)) {
              updated.endCompleto = address;
            }
            return updated;
          }
        }
      }
      return p;
    });

    return sanitizedList.filter(p => {
      if (!p.id) return false;
      const key = p.id.trim();
      if (seenIds.has(key)) return false;
      
      const name = (p.nome || '').trim().toUpperCase();
      if (!name || 
          name.includes('FALTA LOGRADOURO') || 
          name.includes('LOGRADOURO') || 
          name.startsWith(',') || 
          name.startsWith('0,') || 
          name.startsWith('1,') || 
          name === 'N/A'
      ) {
        return false;
      }
      
      seenIds.add(key);
      return true;
    });
  };

  const cleanSanitizeAndEnrichPeople = (pList: Person[]): Person[] => {
    const cleaned = cleanAndDeDuplicatePeople(pList);
    return enrichPeopleWithFamilyIds(cleaned);
  };

  // Load from Firebase on application start depending on authentication
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
        unsubscribeRealtime = null;
      }

      if (user) {
        setCurrentUser(user);
        setIsLoading(true);

        // Define fallback profile immediately in case of timeout/offline
        const isOwner = (user.email || '').toLowerCase().trim() === 'pedro.ms.bogalho@gmail.com';
        const fallbackProfile: AppUser = {
          uid: user.uid,
          email: user.email || 'offline@jornadajc.app.local',
          displayName: user.displayName || 'Usuário Offline',
          role: isOwner ? 'ADMIN' : 'ASSISTANT',
          approved: true, // Se falhar a conexão, permite acesso local/offline
          requestDate: new Date().toISOString()
        };

        // Criamos um sinal/flag de controle para evitar corrida de estados
        let initialized = false;

        // Função de fallback para modo Local/Offline
        const handleOfflineFallback = (reason: string) => {
          if (initialized) return;
          initialized = true;
          console.warn(`[Firebase Offline Fallback] Using LocalStorage because: ${reason}`);

          setCurrentAppUser(fallbackProfile);
          setUserRole(fallbackProfile.role);

          const cachedPeople = localStorage.getItem('jc_people_shared') || localStorage.getItem(`jc_people_${user.uid}`) || localStorage.getItem('jc_people');
          const cachedStructure = localStorage.getItem('jc_structure_shared') || localStorage.getItem(`jc_structure_${user.uid}`) || localStorage.getItem('jc_structure');

          if (cachedPeople) {
            setPeople(cleanSanitizeAndEnrichPeople(JSON.parse(cachedPeople)));
          } else {
            setPeople([]);
          }

          if (cachedStructure) {
            setStructure(JSON.parse(cachedStructure));
          } else {
            setStructure(DEFAULT_STRUCTURE);
          }

          setIsLoading(false);
          setAuthLoading(false);
        };

        // Limite de tempo de 3.5 segundos para conectar e autenticar no Firestore
        const offlineTimeout = setTimeout(() => {
          handleOfflineFallback("Firestore connection timeout (3.5s)");
        }, 3500);

        try {
          // Garante que o documento de perfil no Firestore existe
          const userEmail = user.email || `${user.displayName?.toLowerCase().replace(/\s+/g, '') || 'usuario'}@jornadajc.app.local`;
          const initialProfile = await createAppUserOrGet(user.uid, userEmail, user.displayName || '');

          // Se o timeout ainda não disparou o fallback offline:
          if (!initialized) {
            setCurrentAppUser(initialProfile);
            setUserRole(initialProfile.role);

            // Escuta em tempo real as mudanças no perfil (ex: aprovação pelo administrador)
            unsubscribeRealtime = onAppUserChangeRealtime(user.uid, async (latestAppUser) => {
              // Limpa o timeout de offline pois conseguimos conectar com sucesso!
              clearTimeout(offlineTimeout);

              if (latestAppUser) {
                setCurrentAppUser(latestAppUser);
                setUserRole(latestAppUser.role);

                if (latestAppUser.approved) {
                  // Se aprovado, carrega os dados compartilhados
                  setIsLoading(true);
                  try {
                     const fbPeople = await fetchPeopleFromFirebase(user.uid);
                     const fbStructure = await fetchStructureFromFirebase(user.uid);

                     if (fbPeople && fbPeople.length > 0) {
                       const cleanPeople = cleanSanitizeAndEnrichPeople(fbPeople);
                       setPeople(cleanPeople);
                       localStorage.setItem('jc_people_shared', JSON.stringify(cleanPeople));
                     } else {
                       const cachedPeople = localStorage.getItem('jc_people_shared') || localStorage.getItem(`jc_people_${user.uid}`) || localStorage.getItem('jc_people');
                       if (cachedPeople) {
                         const parsed = JSON.parse(cachedPeople);
                         if (parsed.length > 0) {
                           const cleanPeople = cleanSanitizeAndEnrichPeople(parsed);
                           setPeople(cleanPeople);
                           savePeopleBatchToFirebase(user.uid, cleanPeople).catch(err => console.error("Auto-migration of people failed:", err));
                         }
                       } else {
                         setPeople([]);
                       }
                     }

                     if (fbStructure) {
                       setStructure(fbStructure);
                       localStorage.setItem('jc_structure_shared', JSON.stringify(fbStructure));
                     } else {
                       const cachedStructure = localStorage.getItem('jc_structure_shared') || localStorage.getItem(`jc_structure_${user.uid}`) || localStorage.getItem('jc_structure');
                       if (cachedStructure) {
                         const parsed = JSON.parse(cachedStructure);
                         setStructure(parsed);
                         saveStructureToFirebase(user.uid, parsed).catch(err => console.error("Auto-migration of structure failed:", err));
                       } else {
                         setStructure(DEFAULT_STRUCTURE);
                         saveStructureToFirebase(user.uid, DEFAULT_STRUCTURE).catch(err => console.error("Initial structure save failed:", err));
                       }
                     }
                  } catch (error) {
                    console.error("Failed to load user database, falling back to LocalStorage:", error);
                    const cachedPeople = localStorage.getItem('jc_people_shared') || localStorage.getItem(`jc_people_${user.uid}`) || localStorage.getItem('jc_people');
                    const cachedStructure = localStorage.getItem('jc_structure_shared') || localStorage.getItem(`jc_structure_${user.uid}`) || localStorage.getItem('jc_structure');
                    if (cachedPeople) {
                      setPeople(cleanSanitizeAndEnrichPeople(JSON.parse(cachedPeople)));
                    }
                    if (cachedStructure) {
                      setStructure(JSON.parse(cachedStructure));
                    } else {
                      setStructure(DEFAULT_STRUCTURE);
                    }
                  } finally {
                    setIsLoading(false);
                    setAuthLoading(false);
                  }
                } else {
                  // Se não aprovado, limpa os dados em tela e aguarda aprovação
                  setPeople([]);
                  setStructure(DEFAULT_STRUCTURE);
                  setIsLoading(false);
                  setAuthLoading(false);
                }
              } else {
                setCurrentAppUser(null);
                setPeople([]);
                setStructure(DEFAULT_STRUCTURE);
                setIsLoading(false);
                setAuthLoading(false);
              }
            });
          }
        } catch (error) {
          clearTimeout(offlineTimeout);
          console.error("Error setting up user session:", error);
          handleOfflineFallback(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        setCurrentUser(null);
        setCurrentAppUser(null);
        setPeople([]);
        setStructure(DEFAULT_STRUCTURE);
        setAuthLoading(false);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
    };
  }, []);

  // Carrega a lista de usuários registrados caso o usuário atual seja Administrador
  useEffect(() => {
    if (currentUser && currentAppUser?.role === 'ADMIN') {
      fetchAllAppUsers()
        .then(setAppUsers)
        .catch(err => console.error("Falha ao carregar lista de usuários para administração:", err));
    }
  }, [currentUser, currentAppUser]);

  // Compute families dynamically whenever the people list changes
  useEffect(() => {
    if (people.length === 0) {
      setFamilies([]);
      return;
    }
    
    const groups: Record<string, Person[]> = {};
    
    people.forEach(p => {
      const famId = (p.idFamilia && p.idFamilia.startsWith('FAM-')) ? p.idFamilia : `FAM-${p.id}`;
      if (!groups[famId]) {
        groups[famId] = [];
      }
      groups[famId].push(p);
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
    
    Object.entries(groups).forEach(([famId, list]) => {
      const oldest = getOldest(list);
      
      // Prefer a valid street address, starting with the oldest person's address
      let finalAddress = '';
      const oldestAddress = (oldest.endCompleto || '').trim();
      if (oldestAddress && oldestAddress !== 'N/A' && oldestAddress !== 'SEM ENDEREÇO' && oldestAddress.length >= 5) {
        finalAddress = oldest.endCompleto;
      } else {
        const withAddr = list.find(m => {
          const mAddr = (m.endCompleto || '').trim();
          return mAddr && mAddr !== 'N/A' && mAddr !== 'SEM ENDEREÇO' && mAddr.length >= 5;
        });
        finalAddress = withAddr?.endCompleto || oldest.endCompleto || 'Endereço não informado';
      }

      const hasNoAddress = !finalAddress || finalAddress === 'Endereço não informado' || finalAddress === 'N/A' || finalAddress === 'SEM ENDEREÇO' || finalAddress.length < 5;
      
      derived.push({
        id: famId,
        nome: `FAMÍLIA DE ${oldest.nome}${hasNoAddress ? ' (S/ End.)' : ''}`,
        endereco: finalAddress,
        afResponsavel: oldest.af2 || oldest.am || 'Sem AF',
        historico: '',
        observacoes: hasNoAddress ? 'Cadastro individual.' : `Grupo residencial com ${list.length} integrantes.`
      });
    });
    
    setFamilies(derived);
  }, [people]);

  // Sync to LocalStorage & Firebase (Differential/Granular Sync)
  const handleUpdatePeople = async (newPeople: Person[]) => {
    if (!currentUser) return;
    const enriched = cleanSanitizeAndEnrichPeople(newPeople);

    // Identifica apenas os registros que foram alterados, adicionados ou deletados
    const changedPeople: Person[] = [];
    const deletedIds: string[] = [];

    // Mapeia o estado atual em memória para busca rápida
    const currentPeopleMap = new Map(people.map(p => [p.id, p]));

    // Procura por novos registros ou modificações
    enriched.forEach(p => {
      const existing = currentPeopleMap.get(p.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
        changedPeople.push(p);
      }
    });

    // Procura por deleções
    const enrichedIds = new Set(enriched.map(p => p.id));
    people.forEach(p => {
      if (!enrichedIds.has(p.id)) {
        deletedIds.push(p.id);
      }
    });

    setPeople(enriched);
    localStorage.setItem('jc_people_shared', JSON.stringify(enriched));

    // Executa atualizações incrementais em vez de regravar todos os 690+ membros
    try {
      if (changedPeople.length > 0 || deletedIds.length > 0) {
        console.log(`[Granular Sync] Sincronizando ${changedPeople.length} alterações/adições e ${deletedIds.length} exclusões no Firestore.`);
        
        // Se houver mais de 15 alterações, usa gravação em lote (ex: importação, carga demo ou edição em massa por IA)
        if (changedPeople.length > 15) {
          await savePeopleBatchToFirebase(currentUser.uid, changedPeople);
        } else {
          // Grava cada modificação individualmente de forma paralela para economizar cota de escrita
          await Promise.all([
            ...changedPeople.map(p => savePersonToFirebase(currentUser.uid, p)),
            ...deletedIds.map(id => deletePersonFromFirebase(currentUser.uid, id))
          ]);
        }
      }
    } catch (err) {
      console.error("Error syncing updated people list to Firebase:", err);
    }
  };

  const handleUpdateFamilies = (newFamilies: Family[]) => {
    if (!currentUser) return;
    setFamilies(newFamilies);
    localStorage.setItem('jc_families_shared', JSON.stringify(newFamilies));
  };

  const handleUpdateStructure = async (newStructure: JohreiCenterStructure) => {
    if (!currentUser) return;
    // Atualiza structure e imediatamente re-normaliza o campo dos membros para refletir o organograma.
    const nextPeople = people.map(p => {
      const setor = (p.setor2 || '').toUpperCase();
      const matchingAM = newStructure.amList.find(am => am.sector.toUpperCase() === setor);
      const matchingAFs = newStructure.afList.filter(af => af.sector.toUpperCase() === setor);

      const keepAM = matchingAM && p.am && p.am.toUpperCase() === matchingAM.name.toUpperCase();
      const keepAF = matchingAFs.some(af => p.af2 && p.af2.toUpperCase() === af.name.toUpperCase());

      return {
        ...p,
        am: keepAM ? p.am : '',
        af2: keepAF ? p.af2 : ''
      };
    });

    const enriched = cleanSanitizeAndEnrichPeople(nextPeople);
    setPeople(enriched);
    localStorage.setItem('jc_people_shared', JSON.stringify(enriched));

    setStructure(newStructure);
    localStorage.setItem('jc_structure_shared', JSON.stringify(newStructure));

    // Salva primeiro a estrutura (operação rápida e crítica)
    try {
      await saveStructureToFirebase(currentUser.uid, newStructure);
      console.log("Estrutura salva com sucesso no Firebase.");
    } catch (err) {
      console.error("Erro ao sincronizar estrutura no Firebase:", err);
      throw err; // Repassa para que a UI mostre erro se falhar
    }

    // Salva os membros em lote em segundo plano (pode ser lento)
    try {
      await savePeopleBatchToFirebase(currentUser.uid, enriched);
      console.log("Membros atualizados sincronizados com sucesso no Firebase.");
    } catch (err) {
      console.error("Erro ao sincronizar membros re-normalizados no Firebase:", err);
    }
  };

  // Helper for quick load demo database
  const handleLoadDemoData = async () => {
    if (!currentUser) return;
    const enriched = cleanSanitizeAndEnrichPeople(INITIAL_PEOPLE);
    setPeople(enriched);
    localStorage.setItem('jc_people_shared', JSON.stringify(enriched));
    try {
      await savePeopleBatchToFirebase(currentUser.uid, enriched);
      alert('Banco de dados de demonstração carregado e salvo no Firebase com sucesso!');
    } catch (err) {
      console.error("Error syncing demo data to Firebase:", err);
      alert('Banco de dados de demonstração carregado localmente (erro ao sincronizar na nuvem).');
    }
  };

  // Handle onboarding manual CSV import
  const handleOnboardingImport = async () => {
    if (!currentUser) return;
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
      const enriched = cleanSanitizeAndEnrichPeople(parsed as Person[]);
      setPeople(enriched);
      localStorage.setItem('jc_people_shared', JSON.stringify(enriched));
      setOnboardingError('');
      setOnboardingCSV('');
      try {
        await savePeopleBatchToFirebase(currentUser.uid, enriched);
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
              const enriched = cleanSanitizeAndEnrichPeople(parsed as Person[]);
              setPeople(enriched);
              localStorage.setItem(`jc_people_${currentUser.uid}`, JSON.stringify(enriched));
              setOnboardingError('');
              setOnboardingCSV('');
              try {
                await savePeopleBatchToFirebase(currentUser.uid, enriched);
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
          const enriched = cleanSanitizeAndEnrichPeople(parsed as Person[]);
          setPeople(enriched);
          localStorage.setItem(`jc_people_${currentUser.uid}`, JSON.stringify(enriched));
          setOnboardingError('');
          setOnboardingCSV('');
          try {
            await savePeopleBatchToFirebase(currentUser.uid, enriched);
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
    if (!currentUser) return;
    setPeople([]);
    localStorage.removeItem(`jc_people_${currentUser.uid}`);
    setOnboardingCSV('');
    setOnboardingError('');
    setShowResetModal(false);
    setActiveTab('dashboard');
    try {
      await clearAllFirebaseData(currentUser.uid);
      alert('Banco de dados excluído do Firebase e localmente com sucesso!');
    } catch (err) {
      console.error("Error clearing data from Firebase:", err);
      alert('Banco de dados limpo localmente (falha ao limpar no Firebase).');
    }
  };

  // Navigation config (with collapse responsive capabilities)
  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'people', label: 'Membros', icon: Users },
    { id: 'frequenters', label: 'Frequentadores', icon: Heart },
    { id: 'tree', label: 'Setorização', icon: Network },
    { id: 'journey', label: 'Jornada Espiritual', icon: Compass },
    { id: 'courses', label: 'Controle de Cursos', icon: GraduationCap },
    { id: 'families', label: 'Famílias', icon: Home },
    { id: 'structure', label: 'Estrutura JC', icon: Building2 },
    { id: 'pendencies', label: 'Pendências', icon: AlertTriangle, alertCount: true },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 }
  ];

  // Compute total alerts to display inside badge
  const missingPostOutorgaCount = people.filter(p => p.subtipoCadastro === 'MEMBRO' && p.tipoCadastro === 'Ohikari' && !Object.values(p.cursoPosOutorga.aulas).every(v => v === 'Concluido')).length;
  const noWhatsCount = people.filter(p => p.subtipoCadastro === 'MEMBRO' && p.jornadaEtapa !== 'Primeiro atendimento' && !p.gruposWhats.grupoSetor && !p.gruposWhats.grupoGeral).length;
  
  // Families sem Assistente de Família (AF) definido
  const familiesSemAFCount = families.filter(f => !f.afResponsavel).length;

  const noSectorCount = people.filter(p => !p.setor2).length;
  const noPhoneCount = people.filter(p => !p.celularPrincipal).length;
  const totalAlerts = missingPostOutorgaCount + noWhatsCount + familiesSemAFCount + noSectorCount + noPhoneCount;

  // Render the views based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            people={people} 
            families={families} 
            structure={structure}
            onNavigate={(tab) => setActiveTab(tab)} 
          />
        );
      case 'people':
        return (
          <PeopleView 
            people={people} 
            structure={structure}
            onUpdatePeople={handleUpdatePeople} 
          />
        );
      case 'frequenters':
        return (
          <FrequentersView 
            people={people} 
            structure={structure}
            onUpdatePeople={handleUpdatePeople} 
          />
        );
      case 'tree':
        return (
          <TreeView 
            people={people} 
            structure={structure}
            onUpdatePeople={handleUpdatePeople} 
          />
        );
      case 'journey':
        return (
          <JourneyView 
            people={people} 
            onUpdatePeople={handleUpdatePeople} 
          />
        );
      case 'courses':
        return (
          <CoursesView 
            people={people} 
            onUpdatePeople={handleUpdatePeople} 
          />
        );
      case 'families':
        return (
          <FamiliesView 
            people={people} 
            families={families} 
            structure={structure}
            onUpdatePeople={handleUpdatePeople}
            onUpdateFamilies={handleUpdateFamilies} 
          />
        );
      case 'structure':
        return (
          <StructureView 
            structure={structure} 
            onUpdateStructure={handleUpdateStructure}
            userRole={userRole}
          />
        );
      case 'pendencies':
        return (
          <PendenciesView 
            people={people} 
            families={families}
            onUpdatePeople={handleUpdatePeople} 
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'reports':
        return <ReportsView people={people} families={families} />;
      case 'user-approvals':
        return (
          <UserApprovalsView 
            users={appUsers} 
            onApprove={async (uid, role) => {
              await updateAppUserApproval(uid, true, role);
              const updated = await fetchAllAppUsers();
              setAppUsers(updated);
            }} 
            onRevoke={async (uid) => {
              await updateAppUserApproval(uid, false, 'ASSISTANT');
              const updated = await fetchAllAppUsers();
              setAppUsers(updated);
            }} 
          />
        );
      default:
        return (
          <div className="p-8 text-center text-slate-500">
            Página em desenvolvimento.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen font-sans flex bg-[#f4f5f7] text-slate-800">
      
      {/* 1. Mobile Topbar Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200/60 z-30 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/faviconimmb.png" alt="Logo" className="w-5 h-5 object-contain" />
          <span className="font-display font-bold text-xs tracking-tight text-slate-900">JC Caraguatatuba</span>
        </div>
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
        >
          {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Backdrop for mobile menu drawer */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-35"
        ></div>
      )}

      {/* 2. Side navigation menu drawer */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200/60 flex flex-col justify-between transition-all duration-300
        md:sticky md:top-0 md:h-screen md:z-20
        ${isSidebarCollapsed ? 'w-16' : 'w-56'}
        ${isMobileSidebarOpen ? 'translate-x-0 w-56' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Sidebar Header Title */}
        <div className="h-14 md:h-16 px-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <img src="/faviconimmb.png" alt="Logo" className="w-5 h-5 shrink-0 object-contain" />
            {!isSidebarCollapsed && (
              <div className="truncate">
                <span className="font-display font-extrabold text-xs tracking-tight block text-slate-900">JC Caraguá</span>
                <span className="text-[8px] text-zinc-400 font-mono tracking-wider uppercase">Painel de Acompanhamento</span>
              </div>
            )}
          </div>
          
          {/* Collapse toggler for Desktop */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex p-1 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Menu Navigation Links List */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer relative group
                  ${isActive 
                    ? 'bg-teal-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}

                {/* Badge for Alert counts */}
                {item.alertCount && totalAlerts > 0 && (
                  <span className={`
                    absolute right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-tight leading-none
                    ${isActive ? 'bg-white text-teal-700' : 'bg-red-500 text-white'}
                    ${isSidebarCollapsed ? 'top-1 right-1' : ''}
                  `}>
                    {totalAlerts}
                  </span>
                )}
              </button>
            );
          })}

          {/* Seção de Administração de Usuários (Apenas Visível para donos/ADMIN) */}
          {currentAppUser?.role === 'ADMIN' && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <span className={`block px-3 mb-1 text-[8px] font-bold font-mono tracking-wider uppercase text-zinc-400 ${isSidebarCollapsed ? 'text-center' : ''}`}>
                {isSidebarCollapsed ? 'ADM' : 'Segurança'}
              </span>
              <button
                onClick={() => {
                  setActiveTab('user-approvals');
                  setIsMobileSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer group
                  ${activeTab === 'user-approvals'
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
                title={isSidebarCollapsed ? 'Gerenciar Usuários' : ''}
              >
                <Shield className={`w-4 h-4 shrink-0 ${activeTab === 'user-approvals' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!isSidebarCollapsed && <span className="truncate">Aprovações de Acesso</span>}
              </button>
            </div>
          )}
        </nav>

        {/* Sidebar Footer User Info Profile Block */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {!isSidebarCollapsed && (
            <div className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-100/40 text-[10px] leading-relaxed truncate space-y-1">
              <div className="flex justify-between items-center text-slate-400 font-mono font-medium text-[8px] uppercase">
                <span>Perfil</span>
                <span className="font-bold text-teal-600">{currentAppUser?.role}</span>
              </div>
              <div className="font-bold text-slate-800 truncate">{currentUser.displayName || currentUser.email}</div>
            </div>
          )}

          <button 
            onClick={() => {
              if (confirm('Deseja realmente sair da sua conta?')) {
                logoutUser();
              }
            }}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-red-600 hover:bg-red-50 cursor-pointer
              ${isSidebarCollapsed ? 'justify-center' : ''}
            `}
            title={isSidebarCollapsed ? 'Sair do Sistema' : ''}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* 3. Main Dashboard stage canvas */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden pt-14 md:pt-0">
        
        {/* Optional warning bar if Database is empty */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {renderContent()}
        </div>

        {/* Global Footer */}
        <footer className="py-4 px-6 border-t border-slate-200/50 text-center flex flex-col sm:flex-row justify-between items-center gap-2 text-xxs font-mono text-zinc-400 mt-auto bg-white/40">
          <div>Johrei Center Caraguatatuba © 2026 • Gestão Interna de Membros</div>
          <div className="flex items-center gap-3">
            <span>Sincronizado via Firebase Firestore</span>
            <button
              onClick={handleResetDatabaseFully}
              className="text-[10px] font-sans font-semibold text-red-500 hover:text-red-600 hover:underline cursor-pointer"
            >
              Excluir Banco de Dados
            </button>
          </div>
        </footer>
      </main>

      {/* Floating AI Bulk Editor Assistant Component */}
      <AIBulkEditor 
        people={people} 
        onUpdatePeople={handleUpdatePeople} 
        activeTab={activeTab} 
        isDark={isDark} 
      />

      {/* Full Reset Confirmation Dialog Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="font-sans font-bold text-base text-slate-900">Excluir Banco de Dados Inteiro?</h3>
              <p className="text-xs text-slate-500">
                Atenção: Essa ação é irreversível e apagará todos os dados de membros, frequentadores, histórico de cursos e estruturas armazenadas na sua conta no Firebase e em seu navegador.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmResetDatabase}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Sim, Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}