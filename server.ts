import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Helper seguro para inicializar GoogleGenAI apenas quando solicitado
  function getGenAI(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chave GEMINI_API_KEY não configurada no servidor.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Executa generateContent com modelos resilientes de alta disponibilidade
  async function generateContentWithFallback(ai: GoogleGenAI, request: any) {
    // gemini-3.1-flash-lite tem a mais alta disponibilidade e latência ultrarrápida para tarefas de extração
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        return await ai.models.generateContent({
          ...request,
          model,
        });
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTemporary =
          err?.status === 503 ||
          err?.code === 503 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          err?.status === 429;

        if (isTemporary) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  // Heurística de fallback em português executada no servidor caso Gemini esteja com alta demanda
  function serverFallbackParseVoice(transcript: string) {
    const text = transcript.trim().toLowerCase();
    const isWeighted = /(?:quilo|quilos|kg|grama|gramas|\bg\b|pesado|pesada)/i.test(text);

    let price: number | null = null;
    const priceRegex = /(?:r\$\s*|custou\s*|a\s*|por\s*|de\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|pila)?/i;
    const priceMatch = text.match(priceRegex);
    if (priceMatch && /(?:reais|real|r\$|custou|por|a\s+\d)/i.test(text)) {
      const num = parseFloat(priceMatch[1].replace(',', '.'));
      if (!isNaN(num) && num > 0) price = num;
    }

    let quantity = 1;
    const qtyMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:unidades?|itens?|quilos?|kg|pct|pacotes?|caixas?)?/i);
    if (qtyMatch) {
      const num = parseFloat(qtyMatch[1].replace(',', '.'));
      if (!isNaN(num) && num > 0) quantity = num;
    } else if (/^(?:meio|meia)\s+(?:quilo|kg)/i.test(text)) {
      quantity = 0.5;
    } else if (/^(?:dois|duas)\b/i.test(text)) {
      quantity = 2;
    } else if (/^tr[êe]s\b/i.test(text)) {
      quantity = 3;
    } else if (/^quatro\b/i.test(text)) {
      quantity = 4;
    }

    let cleanName = transcript
      .replace(/^(adicionar|adicione|adiciona|coloca|coloque|comprar|comprei|botar|bota|insere|inserir)\s+/i, '')
      .replace(/(?:por|a|custou|de)?\s*\d+(?:[.,]\d{1,2})?\s*(?:reais|real|r\$)/gi, '')
      .replace(/\b(em|no|na)\s+promoção\b/gi, '')
      .trim();

    if (!cleanName) cleanName = transcript.trim();

    cleanName = cleanName
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    let category = 'Geral';
    if (/(?:pão|pães|bolo|torta|biscoito|croissant|padaria)/i.test(cleanName)) category = 'Padaria';
    else if (/(?:carne|frango|peixe|alcatra|contrafilé|bife|costela|moída|linguiça|salsicha|açougue)/i.test(cleanName)) category = 'Açougue';
    else if (/(?:leite|queijo|iogurte|manteiga|requeijão|nata)/i.test(cleanName)) category = 'Laticínios';
    else if (/(?:maçã|banana|tomate|alface|cebola|alho|laranja|limão|batata|cenoura|fruta|legume|verdura)/i.test(cleanName)) category = 'Hortifrúti';
    else if (/(?:detergente|sabão|amaciante|desinfetante|esponja|água sanitária|limpeza)/i.test(cleanName)) category = 'Limpeza';
    else if (/(?:cerveja|refrigerante|suco|água|vinho|energético|vodka)/i.test(cleanName)) category = 'Bebidas';
    else if (/(?:shampoo|sabonete|pasta de dente|escova|desodorante|papel higiênico)/i.test(cleanName)) category = 'Higiene';
    else if (/(?:arroz|feijão|óleo|açúcar|sal|café|macarrão|farinha)/i.test(cleanName)) category = 'Mercearia';

    return {
      name: cleanName,
      quantity: isWeighted ? 1 : quantity,
      price,
      is_weighted: isWeighted,
      weight: isWeighted ? (quantity > 0 ? quantity : 1) : null,
      category,
    };
  }

  // Rota server-side para interpretação de comandos de voz com Gemini
  app.post('/api/voice-parse', async (req, res) => {
    const { transcript, prompt: customPrompt } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcrição de voz vazia ou inválida.' });
    }

    try {
      const ai = getGenAI();

      const promptToSend =
        typeof customPrompt === 'string' && customPrompt.trim().length > 0
          ? customPrompt
          : `
Você é um extrator de dados de compras. Leia a frase do usuário e retorne APENAS um objeto JSON válido.

REGRAS:
1. Limpe o nome do produto. Remova quantidades, preços e conectivos do nome. Coloque no singular.
2. Preço (price) é sempre um número decimal (ex: 1.00, 5.30). Se não houver preço, retorne null.
3. Não adicione crases, markdown, nem a palavra json no retorno.

EXEMPLOS REAIS:
Frase: "10 pães 1 real"
JSON: {"name": "Pão Francês", "quantity": 10, "price": 1.00, "is_weighted": false, "weight": null, "category": "Padaria"}

Frase: "dois leites de cinco e trinta"
JSON: {"name": "Leite", "quantity": 2, "price": 5.30, "is_weighted": false, "weight": null, "category": "Laticínios"}

Frase: "meio quilo de carne moída"
JSON: {"name": "Carne Moída", "quantity": 1, "price": null, "is_weighted": true, "weight": 0.5, "category": "Açougue"}

AGORA É A SUA VEZ:
Frase: "${transcript.trim()}"
JSON:
`;

      const response = await generateContentWithFallback(ai, {
        contents: promptToSend,
      });

      const raw = response.text || '';
      return res.json({ text: raw });
    } catch (err: any) {
      console.warn('Aviso na rota /api/voice-parse (ativando fallback de extração):', err?.message || err);
      // Se a API estiver temporariamente congestionada, retorna o item usando a heurística local
      const fallbackItem = serverFallbackParseVoice(transcript);
      return res.json({ text: JSON.stringify(fallbackItem), ...fallbackItem });
    }
  });

  // Rota server-side para análise de nota fiscal
  app.post('/api/receipt-parse', async (req, res) => {
    try {
      const { base64DataUrl } = req.body;
      if (!base64DataUrl || typeof base64DataUrl !== 'string') {
        return res.status(400).json({ error: 'Imagem da nota fiscal ausente.' });
      }

      const ai = getGenAI();

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

      const response = await generateContentWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
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
            description: 'Lista de produtos encontrados na nota fiscal',
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: 'Nome legível do produto em português',
                },
                quantity: {
                  type: Type.NUMBER,
                  description: 'Quantidade comprada do produto',
                },
                price: {
                  type: Type.NUMBER,
                  description: 'Valor total ou preço do item em Reais',
                },
              },
              required: ['name', 'quantity', 'price'],
            },
          },
        },
      });

      let raw = response.text || '[]';
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const firstBracket = raw.indexOf('[');
      const lastBracket = raw.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        raw = raw.substring(firstBracket, lastBracket + 1);
      }
      const items = JSON.parse(raw);
      res.json({ items });
    } catch (err: any) {
      console.warn('Aviso na rota /api/receipt-parse:', err?.message || err);
      res.status(200).json({ items: [], warning: 'Não foi possível processar a nota fiscal no momento.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
