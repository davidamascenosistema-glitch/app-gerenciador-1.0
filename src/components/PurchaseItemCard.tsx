import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';
import {
  calculateItemSubtotal,
  formatCurrencyBRL,
  ALL_CATEGORIES,
  sanitizePriceInput,
  sanitizeWeightInput,
} from '../utils/purchaseHelpers';
import { MOTION_TOKENS, useMotionConfig } from '../styles/motionSystem';

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
  const motionConfig = useMotionConfig();
  const subtotal = calculateItemSubtotal(item);
  const badgeStyle = getCategoryBadgeStyle(item.category);
  const cleanItemName = item.name.replace(/\s*\((?:kg|un|unidade)\)/gi, '').trim();

  // Configuração de exibição do identificador de precificação baseada no pricingModeSource
  const isFixedUnit = item.pricingModeSource === 'unit';
  const isFixedWeight = item.pricingModeSource === 'weight';
  const isFixedMode = isFixedUnit || isFixedWeight;

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
          ? sanitizeWeightInput(item.weight.toString())
          : sanitizeWeightInput(item.quantity.toString()))
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
          ? sanitizePriceInput(item.price.toString())
          : ''
      );
    }
  }, [item.price, isEditingPrice]);

  useEffect(() => {
    if (!isEditingQty) {
      setQtyInput(
        item.isWeighted
          ? (item.weight !== undefined && item.weight !== null
              ? sanitizeWeightInput(item.weight.toString())
              : sanitizeWeightInput(item.quantity.toString()))
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
      const nextVal = Math.max(0.001, Math.round((currentVal + delta * 0.1) * 1000) / 1000);
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
    const cleaned = sanitizeWeightInput(qtyInput).trim().replace(',', '.');
    const parsed = parseFloat(cleaned);

    if (!isNaN(parsed) && parsed > 0) {
      if (item.isWeighted) {
        const roundedWeight = Math.round(parsed * 1000) / 1000;
        onEditItem(purchaseId, item.id, { weight: roundedWeight, quantity: 1 });
      } else {
        onEditItem(purchaseId, item.id, { quantity: Math.max(1, Math.round(parsed)) });
      }
    }
  };

  // 4. Salvar Preço Inline
  const handleSavePrice = () => {
    setIsEditingPrice(false);
    const sanitized = sanitizePriceInput(priceInput);
    const cleaned = sanitized.trim().replace(',', '.');
    const parsed = cleaned ? parseFloat(cleaned) : undefined;
    if (parsed !== undefined && !isNaN(parsed) && parsed >= 0) {
      const rounded = Math.round(parsed * 100) / 100;
      onEditItem(purchaseId, item.id, { price: rounded });
      setPriceInput(sanitized);
    } else if (cleaned === '') {
      onEditItem(purchaseId, item.id, { price: undefined });
      setPriceInput('');
    }
  };

  // 5. Alternar Modo de Precificação (Unidade vs Peso)
  const handleSetPricingMode = (weighted: boolean) => {
    if (weighted === Boolean(item.isWeighted)) return;

    if (weighted) {
      const rawWeight = item.weight || item.quantity || 1;
      const newWeight = Math.round(rawWeight * 1000) / 1000;
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

  // Ativa formatação compacta (width 38.5625px e fonte 11px) automaticamente quando preço for >= 100 ou com 6+ dígitos (ex: 100,00)
  const isLargePrice = (() => {
    if (priceInput.length >= 6) return true;
    const num = parseFloat(priceInput.replace(',', '.'));
    return !isNaN(num) && num >= 100;
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: item.bought ? 0.65 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, x: -16, transition: { duration: 0.14 } }}
      transition={{
        layout: motionConfig.layoutSpring,
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
            whileTap={motionConfig.tap.iconButton}
            transition={motionConfig.pressSpring}
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

        {/* Lado Direito: Botão Excluir */}
        <motion.button
          whileTap={motionConfig.tap.iconButton}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={() => onRemoveItem(purchaseId, item.id)}
          title="Remover item"
          aria-label="Remover item"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>

      {/* LINHA 2: MARCADOR (UNID. / PESO) + QUANTIDADE/PESO + PREÇO + SUBTOTAL COM PROPORÇÕES EQUILIBRADAS */}
      <div className="grid grid-cols-[auto_1.2fr_1fr_auto] items-end gap-1.5 sm:gap-2 pt-0.5">
        {/* 1. Marcador de Modalidade: Unid. / Peso ou Identificador Fixo */}
        <div className="flex flex-col shrink-0">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">
            Tipo
          </label>
          {isFixedMode ? (
            <div
              className={`h-8 sm:h-8.5 w-[83.75px] inline-flex items-center justify-center p-0.5 rounded-lg border shadow-2xs select-none ${
                isFixedUnit
                  ? 'bg-emerald-50/50 border-emerald-200/70'
                  : 'bg-amber-50/50 border-amber-200/70'
              }`}
              title={`Modalidade fixa: ${isFixedUnit ? 'Unidade' : 'Pesado'}`}
            >
              <div
                className={`w-full h-full bg-white rounded-[6px] shadow-2xs flex items-center justify-center gap-1.5 text-[10px] sm:text-[10.5px] font-bold tracking-tight ${
                  isFixedUnit ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isFixedUnit ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>{isFixedUnit ? 'Unidade' : 'Pesado'}</span>
              </div>
            </div>
          ) : (
            <div className="h-8 sm:h-8.5 w-[83.75px] relative inline-flex p-0.5 rounded-lg bg-zinc-100/90 border border-zinc-200/80 shadow-2xs items-center">
              <button
                type="button"
                onClick={() => handleSetPricingMode(false)}
                title="Cobrança por unidade"
                className={`w-[38.66px] relative px-2 py-1 h-full rounded-[6px] text-[10px] sm:text-[10.5px] font-bold tracking-tight transition-colors cursor-pointer z-10 flex items-center justify-center leading-none ${
                  !item.isWeighted
                    ? 'text-emerald-800 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {!item.isWeighted && (
                  <motion.div
                    layoutId={`pricing-pill-${item.id}`}
                    className="absolute inset-0 bg-white rounded-[6px] shadow-2xs -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <span>Unid.</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetPricingMode(true)}
                title="Cobrança por peso (kg)"
                className={`relative px-2 py-1 h-full rounded-[6px] text-[10px] sm:text-[10.5px] font-bold tracking-tight transition-colors cursor-pointer z-10 flex items-center justify-center leading-none ${
                  item.isWeighted
                    ? 'text-amber-800 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {item.isWeighted && (
                  <motion.div
                    layoutId={`pricing-pill-${item.id}`}
                    className="absolute inset-0 w-[36.09px] bg-white rounded-[6px] shadow-2xs -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <span className="pl-0 -ml-[1px]">Peso</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Coluna: Quantidade / Peso */}
        <div className="flex flex-col min-w-0">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">
            {item.isWeighted ? 'Peso (kg)' : 'Quantidade'}
          </label>
          <div className="h-8 sm:h-8.5 w-full min-w-[86px] sm:min-w-[88px] flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-lg border border-zinc-200/90 p-0.5 transition-colors">
            <motion.button
              whileTap={motionConfig.tap.iconButton}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={() => handleStepQty(-1)}
              title={item.isWeighted ? 'Diminuir peso (-0.1kg)' : 'Diminuir quantidade (-1)'}
              className="w-[19px] h-full rounded bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0 select-none"
            >
              -
            </motion.button>

            {isEditingQty ? (
              <input
                ref={qtyInputRef}
                type="text"
                inputMode="decimal"
                value={qtyInput}
                onChange={(e) => {
                  if (item.isWeighted) {
                    setQtyInput(sanitizeWeightInput(e.target.value));
                  } else {
                    setQtyInput(e.target.value.replace(/\D/g, ''));
                  }
                }}
                onBlur={handleSaveQty}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveQty();
                  if (e.key === 'Escape') setIsEditingQty(false);
                }}
                className="flex-1 min-w-0 text-center text-[11px] font-bold bg-white text-zinc-900 border border-emerald-500 rounded py-0.5 outline-none shadow-2xs h-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingQty(true)}
                title="Toque para digitar quantidade ou peso"
                className="flex-1 min-w-0 text-center text-xs font-bold text-zinc-800 hover:text-emerald-800 cursor-pointer py-0.5 whitespace-nowrap px-0.5"
              >
                {item.isWeighted ? (
                  <span>
                    {(() => {
                      const val =
                        item.weight !== undefined && item.weight !== null
                          ? item.weight
                          : item.quantity;
                      const rounded = Math.round(Number(val) * 1000) / 1000;
                      return rounded.toString().replace('.', ',');
                    })()}
                  </span>
                ) : (
                  <span>{item.quantity}</span>
                )}
              </button>
            )}

            <motion.button
              whileTap={motionConfig.tap.iconButton}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={() => handleStepQty(1)}
              title={item.isWeighted ? 'Aumentar peso (+0.1kg)' : 'Aumentar quantidade (+1)'}
              className="w-[18px] h-full rounded bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0 select-none"
            >
              +
            </motion.button>
          </div>
        </div>

        {/* 3. Coluna: Preço Unitário / Preço por Kg */}
        <div className="flex flex-col min-w-0 ml-2">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate ml-1 w-[55.94px]">
            {item.isWeighted ? 'Preço/kg' : 'Preço/un'}
          </label>
          <div className="h-8 sm:h-8.5 w-full min-w-[70px] flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-lg border border-zinc-200/90 pl-2 pr-2 ml-[3px] mr-0 transition-colors focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 focus-within:bg-white">
            <span className="text-[11px] font-bold text-zinc-400 mr-1 shrink-0">R$</span>
            <input
              ref={priceInputRef}
              type="text"
              inputMode="decimal"
              value={priceInput}
              onFocus={() => setIsEditingPrice(true)}
              onChange={(e) => setPriceInput(sanitizePriceInput(e.target.value))}
              onBlur={handleSavePrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSavePrice();
                  priceInputRef.current?.blur();
                }
                if (e.key === 'Escape') {
                  setPriceInput(
                    item.price !== undefined && item.price !== null && item.price > 0
                      ? sanitizePriceInput(item.price.toString())
                      : ''
                  );
                  setIsEditingPrice(false);
                  priceInputRef.current?.blur();
                }
              }}
              placeholder="0,00"
              className={`bg-transparent font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal outline-none transition-all ${
                isLargePrice ? 'w-[38.5625px] text-[11px]' : 'w-full text-xs'
              }`}
            />
          </div>
        </div>

        {/* 4. Coluna: Subtotal integrado em linha */}
        <div className="flex flex-col items-end justify-center min-w-[72px] sm:min-w-[85px] pl-2">
          <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
            Subtotal
          </span>
          <div className="h-8 sm:h-8.5 flex items-center justify-end">
            {hasValidPrice ? (
              <span
                className={`font-black tracking-tight ${
                  subtotal >= 100 ? 'text-[12px]' : 'text-[13px]'
                } ${
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

