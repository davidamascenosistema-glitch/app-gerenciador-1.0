import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';
import {
  calculateItemSubtotal,
  formatCurrencyBRL,
  ALL_CATEGORIES,
} from '../utils/purchaseHelpers';
import { MOTION_TOKENS } from '../styles/motionSystem';

interface PurchaseItemCardProps {
  item: Item;
  purchaseId: string;
  onToggleBought: (purchaseId: string, itemId: string) => void;
  onEditItem: (purchaseId: string, itemId: string, updates: Partial<Item>) => void;
  onRemoveItem: (purchaseId: string, itemId: string) => void;
  getCategoryBadgeStyle: (category: string) => string;
}

export const PurchaseItemCard: React.FC<PurchaseItemCardProps> = ({
  item,
  purchaseId,
  onToggleBought,
  onEditItem,
  onRemoveItem,
  getCategoryBadgeStyle,
}) => {
  const subtotal = calculateItemSubtotal(item);
  const badgeStyle = getCategoryBadgeStyle(item.category);
  const cleanItemName = item.name.replace(/\s*\((?:kg|un|unidade)\)/gi, '').trim();

  // Configuração de exibição do toggle de precificação baseada no pricingModeSource
  const showToggle = item.pricingModeSource === 'both' || item.pricingModeSource == null;
  const unitLabel = item.pricingModeSource === 'both' ? 'Pré-embalado' : 'Por Unidade';
  const weightLabel = item.pricingModeSource === 'both' ? 'Pesado' : 'Por Peso';

  // 1. Estados locais para edição inline de NOME
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(cleanItemName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 2. Estados locais para seletor inline de CATEGORIA (dropdown popover)
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // 3. Estados locais para edição inline de PREÇO
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(() =>
    item.price !== undefined && item.price !== null && item.price > 0
      ? item.price.toString().replace('.', ',')
      : ''
  );
  const priceInputRef = useRef<HTMLInputElement>(null);

  // 4. Estados locais para edição inline de QUANTIDADE / PESO
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(() =>
    item.isWeighted
      ? (item.weight !== undefined && item.weight !== null
          ? item.weight.toString().replace('.', ',')
          : item.quantity.toString().replace('.', ','))
      : item.quantity.toString()
  );
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estados locais se o item mudar externamente
  useEffect(() => {
    if (!isEditingName) {
      setNameInput(cleanItemName);
    }
  }, [cleanItemName, isEditingName]);

  useEffect(() => {
    if (!isEditingPrice) {
      setPriceInput(
        item.price !== undefined && item.price !== null && item.price > 0
          ? item.price.toString().replace('.', ',')
          : ''
      );
    }
  }, [item.price, isEditingPrice]);

  useEffect(() => {
    if (!isEditingQty) {
      setQtyInput(
        item.isWeighted
          ? (item.weight !== undefined && item.weight !== null
              ? item.weight.toString().replace('.', ',')
              : item.quantity.toString().replace('.', ','))
          : item.quantity.toString()
      );
    }
  }, [item.quantity, item.weight, item.isWeighted, isEditingQty]);

  // Focar o input correspondente quando entrar no modo de edição inline
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingPrice && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [isEditingPrice]);

  useEffect(() => {
    if (isEditingQty && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [isEditingQty]);

  // Fechar o dropdown de categorias ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!isCategoryMenuOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryMenuOpen]);

  // 1. Salvar Nome Inline
  const handleSaveName = () => {
    setIsEditingName(false);
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== cleanItemName) {
      onEditItem(purchaseId, item.id, { name: trimmed });
    } else {
      setNameInput(cleanItemName);
    }
  };

  // 2. Stepper handlers
  const handleStepQty = (delta: number) => {
    if (item.isWeighted) {
      const currentVal = item.weight || item.quantity || 1;
      const nextVal = Math.max(0.05, Math.round((currentVal + delta * 0.1) * 100) / 100);
      onEditItem(purchaseId, item.id, {
        weight: nextVal,
        quantity: 1,
      });
    } else {
      const currentQty = item.quantity || 1;
      const nextQty = Math.max(1, currentQty + delta);
      onEditItem(purchaseId, item.id, {
        quantity: nextQty,
      });
    }
  };

  // 3. Salvar Quantidade / Peso Inline
  const handleSaveQty = () => {
    setIsEditingQty(false);
    const cleaned = qtyInput.trim().replace(',', '.');
    const parsed = parseFloat(cleaned);

    if (!isNaN(parsed) && parsed > 0) {
      if (item.isWeighted) {
        onEditItem(purchaseId, item.id, { weight: parsed, quantity: 1 });
      } else {
        onEditItem(purchaseId, item.id, { quantity: Math.max(1, Math.round(parsed)) });
      }
    }
  };

  // 4. Salvar Preço Inline
  const handleSavePrice = () => {
    setIsEditingPrice(false);
    const cleaned = priceInput.trim().replace(',', '.');
    const parsed = cleaned ? parseFloat(cleaned) : undefined;
    if (parsed !== undefined && !isNaN(parsed) && parsed >= 0) {
      onEditItem(purchaseId, item.id, { price: parsed });
    } else if (cleaned === '') {
      onEditItem(purchaseId, item.id, { price: undefined });
    }
  };

  // 5. Alternar Modo de Precificação (Unidade vs Peso)
  const handleSetPricingMode = (weighted: boolean) => {
    if (weighted === Boolean(item.isWeighted)) return;

    if (weighted) {
      const newWeight = item.weight || item.quantity || 1;
      onEditItem(purchaseId, item.id, {
        isWeighted: true,
        weight: newWeight,
        quantity: 1,
      });
    } else {
      const newQty = item.weight ? Math.max(1, Math.round(item.weight)) : item.quantity || 1;
      onEditItem(purchaseId, item.id, {
        isWeighted: false,
        quantity: newQty,
      });
    }
  };

  const hasValidPrice = item.price !== undefined && item.price !== null && item.price > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: item.bought ? 0.65 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, x: -16, transition: { duration: 0.14 } }}
      transition={{
        layout: MOTION_TOKENS.spring.layout,
        opacity: { duration: 0.14 },
      }}
      className={`w-full rounded-2xl border transition-colors p-2.5 sm:p-3 flex flex-col gap-2 ${
        item.bought
          ? 'bg-zinc-100/70 border-zinc-200/70 text-zinc-500'
          : 'bg-white border-zinc-200/90 shadow-2xs text-zinc-900'
      }`}
    >
      {/* LINHA 1: Checkbox + Nome (Inline) + Categoria (Dropdown) + Excluir */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {/* Checkbox de Comprado com feedback tátil e animação vetorial */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 600, damping: 25 }}
            type="button"
            onClick={() => onToggleBought(purchaseId, item.id)}
            aria-label={item.bought ? 'Marcar como não comprado' : 'Marcar como comprado'}
            className="w-8 h-8 min-w-[32px] min-h-[32px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center shrink-0 cursor-pointer rounded-lg hover:bg-zinc-100/80 transition-colors"
          >
            <motion.div
              animate={{
                scale: item.bought ? [0.85, 1.08, 1] : 1,
                backgroundColor: item.bought ? '#059669' : '#ffffff',
                borderColor: item.bought ? '#059669' : '#d4d4d8',
              }}
              transition={{ duration: 0.18 }}
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md border flex items-center justify-center shadow-2xs"
            >
              {item.bought && (
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                </motion.div>
              )}
            </motion.div>
          </motion.button>

          {/* Nome e Badge de Categoria Editáveis Inline */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
              {/* NOME EDITÁVEL INLINE */}
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setNameInput(cleanItemName);
                      setIsEditingName(false);
                    }
                  }}
                  className="min-w-[120px] max-w-full sm:max-w-xs text-sm sm:text-base font-bold text-zinc-900 bg-white border border-emerald-500 ring-2 ring-emerald-500/20 rounded-md px-1.5 py-0.5 outline-none shadow-2xs"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  title="Toque para editar o nome diretamente"
                  className={`group text-left text-sm sm:text-base font-bold leading-tight break-words rounded-md px-1 py-0.5 -ml-1 cursor-pointer transition-all border border-dashed border-transparent hover:border-zinc-300 hover:bg-zinc-100/80 active:scale-[0.99] ${
                    item.bought
                      ? 'line-through text-zinc-400 hover:text-zinc-600'
                      : 'text-zinc-900 hover:text-emerald-800'
                  }`}
                >
                  <span>{cleanItemName}</span>
                </button>
              )}

              {/* CATEGORIA EDITÁVEL INLINE (POPOVER DROPDOWN) */}
              <div className="relative inline-block" ref={categoryMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                  title="Toque para alterar a categoria"
                  className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer flex items-center space-x-0.5 shadow-2xs hover:opacity-90 active:scale-95 ${badgeStyle}`}
                >
                  <span>{item.category}</span>
                  <ChevronDown className={`w-2 h-2 transition-transform opacity-70 ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Popover de Categorias */}
                <AnimatePresence>
                  {isCategoryMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1 z-40 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200/90 p-2 text-zinc-900"
                    >
                      <div className="px-2 py-1 mb-1 border-b border-zinc-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Selecione a Categoria
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-0.5">
                        {ALL_CATEGORIES.map((cat) => {
                          const isSelected = item.category === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                onEditItem(purchaseId, item.id, { category: cat });
                                setIsCategoryMenuOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-zinc-700 hover:bg-zinc-100'
                              }`}
                            >
                              <span>{cat}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Modo de Precificação (se houver toggle) + Botão Excluir */}
        <div className="flex items-center space-x-1 shrink-0">
          {showToggle && (
            <div className="relative inline-flex p-0.5 rounded-lg bg-zinc-100/90 border border-zinc-200/80">
              <button
                type="button"
                onClick={() => handleSetPricingMode(false)}
                title="Cobrança por unidade"
                className={`relative px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer z-10 ${
                  !item.isWeighted
                    ? 'text-emerald-800'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {!item.isWeighted && (
                  <motion.div
                    layoutId={`pricing-pill-${item.id}`}
                    className="absolute inset-0 bg-white rounded-md shadow-2xs -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <span>{unitLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetPricingMode(true)}
                title="Cobrança por peso (kg)"
                className={`relative px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer z-10 ${
                  item.isWeighted
                    ? 'text-emerald-800'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {item.isWeighted && (
                  <motion.div
                    layoutId={`pricing-pill-${item.id}`}
                    className="absolute inset-0 bg-white rounded-md shadow-2xs -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <span>{weightLabel}</span>
              </button>
            </div>
          )}

          {/* Botão de Excluir */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={() => onRemoveItem(purchaseId, item.id)}
            title="Remover item"
            aria-label="Remover item"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* LINHA 2: CONTROLES DE QUANTIDADE/PESO + PREÇO + SUBTOTAL (TUDO COMPACTO E ERGONÔMICO) */}
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 pt-0.5">
        {/* Coluna 1: Quantidade / Peso */}
        <div className="flex flex-col min-w-0">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">
            {item.isWeighted ? 'Peso (kg)' : 'Quantidade'}
          </label>
          <div className="h-8 sm:h-8.5 flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-lg border border-zinc-200/90 p-0.5 transition-colors">
            <motion.button
              whileTap={{ scale: 0.86 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              type="button"
              onClick={() => handleStepQty(-1)}
              title={item.isWeighted ? 'Diminuir peso (-0.1kg)' : 'Diminuir quantidade (-1)'}
              className="w-6 sm:w-7 h-full rounded bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0 select-none"
            >
              -
            </motion.button>

            {isEditingQty ? (
              <input
                ref={qtyInputRef}
                type="text"
                inputMode="decimal"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                onBlur={handleSaveQty}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveQty();
                  if (e.key === 'Escape') setIsEditingQty(false);
                }}
                className="flex-1 min-w-0 text-center text-xs font-bold bg-white text-zinc-900 border border-emerald-500 rounded py-0.5 outline-none shadow-2xs h-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingQty(true)}
                title="Toque para digitar quantidade ou peso"
                className="flex-1 min-w-0 text-center text-xs font-bold text-zinc-800 hover:text-emerald-800 cursor-pointer py-0.5 truncate px-0.5"
              >
                {item.isWeighted ? (
                  <span>
                    {item.weight !== undefined && item.weight !== null
                      ? item.weight.toString().replace('.', ',')
                      : item.quantity.toString().replace('.', ',')}{' '}
                    <span className="text-[10px] font-semibold text-zinc-500">kg</span>
                  </span>
                ) : (
                  <span>
                    {item.quantity}{' '}
                    <span className="text-[10px] font-semibold text-zinc-500">un</span>
                  </span>
                )}
              </button>
            )}

            <motion.button
              whileTap={{ scale: 0.86 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              type="button"
              onClick={() => handleStepQty(1)}
              title={item.isWeighted ? 'Aumentar peso (+0.1kg)' : 'Aumentar quantidade (+1)'}
              className="w-6 sm:w-7 h-full rounded bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0 select-none"
            >
              +
            </motion.button>
          </div>
        </div>

        {/* Coluna 2: Preço Unitário / Preço por Kg */}
        <div className="flex flex-col min-w-0">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">
            {item.isWeighted ? 'Preço (kg)' : 'Preço (un)'}
          </label>
          <div className="h-8 sm:h-8.5 flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-lg border border-zinc-200/90 px-2 transition-colors focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 focus-within:bg-white">
            <span className="text-[11px] font-bold text-zinc-400 mr-1 shrink-0">R$</span>
            <input
              ref={priceInputRef}
              type="text"
              inputMode="decimal"
              value={priceInput}
              onFocus={() => setIsEditingPrice(true)}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={handleSavePrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePrice();
                  priceInputRef.current?.blur();
                }
                if (e.key === 'Escape') {
                  setPriceInput(
                    item.price !== undefined && item.price !== null && item.price > 0
                      ? item.price.toString().replace('.', ',')
                      : ''
                  );
                  setIsEditingPrice(false);
                  priceInputRef.current?.blur();
                }
              }}
              placeholder="0,00"
              className="w-full bg-transparent text-xs font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal outline-none"
            />
          </div>
        </div>

        {/* Coluna 3: Subtotal integrado em linha */}
        <div className="flex flex-col items-end justify-center min-w-[72px] sm:min-w-[85px] pl-1">
          <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
            Subtotal
          </span>
          <div className="h-8 sm:h-8.5 flex items-center justify-end">
            {hasValidPrice ? (
              <span
                className={`text-sm sm:text-base font-black tracking-tight ${
                  item.bought ? 'text-zinc-400 line-through' : 'text-emerald-700'
                }`}
              >
                {formatCurrencyBRL(subtotal)}
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400 font-medium">—</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

