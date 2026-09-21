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
  try {
    const res = await fetch('/api/receipt-parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64DataUrl }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Falha na requisição (status ${res.status})`);
    }

    const data = await res.json();
    const items: Array<{ name?: string; quantity?: number; price?: number }> = data.items || [];

    return items
      .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
      .map((item, index) => ({
        id: `extracted-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        name: item.name!.trim(),
        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? Number(item.quantity) : 1,
        price: typeof item.price === 'number' && item.price >= 0 ? Number(item.price) : 0,
        selected: true,
      }));
  } catch (error: any) {
    console.error('Erro na análise da nota fiscal:', error);
    throw new Error(
      error.message || 'Ocorreu um erro ao processar a imagem com a inteligência artificial.'
    );
  }
}
