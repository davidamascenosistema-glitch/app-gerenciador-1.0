import { useState, useEffect, useCallback, useRef } from 'react';
import { Item, Purchase } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import {
  calculatePurchaseTotal,
  sanitizeItemName,
  sanitizeItemCategory,
  validateItemQuantity,
  validateItemPrice,
} from '../utils/purchaseHelpers';

const STORAGE_KEY_PURCHASES = 'lista_e_compra_purchases_cache';

const isUUID = (str?: string): boolean =>
  Boolean(
    str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str))
  );

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
  const purchasesRef = useRef<Purchase[]>(purchases);
  const pendingPurchaseCreationsRef = useRef<Map<string, Promise<string>>>(new Map());

  const setPurchases = useCallback((action: Purchase[] | ((prev: Purchase[]) => Purchase[])) => {
    setPurchasesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      purchasesRef.current = next;
      saveLocalPurchases(next);
      return next;
    });
  }, []);

  // Garante persistência imediata no localStorage sempre que o estado purchases mudar
  useEffect(() => {
    purchasesRef.current = purchases;
    saveLocalPurchases(purchases);
  }, [purchases]);

  /**
   * Converte o item da tabela purchase_items do Supabase para a interface TypeScript Item
   */
  const mapDbItemToAppItem = (dbItem: any, fallbackSource?: Partial<Item>): Item => {
    const isWeighted =
      dbItem.is_weighted !== undefined && dbItem.is_weighted !== null
        ? Boolean(dbItem.is_weighted)
        : dbItem.isWeighted !== undefined && dbItem.isWeighted !== null
        ? Boolean(dbItem.isWeighted)
        : Boolean(fallbackSource?.isWeighted ?? false);

    const rawWeight =
      dbItem.weight !== undefined && dbItem.weight !== null
        ? Number(dbItem.weight)
        : fallbackSource?.weight !== undefined && fallbackSource?.weight !== null
        ? Number(fallbackSource.weight)
        : undefined;

    const rawPrice =
      dbItem.price !== undefined && dbItem.price !== null
        ? Number(dbItem.price)
        : fallbackSource?.price !== undefined && fallbackSource?.price !== null
        ? Number(fallbackSource.price)
        : undefined;

    return {
      id: String(dbItem.id || fallbackSource?.id || crypto.randomUUID()),
      name: dbItem.name || fallbackSource?.name || '',
      category: dbItem.category || fallbackSource?.category || 'Geral',
      quantity: Number(dbItem.quantity) || fallbackSource?.quantity || 1,
      weight: rawWeight,
      isWeighted,
      price: rawPrice && rawPrice > 0 ? rawPrice : undefined,
      bought:
        dbItem.bought !== undefined && dbItem.bought !== null
          ? Boolean(dbItem.bought)
          : Boolean(fallbackSource?.bought ?? false),
      pricingModeSource:
        dbItem.pricing_mode_source ??
        dbItem.pricingModeSource ??
        fallbackSource?.pricingModeSource ??
        null,
    };
  };

  /**
   * Converte a compra da tabela purchases do Supabase para a interface TypeScript Purchase
   */
  const mapDbPurchaseToAppPurchase = (dbPurchase: any, dbItems: any[] = []): Purchase => {
    const rawStatus = String(dbPurchase.status || '').toLowerCase().trim();
    const status: 'pending' | 'finished' =
      rawStatus === 'finished' || rawStatus === 'concluida' ? 'finished' : 'pending';
    const finishedAt =
      dbPurchase.finished_at || dbPurchase.completed_at || dbPurchase.finishedAt || undefined;

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
      items: dbItems.map((it) => mapDbItemToAppItem(it)),
    };
  };

  /**
   * Helper resiliente para inserir itens em lote (bulk insert único) ou individualmente na tabela `purchase_items`.
   * Inclui explicitamente o UUID v4 gerado no cliente (`id: item.id`) no payload para manter sincronia 1:1 com o estado React.
   * Tenta o payload completo: { id, purchase_id, name, category, quantity, price, is_weighted, weight, bought }.
   * Se houver erro de coluna inexistente (PGRST204 / 42703), faz fallback automático para:
   * { id, purchase_id, name, category, quantity, price, bought }.
   */
  const insertPurchaseItemsWithFallback = useCallback(
    async (currentPurchaseId: string, itemsToInsert: Item[]): Promise<Item[] | null> => {
      if (!isSupabaseConfigured() || itemsToInsert.length === 0) return null;

      // Se a compra pai ainda estiver sendo gravada no Supabase, aguarda a conclusão (Ordem Estrita Pai -> Filhos)
      let resolvedPurchaseId = currentPurchaseId;
      const pendingParent = pendingPurchaseCreationsRef.current.get(currentPurchaseId);
      if (pendingParent) {
        try {
          resolvedPurchaseId = await pendingParent;
        } catch {
          // fallback para currentPurchaseId
        }
      }

      const fullPayloads = itemsToInsert.map((item) => {
        const validId = isUUID(item.id) ? item.id : crypto.randomUUID();
        return {
          id: validId,
          purchase_id: resolvedPurchaseId,
          name: sanitizeItemName(item.name) || 'Item',
          category: sanitizeItemCategory(item.category, 'Geral'),
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          is_weighted: Boolean(item.isWeighted || (item as any).is_weighted),
          weight:
            item.weight !== undefined && item.weight !== null && !isNaN(Number(item.weight))
              ? Number(item.weight)
              : null,
          bought: Boolean(item.bought ?? false),
        };
      });

      let { data: insertedRows, error: insertErr } = await supabase
        .from('purchase_items')
        .insert(fullPayloads)
        .select();

      if (insertErr) {
        console.warn(
          'Fallback em purchase_items: tentando inserir colunas universais devido a erro de schema:',
          insertErr?.message || insertErr
        );
        const fallbackPayloads = itemsToInsert.map((item, idx) => ({
          id: fullPayloads[idx].id,
          purchase_id: resolvedPurchaseId,
          name: sanitizeItemName(item.name) || 'Item',
          category: sanitizeItemCategory(item.category, 'Geral'),
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          bought: Boolean(item.bought ?? false),
        }));

        const retryRes = await supabase
          .from('purchase_items')
          .insert(fallbackPayloads)
          .select();

        insertedRows = retryRes.data;
        insertErr = retryRes.error;

        // Se houve conflito de chave primária (ex: re-sincronização), tenta upsert
        if (insertErr && insertErr.code === '23505') {
          const upsertRes = await supabase
            .from('purchase_items')
            .upsert(fallbackPayloads, { onConflict: 'id' })
            .select();
          insertedRows = upsertRes.data;
          insertErr = upsertRes.error;
        }
      }

      if (insertErr) {
        console.error('Erro ao inserir itens na tabela purchase_items do Supabase:', insertErr);
        return null;
      }

      if (insertedRows && insertedRows.length > 0) {
        return insertedRows.map((row: any, idx: number) =>
          mapDbItemToAppItem(row, itemsToInsert[idx])
        );
      }

      return null;
    },
    []
  );

  /**
   * Carrega compras e itens do Supabase para o usuário logado,
   * protegendo itens salvos no localStorage contra sobrescrita vazia (auto-sync).
   */
  const fetchPurchasesFromSupabase = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) return;

    setLoading(true);
    try {
      const localPurchasesSnapshot = loadLocalPurchases();

      // 1. Busca as compras do usuário
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (purchasesError) {
        console.error(
          'Erro ao carregar compras do Supabase (mantendo cache local):',
          purchasesError
        );
        setLoading(false);
        return;
      }

      if (!purchasesData || purchasesData.length === 0) {
        if (localPurchasesSnapshot.length > 0) {
          setPurchases(localPurchasesSnapshot);
        }
        setLoading(false);
        return;
      }

      const purchaseIds = purchasesData.map((p) => p.id);

      // 2. Busca todos os purchase_items relacionados (ordenando em memória para não depender de created_at)
      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_items')
        .select('*')
        .in('purchase_id', purchaseIds);

      if (itemsError) {
        console.error('Erro ao carregar itens de purchase_items do Supabase:', itemsError);
      }

      const itemsByPurchaseId = new Map<string, any[]>();
      if (!itemsError && itemsData) {
        const sortedItems = [...itemsData].sort((a, b) => {
          if (a.created_at && b.created_at) {
            return String(a.created_at).localeCompare(String(b.created_at));
          }
          return 0;
        });

        sortedItems.forEach((item) => {
          const pid = String(item.purchase_id);
          const current = itemsByPurchaseId.get(pid) || [];
          current.push(item);
          itemsByPurchaseId.set(pid, current);
        });
      }

      const purchasesNeedingAutoSync: Array<{ purchaseId: string; localItems: Item[] }> = [];

      // 3. Monta a lista completa de compras com proteção de cache local
      const loadedPurchases: Purchase[] = purchasesData.map((p) => {
        const pIdStr = String(p.id);
        const matchedItems = itemsByPurchaseId.get(pIdStr) || [];
        const appPurchase = mapDbPurchaseToAppPurchase(p, matchedItems);

        const matchingLocal =
          localPurchasesSnapshot.find((loc) => String(loc.id) === pIdStr) ||
          purchasesRef.current.find((loc) => String(loc.id) === pIdStr);

        if (appPurchase.items.length === 0) {
          if (matchingLocal && matchingLocal.items && matchingLocal.items.length > 0) {
            const normalizedLocalItems = matchingLocal.items.map((locIt) => ({
              ...locIt,
              id: isUUID(locIt.id) ? locIt.id : crypto.randomUUID(),
            }));
            appPurchase.items = normalizedLocalItems;
            purchasesNeedingAutoSync.push({
              purchaseId: pIdStr,
              localItems: normalizedLocalItems,
            });
          }
        } else if (matchingLocal && matchingLocal.items && matchingLocal.items.length > 0) {
          // Preserva metadados locais (ex: isWeighted, weight, pricingModeSource) caso a tabela não tenha essas colunas
          appPurchase.items = appPurchase.items.map((dbIt) => {
            const localMatch = matchingLocal.items.find(
              (locIt) =>
                locIt.id === dbIt.id ||
                locIt.name.trim().toLowerCase() === dbIt.name.trim().toLowerCase()
            );
            if (!localMatch) return dbIt;
            return {
              ...dbIt,
              isWeighted: dbIt.isWeighted || Boolean(localMatch.isWeighted),
              weight: dbIt.weight ?? localMatch.weight,
              pricingModeSource: dbIt.pricingModeSource ?? localMatch.pricingModeSource ?? null,
            };
          });
        }

        return appPurchase;
      });

      setPurchases(loadedPurchases);

      // Auto-sync: reenvia itens preservados do localStorage para purchase_items no Supabase
      if (purchasesNeedingAutoSync.length > 0) {
        for (const { purchaseId, localItems } of purchasesNeedingAutoSync) {
          const syncedItems = await insertPurchaseItemsWithFallback(purchaseId, localItems);
          if (syncedItems && syncedItems.length > 0) {
            setPurchases((prev) =>
              prev.map((p) => (p.id === purchaseId ? { ...p, items: syncedItems } : p))
            );
          }
        }
      }
    } catch (err) {
      console.error('Exceção ao buscar compras do Supabase (mantendo cache local):', err);
    } finally {
      setLoading(false);
    }
  }, [userId, insertPurchaseItemsWithFallback, setPurchases]);

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
      .filter((p) => p.status === 'pending' && p.items && p.items.length > 0)
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
      prev.filter((p) => p.status === 'finished' || (p.items && p.items.length > 0))
    );

    if (isSupabaseConfigured() && emptyPurchases.length > 0 && userId) {
      const idsToDelete = emptyPurchases.map((p) => p.id);
      supabase
        .from('purchase_items')
        .delete()
        .in('purchase_id', idsToDelete)
        .then(() => {
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
      return prev.filter((p) => p.status !== 'pending');
    });

    if (isSupabaseConfigured()) {
      if (purchaseId) {
        supabase
          .from('purchase_items')
          .delete()
          .eq('purchase_id', purchaseId)
          .then(() => {
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
              supabase
                .from('purchase_items')
                .delete()
                .in('purchase_id', ids)
                .then(() => {
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
      supabase
        .from('purchase_items')
        .delete()
        .eq('purchase_id', id)
        .then(() => {
          supabase.from('purchases').delete().eq('id', id).then();
        });
    }
  };

  /**
   * Cria e armazena uma nova compra a partir de um modelo existente (compra finalizada),
   * clonando todos os itens com novos UUIDs v4 gerados no cliente e bought=false.
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
   * Cria e armazena uma nova compra no Supabase e no estado em memória.
   * Garante ordem estrita Pai -> Filhos: aguarda o insert na tabela `purchases`
   * antes de disparar o bulk insert único na tabela `purchase_items`.
   */
  const createPurchase = (
    purchaseData: Omit<Purchase, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Purchase => {
    const origin = 'list';
    const newPurchaseId = isUUID(purchaseData.id) ? purchaseData.id! : crypto.randomUUID();
    const createdAt = purchaseData.createdAt || new Date().toISOString();

    // Gera sempre um novo UUID v4 válido no cliente para cada item da compra
    const initialItems: Item[] = (purchaseData.items || []).map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      name: sanitizeItemName(item.name) || 'Item',
      category: sanitizeItemCategory(item.category, 'Geral'),
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      weight:
        item.weight !== undefined && item.weight !== null && !isNaN(Number(item.weight))
          ? Number(item.weight)
          : Boolean(item.isWeighted)
          ? Number(item.quantity) || 1
          : undefined,
      isWeighted: Boolean(item.isWeighted || (item as any).is_weighted),
      price: item.price != null && Number(item.price) > 0 ? Number(item.price) : undefined,
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

    // Atualiza estado local e localStorage imediatamente
    setPurchases((prev) => [newPurchase, ...prev.filter((p) => p.id !== newPurchaseId)]);

    if (isSupabaseConfigured() && userId) {
      const parentCreationPromise = (async (): Promise<string> => {
        try {
          const validFromListId = isUUID(newPurchase.fromListId) ? newPurchase.fromListId : null;
          let actualPurchaseId = newPurchase.id;

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

          // 1. Insere e aguarda a compra pai na tabela purchases ANTES de inserir itens filhos
          let { data: insertedPurchase, error: pError } = await supabase
            .from('purchases')
            .insert(purchasePayload)
            .select('id');

          if (pError && (pError.code === 'PGRST204' || pError.code === '42703')) {
            const minimalPayload: any = {
              id: newPurchase.id,
              user_id: userId,
              name: newPurchase.name,
              status: 'pending',
            };
            const retryMin = await supabase
              .from('purchases')
              .insert(minimalPayload)
              .select('id');
            insertedPurchase = retryMin.data;
            pError = retryMin.error;

            if (pError && (pError.code === 'PGRST204' || pError.code === '42703')) {
              const retryUltra = await supabase
                .from('purchases')
                .insert({ id: newPurchase.id, user_id: userId })
                .select('id');
              insertedPurchase = retryUltra.data;
              pError = retryUltra.error;
            }
          }

          if (pError && pError.code === '23503' && purchasePayload.from_list_id) {
            const retryPayload = { ...purchasePayload, from_list_id: null };
            const retryFk = await supabase
              .from('purchases')
              .insert(retryPayload)
              .select('id');
            insertedPurchase = retryFk.data;
            pError = retryFk.error;
          }

          if (pError) {
            console.error('Erro ao inserir compra na tabela purchases do Supabase:', pError);
            return actualPurchaseId;
          }

          if (insertedPurchase && insertedPurchase[0]?.id) {
            actualPurchaseId = String(insertedPurchase[0].id);
            if (actualPurchaseId !== newPurchase.id) {
              setPurchases((prev) =>
                prev.map((p) => (p.id === newPurchase.id ? { ...p, id: actualPurchaseId } : p))
              );
              newPurchase.id = actualPurchaseId;
            }
          }

          return actualPurchaseId;
        } catch (dbErr) {
          console.error('Exceção na criação da compra pai no Supabase:', dbErr);
          return newPurchase.id;
        }
      })();

      pendingPurchaseCreationsRef.current.set(newPurchaseId, parentCreationPromise);

      (async () => {
        try {
          const actualPurchaseId = await parentCreationPromise;
          pendingPurchaseCreationsRef.current.delete(newPurchaseId);

          // 2. Cópia em lote (bulk insert único) dos itens para purchase_items após confirmação do pai
          let itemsToInsert: Item[] = [...initialItems];

          if (itemsToInsert.length === 0 && newPurchase.fromListId) {
            const { data: listItemsData, error: fetchItemsErr } = await supabase
              .from('list_items')
              .select('*')
              .eq('list_id', newPurchase.fromListId);

            if (!fetchItemsErr && listItemsData && listItemsData.length > 0) {
              itemsToInsert = listItemsData.map((li: any) => ({
                id: crypto.randomUUID(),
                name: sanitizeItemName(li.name) || 'Item',
                category: sanitizeItemCategory(li.category, 'Geral'),
                quantity: Number(li.quantity) || 1,
                weight: li.weight != null ? Number(li.weight) : undefined,
                isWeighted: Boolean(li.is_weighted ?? li.isWeighted ?? false),
                price: undefined,
                bought: false,
              }));

              setPurchases((prev) =>
                prev.map((p) =>
                  p.id === actualPurchaseId ? { ...p, items: itemsToInsert } : p
                )
              );
            }
          }

          if (itemsToInsert.length > 0) {
            const syncedItems = await insertPurchaseItemsWithFallback(
              actualPurchaseId,
              itemsToInsert
            );

            if (syncedItems && syncedItems.length > 0) {
              newPurchase.items = syncedItems;
              setPurchases((prev) =>
                prev.map((p) =>
                  p.id === actualPurchaseId ? { ...p, items: syncedItems } : p
                )
              );
            }
          }
        } catch (childErr) {
          pendingPurchaseCreationsRef.current.delete(newPurchaseId);
          console.error('Exceção ao sincronizar itens iniciais da compra no Supabase:', childErr);
        }
      })();
    }

    return newPurchase;
  };

  /**
   * Cria uma nova compra a partir de um molde de lista existente
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
   * Adiciona múltiplos itens de uma só vez (Bulk Insert Único) para dentro de uma compra ativa
   * na tabela `purchase_items` do Supabase, usando UUIDs v4 gerados no cliente.
   */
  const addItemsBatchToPurchase = useCallback(
    async (
      purchaseId: string,
      itemsToBatch: Array<Omit<Item, 'id' | 'bought'> & { id?: string; bought?: boolean }>
    ): Promise<void> => {
      if (!purchaseId || !itemsToBatch || itemsToBatch.length === 0) return;

      const preparedItems: Item[] = [];
      for (const rawItem of itemsToBatch) {
        const safeName = sanitizeItemName(rawItem.name);
        if (!safeName) continue;

        const safeCategory = sanitizeItemCategory(rawItem.category, 'Geral');
        const safeQuantity = validateItemQuantity(rawItem.quantity, 1);
        const isWeighted = Boolean(rawItem.isWeighted || (rawItem as any).is_weighted);
        const safeWeight =
          rawItem.weight !== undefined && rawItem.weight !== null
            ? validateItemQuantity(rawItem.weight, 1)
            : isWeighted
            ? safeQuantity
            : undefined;
        const safePrice = validateItemPrice(rawItem.price);

        preparedItems.push({
          id: crypto.randomUUID(),
          name: safeName,
          category: safeCategory,
          quantity: safeQuantity,
          weight: safeWeight,
          isWeighted,
          price: safePrice,
          bought: Boolean(rawItem.bought ?? false),
          pricingModeSource: rawItem.pricingModeSource ?? null,
        });
      }

      if (preparedItems.length === 0) return;

      // 1. Atualiza imediatamente o estado React e o localStorage de uma só vez
      setPurchases((prev) =>
        prev.map((p) => {
          if (p.id !== purchaseId) return p;
          return {
            ...p,
            items: [...p.items, ...preparedItems],
          };
        })
      );

      // 2. Faz 1 único comando .insert(payloadArray) na tabela purchase_items do Supabase
      if (isSupabaseConfigured()) {
        try {
          const syncedItems = await insertPurchaseItemsWithFallback(purchaseId, preparedItems);
          if (syncedItems && syncedItems.length > 0) {
            const batchIds = new Set(preparedItems.map((it) => it.id));
            setPurchases((prev) =>
              prev.map((p) => {
                if (p.id !== purchaseId) return p;
                let replaceIdx = 0;
                return {
                  ...p,
                  items: p.items.map((it) => {
                    if (batchIds.has(it.id) && syncedItems[replaceIdx]) {
                      const official = syncedItems[replaceIdx++];
                      return { ...it, ...official, id: official.id };
                    }
                    return it;
                  }),
                };
              })
            );
          }
        } catch (err) {
          console.error('Exceção ao inserir lote de itens em purchase_items no Supabase:', err);
        }
      }
    },
    [insertPurchaseItemsWithFallback, setPurchases]
  );

  // Mantém importItemsToPurchase como alias direto para compatibilidade
  const importItemsToPurchase = addItemsBatchToPurchase;

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
      supabase
        .from('purchases')
        .update({ name: trimmed })
        .eq('id', purchaseId)
        .then(({ error }) => {
          if (error) console.error('Erro ao atualizar nome da compra no Supabase:', error);
        });
    }
  };

  /**
   * Adiciona um novo item à tabela purchase_items usando UUID v4 gerado no cliente
   */
  const addItemToPurchase = (
    purchaseId: string,
    itemData: Omit<Item, 'id' | 'bought'> & { id?: string; bought?: boolean }
  ): void => {
    const safeName = sanitizeItemName(itemData.name);
    if (!safeName) return;

    const safeCategory = sanitizeItemCategory(itemData.category, 'Geral');
    const safeQuantity = validateItemQuantity(itemData.quantity, 1);
    const isWeighted = Boolean(itemData.isWeighted);
    const safeWeight =
      itemData.weight !== undefined && itemData.weight !== null
        ? validateItemQuantity(itemData.weight, 1)
        : isWeighted
        ? safeQuantity
        : undefined;
    const safePrice = validateItemPrice(itemData.price);
    const clientItemId = isUUID(itemData.id) ? itemData.id! : crypto.randomUUID();

    const defaultBought = itemData.bought !== undefined ? Boolean(itemData.bought) : false;
    const newItem: Item = {
      id: clientItemId,
      name: safeName,
      category: safeCategory,
      quantity: safeQuantity,
      weight: safeWeight,
      isWeighted,
      price: safePrice,
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

    if (isSupabaseConfigured()) {
      insertPurchaseItemsWithFallback(purchaseId, [newItem])
        .then((insertedItems) => {
          if (insertedItems && insertedItems[0]?.id) {
            const official = insertedItems[0];
            setPurchases((prev) =>
              prev.map((p) => {
                if (p.id !== purchaseId) return p;
                return {
                  ...p,
                  items: p.items.map((it) =>
                    it.id === clientItemId ? { ...it, ...official, id: official.id } : it
                  ),
                };
              })
            );
          }
        })
        .catch((err) => {
          console.error('Exceção ao inserir item em purchase_items no Supabase:', err);
        });
    }
  };

  /**
   * Edita um item existente na tabela purchase_items e no estado com fallback de colunas
   */
  const editItemInPurchase = (
    purchaseId: string,
    itemId: string,
    updatedData: Partial<Omit<Item, 'id'>>
  ): void => {
    const sanitizedUpdates: Partial<Omit<Item, 'id'>> = { ...updatedData };

    if (updatedData.name !== undefined) {
      const safeName = sanitizeItemName(updatedData.name);
      if (safeName) {
        sanitizedUpdates.name = safeName;
      } else {
        delete sanitizedUpdates.name;
      }
    }
    if (updatedData.category !== undefined) {
      sanitizedUpdates.category = sanitizeItemCategory(updatedData.category, 'Geral');
    }
    if (updatedData.quantity !== undefined) {
      sanitizedUpdates.quantity = validateItemQuantity(updatedData.quantity, 1);
    }
    if (updatedData.weight !== undefined) {
      sanitizedUpdates.weight =
        updatedData.weight != null ? validateItemQuantity(updatedData.weight, 1) : undefined;
    }
    if ('price' in updatedData) {
      sanitizedUpdates.price = validateItemPrice(updatedData.price);
    }

    let updatedItemSnapshot: Item | null = null;

    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;
        return {
          ...p,
          items: p.items.map((item) => {
            if (item.id !== itemId) return item;
            const merged = { ...item, ...sanitizedUpdates };
            updatedItemSnapshot = merged;
            return merged;
          }),
        };
      })
    );

    if (isSupabaseConfigured()) {
      if (!isUUID(itemId) && updatedItemSnapshot) {
        insertPurchaseItemsWithFallback(purchaseId, [updatedItemSnapshot]).then((inserted) => {
          if (inserted && inserted[0]?.id) {
            const official = inserted[0];
            setPurchases((prev) =>
              prev.map((p) => {
                if (p.id !== purchaseId) return p;
                return {
                  ...p,
                  items: p.items.map((it) =>
                    it.id === itemId ? { ...it, ...official, id: official.id } : it
                  ),
                };
              })
            );
          }
        });
        return;
      }

      const dbUpdate: any = {};
      if (sanitizedUpdates.name !== undefined) dbUpdate.name = sanitizedUpdates.name;
      if (sanitizedUpdates.category !== undefined) dbUpdate.category = sanitizedUpdates.category;
      if (sanitizedUpdates.quantity !== undefined) dbUpdate.quantity = sanitizedUpdates.quantity;
      if ('weight' in updatedData) {
        dbUpdate.weight = sanitizedUpdates.weight != null ? sanitizedUpdates.weight : null;
      }
      if (sanitizedUpdates.isWeighted !== undefined) {
        dbUpdate.is_weighted = Boolean(sanitizedUpdates.isWeighted);
      }
      if ('price' in updatedData) {
        dbUpdate.price = sanitizedUpdates.price != null ? sanitizedUpdates.price : 0;
      }
      if (sanitizedUpdates.bought !== undefined) {
        dbUpdate.bought = Boolean(sanitizedUpdates.bought);
      }

      if (Object.keys(dbUpdate).length > 0) {
        (async () => {
          const pendingParent = pendingPurchaseCreationsRef.current.get(purchaseId);
          if (pendingParent) {
            try {
              await pendingParent;
            } catch {
              // ignore
            }
          }

          const { error } = await supabase
            .from('purchase_items')
            .update(dbUpdate)
            .eq('id', itemId);

          if (error) {
            const { is_weighted, weight, ...minimalUpdate } = dbUpdate;
            if (Object.keys(minimalUpdate).length > 0) {
              const { error: retryErr } = await supabase
                .from('purchase_items')
                .update(minimalUpdate)
                .eq('id', itemId);
              if (retryErr) {
                console.error('Erro ao atualizar item em purchase_items no Supabase:', retryErr);
              }
            }
          }
        })();
      }
    }
  };

  /**
   * Remove um item da tabela purchase_items e do estado
   */
  const removeItemFromPurchase = (purchaseId: string, itemId: string): void => {
    const itemToRemove = purchasesRef.current
      .find((p) => p.id === purchaseId)
      ?.items.find((i) => i.id === itemId);

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
      if (isUUID(itemId)) {
        supabase
          .from('purchase_items')
          .delete()
          .eq('id', itemId)
          .then(({ error }) => {
            if (error) console.error('Erro ao remover item de purchase_items no Supabase:', error);
          });
      } else if (itemToRemove?.name) {
        supabase
          .from('purchase_items')
          .delete()
          .eq('purchase_id', purchaseId)
          .eq('name', itemToRemove.name)
          .then(({ error }) => {
            if (error) console.error('Erro ao remover item de purchase_items:', error);
          });
      }
    }
  };

  /**
   * Alterna o estado de 'comprado' de um item
   */
  const toggleItemBought = (purchaseId: string, itemId: string): void => {
    let newBoughtVal = false;
    let toggledItemSnapshot: Item | null = null;

    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id !== purchaseId) return p;

        const updatedItems = p.items.map((item) => {
          if (item.id === itemId) {
            newBoughtVal = !item.bought;
            const updated = { ...item, bought: newBoughtVal };
            toggledItemSnapshot = updated;
            return updated;
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
      if (!isUUID(itemId) && toggledItemSnapshot) {
        insertPurchaseItemsWithFallback(purchaseId, [toggledItemSnapshot]).then((inserted) => {
          if (inserted && inserted[0]?.id) {
            const official = inserted[0];
            setPurchases((prev) =>
              prev.map((p) => {
                if (p.id !== purchaseId) return p;
                return {
                  ...p,
                  items: p.items.map((it) =>
                    it.id === itemId ? { ...it, ...official, id: official.id } : it
                  ),
                };
              })
            );
          }
        });
        return;
      }

      (async () => {
        const pendingParent = pendingPurchaseCreationsRef.current.get(purchaseId);
        if (pendingParent) {
          try {
            await pendingParent;
          } catch {
            // ignore
          }
        }

        const { error } = await supabase
          .from('purchase_items')
          .update({ bought: newBoughtVal })
          .eq('id', itemId);

        if (error) {
          console.error('Erro ao alternar status comprado em purchase_items:', error);
        }
      })();
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
      const updatePayload: any = {
        status: 'finished',
        finished_at: finishedAt,
        total_amount: calculatedTotal,
      };

      supabase
        .from('purchases')
        .update(updatePayload)
        .eq('id', purchaseId)
        .then(async ({ error }) => {
          if (error) {
            const { error: errCompletedAt } = await supabase
              .from('purchases')
              .update({
                status: 'finished',
                completed_at: finishedAt,
                total_amount: calculatedTotal,
              })
              .eq('id', purchaseId);

            if (errCompletedAt) {
              const { error: errNoTotal } = await supabase
                .from('purchases')
                .update({
                  status: 'finished',
                  finished_at: finishedAt,
                })
                .eq('id', purchaseId);

              if (errNoTotal) {
                const { error: errOnlyStatus } = await supabase
                  .from('purchases')
                  .update({ status: 'finished' })
                  .eq('id', purchaseId);

                if (errOnlyStatus) {
                  console.error('Erro ao finalizar compra no Supabase:', errOnlyStatus);
                }
              }
            }
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
    addItemsBatchToPurchase,
    importItemsToPurchase,
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
