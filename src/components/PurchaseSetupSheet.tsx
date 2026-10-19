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
  Loader2,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { List } from '../types';
import { sanitizePriceInput } from '../utils/purchaseHelpers';

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
  startMode?: 'scratch' | 'list';
  onClose: () => void;
  onStartPurchase: (params: PurchaseSetupParams) => void;
  onNavigateToCreateList?: () => void;
}

const DEFAULT_STORES = [
  'Supermercado X',
  'Atacadão',
  'Assaí',
  'Feira',
];

const BUDGET_MILESTONES = [
  { value: 0, label: 'R$ 0' },
  { value: 100, label: 'R$ 100' },
  { value: 250, label: 'R$ 250' },
  { value: 500, label: 'R$ 500' },
  { value: 1000, label: 'R$ 1.000' },
];

export function PurchaseSetupSheet({
  isOpen,
  lists = [],
  selectedListId: initialSelectedListId,
  startMode = 'scratch',
  onClose,
  onStartPurchase,
}: PurchaseSetupSheetProps) {
  const motionConfig = useMotionConfig();

  const [fromListId, setFromListId] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [storeSearchQuery, setStoreSearchQuery] = useState<string>('');
  const [savedStores, setSavedStores] = useState<string[]>(DEFAULT_STORES);
  const [budgetValue, setBudgetValue] = useState<string>('');
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincroniza estados quando o modal abre
  useEffect(() => {
    if (isOpen) {
      if (startMode === 'scratch') {
        setFromListId('');
      } else if (initialSelectedListId) {
        setFromListId(initialSelectedListId);
      } else if (lists.length > 0) {
        setFromListId(lists[0].id);
      } else {
        setFromListId('');
      }

      setStoreName('');
      setStoreSearchQuery('');
      setBudgetValue('');
      setSliderValue(0);
      setIsSubmitting(false);
    }
  }, [isOpen, initialSelectedListId, startMode, lists]);

  // Sincroniza slider quando o input de texto muda
  const handleBudgetTextChange = (rawText: string) => {
    const sanitized = sanitizePriceInput(rawText);
    setBudgetValue(sanitized);

    if (!sanitized.trim()) {
      setSliderValue(0);
      return;
    }

    const parsed = parseFloat(sanitized.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setSliderValue(Math.min(1000, Math.max(0, Math.round(parsed))));
    } else {
      setSliderValue(0);
    }
  };

  // Sincroniza input de texto quando o slider muda
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderValue(val);
    if (val === 0) {
      setBudgetValue('');
    } else {
      setBudgetValue(
        val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      );
    }
  };

  // Clique em um Marco da Régua de Orçamento
  const handleMilestoneClick = (val: number) => {
    setSliderValue(val);
    if (val === 0) {
      setBudgetValue('');
    } else {
      setBudgetValue(
        val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      );
    }
  };

  // Seleção de Estabelecimento
  const handleSelectStore = (store: string) => {
    const clean = store.trim();
    if (!clean) return;

    setStoreName(clean);
    setStoreSearchQuery('');

    setSavedStores((prev) => {
      if (prev.some((s) => s.toLowerCase() === clean.toLowerCase())) {
        return prev;
      }
      return [clean, ...prev];
    });
  };

  const handleClearSelectedStore = () => {
    setStoreName('');
    setStoreSearchQuery('');
  };

  const selectedList = lists.find((l) => l.id === fromListId);
  const sliderPercentage = Math.min(100, Math.max(0, (sliderValue / 1000) * 100));

  // Filtragem de Estabelecimentos
  const trimmedQuery = storeSearchQuery.trim();
  const filteredStores = savedStores.filter((s) =>
    s.toLowerCase().includes(trimmedQuery.toLowerCase())
  );
  const exactMatchExists = savedStores.some(
    (s) => s.toLowerCase() === trimmedQuery.toLowerCase()
  );

  const handleStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    const cleanStore = storeName.trim();
    let numericBudget: number | undefined = undefined;

    if (budgetValue.trim()) {
      const sanitized = sanitizePriceInput(budgetValue);
      const parsed = parseFloat(sanitized.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0 && isFinite(parsed)) {
        numericBudget = Math.round(parsed * 100) / 100;
      }
    } else if (sliderValue > 0) {
      numericBudget = sliderValue;
    }

    const cleanFromListId = fromListId.trim() ? fromListId : undefined;

    let purchaseName = 'Nova Compra';
    if (cleanStore && selectedList) {
      purchaseName = `${selectedList.name} (${cleanStore})`;
    } else if (cleanStore) {
      purchaseName = `Compra em ${cleanStore}`;
    } else if (selectedList) {
      purchaseName = selectedList.name;
    }

    try {
      onStartPurchase({
        name: purchaseName,
        storeName: cleanStore || undefined,
        budget: numericBudget,
        fromListId: cleanFromListId,
      });
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Escuro com Blur Suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Modal Central Compacto conforme a foto anexada */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 350,
            }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden border border-zinc-200/90 font-sans max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-setup-title"
          >
            {/* Header Compacto com ícone de carrinho em quadrado arredondado */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h2
                  id="purchase-setup-title"
                  className="text-lg font-black text-zinc-900 tracking-tight leading-tight"
                >
                  Preparar Compra
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleStart} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Lista Base (quando acionado pelo modo de Lista) */}
              {startMode === 'list' && lists.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Lista Base</span>
                    </label>
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {fromListId ? selectedList?.name || 'Selecionada' : 'Em branco'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setFromListId('')}
                      className={`shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        fromListId === ''
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs ring-1 ring-emerald-500'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                          fromListId === '' ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        {fromListId === '' ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Plus className="w-2.5 h-2.5" />}
                      </div>
                      <span>Sem lista</span>
                    </button>

                    {lists.map((list) => {
                      const isSelected = fromListId === list.id;
                      const count = list.items?.length || 0;

                      return (
                        <button
                          key={list.id}
                          type="button"
                          onClick={() => setFromListId(isSelected ? '' : list.id)}
                          className={`shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs ring-1 ring-emerald-500'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            ) : (
                              <ClipboardList className="w-2.5 h-2.5" />
                            )}
                          </div>
                          <span className="font-semibold truncate max-w-[120px]">{list.name}</span>
                          <span className="text-[10px] text-zinc-400">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seção Estabelecimento conforme imagem anexada */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="store-search-input" className="text-sm font-bold text-zinc-800 flex items-center space-x-2">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>Estabelecimento</span>
                  </label>
                  <span className="text-xs text-zinc-400 font-normal">Opcional</span>
                </div>

                {storeName ? (
                  /* Card de Estabelecimento Selecionado */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-2xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">
                          {storeName}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-semibold leading-tight">
                          Estabelecimento selecionado
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearSelectedStore}
                      aria-label="Trocar estabelecimento"
                      className="w-7 h-7 rounded-full bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center border border-zinc-200 shadow-2xs transition-colors cursor-pointer shrink-0 ml-2"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </motion.div>
                ) : (
                  /* Busca e Lista de Sugestões Conforme Foto */
                  <div className="space-y-2.5">
                    {/* Input de Busca */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="store-search-input"
                        type="text"
                        value={storeSearchQuery}
                        onChange={(e) => setStoreSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (storeSearchQuery.trim()) {
                              handleSelectStore(storeSearchQuery.trim());
                            }
                          }
                        }}
                        placeholder="Buscar ou criar estabelecimento..."
                        className="w-full pl-10 pr-8 py-2.5 rounded-2xl border border-zinc-200 bg-white text-zinc-800 text-sm placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
                      />
                      {storeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setStoreSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Estado 1 (Vazio): Título de Contexto + Lista Vertical Limpa Limitada a 4 itens */}
                    {!trimmedQuery ? (
                      <div>
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                          📌 Mais frequentados
                        </span>

                        <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden divide-y divide-zinc-100 shadow-2xs">
                          {savedStores.slice(0, 4).map((store) => (
                            <button
                              key={store}
                              type="button"
                              onClick={() => handleSelectStore(store)}
                              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors cursor-pointer group"
                            >
                              <Store className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                              <span className="text-sm font-semibold text-zinc-700 group-hover:text-zinc-900 truncate">
                                {store}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Estado 2 (Digitando): Opção limpa de criação de novo estabelecimento */
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleSelectStore(trimmedQuery)}
                          className="w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl text-left bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-bold text-sm transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                          <span className="truncate">
                            Adicionar <strong className="text-emerald-950 font-black">&ldquo;{trimmedQuery}&rdquo;</strong>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seção Orçamento Previsto conforme imagem anexada */}
              <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-zinc-800">Orçamento Previsto</span>
                  </div>

                  {sliderValue > 0 && (
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                      R$ {sliderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                {/* Input Numérico com R$ */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                    R$
                  </span>
                  <input
                    id="budget-input"
                    type="text"
                    inputMode="decimal"
                    value={budgetValue}
                    onChange={(e) => handleBudgetTextChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-11 pr-8 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-bold placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                  {budgetValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetValue('');
                        setSliderValue(0);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Range Slider com Régua de Milestones */}
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={sliderValue}
                      onChange={handleSliderChange}
                      style={{
                        background: `linear-gradient(to right, #059669 0%, #059669 ${sliderPercentage}%, #e4e4e7 ${sliderPercentage}%, #e4e4e7 100%)`,
                      }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-600 transition-all"
                    />
                  </div>

                  {/* Régua de Marcadores (Milestones) */}
                  <div className="flex justify-between items-center px-1 select-none">
                    {BUDGET_MILESTONES.map((milestone) => {
                      const isExact = sliderValue === milestone.value;

                      return (
                        <button
                          key={milestone.value}
                          type="button"
                          onClick={() => handleMilestoneClick(milestone.value)}
                          className="flex flex-col items-center group cursor-pointer transition-all"
                        >
                          {/* Ponto / Tick */}
                          <span
                            className={`rounded-full transition-all mb-1 ${
                              isExact
                                ? 'w-2 h-2 bg-emerald-600 ring-4 ring-emerald-100'
                                : 'w-1.5 h-1.5 bg-zinc-300 group-hover:bg-zinc-400'
                            }`}
                          />
                          {/* Rótulo */}
                          <span
                            className={`text-[10px] transition-colors ${
                              isExact
                                ? 'font-bold text-emerald-700'
                                : 'font-medium text-zinc-400 group-hover:text-zinc-600'
                            }`}
                          >
                            {milestone.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>

            {/* Footer com Botão Verde Iniciar Compra Idêntico à Foto */}
            <div className="p-4 pt-2 bg-white border-t border-zinc-100 shrink-0">
              <motion.button
                whileTap={isSubmitting ? {} : motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleStart()}
                className={`w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base shadow-lg shadow-emerald-700/20 flex items-center justify-between transition-all cursor-pointer ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-5 h-5 stroke-[2.3]" />
                  )}
                  <span>{isSubmitting ? 'Preparando...' : 'Iniciar Compra'}</span>
                </div>
                {!isSubmitting && <ArrowRight className="w-5 h-5 stroke-[2.3]" />}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
