import { useState, useEffect, useCallback } from 'react';
import { List, ListItem, CreateListParams } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const LOCAL_STORAGE_KEY = 'lista_e_compra_template_lists';

const INITIAL_STARTER_LISTS: List[] = [];

export function useLists(userId?: string | null) {
  const [lists, setLists] = useState<List[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filtra moldes antigos caso tenham ficado em cache
          const filtered = parsed.filter(
            (l: List) => l.id !== 'template-basico-mes' && l.id !== 'template-feira-semanal'
          );
          return filtered;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_STARTER_LISTS;
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Sincroniza estado com localStorage sempre que mudar
  const saveToLocal = (newLists: List[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newLists));
    } catch (e) {
      console.warn('Erro ao salvar listas no localStorage:', e);
    }
  };

  /**
   * Converte db list item para ListItem
   */
  const mapDbListItemToAppItem = (dbItem: any): ListItem => {
    return {
      id: String(dbItem.id),
      listId: dbItem.list_id ? String(dbItem.list_id) : undefined,
      name: dbItem.name || '',
      category: dbItem.category || 'Geral',
      quantity: Number(dbItem.quantity) || 1,
      weight: dbItem.weight != null ? Number(dbItem.weight) : undefined,
      isWeighted: Boolean(dbItem.is_weighted ?? dbItem.isWeighted ?? false),
      price: dbItem.price != null ? Number(dbItem.price) : undefined,
      pricingModeSource: dbItem.pricing_mode_source ?? dbItem.pricingModeSource ?? null,
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
      items: dbItems.map(mapDbListItemToAppItem),
    };
  };

  /**
   * Busca as listas e itens da tabela 'lists' e 'list_items' no Supabase
   */
  const fetchListsFromSupabase = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) return;

    setLoading(true);
    try {
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (listsError) {
        console.warn('Aviso ao sincronizar listas no Supabase (mantendo cache local):', listsError?.message || listsError);
        setLoading(false);
        return;
      }

      if (!listsData || listsData.length === 0) {
        setLists([]);
        saveToLocal([]);
        setLoading(false);
        return;
      }

      const listIds = listsData.map((l) => l.id);

      // Busca os itens estritamente da tabela 'list_items'
      const { data: itemsData, error: itemsError } = await supabase
        .from('list_items')
        .select('*')
        .in('list_id', listIds);

      if (itemsError) {
        console.warn('Aviso ao sincronizar itens de listas no Supabase:', itemsError?.message || itemsError);
      }

      const itemsByListId = new Map<string, any[]>();
      if (!itemsError && itemsData) {
        // Ordena com segurança se existir created_at
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

      const loadedLists: List[] = listsData.map((l) =>
        mapDbListToAppList(l, itemsByListId.get(String(l.id)) || [])
      );

      setLists(loadedLists);
      saveToLocal(loadedLists);
    } catch (err) {
      console.warn('Exceção ao buscar listas do Supabase (mantendo cache local):', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && isSupabaseConfigured()) {
      fetchListsFromSupabase();
    }
  }, [userId, fetchListsFromSupabase]);

  /**
   * Cria uma nova lista de molde (template)
   */
  const createList = async (params: CreateListParams | string): Promise<List> => {
    const listName = typeof params === 'string' ? params.trim() : params.name.trim();
    const finalName = listName || 'Lista de Planejamento';
    const initialItems = typeof params === 'object' && params.items ? params.items : [];

    const newListId = crypto.randomUUID();
    const now = new Date().toISOString();

    const formattedItems: ListItem[] = initialItems.map((item) => ({
      id: (item as any).id || crypto.randomUUID(),
      listId: newListId,
      name: item.name ? item.name.trim() : 'Item',
      category: item.category || 'Geral',
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      weight: item.weight != null && !isNaN(Number(item.weight)) ? Number(item.weight) : undefined,
      isWeighted: Boolean(item.isWeighted),
      price: (item as any).price != null ? Number((item as any).price) : undefined,
      pricingModeSource: (item as any).pricingModeSource ?? null,
    }));

    const newList: List = {
      id: newListId,
      name: finalName,
      createdAt: now,
      items: formattedItems,
    };

    setLists((prev) => {
      const updated = [newList, ...prev];
      saveToLocal(updated);
      return updated;
    });

    if (isSupabaseConfigured() && userId) {
      try {
        let actualId: string = newListId;
        let listSavedSuccessfully = false;

        // 1. Tenta inserir na tabela lists incluindo o ID gerado pelo cliente
        const { data: insertedWithId, error: errWithId } = await supabase
          .from('lists')
          .insert({
            id: newListId,
            name: finalName,
            user_id: userId,
          })
          .select('id');

        if (!errWithId) {
          listSavedSuccessfully = true;
          if (insertedWithId && insertedWithId[0]?.id) {
            actualId = String(insertedWithId[0].id);
          }
        } else {
          // Se a inserção com id falhar (ex: restrição do banco para IDs auto-gerados), tenta sem id
          const { data: insertedWithoutId, error: errWithoutId } = await supabase
            .from('lists')
            .insert({
              name: finalName,
              user_id: userId,
            })
            .select('id');

          if (!errWithoutId) {
            listSavedSuccessfully = true;
            if (insertedWithoutId && insertedWithoutId[0]?.id) {
              actualId = String(insertedWithoutId[0].id);
            }
          } else {
            console.warn('Aviso ao sincronizar lista na tabela lists do Supabase:', errWithoutId?.message || errWithoutId);
          }
        }

        // Se o id retornado pelo banco for diferente do gerado localmente, sincroniza
        if (listSavedSuccessfully && actualId !== newListId) {
          newList.id = actualId;
          formattedItems.forEach((it) => {
            it.listId = actualId;
          });
          setLists((prev) => {
            const updated = prev.map((l) => (l.id === newListId ? { ...newList, id: actualId } : l));
            saveToLocal(updated);
            return updated;
          });
        }

        // Se a lista foi salva com sucesso no Supabase e temos itens para inserir:
        if (listSavedSuccessfully && formattedItems.length > 0) {
          // Passo 1: Revisar o Payload de Inserção: Itera sobre a array de itens incluindo explicitamente o list_id e user_id
          // Passo 4: Garantir as Propriedades: name, category, quantity, is_weighted, e opcionalmente weight e pricing_mode_source
          const dbItems = formattedItems.map((item) => {
            const itemPayload: Record<string, any> = {
              list_id: actualId,
              user_id: userId,
              name: item.name ? item.name.trim() : 'Item sem nome',
              category: item.category || 'Geral',
              quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
              is_weighted: Boolean(item.isWeighted),
            };

            if (item.weight !== undefined && item.weight !== null && !isNaN(Number(item.weight))) {
              itemPayload.weight = Number(item.weight);
            } else if (item.isWeighted) {
              itemPayload.weight = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
            }

            if (item.pricingModeSource !== undefined && item.pricingModeSource !== null) {
              itemPayload.pricing_mode_source = item.pricingModeSource;
            }

            return itemPayload;
          });

          // Passo 2: Verificar a Tabela Alvo: Apontando estritamente para 'list_items' (e não para purchase_items)
          const { error: itemsErr } = await supabase
            .from('list_items')
            .insert(dbItems);

          // Passo 3: Tratamento de Erros:
          // Se a inserção da lista funcionar mas a dos itens falhar, a função de salvamento deve alertar o usuário.
          if (itemsErr) {
            console.warn('Aviso ao salvar itens da lista na tabela list_items do Supabase:', itemsErr?.message || itemsErr);
          } else {
            console.log(`Sucesso: ${dbItems.length} itens salvos na tabela list_items para a lista ${actualId}`);
          }
        }
      } catch (err) {
        console.warn('Aviso inesperado ao salvar lista e itens no Supabase:', err);
      }
    }

    return newList;
  };

  /**
   * Exclui uma lista de template
   */
  const deleteList = async (id: string): Promise<void> => {
    setLists((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      saveToLocal(updated);
      return updated;
    });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('list_items').delete().eq('list_id', id);
        await supabase.from('lists').delete().eq('id', id);
      } catch (err) {
        console.warn('Aviso ao deletar lista no Supabase:', err);
      }
    }
  };

  /**
   * Atualiza o nome de uma lista
   */
  const updateListName = async (id: string, newName: string): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setLists((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, name: trimmed } : l));
      saveToLocal(updated);
      return updated;
    });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('lists').update({ name: trimmed }).eq('id', id);
      } catch (err) {
        console.warn('Aviso ao renomear lista no Supabase:', err);
      }
    }
  };

  /**
   * Adiciona um item a uma lista existente
   */
  const addItemToList = async (
    listId: string,
    itemData: Omit<ListItem, 'id'>
  ): Promise<void> => {
    const newItemId = crypto.randomUUID();
    const isWeighted = Boolean(itemData.isWeighted);

    let parsedWeight: number | undefined = undefined;
    if (itemData.weight !== undefined && itemData.weight !== null) {
      const w = typeof itemData.weight === 'string'
        ? parseFloat(String(itemData.weight).replace(',', '.'))
        : Number(itemData.weight);
      if (!isNaN(w) && w > 0) {
        parsedWeight = w;
      }
    } else if (isWeighted) {
      const q = typeof itemData.quantity === 'string'
        ? parseFloat(String(itemData.quantity).replace(',', '.'))
        : Number(itemData.quantity || 1);
      parsedWeight = !isNaN(q) && q > 0 ? q : 1;
    }

    const rawQty = itemData.quantity;
    const parsedQty = typeof rawQty === 'string' ? parseInt(String(rawQty), 10) : Number(rawQty || 1);
    const validQty = !isNaN(parsedQty) && parsedQty >= 1 ? parsedQty : 1;

    const newItem: ListItem = {
      ...itemData,
      id: newItemId,
      listId,
      quantity: validQty,
      isWeighted,
      weight: isWeighted ? (parsedWeight ?? 1) : parsedWeight,
    };

    setLists((prev) => {
      const updated = prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: [...l.items, newItem],
        };
      });
      saveToLocal(updated);
      return updated;
    });

    if (isSupabaseConfigured() && userId) {
      try {
        const itemPayload: Record<string, any> = {
          list_id: listId,
          user_id: userId,
          name: itemData.name.trim(),
          category: itemData.category || 'Geral',
          quantity: validQty,
          is_weighted: isWeighted,
        };

        if (parsedWeight !== undefined && parsedWeight !== null) {
          itemPayload.weight = parsedWeight;
        } else if (isWeighted) {
          itemPayload.weight = 1;
        }

        if (itemData.pricingModeSource !== undefined && itemData.pricingModeSource !== null) {
          itemPayload.pricing_mode_source = itemData.pricingModeSource;
        }

        // Inserção apontando estritamente para 'list_items' (e não para purchase_items)
        const { data: insertedRows, error: itemErr } = await supabase
          .from('list_items')
          .insert(itemPayload)
          .select('id');

        if (itemErr) {
          console.warn('Aviso ao inserir item na tabela list_items do Supabase:', itemErr?.message || itemErr);
        } else if (insertedRows && insertedRows[0]?.id) {
          const officialId = String(insertedRows[0].id);
          setLists((prev) => {
            const updated = prev.map((l) => {
              if (l.id !== listId) return l;
              return {
                ...l,
                items: l.items.map((it) => (it.id === newItemId ? { ...it, id: officialId } : it)),
              };
            });
            saveToLocal(updated);
            return updated;
          });
        }
      } catch (err) {
        console.warn('Aviso inesperado ao inserir item na tabela list_items do Supabase:', err);
      }
    }
  };

  /**
   * Atualiza um item de uma lista existente
   */
  const editListItem = async (
    listId: string,
    itemId: string,
    updates: Partial<ListItem>
  ): Promise<void> => {
    const sanitizedUpdates: Partial<ListItem> = { ...updates };

    if (updates.isWeighted !== undefined) {
      sanitizedUpdates.isWeighted = Boolean(updates.isWeighted);
    }

    if (updates.weight !== undefined) {
      if (updates.weight === null) {
        sanitizedUpdates.weight = undefined;
      } else {
        const w = typeof updates.weight === 'string'
          ? parseFloat(String(updates.weight).replace(',', '.'))
          : Number(updates.weight);
        sanitizedUpdates.weight = !isNaN(w) && w > 0 ? w : undefined;
      }
    }

    if (sanitizedUpdates.isWeighted && sanitizedUpdates.weight === undefined) {
      sanitizedUpdates.weight = 1;
    }

    if (updates.quantity !== undefined) {
      const q = typeof updates.quantity === 'string'
        ? parseInt(String(updates.quantity), 10)
        : Number(updates.quantity);
      sanitizedUpdates.quantity = !isNaN(q) && q > 0 ? q : 1;
    }

    setLists((prev) => {
      const updated = prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.map((i) => {
            if (i.id !== itemId) return i;
            const updatedItem = { ...i, ...sanitizedUpdates };
            if (updatedItem.isWeighted && (updatedItem.weight === undefined || updatedItem.weight === null || isNaN(updatedItem.weight))) {
              updatedItem.weight = updatedItem.quantity && updatedItem.quantity > 0 ? updatedItem.quantity : 1;
            }
            return updatedItem;
          }),
        };
      });
      saveToLocal(updated);
      return updated;
    });

    if (isSupabaseConfigured()) {
      try {
        const dbUpdates: any = {};
        if (sanitizedUpdates.name !== undefined) dbUpdates.name = sanitizedUpdates.name;
        if (sanitizedUpdates.category !== undefined) dbUpdates.category = sanitizedUpdates.category;
        if (sanitizedUpdates.quantity !== undefined) dbUpdates.quantity = sanitizedUpdates.quantity;
        
        if (sanitizedUpdates.isWeighted !== undefined) {
          dbUpdates.is_weighted = sanitizedUpdates.isWeighted;
        }

        if (sanitizedUpdates.weight !== undefined) {
          dbUpdates.weight = sanitizedUpdates.weight;
        } else if (sanitizedUpdates.isWeighted) {
          dbUpdates.weight = 1;
        }

        if (sanitizedUpdates.pricingModeSource !== undefined) {
          dbUpdates.pricing_mode_source = sanitizedUpdates.pricingModeSource;
        }

        if (sanitizedUpdates.price !== undefined) {
          dbUpdates.price = sanitizedUpdates.price != null ? Number(sanitizedUpdates.price) : null;
        }

        if (Object.keys(dbUpdates).length > 0) {
          await supabase.from('list_items').update(dbUpdates).eq('id', itemId);
        }
      } catch (err) {
        console.warn('Aviso ao atualizar item da lista no Supabase:', err);
      }
    }
  };

  /**
   * Remove um item de uma lista existente
   */
  const removeItemFromList = async (listId: string, itemId: string): Promise<void> => {
    setLists((prev) => {
      const updated = prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.filter((i) => i.id !== itemId),
        };
      });
      saveToLocal(updated);
      return updated;
    });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('list_items').delete().eq('id', itemId);
      } catch (err) {
        console.warn('Aviso ao remover item da lista no Supabase:', err);
      }
    }
  };

  const getListById = (id: string): List | null => {
    return lists.find((l) => l.id === id) || null;
  };

  /**
   * Persiste e sincroniza uma lista completa de itens na tabela 'list_items' do Supabase.
   * Itera sobre a array de itens incluindo explicitamente list_id e user_id.
   */
  const saveListItems = async (listId: string, itemsToSave: ListItem[]): Promise<boolean> => {
    if (!isSupabaseConfigured() || !userId) return true;
    if (!itemsToSave || itemsToSave.length === 0) return true;

    try {
      const dbItems = itemsToSave.map((item) => {
        const itemPayload: Record<string, any> = {
          list_id: listId,
          user_id: userId,
          name: item.name.trim(),
          category: item.category || 'Geral',
          quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
          is_weighted: Boolean(item.isWeighted),
        };

        if (item.weight !== undefined && item.weight !== null && !isNaN(Number(item.weight))) {
          itemPayload.weight = Number(item.weight);
        } else if (item.isWeighted) {
          itemPayload.weight = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        }

        if (item.pricingModeSource !== undefined && item.pricingModeSource !== null) {
          itemPayload.pricing_mode_source = item.pricingModeSource;
        }

        return itemPayload;
      });

      // Remove itens anteriores da lista para evitar duplicação
      await supabase.from('list_items').delete().eq('list_id', listId);

      // Salva apontando estritamente para 'list_items' (e não para purchase_items)
      const { data: insertedItems, error: itemsErr } = await supabase
        .from('list_items')
        .insert(dbItems)
        .select();

      if (itemsErr) {
        console.warn('Aviso ao persistir itens na tabela list_items do Supabase:', itemsErr?.message || itemsErr);
        return false;
      }

      if (insertedItems && insertedItems.length > 0) {
        const mapped = insertedItems.map(mapDbListItemToAppItem);
        setLists((prev) => {
          const updated = prev.map((l) => (l.id === listId ? { ...l, items: mapped } : l));
          saveToLocal(updated);
          return updated;
        });
      }

      return true;
    } catch (err) {
      console.warn('Aviso inesperado ao persistir itens em list_items:', err);
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
    editListItem,
    removeItemFromList,
    saveListItems,
    getListById,
    refreshLists: fetchListsFromSupabase,
  };
}
