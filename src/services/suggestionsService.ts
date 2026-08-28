import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ItemSuggestion } from '../types';

/**
 * Base curated inicial de sugestões genéricas com categorias pré-mapeadas.
 * Fornece o catálogo padrão de inicialização e busca rápida.
 */
export const INITIAL_GENERIC_CATALOG: Array<{ name: string; category: string; count: number }> = [
  // Alimentos / Mercearia
  { name: 'Arroz 5kg', category: 'Alimentos', count: 10 },
  { name: 'Arroz Integral', category: 'Alimentos', count: 5 },
  { name: 'Feijão Carioca', category: 'Alimentos', count: 9 },
  { name: 'Feijão Preto', category: 'Alimentos', count: 7 },
  { name: 'Açúcar Refinado', category: 'Alimentos', count: 8 },
  { name: 'Açúcar Cristal', category: 'Alimentos', count: 6 },
  { name: 'Óleo de Soja', category: 'Alimentos', count: 8 },
  { name: 'Azeite de Oliva', category: 'Alimentos', count: 6 },
  { name: 'Café em Pó', category: 'Alimentos', count: 9 },
  { name: 'Sal Refinado', category: 'Alimentos', count: 5 },
  { name: 'Macarrão Espaguete', category: 'Alimentos', count: 7 },
  { name: 'Macarrão Parafuso', category: 'Alimentos', count: 6 },
  { name: 'Molho de Tomate', category: 'Alimentos', count: 8 },
  { name: 'Farinha de Trigo', category: 'Alimentos', count: 6 },
  { name: 'Farinha de Mandioca', category: 'Alimentos', count: 5 },
  { name: 'Aveia em Flocos', category: 'Alimentos', count: 4 },
  { name: 'Milho em Conserva', category: 'Alimentos', count: 5 },
  { name: 'Ervilha em Conserva', category: 'Alimentos', count: 4 },
  { name: 'Atum Ralado', category: 'Alimentos', count: 5 },
  { name: 'Sardinha em Lata', category: 'Alimentos', count: 4 },
  { name: 'Biscoito Cream Cracker', category: 'Alimentos', count: 5 },
  { name: 'Biscoito Recheado', category: 'Alimentos', count: 4 },
  { name: 'Maionese', category: 'Alimentos', count: 5 },
  { name: 'Ketchup', category: 'Alimentos', count: 4 },
  { name: 'Mostarda', category: 'Alimentos', count: 3 },
  { name: 'Vinagre de Maçã', category: 'Alimentos', count: 4 },
  { name: 'Vinagre de Álcool', category: 'Alimentos', count: 4 },
  { name: 'Leite Condensado', category: 'Alimentos', count: 5 },
  { name: 'Creme de Leite', category: 'Alimentos', count: 6 },
  { name: 'Achocolatado em Pó', category: 'Alimentos', count: 6 },

  // Bebidas
  { name: 'Leite Integral 1L', category: 'Bebidas', count: 12 },
  { name: 'Leite Desnatado 1L', category: 'Bebidas', count: 8 },
  { name: 'Leite Sem Lactose', category: 'Bebidas', count: 6 },
  { name: 'Suco de Uva Integral', category: 'Bebidas', count: 7 },
  { name: 'Suco de Laranja', category: 'Bebidas', count: 7 },
  { name: 'Água Mineral sem Gás', category: 'Bebidas', count: 6 },
  { name: 'Água Mineral com Gás', category: 'Bebidas', count: 5 },
  { name: 'Refrigerante Cola 2L', category: 'Bebidas', count: 7 },
  { name: 'Refrigerante Guaraná 2L', category: 'Bebidas', count: 6 },
  { name: 'Cerveja Lata', category: 'Bebidas', count: 7 },
  { name: 'Chá Mate', category: 'Bebidas', count: 4 },
  { name: 'Água de Coco', category: 'Bebidas', count: 5 },

  // Açougue (Produtos por Peso)
  { name: 'Carne Moída', category: 'Açougue', count: 9 },
  { name: 'Peito de Frango', category: 'Açougue', count: 10 },
  { name: 'Filé de Frango', category: 'Açougue', count: 9 },
  { name: 'Coxa e Sobrecoxa', category: 'Açougue', count: 7 },
  { name: 'Picanha', category: 'Açougue', count: 6 },
  { name: 'Alcatra', category: 'Açougue', count: 7 },
  { name: 'Contrafilé', category: 'Açougue', count: 7 },
  { name: 'Acém em Cubos', category: 'Açougue', count: 6 },
  { name: 'Costelinha de Porco', category: 'Açougue', count: 5 },
  { name: 'Linguiça Toscana', category: 'Açougue', count: 7 },
  { name: 'Bacon Fatiado', category: 'Açougue', count: 6 },
  { name: 'Filé de Tilápia', category: 'Açougue', count: 5 },

  // Frutas/Legumes / Hortifruti
  { name: 'Banana Prata', category: 'Frutas/Legumes', count: 10 },
  { name: 'Banana Nanica', category: 'Frutas/Legumes', count: 8 },
  { name: 'Maçã Gala', category: 'Frutas/Legumes', count: 8 },
  { name: 'Tomate Italiano', category: 'Frutas/Legumes', count: 9 },
  { name: 'Cebola', category: 'Frutas/Legumes', count: 9 },
  { name: 'Alho', category: 'Frutas/Legumes', count: 8 },
  { name: 'Batata Inglesa', category: 'Frutas/Legumes', count: 9 },
  { name: 'Batata Doce', category: 'Frutas/Legumes', count: 6 },
  { name: 'Cenoura', category: 'Frutas/Legumes', count: 7 },
  { name: 'Alface Americana', category: 'Hortifruti', count: 7 },
  { name: 'Limão Taiti', category: 'Frutas/Legumes', count: 7 },
  { name: 'Laranja Pera', category: 'Frutas/Legumes', count: 7 },
  { name: 'Abobrinha Italiana', category: 'Frutas/Legumes', count: 5 },
  { name: 'Brócolis', category: 'Frutas/Legumes', count: 5 },
  { name: 'Mamão Papaia', category: 'Frutas/Legumes', count: 5 },
  { name: 'Melancia', category: 'Frutas/Legumes', count: 4 },
  { name: 'Cheiro Verde (Salsa e Cebolinha)', category: 'Hortifruti', count: 6 },

  // Frios / Laticínios
  { name: 'Queijo Mussarela', category: 'Frios', count: 9 },
  { name: 'Presunto Cozido', category: 'Frios', count: 8 },
  { name: 'Peito de Peru', category: 'Frios', count: 5 },
  { name: 'Manteiga com Sal', category: 'Frios', count: 7 },
  { name: 'Margarina', category: 'Frios', count: 6 },
  { name: 'Requeijão Cremoso', category: 'Frios', count: 7 },
  { name: 'Iogurte Natural', category: 'Frios', count: 6 },
  { name: 'Queijo Parmesão Ralado', category: 'Frios', count: 6 },
  { name: 'Ovos Brancos (Dúzia)', category: 'Alimentos', count: 10 },
  { name: 'Ovos Caipiras (Dúzia)', category: 'Alimentos', count: 7 },

  // Padaria
  { name: 'Pão Francês', category: 'Padaria', count: 11 },
  { name: 'Pão de Forma Tradicional', category: 'Padaria', count: 8 },
  { name: 'Pão de Forma Integral', category: 'Padaria', count: 7 },
  { name: 'Pão de Queijo', category: 'Padaria', count: 6 },
  { name: 'Torrada Tradicional', category: 'Padaria', count: 5 },
  { name: 'Bolo de Cenoura', category: 'Padaria', count: 4 },

  // Limpeza
  { name: 'Detergente Líquido', category: 'Limpeza', count: 9 },
  { name: 'Sabão em Pó', category: 'Limpeza', count: 8 },
  { name: 'Sabão Líquido para Roupas', category: 'Limpeza', count: 7 },
  { name: 'Amaciante de Roupas', category: 'Limpeza', count: 8 },
  { name: 'Água Sanitária', category: 'Limpeza', count: 8 },
  { name: 'Desinfetante Perfumado', category: 'Limpeza', count: 7 },
  { name: 'Esponja de Louça', category: 'Limpeza', count: 7 },
  { name: 'Palha de Aço', category: 'Limpeza', count: 5 },
  { name: 'Papel Toalha', category: 'Limpeza', count: 7 },
  { name: 'Saco de Lixo 30L', category: 'Limpeza', count: 6 },
  { name: 'Saco de Lixo 50L', category: 'Limpeza', count: 6 },
  { name: 'Lustra Móveis', category: 'Limpeza', count: 4 },
  { name: 'Limpa Vidros', category: 'Limpeza', count: 4 },
  { name: 'Multiuso Limpeza', category: 'Limpeza', count: 7 },

  // Higiene
  { name: 'Papel Higiênico (Folha Dupla)', category: 'Higiene', count: 10 },
  { name: 'Sabonete em Barra', category: 'Higiene', count: 9 },
  { name: 'Sabonete Líquido', category: 'Higiene', count: 6 },
  { name: 'Creme Dental / Pasta de Dente', category: 'Higiene', count: 9 },
  { name: 'Escova de Dentes', category: 'Higiene', count: 6 },
  { name: 'Fio Dental', category: 'Higiene', count: 5 },
  { name: 'Shampoo', category: 'Higiene', count: 8 },
  { name: 'Condicionador', category: 'Higiene', count: 7 },
  { name: 'Desodorante Aerosol', category: 'Higiene', count: 8 },
  { name: 'Desodorante Roll-on', category: 'Higiene', count: 6 },
  { name: 'Hastes Flexíveis / Cotonetes', category: 'Higiene', count: 5 },
  { name: 'Absorvente', category: 'Higiene', count: 6 },
  { name: 'Algodão', category: 'Higiene', count: 4 },
];

