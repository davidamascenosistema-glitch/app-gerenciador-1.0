import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ListItem } from '../types';
import {
  ALL_CATEGORIES,
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_QUANTITY,
  MIN_ITEM_QUANTITY,
  sanitizeWeightInput,
  sanitizeItemName,
  validateItemQuantity,
} from '../utils/purchaseHelpers';
import { useMotionConfig } from '../styles/motionSystem';

interface ListItemCardProps {
  item: ListItem;
  listId: string;
  onEditItem: (listId: string, itemId: string, updates: Partial<ListItem>) => void;
  onRemoveItem: (listId: string, itemId: string) => void;
  getCategoryBadgeStyle: (category: string) => string;
}

export const ListItemCard: React.FC<ListItemCardProps> = ({
  item,
  listId,
  onEditItem,
  onRemoveItem,
  getCategoryBadgeStyle,
}) => {
  const motionConfig = useMotionConfig();
  const badgeStyle = getCategoryBadgeStyle(item.category);
  const cleanItemName = sanitizeItemName(item.name.replace(/\s*\((?:kg|un|unidade)\)/gi, ''));

  // 1. Estados locais para edição inline de NOME
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(cleanItemName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 2. Estados locais para seletor inline de CATEGORIA (dropdown popover)
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // 3. Estados locais para edição inline de QUANTIDADE / PESO
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(() =>
    item.isWeighted
      ? (item.weight !== undefined && item.weight !== null
          ? sanitizeWeightInput(item.weight.toString())
          : sanitizeWeightInput(item.quantity.toString()))
      : item.quantity.toString()
  );
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Guarda os últimos valores válidos para que ao alternar entre Unidade e Peso os valores nunca se percam ou fiquem zerados
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

  // Sincronizar estados locais se o item mudar externamente
  useEffect(() => {
    if (!isEditingName) {
      setNameInput(cleanItemName);
    }
  }, [cleanItemName, isEditingName]);

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
    const trimmed = sanitizeItemName(nameInput);
    if (trimmed && trimmed !== cleanItemName) {
      onEditItem(listId, item.id, { name: trimmed });
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
      onEditItem(listId, item.id, {
        isWeighted: true,
        weight: nextVal,
        quantity: 1,
      });
    } else {
      const currentQty = item.quantity || 1;
      const nextQty = Math.min(MAX_ITEM_QUANTITY, Math.max(1, currentQty + delta));
      onEditItem(listId, item.id, {
        isWeighted: false,
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
      onEditItem(listId, item.id, { isWeighted: true, weight: validated, quantity: 1 });
    } else {
      onEditItem(listId, item.id, {
        isWeighted: false,
        quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.round(validated))),
      });
    }
  };

  // 4. Alternar Modalidade (Unidade vs Peso) com inversão garantida de is_weighted
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

      onEditItem(listId, item.id, {
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

      onEditItem(listId, item.id, {
        isWeighted: false,
        quantity: targetQty,
        pricingModeSource: null,
      });
      setQtyInput(targetQty.toString());
    }
  };

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -16, transition: { duration: 0.14 } }}
      transition={{
        layout: motionConfig.layoutSpring,
      }}
      className={`w-full rounded-2xl border border-l-4 ${categoryLeftBorder} p-2.5 sm:p-3 flex flex-col gap-2 transition-all duration-150 bg-white border-zinc-200 opacity-100 shadow-2xs text-zinc-900`}
    >
      {/* LINHA 1: Nome (Inline) + Categoria (Dropdown) + Excluir */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
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
                  className="group text-left text-sm sm:text-base font-bold leading-tight break-words rounded-md px-1 py-0.5 -ml-1 cursor-pointer transition-all duration-300 ease-out border border-dashed border-transparent hover:border-zinc-300 hover:bg-zinc-100/80 active:scale-[0.99] text-zinc-900 hover:text-emerald-800"
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
                  <ChevronDown
                    className={`w-2 h-2 transition-transform opacity-70 ${
                      isCategoryMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

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
                                onEditItem(listId, item.id, { category: cat });
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
          onClick={() => onRemoveItem(listId, item.id)}
          title="Remover item da lista"
          aria-label="Remover item da lista"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>

      {/* LINHA 2: SELETOR TIPO (Unidade vs Peso) + CONTROLE QTD (- / +) BEM DISTRIBUÍDOS */}
      <div className="grid grid-cols-2 items-end gap-3 pt-1 border-t border-zinc-100">
        {/* 1. Marcador de Modalidade: Unidade vs Peso (kg) */}
        <div className="flex flex-col">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">
            Tipo
          </label>
          <motion.button
            whileTap={motionConfig.shouldReduceMotion ? {} : { scale: 0.95 }}
            type="button"
            onClick={handleTogglePricingMode}
            title={item.isWeighted ? 'Toque para alternar para Unidade' : 'Toque para alternar para Peso (kg)'}
            aria-label={
              item.isWeighted
                ? 'Tipo: Peso (kg). Toque para alternar para Unidade'
                : 'Tipo: Unidade. Toque para alternar para Peso (kg)'
            }
            className={`h-8.5 w-full px-3 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs select-none ${
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
            <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">
              {item.isWeighted ? 'Peso (kg)' : '• Unidade'}
            </span>
          </motion.button>
        </div>

        {/* 2. Coluna: Quantidade / Peso (- / +) */}
        <div className="flex flex-col">
          <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">
            {item.isWeighted ? 'PESO' : 'QTD'}
          </label>
          <div className="h-8.5 w-full flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-lg border border-zinc-200/90 p-0.5 transition-colors">
            <motion.button
              whileTap={motionConfig.tap.iconButton}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={() => handleStepQty(-1)}
              title={item.isWeighted ? 'Diminuir peso (-0.1kg)' : 'Diminuir quantidade (-1)'}
              className="w-7 h-full rounded bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0 select-none"
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
                className="flex-1 min-w-0 text-center text-xs font-bold bg-white text-zinc-900 border border-emerald-500 rounded py-0.5 outline-none shadow-2xs h-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingQty(true)}
                title="Toque para digitar quantidade ou peso"
                className="flex-1 min-w-0 text-center text-xs font-bold text-zinc-800 hover:text-emerald-800 cursor-pointer py-0.5 whitespace-nowrap px-1"
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
              className="w-7 h-full rounded bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0 select-none"
            >
              +
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
