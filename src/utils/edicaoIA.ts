/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Regras da edição em massa com IA, sem React e sem rede (funções puras).
 *
 * A resposta da IA nunca é aplicada como veio: cada campo passa por
 * `normalizarAtualizacao`, que só aceita os campos permitidos e valores
 * válidos. Antes a resposta era mesclada direto na ficha (`{ ...p, ...updates }`)
 * e podia alterar qualquer campo, inclusive o `id`.
 */

import { Person, JornadaEtapa, StatusAtual, SubtipoCadastro } from '../types';

export const ETAPAS_JORNADA: JornadaEtapa[] = [
  'Primeiro atendimento',
  'Recebe Johrei',
  'Curso de Iniciação',
  'Ingressa',
  'Recebe Ohikari',
  'Curso Pós-Outorga',
  'Conclui Pós-Outorga',
  'Torna-se membro ativo',
];
const STATUS: StatusAtual[] = ['ATIVO', 'INATIVO', 'AFASTADO', 'FALECIDO'];
const SUBTIPOS: SubtipoCadastro[] = ['MEMBRO', 'FREQUENTADOR'];
const AULAS = [1, 2, 3, 4, 5] as const;
type NumeroAula = typeof AULAS[number];

/** Campos que a IA pode alterar. Qualquer outro campo da resposta é ignorado. */
export const CAMPOS_PERMITIDOS = [
  'tipoCadastro',
  'subtipoCadastro',
  'statusAtual',
  'idade',
  'tempoMembro',
  'setor2',
  'am',
  'af2',
  'celularPrincipal',
  'dataOutorga',
  'anoOutorga',
  'jornadaEtapa',
  'cursoIniciacao',
  'cursoPosOutorga',
] as const;

export const ROTULOS_CAMPOS: Record<string, string> = {
  tipoCadastro: 'Tipo de cadastro',
  subtipoCadastro: 'Membro/Frequentador',
  statusAtual: 'Status',
  idade: 'Idade',
  tempoMembro: 'Tempo de membro',
  setor2: 'Setor',
  am: 'AM',
  af2: 'AF',
  celularPrincipal: 'Celular',
  dataOutorga: 'Data de outorga',
  anoOutorga: 'Ano de outorga',
  jornadaEtapa: 'Etapa da jornada',
};

/** Atualização já validada: campos simples + aulas como concluída sim/não. */
export interface AtualizacaoNormalizada {
  campos: Partial<Record<string, string | number>>;
  aulasPosOutorga?: Partial<Record<NumeroAula, boolean>>;
  aulasIniciacao?: Partial<Record<NumeroAula, boolean>>;
  ignorados: string[]; // descrição do que foi recusado, para mostrar ao usuário
}

export function aulaConcluida(status: unknown): boolean {
  if (typeof status !== 'string') return false;
  const s = status.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return s === 'concluido';
}

