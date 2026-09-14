import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Store, 
  DollarSign, 
  ClipboardList, 
  X, 
  Check, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { List } from '../types';

interface NewPurchaseModalProps {
  isOpen: boolean;
  lists: List[];
  selectedListId?: string | null;
  onClose: () => void;
  onStartPurchase: (params: {
    name?: string;
    storeName?: string;
    budget?: number;
    fromListId?: string;
  }) => void;
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

export function NewPurchaseModal({
  isOpen,
  lists,
  selectedListId: initialSelectedListId,
  onClose,
  onStartPurchase,
}: NewPurchaseModalProps) {
  const motionConfig = useMotionConfig();

  const [storeName, setStoreName] = useState<string>('');
  const [hasBudget, setHasBudget] = useState<boolean>(false);
  const [budgetValue, setBudgetValue] = useState<string>('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Quando o modal abre ou initialSelectedListId muda, atualiza a lista selecionada
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedListId) {
        setSelectedListId(initialSelectedListId);
      } else {
        setSelectedListId(null);
      }
      setStoreName('');
      setHasBudget(false);
      setBudgetValue('');
    }
  }, [isOpen, initialSelectedListId]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanStore = storeName.trim();
    let numericBudget: number | undefined = undefined;

    if (hasBudget && budgetValue) {
      // Normaliza vírgula para ponto e converte
      const parsed = parseFloat(budgetValue.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        numericBudget = parsed;
      }
    }

    // Determina o nome da compra: se tem loja, pode ser "Compra no [Loja]" ou o nome da lista
    const selectedList = lists.find((l) => l.id === selectedListId);
    let purchaseName = 'Compra no Mercado';
    if (cleanStore && selectedList) {
      purchaseName = `${selectedList.name} (${cleanStore})`;
    } else if (cleanStore) {
      purchaseName = `Compra no ${cleanStore}`;
    } else if (selectedList) {
      purchaseName = selectedList.name;
    }

    onStartPurchase({
      name: purchaseName,
      storeName: cleanStore || undefined,
      budget: numericBudget,
      fromListId: selectedListId || undefined,
    });
  };

  const handleQuickBudgetSelect = (val: number) => {
    setHasBudget(true);
    setBudgetValue(val.toString());
  };

  const handleQuickStoreSelect = (store: string) => {
    setStoreName(store);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={motionConfig.modalSpring}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto"
      >
        {/* Header com gradiente sutil de compras */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-2.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sessão de Compras</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Iniciar Compra
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-medium leading-normal">
            Configure detalhes da sua ida ao mercado para melhor controle
          </p>
        </div>

        {/* Formulário de Configuração Ágil */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* 1. Nome do Estabelecimento (store_name) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="store-name-input" className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center space-x-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Onde você vai comprar? (opcional)</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">Opcional</span>
            </div>

            <input
              id="store-name-input"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ex: Pão de Açúcar, Atacadão, Feira..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all outline-none font-medium min-h-[44px]"
            />

            {/* Sugestões rápidas de estabelecimentos */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_STORES.map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => handleQuickStoreSelect(store)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer border ${
                    storeName.toLowerCase() === store.toLowerCase()
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-600 border-zinc-200/80'
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Definir Orçamento Máximo (budget) */}
          <div className="space-y-2.5 pt-1 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center space-x-1.5 cursor-pointer select-none">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Definir valor máximo de gastos?</span>
              </label>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={hasBudget}
                onClick={() => {
                  const next = !hasBudget;
                  setHasBudget(next);
                  if (!next) setBudgetValue('');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  hasBudget ? 'bg-emerald-600' : 'bg-zinc-200'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    hasBudget ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {hasBudget && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={motionConfig.pressSpring}
                  className="space-y-2 overflow-hidden pt-1"
                >
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-zinc-500">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      autoFocus
                      value={budgetValue}
                      onChange={(e) => setBudgetValue(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-11 pr-3.5 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-base font-bold text-zinc-900 placeholder:text-zinc-400 transition-all outline-none min-h-[44px]"
                    />
                  </div>

                  {/* Chips de valores sugeridos */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1">
                      Sugestões:
                    </span>
                    {BUDGET_SUGGESTIONS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickBudgetSelect(val)}
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

                  <p className="text-[11px] text-zinc-500 leading-tight">
                    O aplicativo alertará você visualmente no carrinho caso você ultrapasse esse valor.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Escolha de Lista Base (from_list_id) */}
          <div className="space-y-2 pt-1 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center space-x-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                <span>Usar uma lista de planejamento?</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">Opcional</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {/* Opção: Começar do zero */}
              <div
                onClick={() => setSelectedListId(null)}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedListId === null
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                    : 'bg-zinc-50 hover:bg-zinc-100/80 border-zinc-200 text-zinc-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                    selectedListId === null ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">
                      Começar com lista em branco
                    </p>
                    <p className="text-[11px] text-zinc-500 font-normal leading-none mt-0.5">
                      Adicione produtos manualmente ou escaneie no mercado
                    </p>
                  </div>
                </div>
                {selectedListId === null && (
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                )}
              </div>

              {/* Opções das Listas Cadastradas */}
              {lists.map((list) => {
                const isSelected = selectedListId === list.id;
                const itemsCount = list.items ? list.items.length : 0;
                return (
                  <div
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-zinc-50 hover:bg-zinc-100/80 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                      }`}>
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate leading-tight">
                          {list.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 font-normal leading-none mt-0.5">
                          {itemsCount} {itemsCount === 1 ? 'item de molde' : 'itens de molde'}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ações do Modal */}
          <div className="pt-3 border-t border-zinc-100 flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer min-h-[46px]"
            >
              Cancelar
            </button>
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              type="submit"
              className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[46px]"
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
              <span>Iniciar no Mercado</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
