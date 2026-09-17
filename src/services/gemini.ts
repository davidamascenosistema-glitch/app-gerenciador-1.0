import { GoogleGenAI, Type } from '@google/genai';

export interface ParsedVoiceItem {
  name: string;
  quantity: number;
  price: number | null;
  is_weighted: boolean;
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
 * Remove blocos de Markdown residuais (como ```json ... ```)
 */
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
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

  // Detecção de preço (ex: "por 15 reais", "a 5,90", "custou 10 reais", "R$ 12.50", "8 reais")
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
  if (/(?:maçã|banana|tomate|alface|cebola|alho|laranja|limão|batata|cenoura|fruta|legume|verdura)/i.test(cleanName)) {
    category = 'Hortifrúti';
  } else if (/(?:leite|queijo|iogurte|manteiga|requeijão|nata)/i.test(cleanName)) {
    category = 'Laticínios';
  } else if (/(?:pão|bolo|torta|biscoito|croissant|padaria)/i.test(cleanName)) {
    category = 'Padaria';
  } else if (/(?:carne|frango|peixe|alcatra|contrafilé|bife|costela|moída|linguiça|salsicha)/i.test(cleanName)) {
    category = 'Carnes & Aves';
  } else if (/(?:detergente|sabão|amaciante|desinfetante|esponja|água sanitária|limpeza)/i.test(cleanName)) {
    category = 'Limpeza';
  } else if (/(?:cerveja|refrigerante|suco|água|vinho|energético|vodka)/i.test(cleanName)) {
    category = 'Bebidas';
  } else if (/(?:shampoo|sabonete|pasta de dente|escova|desodorante|papel higiênico)/i.test(cleanName)) {
    category = 'Higiene';
  } else if (/(?:arroz|feijão|óleo|açúcar|sal|café|macarrão|farinha)/i.test(cleanName)) {
    category = 'Mercearia';
  }

  return {
    name: cleanName,
    quantity,
    price,
    is_weighted: isWeighted,
    category,
  };
}

/**
 * Transforma a transcrição de voz em um item de compra estruturado usando o Google Gemini.
 *
 * @param transcript Frase capturada pelo microfone (ex: "Dois quilos de tomate a 8 reais")
 * @returns Item estruturado com nome, quantidade, preço (se houver), is_weighted e categoria.
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

  const systemInstruction = `Você é um assistente especialista de supermercado e compras domésticas.
Sua única responsabilidade é analisar a transcrição de áudio ditada pelo usuário e extrair exatamente um produto estruturado em formato JSON.

Regras de extração:
1. name (string): Nome limpo e padronizado do produto em português (ex: "Tomate", "Leite Integral", "Detergente Neutro"). Remova comandos verbais como "adicionar", "comprei", "coloque", bem como unidades de medida e preços do nome.
2. quantity (number): Quantidade numérica deduzida da fala. Se disser "dois leites", quantity = 2. Se disser "meio quilo", quantity = 0.5. Se não especificar quantidade, o padrão é 1.
3. price (number ou null): Preço em Reais se o usuário ditou um valor monetário (ex: "custou 6 reais", "a 4,50" -> 6 ou 4.5). Se não houver menção a valor ou preço, defina como null.
4. is_weighted (boolean): true se o usuário disser "quilo", "kg", "gramas", "pesado" ou se for produto vendido a peso; caso contrário, false.
5. category (string): Categoria lógica deduzida em português (ex: "Hortifrúti", "Laticínios", "Padaria", "Carnes & Aves", "Bebidas", "Limpeza", "Higiene", "Mercearia", "Congelados", "Snacks & Doces", "Geral").`;

  const prompt = `Analise o seguinte comando de voz de compras e extraia o produto estruturado:
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
              description: 'Nome padronizado do produto',
            },
            quantity: {
              type: Type.NUMBER,
              description: 'Quantidade ou peso deduzido da frase',
            },
            price: {
              type: Type.NUMBER,
              description: 'Preço numérico se informado na frase, caso contrário null',
              nullable: true,
            },
            is_weighted: {
              type: Type.BOOLEAN,
              description: 'true se vendido por peso (kg ou gramas)',
            },
            category: {
              type: Type.STRING,
              description: 'Categoria do produto no supermercado',
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

    const is_weighted = Boolean(parsed.is_weighted);

    const category =
      typeof parsed.category === 'string' && parsed.category.trim().length > 0
        ? parsed.category.trim()
        : 'Geral';

    return {
      name,
      quantity,
      price,
      is_weighted,
      category,
    };
  } catch (err: any) {
    console.error('Erro ao chamar Gemini API para interpretação de voz:', err);
    // Em caso de falha de conexão ou erro da API, usa o interpretador heurístico
    return fallbackParseVoiceCommand(transcript);
  }
}
