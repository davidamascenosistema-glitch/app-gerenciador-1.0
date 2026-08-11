import { Item, Purchase } from '../types';

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
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

/**
 * Calcula o subtotal de um item individual (considerando quantidade ou peso)
 */
export const calculateItemSubtotal = (item: Item): number => {
  if (!item.price) return 0;
  if (item.isWeighted) {
    return item.price * (item.weight || item.quantity);
  }
  return item.price * item.quantity;
};

/**
 * Calcula o valor total de uma compra (Purchase) a partir dos seus itens
 */
export const calculatePurchaseTotal = (purchase: Purchase): number => {
  if (!purchase || !purchase.items || purchase.items.length === 0) return 0;
  return purchase.items.reduce((total, item) => total + calculateItemSubtotal(item), 0);
};

export interface ParsedBatchItem {
  name: string;
  quantity: number;
  category: string;
  isWeighted: boolean;
}

/**
 * Processa um texto com múltiplos itens (um por linha) no formato "2 Leite" ou "Leite"
 */
export const parseBatchItemsInput = (text: string): ParsedBatchItem[] => {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n');
  const results: ParsedBatchItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Regex para identificar quantidade no início ex: "2 Leite", "3 Sabão em pó"
    const match = trimmed.match(/^(\d+)\s+(.+)$/);

    if (match && match[2] && match[2].trim()) {
      const qty = parseInt(match[1], 10);
      const name = match[2].trim();
      results.push({
        name,
        quantity: isNaN(qty) || qty < 1 ? 1 : qty,
        category: 'Geral',
        isWeighted: false,
      });
    } else {
      results.push({
        name: trimmed,
        quantity: 1,
        category: 'Geral',
        isWeighted: false,
      });
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
 * Retorna a lista de sugestões rápidas filtradas (remove os itens que já existem na compra atual)
 */
export const getFilteredQuickSuggestions = (
  existingItems: Item[],
  suggestionsList: string[] = DEFAULT_QUICK_SUGGESTIONS
): string[] => {
  const existingNames = new Set(
    (existingItems || []).map((i) => i.name.trim().toLowerCase())
  );

  return suggestionsList.filter(
    (suggestion) => !existingNames.has(suggestion.trim().toLowerCase())
  );
};

/**
 * Gera um texto formatado em .txt com todos os itens da compra agrupados por categoria.
 */
export const generatePurchaseExportText = (purchase: Purchase): string => {
  const formattedDate = formatDateBRL(purchase.finishedAt || purchase.createdAt);
  const totalValue = calculatePurchaseTotal(purchase);
  const totalItems = purchase.items ? purchase.items.length : 0;
  const boughtItems = purchase.items ? purchase.items.filter((i) => i.bought).length : 0;

  let statusText = 'Em andamento';
  if (purchase.status === 'finished') statusText = 'Finalizada';
  else if (purchase.status === 'planning') statusText = 'Planejamento';

  const originText =
    purchase.origin === 'list'
      ? 'Planejada'
      : purchase.origin === 'direct'
      ? 'Compra direta'
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
  lines.push('GERENCIADOR DE COMPRAS - LISTA DE COMPRAS');
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

  if (count === 0 || average === 0) {
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


