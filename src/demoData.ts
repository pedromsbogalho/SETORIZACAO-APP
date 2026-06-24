/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Person, Family, Visit } from './types';

export const INITIAL_PEOPLE: Person[] = [
  {
    id: '1313278',
    nome: 'YOKO ONISHI',
    tipoCadastro: 'Ohikari',
    subtipoCadastro: 'MEMBRO',
    statusAtual: 'ATIVO',
    nascimento: '1949-05-12',
    idade: 77,
    celularPrincipal: '12997367868',
    telefoneContato: '12997367868',
    email: 'yokosam7@gmail.com',
    ultimoAcessoApp: '2026-06-02 05:08:58',
    endCompleto: 'AVENIDA PRESTES MAIA, 21',
    am: 'PROF DANI',
    setor2: 'CENTRO-NORTE',
    af2: 'YOKO',
    endGoogle: 'AVENIDA PRESTES MAIA, 21 - CENTRO - Caraguatatuba',
    bairroAjustado: 'Centro',
    dataOutorga: '2008-11-20',
    tempoMembro: '17 anos e 10 meses',
    anoOutorga: 2008,
    idFamilia: 'FAM-444',
    jornadaEtapa: 'Torna-se membro ativo',
    jornadaDatas: {
      'Primeiro atendimento': '2008-01-10',
      'Recebe Johrei': '2008-01-15',
      'Curso de Iniciação': '2008-03-05',
      'Ingressa': '2008-04-10',
      'Recebe Ohikari': '2008-11-20',
      'Curso Pós-Outorga': '2008-12-15',
      'Conclui Pós-Outorga': '2008-12-20',
      'Torna-se membro ativo': '2008-12-21'
    },
    cursoIniciacao: {
      data: '2008-03-05',
      instrutor: 'Mário Tanaka',
      presenca: true,
      concluido: true
    },
    cursoPosOutorga: {
      aulas: {
        1: 'Concluido',
        2: 'Concluido',
        3: 'Concluido',
        4: 'Concluido',
        5: 'Concluido'
      }
    },
    gruposWhats: {
      grupoSetor: true,
      grupoGeral: true,
      grupoLar: true
    }
  },
  {
    id: '1324567',
    nome: 'MARIA DOS SANTOS SILVA',
    tipoCadastro: 'Ohikari',
    subtipoCadastro: 'MEMBRO',
    statusAtual: 'ATIVO',
    nascimento: '1975-08-22',
    idade: 50,
    celularPrincipal: '12988112233',
    telefoneContato: '12988112233',
    email: 'maria.santos@gmail.com',
    ultimoAcessoApp: '2026-06-20 14:30:11',
    endCompleto: 'RUA DAS FLORES, 150',
    am: 'PROF DANI',
    setor2: 'CENTRO-NORTE',
    af2: 'PAULO',
    endGoogle: 'RUA DAS FLORES, 150 - JARDIM AMÉRICA - Caraguatatuba',
    bairroAjustado: 'Jardim América',
    dataOutorga: '2015-05-15',
    tempoMembro: '11 anos e 1 mês',
    anoOutorga: 2015,
    idFamilia: 'FAM-101',
    jornadaEtapa: 'Torna-se membro ativo',
    jornadaDatas: {
      'Primeiro atendimento': '2015-01-10',
      'Recebe Johrei': '2015-01-12',
      'Curso de Iniciação': '2015-02-18',
      'Ingressa': '2015-03-01',
      'Recebe Ohikari': '2015-05-15',
      'Curso Pós-Outorga': '2015-06-10',
      'Conclui Pós-Outorga': '2015-06-15',
      'Torna-se membro ativo': '2015-06-20'
    },
    cursoIniciacao: {
      data: '2015-02-18',
      instrutor: 'PROF DANI',
      presenca: true,
      concluido: true
    },
    cursoPosOutorga: {
      aulas: {
        1: 'Concluido',
        2: 'Concluido',
        3: 'Concluido',
        4: 'Concluido',
        5: 'Concluido'
      }
    },
    gruposWhats: {
      grupoSetor: true,
      grupoGeral: true,
      grupoLar: true
    }
  },
  {
    id: '2405981',
    nome: 'TIAGO SILVA',
    tipoCadastro: 'Frequente',
    subtipoCadastro: 'FREQUENTADOR',
    statusAtual: 'ATIVO',
    nascimento: '1992-03-14',
    idade: 34,
    celularPrincipal: '12992110432',
    telefoneContato: '12992110432',
    email: 'tiaguinho.silva@hotmail.com',
    ultimoAcessoApp: '2026-06-18 19:15:00',
    endCompleto: 'RUA DAS FLORES, 150',
    am: 'PROF DANI',
    setor2: 'CENTRO-NORTE',
    af2: 'PAULO',
    endGoogle: 'RUA DAS FLORES, 150 - JARDIM AMÉRICA - Caraguatatuba',
    bairroAjustado: 'Jardim América',
    dataOutorga: '',
    tempoMembro: '',
    anoOutorga: '',
    idFamilia: 'FAM-101',
    jornadaEtapa: 'Curso de Iniciação',
    jornadaDatas: {
      'Primeiro atendimento': '2026-03-02',
      'Recebe Johrei': '2026-03-05',
      'Curso de Iniciação': '2026-05-20'
    },
    cursoIniciacao: {
      data: '2026-05-20',
      instrutor: 'PROF DANI',
      presenca: true,
      concluido: true
    },
    cursoPosOutorga: {
      aulas: {
        1: 'Não iniciou',
        2: 'Não iniciou',
        3: 'Não iniciou',
        4: 'Não iniciou',
        5: 'Não iniciou'
      }
    },
    gruposWhats: {
      grupoSetor: true,
      grupoGeral: false, // PENDÊNCIA: Ingressou/Curso feito mas não entrou no grupo geral
      grupoLar: false
    }
  },
  {
    id: '3504823',
    nome: 'CARLOS HENRIQUE DE SOUZA',
    tipoCadastro: 'Ohikari',
    subtipoCadastro: 'MEMBRO',
    statusAtual: 'ATIVO',
    nascimento: '1981-11-02',
    idade: 44,
    celularPrincipal: '12984551122',
    telefoneContato: '12984551122',
    email: 'carlos.souza@gmail.com',
    ultimoAcessoApp: '2026-05-29 11:24:00',
    endCompleto: 'AVENIDA MINAS GERAIS, 400',
    am: 'MINISTRO ROBERTO',
    setor2: 'SUL',
    af2: 'CARLOS',
    endGoogle: 'AVENIDA MINAS GERAIS, 400 - VILA NOVA - Caraguatatuba',
    bairroAjustado: 'Vila Nova',
    dataOutorga: '2023-08-10',
    tempoMembro: '2 anos e 10 meses',
    anoOutorga: 2023,
    idFamilia: 'FAM-202',
    jornadaEtapa: 'Recebe Ohikari', // PENDÊNCIA: Recebeu Ohikari mas não concluiu Pós-Outorga
    jornadaDatas: {
      'Primeiro atendimento': '2023-01-10',
      'Recebe Johrei': '2023-01-12',
      'Curso de Iniciação': '2023-03-14',
      'Ingressa': '2023-04-01',
      'Recebe Ohikari': '2023-08-10'
    },
    cursoIniciacao: {
      data: '2023-03-14',
      instrutor: 'MINISTRO ROBERTO',
      presenca: true,
      concluido: true
    },
    cursoPosOutorga: {
      aulas: {
        1: 'Concluido',
        2: 'Em andamento', // PENDÊNCIA: Parou no meio do curso pós-outorga
        3: 'Não iniciou',
        4: 'Não iniciou',
        5: 'Não iniciou'
      }
    },
    gruposWhats: {
      grupoSetor: true,
      grupoGeral: true,
      grupoLar: true
    }
  },
  {
    id: '4928172',
    nome: 'ANA JÚLIA OLIVEIRA',
    tipoCadastro: 'Primeiro Contato',
    subtipoCadastro: 'FREQUENTADOR',
    statusAtual: 'ATIVO',
    nascimento: '2002-10-15',
    idade: 23,
    celularPrincipal: '12991223344',
    telefoneContato: '12991223344',
    email: 'anaju.oliveira@gmail.com',
    ultimoAcessoApp: '2026-04-01 10:00:00', // PENDÊNCIA: Frequentador sem visita/acompanhamento há mais de 30 dias
    endCompleto: 'AVENIDA MINAS GERAIS, 405',
    am: 'MINISTRO ROBERTO',
    setor2: 'SUL',
    af2: 'CARLOS',
    endGoogle: 'AVENIDA MINAS GERAIS, 405 - VILA NOVA - Caraguatatuba',
    bairroAjustado: 'Vila Nova',
    dataOutorga: '',
    tempoMembro: '',
    anoOutorga: '',
    idFamilia: 'FAM-202',
    jornadaEtapa: 'Recebe Johrei',
    jornadaDatas: {
      'Primeiro atendimento': '2026-04-01',
      'Recebe Johrei': '2026-04-05'
    },
    cursoIniciacao: {
      data: '',
      instrutor: '',
      presenca: false,
      concluido: false
    },
    cursoPosOutorga: {
      aulas: {
        1: 'Não iniciou',
        2: 'Não iniciou',
        3: 'Não iniciou',
        4: 'Não iniciou',
        5: 'Não iniciou'
      }
    },
    gruposWhats: {
      grupoSetor: false,
      grupoGeral: false,
      grupoLar: false
    }
  },
  {
    id: '5019283',
    nome: 'PEDRO GOMES NEVES',
    tipoCadastro: 'Ohikari',
    subtipoCadastro: 'MEMBRO',
    statusAtual: 'ATIVO',
    nascimento: '1968-07-30',
    idade: 57,
    celularPrincipal: '12981998877',
    telefoneContato: '12981998877',
    email: 'pedro.gomes@gmail.com',
    ultimoAcessoApp: '2026-06-22 09:45:12',
    endCompleto: 'RUA PERU, 55',
    am: 'MINISTRA CLARA',
    setor2: 'LESTE',
    af2: 'MARTA',
    endGoogle: 'RUA PERU, 55 - CENTRO-NORTE - Caraguatatuba',
    bairroAjustado: 'Centro',
    dataOutorga: '2010-06-18',
    tempoMembro: '16 anos',
    anoOutorga: 2010,
    idFamilia: 'FAM-303',
    jornadaEtapa: 'Torna-se membro ativo',
    jornadaDatas: {
      'Primeiro atendimento': '2010-01-05',
      'Recebe Johrei': '2010-01-10',
      'Curso de Iniciação': '2010-02-20',
      'Ingressa': '2010-03-15',
      'Recebe Ohikari': '2010-06-18',
      'Curso Pós-Outorga': '2010-07-15',
      'Conclui Pós-Outorga': '2010-07-20',
      'Torna-se membro ativo': '2010-07-25'
    },
    cursoIniciacao: {
      data: '2010-02-20',
      instrutor: 'Marta Dias',
      presenca: true,
      concluido: true
    },
    cursoPosOutorga: {
      aulas: {
        1: 'Concluido',
        2: 'Concluido',
        3: 'Concluido',
        4: 'Concluido',
        5: 'Concluido'
      }
    },
    gruposWhats: {
      grupoSetor: true,
      grupoGeral: true,
      grupoLar: true
    }
  },
  {
    id: '6019284',
    nome: 'LUCIA REIS',
    tipoCadastro: 'Frequente',
    subtipoCadastro: 'FREQUENTADOR',
    statusAtual: 'ATIVO',
    nascimento: '1985-12-04',
    idade: 40,
    celularPrincipal: '12982445566',
    telefoneContato: '12982445566',
    email: 'lucia.reis@gmail.com',
    ultimoAcessoApp: '2026-06-15 18:00:00',
    endCompleto: 'RUA PERU, 55',
    am: 'MINISTRA CLARA',
    setor2: 'LESTE',
    af2: 'MARTA',
    endGoogle: 'RUA PERU, 55 - CENTRO-NORTE - Caraguatatuba',
    bairroAjustado: 'Centro',
    dataOutorga: '',
    tempoMembro: '',
    anoOutorga: '',
    idFamilia: 'FAM-303',
    jornadaEtapa: 'Recebe Johrei',
    jornadaDatas: {
      'Primeiro atendimento': '2026-05-10',
      'Recebe Johrei': '2026-05-15'
    },
    cursoIniciacao: {
      data: '',
      instrutor: '',
      presenca: false,
      concluido: false
    },
    cursoPosOutorga: {
      aulas: {
        1: 'Não iniciou',
        2: 'Não iniciou',
        3: 'Não iniciou',
        4: 'Não iniciou',
        5: 'Não iniciou'
      }
    },
    gruposWhats: {
      grupoSetor: true,
      grupoGeral: false,
      grupoLar: false
    }
  },
  {
    id: '7109283',
    nome: 'MATEUS ALMEIDA JÚNIOR',
    tipoCadastro: 'Primeiro Contato',
    subtipoCadastro: 'FREQUENTADOR',
    statusAtual: 'ATIVO',
    nascimento: '1998-04-18',
    idade: 28,
    celularPrincipal: '', // PENDÊNCIA: Pessoa cadastrada sem telefone
    telefoneContato: '',
    email: 'mateus.almeida@hotmail.com',
    ultimoAcessoApp: '2026-06-23 11:00:00',
    endCompleto: 'AVENIDA IPANEMA, 1022',
    am: '', // PENDÊNCIA: Pessoa cadastrada sem setor / sem AM
    setor2: '',
    af2: '', // PENDÊNCIA: Pessoa sem Assistente de Família
    endGoogle: 'AVENIDA IPANEMA, 1022 - INDAIÁ - Caraguatatuba',
    bairroAjustado: 'Indaiá',
    dataOutorga: '',
    tempoMembro: '',
    anoOutorga: '',
    idFamilia: 'FAM-305',
    jornadaEtapa: 'Primeiro atendimento',
    jornadaDatas: {
      'Primeiro atendimento': '2026-06-20'
    },
    cursoIniciacao: {
      data: '',
      instrutor: '',
      presenca: false,
      concluido: false
    },
    cursoPosOutorga: {
      aulas: {
        1: 'Não iniciou',
        2: 'Não iniciou',
        3: 'Não iniciou',
        4: 'Não iniciou',
        5: 'Não iniciou'
      }
    },
    gruposWhats: {
      grupoSetor: false,
      grupoGeral: false,
      grupoLar: false
    }
  }
];

