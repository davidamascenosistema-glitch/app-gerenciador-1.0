import { GoogleGenAI, Type } from '@google/genai';

export interface ParsedVoiceItem {
  name: string;
  quantity: number;
  price: number | null;
  is_weighted: boolean;
  weight: number | null;
  category: string;
}

// Re-exporta itens de suporte do geminiService caso necessário
export { parseReceiptImage, type ExtractedReceiptItem } from './geminiService';

/**
 * Recupera a chave de API do Gemini a partir do ambiente do cliente ou build
 */
function getGeminiApiKey(): string {
  if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    return env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  }
  return '';
}

/**
 * Remove blocos de Markdown residuais (como ```json ... ```) e extrai o bloco JSON
 */
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

/**
 * Heurística de fallback em português caso a API do Gemini esteja temporariamente indisponível ou sem chave
 */
function fallbackParseVoiceCommand(transcript: string): ParsedVoiceItem {
  const text = transcript.trim().toLowerCase();

  // Detecção de peso
  const isWeighted = /(?:quilo|quilos|kg|grama|gramas|\bg\b|pesado|pesada)/i.test(text);

  // Detecção de preço (ex: "por 15 reais", "1 real", "a 5,90", "custou 10 reais", "R$ 12.50", "cinco e trinta")
  let price: number | null = null;
  const priceRegex = /(?:r\$\s*|custou\s*|a\s*|por\s*|de\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|pila)?/i;
  const priceMatch = text.match(priceRegex);
  if (priceMatch && /(?:reais|real|r\$|custou|por|a\s+\d)/i.test(text)) {
    const rawVal = priceMatch[1].replace(',', '.');
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0) {
      price = num;
    }
  }

  // Detecção de quantidade numérica
  let quantity = 1;
  const qtyMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:unidades?|itens?|quilos?|kg|pct|pacotes?|caixas?)?/i);
  if (qtyMatch) {
    const num = parseFloat(qtyMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      quantity = num;
    }
  } else if (/^(?:meio|meia)\s+(?:quilo|kg)/i.test(text)) {
    quantity = 0.5;
  } else if (/^(?:dois|duas)\b/i.test(text)) {
    quantity = 2;
  } else if (/^tr[êe]s\b/i.test(text)) {
    quantity = 3;
  } else if (/^quatro\b/i.test(text)) {
    quantity = 4;
  }

  // Limpeza do nome removendo stopwords e comandos
  let cleanName = transcript
    .replace(/^(adicionar|adicione|adiciona|coloca|coloque|comprar|comprei|botar|bota|insere|inserir)\s+/i, '')
    .replace(/(?:por|a|custou|de)?\s*\d+(?:[.,]\d{1,2})?\s*(?:reais|real|r\$)/gi, '')
    .replace(/\b(em|no|na)\s+promoção\b/gi, '')
    .trim();

  if (!cleanName) {
    cleanName = transcript.trim();
  }

  // Capitalização da primeira letra de cada palavra
  cleanName = cleanName
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  // Categoria básica por palavras-chave
  let category = 'Geral';
  if (/(?:pão|pães|bolo|torta|biscoito|croissant|padaria)/i.test(cleanName)) {
    category = 'Padaria';
  } else if (/(?:carne|frango|peixe|alcatra|contrafilé|bife|costela|moída|linguiça|salsicha|açougue)/i.test(cleanName)) {
    category = 'Açougue';
  } else if (/(?:leite|queijo|iogurte|manteiga|requeijão|nata)/i.test(cleanName)) {
    category = 'Laticínios';
  } else if (/(?:maçã|banana|tomate|alface|cebola|alho|laranja|limão|batata|cenoura|fruta|legume|verdura)/i.test(cleanName)) {
    category = 'Hortifrúti';
  } else if (/(?:detergente|sabão|amaciante|desinfetante|esponja|água sanitária|limpeza)/i.test(cleanName)) {
    category = 'Limpeza';
  } else if (/(?:cerveja|refrigerante|suco|água|vinho|energético|vodka)/i.test(cleanName)) {
    category = 'Bebidas';
  } else if (/(?:shampoo|sabonete|pasta de dente|escova|desodorante|papel higiênico)/i.test(cleanName)) {
    category = 'Higiene';
  } else if (/(?:arroz|feijão|óleo|açúcar|sal|café|macarrão|farinha)/i.test(cleanName)) {
    category = 'Mercearia';
  }

  const weight = isWeighted ? (quantity > 0 ? quantity : 1) : null;

  return {
    name: cleanName,
    quantity: isWeighted ? 1 : quantity,
    price,
    is_weighted: isWeighted,
    weight,
    category,
  };
}

