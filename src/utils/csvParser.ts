/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, SubtipoCadastro, StatusAtual, JornadaEtapa } from '../types';

export function parseCSV(text: string): Partial<Person>[] {
  if (!text) return [];
  
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(/[;,]/).map(h => h.replace(/^["']|["']$/g, '').trim().toUpperCase());
  
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

    // Mapping fields
    const code = row['CÓDIGO CADASTRO'] || row['CODIGO CADASTRO'] || row['CODIGO'] || String(1000000 + i);
    const nome = row['NOME'] || '';
    if (!nome) continue; // Skip empty rows

    const subtipo = (row['SUBTIPO CADASTRO'] || '').toUpperCase() === 'MEMBRO' ? 'MEMBRO' : 'FREQUENTADOR';
    const tipo = row['TIPO CADASTRO'] || (subtipo === 'MEMBRO' ? 'Ohikari' : 'Frequente');
    const status = (row['STATUS ATUAL'] || 'ATIVO').toUpperCase() as StatusAtual;
    const idade = parseInt(row['IDADE'] || '0') || 40;
    const nascimento = row['NASCIMENTO'] || '1980-01-01';
    const celular = row['CELULAR PRINCIPAL SMS'] || row['CELULAR'] || row['TELEFONE'] || '';
    const contato = row['TELEFONE CONTATO'] || celular || '';
    const email = row['EMAIL'] || '';
    const ultimoAcesso = row['ÚLTIMO ACESSO APP'] || row['ULTIMO ACESSO APP'] || '';
    const endCompleto = row['END COMPLETO'] || row['LOGRADOURO'] || '';
    const am = row['AM'] || '';
    const setor2 = row['SETOR2'] || row['SETOR'] || '';
    const af2 = row['AF2'] || row['AF'] || '';
    const endGoogle = row['END GOOGLE'] || '';
    const bairro = row['BAIRRO AJUSTADO'] || row['BAIRRO'] || '';
    const dataOutorga = row['DATA OUTORGA'] || '';
    const tempoMembro = row['TEMPO MEMBRO'] || '';
    const anoOutorga = row['ANO OUTORGA'] || '';
    const idFamilia = row['ID FAMILIA'] || row['ID_FAMILIA'] || `FAM-${Math.floor(Math.random() * 900) + 100}`;

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
