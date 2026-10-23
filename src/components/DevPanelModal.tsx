import React, { useState } from 'react';
import { 
  Terminal, 
  Trash2, 
  Database, 
  PlusCircle, 
  AlertTriangle, 
  X, 
  Check, 
  RefreshCw, 
  ShoppingCart, 
  BarChart3, 
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface DevPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  onDataChanged?: () => void;
}

interface ActionFeedback {
  type: 'success' | 'error' | 'info';
  message: string;
}

// Conjunto rico de itens para testes de histórico e gráficos de categorias
const MOCK_HISTORIC_ITEMS = [
  { name: 'Picanha Bovina Angus', category: 'Açougue', is_weighted: true, weight: 1.45, quantity: 1, price: 94.90, bought: true },
  { name: 'Filé de Salmão Fresco', category: 'Peixaria', is_weighted: true, weight: 0.85, quantity: 1, price: 79.90, bought: true },
  { name: 'Azeite de Oliva Extra Virgem 500ml', category: 'Mercearia', is_weighted: false, quantity: 2, price: 43.50, bought: true },
  { name: 'Café Especial Torrado em Grãos 250g', category: 'Mercearia', is_weighted: false, quantity: 1, price: 34.90, bought: true },
  { name: 'Queijo Parmesão Ralado Faixa Azul', category: 'Laticínios', is_weighted: false, quantity: 3, price: 18.90, bought: true },
  { name: 'Iogurte Grego Natural 400g', category: 'Laticínios', is_weighted: false, quantity: 4, price: 7.20, bought: true },
  { name: 'Tomate Italiano Selecionado', category: 'Hortifrúti', is_weighted: true, weight: 2.10, quantity: 1, price: 8.90, bought: true },
  { name: 'Banana Prata Climatizada', category: 'Hortifrúti', is_weighted: true, weight: 1.60, quantity: 1, price: 6.40, bought: true },
  { name: 'Vinho Tinto Cabernet Sauvignon', category: 'Bebidas', is_weighted: false, quantity: 2, price: 65.00, bought: true },
  { name: 'Água Mineral com Gás 1.5L', category: 'Bebidas', is_weighted: false, quantity: 6, price: 3.19, bought: true },
  { name: 'Detergente Concentrado para Louças', category: 'Limpeza', is_weighted: false, quantity: 4, price: 2.89, bought: true },
  { name: 'Amaciante de Roupas Perfumado 2L', category: 'Limpeza', is_weighted: false, quantity: 1, price: 22.90, bought: true },
  { name: 'Pão de Queijo Congelado Tradicional', category: 'Padaria', is_weighted: false, quantity: 2, price: 16.50, bought: true },
  { name: 'Alho Roxo a Granel', category: 'Hortifrúti', is_weighted: true, weight: 0.25, quantity: 1, price: 32.00, bought: true },
  { name: 'Caixa de Fósforos Longos', category: 'Mercearia', is_weighted: false, quantity: 1, price: 1.75, bought: true },
];

