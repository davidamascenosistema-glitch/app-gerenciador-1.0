import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, User as UserIcon, LogOut, Loader2, Mail, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { User } from '@supabase/supabase-js';
import { DevPanelModal } from './DevPanelModal';

interface ProfileScreenProps {
  user: User | null;
  onSignOut: () => Promise<void> | void;
  onBack: () => void;
  onNavigateToHome?: () => void;
  onNavigateToHistory?: () => void;
  onCreateNewList?: () => void;
  onRepeatPurchase?: () => void;
}

export function ProfileScreen({
  user,
  onSignOut,
  onBack,
  onNavigateToHome,
  onNavigateToHistory,
  onCreateNewList,
  onRepeatPurchase,
}: ProfileScreenProps) {
  const motionConfig = useMotionConfig();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Gatilho secreto: 7 cliques consecutivos com timeout de 2 segundos de inatividade
  const handleDevSecretClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 7) {
        setShowDevPanel(true);
        return 0;
      }
      return next;
    });

    clickTimerRef.current = setTimeout(() => {
      setClickCount(0);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const formattedCreatedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-zinc-50 text-zinc-900 flex flex-col selection:bg-emerald-500 selection:text-white font-sans relative overflow-hidden">
      {/* Header Sticky */}
      <header className="w-full bg-white border-b border-zinc-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 py-2.5 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onBack()}
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[38px] min-w-[38px]"
              aria-label="Voltar para a página inicial"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 leading-tight">
                Meu Perfil
              </h1>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium leading-none mt-0.5">
                Configurações da Conta
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - proporções mobile pensadas para não gerar scroll vertical */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:py-4 pb-20 sm:pb-24 flex flex-col items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/90 p-4 sm:p-5 text-center shadow-xs flex flex-col items-center"
        >
          {/* Avatar com inicial do usuário - Gatilho Secreto (7 toques) */}
          <button
            type="button"
            onClick={handleDevSecretClick}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-extrabold text-xl sm:text-2xl flex items-center justify-center mb-2 shadow-md shadow-emerald-700/20 border-2 sm:border-3 border-white cursor-pointer select-none active:scale-95 transition-transform"
            aria-label="Foto de perfil do usuário"
          >
            {user?.email ? userInitial : <UserIcon className="w-7 h-7 stroke-[1.5]" />}
          </button>

          {/* Dados do Usuário */}
          <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 tracking-tight break-all max-w-full leading-tight">
            {user?.email || 'Usuário'}
          </h2>

          {/* Detalhes da Conta Compactados no estilo agrupado */}
          <div className="mt-3.5 w-full bg-zinc-50/90 rounded-xl border border-zinc-200/70 divide-y divide-zinc-200/60 overflow-hidden text-left">
            <div className="p-2.5 sm:p-3 flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100/60 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none mb-0.5">
                  E-mail Cadastrado
                </p>
                <p className="text-xs font-semibold text-zinc-800 truncate leading-tight">
                  {user?.email || 'Não informado'}
                </p>
              </div>
            </div>

            {formattedCreatedDate && (
              <div className="p-2.5 sm:p-3 flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100/60 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none mb-0.5">
                    Membro Desde
                  </p>
                  <p className="text-xs font-semibold text-zinc-800 leading-tight">
                    {formattedCreatedDate}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação em Linha/Grid para economizar altura vertical */}
          <div className="mt-3.5 w-full grid grid-cols-2 gap-2">
            {/* Botão Voltar */}
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              onClick={onBack}
              type="button"
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs transition-all min-h-[40px] cursor-pointer"
            >
              <span>Voltar ao Início</span>
            </motion.button>

            {/* Botão Sair da Conta */}
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              onClick={handleLogout}
              disabled={isSigningOut}
              type="button"
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 text-rose-700 font-bold text-xs transition-all min-h-[40px] cursor-pointer"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  <span>Saindo...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sair da Conta</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Versão do App - Gatilho Secreto Alternativo (7 toques) */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 w-full text-center">
            <button
              type="button"
              onClick={handleDevSecretClick}
              className="text-[10px] sm:text-[11px] text-zinc-400 font-medium select-none cursor-default hover:text-zinc-600 transition-colors"
            >
              Versão 1.2.0
            </button>
          </div>
        </motion.div>
      </main>

      {/* Modal DevTools Secreto */}
      <DevPanelModal
        isOpen={showDevPanel}
        onClose={() => setShowDevPanel(false)}
        userId={user?.id}
      />
    </div>
  );
}

