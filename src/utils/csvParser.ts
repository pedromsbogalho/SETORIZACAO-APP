/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, SubtipoCadastro, StatusAtual, JornadaEtapa } from '../types';

export function formatExcelDate(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  
  // Check if it's an Excel serial date number
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = parseFloat(trimmed);
    // Excel date epoch is Dec 30, 1899 (due to Excel 1900 leap year bug)
    // Dec 30, 1899 is 25569 days before Jan 1, 1970
    const msPerDay = 24 * 60 * 60 * 1000;
    const date = new Date((serial - 25569) * msPerDay);
    
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    if (y >= 1900 && y <= 2100) {
      return `${y}-${m}-${d}`;
    }
  }
  
  // If it's formatted as DD/MM/YYYY, convert to YYYY-MM-DD
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      } else if (parts[0].length === 4) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }
  return trimmed;
}

export function parseCSV(text: string): Partial<Person>[] {
  if (!text) return [];
  
  // Remove BOM if present (essential for UTF-8 CSVs from Excel)
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detect delimiter based on the first line (header)
  const headerLine = lines[0];
  let delimiter = ',';
  let commaCount = 0;
  let semiCount = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (char === ',') commaCount++;
      if (char === ';') semiCount++;
    }
  }
  if (semiCount > commaCount) {
    delimiter = ';';
  }

  const parseLine = (line: string, delim: string): string[] => {
    const values: string[] = [];
    let currentVal = '';
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delim && !inQuotes) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
    return values;
  };

  // Parse headers with the detected delimiter
  const headers = parseLine(headerLine, delimiter).map(h => 
    h.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
     .replace(/[\s\xA0\u00A0]+/g, ' ')
     .trim()
     .toUpperCase()
  );
  
  const parsedPeople: Partial<Person>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseLine(line, delimiter);
    if (values.length < 2) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    // Helper to get row value using resilient name-matching
    // exactOnly=true: só aceita match exato (sem substring) - usar para campos críticos como ID Família
    const getRowValue = (keys: string[], exactOnly = false): string => {
      // Step 1: Exact matches first (sempre)
      for (const targetKey of keys) {
        const cleanTarget = targetKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '');
        const matchedKey = Object.keys(row).find(k => {
          const cleanK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '');
          return cleanK === cleanTarget;
        });
        if (matchedKey) return row[matchedKey];
      }

      // Step 2: Substring matches (apenas se não for exactOnly)
      if (!exactOnly) {
        for (const targetKey of keys) {
          const cleanTarget = targetKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '');
          const matchedKey = Object.keys(row).find(k => {
            const cleanK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '');
            return cleanK.includes(cleanTarget) || cleanTarget.includes(cleanK);
          });
          if (matchedKey) return row[matchedKey];
        }
      }
      return '';
    };

    // Mapping fields with robust extraction
    const code = getRowValue(['CODIGO CADASTRO', 'CODIGO_CADASTRO', 'CODIGO', 'CODE']) || String(1000000 + i);
    const nome = getRowValue(['NOME', 'NAME']) || '';
    if (!nome) continue; // Skip empty rows

    const subtipoRaw = getRowValue(['SUBTIPO CADASTRO', 'SUBTIPO_CADASTRO', 'SUBTIPO']).trim().toUpperCase();
    const tipoRaw = getRowValue(['TIPO CADASTRO', 'TIPO_CADASTRO', 'TIPO']).trim().toUpperCase();
    const dataOutorgaRaw = getRowValue(['DATA OUTORGA', 'OUTORGA', 'DATA_OUTORGA', 'OCORRENCIA']).trim();

    // Clean and parse outorga date
    let dataOutorga = '';
    if (dataOutorgaRaw) {
      if (dataOutorgaRaw.toUpperCase().includes('OUTORGA DE OHIKARI') || dataOutorgaRaw.toUpperCase().includes('OUTORGA')) {
        // Extract date from string like "26/07/2008 - OUTORGA DE OHIKARI"
        const dateMatch = dataOutorgaRaw.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (dateMatch) {
          dataOutorga = formatExcelDate(dateMatch[1]);
        }
      } else {
        dataOutorga = formatExcelDate(dataOutorgaRaw);
      }
    }

    // Classify Subtipo (MEMBRO vs FREQUENTADOR) precisely as described:
    // - Subtipo Cadastro containing MEMBRO or priest titles (MIN, PROF, SACERDOTE) is MEMBRO
    // - Tipo Cadastro containing OHIKARI or KOMYO is MEMBRO
    // - If Tipo Cadastro contains SHOKO, FREQUENTE, PRIMEIRO CONTATO, it is FREQUENTADOR
    let subtipo: SubtipoCadastro = 'FREQUENTADOR';
    if (
      subtipoRaw === 'MEMBRO' ||
      subtipoRaw.includes('MEMBRO') ||
      subtipoRaw.includes('MIN') ||
      subtipoRaw.includes('PROF') ||
      subtipoRaw.includes('SACERDOTE') ||
      tipoRaw.includes('OHIKARI') ||
      tipoRaw.includes('KOMYO')
    ) {
      subtipo = 'MEMBRO';
    }

    // Tidy up Tipo Cadastro label
    let tipo = getRowValue(['TIPO CADASTRO', 'TIPO_CADASTRO', 'TIPO']).trim();
    if (tipo.toUpperCase() === 'OHIKARI') tipo = 'Ohikari';
    else if (tipo.toUpperCase() === 'FREQUENTE') tipo = 'Frequente';
    else if (tipo.toUpperCase() === 'PRIMEIRO CONTATO') tipo = 'Primeiro Contato';
    else if (tipo.toUpperCase() === 'SHOKO') tipo = 'Shoko';
    else if (tipo.toUpperCase() === 'KOMYO') tipo = 'Komyo';
    else if (!tipo) tipo = subtipo === 'MEMBRO' ? 'Ohikari' : 'Frequente';

    const status = (getRowValue(['STATUS ATUAL', 'STATUS_ATUAL', 'STATUS']) || 'ATIVO').toUpperCase() as StatusAtual;
    const idade = parseInt(getRowValue(['IDADE', 'AGE']) || '0') || 40;
    const nascimento = formatExcelDate(getRowValue(['NASCIMENTO', 'BIRTH', 'DATA NASCIMENTO']));
    
    // Celular: prioriza "Celular Principal SMS" (nome exato da coluna da planilha oficial)
    const celular = getRowValue(['CELULAR PRINCIPAL SMS', 'CELULARPRINCIPALMS', 'CELULAR PRINCIPAL', 'CELULAR', 'TELEFONE', 'MOBILE', 'PHONE']) || '';
    const contato = getRowValue(['TELEFONE CONTATO', 'CONTATO', 'CONTACT']) || celular || '';
    const email = getRowValue(['EMAIL', 'E-MAIL']) || '';
    
    const ultimoAcesso = getRowValue(['ULTIMO ACESSO APP', 'ACESSO APP', 'LAST ACCESS']) || '';
    const endGoogle = getRowValue(['END GOOGLE', 'GOOGLE ADDRESS']).trim();
    const endCompleto = (getRowValue(['END COMPLETO', 'LOGRADOURO', 'ENDERECO', 'ADDRESS']) || endGoogle).trim();
    
    const am = getRowValue(['AM', 'ASSISTENTE', 'MINISTRO']).trim();
    const setor2 = getRowValue(['SETOR2', 'SETOR', 'SECTOR']).trim();
    const af2 = getRowValue(['AF2', 'AF']).trim();
    
    const bairro = (getRowValue(['BAIRRO AJUSTADO', 'BAIRRO_AJUSTADO']) || getRowValue(['BAIRRO', 'NEIGHBORHOOD'])).trim();
    const tempoMembro = getRowValue(['TEMPO MEMBRO', 'TEMPO_MEMBRO', 'MEMBERSHIP_TIME']).trim();
    const anoOutorga = getRowValue(['ANO OUTORGA', 'ANO_OUTORGA', 'YEAR_OUTORGA']).trim();

    // ID Família: busca estrita — só aceita valor no formato FAM-XXXXX para evitar
    // bater em colunas como "Assistente de Família" que geram lixo (ex: "0,SECRETARIA,OUTROS...")
    const idFamiliaRaw = getRowValue(['ID FAMILIA', 'ID_FAMILIA', 'IDFAMILIA'], true).trim();
    const idFamilia = (idFamiliaRaw && /^FAM-\d+$/i.test(idFamiliaRaw))
      ? idFamiliaRaw.toUpperCase()
      : `FAM-${code}`;

    // Deduce spiritual journey stage from values
    let jornada: JornadaEtapa = 'Primeiro atendimento';
    if (subtipo === 'MEMBRO') {
      jornada = 'Torna-se membro ativo';
    } else if (dataOutorga) {
      jornada = 'Recebe Ohikari';
    } else if (tipo.toLowerCase().includes('frequente')) {
      jornada = 'Recebe Johrei';
    }

    parsedPeople.push({
      id: code,
      nome: nome.toUpperCase(),
      tipoCadastro: tipo,
      subtipoCadastro: subtipo as SubtipoCadastro,
      statusAtual: status,
      nascimento,
      idade,
      celularPrincipal: celular,
      telefoneContato: contato,
      email,
      ultimoAcessoApp: ultimoAcesso,
      endCompleto: endCompleto,
      am: am.toUpperCase(),
      setor2: setor2.toUpperCase(),
      af2: af2.toUpperCase(),
      endGoogle,
      bairroAjustado: bairro,
      dataOutorga,
      tempoMembro,
      anoOutorga,
      idFamilia,
      jornadaEtapa: jornada,
      jornadaDatas: {
        'Primeiro atendimento': '2026-01-10',
        'Recebe Johrei': '2026-01-20',
        ...(subtipo === 'MEMBRO' && { 'Recebe Ohikari': dataOutorga || '2025-12-01', 'Torna-se membro ativo': '2026-01-01' })
      },
      cursoIniciacao: {
        data: subtipo === 'MEMBRO' ? '2025-10-10' : '',
        instrutor: am || 'PROF DANI',
        presenca: subtipo === 'MEMBRO',
        concluido: subtipo === 'MEMBRO'
      },
      cursoPosOutorga: {
        aulas: {
          1: subtipo === 'MEMBRO' ? 'Concluido' : 'Não iniciou',
          2: subtipo === 'MEMBRO' ? 'Concluido' : 'Não iniciou',
          3: subtipo === 'MEMBRO' ? 'Concluido' : 'Não iniciou',
          4: subtipo === 'MEMBRO' ? 'Concluido' : 'Não iniciou',
          5: subtipo === 'MEMBRO' ? 'Concluido' : 'Não iniciou'
        }
      },
      gruposWhats: {
        grupoSetor: subtipo === 'MEMBRO',
        grupoGeral: subtipo === 'MEMBRO',
        grupoLar: subtipo === 'MEMBRO'
      }
    });
  }

  return parsedPeople;
}

