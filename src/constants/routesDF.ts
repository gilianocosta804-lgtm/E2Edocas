/**
 * Catálogo Oficial de Rotas de Distribuição: DF & Entorno Metropolitano
 * Escala alfanumérica padronizada (Ex: 16A, 16B, 01A, etc.)
 * Base Logística: Condomínio SYS Gama - Ponte Alta (Gama, DF)
 */

export interface LogisticsRoute {
  code: string;
  name: string;
  city: string;
  zone: 'DF' | 'Entorno';
  description?: string;
}

export const DF_ENTORNO_ROUTES: LogisticsRoute[] = [
  // --- DISTRITO FEDERAL (DF) ---
  {
    code: '01A',
    name: '01A - Gama Centro, Leste & Sul',
    city: 'Gama - DF',
    zone: 'DF',
    description: 'Setor Central, Setor Leste, Setor Sul e Comercial',
  },
  {
    code: '01B',
    name: '01B - Gama Oeste, DVO & Ponte Alta',
    city: 'Gama - DF',
    zone: 'DF',
    description: 'Setor Oeste, DVO, Ponte Alta Norte e Sul',
  },
  {
    code: '02A',
    name: '02A - Taguatinga Norte & Centro',
    city: 'Taguatinga - DF',
    zone: 'DF',
    description: 'Taguatinga Norte, QNL, QNJ, Centro Comercial',
  },
  {
    code: '02B',
    name: '02B - Taguatinga Sul & Areal',
    city: 'Taguatinga - DF',
    zone: 'DF',
    description: 'Taguatinga Sul, QSD, QSE, Areal e Pistão Sul',
  },
  {
    code: '03A',
    name: '03A - Samambaia Norte',
    city: 'Samambaia - DF',
    zone: 'DF',
    description: 'Samambaia Norte, QN, QR e Expansão',
  },
  {
    code: '03B',
    name: '03B - Samambaia Sul',
    city: 'Samambaia - DF',
    zone: 'DF',
    description: 'Samambaia Sul, QS e Parque Sul',
  },
  {
    code: '04A',
    name: '04A - Plano Piloto (Asa Sul & Asa Norte)',
    city: 'Brasília - DF',
    zone: 'DF',
    description: 'Asa Sul, Asa Norte, Eixo Monumental e Esplanada',
  },
  {
    code: '04B',
    name: '04B - Plano Piloto (Lago Sul, Lago Norte & Sudoeste)',
    city: 'Brasília - DF',
    zone: 'DF',
    description: 'Lago Sul, Lago Norte, Noroeste, Sudoeste e Octogonal',
  },
  {
    code: '05A',
    name: '05A - Santa Maria Centro & Sul',
    city: 'Santa Maria - DF',
    zone: 'DF',
    description: 'Santa Maria Centro, Sul, Total Ville e Polo JK',
  },
  {
    code: '05B',
    name: '05B - Santa Maria Norte & Santos Dumont',
    city: 'Santa Maria - DF',
    zone: 'DF',
    description: 'Santa Maria Norte, Santos Dumont e Tororó',
  },
  {
    code: '06A',
    name: '06A - Águas Claras & Arniqueira',
    city: 'Águas Claras - DF',
    zone: 'DF',
    description: 'Águas Claras Vertical, Arniqueira e Areal',
  },
  {
    code: '07A',
    name: '07A - Guará I, II & SIA / SCIA',
    city: 'Guará - DF',
    zone: 'DF',
    description: 'Guará I e II, SIA Trechos 1 a 17, SCIA e Estrutural',
  },
  {
    code: '08A',
    name: '08A - Recanto das Emas',
    city: 'Recanto das Emas - DF',
    zone: 'DF',
    description: 'Recanto das Emas Quadras 100 a 800',
  },
  {
    code: '08B',
    name: '08B - Riacho Fundo I & II',
    city: 'Riacho Fundo - DF',
    zone: 'DF',
    description: 'Riacho Fundo I, Riacho Fundo II e Colônia Agrícola Sucupira',
  },
  {
    code: '09A',
    name: '09A - Sobradinho I, II & Fercal',
    city: 'Sobradinho - DF',
    zone: 'DF',
    description: 'Sobradinho I, Sobradinho II, Grande Colorado e Fercal',
  },
  {
    code: '10A',
    name: '10A - Planaltina DF & Arapoanga',
    city: 'Planaltina - DF',
    zone: 'DF',
    description: 'Planaltina Tradicional, Buritis, Arapoanga e Vale do Amanhecer',
  },
  {
    code: '11A',
    name: '11A - São Sebastião & Jardim Botânico',
    city: 'São Sebastião - DF',
    zone: 'DF',
    description: 'São Sebastião, Jardim Botânico e Mangueiral',
  },
  {
    code: '12A',
    name: '12A - Vicente Pires & Colônia Agrícola',
    city: 'Vicente Pires - DF',
    zone: 'DF',
    description: 'Vicente Pires Ruas 1 a 12, Samapi e Jockey',
  },
  {
    code: '13A',
    name: '13A - Brazlândia & Incra',
    city: 'Brazlândia - DF',
    zone: 'DF',
    description: 'Brazlândia Setor Veredas, Tradicional, Incra 6/7/8',
  },
  {
    code: '16A',
    name: '16A - Ceilândia Centro, Sul & P Sul',
    city: 'Ceilândia - DF',
    zone: 'DF',
    description: 'Ceilândia Centro, Sul, P Sul, Guariroba',
  },
  {
    code: '16B',
    name: '16B - Ceilândia Norte, Setor O & Expansão',
    city: 'Ceilândia - DF',
    zone: 'DF',
    description: 'Ceilândia Norte, Setor O, Expansão, P Norte, Sol Nascente',
  },

  // --- ENTORNO DO DISTRITO FEDERAL (GO) ---
  {
    code: '14A',
    name: '14A - Valparaíso de Goiás (Etapa A/B & Céu Azul)',
    city: 'Valparaíso de Goiás - GO',
    zone: 'Entorno',
    description: 'Valparaíso I e II, Etapas A, B, C, Céu Azul e Anhanguera',
  },
  {
    code: '14B',
    name: '14B - Cidade Ocidental & Jardim ABC',
    city: 'Cidade Ocidental - GO',
    zone: 'Entorno',
    description: 'Cidade Ocidental Centro, SQ, Friburgo, Jardim ABC',
  },
  {
    code: '15A',
    name: '15A - Novo Gama & Pedregal',
    city: 'Novo Gama - GO',
    zone: 'Entorno',
    description: 'Novo Gama Centro, Pedregal, Lago Azul, Lunabel',
  },
  {
    code: '17A',
    name: '17A - Luziânia Centro & Jardim Ingá',
    city: 'Luziânia - GO',
    zone: 'Entorno',
    description: 'Luziânia Centro, Jardim Ingá, Osfaya e Parque Estrela Dalva',
  },
  {
    code: '18A',
    name: '18A - Águas Lindas de Goiás',
    city: 'Águas Lindas de Goiás - GO',
    zone: 'Entorno',
    description: 'Jardim Brasília, Mansões Odisseia, Camping Club e Pérola',
  },
  {
    code: '19A',
    name: '19A - Santo Antônio do Descoberto',
    city: 'Santo Antônio do Descoberto - GO',
    zone: 'Entorno',
    description: 'SAD Centro, Morada Nobre e Queiroz',
  },
  {
    code: '20A',
    name: '20A - Formosa & Planaltina de Goiás',
    city: 'Formosa - GO',
    zone: 'Entorno',
    description: 'Formosa Centro e Planaltina de Goiás (Brasilinha)',
  },
];

/**
 * Busca dados da rota a partir do código ou nome
 */
export function findRouteByQuery(query: string): LogisticsRoute | undefined {
  if (!query) return undefined;
  const clean = query.trim().toUpperCase();
  return DF_ENTORNO_ROUTES.find(
    r => r.code === clean || r.name.toUpperCase().startsWith(clean) || r.name.toUpperCase().includes(clean)
  );
}
