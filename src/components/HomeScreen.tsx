import React, { useState, useMemo } from 'react';
import { 
  Settings,
  Star,
  MessageSquare,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Clock,
  Trash2,
  Play,
  X,
  Check,
  Sparkles,
  BarChart2,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useMotionConfig } from '../styles/motionSystem';
import { usePurchases } from '../hooks/usePurchases';
import { calculatePurchaseTotal, formatCurrencyBRL } from '../utils/purchaseHelpers';
import { Purchase } from '../types';
import { useToast } from './Toast';
import { User } from '@supabase/supabase-js';

interface HomeScreenProps {
  user?: User | null;
  purchasesHook?: ReturnType<typeof usePurchases>;
  finishedPurchases?: Purchase[];
  onNavigateToPurchase?: (purchaseId: string) => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToProfile?: () => void;
  initialToastMessage?: string;
}

export function HomeScreen({
  user,
  purchasesHook: externalPurchasesHook,
  finishedPurchases: externalFinishedPurchases,
  onNavigateToPurchase,
  onNavigateToAnalytics,
  onNavigateToProfile,
  initialToastMessage,
}: HomeScreenProps) {
  const motionConfig = useMotionConfig();
  const localPurchasesHook = usePurchases();
  const purchasesHook = externalPurchasesHook || localPurchasesHook;

  const { 
    getPendingPurchases, 
    getFinishedPurchases, 
    discardPurchase 
  } = purchasesHook;

  const { showToast } = useToast();

  // Estados locais
  const [timeFilter, setTimeFilter] = useState<'ano' | 'mes' | 'semana'>('mes');
  const [purchaseToDiscard, setPurchaseToDiscard] = useState<Purchase | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Toast inicial se fornecido
  React.useEffect(() => {
    if (initialToastMessage) {
      showToast(initialToastMessage);
    }
  }, [initialToastMessage, showToast]);

  // Identificação do Usuário
  const userName = 
    user?.user_metadata?.name || 
    user?.user_metadata?.full_name || 
    (user?.email ? user.email.split('@')[0] : 'Usuário');
    
  const userInitial = (user?.email || userName || 'U').charAt(0).toUpperCase();

  // Compras pendentes e finalizadas
  const pendingPurchases = (getPendingPurchases() || []).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const activePendingPurchase = pendingPurchases.length > 0 ? pendingPurchases[0] : null;
  const finishedPurchases = externalFinishedPurchases || getFinishedPurchases() || [];

  // Dados para o Mini Dashboard (Sparkline de Gastos Recentes)
  const sparklineData = useMemo(() => {
    if (!finishedPurchases || finishedPurchases.length === 0) return [];
    
    // Ordenar compras por data mais antiga para mais recente para desenhar a linha do tempo cronológica
    const sorted = [...finishedPurchases].sort((a, b) => {
      const dateA = a.finishedAt || a.createdAt ? new Date(a.finishedAt || a.createdAt || '').getTime() : 0;
      const dateB = b.finishedAt || b.createdAt ? new Date(b.finishedAt || b.createdAt || '').getTime() : 0;
      return dateA - dateB;
    });

    // Pegar até as últimas 8 compras finalizadas
    const recent = sorted.slice(-8);

    return recent.map((p, idx) => ({
      index: idx + 1,
      total: calculatePurchaseTotal(p),
      name: p.name || `Compra ${idx + 1}`,
    }));
  }, [finishedPurchases]);

  // Somatório das compras recentes (ou do mês atual se houver)
  const recentPurchasesTotal = useMemo(() => {
    if (sparklineData.length === 0) return 0;
    return sparklineData.reduce((acc, item) => acc + item.total, 0);
  }, [sparklineData]);

  // Cálculo das estatísticas com base no filtro de período
  const stats = useMemo(() => {
    const now = new Date();
    const filtered = finishedPurchases.filter((p) => {
      const dateStr = p.finishedAt || p.createdAt;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;

      if (timeFilter === 'semana') {
        const diffMs = now.getTime() - date.getTime();
        return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
      } else if (timeFilter === 'mes') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } else {
        // ano
        return date.getFullYear() === now.getFullYear();
      }
    });

    const total = filtered.reduce((acc, p) => acc + calculatePurchaseTotal(p), 0);
    const count = filtered.length;
    const avg = count > 0 ? total / count : 0;

    return { total, count, avg };
  }, [finishedPurchases, timeFilter]);

  // Continuar compra pendente
  const handleContinuePending = (purchase: Purchase) => {
    if (onNavigateToPurchase) {
      onNavigateToPurchase(purchase.id);
    } else {
      const name = purchase.name || 'Compra sem nome';
      showToast(`Continuando: "${name}" (${purchase.items.length} itens)`);
    }
  };

  // Descartar compra pendente
  const handleOpenDiscardModal = (purchase: Purchase, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPurchaseToDiscard(purchase);
  };

  const handleConfirmDiscard = async () => {
    if (!purchaseToDiscard || isDiscarding) return;
    try {
      setIsDiscarding(true);
      const name = purchaseToDiscard.name || 'Compra sem nome';
      const pendingId = purchaseToDiscard.id;

      await discardPurchase(pendingId);
      setPurchaseToDiscard(null);
      showToast(`Compra "${name}" descartada com sucesso.`);
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    showToast('Agradecemos seu feedback!');
    setFeedbackText('');
    setIsFeedbackModalOpen(false);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative">
      
      {/* ========================================================================= */}
      {/* 1. HEADER DE PERFIL (FUNDO VERDE ESCURO)                                   */}
      {/* ========================================================================= */}
      <header className="w-full bg-emerald-900 text-white rounded-b-3xl shadow-md relative overflow-hidden pb-6 pt-5 sm:pt-6 px-4">
        {/* Subtle background glow effect */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-700/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-emerald-600/20 blur-xl pointer-events-none" />

        <div className="w-full max-w-md md:max-w-xl mx-auto relative z-10">
          {/* Canto Superior Direito: Engrenagem (Settings) */}
          <div className="flex justify-end mb-1">
            <button
              type="button"
              onClick={onNavigateToProfile}
              aria-label="Configurações de Perfil"
              className="w-10 h-10 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 active:bg-emerald-600 text-emerald-100 hover:text-white flex items-center justify-center transition-colors cursor-pointer min-h-[44px] min-w-[44px] active:scale-95"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Centro: Avatar Circular e Nome */}
          <div className="flex flex-col items-center text-center min-w-0 max-w-full">
            <div className="w-16 h-16 rounded-full bg-white text-emerald-900 font-extrabold text-2xl flex items-center justify-center shadow-lg border-2 border-emerald-400/40 select-none">
              {userInitial}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white mt-2.5 tracking-tight leading-snug truncate max-w-full px-2">
              {userName}
            </h1>

            {/* Dois botões menores centralizados */}
            <div className="flex flex-col items-center space-y-1.5 mt-3">
              {/* Botão Branco: Assinar Premium > */}
              <button
                type="button"
                onClick={() => showToast('EM BREVE')}
                className="bg-white hover:bg-zinc-100 active:scale-95 text-emerald-950 font-bold text-xs px-4 py-1.5 rounded-full shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer min-h-[32px]"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Assinar Premium &gt;</span>
              </button>

              {/* Botão Fantasma: Enviar Feedback */}
              <button
                type="button"
                onClick={() => showToast('EM BREVE')}
                className="text-emerald-100/90 hover:text-white hover:bg-emerald-800/60 active:scale-95 font-semibold text-xs px-3 py-1 rounded-full transition-all flex items-center space-x-1.5 cursor-pointer min-h-[28px]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Enviar Feedback</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CONTEÚDO PRINCIPAL DO DASHBOARD                                            */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-4 pt-4 pb-28 sm:pb-32 flex flex-col space-y-5">

        {/* ========================================================================= */}
        {/* MINI DASHBOARD / SPARKLINE (GASTOS RECENTES - ACESSO ÀS ANÁLISES)         */}
        {/* ========================================================================= */}
        <motion.div
          whileTap={motionConfig.shouldReduceMotion ? {} : { scale: 0.985 }}
          onClick={() => {
            if (onNavigateToAnalytics) {
              onNavigateToAnalytics();
            } else {
              showToast('Acesse a aba Gerenciador para ver as Análises completas');
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToAnalytics?.();
            }
          }}
          className="w-full bg-gradient-to-br from-white to-emerald-50/50 hover:to-emerald-100/50 border border-emerald-100/90 rounded-2xl p-4 shadow-sm transition-all cursor-pointer relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          {/* Fundo decorativo sutil */}
          <div className="absolute top-0 right-0 -mt-3 -mr-3 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center space-x-1.5 text-zinc-500">
                <BarChart2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Gastos Recentes
                </span>
                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full">
                  Análises
                </span>
              </div>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                  {formatCurrencyBRL(recentPurchasesTotal)}
                </span>
                {sparklineData.length > 0 && (
                  <span className="text-[11px] font-medium text-zinc-400">
                    últimas {sparklineData.length} {sparklineData.length === 1 ? 'compra' : 'compras'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1 text-emerald-600 group-hover:text-emerald-700 font-semibold text-xs transition-colors shrink-0 pt-0.5">
              <span>Ver painel</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Minigráfico de Tendência (Sparkline) */}
          <div className="mt-2.5 h-[60px] w-full relative">
            {sparklineData.length > 1 ? (
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={sparklineData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="homeSparklineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#homeSparklineGradient)"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={!motionConfig.shouldReduceMotion}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-between text-zinc-400 text-xs px-1">
                <div className="flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500/70" />
                  <span className="text-[11px]">
                    {sparklineData.length === 1
                      ? 'Finalize mais compras para ver a curva de tendência'
                      : 'Finalize compras para visualizar seus gráficos de gastos'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* 2. SEÇÃO DE ESTATÍSTICAS (FILTRO E CARDS)                                 */}
        {/* ========================================================================= */}
        <section aria-label="Estatísticas Financeiras">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Filtrar por último:
            </span>
          </div>

          {/* Segmented Control (Ano, Mês, Semana) */}
          <div className="bg-zinc-200/70 p-1 rounded-xl flex items-center border border-zinc-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => setTimeFilter('ano')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-all text-center cursor-pointer min-h-[34px] ${
                timeFilter === 'ano'
                  ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
              }`}
            >
              Ano
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('mes')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-all text-center cursor-pointer min-h-[34px] ${
                timeFilter === 'mes'
                  ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('semana')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-all text-center cursor-pointer min-h-[34px] ${
                timeFilter === 'semana'
                  ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
              }`}
            >
              Semana
            </button>
          </div>

          {/* Três cards menores dispostos horizontalmente num grid */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-3">
            {/* Card 1: Média */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between min-h-[90px]">
              <div className="text-zinc-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="mt-2">
                <span className="text-[11px] font-medium text-zinc-500 block leading-tight">
                  Média
                </span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 truncate block mt-0.5">
                  {formatCurrencyBRL(stats.avg)}
                </span>
              </div>
            </div>

            {/* Card 2: Compras */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-3 shadow-2xs flex flex-col justify-between min-h-[90px]">
              <div className="text-zinc-400">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="mt-2">
                <span className="text-[11px] font-medium text-zinc-500 block leading-tight">
                  Compras
                </span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 truncate block mt-0.5">
                  {stats.count}
                </span>
              </div>
            </div>

            {/* Card 3: Total (Fundo Verde Escuro em Destaque) */}
            <div className="bg-emerald-900 border border-emerald-800 rounded-2xl p-3 shadow-2xs flex flex-col justify-between min-h-[90px] text-white">
              <div className="text-emerald-300">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="mt-2">
                <span className="text-[11px] font-medium text-emerald-200 block leading-tight">
                  Total
                </span>
                <span className="text-xs sm:text-sm font-bold text-white truncate block mt-0.5">
                  {formatCurrencyBRL(stats.total)}
                </span>
              </div>
            </div>
          </div>
        </section>


        {/* ========================================================================= */}
        {/* 4. SEÇÃO "CONTINUAR COMPRANDO" (SESSÃO ATIVA CONDICIONAL)                  */}
        {/* ========================================================================= */}
        {activePendingPurchase && (
          <section aria-label="Sessão Ativa de Compra" className="space-y-2">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
                Continuar Comprando
              </h3>
            </div>

            <div className="w-full bg-white border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between transition-all">
              {/* Informações da compra */}
              <div 
                className="flex-1 min-w-0 overflow-hidden pr-3 cursor-pointer"
                onClick={() => handleContinuePending(activePendingPurchase)}
              >
                <h4 className="text-sm font-semibold text-zinc-900 truncate pr-2 leading-tight hover:text-emerald-700 transition-colors">
                  {activePendingPurchase.name || 'Compra em andamento'}
                </h4>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  {activePendingPurchase.items.length}{' '}
                  {activePendingPurchase.items.length === 1 ? 'item' : 'itens'} •{' '}
                  {calculatePurchaseTotal(activePendingPurchase.items || []) > 0
                    ? formatCurrencyBRL(calculatePurchaseTotal(activePendingPurchase.items || []))
                    : 'aguardando preços'}
                </p>
              </div>

              {/* Ações: Descartar (Lixeira) e Retomar (Play) */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleOpenDiscardModal(activePendingPurchase, e)}
                  aria-label="Descartar compra em andamento"
                  className="w-9 h-9 rounded-xl border border-zinc-200 hover:border-red-300 text-zinc-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center justify-center cursor-pointer transition-colors min-h-[36px] min-w-[36px]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleContinuePending(activePendingPurchase)}
                  aria-label="Retomar compra"
                  className="w-9 h-9 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 flex items-center justify-center cursor-pointer transition-colors min-h-[36px] min-w-[36px]"
                >
                  <Play className="w-4 h-4 fill-emerald-700" />
                </button>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAIS: NOVA COMPRA, DESCARTE, PREMIUM E FEEDBACK                         */}
      {/* ========================================================================= */}


      {/* Modal: Confirmar Descarte de Compra Pendente */}
      <AnimatePresence>
        {purchaseToDiscard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={motionConfig.modalSpring}
              className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-zinc-200 relative"
            >
              <button
                type="button"
                onClick={() => setPurchaseToDiscard(null)}
                aria-label="Fechar modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-5 pt-6">
                <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-3 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  Descartar compra?
                </h3>
                <p className="text-xs text-zinc-500 text-center mt-1.5 leading-relaxed">
                  Deseja realmente descartar a compra{' '}
                  <strong className="text-zinc-800 line-clamp-2 break-words">
                    "{purchaseToDiscard.name || 'Compra sem nome'}"
                  </strong>
                  ?
                </p>

                <div className="mt-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Itens adicionados:</span>
                    <span className="font-bold text-zinc-800">
                      {purchaseToDiscard.items.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Valor estimado:</span>
                    <span className="font-bold text-zinc-800">
                      {formatCurrencyBRL(calculatePurchaseTotal(purchaseToDiscard.items || []))}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={isDiscarding}
                    onClick={() => setPurchaseToDiscard(null)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDiscarding}
                    onClick={handleConfirmDiscard}
                    className={`flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1 ${
                      isDiscarding ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDiscarding ? 'Descartando...' : 'Confirmar'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Assinar Premium */}
      <AnimatePresence>
        {isPremiumModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={motionConfig.modalSpring}
              className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-zinc-200 relative"
            >
              <button
                type="button"
                onClick={() => setIsPremiumModalOpen(false)}
                aria-label="Fechar modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-5 pt-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 mx-auto shadow-2xs">
                  <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
                  Lista &amp; Compra Premium
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Desbloqueie todo o potencial da sua economia doméstica.
                </p>

                <div className="mt-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 text-left space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-zinc-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sincronização em nuvem ilimitada</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Relatórios analíticos de gastos mensais</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Histórico completo de compras anteriores</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Categorias e metas de orçamento avançadas</span>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPremiumModalOpen(false);
                      showToast('Plano Premium ativado como degustação!');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Experimentar Premium Grátis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPremiumModalOpen(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Enviar Feedback */}
      <AnimatePresence>
        {isFeedbackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={motionConfig.modalSpring}
              className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-zinc-200 relative"
            >
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                aria-label="Fechar modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <form onSubmit={handleSendFeedback} className="p-5 pt-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  Enviar Feedback
                </h3>
                <p className="text-xs text-zinc-500 text-center mt-1">
                  Conte-nos sua opinião, sugestão de melhoria ou reporte de dúvidas.
                </p>

                <div className="mt-4">
                  <textarea
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Escreva sua mensagem aqui..."
                    required
                    className="w-full p-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="mt-4 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackModalOpen(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!feedbackText.trim()}
                    className={`flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1 ${
                      !feedbackText.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
