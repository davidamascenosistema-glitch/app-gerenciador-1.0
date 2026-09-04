import { useState, useEffect, useCallback, useMemo } from 'react';
import { ItemSuggestion, Purchase } from '../types';
import {
  fetchGenericSuggestions,
  fetchPersonalSuggestionsFromDb,
  recordGenericItemUsage,
  normalizeText,
  getSearchRelevanceScore,
} from '../services/suggestionsService';
import { isSupabaseConfigured } from '../services/supabaseClient';

const enrichWithPricingMode = (
  suggestions: ItemSuggestion[],
  genericCatalog: ItemSuggestion[]
): ItemSuggestion[] => {
  if (genericCatalog.length === 0) return suggestions;
  const catalogByName = new Map(
    genericCatalog.map((g) => [normalizeText(g.name), g.defaultPricingMode])
  );
  return suggestions.map((s) => {
    const match = catalogByName.get(normalizeText(s.name));
    return match ? { ...s, defaultPricingMode: match } : s;
  });
};

export interface UseItemSuggestionsReturn {
  personalSuggestions: ItemSuggestion[];
  genericSuggestions: ItemSuggestion[];
  loading: boolean;
  getCombinedSuggestions: (query: string) => ItemSuggestion[];
  getQuickSuggestions: (alreadyAddedNames: string[], maxTotal?: number) => ItemSuggestion[];
  recordManualItem: (name: string, category: string) => Promise<void>;
  refreshSuggestions: () => Promise<void>;
}

