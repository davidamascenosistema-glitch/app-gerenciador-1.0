import React from 'react';
import {
  X,
  ShoppingCart,
  ClipboardList,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';

export interface PurchaseChoiceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStartFromScratch: () => void;
  onSelectStartFromList: () => void;
  listsCount?: number;
}

export function PurchaseChoiceSheet({
  isOpen,
  onClose,
  onSelectStartFromScratch,
  onSelectStartFromList,
  listsCount = 0,
}: PurchaseChoiceSheetProps) {
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

          {/* Bottom Sheet Modal Container */}
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
            aria-labelledby="purchase-choice-title"
          >
            {/* Visual Drag Handle for Mobile */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden">
              <div className="w-12 h-1 rounded-full bg-zinc-300" />
            </div>

            {/* Header com Alinhamento Limpo */}
            <div className="px-6 pt-3 pb-3 sm:pt-5 sm:pb-4 flex items-center justify-between border-b border-zinc-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100/90 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                  <Sparkles className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2
                    id="purchase-choice-title"
                    className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-tight"
                  >
                    Como deseja comprar?
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Escolha a melhor forma de iniciar sua compra
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Corpo: Dois Cards Grandes e Clicáveis Empilhados */}
            <div className="px-6 py-5 space-y-4">
              {/* Card 1: Carrinho Vazio (Fundo gradiente verde esmeralda, texto branco, ícone de carrinho em marca d'água) */}
              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={onSelectStartFromScratch}
                className="group relative w-full text-left p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/25 hover:shadow-xl hover:shadow-emerald-700/35 overflow-hidden transition-all border border-emerald-400/40 cursor-pointer block active:scale-[0.98]"
              >
                {/* Ícone de Carrinho Grande em Marca d'Água no Canto */}
                <ShoppingCart
                  className="absolute -right-3 -bottom-3 w-28 h-28 sm:w-32 sm:h-32 text-white/15 pointer-events-none stroke-[1.4] group-hover:scale-105 group-hover:text-white/20 transition-all duration-300"
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-extrabold tracking-wide uppercase mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-200" />
                    <span>Modo Livre</span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-white mb-1.5">
                    Carrinho Vazio
                  </h3>

                  <p className="text-xs sm:text-sm text-emerald-100 font-normal leading-relaxed max-w-[85%]">
                    Comece do zero e adicione os itens enquanto caminha pelo mercado.
                  </p>

                  <div className="mt-4 flex items-center text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                    <span>Iniciar</span>
                    <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                  </div>
                </div>
              </motion.button>

              {/* Card 2: Usar uma Lista (Fundo branco com borda verde, texto escuro e ícone de prancheta) */}
              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={onSelectStartFromList}
                className="group relative w-full text-left p-5 sm:p-6 rounded-3xl bg-white border-2 border-emerald-500/80 hover:border-emerald-600 text-zinc-900 shadow-md shadow-zinc-200/60 hover:shadow-lg hover:bg-emerald-50/20 overflow-hidden transition-all cursor-pointer block active:scale-[0.98]"
              >
                {/* Ícone de Prancheta Grande em Marca d'Água no Canto */}
                <ClipboardList
                  className="absolute -right-3 -bottom-3 w-28 h-28 sm:w-32 sm:h-32 text-emerald-600/10 pointer-events-none stroke-[1.4] group-hover:scale-105 group-hover:text-emerald-600/15 transition-all duration-300"
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-extrabold tracking-wide uppercase mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Planejado</span>
                    {listsCount > 0 && (
                      <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-white/70 px-1.5 py-0.2 rounded-full">
                        {listsCount} {listsCount === 1 ? 'lista' : 'listas'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight mb-1.5 group-hover:text-emerald-800 transition-colors">
                    Usar uma Lista
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-500 font-normal leading-relaxed max-w-[85%]">
                    Escolha uma lista salva e vá marcando os itens durante a compra.
                  </p>

                  <div className="mt-4 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                    <span>Escolher lista</span>
                    <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
