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
      budget: dbPurchase.budget != null ? Number(dbPurchase.budget) : undefined,
      storeName: dbPurchase.store_name ?? dbPurchase.storeName ?? undefined,
      fromListId: dbPurchase.from_list_id ?? dbPurchase.fromListId ?? undefined,
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
  const createPurchaseFromTemplate = async (originalPurchase: Purchase): Promise<Purchase> => {
    const clonedItems: Item[] = (originalPurchase.items || []).map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      category: item.category || 'Geral',
      quantity: item.quantity || 1,
      weight: item.weight,
      isWeighted: item.isWeighted || false,
      price: undefined,
      bought: false,
      pricingModeSource: item.pricingModeSource ?? null,
    }));

    return await createPurchase({
      name: originalPurchase.name || 'Planejamento de compra',
      status: 'pending',
      origin: 'list',
      items: clonedItems,
    });
  };

  /**
   * Cria e armazena uma nova compra no Supabase e no estado em memória,
   * inserindo na tabela purchases com status 'pending' e copiando os itens de list_items
   * para purchase_items se from_list_id foi fornecido.
   */
  const createPurchase = async (
    purchaseData: Omit<Purchase, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Promise<Purchase> => {
    const origin = purchaseData.origin || (purchaseData.fromListId ? 'list' : 'manual');
    const newPurchaseId = purchaseData.id || crypto.randomUUID();
    const createdAt = purchaseData.createdAt || new Date().toISOString();

    // Itens iniciais fornecidos diretamente
    let initialItems: Item[] = (purchaseData.items || []).map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      bought: false,
    }));

    const newPurchase: Purchase = {
      id: newPurchaseId,
      name: purchaseData.name || 'Nova Compra',
      status: 'pending',
      origin,
      createdAt,
      finishedAt: purchaseData.finishedAt,
      budget: purchaseData.budget != null ? Number(purchaseData.budget) : undefined,
      storeName: purchaseData.storeName || undefined,
      fromListId: purchaseData.fromListId || undefined,
      items: initialItems,
    };

    // Atualiza estado local imediatamente para agilidade de navegação
    setPurchases((prev) => [newPurchase, ...prev.filter((p) => p.id !== newPurchaseId)]);

    // Persistência com Supabase
    if (isSupabaseConfigured() && userId) {
      try {
        const isUUID = (str?: string) =>
          Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

        const validFromListId = isUUID(newPurchase.fromListId) ? newPurchase.fromListId : null;

        const purchasePayload: any = {
          id: newPurchase.id,
          user_id: userId,
          name: newPurchase.name,
          status: 'pending',
          origin: newPurchase.origin,
          created_at: newPurchase.createdAt,
          finished_at: null,
          budget: newPurchase.budget != null ? newPurchase.budget : null,
          store_name: newPurchase.storeName || null,
          from_list_id: validFromListId,
        };

        // 1. Aguarda a criação da compra na tabela purchases
        let { error: pError } = await supabase.from('purchases').insert(purchasePayload);

        // Se falhou por Foreign Key (ex: from_list_id não existe na tabela lists), retenta sem from_list_id
        if (pError && pError.code === '23503' && purchasePayload.from_list_id) {
          console.warn('Foreign key falhou para from_list_id, retentando sem o vínculo:', pError);
          const retryPayload = { ...purchasePayload, from_list_id: null };
          const { error: retryError } = await supabase.from('purchases').insert(retryPayload);
          pError = retryError;
        }

        if (pError) {
          console.error('Erro ao inserir compra no Supabase:', pError);
        } else {
          console.log(`Compra ${newPurchase.id} inserida com sucesso em purchases.`);
        }

        // 2. O Passo Crucial (Cópia de Itens):
        // Se um from_list_id foi fornecido, o código deve buscar todos os itens correspondentes
        // na tabela list_items e fazer um bulk insert copiando esses itens para purchase_items
        let itemsToCopy: any[] = [];

        if (newPurchase.fromListId) {
          const { data: listItemsData, error: fetchItemsErr } = await supabase
            .from('list_items')
            .select('*')
            .eq('list_id', newPurchase.fromListId);

          if (!fetchItemsErr && listItemsData && listItemsData.length > 0) {
            itemsToCopy = listItemsData;
          } else if (initialItems.length > 0) {
            // Fallback caso itens tenham sido fornecidos em memória
            itemsToCopy = initialItems;
          }
        } else if (initialItems.length > 0) {
          // Compra criada sem molde mas com itens iniciais
          itemsToCopy = initialItems;
        }

        if (itemsToCopy.length > 0) {
          const finalCopiedItems: Item[] = [];

          const dbItemsToInsert = itemsToCopy.map((item) => {
            const newItemId = crypto.randomUUID();
            const isWeighted = Boolean(item.is_weighted ?? item.isWeighted ?? false);
            const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
            const weight =
              item.weight != null && !isNaN(Number(item.weight))
                ? Number(item.weight)
                : isWeighted
                ? quantity
                : null;
            const pricingModeSource = item.pricing_mode_source ?? item.pricingModeSource ?? null;

            finalCopiedItems.push({
              id: newItemId,
              name: item.name || 'Item sem nome',
              category: item.category || 'Geral',
              quantity,
              weight: weight != null ? weight : undefined,
              isWeighted,
              bought: false,
              price: undefined,
              pricingModeSource,
            });

            const row: any = {
              id: newItemId,
              purchase_id: newPurchase.id,
              user_id: userId,
              name: item.name || 'Item sem nome',
              category: item.category || 'Geral',
              quantity,
              weight: weight,
              is_weighted: isWeighted,
              price: null,
              brand: null,
              bought: false,
              created_at: new Date().toISOString(),
            };

            if (pricingModeSource !== undefined && pricingModeSource !== null) {
              row.pricing_mode_source = pricingModeSource;
            }

            return row;
          });

          // Inserção em massa (bulk insert) segura
          let { error: insertItemsErr } = await supabase
            .from('purchase_items')
            .insert(dbItemsToInsert);

          // Se a tabela purchase_items não tiver a coluna 'brand' ou 'pricing_mode_source' (erro 42703), retenta removendo-as
          if (insertItemsErr && insertItemsErr.code === '42703') {
            console.warn('Retentando bulk insert em purchase_items sem colunas estendidas opcionais...');
            const fallbackRows = dbItemsToInsert.map(({ brand, pricing_mode_source, ...safeCols }) => safeCols);
            const { error: retryItemsErr } = await supabase.from('purchase_items').insert(fallbackRows);
            insertItemsErr = retryItemsErr;
          }

          if (insertItemsErr) {
            console.error('Erro no bulk insert de purchase_items:', insertItemsErr);
          } else {
            console.log(`Sucesso: ${dbItemsToInsert.length} itens copiados para purchase_items.`);
          }

          // Atualiza lista em memória com os itens copiados
          newPurchase.items = finalCopiedItems;
          setPurchases((prev) =>
            prev.map((p) => (p.id === newPurchase.id ? { ...p, items: finalCopiedItems } : p))
          );
        }
      } catch (dbErr) {
        console.error('Erro inesperado na criação de compra no Supabase:', dbErr);
      }
    }

    return newPurchase;
  };

  /**
   * Cria uma nova compra a partir de um molde de lista existente (da tabela lists/list_items)
   */
  const createPurchaseFromList = async (
    list: { id: string; name: string; items: any[] },
    options?: { budget?: number; storeName?: string; name?: string }
  ): Promise<Purchase> => {
    return await createPurchase({
      name: options?.name || list.name || 'Compra no Mercado',
      status: 'pending',
      origin: 'list',
      items: list.items,
      budget: options?.budget,
      storeName: options?.storeName,
      fromListId: list.id,
    });
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
    createPurchaseFromList,
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
