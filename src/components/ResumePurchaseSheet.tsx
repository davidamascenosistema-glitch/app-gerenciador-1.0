import React from 'react';
import {
  X,
  ShoppingCart,
  ArrowRight,
  RotateCcw,
  Clock,
  Sparkles,
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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Container estilo Fintech */}
          <motion.div
            initial={{ y: '100%', opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 340,
              mass: 0.75,
            }}
            className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden border border-zinc-200/90 pb-safe font-sans"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-purchase-title"
          >
            {/* Visual Drag Handle for Mobile */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden">
              <div className="w-12 h-1 rounded-full bg-zinc-300" />
            </div>

            {/* Header com Respiro e Alinhamento Limpo */}
            <div className="px-6 pt-4 pb-3 sm:pt-6 sm:pb-4 flex items-center justify-between border-b border-zinc-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100/90 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                  <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2
                    id="resume-purchase-title"
                    className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-tight"
                  >
                    Compra em Andamento
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Você possui itens no carrinho aguardando conclusão
                  </p>
                </div>
              </div>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Corpo do Modal: Layout Limpo e Tipográfico */}
            <div className="px-6 py-5 space-y-4">
              {/* Card Neutro e Elegante (sem fundo amarelo saturado) */}
              <div className="p-4 rounded-2xl bg-zinc-50/90 border border-zinc-200/80 flex flex-col gap-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 border border-amber-200/80 text-amber-700 tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Em andamento
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    {itemsCount} {itemsCount === 1 ? 'item no carrinho' : 'itens no carrinho'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-zinc-900 tracking-tight truncate">
                    {purchaseName || 'Compra sem título'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-normal leading-relaxed mt-1">
                    Para manter o padrão de apenas uma compra ativa por vez, você pode retomar este carrinho de onde parou ou iniciar uma nova compra descartando-o.
                  </p>
                </div>
              </div>
            </div>

            {/* Botões de Ação com Hierarquia e Destaque */}
            <div className="p-6 pt-2 space-y-3 bg-white border-t border-zinc-100">
              {/* Botão Primário: Retomar Compra */}
              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={onResume}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/25 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[48px]"
              >
                <span>Continuar de onde parei</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </motion.button>

              {/* Botão Secundário Sólido/Outline com Ícone de Reinício */}
              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={onStartNew}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 border border-zinc-200/90 text-zinc-700 hover:text-zinc-900 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 text-zinc-500 stroke-[2.2]" />
                <span>Começar nova compra (descartar atual)</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
