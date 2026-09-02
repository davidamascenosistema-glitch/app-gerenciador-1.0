import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ItemSuggestion, PricingModeDefault } from '../types';

/**
 * Base curated inicial de sugestões genéricas com categorias e modos de preço padrão pré-mapeados.
 * Fornece o catálogo padrão de inicialização e busca rápida.
 */
export const INITIAL_GENERIC_CATALOG: Array<{
  name: string;
  category: string;
  count: number;
  defaultPricingMode: PricingModeDefault;
}> = [
  // Alimentos / Mercearia
  { name: 'Arroz 5kg', category: 'Alimentos', count: 10, defaultPricingMode: 'unit' },
  { name: 'Arroz Integral', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Feijão Carioca', category: 'Alimentos', count: 9, defaultPricingMode: 'unit' },
  { name: 'Feijão Preto', category: 'Alimentos', count: 7, defaultPricingMode: 'unit' },
  { name: 'Açúcar Refinado', category: 'Alimentos', count: 8, defaultPricingMode: 'unit' },
  { name: 'Açúcar Cristal', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Óleo de Soja', category: 'Alimentos', count: 8, defaultPricingMode: 'unit' },
  { name: 'Azeite de Oliva', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Café em Pó', category: 'Alimentos', count: 9, defaultPricingMode: 'unit' },
  { name: 'Sal Refinado', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Macarrão Espaguete', category: 'Alimentos', count: 7, defaultPricingMode: 'unit' },
  { name: 'Macarrão Parafuso', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Molho de Tomate', category: 'Alimentos', count: 8, defaultPricingMode: 'unit' },
  { name: 'Farinha de Trigo', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Farinha de Mandioca', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Aveia em Flocos', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Milho em Conserva', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Ervilha em Conserva', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Atum Ralado', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Sardinha em Lata', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Biscoito Cream Cracker', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Biscoito Recheado', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Maionese', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Ketchup', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Mostarda', category: 'Alimentos', count: 3, defaultPricingMode: 'unit' },
  { name: 'Vinagre de Maçã', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Vinagre de Álcool', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Leite Condensado', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Creme de Leite', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Achocolatado em Pó', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },

  // Bebidas
  { name: 'Leite Integral 1L', category: 'Bebidas', count: 12, defaultPricingMode: 'unit' },
  { name: 'Leite Desnatado 1L', category: 'Bebidas', count: 8, defaultPricingMode: 'unit' },
  { name: 'Leite Sem Lactose', category: 'Bebidas', count: 6, defaultPricingMode: 'unit' },
  { name: 'Suco de Uva Integral', category: 'Bebidas', count: 7, defaultPricingMode: 'unit' },
  { name: 'Suco de Laranja', category: 'Bebidas', count: 7, defaultPricingMode: 'unit' },
  { name: 'Água Mineral sem Gás', category: 'Bebidas', count: 6, defaultPricingMode: 'unit' },
  { name: 'Água Mineral com Gás', category: 'Bebidas', count: 5, defaultPricingMode: 'unit' },
  { name: 'Refrigerante Cola 2L', category: 'Bebidas', count: 7, defaultPricingMode: 'unit' },
  { name: 'Refrigerante Guaraná 2L', category: 'Bebidas', count: 6, defaultPricingMode: 'unit' },
  { name: 'Cerveja Lata', category: 'Bebidas', count: 7, defaultPricingMode: 'unit' },
  { name: 'Chá Mate', category: 'Bebidas', count: 4, defaultPricingMode: 'unit' },
  { name: 'Água de Coco', category: 'Bebidas', count: 5, defaultPricingMode: 'unit' },

  // Açougue (Produtos por Peso ou Ambos)
  { name: 'Carne Moída', category: 'Açougue', count: 9, defaultPricingMode: 'weight' },
  { name: 'Peito de Frango', category: 'Açougue', count: 10, defaultPricingMode: 'weight' },
  { name: 'Filé de Frango', category: 'Açougue', count: 9, defaultPricingMode: 'weight' },
  { name: 'Coxa e Sobrecoxa', category: 'Açougue', count: 7, defaultPricingMode: 'weight' },
  { name: 'Picanha', category: 'Açougue', count: 6, defaultPricingMode: 'weight' },
  { name: 'Alcatra', category: 'Açougue', count: 7, defaultPricingMode: 'weight' },
  { name: 'Contrafilé', category: 'Açougue', count: 7, defaultPricingMode: 'weight' },
  { name: 'Acém em Cubos', category: 'Açougue', count: 6, defaultPricingMode: 'weight' },
  { name: 'Costelinha de Porco', category: 'Açougue', count: 5, defaultPricingMode: 'weight' },
  { name: 'Linguiça Toscana', category: 'Açougue', count: 7, defaultPricingMode: 'both' },
  { name: 'Bacon Fatiado', category: 'Açougue', count: 6, defaultPricingMode: 'both' },
  { name: 'Filé de Tilápia', category: 'Açougue', count: 5, defaultPricingMode: 'both' },

  // Frutas/Legumes / Hortifruti
  { name: 'Banana Prata', category: 'Frutas/Legumes', count: 10, defaultPricingMode: 'weight' },
  { name: 'Banana Nanica', category: 'Frutas/Legumes', count: 8, defaultPricingMode: 'weight' },
  { name: 'Maçã Gala', category: 'Frutas/Legumes', count: 8, defaultPricingMode: 'weight' },
  { name: 'Tomate Italiano', category: 'Frutas/Legumes', count: 9, defaultPricingMode: 'weight' },
  { name: 'Cebola', category: 'Frutas/Legumes', count: 9, defaultPricingMode: 'weight' },
  { name: 'Alho', category: 'Frutas/Legumes', count: 8, defaultPricingMode: 'weight' },
  { name: 'Batata Inglesa', category: 'Frutas/Legumes', count: 9, defaultPricingMode: 'weight' },
  { name: 'Batata Doce', category: 'Frutas/Legumes', count: 6, defaultPricingMode: 'weight' },
  { name: 'Cenoura', category: 'Frutas/Legumes', count: 7, defaultPricingMode: 'weight' },
  { name: 'Alface Americana', category: 'Hortifruti', count: 7, defaultPricingMode: 'unit' },
  { name: 'Limão Taiti', category: 'Frutas/Legumes', count: 7, defaultPricingMode: 'weight' },
  { name: 'Laranja Pera', category: 'Frutas/Legumes', count: 7, defaultPricingMode: 'weight' },
  { name: 'Abobrinha Italiana', category: 'Frutas/Legumes', count: 5, defaultPricingMode: 'weight' },
  { name: 'Brócolis', category: 'Frutas/Legumes', count: 5, defaultPricingMode: 'weight' },
  { name: 'Mamão Papaia', category: 'Frutas/Legumes', count: 5, defaultPricingMode: 'weight' },
  { name: 'Melancia', category: 'Frutas/Legumes', count: 4, defaultPricingMode: 'weight' },
  { name: 'Cheiro Verde (Salsa e Cebolinha)', category: 'Hortifruti', count: 6, defaultPricingMode: 'unit' },

  // Frios / Laticínios
  { name: 'Queijo Mussarela', category: 'Frios', count: 9, defaultPricingMode: 'both' },
  { name: 'Presunto Cozido', category: 'Frios', count: 8, defaultPricingMode: 'both' },
  { name: 'Peito de Peru', category: 'Frios', count: 5, defaultPricingMode: 'both' },
  { name: 'Manteiga com Sal', category: 'Frios', count: 7, defaultPricingMode: 'unit' },
  { name: 'Margarina', category: 'Frios', count: 6, defaultPricingMode: 'unit' },
  { name: 'Requeijão Cremoso', category: 'Frios', count: 7, defaultPricingMode: 'unit' },
  { name: 'Iogurte Natural', category: 'Frios', count: 6, defaultPricingMode: 'unit' },
  { name: 'Queijo Parmesão Ralado', category: 'Frios', count: 6, defaultPricingMode: 'unit' },
  { name: 'Ovos Brancos (Dúzia)', category: 'Alimentos', count: 10, defaultPricingMode: 'unit' },
  { name: 'Ovos Caipiras (Dúzia)', category: 'Alimentos', count: 7, defaultPricingMode: 'unit' },

  // Padaria
  { name: 'Pão Francês', category: 'Padaria', count: 11, defaultPricingMode: 'weight' },
  { name: 'Pão de Forma Tradicional', category: 'Padaria', count: 8, defaultPricingMode: 'unit' },
  { name: 'Pão de Forma Integral', category: 'Padaria', count: 7, defaultPricingMode: 'unit' },
  { name: 'Pão de Queijo', category: 'Padaria', count: 6, defaultPricingMode: 'both' },
  { name: 'Torrada Tradicional', category: 'Padaria', count: 5, defaultPricingMode: 'unit' },
  { name: 'Bolo de Cenoura', category: 'Padaria', count: 4, defaultPricingMode: 'unit' },

  // Limpeza
  { name: 'Detergente Líquido', category: 'Limpeza', count: 9, defaultPricingMode: 'unit' },
  { name: 'Sabão em Pó', category: 'Limpeza', count: 8, defaultPricingMode: 'unit' },
  { name: 'Sabão Líquido para Roupas', category: 'Limpeza', count: 7, defaultPricingMode: 'unit' },
  { name: 'Amaciante de Roupas', category: 'Limpeza', count: 8, defaultPricingMode: 'unit' },
  { name: 'Água Sanitária', category: 'Limpeza', count: 8, defaultPricingMode: 'unit' },
  { name: 'Desinfetante Perfumado', category: 'Limpeza', count: 7, defaultPricingMode: 'unit' },
  { name: 'Esponja de Louça', category: 'Limpeza', count: 7, defaultPricingMode: 'unit' },
  { name: 'Palha de Aço', category: 'Limpeza', count: 5, defaultPricingMode: 'unit' },
  { name: 'Papel Toalha', category: 'Limpeza', count: 7, defaultPricingMode: 'unit' },
  { name: 'Saco de Lixo 30L', category: 'Limpeza', count: 6, defaultPricingMode: 'unit' },
  { name: 'Saco de Lixo 50L', category: 'Limpeza', count: 6, defaultPricingMode: 'unit' },
  { name: 'Lustra Móveis', category: 'Limpeza', count: 4, defaultPricingMode: 'unit' },
  { name: 'Limpa Vidros', category: 'Limpeza', count: 4, defaultPricingMode: 'unit' },
  { name: 'Multiuso Limpeza', category: 'Limpeza', count: 7, defaultPricingMode: 'unit' },

  // Higiene
  { name: 'Papel Higiênico (Folha Dupla)', category: 'Higiene', count: 10, defaultPricingMode: 'unit' },
  { name: 'Sabonete em Barra', category: 'Higiene', count: 9, defaultPricingMode: 'unit' },
  { name: 'Sabonete Líquido', category: 'Higiene', count: 6, defaultPricingMode: 'unit' },
  { name: 'Creme Dental / Pasta de Dente', category: 'Higiene', count: 9, defaultPricingMode: 'unit' },
  { name: 'Escova de Dentes', category: 'Higiene', count: 6, defaultPricingMode: 'unit' },
  { name: 'Fio Dental', category: 'Higiene', count: 5, defaultPricingMode: 'unit' },
  { name: 'Shampoo', category: 'Higiene', count: 8, defaultPricingMode: 'unit' },
  { name: 'Condicionador', category: 'Higiene', count: 7, defaultPricingMode: 'unit' },
  { name: 'Desodorante Aerosol', category: 'Higiene', count: 8, defaultPricingMode: 'unit' },
  { name: 'Desodorante Roll-on', category: 'Higiene', count: 6, defaultPricingMode: 'unit' },
  { name: 'Hastes Flexíveis / Cotonetes', category: 'Higiene', count: 5, defaultPricingMode: 'unit' },
  { name: 'Absorvente', category: 'Higiene', count: 6, defaultPricingMode: 'unit' },
  { name: 'Algodão', category: 'Higiene', count: 4, defaultPricingMode: 'unit' },

  // Alimentos (expansão)
  { name: 'Arroz Branco Tipo 1', category: 'Alimentos', count: 8, defaultPricingMode: 'unit' },
  { name: 'Feijão Fradinho', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Lentilha', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Grão de Bico', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Ervilha Seca', category: 'Alimentos', count: 3, defaultPricingMode: 'unit' },
  { name: 'Amendoim', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Castanha de Caju', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Castanha do Pará', category: 'Alimentos', count: 3, defaultPricingMode: 'unit' },
  { name: 'Farinha de Rosca', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Fermento em Pó', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Fermento Biológico', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Polvilho Doce', category: 'Alimentos', count: 3, defaultPricingMode: 'unit' },
  { name: 'Polvilho Azedo', category: 'Alimentos', count: 3, defaultPricingMode: 'unit' },
  { name: 'Canela em Pó', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Orégano', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Pimenta do Reino', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Colorau', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Cominho', category: 'Alimentos', count: 3, defaultPricingMode: 'unit' },
  { name: 'Caldo de Galinha (Tablete)', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Caldo de Carne (Tablete)', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Gelatina em Pó', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Mel', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Geleia de Morango', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Pipoca de Micro-ondas', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Milho de Pipoca', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Chocolate em Barra', category: 'Alimentos', count: 7, defaultPricingMode: 'unit' },
  { name: 'Bombom', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Barra de Cereal', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Granola', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Leite em Pó', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Extrato de Tomate', category: 'Alimentos', count: 6, defaultPricingMode: 'unit' },
  { name: 'Azeitona em Conserva', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Palmito em Conserva', category: 'Alimentos', count: 3, defaultPricingMode: 'unit' },
  { name: 'Amido de Milho (Maisena)', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Adoçante', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Café Solúvel', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Cápsulas de Café', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Chá em Saquinho', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Suco em Pó', category: 'Alimentos', count: 5, defaultPricingMode: 'unit' },
  { name: 'Fósforos', category: 'Alimentos', count: 4, defaultPricingMode: 'unit' },
  { name: 'Vela', category: 'Alimentos', count: 3, defaultPricingMode: 'unit' },

  // Bebidas (expansão)
  { name: 'Vinho Tinto', category: 'Bebidas', count: 5, defaultPricingMode: 'unit' },
  { name: 'Vinho Branco', category: 'Bebidas', count: 3, defaultPricingMode: 'unit' },
  { name: 'Espumante', category: 'Bebidas', count: 3, defaultPricingMode: 'unit' },
  { name: 'Whisky', category: 'Bebidas', count: 3, defaultPricingMode: 'unit' },
  { name: 'Vodka', category: 'Bebidas', count: 3, defaultPricingMode: 'unit' },
  { name: 'Cachaça', category: 'Bebidas', count: 4, defaultPricingMode: 'unit' },
  { name: 'Energético', category: 'Bebidas', count: 5, defaultPricingMode: 'unit' },
  { name: 'Isotônico', category: 'Bebidas', count: 5, defaultPricingMode: 'unit' },
  { name: 'Água Tônica', category: 'Bebidas', count: 3, defaultPricingMode: 'unit' },
  { name: 'Refrigerante Zero 2L', category: 'Bebidas', count: 6, defaultPricingMode: 'unit' },
  { name: 'Suco de Maracujá', category: 'Bebidas', count: 5, defaultPricingMode: 'unit' },
  { name: 'Suco de Manga', category: 'Bebidas', count: 4, defaultPricingMode: 'unit' },
  { name: 'Leite de Coco', category: 'Bebidas', count: 4, defaultPricingMode: 'unit' },
  { name: 'Bebida Láctea', category: 'Bebidas', count: 5, defaultPricingMode: 'unit' },
  { name: 'Café Gelado Pronto', category: 'Bebidas', count: 3, defaultPricingMode: 'unit' },
  { name: 'Chá Gelado Pronto', category: 'Bebidas', count: 4, defaultPricingMode: 'unit' },

  // Açougue (expansão)
  { name: 'Fraldinha', category: 'Açougue', count: 6, defaultPricingMode: 'both' },
  { name: 'Maminha', category: 'Açougue', count: 6, defaultPricingMode: 'both' },
  { name: 'Cupim', category: 'Açougue', count: 5, defaultPricingMode: 'both' },
  { name: 'Patinho Moído', category: 'Açougue', count: 6, defaultPricingMode: 'both' },
  { name: 'Lagarto', category: 'Açougue', count: 5, defaultPricingMode: 'both' },
  { name: 'Músculo', category: 'Açougue', count: 5, defaultPricingMode: 'both' },
  { name: 'Carne para Sopa', category: 'Açougue', count: 4, defaultPricingMode: 'both' },
  { name: 'Asa de Frango', category: 'Açougue', count: 6, defaultPricingMode: 'both' },
  { name: 'Sobrecoxa de Frango', category: 'Açougue', count: 6, defaultPricingMode: 'both' },
  { name: 'Frango Inteiro', category: 'Açougue', count: 6, defaultPricingMode: 'both' },
  { name: 'Filé de Merluza', category: 'Açougue', count: 5, defaultPricingMode: 'both' },
  { name: 'Camarão', category: 'Açougue', count: 5, defaultPricingMode: 'both' },
  { name: 'Lombo Suíno', category: 'Açougue', count: 5, defaultPricingMode: 'both' },
  { name: 'Pernil Suíno', category: 'Açougue', count: 5, defaultPricingMode: 'both' },
  { name: 'Linguiça Calabresa', category: 'Açougue', count: 6, defaultPricingMode: 'both' },
  { name: 'Linguiça de Frango', category: 'Açougue', count: 4, defaultPricingMode: 'both' },
  { name: 'Salsicha', category: 'Açougue', count: 6, defaultPricingMode: 'unit' },
  { name: 'Fígado Bovino', category: 'Açougue', count: 3, defaultPricingMode: 'both' },
  { name: 'Coração de Frango', category: 'Açougue', count: 3, defaultPricingMode: 'both' },
  { name: 'Costela Bovina', category: 'Açougue', count: 5, defaultPricingMode: 'both' },
  { name: 'Carne de Cordeiro', category: 'Açougue', count: 3, defaultPricingMode: 'both' },

  // Frutas/Legumes (expansão)
  { name: 'Abacate', category: 'Frutas/Legumes', count: 6, defaultPricingMode: 'both' },
  { name: 'Abacaxi', category: 'Frutas/Legumes', count: 6, defaultPricingMode: 'both' },
  { name: 'Kiwi', category: 'Frutas/Legumes', count: 4, defaultPricingMode: 'both' },
  { name: 'Manga', category: 'Frutas/Legumes', count: 6, defaultPricingMode: 'both' },
  { name: 'Morango', category: 'Frutas/Legumes', count: 6, defaultPricingMode: 'unit' },
  { name: 'Uva', category: 'Frutas/Legumes', count: 6, defaultPricingMode: 'both' },
  { name: 'Pera', category: 'Frutas/Legumes', count: 5, defaultPricingMode: 'both' },
  { name: 'Pêssego', category: 'Frutas/Legumes', count: 3, defaultPricingMode: 'both' },
  { name: 'Ameixa', category: 'Frutas/Legumes', count: 3, defaultPricingMode: 'both' },
  { name: 'Coco Verde', category: 'Frutas/Legumes', count: 4, defaultPricingMode: 'both' },
  { name: 'Pepino', category: 'Frutas/Legumes', count: 5, defaultPricingMode: 'both' },
  { name: 'Pimentão', category: 'Frutas/Legumes', count: 5, defaultPricingMode: 'both' },
  { name: 'Berinjela', category: 'Frutas/Legumes', count: 3, defaultPricingMode: 'both' },
  { name: 'Chuchu', category: 'Frutas/Legumes', count: 3, defaultPricingMode: 'both' },
  { name: 'Vagem', category: 'Frutas/Legumes', count: 3, defaultPricingMode: 'both' },
  { name: 'Quiabo', category: 'Frutas/Legumes', count: 3, defaultPricingMode: 'both' },
  { name: 'Beterraba', category: 'Frutas/Legumes', count: 4, defaultPricingMode: 'both' },
  { name: 'Rabanete', category: 'Frutas/Legumes', count: 2, defaultPricingMode: 'both' },
  { name: 'Abóbora', category: 'Frutas/Legumes', count: 4, defaultPricingMode: 'both' },
  { name: 'Mandioca', category: 'Frutas/Legumes', count: 5, defaultPricingMode: 'both' },
  { name: 'Inhame', category: 'Frutas/Legumes', count: 3, defaultPricingMode: 'both' },

  // Hortifruti (expansão)
  { name: 'Repolho', category: 'Hortifruti', count: 4, defaultPricingMode: 'both' },
  { name: 'Couve', category: 'Hortifruti', count: 5, defaultPricingMode: 'unit' },
  { name: 'Espinafre', category: 'Hortifruti', count: 3, defaultPricingMode: 'unit' },
  { name: 'Rúcula', category: 'Hortifruti', count: 3, defaultPricingMode: 'unit' },
  { name: 'Milho Verde (Espiga)', category: 'Hortifruti', count: 4, defaultPricingMode: 'both' },
  { name: 'Gengibre', category: 'Hortifruti', count: 3, defaultPricingMode: 'weight' },

  // Frios (expansão)
  { name: 'Presunto Parma', category: 'Frios', count: 3, defaultPricingMode: 'both' },
  { name: 'Copa', category: 'Frios', count: 3, defaultPricingMode: 'both' },
  { name: 'Salame', category: 'Frios', count: 4, defaultPricingMode: 'both' },
  { name: 'Mortadela', category: 'Frios', count: 5, defaultPricingMode: 'both' },
  { name: 'Blanquet de Peru', category: 'Frios', count: 4, defaultPricingMode: 'both' },
  { name: 'Queijo Prato', category: 'Frios', count: 5, defaultPricingMode: 'both' },
  { name: 'Queijo Coalho', category: 'Frios', count: 4, defaultPricingMode: 'both' },
  { name: 'Queijo Minas Frescal', category: 'Frios', count: 5, defaultPricingMode: 'both' },
  { name: 'Queijo Gorgonzola', category: 'Frios', count: 3, defaultPricingMode: 'both' },
  { name: 'Ricota', category: 'Frios', count: 4, defaultPricingMode: 'unit' },
  { name: 'Cream Cheese', category: 'Frios', count: 5, defaultPricingMode: 'unit' },
  { name: 'Manteiga sem Sal', category: 'Frios', count: 4, defaultPricingMode: 'unit' },
  { name: 'Leite Fermentado', category: 'Frios', count: 4, defaultPricingMode: 'unit' },
  { name: 'Petit Suisse', category: 'Frios', count: 3, defaultPricingMode: 'unit' },

  // Padaria (expansão)
  { name: 'Pão Sírio', category: 'Padaria', count: 3, defaultPricingMode: 'unit' },
  { name: 'Pão de Hambúrguer', category: 'Padaria', count: 5, defaultPricingMode: 'unit' },
  { name: 'Pão de Hot Dog', category: 'Padaria', count: 4, defaultPricingMode: 'unit' },
  { name: 'Rosca Doce', category: 'Padaria', count: 3, defaultPricingMode: 'both' },
  { name: 'Sonho', category: 'Padaria', count: 3, defaultPricingMode: 'both' },
  { name: 'Croissant', category: 'Padaria', count: 3, defaultPricingMode: 'both' },
  { name: 'Baguete', category: 'Padaria', count: 3, defaultPricingMode: 'both' },
  { name: 'Broa de Milho', category: 'Padaria', count: 3, defaultPricingMode: 'both' },
  { name: 'Pão Doce', category: 'Padaria', count: 3, defaultPricingMode: 'both' },
  { name: 'Cuca', category: 'Padaria', count: 2, defaultPricingMode: 'both' },

  // Limpeza (expansão)
  { name: 'Álcool em Gel', category: 'Limpeza', count: 7, defaultPricingMode: 'unit' },
  { name: 'Álcool Líquido 70%', category: 'Limpeza', count: 6, defaultPricingMode: 'unit' },
  { name: 'Inseticida', category: 'Limpeza', count: 5, defaultPricingMode: 'unit' },
  { name: 'Desentupidor', category: 'Limpeza', count: 3, defaultPricingMode: 'unit' },
  { name: 'Removedor de Manchas', category: 'Limpeza', count: 4, defaultPricingMode: 'unit' },
  { name: 'Sabão em Barra', category: 'Limpeza', count: 5, defaultPricingMode: 'unit' },
  { name: 'Pastilha Sanitária', category: 'Limpeza', count: 4, defaultPricingMode: 'unit' },
  { name: 'Odorizador de Ambiente', category: 'Limpeza', count: 5, defaultPricingMode: 'unit' },
  { name: 'Papel Alumínio', category: 'Limpeza', count: 6, defaultPricingMode: 'unit' },
  { name: 'Filme Plástico PVC', category: 'Limpeza', count: 5, defaultPricingMode: 'unit' },
  { name: 'Saco para Aspirador', category: 'Limpeza', count: 2, defaultPricingMode: 'unit' },
  { name: 'Vassoura', category: 'Limpeza', count: 3, defaultPricingMode: 'unit' },
  { name: 'Rodo', category: 'Limpeza', count: 3, defaultPricingMode: 'unit' },
  { name: 'Pano de Chão', category: 'Limpeza', count: 4, defaultPricingMode: 'unit' },
  { name: 'Luva de Limpeza', category: 'Limpeza', count: 3, defaultPricingMode: 'unit' },

  // Higiene (expansão)
  { name: 'Protetor Solar', category: 'Higiene', count: 5, defaultPricingMode: 'unit' },
  { name: 'Repelente', category: 'Higiene', count: 4, defaultPricingMode: 'unit' },
  { name: 'Lâmina de Barbear', category: 'Higiene', count: 5, defaultPricingMode: 'unit' },
  { name: 'Espuma de Barbear', category: 'Higiene', count: 4, defaultPricingMode: 'unit' },
  { name: 'Loção Pós-Barba', category: 'Higiene', count: 3, defaultPricingMode: 'unit' },
  { name: 'Perfume', category: 'Higiene', count: 4, defaultPricingMode: 'unit' },
  { name: 'Desodorante Colônia', category: 'Higiene', count: 4, defaultPricingMode: 'unit' },
  { name: 'Hidratante Corporal', category: 'Higiene', count: 5, defaultPricingMode: 'unit' },
  { name: 'Sabonete Íntimo', category: 'Higiene', count: 4, defaultPricingMode: 'unit' },
  { name: 'Cera Depilatória', category: 'Higiene', count: 2, defaultPricingMode: 'unit' },
  { name: 'Cortador de Unha', category: 'Higiene', count: 2, defaultPricingMode: 'unit' },
  { name: 'Álcool em Gel de Bolso', category: 'Higiene', count: 4, defaultPricingMode: 'unit' },
  { name: 'Curativo / Band-aid', category: 'Higiene', count: 4, defaultPricingMode: 'unit' },
  { name: 'Fralda Infantil', category: 'Higiene', count: 6, defaultPricingMode: 'unit' },
  { name: 'Fralda Geriátrica', category: 'Higiene', count: 3, defaultPricingMode: 'unit' },
  { name: 'Lenço Umedecido', category: 'Higiene', count: 5, defaultPricingMode: 'unit' },

  // Geral (expansão)
  { name: 'Ração para Cachorro', category: 'Geral', count: 6, defaultPricingMode: 'unit' },
  { name: 'Ração para Gato', category: 'Geral', count: 5, defaultPricingMode: 'unit' },
  { name: 'Areia para Gato', category: 'Geral', count: 4, defaultPricingMode: 'unit' },
  { name: 'Petisco para Cachorro', category: 'Geral', count: 4, defaultPricingMode: 'unit' },
  { name: 'Pilha AA', category: 'Geral', count: 4, defaultPricingMode: 'unit' },
  { name: 'Pilha AAA', category: 'Geral', count: 4, defaultPricingMode: 'unit' },
  { name: 'Carvão para Churrasco', category: 'Geral', count: 4, defaultPricingMode: 'unit' },
  { name: 'Copo Descartável', category: 'Geral', count: 3, defaultPricingMode: 'unit' },
  { name: 'Prato Descartável', category: 'Geral', count: 3, defaultPricingMode: 'unit' },
  { name: 'Guardanapo', category: 'Geral', count: 5, defaultPricingMode: 'unit' },
];

/**
 * Memória local/em cache para sugestões genéricas adicionadas organicamente nesta sessão.
 */
let inMemoryGenericSuggestions: Array<{
  name: string;
  category: string;
  usage_count: number;
  defaultPricingMode: PricingModeDefault;
}> = [
  ...INITIAL_GENERIC_CATALOG.map((i) => ({
    name: i.name,
    category: i.category,
    usage_count: i.count,
    defaultPricingMode: i.defaultPricingMode,
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
 * Verifica se o nome do item corresponde à busca por prefixo de palavras.
 * Exemplo: buscando "ros", faz match com "Rosca" e "Farinha de Rosca", mas NÃO com "Desodorante Aerosol" ou "Fósforos".
 */
export const matchesWordPrefix = (text: string, query: string): boolean => {
  const cleanQuery = normalizeText(query).trim();
  if (!cleanQuery) return true;

  const cleanText = normalizeText(text).trim();
  if (!cleanText) return false;

  const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);
  const textWords = cleanText.split(/[\s,./\-+()]+/).filter(Boolean);

  return queryTerms.every((term) =>
    textWords.some((word) => word.startsWith(term))
  );
};

/**
 * Calcula a pontuação de relevância da busca:
 * - 100: Match exato
 * - 80: Começa exatamente com o termo digitado (ex: "Rosca Doce" para "ros")
 * - 60: Primeira palavra começa com o primeiro termo
 * - 40: Alguma palavra subsequente começa com o termo (ex: "Farinha de Rosca" para "ros")
 * - -1: Não corresponde por prefixo de palavra
 */
export const getSearchRelevanceScore = (text: string, query: string): number => {
  const cleanQuery = normalizeText(query).trim();
  if (!cleanQuery) return 0;

  const cleanText = normalizeText(text).trim();
  if (!cleanText) return -1;

  if (cleanText === cleanQuery) return 100;
  if (cleanText.startsWith(cleanQuery)) return 80;

  const textWords = cleanText.split(/[\s,./\-+()]+/).filter(Boolean);
  const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

  const allTermsMatch = queryTerms.every((term) =>
    textWords.some((word) => word.startsWith(term))
  );

  if (allTermsMatch) {
    if (textWords[0]?.startsWith(queryTerms[0])) {
      return 60;
    }
    return 40;
  }

  return -1;
};

/**
 * Consulta a tabela generic_item_suggestions no Supabase (ou cache/base inicial).
 * Retorna sugestões ordenadas por uso de forma decrescente com suporte a limite.
 */
export async function fetchGenericSuggestions(
  query?: string,
  limit: number = 1000
): Promise<ItemSuggestion[]> {
  const cleanQuery = query ? normalizeText(query) : '';
  const effectiveLimit = Math.max(1, limit);

  if (isSupabaseConfigured()) {
    try {
      let req = supabase
        .from('generic_item_suggestions')
        .select('id, name, category, usage_count, default_pricing_mode')
        .order('usage_count', { ascending: false })
        .limit(effectiveLimit);

      if (cleanQuery) {
        req = req.ilike('name', `%${query?.trim()}%`);
      }

      const { data, error } = await req;

      if (!error && data) {
        // Mescla com a base genérica e retorna
        const dbSuggestions: ItemSuggestion[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          category: row.category || 'Geral',
          count: row.usage_count || 1,
          source: 'generic' as const,
          defaultPricingMode: (row.default_pricing_mode as PricingModeDefault) || 'unit',
        }));

        // Se query informada, filtra usando prefixo de palavras
        return dbSuggestions
          .filter((item) => !cleanQuery || matchesWordPrefix(item.name, cleanQuery))
          .slice(0, effectiveLimit);
      }
    } catch {
      // Em caso de erro de rede, utiliza o catálogo local
    }
  }

  // Catálogo padrão em memória
  return inMemoryGenericSuggestions
    .filter((item) => !cleanQuery || matchesWordPrefix(item.name, cleanQuery))
    .sort((a, b) => (b.usage_count || 1) - (a.usage_count || 1))
    .slice(0, effectiveLimit)
    .map((item) => ({
      name: item.name,
      category: item.category,
      count: item.usage_count,
      source: 'generic' as const,
      defaultPricingMode: item.defaultPricingMode,
    }));
}

/**
 * Registra o crescimento orgânico da base genérica compartilhada.
 * NUNCA armazena nem expõe referências ao ID do usuário (total anonimato).
 */
export async function recordGenericItemUsage(
  name: string,
  category: string,
  defaultPricingMode: PricingModeDefault = 'unit'
): Promise<void> {
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
      defaultPricingMode,
    });
  }

  // Se Supabase configurado, persiste de forma anônima
  if (isSupabaseConfigured()) {
    try {
      // 1. Busca se já existe um registro correspondente (case-insensitive)
      const { data: existingRows } = await supabase
        .from('generic_item_suggestions')
        .select('id, name, usage_count, category, default_pricing_mode')
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
          default_pricing_mode: defaultPricingMode,
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
 * agrupando por nome (case-insensitive) e ordenando por frequência de compra,
 * aplicando limite na query e no resultado.
 */
export async function fetchPersonalSuggestionsFromDb(
  userId: string,
  limit?: number
): Promise<ItemSuggestion[]> {
  if (!userId || !isSupabaseConfigured()) {
    return [];
  }

  try {
    // Busca os purchase_items diretamente da tabela purchase_items pelo user_id
    let query = supabase
      .from('purchase_items')
      .select('id, name, category, user_id')
      .eq('user_id', userId);

    if (limit && limit > 0) {
      query = query.limit(limit * 5);
    }

    const { data, error } = await query;

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

    const sorted = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        name: item.name,
        category: item.category,
        count: item.count,
        source: 'personal' as const,
      }));

    return limit && limit > 0 ? sorted.slice(0, limit) : sorted;
  } catch {
    return [];
  }
}

/**
 * Função combinadora que busca e unifica sugestões pessoais e genéricas:
 * - Busca sugestões pessoais com limit igual a maxTotal (padrão: 6)
 * - Filtra da lista pessoal qualquer nome que já esteja em alreadyAddedNames (case-insensitive)
 * - Calcula quantos slots ainda restam: remainingSlots = maxTotal - personalSuggestions.length
 * - Se remainingSlots > 0, busca sugestões genéricas complementares ordenadas por usage_count,
 *   filtrando tanto os já adicionados quanto os já vindos das sugestões pessoais
 * - Retorna array único concatenando [pessoais, genéricas], nunca excedendo maxTotal
 */
export async function getCombinedSuggestionsFromDb(
  userId: string | null | undefined,
  alreadyAddedNames: string[] = [],
  maxTotal: number = 6
): Promise<ItemSuggestion[]> {
  const addedSet = new Set(alreadyAddedNames.map((n) => (n || '').trim().toLowerCase()));

  // 1. Busca sugestões pessoais com limit igual a maxTotal
  let personalSuggestions: ItemSuggestion[] = [];
  if (userId) {
    personalSuggestions = await fetchPersonalSuggestionsFromDb(userId, maxTotal * 2);
  }

  // Filtra da lista pessoal qualquer nome que já esteja em alreadyAddedNames (case-insensitive)
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

  // 3. Busca sugestões genéricas com limit proporcional para cobrir filtragens
  const genericSuggestions = await fetchGenericSuggestions(undefined, remainingSlots * 3);
  const filteredGeneric: ItemSuggestion[] = [];
  const genericSeen = new Set<string>();

  for (const item of genericSuggestions) {
    const lower = (item.name || '').trim().toLowerCase();
    if (!lower || addedSet.has(lower) || personalSeen.has(lower) || genericSeen.has(lower)) continue;
    genericSeen.add(lower);
    filteredGeneric.push(item);
    if (filteredGeneric.length >= remainingSlots) break;
  }

  // 4. Retorna array único nunca excedendo maxTotal
  return [...filteredPersonal, ...filteredGeneric].slice(0, maxTotal);
}