/**
 * Memória local/em cache para sugestões genéricas adicionadas organicamente nesta sessão.
 */
let inMemoryGenericSuggestions: Array<{ name: string; category: string; usage_count: number }> = [
  ...INITIAL_GENERIC_CATALOG.map((i) => ({
    name: i.name,
    category: i.category,
    usage_count: i.count,
  })),
];

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas
 */
export const normalizeText = (text: string): string => {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Consulta a tabela generic_item_suggestions no Supabase (ou cache/base inicial).
 * Retorna sugestões ordenadas por uso.
 */
export async function fetchGenericSuggestions(query?: string): Promise<ItemSuggestion[]> {
  const cleanQuery = query ? normalizeText(query) : '';

  if (isSupabaseConfigured()) {
    try {
      let req = supabase
        .from('generic_item_suggestions')
        .select('id, name, category, usage_count')
        .order('usage_count', { ascending: false })
        .limit(50);

      if (cleanQuery) {
        req = req.ilike('name', `%${query?.trim()}%`);
      }

      const { data, error } = await req;

      if (!error && data && data.length > 0) {
        // Mescla com a base genérica e retorna
        const dbSuggestions: ItemSuggestion[] = data.map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category || 'Geral',
          count: row.usage_count || 1,
          source: 'generic' as const,
        }));

        // Se query informada, filtra os dados retornados
        return dbSuggestions.filter((item) =>
          !cleanQuery || normalizeText(item.name).includes(cleanQuery)
        );
      }
    } catch {
      // Em caso de erro de rede, utiliza o catálogo local
    }
  }

  // Catálogo padrão em memória
  return inMemoryGenericSuggestions
    .filter((item) => !cleanQuery || normalizeText(item.name).includes(cleanQuery))
    .sort((a, b) => (b.usage_count || 1) - (a.usage_count || 1))
    .slice(0, 30)
    .map((item) => ({
      name: item.name,
      category: item.category,
      count: item.usage_count,
      source: 'generic',
    }));
}