// Conjunto para simular carrinho em andamento (limites de orçamento e rolagem)
const MOCK_ACTIVE_CART_ITEMS = [
  { name: 'Arroz Branco Tipo 1 5kg', category: 'Mercearia', is_weighted: false, quantity: 2, price: 29.90, bought: true },
  { name: 'Feijão Carioca 1kg', category: 'Mercearia', is_weighted: false, quantity: 3, price: 8.40, bought: true },
  { name: 'Leite Integral UHT 1L', category: 'Laticínios', is_weighted: false, quantity: 12, price: 5.29, bought: true },
  { name: 'Peito de Frango Congelado', category: 'Açougue', is_weighted: true, weight: 2.30, quantity: 1, price: 21.90, bought: true },
  { name: 'Manteiga com Sal Primeira Qualidade', category: 'Laticínios', is_weighted: false, quantity: 1, price: 14.80, bought: false },
  { name: 'Maçã Fuji Nacional', category: 'Hortifrúti', is_weighted: true, weight: 1.20, quantity: 1, price: 9.90, bought: true },
  { name: 'Batata Inglesa Lavada', category: 'Hortifrúti', is_weighted: true, weight: 3.40, quantity: 1, price: 6.99, bought: false },
  { name: 'Sabão Líquido Lava-Roupas 3L', category: 'Limpeza', is_weighted: false, quantity: 1, price: 46.90, bought: true },
  { name: 'Papel Higiênico Folha Dupla 12 rolos', category: 'Higiene', is_weighted: false, quantity: 2, price: 23.50, bought: true },
  { name: 'Cerveja Puro Malte 350ml', category: 'Bebidas', is_weighted: false, quantity: 12, price: 4.89, bought: false },
  { name: 'Suco Integral de Uva 1.5L', category: 'Bebidas', is_weighted: false, quantity: 2, price: 16.90, bought: true },
  { name: 'Pão de Forma Tradicional 500g', category: 'Padaria', is_weighted: false, quantity: 1, price: 8.90, bought: false },
  { name: 'Cebola Nacional', category: 'Hortifrúti', is_weighted: true, weight: 1.10, quantity: 1, price: 5.50, bought: true },
  { name: 'Creme Dental Tripla Ação', category: 'Higiene', is_weighted: false, quantity: 3, price: 4.20, bought: false },
  { name: 'Chocolate em Barra Meio Amargo 90g', category: 'Doces', is_weighted: false, quantity: 4, price: 7.99, bought: true },
];

