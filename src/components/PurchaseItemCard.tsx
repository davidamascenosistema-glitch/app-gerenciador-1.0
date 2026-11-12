import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';
import {
  calculateItemSubtotal,
  formatCurrencyBRL,
  ALL_CATEGORIES,
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_QUANTITY,
  MIN_ITEM_QUANTITY,
  sanitizePriceInput,
  sanitizeWeightInput,
  sanitizeItemName,
  validateItemQuantity,
  validateItemPrice,
} from '../utils/purchaseHelpers';
import { useMotionConfig } from '../styles/motionSystem';

interface PurchaseItemCardProps {
  item: Item;
  purchaseId: string;
  onToggleBought: (purchaseId: string, itemId: string) => void;
  onEditItem: (purchaseId: string, itemId: string, updates: Partial<Item>) => void;
  onRemoveItem: (purchaseId: string, itemId: string) => void;
  getCategoryBadgeStyle: (category: string) => string;
  highlightMissingPrice?: boolean;
  justCheckedId?: string | null;
  isExpanded?: boolean;
  focusPriceOnExpand?: boolean;
  onExpand?: (focusPrice?: boolean) => void;
  onCollapse?: () => void;
}

export const PurchaseItemCard: React.FC<PurchaseItemCardProps> = ({
  item,
  purchaseId,
  onToggleBought,
  onEditItem,
  onRemoveItem,
  getCategoryBadgeStyle,
  highlightMissingPrice = false,
  justCheckedId = null,
  isExpanded = false,
  focusPriceOnExpand = false,
  onExpand,
  onCollapse,
}) => {
  const motionConfig = useMotionConfig();
  const subtotal = calculateItemSubtotal(item);
  const badgeStyle = getCategoryBadgeStyle(item.category);
  const cleanItemName = sanitizeItemName(item.name.replace(/\s*\((?:kg|un|unidade)\)/gi, ''));
  const cardRef = useRef<HTMLDivElement>(null);

  // Estado local temporário para o flash de confirmação (400ms) ao marcar bought = true
  const [localJustCheckedId, setLocalJustCheckedId] = useState<string | null>(null);
  const justCheckedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBoughtRef = useRef<boolean>(Boolean(item.bought));

  useEffect(() => {
    const wasBought = prevBoughtRef.current;
    const isNowBought = Boolean(item.bought);
    prevBoughtRef.current = isNowBought;

    if (!wasBought && isNowBought) {
      setLocalJustCheckedId(item.id);
      if (justCheckedTimerRef.current) clearTimeout(justCheckedTimerRef.current);
      justCheckedTimerRef.current = setTimeout(() => {
        setLocalJustCheckedId(null);
      }, 400);
    } else if (wasBought && !isNowBought) {
      if (justCheckedTimerRef.current) clearTimeout(justCheckedTimerRef.current);
      setLocalJustCheckedId(null);
    }
  }, [item.bought, item.id]);

  useEffect(() => {
    return () => {
      if (justCheckedTimerRef.current) clearTimeout(justCheckedTimerRef.current);
    };
  }, []);

  const isJustChecked =
    Boolean(item.bought) && (justCheckedId === item.id || localJustCheckedId === item.id);

  const handleToggleBoughtClick = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const nextBought = !Boolean(item.bought);
    if (nextBought) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      setLocalJustCheckedId(item.id);
      if (justCheckedTimerRef.current) clearTimeout(justCheckedTimerRef.current);
      justCheckedTimerRef.current = setTimeout(() => {
        setLocalJustCheckedId(null);
      }, 400);
    } else {
      if (justCheckedTimerRef.current) clearTimeout(justCheckedTimerRef.current);
      setLocalJustCheckedId(null);
    }
    onToggleBought(purchaseId, item.id);
  };

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

  const lastKnownQtyRef = useRef<number>(
    item.quantity && item.quantity >= 1 ? item.quantity : 1
  );
  const lastKnownWeightRef = useRef<number>(
    item.weight && item.weight > 0 ? item.weight : 1
  );

  useEffect(() => {
    if (item.quantity && item.quantity >= 1) {
      lastKnownQtyRef.current = item.quantity;
    }
    if (item.weight && item.weight > 0) {
      lastKnownWeightRef.current = item.weight;
    }
  }, [item.quantity, item.weight]);

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

  // Se expandiu tocando na pílula de preço, foca automaticamente no input de preço
  useEffect(() => {
    if (item.bought && isExpanded && focusPriceOnExpand) {
      const timer = setTimeout(() => {
        setIsEditingPrice(true);
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [item.bought, isExpanded, focusPriceOnExpand]);

  // Recolhe automaticamente quando o usuário toca fora do card expandido
  useEffect(() => {
    if (!item.bought || !isExpanded || !onCollapse) return;

    const handleClickOutsideCard = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onCollapse();
      }
    };

    document.addEventListener('mousedown', handleClickOutsideCard);
    document.addEventListener('touchstart', handleClickOutsideCard);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideCard);
      document.removeEventListener('touchstart', handleClickOutsideCard);
    };
  }, [item.bought, isExpanded, onCollapse]);

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
    const trimmed = sanitizeItemName(nameInput);
    if (trimmed && trimmed !== cleanItemName) {
      onEditItem(purchaseId, item.id, { name: trimmed });
      setNameInput(trimmed);
    } else {
      setNameInput(cleanItemName);
    }
  };

  // 2. Stepper handlers
  const handleStepQty = (delta: number) => {
    if (item.isWeighted) {
      const currentVal = item.weight || item.quantity || 1;
      const nextVal = validateItemQuantity(
        Math.min(MAX_ITEM_QUANTITY, Math.max(MIN_ITEM_QUANTITY, currentVal + delta * 0.1)),
        MIN_ITEM_QUANTITY
      );
      onEditItem(purchaseId, item.id, {
        weight: nextVal,
        quantity: 1,
      });
    } else {
      const currentQty = item.quantity || 1;
      const nextQty = Math.min(MAX_ITEM_QUANTITY, Math.max(1, currentQty + delta));
      onEditItem(purchaseId, item.id, {
        quantity: nextQty,
      });
    }
  };

  // 3. Salvar Quantidade / Peso Inline
  const handleSaveQty = () => {
    setIsEditingQty(false);
    const cleaned = sanitizeWeightInput(qtyInput).trim();
    if (!cleaned) return;
    const validated = validateItemQuantity(
      cleaned,
      item.isWeighted ? (item.weight || 1) : (item.quantity || 1)
    );

    if (item.isWeighted) {
      onEditItem(purchaseId, item.id, { weight: validated, quantity: 1 });
    } else {
      onEditItem(purchaseId, item.id, {
        quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.round(validated))),
      });
    }
  };

  // 4. Salvar Preço Inline
  const handleSavePrice = () => {
    setIsEditingPrice(false);
    const sanitized = sanitizePriceInput(priceInput).trim();
    if (sanitized === '') {
      onEditItem(purchaseId, item.id, { price: undefined });
      setPriceInput('');
      return;
    }
    const validatedPrice = validateItemPrice(sanitized);
    if (validatedPrice !== undefined) {
      onEditItem(purchaseId, item.id, { price: validatedPrice });
      setPriceInput(sanitizePriceInput(validatedPrice.toString()));
    } else {
      setPriceInput('');
      onEditItem(purchaseId, item.id, { price: undefined });
    }
  };

  // 5. Alternar Modo de Precificação (Unidade vs Peso) com inversão garantida de is_weighted
  const handleTogglePricingMode = () => {
    const nextIsWeighted = !Boolean(item.isWeighted);

    if (nextIsWeighted) {
      const targetWeight =
        item.weight && item.weight > 0
          ? item.weight
          : lastKnownWeightRef.current && lastKnownWeightRef.current > 0
          ? lastKnownWeightRef.current
          : item.quantity && item.quantity > 0
          ? item.quantity
          : 1;

      const roundedWeight = Math.round(targetWeight * 1000) / 1000;
      lastKnownWeightRef.current = roundedWeight;

      onEditItem(purchaseId, item.id, {
        isWeighted: true,
        weight: roundedWeight,
        pricingModeSource: null,
      });
      setQtyInput(sanitizeWeightInput(roundedWeight.toString()));
    } else {
      const targetQty =
        item.quantity && item.quantity >= 1
          ? item.quantity
          : lastKnownQtyRef.current && lastKnownQtyRef.current >= 1
          ? lastKnownQtyRef.current
          : Math.max(1, Math.round(Number(item.weight) || 1));

      lastKnownQtyRef.current = targetQty;

      onEditItem(purchaseId, item.id, {
        isWeighted: false,
        quantity: targetQty,
        pricingModeSource: null,
      });
      setQtyInput(targetQty.toString());
    }
  };

  const hasValidPrice = item.price !== undefined && item.price !== null && item.price > 0;
  const isItemMissingPrice = !item.price || Number(item.price) <= 0;

  const getCategoryLeftBorderClass = (category: string) => {
    switch (category) {
      case 'Alimentos':
      case 'Mercearia':
        return 'border-l-emerald-400';
      case 'Bebidas':
        return 'border-l-blue-400';
      case 'Limpeza':
        return 'border-l-cyan-400';
      case 'Higiene':
        return 'border-l-purple-400';
      case 'Açougue':
        return 'border-l-rose-400';
      case 'Frutas/Legumes':
        return 'border-l-lime-400';
      case 'Frios':
        return 'border-l-orange-400';
      case 'Padaria':
        return 'border-l-amber-400';
      case 'Hortifruti':
        return 'border-l-teal-400';
      case 'Geral':
      default:
        return 'border-l-zinc-400';
    }
  };

  const categoryLeftBorder = getCategoryLeftBorderClass(item.category);

  const isLargePrice = (() => {
    if (priceInput.length >= 6) return true;
    const num = parseFloat(priceInput.replace(',', '.'));
    return !isNaN(num) && num >= 100;
  })();

  // Card Minimizado quando comprado (item.bought === true) e NÃO expandido temporariamente
  if (item.bought && !isExpanded) {
    const qtyValue = item.isWeighted
      ? Math.round(Number(item.weight ?? item.quantity ?? 1) * 1000) / 1000
      : item.quantity || 1;
    const qtyBadgeText = item.isWeighted ? `${qtyValue} kg` : `${qtyValue} un`;
    const subtotalBadgeText = formatCurrencyBRL(hasValidPrice ? subtotal : 0);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, x: -16, transition: { duration: 0.14 } }}
        transition={{
          layout: motionConfig.layoutSpring,
        }}
        className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between gap-2 transition-all duration-300 border border-l-4 ${categoryLeftBorder} ${
          isJustChecked
            ? 'border-emerald-400 bg-emerald-50/70 scale-[1.01]'
            : 'bg-white/95 border-emerald-200/80'
        }`}
      >
        {/* Bloco Esquerdo: Checkbox verde (desmarca) + Nome do produto com maior destaque e espaço */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleBoughtClick(e);
            }}
            aria-label="Marcar como não comprado"
            title="Desmarcar item"
            className="w-5.5 h-5.5 rounded-md border bg-emerald-600 border-emerald-600 flex items-center justify-center shrink-0 shadow-2xs cursor-pointer active:scale-95 transition-all duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          >
            <Check
              className={`w-3.5 h-3.5 stroke-[3] text-white transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-100 ${
                isJustChecked ? 'animate-check-icon-pop' : ''
              }`}
            />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.(false);
            }}
            title="Toque para expandir e editar este item"
            className="min-w-0 flex-1 text-left cursor-pointer text-[15px] sm:text-base font-bold text-zinc-700 leading-snug line-clamp-2 break-words line-through decoration-emerald-500/60 decoration-1 hover:text-zinc-900 transition-colors"
          >
            {cleanItemName}
          </button>
        </div>

        {/* Bloco Direito (Badges mais compactas para priorizar o nome + Lixeira) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pílula de Quantidade: expande o card sem desmarcar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.(false);
            }}
            title="Toque para editar a quantidade"
            className="px-2 py-0.5 rounded-md bg-zinc-50 hover:bg-emerald-50 border border-zinc-200/90 text-[11px] font-semibold text-zinc-600 whitespace-nowrap cursor-pointer transition-colors active:scale-95"
          >
            {qtyBadgeText}
          </button>

          {/* Pílula de Preço/Subtotal: expande e foca no preço; alerta em rosa se estiver sem preço */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.(true);
            }}
            title="Toque para editar o preço"
            className={`px-2 py-0.5 rounded-md text-xs whitespace-nowrap cursor-pointer transition-colors active:scale-95 ${
              isItemMissingPrice
                ? 'bg-rose-50 border border-rose-400 text-rose-600 font-bold'
                : 'bg-emerald-100/80 hover:bg-emerald-200/70 text-emerald-800 font-bold'
            }`}
          >
            {subtotalBadgeText}
          </button>

          {/* Botão de lixeira */}
          <motion.button
            whileTap={motionConfig.tap.iconButton}
            transition={motionConfig.pressSpring}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveItem(purchaseId, item.id);
            }}
            title="Remover item"
            aria-label="Remover item"
            className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -16, transition: { duration: 0.14 } }}
      transition={{
        layout: motionConfig.layoutSpring,
      }}
      className={`w-full rounded-2xl border border-l-4 ${categoryLeftBorder} p-2.5 sm:p-3 flex flex-col gap-2 transition-all duration-150 ${
        item.bought
          ? 'bg-white border-emerald-300 shadow-sm text-zinc-900'
          : 'bg-white border-zinc-200 opacity-100 shadow-2xs text-zinc-900'
      }`}
    >
      {/* LINHA 1: Checkbox + Nome (Inline) + Categoria (Dropdown) + Recolher ▲ (se comprado) + Excluir */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {/* 2. Física Elástica no Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleBoughtClick(e);
            }}
            aria-label={item.bought ? 'Marcar como não comprado' : 'Marcar como comprado'}
            className="w-8 h-8 min-w-[32px] min-h-[32px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center shrink-0 cursor-pointer rounded-lg hover:bg-zinc-100/80 transition-colors active:scale-95"
          >
            <div
              className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md border flex items-center justify-center shadow-2xs transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                item.bought
                  ? `bg-emerald-600 border-emerald-600 duration-[350ms] ${
                      isJustChecked
                        ? 'scale-125 ring-4 ring-emerald-500/20 animate-checkbox-spring'
                        : 'scale-100 ring-0'
                    }`
                  : 'bg-white border-zinc-300 scale-100 ring-0 duration-150'
              }`}
            >
              <Check
                className={`w-3.5 h-3.5 stroke-[3] text-white transition-transform ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  item.bought
                    ? 'scale-100 duration-[350ms] animate-check-icon-pop'
                    : 'scale-0 duration-150'
                }`}
              />
            </div>
          </button>

          {/* Nome e Badge de Categoria Editáveis Inline */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
              {/* NOME EDITÁVEL INLINE */}
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  maxLength={MAX_ITEM_NAME_LENGTH}
                  value={nameInput}
                  onChange={(e) =>
                    setNameInput(e.target.value.replace(/<[^>]*>/g, '').slice(0, MAX_ITEM_NAME_LENGTH))
                  }
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName();
                      if (item.bought && isExpanded) onCollapse?.();
                    }
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
                  className={`group text-left text-sm sm:text-base font-bold leading-tight break-words rounded-md px-1 py-0.5 -ml-1 cursor-pointer transition-all duration-300 ease-out border border-dashed border-transparent hover:border-zinc-300 hover:bg-zinc-100/80 active:scale-[0.99] ${
                    item.bought
                      ? 'text-zinc-600 line-through decoration-emerald-500/70 decoration-2 hover:text-zinc-800'
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

        {/* Lado Direito: Botão Recolher ▲ (se comprado e expandido) + Botão Excluir */}
        <div className="flex items-center gap-1 shrink-0">
          {item.bought && isExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCollapse?.();
              }}
              className="px-2 py-1 rounded-lg bg-emerald-100/90 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
              title="Recolher item"
            >
              <span>Recolher</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

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
      </div>

      {/* LINHA 2: MARCADOR (UNID. / PESO) + QUANTIDADE/PESO + PREÇO + SUBTOTAL COM PROPORÇÕES EQUILIBRADAS */}
      <div className="grid grid-cols-[auto_1.2fr_1fr_auto] items-end gap-1.5 sm:gap-2 pt-0.5">
        {/* 1. Marcador de Modalidade: Unidade vs Peso (kg) */}
        <div className="flex flex-col shrink-0">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">
            Tipo
          </label>
          <motion.button
            whileTap={motionConfig.shouldReduceMotion ? {} : { scale: 0.95 }}
            type="button"
            onClick={handleTogglePricingMode}
            title={item.isWeighted ? 'Toque para alternar para Unidade' : 'Toque para alternar para Peso (kg)'}
            aria-label={item.isWeighted ? 'Tipo: Peso (kg). Toque para alternar para Unidade' : 'Tipo: Unidade. Toque para alternar para Peso (kg)'}
            className={`h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs select-none ${
              item.isWeighted
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-200/90 text-amber-900 active:bg-amber-100'
                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200/90 text-emerald-900 active:bg-emerald-100'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                item.isWeighted ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            <span className="text-[10.5px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap">
              {item.isWeighted ? 'Peso (kg)' : '• Unidade'}
            </span>
          </motion.button>
        </div>

        {/* 2. Coluna: Quantidade / Peso */}
        <div className="flex flex-col min-w-0">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">
            {item.isWeighted ? 'PESO' : 'QTD'}
          </label>
          <div className="h-8 sm:h-8.5 w-full min-w-[92px] sm:min-w-[98px] flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-lg border border-zinc-200/90 p-0.5 transition-colors">
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
                  if (e.key === 'Enter') {
                    handleSaveQty();
                    if (item.bought && isExpanded) onCollapse?.();
                  }
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
                          : (lastKnownWeightRef.current || 1);
                      const rounded = Math.round(Number(val) * 1000) / 1000;
                      return `${rounded.toString().replace('.', ',')} kg`;
                    })()}
                  </span>
                ) : (
                  <span>{item.quantity || 1} un</span>
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
        {(() => {
          const typedNumeric = parseFloat(priceInput.replace(',', '.'));
          const hasTypedValidPrice = isEditingPrice && !isNaN(typedNumeric) && typedNumeric > 0;
          const isMissingPrice = (!item.price || Number(item.price) <= 0) && !hasTypedValidPrice;
          const isForceHighlighted = highlightMissingPrice && isMissingPrice;

          return (
            <div className="flex flex-col min-w-0 ml-2">
              <label
                className={`flex items-center text-[9.5px] uppercase tracking-wider mb-0.5 truncate ml-1 transition-colors duration-200 ${
                  isMissingPrice ? 'text-rose-600 font-bold' : 'text-zinc-400 font-bold'
                }`}
              >
                {isMissingPrice && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block mr-1 shrink-0" />
                )}
                <span>{item.isWeighted ? 'Preço/kg' : 'Preço/un'}</span>
              </label>
              <div
                className={`h-8 sm:h-8.5 w-full min-w-[70px] flex items-center rounded-lg pl-2 pr-2 ml-[3px] mr-0 transition-all duration-200 ${
                  isMissingPrice
                    ? `bg-rose-50/90 border-2 border-rose-400 text-rose-600 placeholder-rose-400 shadow-sm ring-2 ring-rose-400/15 focus-within:border-rose-500 focus-within:bg-white focus-within:ring-rose-500/30 ${
                        isForceHighlighted ? 'animate-pulse' : ''
                      }`
                    : item.bought
                    ? 'bg-white border border-emerald-300 text-emerald-900 font-semibold focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 focus-within:bg-white'
                    : 'bg-zinc-50 border border-zinc-200 text-zinc-900 font-semibold hover:bg-zinc-100/70 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 focus-within:bg-white'
                }`}
              >
                <span
                  className={`text-[11px] font-bold mr-1 shrink-0 transition-colors duration-200 ${
                    isMissingPrice
                      ? 'text-rose-500'
                      : item.bought
                      ? 'text-emerald-700'
                      : 'text-zinc-400'
                  }`}
                >
                  R$
                </span>
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
                      if (item.bought && isExpanded) onCollapse?.();
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
                  className={`bg-transparent outline-none transition-all duration-200 ${
                    isMissingPrice
                      ? 'text-rose-600 placeholder-rose-400 placeholder:text-rose-400 font-bold focus:border-rose-500 focus:bg-white focus:ring-rose-500/30'
                      : item.bought
                      ? 'text-emerald-900 font-semibold placeholder:text-zinc-400 placeholder:font-normal'
                      : 'text-zinc-900 font-semibold placeholder:text-zinc-400 placeholder:font-normal'
                  } ${isLargePrice ? 'w-[38.5625px] text-[11px]' : 'w-full text-xs'}`}
                />
              </div>
            </div>
          );
        })()}

        {/* 4. Coluna: Subtotal integrado em linha */}
        <div className="flex flex-col items-end justify-center min-w-[72px] sm:min-w-[85px] pl-2">
          <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
            Subtotal
          </span>
          <div className="h-8 sm:h-8.5 flex items-center justify-end">
            {hasValidPrice ? (
              <span
                className={`tracking-tight transition-all duration-300 ${
                  subtotal >= 100 ? 'text-[12px]' : 'text-[13px]'
                } ${
                  item.bought
                    ? 'text-emerald-700 font-semibold bg-emerald-100/60 px-1.5 py-0.5 rounded-md'
                    : 'text-emerald-700 font-black'
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
