/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cópia local (localStorage) dos dados, usada só para exibir algo enquanto o
 * servidor não responde — sempre em modo somente leitura.
 *
 * O localStorage tem limite de ~5 MB e lança erro quando estoura. Antes esse
 * erro acontecia ANTES da gravação no Firestore e a edição nunca chegava ao
 * servidor, sem nenhum aviso. Aqui o erro é engolido: a cópia local é
 * descartável, o servidor é a fonte da verdade.
 */

const CHAVES = [
  'jc_people_shared',
  'jc_structure_shared',
  'jc_families_shared',
  // chaves antigas, só para limpeza
  'jc_people',
  'jc_structure',
];

function semFotos(valor: unknown): unknown {
  if (!Array.isArray(valor)) return valor;
  return valor.map((item) => {
    if (item && typeof item === 'object' && 'fotoUrl' in item) {
      const { fotoUrl, ...resto } = item as Record<string, unknown>;
      return resto;
    }
    return item;
  });
}

export function salvarCacheLocal(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(semFotos(valor)));
  } catch (err) {
    console.warn(`Cópia local "${chave}" não foi salva (espaço do navegador cheio?).`, err);
    try {
      localStorage.removeItem(chave); // não deixa uma cópia velha no lugar
    } catch {
      /* ignora */
    }
  }
}

export function lerCacheLocal(chave: string): any | null {
  try {
    const texto = localStorage.getItem(chave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

/** Remove todos os dados do app guardados neste aparelho (ex.: ao sair). */
export function limparCacheLocal(): void {
  try {
    const chaves = [...CHAVES];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^jc_(people|structure|families)_/.test(k)) chaves.push(k);
    }
    chaves.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignora */
  }
}