export function useItemSuggestions(
  userId?: string | null,
  localPurchases?: Purchase[]
): UseItemSuggestionsReturn {
  const [personalDbSuggestions, setPersonalDbSuggestions] = useState<ItemSuggestion[]>([]);
  const [genericSuggestions, setGenericSuggestions] = useState<ItemSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Extrai sugestões pessoais das compras locais em memória caso o Supabase não esteja disponível
   */
  const personalLocalSuggestions = useMemo((): ItemSuggestion[] => {
    if (!localPurchases || localPurchases.length === 0) return [];

    const map = new Map<string, { name: string; category: string; count: number }>();

    localPurchases.forEach((purchase) => {
      (purchase.items || []).forEach((item) => {
        if (!item.name || !item.name.trim()) return;
        const normalized = normalizeText(item.name);
        const existing = map.get(normalized);

        if (existing) {
          existing.count += 1;
          if (item.category && item.category !== 'Geral') {
            existing.category = item.category;
          }
        } else {
          map.set(normalized, {
            name: item.name.trim(),
            category: item.category || 'Geral',
            count: 1,
          });
        }
      });
    });

    const built = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        name: item.name,
        category: item.category,
        count: item.count,
        source: 'personal' as const,
      }));
    return enrichWithPricingMode(built, genericSuggestions);
  }, [localPurchases, genericSuggestions]);

  /**
   * Lista unificada e priorizada de itens pessoais (DB ou local)
   */
  const personalSuggestions = useMemo(() => {
    if (isSupabaseConfigured() && personalDbSuggestions.length > 0) {
      return personalDbSuggestions;
    }
    return personalLocalSuggestions;
  }, [personalDbSuggestions, personalLocalSuggestions]);

  /**
   * Carrega sugestões do banco de dados (histórico pessoal e base genérica)
   */
  const refreshSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Busca sugestões genéricas
      const generic = await fetchGenericSuggestions();
      setGenericSuggestions(generic);

      // 2. Busca histórico pessoal do usuário se logado
      if (userId && isSupabaseConfigured()) {
        const personal = await fetchPersonalSuggestionsFromDb(userId);
        setPersonalDbSuggestions(enrichWithPricingMode(personal, generic));
      }
    } catch {
      // Ignora erro de rede temporário
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Carrega ao montar ou quando o usuário mudar
  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions]);

  /**
   * Retorna sugestões combinadas para uma busca digitada pelo usuário:
   * 1º: Itens do histórico PESSOAL (prioridade visual)
   * 2º: Itens da base GENÉRICA compartilhada (sem duplicar os pessoais)
   */
  const getCombinedSuggestions = useCallback(
    (query: string): ItemSuggestion[] => {
      const cleanQuery = normalizeText(query);
      if (!cleanQuery) {
        // Sem busca (ao clicar na barra): retorna os itens mais frequentes do usuário e sugestões populares
        const personalTop = personalSuggestions.slice(0, 6);
        const personalNames = new Set(personalTop.map((i) => normalizeText(i.name)));
        const genericTop = genericSuggestions
          .filter((i) => !personalNames.has(normalizeText(i.name)))
          .slice(0, 8);

        return [...personalTop, ...genericTop];
      }

      // 1. Filtra do histórico pessoal com pontuação por prefixo de palavras
      const personalMatches = personalSuggestions
        .map((item) => ({
          item,
          score: getSearchRelevanceScore(item.name, cleanQuery),
        }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (b.item.count || 1) - (a.item.count || 1);
        })
        .map(({ item }) => item);

      const personalNamesSet = new Set(personalMatches.map((i) => normalizeText(i.name)));

      // 2. Filtra da base genérica ignorando os que já estão no histórico pessoal
      const genericMatches = genericSuggestions
        .filter((item) => !personalNamesSet.has(normalizeText(item.name)))
        .map((item) => ({
          item,
          score: getSearchRelevanceScore(item.name, cleanQuery),
        }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (b.item.count || 1) - (a.item.count || 1);
        })
        .map(({ item }) => item);

      return [...personalMatches, ...genericMatches].slice(0, 10);
    },
    [personalSuggestions, genericSuggestions]
  );

  /**
   * Retorna a lista combinada de sugestões rápidas para exibição em botões:
   * - Busca sugestões pessoais com limite igual a maxTotal (6)
   * - Filtra qualquer nome que já esteja em alreadyAddedNames (case-insensitive)
   * - Calcula remainingSlots = maxTotal - personalSuggestions.length
   * - Se remainingSlots > 0, busca sugestões genéricas complementares (ordenadas por uso),
   *   filtrando já adicionados e já vindos das pessoais (sem duplicata)
   * - Retorna array único concatenando primeiro pessoais depois genéricas, nunca excedendo maxTotal
   */
  const getQuickSuggestions = useCallback(
    (alreadyAddedNames: string[] = [], maxTotal: number = 6): ItemSuggestion[] => {
      const addedSet = new Set(
        alreadyAddedNames.map((n) => (n || '').trim().toLowerCase()).filter(Boolean)
      );

      // 1. Sugestões pessoais filtradas
      const filteredPersonal: ItemSuggestion[] = [];
      const personalSeen = new Set<string>();

      for (const item of personalSuggestions) {
        const lower = (item.name || '').trim().toLowerCase();
        if (!lower || addedSet.has(lower) || personalSeen.has(lower)) continue;
        personalSeen.add(lower);
        filteredPersonal.push(item);
        if (filteredPersonal.length >= maxTotal) break;
      }

      // 2. Calcula slots restantes
      const remainingSlots = maxTotal - filteredPersonal.length;
      if (remainingSlots <= 0) {
        return filteredPersonal;
      }

      // 3. Sugestões genéricas complementares
      const filteredGeneric: ItemSuggestion[] = [];
      const genericSeen = new Set<string>();

      for (const item of genericSuggestions) {
        const lower = (item.name || '').trim().toLowerCase();
        if (!lower || addedSet.has(lower) || personalSeen.has(lower) || genericSeen.has(lower)) {
          continue;
        }
        genericSeen.add(lower);
        filteredGeneric.push(item);
        if (filteredGeneric.length >= remainingSlots) break;
      }

      // 4. Concatena mantendo a ordem: pessoais primeiro, depois genéricas
      return [...filteredPersonal, ...filteredGeneric].slice(0, maxTotal);
    },
    [personalSuggestions, genericSuggestions]
  );

  /**
   * Registra a adição manual de um item para alimentar a base genérica de forma orgânica
   */
  const recordManualItem = useCallback(
    async (name: string, category: string) => {
      await recordGenericItemUsage(name, category);
      // Atualiza levemente a lista de genéricos após inserção orgânica
      const updatedGeneric = await fetchGenericSuggestions();
      setGenericSuggestions(updatedGeneric);
    },
    []
  );

  return {
    personalSuggestions,
    genericSuggestions,
    loading,
    getCombinedSuggestions,
    getQuickSuggestions,
    recordManualItem,
    refreshSuggestions,
  };
}
