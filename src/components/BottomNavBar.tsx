import React, { useState } from 'react';
import { 
  Home,
  History, 
  Plus, 
  ClipboardList, 
  RotateCcw, 
  Receipt, 
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';

interface BottomNavBarProps {
  currentScreen?: 'home' | 'history' | 'profile';
  onNavigateToHome?: () => void;
  onNavigateToHistory: () => void;
  onNavigateToProfile?: () => void;
  onCreateNewList: () => void;
  onRegisterManual: () => void;
  onRepeatPurchase?: () => void;
}

export function BottomNavBar({
  currentScreen = 'home',
  onNavigateToHome,
  onNavigateToHistory,
  onCreateNewList,
  onRegisterManual,
  onRepeatPurchase,
}: BottomNavBarProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { showToast } = useToast();

  const handleCreateList = () => {
    setIsSheetOpen(false);
    onCreateNewList();
  };

  const handleRepeatPurchase = () => {
    setIsSheetOpen(false);
    if (onRepeatPurchase) {
      onRepeatPurchase();
    } else {
      showToast('Em breve');
    }
  };

  const handleManualRegister = () => {
    setIsSheetOpen(false);
    onRegisterManual();
  };

  const isHomeActive = currentScreen === 'home';
  const isHistoryActive = currentScreen === 'history';

  return (
    <>
      {/* Barra Fixa no Rodapé com Recorte/Cradle Transparente */}
      <nav
        aria-label="Navegação Principal"
        className="fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-none"
      >
        {/* Fundo da barra com máscara de recorte circular (notch) 100% transparente */}
        <div
          className="absolute inset-0 bg-white/95 backdrop-blur-md shadow-lg pointer-events-none"
          style={{
            WebkitMaskImage: 'radial-gradient(circle 38px at 50% 0px, transparent 37px, black 38px)',
            maskImage: 'radial-gradient(circle 38px at 50% 0px, transparent 37px, black 38px)',
          }}
        />

        {/* Linhas de borda superior e contorno da curvatura do notch */}
        <div className="absolute top-0 left-0 right-[calc(50%+37px)] h-[1px] bg-zinc-200/90 pointer-events-none" />
        <div className="absolute top-0 left-[calc(50%+37px)] right-0 h-[1px] bg-zinc-200/90 pointer-events-none" />
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-[38px] w-[76px] h-[76px] rounded-full border border-zinc-200/90 pointer-events-none"
          style={{ clipPath: 'inset(38px 0 0 0)' }}
        />

        <div className="w-full max-w-md md:max-w-xl mx-auto px-6 h-16 flex items-center justify-between relative z-10 pointer-events-auto">
          {/* 1. Item Home (Esquerda) */}
          <button
            type="button"
            onClick={onNavigateToHome}
            aria-current={isHomeActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 group focus:outline-none ${
              isHomeActive
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-zinc-500 hover:text-zinc-900 active:text-emerald-600'
            }`}
            aria-label="Ir para a Tela Inicial"
          >
            <Home className={`w-5 h-5 transition-colors ${isHomeActive ? 'text-emerald-600 stroke-[2.5]' : 'group-hover:text-emerald-600'}`} />
            <span className={`text-[11px] mt-1 leading-none transition-colors ${isHomeActive ? 'text-emerald-700 font-bold' : 'text-zinc-600 group-hover:text-emerald-700 font-medium'}`}>
              Início
            </span>
          </button>

          {/* 2. Botão Central Flutuante Elevado com Espaçamento Totalmente Transparente */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7 flex flex-col items-center pointer-events-auto">
            {/* Botão flutuando livremente no recorte transparente */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.04 }}
              type="button"
              onClick={() => setIsSheetOpen(true)}
              aria-label="Abrir menu de novas ações de compra"
              className="w-14 h-14 rounded-full bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 active:from-emerald-700 active:to-emerald-900 text-white shadow-lg shadow-emerald-700/30 flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </motion.button>
          </div>

          {/* 3. Item Histórico (Direita) */}
          <button
            type="button"
            onClick={onNavigateToHistory}
            aria-current={isHistoryActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 group focus:outline-none ${
              isHistoryActive
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-zinc-500 hover:text-zinc-900 active:text-emerald-600'
            }`}
            aria-label="Ver Histórico de Compras"
          >
            <History className={`w-5 h-5 transition-colors ${isHistoryActive ? 'text-emerald-600 stroke-[2.5]' : 'group-hover:text-emerald-600'}`} />
            <span className={`text-[11px] mt-1 leading-none transition-colors ${isHistoryActive ? 'text-emerald-700 font-bold' : 'text-zinc-600 group-hover:text-emerald-700 font-medium'}`}>
              Histórico
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet do Botão Central */}
      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop escurecido com blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSheetOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
            />

            {/* Painel do Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-md md:max-w-xl mx-auto bg-white rounded-t-3xl shadow-2xl border-t border-zinc-200 p-5 pb-8 sm:pb-9 z-10"
            >
              {/* Handle visual superior */}
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 mx-auto mb-4" />

              {/* Cabeçalho do Bottom Sheet com Botão Fechar */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                    O que deseja fazer?
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Escolha uma das opções abaixo para iniciar
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSheetOpen(false)}
                  className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
                  aria-label="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lista de 3 Opções */}
              <div className="space-y-2.5">
                {/* Opção 1: Criar Nova Lista */}
                <button
                  type="button"
                  onClick={handleCreateList}
                  className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 hover:bg-emerald-50/80 active:bg-emerald-100/70 border border-zinc-200/90 hover:border-emerald-300 transition-all text-left min-h-[56px] cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-800 transition-colors">
                        Criar Nova Lista
                      </h4>
                      <p className="text-xs text-zinc-500 group-hover:text-emerald-700/80 transition-colors mt-0.5">
                        Planejar compras adicionando itens
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Opção 2: Repetir Compra Anterior */}
                <button
                  type="button"
                  onClick={handleRepeatPurchase}
                  className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 hover:bg-blue-50/80 active:bg-blue-100/70 border border-zinc-200/90 hover:border-blue-300 transition-all text-left min-h-[56px] cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-blue-800 transition-colors">
                        Repetir Compra Anterior
                      </h4>
                      <p className="text-xs text-zinc-500 group-hover:text-blue-700/80 transition-colors mt-0.5">
                        Copiar itens de uma compra já finalizada
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Opção 3: Registrar Compra Já Feita */}
                <button
                  type="button"
                  onClick={handleManualRegister}
                  className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 hover:bg-amber-50/80 active:bg-amber-100/70 border border-zinc-200/90 hover:border-amber-300 transition-all text-left min-h-[56px] cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-amber-800 transition-colors">
                        Registrar Compra Já Feita
                      </h4>
                      <p className="text-xs text-zinc-500 group-hover:text-amber-700/80 transition-colors mt-0.5">
                        Lançar comprovante ou nota fiscal
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