export const INITIAL_FAMILIES: Family[] = [
  {
    id: 'FAM-444',
    nome: 'Família Onishi',
    endereco: 'AVENIDA PRESTES MAIA, 21 - Centro - Caraguatatuba',
    afResponsavel: 'YOKO',
    historico: 'Família tradicional de membros pioneiros na região. Dedicação intensa na difusão e assistência no setor Centro-Norte.',
    observacoes: 'Participa ativamente das reuniões de lar e do recebimento mensal de Johrei no lar.',
    contatoTelefone: '12997367868'
  },
  {
    id: 'FAM-101',
    nome: 'Família Silva',
    endereco: 'RUA DAS FLORES, 150 - Jardim América - Caraguatatuba',
    afResponsavel: 'PAULO',
    historico: 'Dona Maria é membro outorgada e o filho Tiago iniciou o acompanhamento recentemente, já participando do curso de iniciação.',
    observacoes: 'Necessita agendar visita de lar para consolidação espiritual do Tiago.',
    contatoTelefone: '12988112233'
  },
  {
    id: 'FAM-202',
    nome: 'Família Souza & Oliveira',
    endereco: 'AVENIDA MINAS GERAIS, 400 - Vila Nova - Caraguatatuba',
    afResponsavel: 'CARLOS',
    historico: 'Carlos Henrique é membro ativo outorgado em 2023. Ana Júlia frequenta a unidade esporadicamente.',
    observacoes: 'Sem assistência regular de visitas há mais de 45 dias.', // PENDÊNCIA: Família sem assistência há muito tempo
    contatoTelefone: '12984551122'
  },
  {
    id: 'FAM-303',
    nome: 'Família Gomes Reis',
    endereco: 'RUA PERU, 55 - Centro - Caraguatatuba',
    afResponsavel: 'MARTA',
    historico: 'Pedro é membro outorgado desde 2010. Lúcia é frequentadora ativa desde o mês passado, recebendo Johrei constantemente.',
    observacoes: 'Marta realiza visitas quinzenais e relata ótimo acolhimento.',
    contatoTelefone: '12981998877'
  },
  {
    id: 'FAM-305',
    nome: 'Família Almeida',
    endereco: 'AVENIDA IPANEMA, 1022 - Indaiá - Caraguatatuba',
    afResponsavel: 'MARTA',
    historico: 'Mateus foi cadastrado após receber Johrei em um evento público externo de difusão. Ainda sem vinculação formal de setor.',
    observacoes: 'Precisa vincular urgente a um Assistente de Família residente no bairro Indaiá.',
    contatoTelefone: ''
  }
];

