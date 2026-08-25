import { useState } from 'react';
import { Item, Purchase } from '../types';

const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'pending-default',
    name: 'Feira do Mês',
    status: 'pending',
    origin: 'list',
    createdAt: new Date().toISOString(),
    items: [
      { id: '1', name: 'Arroz 5kg', category: 'Alimentos', quantity: 1, isWeighted: false, price: 24.90, bought: false },
      { id: '2', name: 'Carne Moída', category: 'Açougue', quantity: 1, weight: 0.85, isWeighted: true, price: 32.00, bought: true },
    ]
  }
];

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>(INITIAL_PURCHASES);

  /**
   * Busca todas as compras pendentes (status 'pending').
   * Apenas compras com origem 'list' e com pelo menos 1 item são retornadas,
   * ordenadas da mais recente para a mais antiga (por createdAt).
   */
  const getPendingPurchases = (): Purchase[] => {
    return purchases
      .filter(
        (p) =>
          p.status === 'pending' &&
          p.origin === 'list' &&
          p.items &&
          p.items.length > 0
      )
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
  };

  /**
   * Remove compras não finalizadas que não possuem nenhum item adicionado (0 itens),
   * evitando o acúmulo de registros vazios na memória quando o usuário navega de volta.
   */
  const cleanUpEmptyPurchases = (): void => {
    setPurchases((prev) =>
      prev.filter(
        (p) => p.status === 'finished' || (p.items && p.items.length > 0)
      )
    );
  };

  /**
   * Descarta/exclui qualquer compra pendente existente (ou compra por ID)
   */
  const discardPendingPurchase = (purchaseId?: string): void => {
    setPurchases((prev) => {
      if (purchaseId) {
        return prev.filter((p) => p.id !== purchaseId);
      }
      return prev.filter(
        (p) => !(p.status === 'pending' && p.origin === 'list')
      );
    });
  };

  /**
   * Descarta/exclui uma compra específica por ID
   */
  const discardPurchase = (id: string): void => {
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  };

  /**
   * Cria e armazena uma nova compra a partir de um modelo existente (compra finalizada),
   * clonando todos os itens com bought=false e gerando novos IDs únicos.
   */
  const createPurchaseFromTemplate = (originalPurchase: Purchase): Purchase => {
    const clonedItems: Item[] = (originalPurchase.items || []).map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      category: item.category || 'Geral',
      quantity: item.quantity || 1,
      weight: item.weight,
      isWeighted: item.isWeighted || false,
      price: item.price,
      bought: false,
    }));

    const newPurchase: Purchase = {
      id: crypto.randomUUID(),
      name: originalPurchase.name || 'Planejamento de compra',
      status: 'pending',
      origin: 'list',
      createdAt: new Date().toISOString(),
      items: clonedItems,
    };

    setPurchases((prev) => [newPurchase, ...prev]);
    return newPurchase;
  };

  /**
   * Cria e armazena uma nova compra na lista em memória sem afetar compras existentes.
   */
  const createPurchase = (
    purchaseData: Omit<Purchase, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Purchase => {
    const origin = purchaseData.origin || 'manual';

    const items = (purchaseData.items || []).map((item) => ({
      ...item,
      bought: item.bought !== undefined ? item.bought : (origin === 'manual' ? true : false),
    }));

    const newPurchase: Purchase = {
      id: purchaseData.id || crypto.randomUUID(),
      name: purchaseData.name || 'Nova Compra',
      status: purchaseData.status || 'pending',
      origin,
      createdAt: purchaseData.createdAt || new Date().toISOString(),
      finishedAt: purchaseData.finishedAt,
      items,
    };

    setPurchases((prev) => [newPurchase, ...prev]);
    return newPurchase;
  };

  /**
   * Retorna todas as compras registradas
   */
  const getPurchases = (): Purchase[] => {
    return purchases;
  };

  /**
   * Busca uma compra pelo id
   */
  const getPurchaseById = (id: string): Purchase | null => {
    return purchases.find((p) => p.id === id) || null;
  };

  /**
   * Atualiza o nome de uma compra
   */
  const updatePurchaseName = (purchaseId: string, name: string): void => {
    setPurchases((prev) =>
      prev.map((p) => (p.id === purchaseId ? { ...p, name } : p))
    );
  };

  /**
   * Adiciona um novo item a uma compra específica
   */
  const addItemToPurchase = (
    purchaseId: string,
    itemData: Omit<Item, 'id' | 'bought'> & { id?: string; bought?: boolean }
  ): void => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        const defaultBought = p.origin === 'manual' ? true : false;
        const newItem: Item = {
          id: itemData.id || crypto.randomUUID(),
          name: itemData.name,
          category: itemData.category || 'Geral',
          quantity: itemData.quantity || 1,
          weight: itemData.weight,
          isWeighted: itemData.isWeighted || false,
          price: itemData.price,
          bought: itemData.bought !== undefined ? itemData.bought : defaultBought,
        };

        return {
          ...p,
          items: [...p.items, newItem],
        };
      })
    );
  };

  /**
   * Edita um item existente em uma compra
   */
  const editItemInPurchase = (
    purchaseId: string,
    itemId: string,
    updatedData: Partial<Omit<Item, 'id'>>
  ): void => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        return {
          ...p,
          items: p.items.map((item) =>
            item.id === itemId ? { ...item, ...updatedData } : item
          ),
        };
      })
    );
  };

  /**
   * Remove um item de uma compra
   */
  const removeItemFromPurchase = (
    purchaseId: string,
    itemId: string
  ): void => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        return {
          ...p,
          items: p.items.filter((item) => item.id !== itemId),
        };
      })
    );
  };

  /**
   * Alterna o estado de 'comprado' de um item
   */
  const toggleItemBought = (purchaseId: string, itemId: string): void => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;

        const updatedItems = p.items.map((item) =>
          item.id === itemId ? { ...item, bought: !item.bought } : item
        );

        return {
          ...p,
          items: updatedItems,
        };
      })
    );
  };

  /**
   * Finaliza uma compra: altera status para 'finished', registra a data de finalização (finishedAt),
   * e mantém os itens como estão, garantindo idempotência.
   */
  const finishPurchase = (purchaseId: string): void => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        if (p.status === 'finished') return p; // já finalizada, evita re-execuções
        return {
          ...p,
          status: 'finished',
          finishedAt: p.finishedAt || new Date().toISOString(),
        };
      })
    );
  };

  /**
   * Retorna apenas as compras com status 'finished', sem duplicações por ID,
   * ordenadas da mais recente para a mais antiga (por finishedAt).
   */
  const getFinishedPurchases = (): Purchase[] => {
    const uniqueMap = new Map<string, Purchase>();
    purchases.forEach((p) => {
      if (p.status === 'finished' && !uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => {
      const dateA = new Date(a.finishedAt || a.createdAt).getTime();
      const dateB = new Date(b.finishedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
  };

  return {
    purchases,
    getPendingPurchases,
    getFinishedPurchases,
    getPurchaseById,
    discardPendingPurchase,
    discardPurchase,
    createPurchase,
    createPurchaseFromTemplate,
    updatePurchaseName,
    addItemToPurchase,
    editItemInPurchase,
    removeItemFromPurchase,
    toggleItemBought,
    finishPurchase,
    getPurchases,
    cleanUpEmptyPurchases,
  };
}
