import { useState, useEffect, useCallback } from 'react';
import { Item, Purchase } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const INITIAL_PURCHASES: Purchase[] = [];

export function usePurchases(userId?: string | null) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Converte o item da tabela purchase_items do Supabase para a interface TypeScript Item
   */
  const mapDbItemToAppItem = (dbItem: any): Item => {
    return {
      id: String(dbItem.id),
      name: dbItem.name || '',
      category: dbItem.category || 'Geral',
      quantity: Number(dbItem.quantity) || 1,
      weight: dbItem.weight != null ? Number(dbItem.weight) : undefined,
      isWeighted: Boolean(dbItem.is_weighted ?? dbItem.isWeighted ?? false),
      price: dbItem.price != null ? Number(dbItem.price) : undefined,
      bought: Boolean(dbItem.bought ?? false),
      pricingModeSource: dbItem.pricing_mode_source ?? dbItem.pricingModeSource ?? null,
    };
  };

  /**
   * Converte a compra da tabela purchases do Supabase para a interface TypeScript Purchase
   */
  const mapDbPurchaseToAppPurchase = (dbPurchase: any, dbItems: any[] = []): Purchase => {
    return {
      id: String(dbPurchase.id),
      name: dbPurchase.name || 'Nova Compra',
      status: (dbPurchase.status as 'pending' | 'finished') || 'pending',
      origin: (dbPurchase.origin as 'list' | 'invoice' | 'manual') || 'list',
      createdAt: dbPurchase.created_at || dbPurchase.createdAt || new Date().toISOString(),
      finishedAt: dbPurchase.finished_at || dbPurchase.finishedAt || undefined,
      items: dbItems.map(mapDbItemToAppItem),
    };
  };

  /**
   * Carrega compras e itens do Supabase para o usuário logado
   */
  const fetchPurchasesFromSupabase = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) return;

    setLoading(true);
    try {
      // 1. Busca as compras do usuário
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (purchasesError) {
        console.error('Erro ao carregar compras do Supabase:', purchasesError);
        setLoading(false);
        return;
      }

      if (!purchasesData || purchasesData.length === 0) {
        setPurchases([]);
        setLoading(false);
        return;
      }

      const purchaseIds = purchasesData.map((p) => p.id);

      // 2. Busca todos os purchase_items relacionados
      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_items')
        .select('*')
        .in('purchase_id', purchaseIds)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Erro ao carregar itens de compras do Supabase:', itemsError);
      }

      const itemsByPurchaseId = new Map<string, any[]>();
      if (!itemsError && itemsData) {
        itemsData.forEach((item) => {
          const pid = String(item.purchase_id);
          const current = itemsByPurchaseId.get(pid) || [];
          current.push(item);
          itemsByPurchaseId.set(pid, current);
        });
      }

      // 3. Monta a lista completa de compras
      const loadedPurchases: Purchase[] = purchasesData.map((p) =>
        mapDbPurchaseToAppPurchase(p, itemsByPurchaseId.get(String(p.id)) || [])
      );

      setPurchases(loadedPurchases);
    } catch (err) {
      console.error('Exceção ao buscar compras do Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Carrega as compras sempre que o userId for autenticado ou alterado
  useEffect(() => {
    if (userId && isSupabaseConfigured()) {
      fetchPurchasesFromSupabase();
    }
  }, [userId, fetchPurchasesFromSupabase]);

  /**
   * Busca todas as compras pendentes (status 'pending').
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
   * Remove compras não finalizadas que não possuem nenhum item adicionado (0 itens).
   */
  const cleanUpEmptyPurchases = (): void => {
    const emptyPurchases = purchases.filter(
      (p) => p.status === 'pending' && (!p.items || p.items.length === 0)
    );

    setPurchases((prev) =>
      prev.filter(
        (p) => p.status === 'finished' || (p.items && p.items.length > 0)
      )
    );

    if (isSupabaseConfigured() && emptyPurchases.length > 0 && userId) {
      const idsToDelete = emptyPurchases.map((p) => p.id);
      supabase.from('purchase_items').delete().in('purchase_id', idsToDelete).then(() => {
        supabase.from('purchases').delete().in('id', idsToDelete).then();
      });
    }
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

    if (isSupabaseConfigured()) {
      if (purchaseId) {
        supabase.from('purchase_items').delete().eq('purchase_id', purchaseId).then(() => {
          supabase.from('purchases').delete().eq('id', purchaseId).then();
        });
      } else if (userId) {
        supabase
          .from('purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .eq('origin', 'list')
          .then(({ data }) => {
            if (data && data.length > 0) {
              const ids = data.map((p) => p.id);
              supabase.from('purchase_items').delete().in('purchase_id', ids).then(() => {
                supabase.from('purchases').delete().in('id', ids).then();
              });
            }
          });
      }
    }
  };

  /**
   * Descarta/exclui uma compra específica por ID
   */
  const discardPurchase = (id: string): void => {
    setPurchases((prev) => prev.filter((p) => p.id !== id));

    if (isSupabaseConfigured()) {
      supabase.from('purchase_items').delete().eq('purchase_id', id).then(() => {
        supabase.from('purchases').delete().eq('id', id).then();
      });
    }
  };

  /**
   * Cria e armazena uma nova compra a partir de um modelo existente (compra finalizada),
   * clonando todos os itens com bought=false na tabela purchase_items.
   */
  const createPurchaseFromTemplate = (originalPurchase: Purchase): Purchase => {
    const newPurchaseId = crypto.randomUUID();
    const clonedItems: Item[] = (originalPurchase.items || []).map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      category: item.category || 'Geral',
      quantity: item.quantity || 1,
      weight: item.weight,
      isWeighted: item.isWeighted || false,
      price: item.price,
      bought: false,
      pricingModeSource: item.pricingModeSource ?? null,
    }));

    const newPurchase: Purchase = {
      id: newPurchaseId,
      name: originalPurchase.name || 'Planejamento de compra',
      status: 'pending',
      origin: 'list',
      createdAt: new Date().toISOString(),
      items: clonedItems,
    };

    setPurchases((prev) => [newPurchase, ...prev]);

    // Persistência no Supabase com user_id obrigatório
    if (isSupabaseConfigured() && userId) {
      supabase
        .from('purchases')
        .insert({
          id: newPurchase.id,
          user_id: userId,
          name: newPurchase.name,
          status: newPurchase.status,
          origin: newPurchase.origin,
          created_at: newPurchase.createdAt,
          finished_at: null,
        })
        .then(({ error: pError }) => {
          if (pError) console.error('Erro ao inserir compra do modelo:', pError);

          if (clonedItems.length > 0) {
            const dbItemsToInsert = clonedItems.map((item) => ({
              id: item.id,
              purchase_id: newPurchase.id,
              user_id: userId,
              name: item.name,
              category: item.category || 'Geral',
              quantity: item.quantity || 1,
              weight: item.weight != null ? item.weight : null,
              is_weighted: Boolean(item.isWeighted),
              price: item.price != null ? item.price : null,
              bought: false,
              created_at: new Date().toISOString(),
            }));
            supabase.from('purchase_items').insert(dbItemsToInsert).then(({ error: iError }) => {
              if (iError) console.error('Erro ao inserir itens do modelo:', iError);
            });
          }
        });
    }

    return newPurchase;
  };

  /**
   * Cria e armazena uma nova compra no Supabase e na lista em memória
   */
  const createPurchase = (
    purchaseData: Omit<Purchase, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Purchase => {
    const origin = purchaseData.origin || 'manual';
    const newPurchaseId = purchaseData.id || crypto.randomUUID();
    const createdAt = purchaseData.createdAt || new Date().toISOString();

    const items = (purchaseData.items || []).map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      bought: item.bought !== undefined ? item.bought : (origin === 'manual' ? true : false),
    }));

    const newPurchase: Purchase = {
      id: newPurchaseId,
      name: purchaseData.name || 'Nova Compra',
      status: purchaseData.status || 'pending',
      origin,
      createdAt,
      finishedAt: purchaseData.finishedAt,
      items,
    };

    setPurchases((prev) => [newPurchase, ...prev]);

    // Persistência no Supabase com user_id obrigatório
    if (isSupabaseConfigured() && userId) {
      supabase
        .from('purchases')
        .insert({
          id: newPurchase.id,
          user_id: userId,
          name: newPurchase.name,
          status: newPurchase.status,
          origin: newPurchase.origin,
          created_at: newPurchase.createdAt,
          finished_at: newPurchase.finishedAt || null,
        })
        .then(({ error: pError }) => {
          if (pError) console.error('Erro ao criar compra no Supabase:', pError);

          if (items.length > 0) {
            const dbItemsToInsert = items.map((item) => ({
              id: item.id,
              purchase_id: newPurchase.id,
              user_id: userId,
              name: item.name,
              category: item.category || 'Geral',
              quantity: item.quantity || 1,
              weight: item.weight != null ? item.weight : null,
              is_weighted: Boolean(item.isWeighted),
              price: item.price != null ? item.price : null,
              bought: Boolean(item.bought),
              created_at: new Date().toISOString(),
            }));
            supabase.from('purchase_items').insert(dbItemsToInsert).then(({ error: iError }) => {
              if (iError) console.error('Erro ao inserir itens no Supabase:', iError);
            });
          }
        });
    }

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
   * Atualiza o nome de uma compra no estado e na tabela purchases
   */
  const updatePurchaseName = (purchaseId: string, name: string): void => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setPurchases((prev) =>
      prev.map((p) => (p.id === purchaseId ? { ...p, name: trimmed } : p))
    );

    if (isSupabaseConfigured() && userId) {
      supabase.from('purchases').update({ name: trimmed }).eq('id', purchaseId).then(({ error }) => {
        if (error) console.error('Erro ao atualizar nome da compra:', error);
      });
    }
  };

  /**
   * Adiciona um novo item à tabela purchase_items e atualiza o estado
   */
  const addItemToPurchase = (
    purchaseId: string,
    itemData: Omit<Item, 'id' | 'bought'> & { id?: string; bought?: boolean }
  ): void => {
    const newItemId = itemData.id || crypto.randomUUID();

    const defaultBought = itemData.bought !== undefined ? itemData.bought : false;
    const newItem: Item = {
      id: newItemId,
      name: itemData.name,
      category: itemData.category || 'Geral',
      quantity: itemData.quantity || 1,
      weight: itemData.weight,
      isWeighted: itemData.isWeighted || false,
      price: itemData.price,
      bought: defaultBought,
      pricingModeSource: itemData.pricingModeSource ?? null,
    };

    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        return {
          ...p,
          items: [...p.items, newItem],
        };
      })
    );

    if (isSupabaseConfigured() && userId) {
      supabase
        .from('purchase_items')
        .insert({
          id: newItemId,
          purchase_id: purchaseId,
          user_id: userId,
          name: itemData.name,
          category: itemData.category || 'Geral',
          quantity: itemData.quantity || 1,
          weight: itemData.weight != null ? itemData.weight : null,
          is_weighted: Boolean(itemData.isWeighted),
          price: itemData.price != null ? itemData.price : null,
          bought: defaultBought,
          pricing_mode_source: itemData.pricingModeSource ?? null,
          created_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error('Erro ao inserir item na compra:', error);
        });
    }
  };

  /**
   * Edita um item existente na tabela purchase_items e no estado
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

    if (isSupabaseConfigured() && userId) {
      const dbUpdate: any = {};
      if (updatedData.name !== undefined) dbUpdate.name = updatedData.name;
      if (updatedData.category !== undefined) dbUpdate.category = updatedData.category;
      if (updatedData.quantity !== undefined) dbUpdate.quantity = updatedData.quantity;
      if (updatedData.weight !== undefined) dbUpdate.weight = updatedData.weight != null ? updatedData.weight : null;
      if (updatedData.isWeighted !== undefined) dbUpdate.is_weighted = Boolean(updatedData.isWeighted);
      if (updatedData.price !== undefined) dbUpdate.price = updatedData.price != null ? updatedData.price : null;
      if (updatedData.bought !== undefined) dbUpdate.bought = Boolean(updatedData.bought);
      if (updatedData.pricingModeSource !== undefined) dbUpdate.pricing_mode_source = updatedData.pricingModeSource;

      supabase.from('purchase_items').update(dbUpdate).eq('id', itemId).then(({ error }) => {
        if (error) console.error('Erro ao atualizar item:', error);
      });
    }
  };

  /**
   * Remove um item da tabela purchase_items e do estado
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

    if (isSupabaseConfigured()) {
      supabase.from('purchase_items').delete().eq('id', itemId).then(({ error }) => {
        if (error) console.error('Erro ao remover item:', error);
      });
    }
  };

  /**
   * Alterna o estado de 'comprado' de um item
   */
  const toggleItemBought = (purchaseId: string, itemId: string): void => {
    let newBoughtVal = false;

    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;

        const updatedItems = p.items.map((item) => {
          if (item.id === itemId) {
            newBoughtVal = !item.bought;
            return { ...item, bought: newBoughtVal };
          }
          return item;
        });

        return {
          ...p,
          items: updatedItems,
        };
      })
    );

    if (isSupabaseConfigured()) {
      supabase
        .from('purchase_items')
        .update({ bought: newBoughtVal })
        .eq('id', itemId)
        .then(({ error }) => {
          if (error) console.error('Erro ao alternar status do item:', error);
        });
    }
  };

  /**
   * Finaliza uma compra: altera status para 'finished', registra a data de finalização (finishedAt),
   * e persiste na tabela purchases.
   */
  const finishPurchase = (purchaseId: string): void => {
    const finishedAt = new Date().toISOString();

    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        if (p.status === 'finished') return p;
        return {
          ...p,
          status: 'finished',
          finishedAt: p.finishedAt || finishedAt,
        };
      })
    );

    if (isSupabaseConfigured()) {
      supabase
        .from('purchases')
        .update({
          status: 'finished',
          finished_at: finishedAt,
        })
        .eq('id', purchaseId)
        .then(({ error }) => {
          if (error) console.error('Erro ao finalizar compra no Supabase:', error);
        });
    }
  };

  /**
   * Retorna apenas as compras com status 'finished', sem duplicações por ID.
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
    loading,
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
    refreshPurchases: fetchPurchasesFromSupabase,
  };
}