export const INITIAL_VISITS: Visit[] = [
  {
    id: 'v-1',
    data: '2026-06-10',
    idFamilia: 'FAM-444',
    quemVisitou: 'PROF DANI',
    quemRecebeu: 'YOKO ONISHI',
    objetivo: 'Reunião de Lar e Assistência Mensal',
    johreiMinistrado: true,
    quantasPessoas: 3,
    observacoes: 'Visita muito harmoniosa. Foram ministrados Johrei em todos e lidos Ensinamentos do dia sobre a Grande Purificação.',
    fotoUrl: ''
  },
  {
    id: 'v-2',
    data: '2026-06-15',
    idFamilia: 'FAM-101',
    quemVisitou: 'PAULO',
    quemRecebeu: 'MARIA DOS SANTOS & TIAGO SILVA',
    objetivo: 'Acompanhamento do Curso de Iniciação do Tiago',
    johreiMinistrado: true,
    quantasPessoas: 2,
    observacoes: 'Tiago está entusiasmado com as aulas. Esclarecemos dúvidas sobre o Altar e a Outorga do Ohikari.',
    fotoUrl: ''
  },
  {
    id: 'v-3',
    data: '2026-05-02', // Mais de 30 dias atrás
    idFamilia: 'FAM-202',
    quemVisitou: 'CARLOS',
    quemRecebeu: 'CARLOS HENRIQUE',
    objetivo: 'Assistência básica',
    johreiMinistrado: true,
    quantasPessoas: 1,
    observacoes: 'Carlos estava com pressa mas recebeu Johrei. Ana Júlia não estava presente.',
    fotoUrl: ''
  },
  {
    id: 'v-4',
    data: '2026-06-20',
    idFamilia: 'FAM-303',
    quemVisitou: 'MARTA',
    quemRecebeu: 'PEDRO GOMES & LUCIA REIS',
    objetivo: 'Visita de acolhimento e flores nos lares',
    johreiMinistrado: true,
    quantasPessoas: 3,
    observacoes: 'Levamos um pequeno arranjo de Ikebana (flores). Lúcia ficou muito emocionada e sentiu profunda paz com o Johrei.',
    fotoUrl: ''
  }
];