/**
 * Registra o crescimento orgânico da base genérica compartilhada.
 * NUNCA armazena nem expõe referências ao ID do usuário (total anonimato).
 */
export async function recordGenericItemUsage(name: string, category: string): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const normalized = normalizeText(trimmedName);

  // Atualiza cache em memória
  const existingLocal = inMemoryGenericSuggestions.find(
    (i) => normalizeText(i.name) === normalized
  );

  if (existingLocal) {
    existingLocal.usage_count = (existingLocal.usage_count || 1) + 1;
    if (category && category !== 'Geral') {
      existingLocal.category = category;
    }
  } else {
    inMemoryGenericSuggestions.push({
      name: trimmedName,
      category: category || 'Geral',
      usage_count: 1,
    });
  }

  // Se Supabase configurado, persiste de forma anônima
  if (isSupabaseConfigured()) {
    try {
      // 1. Busca se já existe um registro correspondente (case-insensitive)
      const { data: existingRows } = await supabase
        .from('generic_item_suggestions')
        .select('id, name, usage_count, category')
        .ilike('name', trimmedName)
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        const existing = existingRows[0];
        const newCount = (existing.usage_count || 1) + 1;
        await supabase
          .from('generic_item_suggestions')
          .update({
            usage_count: newCount,
            ...(category && category !== 'Geral' ? { category } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Insere novo item anônimo
        await supabase.from('generic_item_suggestions').insert({
          name: trimmedName,
          category: category || 'Geral',
          usage_count: 1,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Falha silenciosa para não travar UX
    }
  }
}

/**
 * Consulta a tabela purchase_items associada ao usuário logado,
 * agrupando por nome (case-insensitive) e ordenando por frequência de compra.
 */
export async function fetchPersonalSuggestionsFromDb(userId: string): Promise<ItemSuggestion[]> {
  if (!userId || !isSupabaseConfigured()) {
    return [];
  }

  try {
    // Busca os purchase_items diretamente da tabela purchase_items pelo user_id
    const { data, error } = await supabase
      .from('purchase_items')
      .select('id, name, category, user_id')
      .eq('user_id', userId);

    if (error || !data) {
      return [];
    }

    // Agrupa por nome normalizado
    const map = new Map<string, { name: string; category: string; count: number }>();

    data.forEach((row: any) => {
      if (!row.name || !row.name.trim()) return;
      const normalized = normalizeText(row.name);
      const existing = map.get(normalized);

      if (existing) {
        existing.count += 1;
        if (row.category && row.category !== 'Geral') {
          existing.category = row.category;
        }
      } else {
        map.set(normalized, {
          name: row.name.trim(),
          category: row.category || 'Geral',
          count: 1,
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        name: item.name,
        category: item.category,
        count: item.count,
        source: 'personal' as const,
      }));
  } catch {
    return [];
  }
}
