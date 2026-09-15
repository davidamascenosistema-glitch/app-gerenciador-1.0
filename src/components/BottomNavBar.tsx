import React from 'react';
import { Home, ClipboardList, ShoppingCart, History } from 'lucide-react';
import { motion } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';

export type NavScreen = 'home' | 'lists' | 'cart' | 'history' | 'profile';

interface BottomNavBarProps {
  currentScreen?: NavScreen;
  onNavigateToHome: () => void;
  onNavigateToLists: () => void;
  onNavigateToCart: () => void;
  onNavigateToHistory: () => void;
  pendingItemsCount?: number;
  hasPendingPurchase?: boolean;
}

export function BottomNavBar({
  currentScreen = 'home',
  onNavigateToHome,
  onNavigateToLists,
  onNavigateToCart,
  onNavigateToHistory,
  pendingItemsCount = 0,
  hasPendingPurchase = false,
}: BottomNavBarProps) {
  const motionConfig = useMotionConfig();

  const isHomeActive = currentScreen === 'home';
  const isListsActive = currentScreen === 'lists';
  const isCartActive = currentScreen === 'cart';
  const isHistoryActive = currentScreen === 'history';

  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-none"
    >
      {/* Barra de Fundo com Blur e Sombra Elegante */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] border-t border-zinc-200/80 pointer-events-none" />

      <div className="w-full max-w-md md:max-w-xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-around relative z-10 pointer-events-auto">
        {/* 1. Início */}
        <motion.button
          whileTap={motionConfig.tap.button}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={onNavigateToHome}
          aria-current={isHomeActive ? 'page' : undefined}
          className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-colors cursor-pointer group focus:outline-none ${
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
              className="absolute inset-x-2 inset-y-1 bg-emerald-50 rounded-xl -z-10 border border-emerald-200/50"
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

        {/* 2. Listas */}
        <motion.button
          whileTap={motionConfig.tap.button}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={onNavigateToLists}
          aria-current={isListsActive ? 'page' : undefined}
          className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-colors cursor-pointer group focus:outline-none ${
            isListsActive
              ? 'text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900 active:text-emerald-600'
          }`}
          aria-label="Listas"
        >
          {isListsActive && (
            <motion.div
              layoutId="bottom-nav-active-pill"
              transition={motionConfig.layoutSpring}
              className="absolute inset-x-2 inset-y-1 bg-emerald-50 rounded-xl -z-10 border border-emerald-200/50"
            />
          )}
          <ClipboardList
            className={`w-5 h-5 transition-colors ${
              isListsActive ? 'text-emerald-600 stroke-[2.5]' : 'group-hover:text-emerald-600'
            }`}
          />
          <span
            className={`text-[11px] mt-1 leading-none transition-colors ${
              isListsActive ? 'text-emerald-700 font-bold' : 'text-zinc-600 font-medium'
            }`}
          >
            Listas
          </span>
        </motion.button>

        {/* 3. Carrinho */}
        <motion.button
          whileTap={motionConfig.tap.button}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={onNavigateToCart}
          aria-current={isCartActive ? 'page' : undefined}
          className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-colors cursor-pointer group focus:outline-none ${
            isCartActive
              ? 'text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900 active:text-emerald-600'
          }`}
          aria-label="Carrinho de Compras"
        >
          {isCartActive && (
            <motion.div
              layoutId="bottom-nav-active-pill"
              transition={motionConfig.layoutSpring}
              className="absolute inset-x-2 inset-y-1 bg-emerald-50 rounded-xl -z-10 border border-emerald-200/50"
            />
          )}
          <div className="relative">
            <ShoppingCart
              className={`w-5 h-5 transition-colors ${
                isCartActive ? 'text-emerald-600 stroke-[2.5]' : 'group-hover:text-emerald-600'
              }`}
            />
            {hasPendingPurchase && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                {pendingItemsCount > 0 ? (pendingItemsCount > 9 ? '9+' : pendingItemsCount) : '•'}
              </span>
            )}
          </div>
          <span
            className={`text-[11px] mt-1 leading-none transition-colors ${
              isCartActive ? 'text-emerald-700 font-bold' : 'text-zinc-600 font-medium'
            }`}
          >
            Carrinho
          </span>
        </motion.button>

        {/* 4. Histórico */}
        <motion.button
          whileTap={motionConfig.tap.button}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={onNavigateToHistory}
          aria-current={isHistoryActive ? 'page' : undefined}
          className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-colors cursor-pointer group focus:outline-none ${
            isHistoryActive
              ? 'text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900 active:text-emerald-600'
          }`}
          aria-label="Histórico de Compras"
        >
          {isHistoryActive && (
            <motion.div
              layoutId="bottom-nav-active-pill"
              transition={motionConfig.layoutSpring}
              className="absolute inset-x-2 inset-y-1 bg-emerald-50 rounded-xl -z-10 border border-emerald-200/50"
            />
          )}
          <History
            className={`w-5 h-5 transition-colors ${
              isHistoryActive ? 'text-emerald-600 stroke-[2.5]' : 'group-hover:text-emerald-600'
            }`}
          />
          <span
            className={`text-[11px] mt-1 leading-none transition-colors ${
              isHistoryActive ? 'text-emerald-700 font-bold' : 'text-zinc-600 font-medium'
            }`}
          >
            Histórico
          </span>
        </motion.button>
      </div>
    </nav>
  );
}
