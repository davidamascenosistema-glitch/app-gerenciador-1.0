import { Item, Purchase, PricingModeDefault } from '../types';

/**
 * Formata uma string ISO de data para o padrão por extenso em português (ex: "10 de agosto de 2026")
 */
export const formatDateBRL = (dateString?: string): string => {
  if (!dateString) return 'Data não informada';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Data não informada';

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Formata um valor numérico no padrão de moeda em Real (BRL)
 */
export const formatCurrencyBRL = (value: number): string => {
  const safeVal = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
  return safeVal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// Constantes de limites de segurança e validação matemática
export const MAX_VOICE_TRANSCRIPT_LENGTH = 250;
export const MAX_ITEM_NAME_LENGTH = 80;
export const MAX_ITEM_CATEGORY_LENGTH = 40;
export const MIN_ITEM_QUANTITY = 0.001;
export const MAX_ITEM_QUANTITY = 9999;
export const MIN_ITEM_PRICE = 0;
export const MAX_ITEM_PRICE = 99999.99;

/**
 * Remove tags HTML, caracteres de controle e espaços duplicados, limitando o tamanho máximo.
 */
export const stripHtmlAndSanitizeText = (raw: unknown, maxLength: number): string => {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

/**
 * Sanitiza o nome de um item: sem tags HTML e no máximo 80 caracteres.
 */
export const sanitizeItemName = (rawName: unknown): string => {
  return stripHtmlAndSanitizeText(rawName, MAX_ITEM_NAME_LENGTH);
};

/**
 * Sanitiza a categoria de um item: sem tags HTML e no máximo 40 caracteres.
 */
export const sanitizeItemCategory = (rawCategory: unknown, fallback: string = 'Geral'): string => {
  const cleaned = stripHtmlAndSanitizeText(rawCategory, MAX_ITEM_CATEGORY_LENGTH);
  return cleaned || fallback;
};

/**
 * Valida e limita a quantidade ou peso entre 0.001 e 9999 (impede negativos, zero, NaN ou Infinity).
 */
export const validateItemQuantity = (rawQuantity: unknown, fallback: number = 1): number => {
  const safeFallback =
    Number.isFinite(fallback) && fallback >= MIN_ITEM_QUANTITY && fallback <= MAX_ITEM_QUANTITY
      ? fallback
      : 1;
  const parsed =
    typeof rawQuantity === 'number'
      ? rawQuantity
      : typeof rawQuantity === 'string'
      ? parseFloat(rawQuantity.replace(',', '.'))
      : NaN;

  if (!Number.isFinite(parsed) || isNaN(parsed) || parsed < MIN_ITEM_QUANTITY) {
    return safeFallback;
  }

  const clamped = Math.min(MAX_ITEM_QUANTITY, Math.max(MIN_ITEM_QUANTITY, parsed));
  return Math.round(clamped * 1000) / 1000;
};

/**
 * Valida e limita o preço entre 0 e 99999.99 (impede negativos, NaN ou Infinity).
 * Retorna undefined se o preço não foi informado ou for inválido/negativo.
 */
export const validateItemPrice = (rawPrice: unknown): number | undefined => {
  if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
    return undefined;
  }
  const parsed =
    typeof rawPrice === 'number'
      ? rawPrice
      : typeof rawPrice === 'string'
      ? parseFloat(rawPrice.replace(',', '.'))
      : NaN;

  if (!Number.isFinite(parsed) || isNaN(parsed) || parsed < MIN_ITEM_PRICE) {
    return undefined;
  }

  const clamped = Math.min(MAX_ITEM_PRICE, Math.max(MIN_ITEM_PRICE, parsed));
  return Math.round(clamped * 100) / 100;
};

/**
 * Calcula o subtotal de um item individual (considerando quantidade ou peso) com proteção anti-NaN e limites seguros
 */
export const calculateItemSubtotal = (item: Item): number => {
  if (!item || item.price === undefined || item.price === null) return 0;
  const price = validateItemPrice(item.price);
  if (price === undefined || price <= 0) return 0;

  if (item.isWeighted) {
    const rawWeight = item.weight !== undefined && item.weight !== null ? item.weight : item.quantity;
    const weight = validateItemQuantity(rawWeight, 0);
    if (weight < MIN_ITEM_QUANTITY) return 0;
    const sub = price * weight;
    return Number.isFinite(sub) && sub >= 0 ? sub : 0;
  }

  const qty = validateItemQuantity(item.quantity, 0);
  if (qty < MIN_ITEM_QUANTITY) return 0;
  const sub = price * qty;
  return Number.isFinite(sub) && sub >= 0 ? sub : 0;
};

/**
 * Calcula o valor total de uma compra (Purchase) ou lista de itens a partir dos seus itens com proteção anti-NaN
 */
export const calculatePurchaseTotal = (purchaseOrItems?: Purchase | Item[] | null): number => {
  if (!purchaseOrItems) return 0;
  const items = Array.isArray(purchaseOrItems) ? purchaseOrItems : purchaseOrItems.items;
  if (!items || !Array.isArray(items) || items.length === 0) return 0;
  const total = items.reduce((total, item) => total + (item ? calculateItemSubtotal(item) : 0), 0);
  return isNaN(total) || total < 0 || !isFinite(total) ? 0 : total;
};

export const ITEM_CATEGORIES = [
  'Geral',
  'Alimentos',
  'Bebidas',
  'Limpeza',
  'Higiene',
  'Açougue',
  'Frutas/Legumes',
  'Frios',
  'Padaria',
  'Hortifruti',
];

export const ALL_CATEGORIES = ITEM_CATEGORIES;

/**
 * Sanitiza a entrada de peso:
 * - Aceita apenas números e uma única vírgula/ponto decimal
 * - Converte ponto em vírgula
 * - Limita estritamente a no máximo 3 dígitos após a vírgula (ex: 1,456) e valor máximo de 9999
 */
export const sanitizeWeightInput = (value: string): string => {
  if (!value) return '';

  // Substitui pontos por vírgula para manter padrão brasileiro
  let normalized = value.replace(/\./g, ',');

  // Remove qualquer caractere que não seja dígito ou vírgula
  normalized = normalized.replace(/[^\d,]/g, '');

  // Se houver vírgula, mantém apenas a primeira e limita a parte inteira a 4 dígitos (9999) e 3 casas decimais
  const commaIndex = normalized.indexOf(',');
  if (commaIndex !== -1) {
    const integerPart = normalized.slice(0, commaIndex).slice(0, 4);
    const decimalPart = normalized.slice(commaIndex + 1).replace(/,/g, '');
    return `${integerPart},${decimalPart.slice(0, 3)}`;
  }

  return normalized.slice(0, 4);
};

/**
 * Sanitiza a entrada de preço para formato de moeda:
 * - Aceita apenas números e uma única vírgula/ponto decimal
 * - Converte ponto em vírgula
 * - Limita estritamente a parte inteira a 5 dígitos (99999) e no máximo 2 dígitos após a vírgula (ex: 99999,99)
 */
export const sanitizePriceInput = (value: string): string => {
  if (!value) return '';

  // Substitui pontos por vírgula para manter padrão brasileiro
  let normalized = value.replace(/\./g, ',');

  // Remove qualquer caractere que não seja dígito ou vírgula
  normalized = normalized.replace(/[^\d,]/g, '');

  // Se houver vírgula, mantém apenas a primeira e limita a 5 dígitos inteiros e 2 casas decimais
  const commaIndex = normalized.indexOf(',');
  if (commaIndex !== -1) {
    const integerPart = normalized.slice(0, commaIndex).slice(0, 5);
    const decimalPart = normalized.slice(commaIndex + 1).replace(/,/g, '');
    return `${integerPart},${decimalPart.slice(0, 2)}`;
  }

  return normalized.slice(0, 5);
};

/**
 * Resolve o isWeighted inicial e o pricingModeSource a partir do
 * default_pricing_mode vindo da sugestão genérica (ou ausência dele).
 */
export const resolvePricingMode = (
  defaultMode: PricingModeDefault | undefined
): { isWeighted: boolean; pricingModeSource: PricingModeDefault | null } => {
  if (defaultMode === 'unit') return { isWeighted: false, pricingModeSource: 'unit' };
  if (defaultMode === 'weight') return { isWeighted: true, pricingModeSource: 'weight' };
  if (defaultMode === 'both') return { isWeighted: false, pricingModeSource: 'both' }; // default inicial: Pré-embalado
  return { isWeighted: false, pricingModeSource: null }; // item não cadastrado na base genérica
};

export interface ParsedBatchItem {
  name: string;
  quantity: number;
  category: string;
  isWeighted: boolean;
}

/**
 * Processa um texto com múltiplos itens separados por linha e/ou vírgula (ex: "leite, carne" ou "2 Leite\nArroz").
 * Preserva vírgulas que façam parte de números decimais (ex: "1,5 kg carne" ou "2,5").
 */
export const parseBatchItemsInput = (text: string): ParsedBatchItem[] => {
  if (!text || !text.trim()) return [];

  // Primeiro divide por quebras de linha
  const lines = text.split(/\r?\n/);
  const rawSegments: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Divide a linha por vírgula, exceto quando a vírgula estiver entre dígitos (ex: 1,5 kg de carne)
    const parts = line.split(/(?<!\d),(?!\d)/);
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart) {
        rawSegments.push(trimmedPart);
      }
    }
  }

  const results: ParsedBatchItem[] = [];

  for (const raw of rawSegments) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Regex para identificar quantidade no início ex: "2 Leite", "3 Sabão em pó"
    const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);

    if (match && match[2] && match[2].trim()) {
      const qty = validateItemQuantity(match[1], 1);
      const cleanName = sanitizeItemName(match[2]);
      if (cleanName) {
        results.push({
          name: cleanName,
          quantity: Math.max(1, Math.min(MAX_ITEM_QUANTITY, Math.round(qty))),
          category: 'Geral',
          isWeighted: false,
        });
      }
    } else {
      const cleanName = sanitizeItemName(trimmed);
      if (cleanName) {
        results.push({
          name: cleanName,
          quantity: 1,
          category: 'Geral',
          isWeighted: false,
        });
      }
    }
  }

  return results;
};

