import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ListItem } from '../types';
import {
  ALL_CATEGORIES,
  sanitizeWeightInput,
} from '../utils/purchaseHelpers';
import { MOTION_TOKENS, useMotionConfig } from '../styles/motionSystem';

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
  const cleanItemName = item.name.replace(/\s*\((?:kg|un|unidade)\)/gi, '').trim();

  // Configuração de exibição do identificador de modalidade
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
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== cleanItemName) {
      onEditItem(listId, item.id, { name: trimmed });
    } else {
      setNameInput(cleanItemName);
    }
  };

  // 2. Stepper handlers
  const handleStepQty = (delta: number) => {
    if (item.isWeighted) {
      const currentWeight = item.weight !== undefined && item.weight !== null ? item.weight : item.quantity;
      const step = delta > 0 ? 0.1 : -0.1;
      const newWeight = Math.max(0.1, Math.round((currentWeight + step) * 1000) / 1000);
      onEditItem(listId, item.id, { weight: newWeight });
    } else {
      const newQty = Math.max(1, (item.quantity || 1) + delta);
      onEditItem(listId, item.id, { quantity: newQty });
    }
  };

  // 3. Salvar Quantidade ou Peso digitado
  const handleSaveQty = () => {
    setIsEditingQty(false);
    if (item.isWeighted) {
      const sanitized = sanitizeWeightInput(qtyInput);
      const parsed = parseFloat(sanitized.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        onEditItem(listId, item.id, { weight: parsed });
      } else {
        const fallback = item.weight !== undefined && item.weight !== null ? item.weight : 1;
        setQtyInput(sanitizeWeightInput(fallback.toString()));
      }
    } else {
      const parsed = parseInt(qtyInput, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        onEditItem(listId, item.id, { quantity: parsed });
      } else {
        setQtyInput(item.quantity.toString());
      }
    }
  };

  // 4. Alterar Modalidade (Unidade vs Peso)
  const handleSetPricingMode = (weighted: boolean) => {
    if (weighted) {
      const initialWeight = item.weight && item.weight > 0 ? item.weight : (item.quantity && item.quantity > 0 ? item.quantity : 1);
      onEditItem(listId, item.id, { isWeighted: true, weight: initialWeight });
    } else {
      const initialQty = item.quantity && item.quantity >= 1 ? item.quantity : Math.max(1, Math.round(item.weight || 1));
      onEditItem(listId, item.id, { isWeighted: false, quantity: initialQty });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
      transition={motionConfig.spring}
      className="p-3 sm:p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-2.5 transition-all hover:border-zinc-300"
    >
      {/* LINHA 1: NOME DO ITEM, CATEGORIA E BOTÃO EXCLUIR */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Nome do item com edição inline ao clicar */}
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
              className="w-full text-sm sm:text-base font-bold text-zinc-900 bg-white border border-emerald-500 rounded-lg px-2 py-0.5 outline-none shadow-2xs"
            />
          ) : (
            <h3
              onClick={() => setIsEditingName(true)}
              title="Toque para editar o nome do produto"
              className="text-sm sm:text-base font-bold text-zinc-900 cursor-pointer hover:text-emerald-700 transition-colors truncate"
            >
              {cleanItemName}
            </h3>
          )}

          {/* Categoria com menu suspenso rápido */}
          <div className="flex items-center gap-1.5 mt-1">
            <div className="relative" ref={categoryMenuRef}>
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[10.5px] font-bold rounded-md border cursor-pointer transition-colors ${badgeStyle}`}
              >
                <span>{item.category}</span>
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </button>

              <AnimatePresence>
                {isCategoryMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-50 overflow-hidden"
                  >
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

        {/* Lado Direito: Botão Excluir */}
        <motion.button
          whileTap={motionConfig.tap.iconButton}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={() => onRemoveItem(listId, item.id)}
          title="Remover item da lista"
          aria-label="Remover item da lista"
          className="w-8 h-8 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>

      {/* LINHA 2: MARCADOR (UNID. / PESO) + QUANTIDADE/PESO COM STEPPER */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
        {/* 1. Marcador de Modalidade: Unid. / Peso */}
        <div className="flex items-center space-x-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Tipo:
          </label>
          {isFixedMode ? (
            <div
              className={`h-8 px-2.5 inline-flex items-center justify-center rounded-lg border shadow-2xs select-none ${
                isFixedUnit
                  ? 'bg-emerald-50/50 border-emerald-200/70 text-emerald-800'
                  : 'bg-amber-50/50 border-amber-200/70 text-amber-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${
                  isFixedUnit ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px] font-bold">{isFixedUnit ? 'Unidade' : 'Pesado'}</span>
            </div>
          ) : (
            <div className="h-8 relative inline-flex p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/80 shadow-2xs items-center">
              <button
                type="button"
                onClick={() => handleSetPricingMode(false)}
                title="Planejar por quantidade unitária"
                className={`px-2.5 py-1 h-full rounded-[6px] text-[11px] font-bold transition-colors cursor-pointer z-10 flex items-center justify-center leading-none ${
                  !item.isWeighted
                    ? 'text-emerald-800 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {!item.isWeighted && (
                  <motion.div
                    layoutId={`list-pricing-pill-${item.id}`}
                    className="absolute inset-0 bg-white rounded-[6px] shadow-2xs -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <span>Unid.</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetPricingMode(true)}
                title="Planejar por peso (kg)"
                className={`px-2.5 py-1 h-full rounded-[6px] text-[11px] font-bold transition-colors cursor-pointer z-10 flex items-center justify-center leading-none ${
                  item.isWeighted
                    ? 'text-amber-800 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {item.isWeighted && (
                  <motion.div
                    layoutId={`list-pricing-pill-${item.id}`}
                    className="absolute inset-0 bg-white rounded-[6px] shadow-2xs -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <span>Peso (kg)</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Stepper de Quantidade / Peso */}
        <div className="flex items-center space-x-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {item.isWeighted ? 'Peso:' : 'Qtd:'}
          </label>
          <div className="h-8 w-28 flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-lg border border-zinc-200/90 p-0.5 transition-colors">
            <motion.button
              whileTap={motionConfig.tap.iconButton}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={() => handleStepQty(-1)}
              title={item.isWeighted ? 'Diminuir peso (-0.1kg)' : 'Diminuir quantidade (-1)'}
              className="w-6 h-full rounded bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0 select-none"
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
                title="Toque para digitar valor"
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
                      return `${rounded.toString().replace('.', ',')} kg`;
                    })()}
                  </span>
                ) : (
                  <span>{item.quantity} un</span>
                )}
              </button>
            )}

            <motion.button
              whileTap={motionConfig.tap.iconButton}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={() => handleStepQty(1)}
              title={item.isWeighted ? 'Aumentar peso (+0.1kg)' : 'Aumentar quantidade (+1)'}
              className="w-6 h-full rounded bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0 select-none"
            >
              +
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
