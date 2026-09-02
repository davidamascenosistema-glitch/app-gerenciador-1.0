import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item } from '../types';
import {
  calculateItemSubtotal,
  formatCurrencyBRL,
  ALL_CATEGORIES,
} from '../utils/purchaseHelpers';

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
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={`w-full rounded-2xl border transition-all p-3.5 sm:p-4 flex flex-col gap-3 ${
        item.bought
          ? 'bg-zinc-100/70 border-zinc-200/70 text-zinc-500'
          : 'bg-white border-zinc-200/90 shadow-2xs text-zinc-900'
      }`}
    >
      {/* LINHA 1: Checkbox + Nome (Inline) + Categoria (Dropdown Popover) + Excluir */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
          {/* Checkbox de Comprado */}
          <button
            type="button"
            onClick={() => onToggleBought(purchaseId, item.id)}
            aria-label={item.bought ? 'Marcar como não comprado' : 'Marcar como comprado'}
            className="w-10 h-10 min-w-[40px] min-h-[40px] sm:w-11 sm:h-11 sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer rounded-xl hover:bg-zinc-100/80 active:scale-95 transition-all"
          >
            <div
              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                item.bought
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                  : 'border-zinc-300 bg-white hover:border-emerald-500'
              }`}
            >
              {item.bought && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </button>

          {/* Nome e Badge de Categoria Editáveis Inline */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
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
                  className="min-w-[130px] max-w-full sm:max-w-xs text-sm sm:text-base font-bold text-zinc-900 bg-white border border-emerald-500 ring-2 ring-emerald-500/20 rounded-lg px-2 py-0.5 outline-none shadow-2xs"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  title="Toque para editar o nome diretamente"
                  className={`group text-left text-sm sm:text-base font-bold leading-snug break-words rounded-lg px-1.5 py-0.5 -ml-1.5 cursor-pointer transition-all border border-dashed border-transparent hover:border-zinc-300 hover:bg-zinc-100/80 active:scale-[0.99] ${
                    item.bought
                      ? 'line-through text-zinc-400 hover:text-zinc-600'
                      : 'text-zinc-900 hover:text-emerald-800'
                  }`}
                >
                  <span>{cleanItemName}</span>
                </button>
              )}

              {/* CATEGORIA EDITÁVEL INLINE (POPOVER DROPDOWN - TODAS AS CATEGORIAS) */}
              <div className="relative inline-block" ref={categoryMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                  title="Toque para alterar a categoria"
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer flex items-center space-x-1 shadow-2xs hover:opacity-90 active:scale-95 ${badgeStyle}`}
                >
                  <span>{item.category}</span>
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform opacity-70 ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Popover de Categorias */}
                <AnimatePresence>
                  {isCategoryMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1.5 z-40 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200/90 p-2 text-zinc-900"
                    >
                      {/* Cabeçalho do Popover */}
                      <div className="px-2 py-1 mb-1.5 border-b border-zinc-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Selecione a Categoria
                        </span>
                      </div>

                      {/* Lista de Todas as Categorias Disponíveis */}
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

        {/* Botão de Excluir */}
        <button
          type="button"
          onClick={() => onRemoveItem(purchaseId, item.id)}
          title="Remover item"
          aria-label="Remover item"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* LINHA 2: TOGGLE EXPLÍCITO DE MODO DE PREÇO (Apenas quando aplicável) */}
      {showToggle && (
        <div className="flex items-center justify-between pl-11 sm:pl-12">
          <div className="inline-flex p-0.5 rounded-xl bg-zinc-100/90 border border-zinc-200/80">
            <button
              type="button"
              onClick={() => handleSetPricingMode(false)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !item.isWeighted
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {unitLabel}
            </button>
            <button
              type="button"
              onClick={() => handleSetPricingMode(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                item.isWeighted
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {weightLabel}
            </button>
          </div>
        </div>
      )}

      {/* LINHA 3: QUANTIDADE/PESO E PREÇO LADO A LADO COM MESMO PESO VISUAL */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pl-11 sm:pl-12">
        {/* Coluna Esquerda: Quantidade / Peso */}
        <div className="flex flex-col">
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            {item.isWeighted ? 'Peso (kg)' : 'Quantidade'}
          </label>
          <div className="h-10 sm:h-11 flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-xl border border-zinc-200/90 p-0.5 transition-colors">
            <button
              type="button"
              onClick={() => handleStepQty(-1)}
              title={item.isWeighted ? 'Diminuir peso (-0.1kg)' : 'Diminuir quantidade (-1)'}
              className="w-8 h-full rounded-lg bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-sm flex items-center justify-center cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0"
            >
              -
            </button>

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
                className="flex-1 min-w-0 text-center text-xs sm:text-sm font-bold bg-white text-zinc-900 border border-emerald-500 rounded-md py-1 outline-none shadow-2xs h-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingQty(true)}
                title="Toque para digitar quantidade ou peso"
                className="flex-1 min-w-0 text-center text-xs sm:text-sm font-bold text-zinc-800 hover:text-emerald-800 cursor-pointer py-1 truncate px-1"
              >
                {item.isWeighted ? (
                  <span>
                    {item.weight !== undefined && item.weight !== null
                      ? item.weight.toString().replace('.', ',')
                      : item.quantity.toString().replace('.', ',')}{' '}
                    <span className="text-[11px] font-semibold text-zinc-500">kg</span>
                  </span>
                ) : (
                  <span>
                    {item.quantity}{' '}
                    <span className="text-[11px] font-semibold text-zinc-500">un</span>
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleStepQty(1)}
              title={item.isWeighted ? 'Aumentar peso (+0.1kg)' : 'Aumentar quantidade (+1)'}
              className="w-8 h-full rounded-lg bg-white text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold text-sm flex items-center justify-center cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0"
            >
              +
            </button>
          </div>
        </div>

        {/* Coluna Direita: Preço Unitário / Preço por Kg */}
        <div className="flex flex-col">
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            {item.isWeighted ? 'Preço por Kg' : 'Preço Unitário'}
          </label>
          <div className="h-10 sm:h-11 flex items-center bg-zinc-50 hover:bg-zinc-100/70 rounded-xl border border-zinc-200/90 px-2.5 transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white">
            <span className="text-xs font-bold text-zinc-400 mr-1.5 shrink-0">R$</span>
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
              className="w-full bg-transparent text-xs sm:text-sm font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal outline-none"
            />
          </div>
        </div>
      </div>

      {/* LINHA 4: SUBTOTAL ABAIXO DOS INPUTS (ORDEM LÓGICA: INPUTS -> DERIVADO) */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100/90 pl-11 sm:pl-12">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Subtotal
        </span>
        {hasValidPrice ? (
          <span
            className={`text-base sm:text-lg font-black tracking-tight ${
              item.bought ? 'text-zinc-400' : 'text-emerald-700'
            }`}
          >
            {formatCurrencyBRL(subtotal)}
          </span>
        ) : (
          <span className="text-xs font-normal text-zinc-400">
            Subtotal: — aguardando preço
          </span>
        )}
      </div>
    </motion.div>
  );
};