/**
 * Transforma a transcrição de voz em um item de compra estruturado usando o Google Gemini.
 *
 * @param transcript Frase capturada pelo microfone (ex: "10 pães 1 real", "dois leites de cinco e trinta")
 * @returns Item estruturado com nome, quantidade, preço (se houver), is_weighted, weight e categoria.
 */
export async function parseVoiceCommand(transcript: string): Promise<ParsedVoiceItem> {
  if (!transcript || !transcript.trim()) {
    throw new Error('Transcrição de voz vazia.');
  }

  const apiKey = getGeminiApiKey();

  // Se não houver chave configurada, usa o fallback heurístico local
  if (!apiKey) {
    console.warn('GEMINI_API_KEY não encontrada. Utilizando fallback local para interpretar comando de voz.');
    return fallbackParseVoiceCommand(transcript);
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Você é um assistente de compras de supermercado inteligente. Sua única função é extrair dados de uma frase ditada pelo usuário e retornar estritamente um objeto JSON com as chaves: 'name' (string, nome do produto limpo no singular/plural correto), 'quantity' (number, padrão 1), 'price' (number ou null, converter centavos/reais para decimal), 'is_weighted' (boolean, true se for peso como kg/g), 'weight' (number ou null, ex: 0.5 para meio quilo), e 'category' (string).

Regras cruciais:

Se o usuário disser 'X reais' ou 'X e Y', isso é SEMPRE o preço ('price').

Remova o preço e a quantidade do nome do produto.

Retorne APENAS o JSON válido, sem blocos de código markdown ou explicações.

Exemplos de como você deve interpretar:
Frase: '10 pães 1 real' -> JSON: {"name": "Pão Francês", "quantity": 10, "price": 1.00, "is_weighted": false, "weight": null, "category": "Padaria"}
Frase: 'dois leites de cinco e trinta' -> JSON: {"name": "Leite", "quantity": 2, "price": 5.30, "is_weighted": false, "weight": null, "category": "Laticínios"}
Frase: 'meio quilo de carne moída' -> JSON: {"name": "Carne Moída", "quantity": 1, "price": null, "is_weighted": true, "weight": 0.5, "category": "Açougue"}`;

  const prompt = `Analise a seguinte frase ditada e extraia o item estruturado em JSON:
"${transcript}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          description: 'Objeto estruturado do item de compras',
          properties: {
            name: {
              type: Type.STRING,
              description: 'Nome limpo do produto no singular/plural correto',
            },
            quantity: {
              type: Type.NUMBER,
              description: 'Quantidade numérica deduzida da frase, padrão 1',
            },
            price: {
              type: Type.NUMBER,
              description: 'Preço numérico em decimal ou null se não informado',
              nullable: true,
            },
            is_weighted: {
              type: Type.BOOLEAN,
              description: 'true se for peso como kg/g',
            },
            weight: {
              type: Type.NUMBER,
              description: 'Peso em número (ex: 0.5 para meio quilo) ou null',
              nullable: true,
            },
            category: {
              type: Type.STRING,
              description: 'Categoria do produto',
            },
          },
          required: ['name', 'quantity', 'is_weighted', 'category'],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return fallbackParseVoiceCommand(transcript);
    }

    const cleanedText = cleanJsonOutput(rawText);
    const parsed = JSON.parse(cleanedText);

    const is_weighted = Boolean(parsed.is_weighted);

    const name =
      typeof parsed.name === 'string' && parsed.name.trim().length > 0
        ? parsed.name.trim()
        : fallbackParseVoiceCommand(transcript).name;

    const quantity =
      typeof parsed.quantity === 'number' && !isNaN(parsed.quantity) && parsed.quantity > 0
        ? Number(parsed.quantity)
        : 1;

    const price =
      typeof parsed.price === 'number' && !isNaN(parsed.price) && parsed.price >= 0
        ? Number(parsed.price)
        : null;

    const weight =
      typeof parsed.weight === 'number' && !isNaN(parsed.weight) && parsed.weight > 0
        ? Number(parsed.weight)
        : is_weighted && quantity > 0
          ? quantity
          : null;

    const category =
      typeof parsed.category === 'string' && parsed.category.trim().length > 0
        ? parsed.category.trim()
        : 'Geral';

    return {
      name,
      quantity,
      price,
      is_weighted,
      weight,
      category,
    };
  } catch (err: any) {
    console.error('Erro ao chamar Gemini API para interpretação de voz:', err);
    return fallbackParseVoiceCommand(transcript);
  }
}
