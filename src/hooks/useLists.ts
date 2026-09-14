import { useState, useEffect, useCallback } from 'react';
import { List, ListItem, CreateListParams } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const LOCAL_STORAGE_KEY = 'lista_e_compra_template_lists';

const INITIAL_STARTER_LISTS: List[] = [
  {
    id: 'template-basico-mes',
    name: 'Básicos do Mês',
    description: 'Itens essenciais de despensa e limpeza',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    items: [
      { id: 'item-1', name: 'Arroz Tipo 1 (5kg)', category: 'Alimentos', quantity: 1, isWeighted: false, price: 28.90 },
      { id: 'item-2', name: 'Feijão Carioca (1kg)', category: 'Alimentos', quantity: 2, isWeighted: false, price: 7.50 },
      { id: 'item-3', name: 'Óleo de Soja (900ml)', category: 'Alimentos', quantity: 2, isWeighted: false, price: 6.90 },
      { id: 'item-4', name: 'Açúcar Refinado (1kg)', category: 'Alimentos', quantity: 1, isWeighted: false, price: 4.80 },
      { id: 'item-5', name: 'Café Torrado e Moído (500g)', category: 'Alimentos', quantity: 2, isWeighted: false, price: 18.90 },
      { id: 'item-6', name: 'Detergente Líquido', category: 'Limpeza', quantity: 3, isWeighted: false, price: 2.50 },
    ],
  },
  {
    id: 'template-feira-semanal',
    name: 'Feira Semanal',
    description: 'Frutas, legumes e verduras frescas',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    items: [
      { id: 'item-f1', name: 'Banana Prata', category: 'Hortifruti', quantity: 1, weight: 1.2, isWeighted: true, price: 6.99 },
      { id: 'item-f2', name: 'Maçã Gala', category: 'Hortifruti', quantity: 1, weight: 0.8, isWeighted: true, price: 9.90 },
      { id: 'item-f3', name: 'Tomate Italiano', category: 'Hortifruti', quantity: 1, weight: 1.0, isWeighted: true, price: 7.90 },
      { id: 'item-f4', name: 'Alface Crespa', category: 'Hortifruti', quantity: 1, isWeighted: false, price: 3.50 },
    ],
  },
];

export function useLists(userId?: string | null) {
  const [lists, setLists] = useState<List[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      description: dbList.description || undefined,
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
        console.error('Erro ao buscar listas no Supabase:', listsError);
        setLoading(false);
        return;
      }

      if (!listsData || listsData.length === 0) {
        // Se o usuário ainda não tem listas no Supabase, mantém as listas locais existentes ou vazias
        setLoading(false);
        return;
      }

      const listIds = listsData.map((l) => l.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from('list_items')
        .select('*')
        .in('list_id', listIds)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Erro ao buscar itens de listas no Supabase:', itemsError);
      }

      const itemsByListId = new Map<string, any[]>();
      if (!itemsError && itemsData) {
        itemsData.forEach((item) => {
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
      console.error('Exceção ao buscar listas do Supabase:', err);
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
    const description = typeof params === 'object' ? params.description : undefined;
    const initialItems = typeof params === 'object' && params.items ? params.items : [];

    const newListId = crypto.randomUUID();
    const now = new Date().toISOString();

    const formattedItems: ListItem[] = initialItems.map((item) => ({
      id: crypto.randomUUID(),
      listId: newListId,
      name: item.name,
      category: item.category || 'Geral',
      quantity: item.quantity || 1,
      weight: item.weight,
      isWeighted: item.isWeighted || false,
      price: item.price,
      pricingModeSource: item.pricingModeSource ?? null,
    }));

    const newList: List = {
      id: newListId,
      name: finalName,
      description,
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
        const { error: listErr } = await supabase.from('lists').insert({
          id: newList.id,
          user_id: userId,
          name: newList.name,
          description: newList.description || null,
          created_at: newList.createdAt,
        });

        if (listErr) {
          console.error('Erro ao salvar lista no Supabase:', listErr);
        } else if (formattedItems.length > 0) {
          const dbItems = formattedItems.map((item) => ({
            id: item.id,
            list_id: newList.id,
            user_id: userId,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            weight: item.weight ?? null,
            is_weighted: item.isWeighted,
            price: item.price ?? null,
            created_at: now,
          }));

          const { error: itemsErr } = await supabase.from('list_items').insert(dbItems);
          if (itemsErr) {
            console.error('Erro ao salvar itens da lista no Supabase:', itemsErr);
          }
        }
      } catch (err) {
        console.error('Erro ao persistir lista no Supabase:', err);
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
        console.error('Erro ao deletar lista no Supabase:', err);
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
        console.error('Erro ao renomear lista no Supabase:', err);
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
    const newItem: ListItem = {
      ...itemData,
      id: newItemId,
      listId,
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
        await supabase.from('list_items').insert({
          id: newItemId,
          list_id: listId,
          user_id: userId,
          name: itemData.name,
          category: itemData.category || 'Geral',
          quantity: itemData.quantity || 1,
          weight: itemData.weight ?? null,
          is_weighted: Boolean(itemData.isWeighted),
          price: itemData.price ?? null,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Erro ao inserir item na lista do Supabase:', err);
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
    setLists((prev) => {
      const updated = prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: l.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
        };
      });
      saveToLocal(updated);
      return updated;
    });

    if (isSupabaseConfigured()) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
        if (updates.isWeighted !== undefined) dbUpdates.is_weighted = updates.isWeighted;
        if (updates.pricingModeSource !== undefined) dbUpdates.pricing_mode_source = updates.pricingModeSource;

        if (Object.keys(dbUpdates).length > 0) {
          await supabase.from('list_items').update(dbUpdates).eq('id', itemId);
        }
      } catch (err) {
        console.error('Erro ao atualizar item da lista no Supabase:', err);
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
        console.error('Erro ao remover item da lista no Supabase:', err);
      }
    }
  };

  const getListById = (id: string): List | null => {
    return lists.find((l) => l.id === id) || null;
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
    getListById,
    refreshLists: fetchListsFromSupabase,
  };
}
