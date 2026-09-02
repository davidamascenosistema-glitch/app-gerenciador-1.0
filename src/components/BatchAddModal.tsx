import React, { useState } from 'react';
import { X, ListPlus, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { parseBatchItemsInput } from '../utils/purchaseHelpers';
import { MOTION_TOKENS } from '../styles/motionSystem';

interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (batchText: string) => void;
}

export function BatchAddModal({ isOpen, onClose, onSubmit }: BatchAddModalProps) {
  const [batchText, setBatchText] = useState('');

  if (!isOpen) return null;

  const parsedItems = parseBatchItemsInput(batchText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;
    onSubmit(batchText);
    setBatchText('');
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
        transition={MOTION_TOKENS.spring.modal}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200/80 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 leading-tight">
                Adicionar Vários Itens
              </h3>
              <p className="text-[11px] text-zinc-500">Cole ou digite um produto por linha</p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Lista de itens (um por linha) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={6}
                required
                autoFocus
                placeholder={`2 Leite\n1 Arroz 5kg\nCafé\n3 Sabão em pó\nBanana`}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-zinc-900 placeholder-zinc-400 font-mono transition-all outline-none"
              />
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-950">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Dica de preenchimento rápido:</span>
              </div>
              <p>
                Você pode incluir a quantidade no início (ex:{' '}
                <code className="bg-emerald-100 px-1 rounded font-bold text-emerald-950">2 Leite</code> ou apenas{' '}
                <code className="bg-emerald-100 px-1 rounded font-bold text-emerald-950">Leite</code>). Todos serão inseridos instantaneamente e você poderá ajustar quantidades e preços direto nos cards.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-5 border-t border-zinc-200/80 bg-zinc-50/50 flex items-center space-x-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 border border-zinc-200/90 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              type="submit"
              disabled={!batchText.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parsedItems.length > 1
                ? `Adicionar ${parsedItems.length} Itens`
                : 'Adicionar Itens'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
