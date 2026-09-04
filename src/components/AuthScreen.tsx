import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  KeyRound, 
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { useAuth } from '../hooks/useAuth';

interface AuthScreenProps {
  authHook: ReturnType<typeof useAuth>;
}

export function AuthScreen({ authHook }: AuthScreenProps) {
  const motionConfig = useMotionConfig();
  const { signInWithPassword, signUp, isConfigured } = authHook;

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Limpa mensagens ao trocar de aba
  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const validateForm = (): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Digite um endereço de e-mail válido.');
      return false;
    }

    if (!password) {
      setErrorMessage('Por favor, informe sua senha.');
      return false;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return false;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setErrorMessage(error);
        }
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password);
        if (error) {
          setErrorMessage(error);
        } else if (needsEmailConfirmation) {
          setSuccessMessage(
            'Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Confirme-o para acessar o app.'
          );
          setMode('login');
        } else {
          setSuccessMessage('Conta criada com sucesso! Entrando no sistema...');
        }
      }
    } catch {
      setErrorMessage('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-center items-center px-4 py-8 sm:py-12 selection:bg-emerald-500 selection:text-white font-sans">
      <div className="w-full max-w-md mx-auto">
        {/* Logotipo e Cabeçalho do App */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 mb-3.5 border-2 border-white">
            <ShoppingCart className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Lista &amp; Compra
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">
            Planeje, compre e controle seus gastos em tempo real
          </p>
        </div>

        {/* Card Principal de Autenticação */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-3xl border border-zinc-200/90 shadow-sm p-6 sm:p-8"
        >
          {/* Seletor de Abas (Entrar / Criar Conta) */}
          <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                mode === 'login'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                mode === 'signup'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Aviso se Supabase não estiver configurado */}
          {!isConfigured && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                <Info className="w-4 h-4 shrink-0 text-amber-700" />
                <span>Configuração de Conexão Supabase</span>
              </div>
              <p className="leading-relaxed text-amber-800">
                Para autenticar usuários, defina as variáveis{' '}
                <code className="px-1 py-0.5 rounded bg-amber-100/80 font-mono font-bold">
                  VITE_SUPABASE_URL
                </code>{' '}
                e{' '}
                <code className="px-1 py-0.5 rounded bg-amber-100/80 font-mono font-bold">
                  VITE_SUPABASE_ANON_KEY
                </code>{' '}
                nas configurações do projeto.
              </p>
            </div>
          )}

          {/* Mensagens de Feedback (Erro ou Sucesso) */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo E-mail */}
            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider"
              >
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider"
              >
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="w-full pl-10 pr-11 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer min-w-[44px] justify-center"
                  aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmação de Senha (somente no cadastro) */}
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider"
                >
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
                  />
                </div>
              </motion.div>
            )}

            {/* Botão de Ação Principal */}
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all min-h-[48px] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Entrando...' : 'Criando conta...'}</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Entrar' : 'Criar Minha Conta'}</span>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Rodapé informativo */}
        <div className="text-center mt-6 text-xs text-zinc-400 flex items-center justify-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Autenticação segura via Supabase</span>
        </div>
      </div>
    </div>
  );
}
