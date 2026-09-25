import React from 'react';
import { Home, ShoppingCart, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';

export type NavScreen = 'home' | 'manager' | 'lists' | 'cart' | 'history' | 'profile';

export interface BottomNavBarProps {
  currentScreen?: NavScreen;
  onNavigateToHome: () => void;
  onNavigateToManager: () => void;
  onOpenPurchaseSetup: () => void;
  hasPendingPurchase?: boolean;
  pendingItemsCount?: number;
  onNavigateToLists?: () => void;
  onNavigateToCart?: () => void;
  onNavigateToHistory?: () => void;
}

export function BottomNavBar({
  currentScreen = 'home',
  onNavigateToHome,
  onNavigateToManager,
  onOpenPurchaseSetup,
  hasPendingPurchase = false,
  pendingItemsCount = 0,
}: BottomNavBarProps) {
  const motionConfig = useMotionConfig();

  const isHomeActive = currentScreen === 'home';
  const isManagerActive = currentScreen === 'manager';

  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-none overflow-visible"
    >
      {/* Barra de Fundo com Blur e Sombra Elegante */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.07)] border-t border-zinc-200/80 pointer-events-none" />

      <div className="w-full max-w-md md:max-w-xl mx-auto px-4 h-16 flex items-center justify-between relative z-10 pointer-events-auto overflow-visible">
        {/* 1. Esquerda: Início */}
        <motion.button
          whileTap={motionConfig.tap.button}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={() => onNavigateToHome()}
          aria-current={isHomeActive ? 'page' : undefined}
          className={`relative flex-1 flex flex-col items-center justify-center h-full py-1 rounded-xl transition-colors cursor-pointer group focus:outline-none ${
            isHomeActive
              ? 'text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900 active:text-emerald-600'
          }`}
          aria-label="Início"
        >
          {isHomeActive && (
            <motion.div
              layoutId="bottom-nav-active-pill"
              transition={motionConfig.layoutSpring}
              className="absolute inset-x-3 inset-y-1.5 bg-emerald-50 rounded-xl -z-10 border border-emerald-200/50"
            />
          )}
          <Home
            className={`w-5 h-5 transition-colors ${
              isHomeActive ? 'text-emerald-600 stroke-[2.5]' : 'group-hover:text-emerald-600'
            }`}
          />
          <span
            className={`text-[11px] mt-1 leading-none transition-colors ${
              isHomeActive ? 'text-emerald-700 font-bold' : 'text-zinc-600 font-medium'
            }`}
          >
            Início
          </span>
        </motion.button>

        {/* 2. Centro: Botão Comprar (FAB em Destaque) */}
        <div className="relative flex-1 flex flex-col items-center justify-center h-full pointer-events-auto overflow-visible">
          <motion.button
            whileTap={motionConfig.tap.button}
            transition={motionConfig.pressSpring}
            type="button"
            onClick={() => onOpenPurchaseSetup()}
            aria-label="Iniciar Compra"
            className="group flex flex-col items-center justify-center focus:outline-none cursor-pointer -mt-6"
          >
            <div className="relative w-14 h-14 rounded-full bg-emerald-600 group-hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-600/35 border-[3.5px] border-white flex items-center justify-center transition-transform active:scale-95">
              <ShoppingCart className="w-6 h-6 stroke-[2.5]" />
              {hasPendingPurchase && pendingItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                  {pendingItemsCount > 9 ? '9+' : pendingItemsCount}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1 font-bold text-emerald-800 leading-none">
              Comprar
            </span>
          </motion.button>
        </div>

        {/* 3. Direita: Gerenciador */}
        <motion.button
          whileTap={motionConfig.tap.button}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={() => onNavigateToManager()}
          aria-current={isManagerActive ? 'page' : undefined}
          className={`relative flex-1 flex flex-col items-center justify-center h-full py-1 rounded-xl transition-colors cursor-pointer group focus:outline-none ${
            isManagerActive
              ? 'text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900 active:text-emerald-600'
          }`}
          aria-label="Gerenciador"
        >
          {isManagerActive && (
            <motion.div
              layoutId="bottom-nav-active-pill"
              transition={motionConfig.layoutSpring}
              className="absolute inset-x-3 inset-y-1.5 bg-emerald-50 rounded-xl -z-10 border border-emerald-200/50"
            />
          )}
          <LayoutDashboard
            className={`w-5 h-5 transition-colors ${
              isManagerActive ? 'text-emerald-600 stroke-[2.5]' : 'group-hover:text-emerald-600'
            }`}
          />
          <span
            className={`text-[11px] mt-1 leading-none transition-colors ${
              isManagerActive ? 'text-emerald-700 font-bold' : 'text-zinc-600 font-medium'
            }`}
          >
            Gerenciador
          </span>
        </motion.button>
      </div>
    </nav>
  );
}