/** 'DD/MM/AAAA' ou 'AAAA-MM-DD' → 'AAAA-MM-DD'; inválida → null. */
export function dataParaISO(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const t = valor.trim();
  let a: number, m: number, d: number;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (iso) { a = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else if (br) { a = +br[3]; m = +br[2]; d = +br[1]; }
  else return null;
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return null;
  if (a < 1900 || a > 2100) return null;
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Lê as aulas de várias formas que a IA costuma devolver. */
function lerAulas(bruto: any, chavesPlanas: Record<string, unknown>, prefixo: string): Partial<Record<NumeroAula, boolean>> | undefined {
  const fonte = bruto && typeof bruto === 'object' ? (bruto.aulas && typeof bruto.aulas === 'object' ? bruto.aulas : bruto) : {};
  const aulas: Partial<Record<NumeroAula, boolean>> = {};
  AULAS.forEach((n) => {
    const valor = fonte[n] ?? fonte[String(n)]
      ?? chavesPlanas[`${prefixo}.aulas.${n}`] ?? chavesPlanas[`${prefixo}.aulas[${n}]`] ?? chavesPlanas[`${prefixo}.${n}`];
    if (typeof valor === 'string') aulas[n] = aulaConcluida(valor);
    else if (typeof valor === 'boolean') aulas[n] = valor;
  });
  return Object.keys(aulas).length > 0 ? aulas : undefined;
}

/** Valida a resposta da IA para UMA pessoa. Nunca lança erro. */
export function normalizarAtualizacao(bruto: unknown): AtualizacaoNormalizada {
  const resultado: AtualizacaoNormalizada = { campos: {}, ignorados: [] };
  if (!bruto || typeof bruto !== 'object') return resultado;
  const u = bruto as Record<string, any>;
  const recusar = (campo: string, motivo: string) => resultado.ignorados.push(`${campo}: ${motivo}`);
  const texto = (v: unknown) => (typeof v === 'string' || typeof v === 'number') ? String(v).trim() : null;

  Object.keys(u).forEach((chave) => {
    // chaves planas como "cursoPosOutorga.aulas.1" são tratadas junto com o curso
    if (/^curso(PosOutorga|Iniciacao)[.[]/.test(chave)) return;
    if (!(CAMPOS_PERMITIDOS as readonly string[]).includes(chave)) {
      recusar(chave, 'campo não permitido');
      return;
    }
    const v = u[chave];
    switch (chave) {
      case 'subtipoCadastro': {
        const s = texto(v)?.toUpperCase();
        if (s && (SUBTIPOS as string[]).includes(s)) resultado.campos[chave] = s;
        else recusar(chave, `valor inválido "${v}"`);
        break;
      }
      case 'statusAtual': {
        const s = texto(v)?.toUpperCase();
        if (s && (STATUS as string[]).includes(s)) resultado.campos[chave] = s;
        else recusar(chave, `valor inválido "${v}"`);
        break;
      }
      case 'jornadaEtapa': {
        const s = texto(v);
        const etapa = ETAPAS_JORNADA.find((e) => e.toLowerCase() === (s || '').toLowerCase());
        if (etapa) resultado.campos[chave] = etapa;
        else recusar(chave, `etapa inexistente "${v}"`);
        break;
      }
      case 'idade': {
        const n = typeof v === 'number' ? v : Number(texto(v));
        if (Number.isInteger(n) && n >= 0 && n <= 130) resultado.campos[chave] = n;
        else recusar(chave, `valor inválido "${v}"`);
        break;
      }
      case 'anoOutorga': {
        const n = typeof v === 'number' ? v : Number(texto(v));
        if (Number.isInteger(n) && n >= 1900 && n <= 2100) resultado.campos[chave] = n;
        else recusar(chave, `ano inválido "${v}"`);
        break;
      }
      case 'dataOutorga': {
        const iso = dataParaISO(v);
        if (iso) resultado.campos[chave] = iso;
        else recusar(chave, `data inválida "${v}"`);
        break;
      }
      case 'setor2': {
        const s = texto(v);
        if (s !== null) resultado.campos[chave] = s.toUpperCase();
        else recusar(chave, 'valor inválido');
        break;
      }
      case 'cursoPosOutorga':
      case 'cursoIniciacao':
        break; // tratados abaixo
      default: {
        const s = texto(v);
        if (s !== null && s.length <= 200) resultado.campos[chave] = s;
        else recusar(chave, 'valor inválido');
      }
    }
  });

  const pos = lerAulas(u.cursoPosOutorga, u, 'cursoPosOutorga');
  if (pos) resultado.aulasPosOutorga = pos;
  else if (u.cursoPosOutorga !== undefined) recusar('cursoPosOutorga', 'aulas não reconhecidas');

  const ini = u.cursoIniciacao;
  let aulasIni = lerAulas(ini, u, 'cursoIniciacao');
  // "concluido: true/false" sem aulas = marcar/desmarcar o curso inteiro
  if (!aulasIni && ini && typeof ini === 'object' && typeof ini.concluido === 'boolean') {
    aulasIni = { 1: ini.concluido, 2: ini.concluido, 3: ini.concluido, 4: ini.concluido, 5: ini.concluido };
  }
  if (aulasIni) resultado.aulasIniciacao = aulasIni;
  else if (ini !== undefined) recusar('cursoIniciacao', 'aulas não reconhecidas');

  return resultado;
}

export function atualizacaoVazia(a: AtualizacaoNormalizada): boolean {
  return Object.keys(a.campos).length === 0 && !a.aulasPosOutorga && !a.aulasIniciacao;
}

/**
 * Aplica a atualização preservando tudo o que a IA não mencionou — inclusive
 * datas de conclusão, instrutores e comentários das aulas, que antes eram
 * apagados ao editar o pós-outorga pela IA.
 */
export function aplicarAtualizacao(p: Person, a: AtualizacaoNormalizada): Person {
  const novo: any = { ...p, ...a.campos };

  if (a.aulasPosOutorga) {
    const atual: any = p.cursoPosOutorga || { aulas: {} };
    const aulas: any = { ...(atual.aulas || {}) };
    const concluidosEm: any = { ...(atual.concluidosEm || {}) };
    AULAS.forEach((n) => {
      const alvo = a.aulasPosOutorga![n];
      if (alvo === undefined) {
        if (aulas[n] === undefined) aulas[n] = 'Não iniciou';
        return;
      }
      const jaConcluida = aulaConcluida(aulas[n]);
      if (alvo && !jaConcluida) {
        aulas[n] = 'Concluído';
        concluidosEm[n] = concluidosEm[n] || ''; // mesmo comportamento da tela de Cursos
      } else if (!alvo && jaConcluida) {
        aulas[n] = 'Não iniciou';
        delete concluidosEm[n];
      }
    });
    novo.cursoPosOutorga = { ...atual, aulas, concluidosEm };
  }

  if (a.aulasIniciacao) {
    const atual: any = p.cursoIniciacao || {};
    const aulas: any = { ...(atual.aulas || {}) };
    AULAS.forEach((n) => {
      const alvo = a.aulasIniciacao![n];
      if (alvo === undefined) return;
      aulas[n] = alvo ? 'Concluído' : 'Não iniciado';
    });
    const todas = AULAS.every((n) => aulaConcluida(aulas[n]));
    const nenhuma = AULAS.every((n) => !aulaConcluida(aulas[n]));
    novo.cursoIniciacao = {
      ...atual,
      aulas,
      concluido: todas,
      presenca: todas ? true : nenhuma ? false : Boolean(atual.presenca),
      ...(nenhuma ? { dataPorAula: {}, instrutoresPorAula: {} } : {}),
    };
  }

  return novo as Person;
}

const fmt = (v: unknown) => (v === undefined || v === null || v === '' ? '—' : String(v));

/** Linhas legíveis do que muda, para a prévia ("Setor: SUL → LESTE"). */
export function descreverMudancas(antes: Person, depois: Person): string[] {
  const linhas: string[] = [];
  Object.keys(ROTULOS_CAMPOS).forEach((c) => {
    const x = (antes as any)[c];
    const y = (depois as any)[c];
    if (fmt(x) !== fmt(y)) linhas.push(`${ROTULOS_CAMPOS[c]}: ${fmt(x)} → ${fmt(y)}`);
  });
  AULAS.forEach((n) => {
    const x = aulaConcluida((antes.cursoPosOutorga as any)?.aulas?.[n]);
    const y = aulaConcluida((depois.cursoPosOutorga as any)?.aulas?.[n]);
    if (x !== y) linhas.push(`Pós-outorga aula ${n}: ${x ? 'concluída' : 'não iniciada'} → ${y ? 'concluída' : 'não iniciada'}`);
  });
  AULAS.forEach((n) => {
    const x = aulaConcluida((antes.cursoIniciacao as any)?.aulas?.[n]);
    const y = aulaConcluida((depois.cursoIniciacao as any)?.aulas?.[n]);
    if (x !== y) linhas.push(`Iniciação aula ${n}: ${x ? 'concluída' : 'não iniciada'} → ${y ? 'concluída' : 'não iniciada'}`);
  });
  return linhas;
}
