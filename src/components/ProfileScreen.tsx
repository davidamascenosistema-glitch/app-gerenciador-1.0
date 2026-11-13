import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  User as UserIcon,
  LogOut,
  Loader2,
  Mail,
  Calendar,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { User } from '@supabase/supabase-js';
import { useToast } from './Toast';

interface ProfileScreenProps {
  user: User | null;
  onSignOut: () => Promise<void> | void;
  onUpdateName?: (name: string) => Promise<{ error: string | null }>;
  onBack: () => void;
  onNavigateToHome?: () => void;
  onNavigateToHistory?: () => void;
  onCreateNewList?: () => void;
  onRepeatPurchase?: () => void;
}

export function ProfileScreen({
  user,
  onSignOut,
  onUpdateName,
  onBack,
}: ProfileScreenProps) {
  const motionConfig = useMotionConfig();
  const { showToast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const currentDisplayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Usuário');

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentDisplayName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingName) {
      setNameInput(currentDisplayName);
    }
  }, [currentDisplayName, isEditingName]);

  useEffect(() => {
    if (isEditingName) {
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 40);
    }
  }, [isEditingName]);

  const handleStartEditingName = () => {
    setNameInput(currentDisplayName);
    setNameError(null);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setNameInput(currentDisplayName);
    setNameError(null);
    setIsEditingName(false);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('O nome não pode ficar em branco.');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    if (trimmed === currentDisplayName) {
      setIsEditingName(false);
      setNameError(null);
      return;
    }
    if (!onUpdateName) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    setNameError(null);
    try {
      const { error } = await onUpdateName(trimmed);
      if (error) {
        setNameError(error);
        showToast(error);
      } else {
        setIsEditingName(false);
        showToast('Nome atualizado com sucesso!');
      }
    } finally {
      setIsSavingName(false);
    }
  };

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

  const userInitial = (currentDisplayName || user?.email || 'U').charAt(0).toUpperCase();

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

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:py-4 pb-20 sm:pb-24 flex flex-col items-center justify-center overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/90 p-4 sm:p-5 text-center shadow-xs flex flex-col items-center"
        >
          {/* Avatar com inicial do usuário */}
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-extrabold text-xl sm:text-2xl flex items-center justify-center mb-2 shadow-md shadow-emerald-700/20 border-2 sm:border-3 border-white select-none"
            aria-label="Foto de perfil do usuário"
          >
            {user?.email || currentDisplayName ? userInitial : <UserIcon className="w-7 h-7 stroke-[1.5]" />}
          </div>

          {/* Dados do Usuário */}
          <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 tracking-tight truncate max-w-full leading-tight">
            {currentDisplayName}
          </h2>
          {user?.email && (
            <p className="text-[11px] text-zinc-500 font-medium truncate max-w-full mt-0.5">
              {user.email}
            </p>
          )}

          {/* Detalhes da Conta Compactados no estilo agrupado */}
          <div className="mt-3.5 w-full bg-zinc-50/90 rounded-xl border border-zinc-200/70 divide-y divide-zinc-200/60 overflow-hidden text-left">
            {/* Nome de Exibição Editável */}
            <div className="p-2.5 sm:p-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100/60 flex items-center justify-center shrink-0">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-700" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none mb-1">
                    Nome
                  </p>

                  {isEditingName ? (
                    <div className="flex items-center space-x-1.5">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={nameInput}
                        onChange={(e) => {
                          setNameInput(e.target.value);
                          if (nameError) setNameError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveName();
                          } else if (e.key === 'Escape') {
                            handleCancelEditName();
                          }
                        }}
                        maxLength={60}
                        disabled={isSavingName}
                        placeholder="Seu nome"
                        aria-label="Editar nome"
                        className="w-full text-xs font-semibold text-zinc-900 bg-white border border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-lg px-2.5 py-1.5 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={isSavingName}
                        aria-label="Salvar nome"
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isSavingName ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditName}
                        disabled={isSavingName}
                        aria-label="Cancelar edição"
                        className="w-8 h-8 rounded-lg bg-zinc-200/80 hover:bg-zinc-300 text-zinc-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-800 truncate leading-tight">
                        {currentDisplayName}
                      </p>
                      <button
                        type="button"
                        onClick={handleStartEditingName}
                        aria-label="Editar nome"
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-zinc-200/90 hover:border-emerald-300 text-[11px] font-semibold text-emerald-700 transition-colors cursor-pointer shrink-0"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {nameError && (
                <p className="mt-1.5 pl-9 text-[11px] font-medium text-rose-600">
                  {nameError}
                </p>
              )}
            </div>

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

          {/* Versão do App */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 w-full text-center">
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium select-none">
              Versão 1.2.0
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
