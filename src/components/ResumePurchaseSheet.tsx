import React from 'react';
import {
  X,
  Clock,
  ShoppingCart,
  ArrowRight,
  Plus,
  AlertCircle,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';

export interface ResumePurchaseSheetProps {
  isOpen: boolean;
  purchaseName?: string;
  itemsCount?: number;
  onResume: () => void;
  onStartNew: () => void;
  onClose?: () => void;
}

export function ResumePurchaseSheet({
  isOpen,
  purchaseName = 'Compra em andamento',
  itemsCount = 0,
  onResume,
  onStartNew,
  onClose,
}: ResumePurchaseSheetProps) {
  const motionConfig = useMotionConfig();

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
            className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden border border-zinc-200/90 pb-safe"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-purchase-title"
          >
            {/* Visual Drag Handle for Mobile */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300" />
            </div>

            {/* Header com ícone de alerta/relógio */}
            <div className="px-5 pt-3 pb-3 sm:pt-5 flex items-center justify-between border-b border-zinc-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                  <Clock className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2
                    id="resume-purchase-title"
                    className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-tight"
                  >
                    Compra em Andamento
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Você já possui uma sessão de compra iniciada
                  </p>
                </div>
              </div>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Informações da Compra Pendente */}
            <div className="px-5 py-5 space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <ShoppingCart className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Pendente
                    </span>
                    <span className="text-xs text-zinc-500">
                      {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 truncate">
                    {purchaseName || 'Compra sem nome'}
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1">
                    Deseja continuar preenchendo esta compra ou prefere iniciar uma nova do zero?
                  </p>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="p-5 pt-1 space-y-2.5 bg-white border-t border-zinc-100">
              {/* Botão 1 (Destaque Principal): Continuar de onde parei */}
              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={onResume}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-700/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>Continuar de onde parei</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </motion.button>

              {/* Botão 2 (Secundário / Link): Começar uma compra do zero */}
              <button
                type="button"
                onClick={onStartNew}
                className="w-full py-2.5 px-4 rounded-xl text-zinc-600 hover:text-zinc-900 active:text-emerald-700 text-xs sm:text-sm font-semibold hover:bg-zinc-100 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-zinc-500" />
                <span>Começar uma compra do zero</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