export function DevPanelModal({ isOpen, onClose, userId, onDataChanged }: DevPanelModalProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleWipeData = async () => {
    if (!userId) {
      setFeedback({ type: 'error', message: 'Nenhum user_id autenticado disponível.' });
      return;
    }

    setLoadingAction('wipe');
    setFeedback(null);

    try {
      if (isConfigured) {
        // 1. Busca IDs de compras do usuário para excluir itens
        const { data: userPurchases } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', userId);

        if (userPurchases && userPurchases.length > 0) {
          const purchaseIds = userPurchases.map((p) => p.id);
          await supabase.from('purchase_items').delete().in('purchase_id', purchaseIds);
        }

        // 2. Deleta as compras do usuário
        await supabase.from('purchases').delete().eq('user_id', userId);

        // 3. Busca IDs de listas para excluir itens
        const { data: userLists } = await supabase
          .from('lists')
          .select('id')
          .eq('user_id', userId);

        if (userLists && userLists.length > 0) {
          const listIds = userLists.map((l) => l.id);
          await supabase.from('list_items').delete().in('list_id', listIds);
        }

        // 4. Deleta as listas do usuário
        await supabase.from('lists').delete().eq('user_id', userId);
      }

      // Limpa os caches locais da aplicação
      try {
        localStorage.removeItem('lista_e_compra_purchases_cache');
        localStorage.removeItem('lista_e_compra_template_lists');
        localStorage.removeItem('shopping_lists_v1');
      } catch (err) {
        console.warn('Erro ao limpar localStorage:', err);
      }

      setFeedback({
        type: 'success',
        message: 'Todos os dados de compras, listas e itens foram limpos com sucesso!',
      });
      setShowConfirmWipe(false);

      if (onDataChanged) {
        onDataChanged();
      }
    } catch (err: any) {
      console.error('Erro ao executar wipe:', err);
      setFeedback({
        type: 'error',
        message: `Falha ao limpar dados: ${err.message || 'Erro desconhecido'}`,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInjectHistoricPurchase = async () => {
    if (!userId) {
      setFeedback({ type: 'error', message: 'Nenhum user_id autenticado disponível.' });
      return;
    }

    setLoadingAction('historic');
    setFeedback(null);

    try {
      const newPurchaseId = crypto.randomUUID();
      const now = new Date();
      // Data ligeiramente no passado (ex: 2 dias atrás) para dar naturalidade ao histórico
      const finishedDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

      // Calcula valor total dos itens mockados
      let calculatedTotal = 0;
      const itemsToInsert = MOCK_HISTORIC_ITEMS.map((item) => {
        const itemId = crypto.randomUUID();
        const itemTotal = item.is_weighted && item.weight 
          ? (item.weight * item.price) 
          : (item.quantity * item.price);
        calculatedTotal += itemTotal;

        return {
          id: itemId,
          purchase_id: newPurchaseId,
          user_id: userId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          weight: item.weight || null,
          is_weighted: item.is_weighted,
          price: item.price,
          bought: true,
          created_at: finishedDate,
        };
      });

      if (isConfigured) {
        // 1. Insere a compra com status 'concluida' / 'finished'
        const { error: purchaseErr } = await supabase.from('purchases').insert({
          id: newPurchaseId,
          user_id: userId,
          name: 'Compra Teste Dev (Mercado Modelo)',
          status: 'finished',
          origin: 'list',
          created_at: finishedDate,
          finished_at: finishedDate,
          budget: 350.00,
          store_name: 'Supermercado Modelo Dev',
          total_amount: Number(calculatedTotal.toFixed(2)),
        });

        if (purchaseErr) {
          throw new Error(`Erro na compra: ${purchaseErr.message}`);
        }

        // 2. Insere os 15 itens variados
        const { error: itemsErr } = await supabase.from('purchase_items').insert(itemsToInsert);

        if (itemsErr) {
          throw new Error(`Erro nos itens: ${itemsErr.message}`);
        }
      }

      // Adiciona também ao cache local para refletir imediatamente
      try {
        const rawCache = localStorage.getItem('lista_e_compra_purchases_cache');
        const cache = rawCache ? JSON.parse(rawCache) : [];
        cache.unshift({
          id: newPurchaseId,
          name: 'Compra Teste Dev (Mercado Modelo)',
          status: 'finished',
          origin: 'list',
          createdAt: finishedDate,
          finishedAt: finishedDate,
          budget: 350.00,
          storeName: 'Supermercado Modelo Dev',
          items: itemsToInsert.map((i) => ({
            id: i.id,
            name: i.name,
            category: i.category,
            quantity: i.quantity,
            weight: i.weight || undefined,
            isWeighted: i.is_weighted,
            price: i.price,
            bought: true,
          })),
        });
        localStorage.setItem('lista_e_compra_purchases_cache', JSON.stringify(cache));
      } catch (e) {
        console.warn('Erro ao atualizar cache local:', e);
      }

      setFeedback({
        type: 'success',
        message: `Compra de teste inserida! Total: R$ ${calculatedTotal.toFixed(2)} com 15 itens em 7 categorias.`,
      });

      if (onDataChanged) {
        onDataChanged();
      }
    } catch (err: any) {
      console.error('Erro ao injetar compra de teste:', err);
      setFeedback({
        type: 'error',
        message: `Falha na injeção: ${err.message || 'Erro de conexão'}`,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInjectActiveCart = async () => {
    if (!userId) {
      setFeedback({ type: 'error', message: 'Nenhum user_id autenticado disponível.' });
      return;
    }

    setLoadingAction('active_cart');
    setFeedback(null);

    try {
      let targetPurchaseId: string | null = null;

      if (isConfigured) {
        // Verifica se já existe uma compra pending
        const { data: pendingPurchases } = await supabase
          .from('purchases')
          .select('id, budget')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (pendingPurchases && pendingPurchases.length > 0) {
          targetPurchaseId = pendingPurchases[0].id;
        } else {
          // Cria uma compra pending para abrigar a sessão ativa
          targetPurchaseId = crypto.randomUUID();
          const { error: createErr } = await supabase.from('purchases').insert({
            id: targetPurchaseId,
            user_id: userId,
            name: 'Compra em Andamento (Simulação)',
            status: 'pending',
            origin: 'list',
            created_at: new Date().toISOString(),
            budget: 250.00,
            store_name: 'Hipermercado Central Dev',
          });
          if (createErr) throw new Error(`Não foi possível criar compra pendente: ${createErr.message}`);
        }

        // Prepara os 15 itens
        const itemsToInsert = MOCK_ACTIVE_CART_ITEMS.map((item) => ({
          id: crypto.randomUUID(),
          purchase_id: targetPurchaseId,
          user_id: userId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          weight: item.weight || null,
          is_weighted: item.is_weighted,
          price: item.price,
          bought: item.bought,
          created_at: new Date().toISOString(),
        }));

        const { error: itemsErr } = await supabase.from('purchase_items').insert(itemsToInsert);
        if (itemsErr) throw new Error(`Falha ao inserir itens no carrinho: ${itemsErr.message}`);
      }

      setFeedback({
        type: 'success',
        message: `15 itens injetados com sucesso no carrinho da compra ativa (ID: ${targetPurchaseId?.slice(0, 8)}...)!`,
      });

      if (onDataChanged) {
        onDataChanged();
      }
    } catch (err: any) {
      console.error('Erro ao injetar carrinho:', err);
      setFeedback({
        type: 'error',
        message: `Falha na injeção do carrinho: ${err.message || 'Erro inesperado'}`,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="relative w-full max-w-lg bg-zinc-950 border-2 border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]"
      >
        {/* Header Dev */}
        <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold tracking-wider text-amber-400">DEV PANEL</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Restrito
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Ambiente de Testes & Depuração Supabase</p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar Painel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/80 text-[11px] flex flex-wrap items-center justify-between gap-2 text-zinc-400">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="text-zinc-500">USER:</span>
            <span className="text-zinc-300 font-semibold truncate max-w-[180px]">
              {userId || 'Desconectado'}
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-500">SUPABASE:</span>
            {isConfigured ? (
              <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Conectado</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center space-x-1 font-semibold">
                <span>Modo Local (Cache)</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`px-4 py-2.5 text-xs border-b flex items-center space-x-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                  : feedback.type === 'error'
                  ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="flex-1 break-words leading-tight">{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body Actions */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Card Ação 1: Injetar Compra Histórica */}
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-zinc-100 text-xs flex items-center space-x-1.5">
                  <span>Injetar Compra de Teste (Histórico)</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Insere uma compra com status <code className="text-emerald-400 bg-zinc-950 px-1 py-0.5 rounded">finished</code> e 15 itens variados (pesáveis, unitários, preços altos e baixos, 7 categorias) para testar os gráficos da aba Análises e histórico.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleInjectHistoricPurchase}
                    disabled={loadingAction !== null}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    {loadingAction === 'historic' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlusCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Gerar Compra Concluída</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card Ação 2: Injetar Carrinho Ativo */}
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-zinc-100 text-xs flex items-center space-x-1.5">
                  <span>Injetar Carrinho (Sessão Ativa)</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Injeta 15 itens diretamente na tabela <code className="text-cyan-400 bg-zinc-950 px-1 py-0.5 rounded">purchase_items</code> de uma compra com status <code className="text-amber-400 bg-zinc-950 px-1 py-0.5 rounded">pending</code> para simular carrinho cheio e testar os alertas de orçamento.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleInjectActiveCart}
                    disabled={loadingAction !== null}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    {loadingAction === 'active_cart' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Layers className="w-3.5 h-3.5" />
                    )}
                    <span>Popular Carrinho Ativo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card Ação 3: Wipe Data (Área de Perigo) */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/60 hover:border-rose-800 transition-colors">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-rose-300 text-xs flex items-center space-x-1.5">
                  <span>Wipe Data (Deletar Histórico & Listas)</span>
                </h3>
                <p className="text-[11px] text-rose-400/80 mt-1 leading-relaxed">
                  Executa um <code className="bg-rose-950 px-1 py-0.5 rounded text-rose-300">DELETE</code> permanente direto nas tabelas <code className="text-zinc-200">purchases</code>, <code className="text-zinc-200">purchase_items</code>, <code className="text-zinc-200">lists</code> e <code className="text-zinc-200">list_items</code> para o <span className="text-zinc-200">user_id</span> atual. Limpa também os caches locais.
                </p>

                <div className="mt-3">
                  {!showConfirmWipe ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmWipe(true)}
                      disabled={loadingAction !== null}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 active:bg-rose-800 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Todo o Histórico</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-rose-950 border border-rose-700/60 space-y-2">
                      <p className="text-[11px] font-bold text-rose-200 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Atenção: Ação irreversível! Confirmar exclusão?</span>
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleWipeData}
                          disabled={loadingAction !== null}
                          className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-[11px] flex items-center space-x-1.5 cursor-pointer"
                        >
                          {loadingAction === 'wipe' ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Sim, Excluir Tudo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConfirmWipe(false)}
                          disabled={loadingAction !== null}
                          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 font-medium text-[11px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-[11px]">
          <span className="text-zinc-500">Pressione Fechar para voltar</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