/**
 * Calcule a média de valor total das últimas compras finalizadas (até 5 compras),
 * EXCLUINDO a compra atual passada pelo ID.
 */
export const calculateHistoricalAverage = (
  allPurchases: Purchase[],
  currentPurchaseId: string
): { average: number; count: number } => {
  const previousFinished = allPurchases
    .filter((p) => p.id !== currentPurchaseId && p.status === 'finished')
    .sort((a, b) => {
      const dateA = new Date(a.finishedAt || a.createdAt).getTime();
      const dateB = new Date(b.finishedAt || b.createdAt).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  if (previousFinished.length === 0) {
    return { average: 0, count: 0 };
  }

  const sum = previousFinished.reduce(
    (acc, p) => acc + calculatePurchaseTotal(p),
    0
  );

  return {
    average: sum / previousFinished.length,
    count: previousFinished.length,
  };
};

export const DEFAULT_QUICK_SUGGESTIONS = [
  'Leite',
  'Pão',
  'Café',
  'Arroz',
  'Feijão',
  'Açúcar',
  'Detergente',
  'Sabonete',
  'Óleo',
  'Sal',
  'Ovos',
  'Manteiga',
  'Papel Higiênico',
  'Frango',
  'Banana',
  'Sabão em pó',
  'Pasta de dente',
  'Macarrão',
];

/**
 * Retorna a lista de sugestões rápidas filtradas (remove os itens que já existem na compra atual e deduplica)
 */
export const getFilteredQuickSuggestions = (
  existingItems: Item[],
  suggestionsList: string[] = DEFAULT_QUICK_SUGGESTIONS
): string[] => {
  const existingNames = new Set(
    (existingItems || []).map((i) => i.name.trim().toLowerCase())
  );

  const seen = new Set<string>();
  const result: string[] = [];

  for (const suggestion of suggestionsList) {
    const trimmed = (suggestion || '').trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    if (!existingNames.has(lower) && !seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }

  return result;
};

/**
 * Gera um texto formatado em .txt com todos os itens da compra agrupados por categoria.
 */
export const generatePurchaseExportText = (purchase: Purchase): string => {
  const formattedDate = formatDateBRL(purchase.finishedAt || purchase.createdAt);
  const totalValue = calculatePurchaseTotal(purchase);
  const totalItems = purchase.items ? purchase.items.length : 0;
  const boughtItems = purchase.items ? purchase.items.filter((i) => i.bought).length : 0;

  let statusText = 'Pendente';
  if (purchase.status === 'finished') statusText = 'Finalizada';

  const originText =
    purchase.origin === 'list'
      ? 'Planejada'
      : purchase.origin === 'invoice'
      ? 'Nota fiscal'
      : 'Registro manual';

  // Agrupa os itens por categoria
  const categoriesMap: Record<string, Item[]> = {};
  (purchase.items || []).forEach((item) => {
    const cat = item.category || 'Geral';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = [];
    }
    categoriesMap[cat].push(item);
  });

  const lines: string[] = [];
  lines.push('========================================');
  lines.push('LISTA & COMPRA - LISTA DE COMPRAS');
  lines.push('========================================');
  lines.push(`Nome: ${purchase.name || 'Compra'}`);
  lines.push(`Data: ${formattedDate}`);
  lines.push(`Status: ${statusText} (${originText})`);
  lines.push(`Progresso: ${boughtItems}/${totalItems} itens marcados`);
  lines.push('========================================\n');

  if (totalItems === 0) {
    lines.push('(Nenhum item adicionado nesta compra)\n');
  } else {
    Object.keys(categoriesMap).forEach((category) => {
      lines.push(`--- CATEGORIA: ${category.toUpperCase()} ---`);
      categoriesMap[category].forEach((item) => {
        const subtotal = calculateItemSubtotal(item);
        const statusBadge = item.bought ? '[COMPRADO]' : '[PENDENTE]';

        let details = '';
        if (item.isWeighted) {
          const w = item.weight || item.quantity;
          const p = item.price ? formatCurrencyBRL(item.price) + '/kg' : 'Preço não inf.';
          details = `${w.toString().replace('.', ',')} kg x ${p}`;
        } else {
          const p = item.price ? formatCurrencyBRL(item.price) : 'Preço não inf.';
          details = `${item.quantity}x (un) x ${p}`;
        }

        const subtotalText = item.price ? `= ${formatCurrencyBRL(subtotal)}` : '';
        lines.push(`- ${item.name} (${details} ${subtotalText}) ${statusBadge}`);
      });
      lines.push(''); // Linha em branco entre categorias
    });
  }

  lines.push('========================================');
  lines.push(`VALOR TOTAL: ${formatCurrencyBRL(totalValue)}`);
  lines.push('========================================');

  return lines.join('\n');
};

/**
 * Dispara o download de um arquivo .txt com o resumo/lista da compra no navegador
 */
export const exportPurchaseAsTxt = (purchase: Purchase): void => {
  const content = generatePurchaseExportText(purchase);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const sanitizedName = (purchase.name || 'compra')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizedName || 'compra'}_lista.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


export interface ComparisonInsight {
  hasHistory: boolean;
  averageValue: number;
  percentageDiff: number;
  status: 'higher' | 'lower' | 'consistent';
  formattedDiffText: string;
  sampleCount: number;
}

/**
 * Calcula a variação percentual entre a compra atual e a média histórica e gera a descrição visual.
 */
export const calculateComparisonInsight = (
  currentPurchase: Purchase,
  allPurchases: Purchase[]
): ComparisonInsight => {
  const { average, count } = calculateHistoricalAverage(allPurchases, currentPurchase.id);

  if (count === 0 || !average || isNaN(average) || !isFinite(average) || average <= 0) {
    return {
      hasHistory: false,
      averageValue: 0,
      percentageDiff: 0,
      status: 'consistent',
      formattedDiffText: '',
      sampleCount: 0,
    };
  }

  const currentTotal = calculatePurchaseTotal(currentPurchase);
  const diffPercent = ((currentTotal - average) / average) * 100;
  if (isNaN(diffPercent) || !isFinite(diffPercent)) {
    return {
      hasHistory: true,
      averageValue: average,
      percentageDiff: 0,
      status: 'consistent',
      formattedDiffText: 'Valor consistente com suas compras recentes',
      sampleCount: count,
    };
  }
  const absRounded = Math.round(Math.abs(diffPercent));

  if (diffPercent >= 3) {
    return {
      hasHistory: true,
      averageValue: average,
      percentageDiff: diffPercent,
      status: 'higher',
      formattedDiffText: `${absRounded}% acima da sua média recente`,
      sampleCount: count,
    };
  } else if (diffPercent <= -3) {
    return {
      hasHistory: true,
      averageValue: average,
      percentageDiff: diffPercent,
      status: 'lower',
      formattedDiffText: `${absRounded}% abaixo da sua média recente`,
      sampleCount: count,
    };
  } else {
    return {
      hasHistory: true,
      averageValue: average,
      percentageDiff: diffPercent,
      status: 'consistent',
      formattedDiffText: 'Valor consistente com suas compras recentes',
      sampleCount: count,
    };
  }
};

/**
 * Lista de nomes padrões automáticos atribuídos pelo sistema
 */
export const DEFAULT_PURCHASE_NAMES = [
  'Planejamento de compra',
  'Registro de compra',
  'Registro manual',
  'Nova compra',
  'Nova Compra',
  'Compra rápida',
  'Nota fiscal',
  'Importação por nota fiscal',
  'Compra sem nome',
];

/**
 * Verifica se uma Purchase possui o nome padrão automático (nunca foi renomeada manualmente)
 */
export const isDefaultPurchaseName = (name?: string | null): boolean => {
  if (!name || !name.trim()) return true;
  const trimmed = name.trim().toLowerCase();
  return DEFAULT_PURCHASE_NAMES.some((def) => def.toLowerCase() === trimmed);
};

export interface CategorySection<T = Item> {
  category: string;
  items: T[];
}

/**
 * Agrupa os itens da compra ou lista por categoria, em ordem alfabética (pt-BR,
 * considerando acentuação corretamente — "Açougue" antes de "Alimentos").
 * Categoria sem nenhum item não gera seção.
 */
export const groupItemsByCategory = <T extends { category?: string }>(items: T[]): CategorySection<T>[] => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const cat = item.category || 'Geral';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return Array.from(map.entries())
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category, 'pt-BR'));
};

