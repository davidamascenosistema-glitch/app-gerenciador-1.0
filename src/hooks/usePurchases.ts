import { useState } from 'react';
import { Item, Purchase } from '../types';

const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'pending-default',
    name: 'Feira do Mês',
    status: 'in_progress',
    origin: 'direct',
    createdAt: new Date().toISOString(),
    items: [
      { id: '1', name: 'Arroz 5kg', category: 'Alimentos', quantity: 1, isWeighted: false, price: 24.90, bought: false },
      { id: '2', name: 'Carne Moída (kg)', category: 'Açougue', quantity: 1, weight: 0.85, isWeighted: true, price: 32.00, bought: true },
    ]
  }
];

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>(INITIAL_PURCHASES);

  /**
   * Busca a compra pendente atual (status 'planning' ou 'in_progress').
   * Apenas compras com origem 'list' ou 'direct' aparecem no card de compra pendente.
   * Retorna null se não houver nenhuma.
   */
  const getPendingPurchase = (): Purchase | null => {
    return (
      purchases.find(
        (p) =>
          (p.status === 'planning' || p.status === 'in_progress') &&
          (p.origin === 'list' || p.origin === 'direct')
      ) || null
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
        (p) =>
          !(
            (p.status === 'planning' || p.status === 'in_progress') &&
            (p.origin === 'list' || p.origin === 'direct')
          )
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
   * Cria e armazena uma nova compra na lista em memória
   */
  const createPurchase = (
    purchaseData: Omit<Purchase, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Purchase => {
    const origin = purchaseData.origin || 'manual';
    const isNewPending =
      (purchaseData.status === 'planning' || purchaseData.status === 'in_progress') &&
      (origin === 'list' || origin === 'direct');

    const items = (purchaseData.items || []).map((item) => ({
      ...item,
      bought: item.bought !== undefined ? item.bought : (origin === 'manual' ? true : false),
    }));

    const newPurchase: Purchase = {
      id: purchaseData.id || crypto.randomUUID(),
      name: purchaseData.name || 'Nova Compra',
      status: purchaseData.status || 'planning',
      origin,
      createdAt: purchaseData.createdAt || new Date().toISOString(),
      finishedAt: purchaseData.finishedAt,
      items,
    };

    setPurchases((prev) => {
      // Se a nova compra for uma compra pendente real (origin 'list' ou 'direct'),
      // removemos a compra pendente real anterior para garantir no máximo 1 pendente por vez.
      const filtered = isNewPending
        ? prev.filter(
            (p) =>
              !(
                (p.status === 'planning' || p.status === 'in_progress') &&
                (p.origin === 'list' || p.origin === 'direct')
              )
          )
        : prev;
      return [newPurchase, ...filtered];
    });

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
   * Transição automática: Se a compra estiver com status 'planning' e pelo menos um item for marcado como comprado,
   * o status da compra muda automaticamente para 'in_progress' e não reverte.
   */
  const toggleItemBought = (purchaseId: string, itemId: string): void => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;

        const updatedItems = p.items.map((item) =>
          item.id === itemId ? { ...item, bought: !item.bought } : item
        );

        const hasAnyBought = updatedItems.some((i) => i.bought);
        const newStatus = p.status === 'planning' && hasAnyBought ? 'in_progress' : p.status;

        return {
          ...p,
          status: newStatus,
          items: updatedItems,
        };
      })
    );
  };

  /**
   * Finaliza uma compra: altera status para 'finished', registra a data de finalização (finishedAt),
   * e mantém os itens como estão.
   */
  const finishPurchase = (purchaseId: string): void => {
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        return {
          ...p,
          status: 'finished',
          finishedAt: new Date().toISOString(),
        };
      })
    );
  };

  /**
   * Retorna apenas as compras com status 'finished', ordenadas da mais recente para a mais antiga (por finishedAt).
   */
  const getFinishedPurchases = (): Purchase[] => {
    return purchases
      .filter((p) => p.status === 'finished')
      .sort((a, b) => {
        const dateA = new Date(a.finishedAt || a.createdAt).getTime();
        const dateB = new Date(b.finishedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
  };

  return {
    purchases,
    getPendingPurchase,
    getFinishedPurchases,
    getPurchaseById,
    discardPendingPurchase,
    discardPurchase,
    createPurchase,
    updatePurchaseName,
    addItemToPurchase,
    editItemInPurchase,
    removeItemFromPurchase,
    toggleItemBought,
    finishPurchase,
    getPurchases,
  };
}
