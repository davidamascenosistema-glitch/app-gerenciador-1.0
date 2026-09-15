import React, { useState } from 'react';
import { ShoppingCart, Plus, ArrowRight, Clock, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Purchase, List } from '../types';
import { useMotionConfig } from '../styles/motionSystem';
import { NewPurchaseModal } from './NewPurchaseModal';
import { calculatePurchaseTotal, formatCurrencyBRL } from '../utils/purchaseHelpers';

interface CartScreenProps {
  pendingPurchases: Purchase[];
  lists: List[];
  onContinuePurchase: (purchaseId: string) => void;
  onStartNewPurchase: (params: {
    name?: string;
    storeName?: string;
    budget?: number;
    fromListId?: string;
  }) => void;
  onNavigateToLists?: () => void;
}

export function CartScreen({
  pendingPurchases,
  lists,
  onContinuePurchase,
  onStartNewPurchase,
  onNavigateToLists,
}: CartScreenProps) {
  const motionConfig = useMotionConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasPending = pendingPurchases && pendingPurchases.length > 0;
  const latestPending = hasPending ? pendingPurchases[0] : null;

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans pb-24">
      {/* Header Fixo da Aba Carrinho */}
      <div className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
        <header className="w-full max-w-md md:max-w-xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                Carrinho
              </h1>
              <p className="text-[11px] text-zinc-500 font-medium">
                Sessão ativa de compras no mercado
              </p>
            </div>
          </div>
        </header>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-4 py-6 sm:px-6 flex flex-col justify-center items-center">
        {!hasPending ? (
          /* Empty State Amigável do Carrinho */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-sm"
          >
            {/* Ícone de Carrinho Cinza */}
            <div className="w-20 h-20 rounded-3xl bg-zinc-100 border border-zinc-200 text-zinc-400 flex items-center justify-center mb-4 shadow-2xs">
              <ShoppingCart className="w-10 h-10" />
            </div>

            {/* Mensagem e Descrição */}
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight mb-2">
              Nenhuma compra em andamento
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-xs leading-relaxed mb-6">
              Você não possui nenhuma compra ativa no momento. Inicie uma nova compra para registrar seus itens e acompanhar seus gastos em tempo real.
            </p>

            {/* Botão Grande: Iniciar Nova Compra */}
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[48px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Iniciar Nova Compra</span>
            </motion.button>

            {/* Ação secundária para moldes */}
            {onNavigateToLists && (
              <button
                type="button"
                onClick={onNavigateToLists}
                className="mt-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer py-1"
              >
                Ou usar um molde de lista &rarr;
              </button>
            )}
          </motion.div>
        ) : (
          /* Card de Retomada se houver compra pendente */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white rounded-3xl border border-emerald-200/80 p-5 sm:p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full flex items-center space-x-1">
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>Compra em Andamento</span>
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {latestPending?.items.length || 0} {latestPending?.items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 truncate">
                {latestPending?.name || 'Minha Compra'}
              </h2>
              {latestPending?.storeName && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Local: <span className="font-semibold text-zinc-700">{latestPending.storeName}</span>
                </p>
              )}
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Subtotal Atual:</span>
              <span className="font-black text-sm text-zinc-900">
                {latestPending ? formatCurrencyBRL(calculatePurchaseTotal(latestPending)) : 'R$ 0,00'}
              </span>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={() => latestPending && onContinuePurchase(latestPending.id)}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer transition-all min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Continuar Compra</span>
              </motion.button>

              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-colors min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Outra Compra</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Modal de Nova Compra */}
      <NewPurchaseModal
        isOpen={isModalOpen}
        lists={lists}
        onClose={() => setIsModalOpen(false)}
        onStartPurchase={(params) => {
          setIsModalOpen(false);
          onStartNewPurchase(params);
        }}
      />
    </div>
  );
}
