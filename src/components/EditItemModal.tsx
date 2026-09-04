import React, { useState, useEffect } from 'react';
import { X, Pencil, Scale, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { Item } from '../types';
import { ALL_CATEGORIES, sanitizePriceInput, sanitizeWeightInput } from '../utils/purchaseHelpers';
import { MOTION_TOKENS, useMotionConfig } from '../styles/motionSystem';

interface EditItemModalProps {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
  onSave: (itemId: string, updates: Partial<Item>) => void;
}

export function EditItemModal({ isOpen, item, onClose, onSave }: EditItemModalProps) {
  const motionConfig = useMotionConfig();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Geral');
  const [isWeighted, setIsWeighted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [weightStr, setWeightStr] = useState('');
  const [priceStr, setPriceStr] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name.replace(/\s*\((?:kg|un|unidade)\)/gi, '').trim());
      setCategory(item.category || 'Geral');
      setIsWeighted(Boolean(item.isWeighted));
      setQuantity(item.quantity || 1);
      setWeightStr(
        item.weight !== undefined && item.weight !== null
          ? sanitizeWeightInput(item.weight.toString())
          : ''
      );
      setPriceStr(
        item.price !== undefined && item.price !== null && item.price > 0
          ? sanitizePriceInput(item.price.toString())
          : ''
      );
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleToggleWeighted = (checked: boolean) => {
    setIsWeighted(checked);
    if (checked && !weightStr) {
      setWeightStr('1');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const sanitizedPrice = sanitizePriceInput(priceStr);
    const parsedPrice = sanitizedPrice ? parseFloat(sanitizedPrice.replace(',', '.')) : undefined;
    const roundedPrice = parsedPrice !== undefined && !isNaN(parsedPrice) && parsedPrice >= 0
      ? Math.round(parsedPrice * 100) / 100
      : undefined;
    const parsedWeight = isWeighted && weightStr
      ? Math.round(parseFloat(sanitizeWeightInput(weightStr).replace(',', '.')) * 1000) / 1000
      : undefined;

    onSave(item.id, {
      name: trimmedName,
      category,
      isWeighted,
      quantity: isWeighted ? 1 : Math.max(1, quantity),
      weight: parsedWeight,
      price: roundedPrice,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={motionConfig.modalSpring}
        className="relative z-10 w-full max-w-md max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200/80 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 leading-tight">Editar Item</h3>
              <p className="text-[11px] text-zinc-500">Alterar nome, categoria e configurações</p>
            </div>
          </div>

          <motion.button
            whileTap={motionConfig.tap.iconButton}
            transition={motionConfig.pressSpring}
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Nome do Item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-zinc-900 bg-white transition-all outline-none"
              />
            </div>

            {/* Alternar Unidade vs Peso */}
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                  <Scale className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Modo de Precificação</span>
                </span>
                {item?.pricingModeSource === 'unit' || item?.pricingModeSource === 'weight' ? (
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold select-none inline-flex items-center gap-1.5 border ${
                      item.pricingModeSource === 'unit'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                        : 'bg-amber-50 text-amber-800 border-amber-200/80'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.pricingModeSource === 'unit' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    {item.pricingModeSource === 'unit' ? 'Unidade' : 'Pesado'}
                  </span>
                ) : (
                  <div className="relative inline-flex p-0.5 rounded-lg bg-zinc-200/80">
                    <button
                      type="button"
                      onClick={() => handleToggleWeighted(false)}
                      className={`relative z-10 px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        !isWeighted
                          ? 'text-emerald-800'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {!isWeighted && (
                        <motion.div
                          layoutId="edit-modal-pricing-pill"
                          transition={motionConfig.layoutSpring}
                          className="absolute inset-0 bg-white rounded-md shadow-2xs -z-10"
                        />
                      )}
                      Por Unidade
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleWeighted(true)}
                      className={`relative z-10 px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        isWeighted
                          ? 'text-amber-800'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {isWeighted && (
                        <motion.div
                          layoutId="edit-modal-pricing-pill"
                          transition={motionConfig.layoutSpring}
                          className="absolute inset-0 bg-white rounded-md shadow-2xs -z-10"
                        />
                      )}
                      Por Peso (kg)
                    </button>
                  </div>
                )}
              </div>

              {isWeighted && (
                <div className="mt-3 pt-2.5 border-t border-zinc-200/60">
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                    Peso em kg (ex: 0,85)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={weightStr}
                    onChange={(e) => setWeightStr(sanitizeWeightInput(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 focus:border-emerald-500 text-sm font-medium text-zinc-900 bg-white outline-none"
                  />
                </div>
              )}
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                <span>Categoria</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map((cat) => (
                  <motion.button
                    whileTap={motionConfig.tap.button}
                    transition={motionConfig.pressSpring}
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      category === cat
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80 border border-zinc-200/80'
                    }`}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quantidade e Preço Unitário */}
            <div className="grid grid-cols-2 gap-3">
              {!isWeighted && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Quantidade
                  </label>
                  <div className="flex items-center space-x-1">
                    <motion.button
                      whileTap={motionConfig.tap.iconButton}
                      transition={motionConfig.pressSpring}
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 font-bold text-zinc-700 flex items-center justify-center shrink-0 cursor-pointer text-base"
                    >
                      -
                    </motion.button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full text-center py-2 rounded-xl border border-zinc-300 text-sm font-bold text-zinc-900 focus:border-emerald-500 h-10 outline-none"
                    />
                    <motion.button
                      whileTap={motionConfig.tap.iconButton}
                      transition={motionConfig.pressSpring}
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 font-bold text-zinc-700 flex items-center justify-center shrink-0 cursor-pointer text-base"
                    >
                      +
                    </motion.button>
                  </div>
                </div>
              )}

              <div className={isWeighted ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  {isWeighted ? 'Preço por kg (R$)' : 'Preço Unitário (R$)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={priceStr}
                    onChange={(e) => setPriceStr(sanitizePriceInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-300 focus:border-emerald-500 text-sm font-bold text-zinc-900 placeholder-zinc-400 bg-white outline-none h-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-5 border-t border-zinc-200/80 bg-zinc-50/50 flex items-center space-x-2 shrink-0">
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200/90 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors min-h-[44px] cursor-pointer"
            >
              Salvar Alterações
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
