/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Foto da pessoa SEM Firebase Storage (que exige o plano Blaze).
 *
 * A imagem é reduzida e comprimida no navegador (canvas → JPEG) e gravada como
 * data URL num documento próprio do Firestore: `fotos_pessoas/{personId}`.
 * Fica fora do documento `people` de propósito: `people` é guardado inteiro no
 * localStorage (limite ~5 MB) e enviado para a IA na edição em massa — fotos lá
 * dentro estourariam o cache e encareceriam as chamadas.
 *
 * Limite do Firestore: 1 MiB por documento. Miramos ~150 KB por foto.
 */

export const FOTO_LADO_MAX = 320; // px no maior lado
export const FOTO_BYTES_ALVO = 150_000; // tamanho máximo da data URL (caracteres)

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem. Use JPG, PNG ou WEBP.'));
    };
    img.src = url;
  });
}

/** Recorta o centro em quadrado, reduz e comprime até caber em FOTO_BYTES_ALVO. */
export async function comprimirFotoPessoa(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('O arquivo escolhido não é uma imagem.');
  }
  const img = await carregarImagem(arquivo);

  const ladoOrigem = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - ladoOrigem) / 2;
  const sy = (img.naturalHeight - ladoOrigem) / 2;

  let lado = Math.min(FOTO_LADO_MAX, ladoOrigem);
  let qualidade = 0.85;

  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const canvas = document.createElement('canvas');
    canvas.width = lado;
    canvas.height = lado;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não permite processar a imagem.');
    ctx.fillStyle = '#ffffff'; // PNG com transparência não fica preto no JPEG
    ctx.fillRect(0, 0, lado, lado);
    ctx.drawImage(img, sx, sy, ladoOrigem, ladoOrigem, 0, 0, lado, lado);

    const dataUrl = canvas.toDataURL('image/jpeg', qualidade);
    if (dataUrl.length <= FOTO_BYTES_ALVO) return dataUrl;

    if (qualidade > 0.55) qualidade -= 0.1;
    else lado = Math.round(lado * 0.8);
  }
  throw new Error('Não foi possível reduzir a imagem o suficiente. Tente outra foto.');
}
