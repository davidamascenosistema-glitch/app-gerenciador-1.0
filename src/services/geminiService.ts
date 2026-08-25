import { GoogleGenAI, Type } from '@google/genai';

export interface ExtractedReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  selected: boolean;
}

/**
 * Servico para interacao com a API Gemini de visao para leitura de nota fiscal.
 */
export async function parseReceiptImage(base64DataUrl: string): Promise<ExtractedReceiptItem[]> {
  // Tenta obter a chave de API de process.env ou import.meta.env
  const apiKey =
    (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env && ((import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY)) ||
    '';

  if (!apiKey) {
    throw new Error('Chave de API do Gemini não encontrada nas variáveis de ambiente.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Extrai o MIME type e a string base64 limpa
  let mimeType = 'image/jpeg';
  let base64Data = base64DataUrl;

  if (base64DataUrl.includes(';base64,')) {
    const parts = base64DataUrl.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'image/jpeg';
    base64Data = parts[1];
  }

  const prompt = `Você é um leitor especialista em notas fiscais e cupons de compras no Brasil.
Analise a imagem da nota fiscal/cupom fiscal e extraia cada item individual de produto comprado.

Para cada item encontrado na nota, extraia:
1. name: Nome legível e limpo do produto em português (remova códigos numéricos confusos se houver).
2. quantity: Quantidade de unidades compradas (número positivo, mínimo 1).
3. price: Valor total do item ou preço unitário em Reais (R$) como número decimal (ex: 5.90).

Regras de análise:
- Se a imagem estiver totalmente borrada, ilegível ou NÃO for um cupom/nota fiscal de compras, retorne uma lista vazia [].
- Ignore totais gerais, troco, formas de pagamento, impostos, CNPJ, razão social e dados do consumidor.
- Foque exclusivamente na lista de itens individuais de produtos.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Lista de produtos extraídos da nota fiscal',
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'Nome legível do produto',
              },
              quantity: {
                type: Type.NUMBER,
                description: 'Quantidade comprada',
              },
              price: {
                type: Type.NUMBER,
                description: 'Valor total do item em Reais',
              },
            },
            required: ['name', 'quantity', 'price'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      return [];
    }

    const parsedItems: Array<{ name?: string; quantity?: number; price?: number }> = JSON.parse(text);

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return [];
    }

    return parsedItems
      .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
      .map((item, index) => ({
        id: `extracted-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        name: item.name!.trim(),
        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? Number(item.quantity) : 1,
        price: typeof item.price === 'number' && item.price >= 0 ? Number(item.price) : 0,
        selected: true,
      }));
  } catch (error: any) {
    console.error('Erro na análise da nota fiscal com Gemini API:', error);
    throw new Error(
      error.message || 'Ocorreu um erro ao processar a imagem com a inteligência artificial.'
    );
  }
}
