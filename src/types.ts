/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TipoCadastro = 'Ohikari' | 'Frequente' | 'Primeiro Contato' | 'Membro' | string;
export type SubtipoCadastro = 'MEMBRO' | 'FREQUENTADOR';
export type StatusAtual = 'ATIVO' | 'INATIVO' | 'AFASTADO' | 'FALECIDO';

export type JornadaEtapa = 
  | 'Primeiro atendimento' 
  | 'Recebe Johrei' 
  | 'Curso de Iniciação' 
  | 'Ingressa' 
  | 'Recebe Ohikari' 
  | 'Curso Pós-Outorga' 
  | 'Conclui Pós-Outorga' 
  | 'Torna-se membro ativo';

export interface CursoIniciacao {
  data: string;
  instrutor: string;
  presenca: boolean;
  concluido: boolean;
}

export interface CursoPosOutorga {
  // Aula 1, 2, 3, 4, 5
  aulas: {
    1: 'Não iniciou' | 'Em andamento' | 'Concluído' | 'Concluido';
    2: 'Não iniciou' | 'Em andamento' | 'Concluído' | 'Concluido';
    3: 'Não iniciou' | 'Em andamento' | 'Concluído' | 'Concluido';
    4: 'Não iniciou' | 'Em andamento' | 'Concluído' | 'Concluido';
    5: 'Não iniciou' | 'Em andamento' | 'Concluído' | 'Concluido';
  };
}

export interface GrupoWhatsApp {
  grupoSetor: boolean; // Entrou no grupo do setor?
  grupoGeral: boolean; // Entrou no grupo geral?
  grupoLar: boolean;   // Entrou no grupo do lar?
}

export interface CursosNivelIgreja {
  nivel1: 'Não iniciado' | 'Em andamento' | 'Concluído';
  nivel2: 'Não iniciado' | 'Em andamento' | 'Concluído';
  nivel3: 'Não iniciado' | 'Em andamento' | 'Concluído';
  nivel4: 'Não iniciado' | 'Em andamento' | 'Concluído';
}

export interface PurificacoesMembro {
  saude: boolean;
  conflito: boolean;
  financeiro: boolean;
  outros: boolean;
  descricao?: string;
}

export interface OrientaesMembro {
  texto: string;
  cumprindo: 'Sim' | 'Parcialmente' | 'Não' | 'Não se aplica';
}

export interface JornadaMembro {
  donativo: 'Mensal' | 'Ocasional' | 'Raro' | 'Não pratica';
  johreiFrequencia: 'Diário' | 'Semanal' | 'Mensal' | 'Ocasional' | 'Não pratica';
  encaminhadosQuantidade: number;
  ikebanaStatus: 'Não fez curso' | 'Fez curso básico' | 'Fez curso intermediário' | 'Fez curso avançado' | 'Ministra/Instrutor';
  cursosNivel: CursosNivelIgreja;
  jovem3Participacao: 'Sim' | 'Não' | 'Em andamento' | 'Não se aplica';
  purificacoes: PurificacoesMembro;
  orientacoes: OrientaesMembro;
}

export interface Person {
  id: string; // Código Cadastro
  nome: string;
  tipoCadastro: TipoCadastro;
  subtipoCadastro: SubtipoCadastro;
  statusAtual: StatusAtual;
  nascimento: string;
  idade: number;
  celularPrincipal: string;
  telefoneContato: string;
  email: string;
  ultimoAcessoApp: string;
  endCompleto: string;
  am: string; // Assistente de Ministro
  setor2: string; // SETOR2
  af2: string; // AF2 (Assistente de Família)
  endGoogle: string;
  bairroAjustado: string;
  dataOutorga: string;
  tempoMembro: string;
  anoOutorga: string | number;
  idFamilia: string;
  
  // Acompanhamento / Jornada Espiritual
  jornadaEtapa: JornadaEtapa;
  jornadaDatas: Record<string, string>; // Datas de conclusão de cada etapa
  
  // Cursos
  cursoIniciacao: CursoIniciacao;
  cursoPosOutorga: CursoPosOutorga;
  
  // Grupos WhatsApp
  gruposWhats: GrupoWhatsApp;
  
  // Jornada específica de Membro (dedicações contínuas, cursos de nível, ikebana, purificações, etc)
  jornadaMembro?: JornadaMembro;
}

export interface Family {
  id: string; // ID Familia
  nome: string; // e.g. "Família Onishi"
  endereco: string;
  afResponsavel: string;
  historico: string;
  observacoes: string;
  contatoTelefone?: string;
}

export interface Visit {
  id: string;
  data: string;
  idFamilia: string;
  quemVisitou: string;
  quemRecebeu: string;
  objetivo: string;
  johreiMinistrado: boolean;
  quantasPessoas: number;
  observacoes: string;
  fotoUrl?: string;
}

export type UserRole = 'ADMIN' | 'AM';

export interface UserSession {
  name: string;
  role: UserRole;
  amName?: string; // Se for AM, qual o nome do AM associado para filtrar os dados (ex: "PROF DANI")
}

export interface AMMember {
  id: string;
  name: string;
  sector: string;
}

export interface AFMember {
  id: string;
  name: string;
  sector: string;
}

export interface AssessorMember {
  id: string;
  name: string;
  role: string;
}

export interface JohreiCenterStructure {
  amList: AMMember[];
  afList: AFMember[];
  assessoresList: AssessorMember[];
}

