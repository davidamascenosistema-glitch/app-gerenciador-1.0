import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingCart, 
  Store, 
  DollarSign, 
  ClipboardList, 
  Check, 
  ChevronDown,
  Sparkles,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { List } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export interface StartPurchaseModalProps {
  isOpen: boolean;
  lists?: List[];
  selectedListId?: string | null;
  onClose: () => void;
  onStartPurchase: (params: {
    budget?: number;
    storeName?: string;
    fromListId?: string;
    name?: string;
  }) => Promise<void> | void;
}

const COMMON_STORES = [
  'Supermercado',
  'Atacadão',
  'Carrefour',
  'Pão de Açúcar',
  'Hortifruti',
  'Feira',
  'Farmácia',
  'Padaria',
];

const BUDGET_SUGGESTIONS = [100, 150, 200, 300, 500];

export function StartPurchaseModal({
  isOpen,
  lists = [],
  selectedListId: initialSelectedListId,
  onClose,
  onStartPurchase,
}: StartPurchaseModalProps) {
  const motionConfig = useMotionConfig();

  const [budgetValue, setBudgetValue] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [fromListId, setFromListId] = useState<string>('');
  const [availableLists, setAvailableLists] = useState<List[]>(lists);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sincroniza listas passadas por prop e busca se necessário
  useEffect(() => {
    if (lists && lists.length > 0) {
      setAvailableLists(lists);
    } else if (isOpen && isSupabaseConfigured()) {
      supabase
        .from('lists')
        .select('id, name, created_at, list_items(id)')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            const mapped: List[] = data.map((d: any) => ({
              id: d.id,
              name: d.name,
              createdAt: d.created_at,
              items: d.list_items ? d.list_items.map((it: any) => ({ id: it.id, name: '', category: '', quantity: 1, isWeighted: false })) : [],
            }));
            setAvailableLists(mapped);
          }
        });
    }
  }, [lists, isOpen]);

  // Reseta ou inicializa campos ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setBudgetValue('');
      setStoreName('');
      setFromListId(initialSelectedListId || '');
      setIsSubmitting(false);
    }
  }, [isOpen, initialSelectedListId]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const cleanStore = storeName.trim();
      let numericBudget: number | undefined = undefined;

      if (budgetValue.trim()) {
        const parsed = parseFloat(budgetValue.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          numericBudget = parsed;
        }
      }

      const cleanFromListId = fromListId.trim() ? fromListId : undefined;
      const selectedListObj = cleanFromListId
        ? availableLists.find((l) => l.id === cleanFromListId)
        : undefined;

      let purchaseName = 'Nova Compra';
      if (cleanStore && selectedListObj) {
        purchaseName = `${selectedListObj.name} (${cleanStore})`;
      } else if (cleanStore) {
        purchaseName = `Compra no ${cleanStore}`;
      } else if (selectedListObj) {
        purchaseName = selectedListObj.name;
      }

      await onStartPurchase({
        name: purchaseName,
        budget: numericBudget,
        storeName: cleanStore || undefined,
        fromListId: cleanFromListId,
      });
    } catch (err) {
      console.error('Erro ao submeter início da compra:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedListObj = fromListId
    ? availableLists.find((l) => l.id === fromListId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={motionConfig.modalSpring}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto"
      >
        {/* Header do Modal */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Configuração Inicial</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Iniciar Nova Compra
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-medium leading-normal">
            Defina o teto de gastos, a loja e escolha uma lista para começar.
          </p>
        </div>

        {/* Formulário com os campos solicitados */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          {/* Campo 1 (Orçamento): Input numérico com prefixo R$ para o campo budget (Opcional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="purchase-budget-input"
                className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center space-x-1.5"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Orçamento</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">Opcional</span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-700 select-none">
                R$
              </span>
              <input
                id="purchase-budget-input"
                type="number"
                step="0.01"
                min="0"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                placeholder="Definir teto de gastos (ex: 250,00)"
                className="w-full pl-11 pr-3.5 py-2.5 sm:py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm sm:text-base font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal transition-all outline-none min-h-[44px]"
              />
            </div>

            {/* Sugestões rápidas de orçamento */}
            <div className="flex flex-wrap gap-1.5 pt-0.5 items-center">
              <span className="text-[10px] uppercase font-bold text-zinc-400 mr-0.5">
                Sugestões:
              </span>
              {BUDGET_SUGGESTIONS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBudgetValue(String(val))}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    budgetValue === String(val)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>
          </div>

          {/* Campo 2 (Loja): Input de texto para o campo store_name (Opcional) */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label
                htmlFor="purchase-store-input"
                className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center space-x-1.5"
              >
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Loja</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">Opcional</span>
            </div>

            <input
              id="purchase-store-input"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Nome do estabelecimento (ex: Atacadão, Carrefour...)"
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal transition-all outline-none min-h-[44px]"
            />

            {/* Sugestões rápidas de estabelecimentos */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {COMMON_STORES.map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => setStoreName(store)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-colors cursor-pointer border ${
                    storeName.toLowerCase() === store.toLowerCase()
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200/80'
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          {/* Campo 3 (Seleção de Lista): Select/Dropdown listando todas as listas salvas */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label
                htmlFor="purchase-from-list-select"
                className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center space-x-1.5"
              >
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                <span>Seleção de Lista</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">Opcional</span>
            </div>

            <div className="relative">
              <select
                id="purchase-from-list-select"
                value={fromListId}
                onChange={(e) => setFromListId(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-10 py-2.5 sm:py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold text-zinc-900 outline-none transition-all cursor-pointer min-h-[46px]"
              >
                {/* Opção padrão obrigatória */}
                <option value="">Nenhuma (Começar do zero)</option>
                {availableLists.map((list) => {
                  const count = list.items ? list.items.length : 0;
                  return (
                    <option key={list.id} value={list.id}>
                      {list.name} ({count} {count === 1 ? 'item' : 'itens'})
                    </option>
                  );
                })}
              </select>

              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {selectedListObj ? (
              <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span>
                  Os <strong>{selectedListObj.items?.length || 0} itens</strong> da lista &ldquo;{selectedListObj.name}&rdquo; serão copiados para seu novo carrinho.
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500">
                Selecione uma lista de planejamento para importar seus itens pré-cadastrados.
              </p>
            )}
          </div>

          {/* Botões de Ação: "Cancelar" e "Começar a Comprar" (Verde) */}
          <div className="pt-3 border-t border-zinc-100 flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer min-h-[46px] disabled:opacity-60"
            >
              Cancelar
            </button>
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[46px] disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Preparando Compra...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                  <span>Começar a Comprar</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-85" />
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
