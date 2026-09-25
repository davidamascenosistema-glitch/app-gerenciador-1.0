import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  Store,
  DollarSign,
  ClipboardList,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { List } from '../types';

export interface PurchaseSetupParams {
  name?: string;
  storeName?: string;
  budget?: number;
  fromListId?: string;
}

export interface PurchaseSetupSheetProps {
  isOpen: boolean;
  lists?: List[];
  selectedListId?: string | null;
  onClose: () => void;
  onStartPurchase: (params: PurchaseSetupParams) => void;
}

const COMMON_STORES = [
  'Supermercado',
  'Atacadão',
  'Assaí',
  'Carrefour',
  'Feira',
  'Hortifruti',
  'Padaria',
  'Farmácia',
];

const BUDGET_PRESETS = [100, 200, 300, 500];

export function PurchaseSetupSheet({
  isOpen,
  lists = [],
  selectedListId: initialSelectedListId,
  onClose,
  onStartPurchase,
}: PurchaseSetupSheetProps) {
  const motionConfig = useMotionConfig();

  const [fromListId, setFromListId] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [budgetValue, setBudgetValue] = useState<string>('');

  // Reset or sync states when sheet opens
  useEffect(() => {
    if (isOpen) {
      setFromListId(initialSelectedListId || '');
      setStoreName('');
      setBudgetValue('');
    }
  }, [isOpen, initialSelectedListId]);

  const selectedList = lists.find((l) => l.id === fromListId);

  const handleStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanStore = storeName.trim();
    let numericBudget: number | undefined = undefined;

    if (budgetValue.trim()) {
      const parsed = parseFloat(budgetValue.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        numericBudget = parsed;
      }
    }

    const cleanFromListId = fromListId.trim() ? fromListId : undefined;

    let purchaseName = 'Nova Compra';
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
      fromListId: cleanFromListId,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop Escuro com Blur Suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 320,
              mass: 0.8,
            }}
            className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden border border-zinc-200/90 pb-safe"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-setup-title"
          >
            {/* Visual Drag Handle for Bottom Sheet */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300" />
            </div>

            {/* Header */}
            <div className="px-5 pt-3 pb-3 sm:pt-5 flex items-center justify-between border-b border-zinc-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="purchase-setup-title"
                    className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-tight"
                  >
                    Preparar Compra
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Defina molde, local e orçamento da sua compra
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleStart} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* 1. Molde de Lista (Opcional) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Molde de Lista</span>
                  </label>
                  <span className="text-[11px] font-medium text-zinc-400">Opcional</span>
                </div>

                {/* Seletor Horizontal de Moldes */}
                <div className="flex items-center space-x-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
                  {/* Opção Em Branco / Sem Molde */}
                  <button
                    type="button"
                    onClick={() => setFromListId('')}
                    className={`shrink-0 flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                      fromListId === ''
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs ring-1 ring-emerald-500'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                        fromListId === '' ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {fromListId === '' ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3 h-3" />}
                    </div>
                    <span>Em branco (Zero)</span>
                  </button>

                  {/* Listas Cadastradas */}
                  {lists.map((list) => {
                    const isSelected = fromListId === list.id;
                    const count = list.items?.length || 0;

                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => setFromListId(isSelected ? '' : list.id)}
                        className={`shrink-0 flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs ring-1 ring-emerald-500'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : (
                            <ClipboardList className="w-3 h-3" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold leading-tight truncate max-w-[120px]">{list.name}</p>
                          <span
                            className={`text-[10px] font-medium leading-none ${
                              isSelected ? 'text-emerald-700' : 'text-zinc-400'
                            }`}
                          >
                            {count} {count === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {lists.length === 0 && (
                  <p className="text-[11px] text-zinc-400 mt-1 italic">
                    Nenhum molde salvo ainda. Você começará uma lista limpa.
                  </p>
                )}
              </div>

              {/* 2. Nome do Mercado (Opcional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="store-input" className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nome do Mercado</span>
                  </label>
                  <span className="text-[11px] font-medium text-zinc-400">Opcional</span>
                </div>

                <div className="relative">
                  <input
                    id="store-input"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Atacadão, Assaí, Carrefour, Feira..."
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 text-zinc-800 text-xs sm:text-sm placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                  {storeName && (
                    <button
                      type="button"
                      onClick={() => setStoreName('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Chips de Mercados Comuns */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {COMMON_STORES.map((common) => (
                    <button
                      key={common}
                      type="button"
                      onClick={() => setStoreName(storeName === common ? '' : common)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        storeName === common
                          ? 'bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800'
                      }`}
                    >
                      {common}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Orçamento (R$) (Opcional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="budget-input" className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Orçamento Previsto (R$)</span>
                  </label>
                  <span className="text-[11px] font-medium text-zinc-400">Opcional</span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    R$
                  </span>
                  <input
                    id="budget-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={budgetValue}
                    onChange={(e) => setBudgetValue(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 text-zinc-800 text-xs sm:text-sm font-semibold placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                  {budgetValue && (
                    <button
                      type="button"
                      onClick={() => setBudgetValue('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sugestões de Orçamento Rápido */}
                <div className="flex items-center space-x-1.5 mt-2">
                  <span className="text-[11px] text-zinc-400 font-medium">Sugestões:</span>
                  {BUDGET_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setBudgetValue(amount.toString())}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        budgetValue === amount.toString()
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      R$ {amount}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Footer com Botão de Ação Expansivo */}
            <div className="p-5 pt-3 bg-white border-t border-zinc-100">
              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={() => handleStart()}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-700/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
                <span>Iniciar Compra</span>
                {selectedList && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-700/60 text-emerald-100 text-xs font-semibold ml-1">
                    {selectedList.items?.length || 0} itens
                  </span>
                )}
                <ArrowRight className="w-4 h-4 ml-auto" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
