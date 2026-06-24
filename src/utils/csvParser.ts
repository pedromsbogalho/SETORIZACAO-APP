/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, SubtipoCadastro, StatusAtual, JornadaEtapa } from '../types';

export function parseCSV(text: string): Partial<Person>[] {
  if (!text) return [];
  
  // Remove BOM if present (essential for UTF-8 CSVs from Excel)
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(/[;,]/).map(h => 
    h.replace(/^["']|["']$/g, '')
     .replace(/[\s\xA0\u00A0]+/g, ' ')
     .trim()
     .toUpperCase()
  );
  
  const parsedPeople: Partial<Person>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quote-escaped separators or simple split
    // For a robust simple parser:
    const values: string[] = [];
    let currentVal = '';
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

    if (values.length < 2) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    // Helper to get row value using resilient name-matching
    const getRowValue = (keys: string[]): string => {
      const matchedKey = Object.keys(row).find(k => {
        // Normalize accents (e.g. Ó -> O) and remove non-alphanumeric characters
        const cleanK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '');
        return keys.some(targetKey => {
          const cleanTarget = targetKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '');
          return cleanK === cleanTarget || cleanK.includes(cleanTarget) || cleanTarget.includes(cleanK);
        });
      });
      return matchedKey ? row[matchedKey] : '';
    };

    // Mapping fields with robust extraction
    const code = getRowValue(['CÓDIGO CADASTRO', 'CODIGO CADASTRO', 'CODIGO', 'CODE']) || String(1000000 + i);
    const nome = getRowValue(['NOME', 'NAME']) || '';
    if (!nome) continue; // Skip empty rows

    const subtipoRaw = getRowValue(['SUBTIPO CADASTRO', 'SUBTIPO_CADASTRO', 'SUBTIPO']).trim().toUpperCase();
    const tipoRaw = getRowValue(['TIPO CADASTRO', 'TIPO_CADASTRO', 'TIPO']).trim().toUpperCase();
    const dataOutorga = getRowValue(['DATA OUTORGA', 'OUTORGA', 'DATA_OUTORGA']).trim();

    let subtipo: SubtipoCadastro = 'FREQUENTADOR';
    if (
      subtipoRaw === 'MEMBRO' ||
      subtipoRaw.includes('MEMBRO') ||
      tipoRaw === 'OHIKARI' ||
      tipoRaw.includes('OHIKARI') ||
      tipoRaw === 'MEMBRO' ||
      tipoRaw.includes('MEMBRO') ||
      tipoRaw.includes('OUTORGA') ||
      tipoRaw.includes('OUTORGADO') ||
      (dataOutorga && dataOutorga !== '-' && dataOutorga !== 'N/A' && dataOutorga !== 'SEM DATA' && dataOutorga.length > 2)
    ) {
      subtipo = 'MEMBRO';
    }
    
    const tipo = getRowValue(['TIPO CADASTRO', 'TIPO_CADASTRO', 'TIPO']).trim() || (subtipo === 'MEMBRO' ? 'Ohikari' : 'Frequente');
    const status = (getRowValue(['STATUS ATUAL', 'STATUS_ATUAL', 'STATUS']) || 'ATIVO').toUpperCase() as StatusAtual;
    const idade = parseInt(getRowValue(['IDADE', 'AGE']) || '0') || 40;
    const nascimento = getRowValue(['NASCIMENTO', 'BIRTH', 'DATA NASCIMENTO']) || '1980-01-01';
    
    const celular = getRowValue(['CELULAR PRINCIPAL SMS', 'CELULAR', 'TELEFONE', 'MOBILE', 'PHONE']) || '';
    const contato = getRowValue(['TELEFONE CONTATO', 'CONTATO', 'CONTACT']) || celular || '';
    const email = getRowValue(['EMAIL', 'E-MAIL']) || '';
    
    const ultimoAcesso = getRowValue(['ÚLTIMO ACESSO APP', 'ULTIMO ACESSO APP', 'ACESSO APP', 'LAST ACCESS']) || '';
    const endCompleto = getRowValue(['END COMPLETO', 'LOGRADOURO', 'ENDERECO', 'ADDRESS']) || '';
    const am = getRowValue(['AM', 'ASSISTENTE', 'MINISTRO']) || '';
    const setor2 = getRowValue(['SETOR2', 'SETOR', 'SECTOR']) || '';
    const af2 = getRowValue(['AF2', 'AF']) || '';
    const endGoogle = getRowValue(['END GOOGLE', 'GOOGLE ADDRESS']) || '';
    const bairro = getRowValue(['BAIRRO AJUSTADO', 'BAIRRO', 'NEIGHBORHOOD']) || '';
    const tempoMembro = getRowValue(['TEMPO MEMBRO', 'TEMPO_MEMBRO', 'MEMBERSHIP_TIME']) || '';
    const anoOutorga = getRowValue(['ANO OUTORGA', 'ANO_OUTORGA', 'YEAR_OUTORGA']) || '';
    const idFamilia = getRowValue(['ID FAMILIA', 'ID_FAMILIA', 'FAMILIA', 'FAMILY']) || `FAM-${Math.floor(Math.random() * 900) + 100}`;

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
1313278;YOKO ONISHI;Ohikari;MEMBRO;ATIVO;1949-05-12;77;12997367868;12997367868;yokosam7@gmail.com;2026-06-02 05:08:58;AVENIDA PRESTES MAIA, 21;PROF DANI;CENTRO-NORTE;YOKO;AVENIDA PRESTES MAIA,21 - CENTRO - Caraguatatuba;Centro;2008-11-20;17 anos e 10 meses;2008;FAM-444
1313279;PEDRO DE SOUZA ALMEIDA;Frequente;FREQUENTADOR;ATIVO;1990-08-14;35;12997123456;12997123456;pedro.almeida@gmail.com;2026-06-12 14:02:11;RUA MARECHAL DEODORO, 45;PROF DANI;CENTRO-NORTE;PAULO;RUA MARECHAL DEODORO, 45 - CENTRO - Caraguatatuba;Centro;;;2026;FAM-444
1313280;MARIA APARECIDA REIS;Ohikari;MEMBRO;ATIVO;1962-03-24;64;12981112233;12981112233;maria.cida@yahoo.com.br;2026-06-21 08:30:11;AVENIDA IPANEMA, 500;MINISTRO ROBERTO;SUL;CARLOS;AVENIDA IPANEMA, 500 - INDAIÁ - Caraguatatuba;Indaiá;2018-05-10;8 anos e 1 mês;2018;FAM-202
1313281;JOÃO SILVA GOMES;Primeiro Contato;FREQUENTADOR;ATIVO;2001-11-05;24;12993049182;12993049182;joao.silva@outlook.com;2026-06-10 17:15:00;RUA DAS FLORES, 202;MINISTRA CLARA;LESTE;MARTA;RUA DAS FLORES, 202 - JARDIM AMÉRICA - Caraguatatuba;Jardim América;;;2026;FAM-303`;
}
