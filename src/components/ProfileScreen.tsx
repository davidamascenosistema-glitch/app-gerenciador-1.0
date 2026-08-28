import { useState } from 'react';
import { ArrowLeft, User as UserIcon, Sparkles, Shield, LogOut, CheckCircle2, Loader2, Mail, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '@supabase/supabase-js';
import { BottomNavBar } from './BottomNavBar';

interface ProfileScreenProps {
  user: User | null;
  onSignOut: () => Promise<void> | void;
  onBack: () => void;
  onNavigateToHome?: () => void;
  onNavigateToHistory?: () => void;
  onCreateNewList?: () => void;
  onRegisterManual?: () => void;
  onRepeatPurchase?: () => void;
}

export function ProfileScreen({
  user,
  onSignOut,
  onBack,
  onNavigateToHome,
  onNavigateToHistory,
  onCreateNewList,
  onRegisterManual,
  onRepeatPurchase,
}: ProfileScreenProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

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
                Conta &bull; Supabase Auth
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conectado</span>
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
          {/* Avatar com inicial do usuário */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-700/25 border-4 border-white">
            {user?.email ? userInitial : <UserIcon className="w-10 h-10 stroke-[1.5]" />}
          </div>

          {/* Dados do Usuário */}
          <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight break-all max-w-full">
            {user?.email || 'Usuário Autenticado'}
          </h2>
          <div className="flex items-center justify-center space-x-1 text-xs text-emerald-700 font-bold mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sessão Ativa</span>
          </div>

          {/* Detalhes da Conta */}
          <div className="mt-6 w-full space-y-2 text-xs text-zinc-600 text-left">
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">E-mail Cadastrado</p>
                <p className="text-xs font-semibold text-zinc-800 truncate">{user?.email || 'Não informado'}</p>
              </div>
            </div>

            {formattedCreatedDate && (
              <div className="flex items-center space-x-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Membro Desde</p>
                  <p className="text-xs font-semibold text-zinc-800">{formattedCreatedDate}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Segurança</p>
                <p className="text-xs font-semibold text-zinc-800">Autenticação com JWT criptografado</p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-6 w-full space-y-2.5">
            {/* Botão Sair da Conta */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              disabled={isSigningOut}
              type="button"
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 text-rose-700 font-bold text-sm transition-all min-h-[48px] cursor-pointer"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                  <span>Saindo da conta...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sair da Conta</span>
                </>
              )}
            </motion.button>

            {/* Botão Voltar */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              type="button"
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-sm transition-all min-h-[48px] cursor-pointer"
            >
              <span>Voltar para o Início</span>
            </motion.button>
          </div>
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