export function generateSampleCSVString(): string {
  return `Código Cadastro;Nome;Tipo Cadastro;Subtipo Cadastro;Status atual;Nascimento;Idade;Celular Principal SMS;Telefone Contato;Email;Último Acesso App;End completo;AM;SETOR2;AF2;End Google;Bairro Ajustado;Data Outorga;Tempo Membro;Ano Outorga;ID Familia
1313278;YOKO ONISHI;Ohikari;MEMBRO;ATIVO;17976;77;12997367868;12997367868;yokosam7@gmail.com;2026-06-02 05:08:58;AVENIDA PRESTES MAIA, 21;PROF DANI;CENTRO-NORTE;YOKO;AVENIDA PRESTES MAIA,21 - CENTRO - Caraguatatuba;Centro;39655;17 anos e 10 meses;2008;FAM-444
1313279;PEDRO DE SOUZA ALMEIDA;Frequente;FREQUENTADOR;ATIVO;33100;35;12997123456;12997123456;pedro.almeida@gmail.com;2026-06-12 14:02:11;RUA MARECHAL DEODORO, 45;PROF DANI;CENTRO-NORTE;PAULO;RUA MARECHAL DEODORO, 45 - CENTRO - Caraguatatuba;Centro;;;2026;FAM-444
1313280;MARIA APARECIDA REIS;Ohikari;MEMBRO;ATIVO;22727;64;12981112233;12981112233;maria.cida@yahoo.com.br;2026-06-21 08:30:11;AVENIDA IPANEMA, 500;MINISTRO ROBERTO;SUL;CARLOS;AVENIDA IPANEMA, 500 - INDAIÁ - Caraguatatuba;Indaiá;43230;8 anos e 1 mês;2018;FAM-202
1313281;JOÃO SILVA GOMES;Primeiro Contato;FREQUENTADOR;ATIVO;37200;24;12993049182;12993049182;joao.silva@outlook.com;2026-06-10 17:15:00;RUA DAS FLORES, 202;MINISTRA CLARA;LESTE;MARTA;RUA DAS FLORES, 202 - JARDIM AMÉRICA - Caraguatatuba;Jardim América;;;2026;FAM-303`;
}

