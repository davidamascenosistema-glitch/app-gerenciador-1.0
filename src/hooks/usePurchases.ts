import { useState, useEffect, useCallback } from 'react';
import { Item, Purchase } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { calculatePurchaseTotal } from '../utils/purchaseHelpers';

const STORAGE_KEY_PURCHASES = 'lista_e_compra_purchases_cache';

const loadLocalPurchases = (): Purchase[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PURCHASES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Aviso ao ler compras do cache local:', e);
  }
  return [];
};

const saveLocalPurchases = (items: Purchase[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(items));
  } catch (e) {
    console.warn('Aviso ao salvar compras no cache local:', e);
  }
};

export function usePurchases(userId?: string | null) {
  const [purchases, setPurchasesState] = useState<Purchase[]>(loadLocalPurchases);
  const [loading, setLoading] = useState<boolean>(false);

  const setPurchases = useCallback((action: Purchase[] | ((prev: Purchase[]) => Purchase[])) => {
    setPurchasesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      saveLocalPurchases(next);
      return next;
    });
  }, []);

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
    const rawStatus = String(dbPurchase.status || '').toLowerCase().trim();
    const status: 'pending' | 'finished' =
      rawStatus === 'finished' || rawStatus === 'concluida' ? 'finished' : 'pending';
    const finishedAt = dbPurchase.finished_at || dbPurchase.completed_at || dbPurchase.finishedAt || undefined;

    return {
      id: String(dbPurchase.id),
      name: dbPurchase.name || 'Nova Compra',
      status,
      origin: 'list',
      createdAt: dbPurchase.created_at || dbPurchase.createdAt || new Date().toISOString(),
      finishedAt,
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
        console.warn('Aviso ao carregar compras do Supabase (mantendo cache local):', purchasesError?.message || purchasesError);
        setLoading(false);
        return;
      }

      if (!purchasesData || purchasesData.length === 0) {
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

      console.log('DEBUG FETCH PURCHASES - RAW DATA:', {
        userId,
        purchasesDataCount: purchasesData.length,
        purchaseIds,
        itemsDataCount: itemsData ? itemsData.length : 0,
        itemsError,
        itemsData,
      });

      if (itemsError) {
        console.warn('Aviso ao carregar itens de compras do Supabase:', itemsError?.message || itemsError);
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

      console.log('DEBUG FETCH PURCHASES - GROUPED MAP:', {
        itemsByPurchaseIdEntries: Array.from(itemsByPurchaseId.entries()),
      });

      // 3. Monta a lista completa de compras
      const loadedPurchases: Purchase[] = purchasesData.map((p) => {
        const pIdStr = String(p.id);
        const matchedItems = itemsByPurchaseId.get(pIdStr) || [];
        console.log(`DEBUG PURCHASE [${pIdStr}] (${p.name}):`, {
          purchaseId: p.id,
          matchedItemsCount: matchedItems.length,
          matchedItems,
        });
        return mapDbPurchaseToAppPurchase(p, matchedItems);
      });

      setPurchases(loadedPurchases);
    } catch (err) {
      console.warn('Exceção ao buscar compras do Supabase (mantendo cache local):', err);
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
        (p) => p.status !== 'pending'
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

    return createPurchase({
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
  const createPurchase = (
    purchaseData: Omit<Purchase, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Purchase => {
    const origin = 'list';
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

    // Persistência assíncrona com Supabase
    if (isSupabaseConfigured() && userId) {
      (async () => {
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

          // 1. Insere a compra na tabela purchases
          let { error: pError } = await supabase.from('purchases').insert(purchasePayload);

          // Se falhou por colunas ausentes (PGRST204 ou 42703), retenta com payload mínimo
          if (pError && (pError.code === 'PGRST204' || pError.code === '42703')) {
            console.warn('Retentando inserir compra com payload reduzido...');
            const minimalPayload: any = {
              id: newPurchase.id,
              user_id: userId,
            };
            const { error: minError } = await supabase.from('purchases').insert(minimalPayload);
            pError = minError;

            if (pError && (pError.code === 'PGRST204' || pError.code === '42703')) {
              const { error: ultraMinError } = await supabase.from('purchases').insert({ id: newPurchase.id });
              pError = ultraMinError;
            }
          }

          // Se falhou por Foreign Key (ex: from_list_id não existe na tabela lists), retenta sem from_list_id
          if (pError && pError.code === '23503' && purchasePayload.from_list_id) {
            console.warn('Foreign key falhou para from_list_id, retentando sem o vínculo:', pError);
            const retryPayload = { ...purchasePayload, from_list_id: null };
            const { error: retryError } = await supabase.from('purchases').insert(retryPayload);
            pError = retryError;
          }

          if (pError) {
            console.error('DEBUG SUPABASE PURCHASE ERROR:', pError);
            console.warn('Aviso ao inserir compra no Supabase:', pError?.message || pError);
            return;
          } else {
            console.log(`Compra ${newPurchase.id} inserida com sucesso em purchases.`);
          }

          // 2. O Passo Crucial (Cópia de Itens):
          // Se um from_list_id foi fornecido, busca todos os itens correspondentes na tabela list_items
          // e realiza um bulk insert copiando esses itens para purchase_items
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
                bought: false,
                created_at: new Date().toISOString(),
              };

              if (pricingModeSource !== undefined && pricingModeSource !== null) {
                row.pricing_mode_source = pricingModeSource;
              }

              return row;
            });

            // Inserção em massa (bulk insert) resiliente
            let { error: insertItemsErr } = await supabase
              .from('purchase_items')
              .insert(dbItemsToInsert);

            // Se a tabela purchase_items não tiver a coluna 'pricing_mode_source' (erro PGRST204 ou 42703), retenta removendo-a
            if (insertItemsErr && (insertItemsErr.code === 'PGRST204' || insertItemsErr.code === '42703')) {
              console.warn('Retentando bulk insert em purchase_items sem pricing_mode_source...');
              const fallbackRows = dbItemsToInsert.map(({ pricing_mode_source, ...safeCols }) => safeCols);
              const { error: retryItemsErr } = await supabase.from('purchase_items').insert(fallbackRows);
              insertItemsErr = retryItemsErr;
            }

            if (insertItemsErr) {
              console.error('DEBUG SUPABASE BULK:', insertItemsErr);
              console.warn('Aviso no bulk insert de purchase_items:', insertItemsErr?.message || insertItemsErr);
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
          console.warn('Aviso inesperado na sincronização de compra no Supabase:', dbErr);
        }
      })();
    }

    return newPurchase;
  };

  /**
   * Cria uma nova compra a partir de um molde de lista existente (da tabela lists/list_items)
   */
  const createPurchaseFromList = (
    list: { id: string; name: string; items: any[] },
    options?: { budget?: number; storeName?: string; name?: string }
  ): Purchase => {
    return createPurchase({
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
        if (error) console.warn('Aviso ao atualizar nome da compra:', error?.message || error);
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
      const payload: any = {
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
      };

      supabase
        .from('purchase_items')
        .insert(payload)
        .then(async ({ error }) => {
          if (error && (error.code === 'PGRST204' || error.code === '42703')) {
            const { pricing_mode_source, ...safePayload } = payload;
            const { error: retryErr } = await supabase.from('purchase_items').insert(safePayload);
            if (retryErr) {
              console.error('DEBUG SUPABASE:', retryErr);
              console.warn('Aviso ao inserir item na compra:', retryErr?.message || retryErr);
            }
          } else if (error) {
            console.error('DEBUG SUPABASE:', error);
            console.warn('Aviso ao inserir item na compra:', error?.message || error);
          }
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

      supabase.from('purchase_items').update(dbUpdate).eq('id', itemId).then(async ({ error }) => {
        if (error && (error.code === 'PGRST204' || error.code === '42703')) {
          const { pricing_mode_source, ...safeUpdate } = dbUpdate;
          const { error: retryErr } = await supabase.from('purchase_items').update(safeUpdate).eq('id', itemId);
          if (retryErr) {
            console.warn('Aviso ao atualizar item (retry):', retryErr?.message || retryErr);
          }
        } else if (error) {
          console.warn('Aviso ao atualizar item:', error?.message || error);
        }
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
        if (error) console.warn('Aviso ao remover item:', error?.message || error);
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
          if (error) console.warn('Aviso ao alternar status do item:', error?.message || error);
        });
    }
  };

  /**
   * Finaliza uma compra: altera status para 'finished', registra a data de finalização (finished_at/completed_at),
   * grava total_amount e persiste exclusivamente via UPDATE no purchaseId original existente (NUNCA INSERT).
   */
  const finishPurchase = (purchaseId: string): void => {
    const finishedAt = new Date().toISOString();
    let calculatedTotal = 0;

    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        if (p.status === 'finished') {
          calculatedTotal = calculatePurchaseTotal(p);
          return p;
        }
        const updated = {
          ...p,
          status: 'finished' as const,
          finishedAt: p.finishedAt || finishedAt,
        };
        calculatedTotal = calculatePurchaseTotal(updated);
        return updated;
      })
    );

    if (isSupabaseConfigured()) {
      // 1. Prepara payload estritamente com UPDATE no ID da compra existente
      // Status unificado estritamente como 'finished' (sem 'concluida')
      const updatePayload: any = {
        status: 'finished',
        finished_at: finishedAt,
        total_amount: calculatedTotal,
      };

      // Realiza estritamente um UPDATE na linha existente através do purchaseId original (NUNCA INSERT)
      supabase
        .from('purchases')
        .update(updatePayload)
        .eq('id', purchaseId)
        .then(async ({ error }) => {
          if (error) {
            console.warn('Tentativa com finished_at/total_amount retornou erro, tentando com completed_at ou payload alternativo:', error?.message || error);

            // Tenta com completed_at caso o banco utilize completed_at em vez de finished_at
            const { error: errCompletedAt } = await supabase
              .from('purchases')
              .update({
                status: 'finished',
                completed_at: finishedAt,
                total_amount: calculatedTotal,
              })
              .eq('id', purchaseId);

            if (errCompletedAt) {
              // Tenta apenas com finished_at sem total_amount (se total_amount não existir)
              const { error: errNoTotal } = await supabase
                .from('purchases')
                .update({
                  status: 'finished',
                  finished_at: finishedAt,
                })
                .eq('id', purchaseId);

              if (errNoTotal) {
                // Último fallback: apenas status 'finished'
                const { error: errOnlyStatus } = await supabase
                  .from('purchases')
                  .update({ status: 'finished' })
                  .eq('id', purchaseId);

                if (errOnlyStatus) {
                  console.error('DEBUG SUPABASE FINISH PURCHASE ERROR:', errOnlyStatus);
                } else {
                  console.log(`Compra ${purchaseId} finalizada com sucesso (apenas status 'finished').`);
                }
              } else {
                console.log(`Compra ${purchaseId} finalizada com sucesso (status: 'finished', finished_at).`);
              }
            } else {
              console.log(`Compra ${purchaseId} finalizada com sucesso (status: 'finished', completed_at, total_amount: ${calculatedTotal}).`);
            }
          } else {
            console.log(`Compra ${purchaseId} finalizada com sucesso (UPDATE no ID existente, status: 'finished', total_amount: ${calculatedTotal}).`);
          }
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