/**
 * Fallback de extração local em português para comandos de voz quando offline ou sem API disponível.
 * Converte números por extenso (com suporte completo a acentos), extrai preços no meio/final da frase,
 * rejeita frases que contenham apenas números isolados sem produto (retornando null) e categoriza via dicionário local.
 */
export const parseVoiceFallbackLocally = (
  transcript: string
): {
  name: string;
  quantity: number;
  price?: number;
  category: string;
  isWeighted: boolean;
} | null => {
  let text = stripHtmlAndSanitizeText(transcript, MAX_VOICE_TRANSCRIPT_LENGTH);
  if (!text) {
    return null;
  }

  // Remove comandos verbais comuns no início da frase
  text = text
    .replace(
      /^(?:adicionar|adicione|adiciona|colocar|coloque|coloca|comprar|comprei|botar|bota|insere|inserir|anotar|anota)\s+/i,
      ''
    )
    .trim();

  if (!text) {
    return null;
  }

  // Dicionário de números por extenso no início da frase (com e sem acento)
  const numberWords: Record<string, number> = {
    meio: 0.5,
    meia: 0.5,
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
    onze: 11,
    doze: 12,
    duzia: 12,
    dúzia: 12,
    quinze: 15,
    vinte: 20,
    trinta: 30,
    cinquenta: 50,
    cem: 100,
  };

  // Se a frase inteira capturada for apenas um número isolado (dígito ou por extenso) sem nome de produto (ex: "3" ou "Três")
  const normalizedWhole = text.toLowerCase().replace(/[.,!?]/g, '').trim();
  if (
    /^\d+(?:[.,]\d+)?$/.test(normalizedWhole) ||
    numberWords[normalizedWhole] !== undefined
  ) {
    return null;
  }

  let quantity = 1;
  const isWeighted = /\b(kg|quilo|quilos|grama|gramas|\bg\b|pesado|pesada)\b/i.test(text);

  // 1. Extração da quantidade no início (numérico ou por extenso com suporte completo a acentos [a-zA-ZÀ-ÿ]+)
  const numericStartMatch = text.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:x\s*|de\s+|unidades?\s+|un\s+|itens?\s+|pct\s+|pacotes?\s+)?/i
  );
  if (numericStartMatch) {
    const parsedQty = parseFloat(numericStartMatch[1].replace(',', '.'));
    if (!isNaN(parsedQty) && parsedQty > 0) {
      quantity = parsedQty;
      text = text.slice(numericStartMatch[0].length).trim();
    }
  } else {
    const firstWordMatch = text.match(/^([a-zA-ZÀ-ÿ]+)(?:\s+|$)/);
    if (firstWordMatch) {
      const firstWord = firstWordMatch[1].toLowerCase();
      if (numberWords[firstWord] !== undefined) {
        quantity = numberWords[firstWord];
        text = text.slice(firstWordMatch[0].length).trim();
      }
    }
  }

  // 2. Extração de preços com ou sem "R$" no meio ou final da frase:
  // Exemplos: "por r$ 5", "por 5 reais", "a 5,99", "r$ 10,50", "5 reais", "de 8 conto"
  let price: number | undefined = undefined;
  const priceWithPrefixOrCurrencyRegex =
    /(?:(?:\b(?:por|a|de|custou|custando)\s+)(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|contos|pila|pilas)?|(?:r\$\s*)(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|contos|pila|pilas)?|(?:\b(?:por|a|de|custou|custando)\s+)?(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|contos|pila|pilas))\b/i;

  const priceMatch = text.match(priceWithPrefixOrCurrencyRegex);
  if (priceMatch) {
    const capturedValue = priceMatch[1] || priceMatch[2] || priceMatch[3];
    if (capturedValue) {
      const parsedPrice = parseFloat(capturedValue.replace(',', '.'));
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        price = validateItemPrice(parsedPrice);
        text = (
          text.slice(0, priceMatch.index) +
          ' ' +
          text.slice((priceMatch.index || 0) + priceMatch[0].length)
        ).trim();
      }
    }
  }

  // 3. Limpeza de unidades e preposições residuais do nome do produto
  // Ex: "quilo de alcatra" -> "Alcatra", "kg de café" -> "Café", "de banana" -> "Banana"
  text = text
    .replace(/^(?:quilos?|kg|gramas?|\bg\b|unidades?|un)\s+(?:de\s+|da\s+|do\s+)?/i, '')
    .replace(/^(?:de\s+|da\s+|do\s+|dos\s+|das\s+)/i, '')
    .replace(/\b(?:por|a|de|custou|custando|r\$)\s*$/i, '')
    .replace(/\b(?:em\s+promo[çc][aã]o|na\s+promo[çc][aã]o|no\s+desconto)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Verifica novamente se o que sobrou após remover quantidade/preço está vazio ou é apenas um número isolado
  const remainingClean = sanitizeItemName(text);
  const remainingLower = remainingClean.toLowerCase().replace(/[.,!?]/g, '').trim();
  if (
    !remainingClean ||
    !remainingLower ||
    /^\d+(?:[.,]\d+)?$/.test(remainingLower) ||
    numberWords[remainingLower] !== undefined
  ) {
    return null;
  }

  const formattedName =
    remainingClean.charAt(0).toUpperCase() + remainingClean.slice(1);

  // 4. Dicionário local rápido de categorias por palavra-chave para funcionamento offline
  const CATEGORY_KEYWORDS: Array<{ category: string; regex: RegExp }> = [
    {
      category: 'Frutas/Legumes',
      regex:
        /\b(?:banana|bananas|maçã|maca|maçãs|macas|tomate|tomates|batata|batatas|cebola|cebolas|alface|cenoura|cenouras|laranja|laranjas|limão|limao|limões|limoes|alho|abacate|abacaxi|manga|morango|morangos|uva|uvas|pera|melancia|mamão|mamao|pepino|pimentão|pimentao|brócolis|brocolis|couve|repolho|rúcula|rucula|espinafre|abobrinha|berinjela|chuchu|beterraba|mandioca|inhame|fruta|frutas|verdura|verduras|legume|legumes)\b/i,
    },
    {
      category: 'Frios',
      regex:
        /\b(?:leite|queijo|mussarela|muçarela|presunto|manteiga|margarina|iogurte|requeijão|requeijao|peito de peru|mortadela|salame|ricota|creme de leite|nata|frios|laticínio|laticinios)\b/i,
    },
    {
      category: 'Açougue',
      regex:
        /\b(?:carne|frango|linguiça|linguica|peixe|bife|alcatra|picanha|contrafilé|contrafile|patinho|acém|acem|costela|moída|moida|salsicha|bacon|filé|file|tilápia|tilapia|camarão|camarao|porco|lombo|pernil|fígado|figado|açougue|acougue)\b/i,
    },
    {
      category: 'Padaria',
      regex:
        /\b(?:pão|pao|pães|paes|bolo|biscoito|biscoitos|bolacha|bolachas|torrada|torradas|sonho|croissant|rosca|baguete|broa|padaria)\b/i,
    },
    {
      category: 'Limpeza',
      regex:
        /\b(?:detergente|sabão|sabao|amaciante|água sanitária|agua sanitaria|desinfetante|esponja|bucha|palha de aço|saco de lixo|multiuso|limpa vidro|lustra móveis|álcool|alcool|vassoura|rodo|pano|inseticida|limpeza)\b/i,
    },
    {
      category: 'Higiene',
      regex:
        /\b(?:shampoo|xampu|condicionador|sabonete|creme dental|pasta de dente|escova de dente|escova|fio dental|papel higiênico|papel higienico|desodorante|absorvente|cotonete|cotonetes|fralda|fraldas|lenço umedecido|protetor solar|repelente|higiene)\b/i,
    },
    {
      category: 'Bebidas',
      regex:
        /\b(?:refrigerante|refrigerantes|coca|guaraná|guarana|suco|sucos|cerveja|cervejas|água|agua|vinho|energético|energetico|isotônico|isotonico|chá|cha|vodka|whisky|cachaça|cachaca|bebida|bebidas)\b/i,
    },
    {
      category: 'Mercearia',
      regex:
        /\b(?:arroz|feijão|feijao|macarrão|macarrao|óleo|oleo|azeite|café|cafe|açúcar|acucar|sal|farinha|molho|extrato|milho|ervilha|atum|sardinha|aveia|granola|achocolatado|leite condensado|maionese|ketchup|mostarda|vinagre|pipoca|chocolate|bombom|ovo|ovos|mercearia)\b/i,
    },
  ];

  let category = 'Geral';
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.regex.test(formattedName)) {
      category = entry.category;
      break;
    }
  }

  return {
    name: formattedName,
    quantity: validateItemQuantity(quantity, 1),
    price,
    category: sanitizeItemCategory(category, 'Geral'),
    isWeighted,
  };
};




