import { ArrowLeft, User, Sparkles, Shield, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { BottomNavBar } from './BottomNavBar';

interface ProfileScreenProps {
  onBack: () => void;
  onNavigateToHome?: () => void;
  onNavigateToHistory?: () => void;
  onCreateNewList?: () => void;
  onRegisterManual?: () => void;
  onRepeatPurchase?: () => void;
}

export function ProfileScreen({
  onBack,
  onNavigateToHome,
  onNavigateToHistory,
  onCreateNewList,
  onRegisterManual,
  onRepeatPurchase,
}: ProfileScreenProps) {
  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative">
      {/* Header Sticky */}
      <header className="w-full bg-white border-b border-zinc-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => onBack()}
              className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
              aria-label="Voltar para a página inicial"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 leading-tight">
                Meu Perfil
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-none mt-0.5">
                Configurações da conta
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-xs font-semibold text-zinc-600 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>v2.0</span>
          </div>
        </div>
      </header>

      {/* Main Content Area with generous bottom padding for BottomNavBar */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-6 sm:py-8 pb-28 sm:pb-32 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full bg-white rounded-3xl border border-zinc-200/90 p-6 sm:p-8 text-center shadow-2xs flex flex-col items-center"
        >
          {/* Neutral Avatar Icon */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-100 border-2 border-zinc-200/80 text-zinc-400 flex items-center justify-center mb-4 shadow-inner">
            <User className="w-10 h-10 sm:w-12 sm:h-12 stroke-[1.5]" />
          </div>

          {/* App Info */}
          <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">
            Gerenciador de Compras
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Versão 2.0 &bull; Armazenamento Local
          </p>

          {/* Informative message box */}
          <div className="mt-6 w-full rounded-2xl bg-emerald-50/80 border border-emerald-200/80 p-4 text-left space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold">
                Recursos de Perfil em Breve
              </h3>
            </div>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              O sistema de login com sincronização em nuvem e a personalização de preferências de compras serão implementados em breve.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="mt-4 w-full space-y-2 text-xs text-zinc-600">
            <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/60">
              <Shield className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>Seus dados de compras estão salvos localmente neste dispositivo</span>
            </div>
            <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/60">
              <Smartphone className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>Funciona 100% offline para agilidade no supermercado</span>
            </div>
          </div>

          {/* Back Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            type="button"
            className="mt-6 w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all min-h-[48px] cursor-pointer"
          >
            <span>Voltar para o Início</span>
          </motion.button>
        </motion.div>
      </main>

      {/* Barra de Navegação Fixa Inferior */}
      <BottomNavBar
        currentScreen="profile"
        onNavigateToHome={onNavigateToHome || onBack}
        onNavigateToHistory={onNavigateToHistory || (() => {})}
        onCreateNewList={onCreateNewList || (() => {})}
        onRegisterManual={onRegisterManual || (() => {})}
        onRepeatPurchase={onRepeatPurchase}
      />
    </div>
  );
}
