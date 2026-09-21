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

  const prompt = `
Você é um extrator de dados de compras. Leia a frase do usuário e retorne APENAS um objeto JSON válido.

REGRAS:
1. Limpe o nome do produto. Remova quantidades, pesos, preços e conectivos. Coloque no singular.
2. Preço (price) é sempre um número decimal. Se disser "X reais", "por X", price = X.
3. Se a frase contiver "kg", "quilo", "gramas" ou "g", is_weighted DEVE ser true. O valor numérico do peso vai para a chave 'weight' (ex: 2kg -> 2, 500g -> 0.5). A quantidade (quantity) nesses casos geralmente é 1.
4. Não adicione crases, markdown, nem a palavra json no retorno.

EXEMPLOS REAIS:
Frase: "2kg de Alcatra por 20 reais"
JSON: {"name": "Alcatra", "quantity": 1, "price": 20.00, "is_weighted": true, "weight": 2, "category": "Açougue"}

Frase: "10 pães 1 real"
JSON: {"name": "Pão Francês", "quantity": 10, "price": 1.00, "is_weighted": false, "weight": null, "category": "Padaria"}

Frase: "dois leites de cinco e trinta"
JSON: {"name": "Leite", "quantity": 2, "price": 5.30, "is_weighted": false, "weight": null, "category": "Laticínios"}

AGORA É A SUA VEZ:
Frase: "${transcript}"
JSON:
`;

  // Envia essa string prompt diretamente para a função de geração (rota backend /api/voice-parse)
  try {
    const endpoint = typeof window !== 'undefined' ? '/api/voice-parse' : 'http://localhost:3000/api/voice-parse';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript: transcript.trim(), prompt }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = typeof data.text === 'string' ? data.text : (data.name ? JSON.stringify(data) : '');

      if (text) {
        const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

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
            : is_weighted
              ? (quantity > 0 ? quantity : 1)
              : null;

        const category =
          typeof parsed.category === 'string' && parsed.category.trim().length > 0
            ? parsed.category.trim()
            : 'Geral';

        return {
          name,
          quantity: is_weighted ? 1 : quantity,
          price,
          is_weighted,
          weight,
          category,
        };
      }
    } else {
      console.warn('Endpoint /api/voice-parse retornou status:', res.status);
    }
  } catch (apiErr) {
    console.warn('Erro de rede ao chamar /api/voice-parse, utilizando heurística local:', apiErr);
  }

  // Fallback heurístico inteligente em português caso o backend esteja inacessível
  return fallbackParseVoiceCommand(transcript);
}
