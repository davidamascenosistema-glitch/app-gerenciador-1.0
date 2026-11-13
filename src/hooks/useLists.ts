import { useState, useEffect, useCallback, useRef } from 'react';
import { List, ListItem, CreateListParams } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import {
  sanitizeItemName,
  sanitizeItemCategory,
  validateItemQuantity,
} from '../utils/purchaseHelpers';

const LOCAL_STORAGE_KEY = 'lista_e_compra_template_lists';

const INITIAL_STARTER_LISTS: List[] = [];

const loadLocalLists = (): List[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (l: List) => l.id !== 'template-basico-mes' && l.id !== 'template-feira-semanal'
        );
      }
    }
  } catch (e) {
    console.warn('Erro ao ler listas do localStorage:', e);
  }
  return INITIAL_STARTER_LISTS;
};

const saveToLocal = (newLists: List[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newLists));
  } catch (e) {
    console.warn('Erro ao salvar listas no localStorage:', e);
  }
};

const isValidUUID = (val?: string): boolean =>
  Boolean(
    val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  );

export function useLists(userId?: string | null) {
  const [lists, setListsState] = useState<List[]>(loadLocalLists);
  const [loading, setLoading] = useState<boolean>(false);
  const listsRef = useRef<List[]>(lists);
  const pendingListCreationsRef = useRef<Map<string, Promise<string>>>(new Map());

  const setLists = useCallback((action: List[] | ((prev: List[]) => List[])) => {
    setListsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      listsRef.current = next;
      saveToLocal(next);
      return next;
    });
  }, []);

  useEffect(() => {
    listsRef.current = lists;
    saveToLocal(lists);
  }, [lists]);

  /**
   * Converte db list item para ListItem
   */
  const mapDbListItemToAppItem = (dbItem: any, fallbackSource?: Partial<ListItem>): ListItem => {
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

    return {
      id: String(dbItem.id || fallbackSource?.id || crypto.randomUUID()),
      listId: dbItem.list_id ? String(dbItem.list_id) : fallbackSource?.listId,
      name: dbItem.name || fallbackSource?.name || '',
      category: dbItem.category || fallbackSource?.category || 'Geral',
      quantity: Number(dbItem.quantity) || fallbackSource?.quantity || 1,
      weight: rawWeight,
      isWeighted,
      pricingModeSource:
        dbItem.pricing_mode_source ??
        dbItem.pricingModeSource ??
        fallbackSource?.pricingModeSource ??
        null,
    };
  };

  /**
   * Converte db list para List
   */
  const mapDbListToAppList = (dbList: any, dbItems: any[] = []): List => {
    return {
      id: String(dbList.id),
      name: dbList.name || 'Nova Lista',
      createdAt: dbList.created_at || dbList.createdAt || new Date().toISOString(),
      updatedAt: dbList.updated_at || dbList.updatedAt || undefined,
      items: dbItems.map((it) => mapDbListItemToAppItem(it)),
    };
  };

  /**
   * Helper resiliente para inserir itens em lote ou individualmente em `list_items` no Supabase.
   * Inclui explicitamente o UUID v4 gerado no cliente (`id: item.id`) para que o estado do React
   * e o banco compartilhem exatamente o mesmo ID desde o primeiro milissegundo.
   */
  const insertListItemsWithFallback = useCallback(
    async (targetListId: string, itemsToInsert: ListItem[]): Promise<ListItem[] | null> => {
      if (!isSupabaseConfigured() || itemsToInsert.length === 0) return null;

      // Aguarda caso a lista pai ainda esteja sendo gravada na tabela `lists`
      const pendingParent = pendingListCreationsRef.current.get(targetListId);
      const resolvedListId = pendingParent ? await pendingParent : targetListId;

      const normalizedItems = itemsToInsert.map((item) => ({
        ...item,
        id: isValidUUID(item.id) ? item.id : crypto.randomUUID(),
        listId: resolvedListId,
      }));

      const fullPayloads = normalizedItems.map((item) => ({
        id: item.id,
        list_id: resolvedListId,
        name: sanitizeItemName(item.name) || 'Item',
        category: sanitizeItemCategory(item.category, 'Geral'),
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        is_weighted: Boolean(item.isWeighted),
        weight:
          item.weight !== undefined && item.weight !== null && !isNaN(Number(item.weight))
            ? Number(item.weight)
            : Boolean(item.isWeighted)
            ? Number(item.quantity) || 1
            : null,
      }));

      let { data: insertedRows, error: insertErr } = await supabase
        .from('list_items')
        .insert(fullPayloads)
        .select();

      if (insertErr) {
        console.warn(
          'Fallback em list_items: tentando inserir colunas básicas com UUID do cliente (id, list_id, name, category, quantity):',
          insertErr?.message || insertErr
        );
        const minimalPayloads = normalizedItems.map((item) => ({
          id: item.id,
          list_id: resolvedListId,
          name: sanitizeItemName(item.name) || 'Item',
          category: sanitizeItemCategory(item.category, 'Geral'),
          quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        }));

        const retryRes = await supabase
          .from('list_items')
          .insert(minimalPayloads)
          .select();

        insertedRows = retryRes.data;
        insertErr = retryRes.error;
      }

      if (insertErr) {
        // Último fallback caso algum ID já exista (upsert)
        const minimalPayloads = normalizedItems.map((item) => ({
          id: item.id,
          list_id: resolvedListId,
          name: sanitizeItemName(item.name) || 'Item',
          category: sanitizeItemCategory(item.category, 'Geral'),
          quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        }));
        const upsertRes = await supabase
          .from('list_items')
          .upsert(minimalPayloads, { onConflict: 'id' })
          .select();

        if (upsertRes.error) {
          console.error('Erro ao inserir itens na tabela list_items do Supabase:', insertErr);
          return null;
        }
        insertedRows = upsertRes.data;
      }

      if (insertedRows && insertedRows.length > 0) {
        return insertedRows.map((row: any, idx: number) =>
          mapDbListItemToAppItem(row, normalizedItems[idx])
        );
      }

      return normalizedItems;
    },
    []
  );

  /**
   * Busca as listas e itens da tabela 'lists' e 'list_items' no Supabase
   * com proteção contra sobrescrita vazia do localStorage (auto-sync).
   */
  const fetchListsFromSupabase = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) return;

    setLoading(true);
    try {
      const localListsSnapshot = loadLocalLists();

      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (listsError) {
        console.error(
          'Erro ao sincronizar listas no Supabase (mantendo cache local):',
          listsError
        );
        setLoading(false);
        return;
      }

      if (!listsData || listsData.length === 0) {
        if (localListsSnapshot.length > 0) {
          setLists(localListsSnapshot);
        } else {
          setLists([]);
        }
        setLoading(false);
        return;
      }

      const listIds = listsData.map((l) => l.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from('list_items')
        .select('*')
        .in('list_id', listIds);

      if (itemsError) {
        console.error('Erro ao buscar itens em list_items no Supabase:', itemsError);
      }

      const itemsByListId = new Map<string, any[]>();
      if (!itemsError && itemsData) {
        const sortedItems = [...itemsData].sort((a, b) => {
          if (a.created_at && b.created_at) {
            return String(a.created_at).localeCompare(String(b.created_at));
          }
          return 0;
        });

        sortedItems.forEach((item) => {
          const lid = String(item.list_id);
          const current = itemsByListId.get(lid) || [];
          current.push(item);
          itemsByListId.set(lid, current);
        });
      }

      const listsNeedingAutoSync: Array<{ listId: string; localItems: ListItem[] }> = [];

      const loadedLists: List[] = listsData.map((dbList) => {
        const dbListId = String(dbList.id);
        const dbItemsForList = itemsByListId.get(dbListId) || [];
        const appList = mapDbListToAppList(dbList, dbItemsForList);

        const matchingLocal =
          localListsSnapshot.find((loc) => String(loc.id) === dbListId) ||
          listsRef.current.find((loc) => String(loc.id) === dbListId);

        // Proteção contra apagamento: se o banco trouxe 0 itens mas o localStorage tem itens para esta lista
        if (appList.items.length === 0) {
          if (matchingLocal && matchingLocal.items && matchingLocal.items.length > 0) {
            appList.items = matchingLocal.items.map((it) => ({
              ...it,
              id: isValidUUID(it.id) ? it.id : crypto.randomUUID(),
              listId: dbListId,
            }));
            listsNeedingAutoSync.push({
              listId: dbListId,
              localItems: appList.items,
            });
          }
        } else if (matchingLocal && matchingLocal.items && matchingLocal.items.length > 0) {
          appList.items = appList.items.map((dbIt) => {
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

        return appList;
      });

      setLists(loadedLists);

      // Auto-sync: reenvia automaticamente para o Supabase quaisquer listas que estavam vazias no banco mas tinham itens no localStorage
      if (listsNeedingAutoSync.length > 0) {
        for (const { listId, localItems } of listsNeedingAutoSync) {
          const syncedItems = await insertListItemsWithFallback(listId, localItems);
          if (syncedItems && syncedItems.length > 0) {
            setLists((prev) =>
              prev.map((l) => (l.id === listId ? { ...l, items: syncedItems } : l))
            );
          }
        }
      }
    } catch (err) {
      console.error('Exceção ao buscar listas do Supabase (mantendo cache local):', err);
    } finally {
      setLoading(false);
    }
  }, [userId, insertListItemsWithFallback, setLists]);

  useEffect(() => {
    if (userId && isSupabaseConfigured()) {
      fetchListsFromSupabase();
    }
  }, [userId, fetchListsFromSupabase]);

  /**
   * Cria uma nova lista planejada com UUID v4 gerado no cliente e ordem estrita Pai -> Filhos
   */
  const createList = async (params: CreateListParams | string): Promise<List> => {
    const rawName = typeof params === 'string' ? params : (params?.name || '');
    const listName = rawName.trim();
    if (!listName) {
      throw new Error('O nome da lista é obrigatório.');
    }
    const finalName = listName;
    const initialItems = typeof params === 'object' && params.items ? params.items : [];

    const newListId = crypto.randomUUID();
    const now = new Date().toISOString();

    const formattedItems: ListItem[] = initialItems.map((item) => ({
      id: isValidUUID((item as any).id) ? (item as any).id : crypto.randomUUID(),
      listId: newListId,
      name: item.name ? item.name.trim() : 'Item',
      category: item.category || 'Geral',
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      weight: item.weight != null && !isNaN(Number(item.weight)) ? Number(item.weight) : undefined,
      isWeighted: Boolean(item.isWeighted),
      pricingModeSource: (item as any).pricingModeSource ?? null,
    }));

    const newList: List = {
      id: newListId,
      name: finalName,
      createdAt: now,
      items: formattedItems,
    };

    setLists((prev) => [newList, ...prev]);

    if (isSupabaseConfigured() && userId) {
      const parentCreationPromise = (async (): Promise<string> => {
        try {
          let actualId: string = newListId;

          // 1. Grava primeiro na tabela pai `lists` com o UUID gerado no cliente
          const { data: insertedWithId, error: errWithId } = await supabase
            .from('lists')
            .insert({
              id: newListId,
              name: finalName,
              user_id: userId,
            })
            .select('id');

          if (!errWithId && insertedWithId && insertedWithId[0]?.id) {
            actualId = String(insertedWithId[0].id);
          } else {
            const { data: insertedWithoutId, error: errWithoutId } = await supabase
              .from('lists')
              .insert({
                name: finalName,
                user_id: userId,
              })
              .select('id');

            if (!errWithoutId && insertedWithoutId && insertedWithoutId[0]?.id) {
              actualId = String(insertedWithoutId[0].id);
            } else {
              console.error(
                'Erro ao criar lista na tabela lists do Supabase:',
                errWithoutId || errWithId
              );
            }
          }

          if (actualId !== newListId) {
            newList.id = actualId;
            formattedItems.forEach((it) => {
              it.listId = actualId;
            });
            setLists((prev) =>
              prev.map((l) => (l.id === newListId ? { ...newList, id: actualId } : l))
            );
          }

          return actualId;
        } finally {
          pendingListCreationsRef.current.delete(newListId);
        }
      })();

      pendingListCreationsRef.current.set(newListId, parentCreationPromise);

      try {
        // 2. Aguarda obrigatoriamente a gravação na tabela pai `lists` antes de inserir os itens em `list_items`
        const actualId = await parentCreationPromise;

        if (formattedItems.length > 0) {
          const syncedItems = await insertListItemsWithFallback(actualId, formattedItems);
          if (syncedItems && syncedItems.length > 0) {
            newList.items = syncedItems;
            setLists((prev) =>
              prev.map((l) => (l.id === actualId ? { ...l, items: syncedItems } : l))
            );
          }
        }
      } catch (err) {
        console.error('Exceção ao salvar lista e itens no Supabase:', err);
      }
    }

    return newList;
  };

  /**
   * Exclui uma lista planejada
   */
  const deleteList = async (id: string): Promise<void> => {
    setLists((prev) => prev.filter((l) => l.id !== id));

    if (isSupabaseConfigured()) {
      try {
        const { error: itemsDelErr } = await supabase.from('list_items').delete().eq('list_id', id);
        if (itemsDelErr) console.error('Erro ao excluir itens da lista no Supabase:', itemsDelErr);
        const { error: listDelErr } = await supabase.from('lists').delete().eq('id', id);
        if (listDelErr) console.error('Erro ao excluir lista no Supabase:', listDelErr);
      } catch (err) {
        console.error('Exceção ao deletar lista no Supabase:', err);
      }
    }
  };

  /**
   * Atualiza o nome de uma lista
   */
  const updateListName = async (id: string, newName: string): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: trimmed } : l)));

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('lists').update({ name: trimmed }).eq('id', id);
        if (error) console.error('Erro ao renomear lista no Supabase:', error);
      } catch (err) {
        console.error('Exceção ao renomear lista no Supabase:', err);
      }
    }
  };

  /**
   * Adiciona um item individual a uma lista existente usando UUID v4 gerado no cliente
   */
  const addItemToList = async (
    listId: string,
    itemData: Omit<ListItem, 'id'> & { id?: string }
  ): Promise<void> => {
    const safeName = sanitizeItemName(itemData.name);
    if (!safeName) return;
    const safeCategory = sanitizeItemCategory(itemData.category, 'Geral');

    const newItemId = isValidUUID(itemData.id) ? itemData.id! : crypto.randomUUID();
    const isWeighted = Boolean(itemData.isWeighted);

    let parsedWeight: number | undefined = undefined;
    if (itemData.weight !== undefined && itemData.weight !== null) {
      parsedWeight = validateItemQuantity(itemData.weight, 1);
    } else if (isWeighted) {
      parsedWeight = validateItemQuantity(itemData.quantity, 1);
    }

    const validQty = Math.max(1, Math.round(validateItemQuantity(itemData.quantity, 1)));

    const newItem: ListItem = {
      id: newItemId,
      listId,
      name: safeName,
      category: safeCategory,
      quantity: validQty,
      isWeighted,
      weight: isWeighted ? (parsedWeight ?? 1) : parsedWeight,
      pricingModeSource: itemData.pricingModeSource ?? null,
    };

    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: [...l.items, newItem],
        };
      })
    );

    if (isSupabaseConfigured()) {
      try {
        const insertedItems = await insertListItemsWithFallback(listId, [newItem]);
        if (insertedItems && insertedItems[0]?.id && insertedItems[0].id !== newItemId) {
          const officialItem = insertedItems[0];
          setLists((prev) =>
            prev.map((l) => {
              if (l.id !== listId) return l;
              return {
                ...l,
                items: l.items.map((it) =>
                  it.id === newItemId ? { ...it, ...officialItem, id: officialItem.id } : it
                ),
              };
            })
          );
        }
      } catch (err) {
        console.error('Exceção ao inserir item em list_items no Supabase:', err);
      }
    }
  };

  /**
   * Adiciona múltiplos itens em lote a uma lista existente com 1 único bulk insert em `list_items`
   * e UUIDs v4 gerados no cliente.
   */
  const addItemsBatchToList = async (
    listId: string,
    itemsData: Array<Omit<ListItem, 'id'> & { id?: string }>
  ): Promise<void> => {
    if (!itemsData || itemsData.length === 0) return;

    const preparedItems: ListItem[] = [];
    for (const itemData of itemsData) {
      const safeName = sanitizeItemName(itemData.name);
      if (!safeName) continue;
      const safeCategory = sanitizeItemCategory(itemData.category, 'Geral');
      const isWeighted = Boolean(itemData.isWeighted);
      const validQty = Math.max(1, Math.round(validateItemQuantity(itemData.quantity, 1)));
      const parsedWeight =
        itemData.weight !== undefined && itemData.weight !== null
          ? validateItemQuantity(itemData.weight, 1)
          : isWeighted
          ? validQty
          : undefined;

      preparedItems.push({
        id: isValidUUID(itemData.id) ? itemData.id! : crypto.randomUUID(),
        listId,
        name: safeName,
        category: safeCategory,
        quantity: validQty,
        isWeighted,
        weight: isWeighted ? (parsedWeight ?? 1) : parsedWeight,
        pricingModeSource: itemData.pricingModeSource ?? null,
      });
    }

    if (preparedItems.length === 0) return;

    // Atualiza o estado do React e localStorage de uma só vez
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: [...l.items, ...preparedItems],
        };
      })
    );

    // Faz 1 único comando bulk insert no Supabase
    if (isSupabaseConfigured()) {
      try {
        const insertedItems = await insertListItemsWithFallback(listId, preparedItems);
        if (insertedItems && insertedItems.length > 0) {
          const clientIds = preparedItems.map((p) => p.id);
          setLists((prev) =>
            prev.map((l) => {
              if (l.id !== listId) return l;
              return {
                ...l,
                items: l.items.map((it) => {
                  const idx = clientIds.indexOf(it.id);
                  if (idx !== -1 && insertedItems[idx]) {
                    return { ...it, ...insertedItems[idx], id: insertedItems[idx].id };
                  }
                  return it;
                }),
              };
            })
          );
        }
      } catch (err) {
        console.error('Exceção ao inserir itens em lote em list_items no Supabase:', err);
      }
    }
  };

  /**
   * Atualiza um item de uma lista existente com fallback contra colunas inexistentes
   */
  const editListItem = async (
    listId: string,
    itemId: string,
    updates: Partial<ListItem>
  ): Promise<void> => {
    const sanitizedUpdates: Partial<ListItem> = { ...updates };

    if (updates.name !== undefined) {
      const safeName = sanitizeItemName(updates.name);
      if (safeName) {
        sanitizedUpdates.name = safeName;
      } else {
        delete sanitizedUpdates.name;
      }
    }

    if (updates.category !== undefined) {
      sanitizedUpdates.category = sanitizeItemCategory(updates.category, 'Geral');
    }

    if (updates.isWeighted !== undefined) {
      sanitizedUpdates.isWeighted = Boolean(updates.isWeighted);
    }

    if (updates.weight !== undefined) {
      if (updates.weight === null) {
        sanitizedUpdates.weight = undefined;
      } else {
        sanitizedUpdates.weight = validateItemQuantity(updates.weight, 1);
      }
    }

    if (sanitizedUpdates.isWeighted && sanitizedUpdates.weight === undefined) {
      sanitizedUpdates.weight = 1;
    }

    if (updates.quantity !== undefined) {
      sanitizedUpdates.quantity = Math.max(1, Math.round(validateItemQuantity(updates.quantity, 1)));
    }

    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.map((i) => {
            if (i.id !== itemId) return i;
            const updatedItem: ListItem = { ...i, ...sanitizedUpdates };
            if (
              updatedItem.isWeighted &&
              (updatedItem.weight === undefined ||
                updatedItem.weight === null ||
                isNaN(updatedItem.weight))
            ) {
              updatedItem.weight =
                updatedItem.quantity && updatedItem.quantity > 0 ? updatedItem.quantity : 1;
            }
            return updatedItem;
          }),
        };
      })
    );

    if (isSupabaseConfigured()) {
      try {
        const fullDbUpdates: Record<string, any> = {};
        if (sanitizedUpdates.name !== undefined) fullDbUpdates.name = sanitizedUpdates.name;
        if (sanitizedUpdates.category !== undefined)
          fullDbUpdates.category = sanitizedUpdates.category;
        if (sanitizedUpdates.quantity !== undefined)
          fullDbUpdates.quantity = sanitizedUpdates.quantity;
        if (sanitizedUpdates.isWeighted !== undefined) {
          fullDbUpdates.is_weighted = sanitizedUpdates.isWeighted;
        }
        if (sanitizedUpdates.weight !== undefined) {
          fullDbUpdates.weight = sanitizedUpdates.weight;
        } else if (sanitizedUpdates.isWeighted) {
          fullDbUpdates.weight = 1;
        }

        if (Object.keys(fullDbUpdates).length > 0) {
          const { error: updateErr } = await supabase
            .from('list_items')
            .update(fullDbUpdates)
            .eq('id', itemId);

          if (updateErr) {
            const minimalDbUpdates: Record<string, any> = {};
            if (sanitizedUpdates.name !== undefined) minimalDbUpdates.name = sanitizedUpdates.name;
            if (sanitizedUpdates.category !== undefined)
              minimalDbUpdates.category = sanitizedUpdates.category;
            if (sanitizedUpdates.quantity !== undefined)
              minimalDbUpdates.quantity = sanitizedUpdates.quantity;

            if (Object.keys(minimalDbUpdates).length > 0) {
              const { error: retryErr } = await supabase
                .from('list_items')
                .update(minimalDbUpdates)
                .eq('id', itemId);
              if (retryErr) {
                console.error('Erro ao atualizar item em list_items no Supabase:', retryErr);
              }
            }
          }
        }
      } catch (err) {
        console.error('Exceção ao atualizar item da lista no Supabase:', err);
      }
    }
  };

  /**
   * Remove um item de uma lista existente
   */
  const removeItemFromList = async (listId: string, itemId: string): Promise<void> => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.filter((i) => i.id !== itemId),
        };
      })
    );

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('list_items').delete().eq('id', itemId);
        if (error) {
          console.error('Erro ao remover item de list_items no Supabase:', error);
        }
      } catch (err) {
        console.error('Exceção ao remover item da lista no Supabase:', err);
      }
    }
  };

  const getListById = (id: string): List | null => {
    return lists.find((l) => l.id === id) || null;
  };

  /**
   * Sincroniza 100% dos itens da lista na tabela 'list_items' do Supabase (ao clicar em Salvar).
   */
  const saveListItems = async (listId: string, itemsToSave: ListItem[]): Promise<boolean> => {
    const normalizedItems = (itemsToSave || []).map((it) => ({
      ...it,
      id: isValidUUID(it.id) ? it.id : crypto.randomUUID(),
      listId,
    }));

    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: normalizedItems } : l))
    );

    if (!isSupabaseConfigured()) return true;

    try {
      const pendingParent = pendingListCreationsRef.current.get(listId);
      const resolvedListId = pendingParent ? await pendingParent : listId;

      const { error: deleteErr } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', resolvedListId);

      if (deleteErr) {
        console.error('Erro ao limpar list_items anteriores antes de sincronizar:', deleteErr);
      }

      if (normalizedItems.length === 0) {
        return true;
      }

      const syncedItems = await insertListItemsWithFallback(resolvedListId, normalizedItems);
      if (!syncedItems) {
        return false;
      }

      setLists((prev) =>
        prev.map((l) => (l.id === resolvedListId ? { ...l, items: syncedItems } : l))
      );

      return true;
    } catch (err) {
      console.error('Exceção ao sincronizar itens em list_items no Supabase:', err);
      return false;
    }
  };

  return {
    lists,
    loading,
    createList,
    deleteList,
    updateListName,
    addItemToList,
    addItemsBatchToList,
    editListItem,
    removeItemFromList,
    saveListItems,
    getListById,
    refreshLists: fetchListsFromSupabase,
  };
}

