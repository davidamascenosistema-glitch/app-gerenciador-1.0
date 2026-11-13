import React, { useState, useMemo } from 'react';
import {
  Settings,
  Star,
  MessageSquare,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  X,
  Check,
  Sparkles,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Receipt,
  Store,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useMotionConfig } from '../styles/motionSystem';
import { usePurchases } from '../hooks/usePurchases';
import { calculatePurchaseTotal, formatCurrencyBRL } from '../utils/purchaseHelpers';
import { Purchase, List } from '../types';
import { useToast } from './Toast';
import { User } from '@supabase/supabase-js';
import { AnimatedCurrency } from './AnimatedCurrency';
import {
  FeedbackModal,
  FeedbackCategory,
  MAX_FEEDBACK_LENGTH,
  FEEDBACK_SESSION_LOCK_KEY,
} from './FeedbackModal';

interface HomeScreenProps {
  user?: User | null;
  purchasesHook?: ReturnType<typeof usePurchases>;
  finishedPurchases?: Purchase[];
  lists?: List[];
  onNavigateToLists?: () => void;
  onOpenList?: (listId: string) => void;
  onNavigateToPurchase?: (purchaseId: string) => void;
  onStartNewPurchase?: () => void;
  onStartPurchaseFromList?: (list: List) => void;
  onSelectFinishedPurchase?: (purchase: Purchase) => void;
  onNavigateToHistory?: () => void;
  onNavigateToAnalytics?: (period?: 'week' | 'month' | 'year' | 'all') => void;
  onNavigateToProfile?: () => void;
  initialToastMessage?: string;
}

export function HomeScreen({
  user,
  purchasesHook: externalPurchasesHook,
  finishedPurchases: externalFinishedPurchases,
  lists = [],
  onNavigateToLists,
  onOpenList,
  onNavigateToPurchase,
  onStartNewPurchase,
  onStartPurchaseFromList,
  onSelectFinishedPurchase,
  onNavigateToHistory,
  onNavigateToAnalytics,
  onNavigateToProfile,
  initialToastMessage,
}: HomeScreenProps) {
  const motionConfig = useMotionConfig();
  const localPurchasesHook = usePurchases(user?.id);
  const purchasesHook = externalPurchasesHook || localPurchasesHook;

  const {
    getPendingPurchases,
    getFinishedPurchases,
    createPurchase,
    createPurchaseFromList,
    discardPurchase,
  } = purchasesHook;

  const { showToast } = useToast();

  // Estados locais
  const [timeFilter, setTimeFilter] = useState<'ano' | 'mes' | 'semana'>('mes');
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [hasSentFeedbackInSession, setHasSentFeedbackInSession] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(FEEDBACK_SESSION_LOCK_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Handler de envio de feedback com limite de 1000 caracteres, bloqueio de vazio e trava de sessão única
  const handleSendFeedback = async ({
    category,
    message,
    email,
    name,
  }: {
    category: FeedbackCategory;
    message: string;
    email: string;
    name: string;
  }) => {
    const alreadySentInSession =
      hasSentFeedbackInSession ||
      (() => {
        try {
          return sessionStorage.getItem(FEEDBACK_SESSION_LOCK_KEY) === 'true';
        } catch {
          return false;
        }
      })();

    if (alreadySentInSession) {
      throw new Error('Você já enviou um feedback nesta sessão.');
    }

    const sanitizedMessage = (message || '').replace(/<[^>]*>/g, '').trim();
    if (!sanitizedMessage) {
      throw new Error('A mensagem de feedback não pode estar vazia.');
    }

    const cappedMessage = sanitizedMessage.slice(0, MAX_FEEDBACK_LENGTH);

    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category,
        message: cappedMessage,
        email: (email || '').trim().slice(0, 120),
        name: (name || '').trim().slice(0, 80),
        metadata: {
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar feedback.');
    }

    setHasSentFeedbackInSession(true);
    try {
      sessionStorage.setItem(FEEDBACK_SESSION_LOCK_KEY, 'true');
    } catch {
      // ignore storage errors
    }
  };

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

  const shortUserName = useMemo(() => {
    const clean = String(userName || 'Usuário').trim();
    if (!clean) return 'Usuário';
    return clean.split(/\s+/)[0];
  }, [userName]);

  const userInitial = (userName || user?.email || 'U').charAt(0).toUpperCase();

  // Compras pendentes e finalizadas
  const pendingPurchases = (getPendingPurchases() || []).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const pendingPurchase = pendingPurchases.length > 0 ? pendingPurchases[0] : null;
  const finishedPurchases = externalFinishedPurchases || getFinishedPurchases() || [];
  const latestFinishedPurchase = finishedPurchases.length > 0 ? finishedPurchases[0] : null;

  // Dados para o Mini Gráfico (Sparkline de Evolução)
  const sparklineData = useMemo(() => {
    if (!finishedPurchases || finishedPurchases.length === 0) return [];

    const sorted = [...finishedPurchases].sort((a, b) => {
      const dateA =
        a.finishedAt || a.createdAt ? new Date(a.finishedAt || a.createdAt || '').getTime() : 0;
      const dateB =
        b.finishedAt || b.createdAt ? new Date(b.finishedAt || b.createdAt || '').getTime() : 0;
      return dateA - dateB;
    });

    const recent = sorted.slice(-8);

    return recent.map((p, idx) => ({
      index: idx + 1,
      total: calculatePurchaseTotal(p),
      name: p.name || `Compra ${idx + 1}`,
    }));
  }, [finishedPurchases]);

  // Cálculo das estatísticas com base no filtro de período (Semana / Mês / Ano)
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

    // Caso exista apenas 1 compra no período filtrado, calcula a divisão por categorias dessa compra
    let singlePurchaseCategories: Array<{
      category: string;
      amount: number;
      percent: number;
      color: string;
    }> = [];

    if (count === 1) {
      const singlePurchase = filtered[0];
      const catMap: Record<string, number> = {};
      let catTotal = 0;

      for (const item of singlePurchase.items || []) {
        if (!item) continue;
        const unitMultiplier = item.isWeighted
          ? Number(item.weight ?? item.quantity ?? 1)
          : Number(item.quantity ?? 1);
        const subtotal = (Number(item.price) || 0) * (unitMultiplier > 0 ? unitMultiplier : 1);
        if (subtotal <= 0) continue;
        const cat = (item.category && item.category.trim()) || 'Geral';
        catMap[cat] = (catMap[cat] || 0) + subtotal;
        catTotal += subtotal;
      }

      const categoryColors: Record<string, string> = {
        Alimentos: '#10b981',
        Mercearia: '#10b981',
        Bebidas: '#0ea5e9',
        Limpeza: '#06b6d4',
        Higiene: '#8b5cf6',
        Açougue: '#f43f5e',
        'Frutas/Legumes': '#84cc16',
        Hortifruti: '#14b8a6',
        Frios: '#f97316',
        Padaria: '#f59e0b',
        Geral: '#64748b',
      };
      const fallbackColors = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e'];

      singlePurchaseCategories = Object.entries(catMap)
        .map(([category, amount], idx) => ({
          category,
          amount,
          percent: catTotal > 0 ? Math.round((amount / catTotal) * 100) : 0,
          color: categoryColors[category] || fallbackColors[idx % fallbackColors.length],
        }))
        .filter((c) => c.percent > 0)
        .sort((a, b) => b.amount - a.amount);
    }

    return { total, count, avg, filtered, singlePurchaseCategories };
  }, [finishedPurchases, timeFilter]);

  const getMappedAnalyticsPeriod = (): 'week' | 'month' | 'year' => {
    if (timeFilter === 'semana') return 'week';
    if (timeFilter === 'ano') return 'year';
    return 'month';
  };

  // Handler para iniciar nova compra rapidamente quando não há compra em andamento
  const handleQuickStartPurchase = () => {
    if (onStartNewPurchase) {
      onStartNewPurchase();
      return;
    }
    pendingPurchases.forEach((p) => discardPurchase(p.id));
    const created = createPurchase({
      name: 'Nova Compra',
      status: 'pending',
      origin: 'list',
      items: [],
    });
    onNavigateToPurchase?.(created.id);
  };

  // Handler para iniciar compra diretamente a partir de uma lista na seção "Minhas Listas"
  const handleBuyFromList = (e: React.MouseEvent, list: List) => {
    e.stopPropagation();
    if (onStartPurchaseFromList) {
      onStartPurchaseFromList(list);
      return;
    }
    if (createPurchaseFromList && onNavigateToPurchase) {
      pendingPurchases.forEach((p) => discardPurchase(p.id));
      const created = createPurchaseFromList(list);
      onNavigateToPurchase(created.id);
      showToast(`Compra iniciada com a lista "${list.name}"!`);
      return;
    }
    onOpenList?.(list.id);
  };

  // Métricas da compra em andamento (se existir)
  const pendingTotalItems = pendingPurchase?.items ? pendingPurchase.items.length : 0;
  const pendingBoughtItems = pendingPurchase?.items
    ? pendingPurchase.items.filter((i) => i.bought).length
    : 0;
  const pendingProgressPercent =
    pendingTotalItems > 0 ? Math.min(100, Math.round((pendingBoughtItems / pendingTotalItems) * 100)) : 0;
  const pendingPartialTotal = pendingPurchase ? calculatePurchaseTotal(pendingPurchase) : 0;

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col selection:bg-emerald-500 selection:text-white font-sans relative pb-28">
      {/* ========================================================================= */}
      {/* 1. TOP BAR COMPACTA E ELEGANTE (FIXA NO TOPO)                             */}
      {/* ========================================================================= */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-zinc-100 fixed top-0 left-0 right-0 z-30 shadow-2xs">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-4 pt-3.5 pb-3 flex items-center justify-between gap-2">
          {/* Esquerda: Avatar + Saudação + Badge Seja Premium */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              onClick={onNavigateToProfile}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigateToProfile?.();
                }
              }}
              aria-label="Abrir perfil"
              className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shadow-xs shrink-0 select-none cursor-pointer active:scale-95 transition-transform"
            >
              {userInitial}
            </div>

            <div className="min-w-0 flex flex-col items-start">
              <h1 className="text-sm font-bold text-zinc-900 truncate max-w-[180px] sm:max-w-[240px] leading-tight">
                Olá, {shortUserName}
              </h1>
              <button
                type="button"
                onClick={() => showToast('EM BREVE')}
                className="mt-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              >
                <span>★ Seja Premium</span>
              </button>
            </div>
          </div>

          {/* Direita: Botão Feedback + Botão Configurações/Perfil */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFeedbackModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5 text-zinc-600" />
              <span>Feedback</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToProfile}
              aria-label="Configurações de Perfil"
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CONTEÚDO PRINCIPAL DO DASHBOARD                                           */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-4 pt-[78px] flex flex-col space-y-4">
        {/* ========================================================================= */}
        {/* 2. BLOCO DINÂMICO DE AÇÃO PRINCIPAL NO TOPO (PRIORIDADE OPERACIONAL)      */}
        {/* ========================================================================= */}
        <section aria-label="Ação Principal">
          {pendingPurchase ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md shadow-emerald-900/10"
            >
              {/* Topo do card: Badge + Nome da compra/mercado */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider bg-white/15 border border-white/20 px-2 py-0.5 rounded-full text-emerald-50">
                    <span>COMPRA EM ANDAMENTO</span>
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-white mt-1.5 truncate leading-tight">
                    {pendingPurchase.name || 'Compra em andamento'}
                  </h2>
                  {pendingPurchase.storeName && (
                    <p className="text-xs text-emerald-100/90 font-medium flex items-center gap-1 mt-0.5 truncate">
                      <Store className="w-3 h-3 shrink-0" />
                      <span className="truncate">{pendingPurchase.storeName}</span>
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100/80 block">
                    Subtotal
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    <AnimatedCurrency value={pendingPartialTotal} />
                  </span>
                </div>
              </div>

              {/* Meio: Barra de progresso visual + X de Y itens no carrinho */}
              <div className="mt-3">
                <div className="bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300"
                    style={{ width: `${pendingProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Rodapé/Direita do card: Progresso textual + Botão Retomar Compra */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-50">
                  {pendingBoughtItems} de {pendingTotalItems}{' '}
                  {pendingTotalItems === 1 ? 'item' : 'itens'} no carrinho
                </span>

                <button
                  type="button"
                  onClick={() => onNavigateToPurchase?.(pendingPurchase.id)}
                  className="bg-white hover:bg-emerald-50 active:scale-95 text-emerald-800 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Retomar Compra →
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Nova Compra */}
              <motion.button
                type="button"
                whileTap={motionConfig.tap.card}
                onClick={handleQuickStartPurchase}
                className="bg-white hover:bg-emerald-50/40 border border-zinc-200/90 hover:border-emerald-300 rounded-2xl p-3.5 text-left shadow-2xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="mt-3">
                  <h2 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-800 transition-colors leading-tight">
                    Começar Compra
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-medium mt-0.5 leading-snug">
                    Do zero ou por voz
                  </p>
                </div>
              </motion.button>

              {/* Card 2: Planejar Lista */}
              <motion.button
                type="button"
                whileTap={motionConfig.tap.card}
                onClick={onNavigateToLists}
                className="bg-white hover:bg-emerald-50/40 border border-zinc-200/90 hover:border-emerald-300 rounded-2xl p-3.5 text-left shadow-2xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="mt-3">
                  <h2 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-800 transition-colors leading-tight">
                    Minhas Listas
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-medium mt-0.5 leading-snug">
                    Criar ou usar molde
                  </p>
                </div>
              </motion.button>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 3. WIDGET UNIFICADO "RESUMO FINANCEIRO" (BENTO CARD ÚNICO)                */}
        {/* ========================================================================= */}
        <section aria-label="Resumo de Gastos">
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-4 shadow-2xs">
            {/* Cabeçalho do Card: Título à esquerda + Seletor Semana | Mês | Ano à direita */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-800 truncate">
                  Resumo de Gastos
                </h3>
              </div>

              {/* Seletor Segmentado Compacto: Semana | Mês | Ano */}
              <div className="bg-zinc-100 p-0.5 rounded-xl text-[11px] font-bold flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setTimeFilter('semana')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    timeFilter === 'semana'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 font-semibold'
                  }`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('mes')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    timeFilter === 'mes'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 font-semibold'
                  }`}
                >
                  Mês
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('ano')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    timeFilter === 'ano'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 font-semibold'
                  }`}
                >
                  Ano
                </button>
              </div>
            </div>

            {/* Corpo Principal: Valor Total do Período + Link Ver análises → */}
            <div className="mt-3.5 flex items-baseline justify-between gap-2">
              <div>
                <span className="text-[11px] font-medium text-zinc-400 block">
                  Total no período
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight mt-0.5">
                  <AnimatedCurrency value={stats.total} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToAnalytics) {
                    onNavigateToAnalytics(getMappedAnalyticsPeriod());
                  } else {
                    showToast('Acesse a aba Gerenciador para ver as Análises completas');
                  }
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer shrink-0 py-1 px-2 -mr-2 rounded-lg hover:bg-emerald-50/70"
              >
                Ver análises →
              </button>
            </div>

            {/* Sub-grid Interno (2 Colunas Compactas): Compras no período e Ticket Médio */}
            <div className="grid grid-cols-2 gap-2.5 mt-3.5 pt-3 border-t border-zinc-100">
              {/* Coluna 1: Compras no período */}
              <div className="bg-zinc-50/80 border border-zinc-100 rounded-2xl p-3 flex flex-col justify-between min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Realizadas</span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-zinc-900 truncate mt-1.5 leading-tight">
                  {stats.count} {stats.count === 1 ? 'compra' : 'compras'}
                </div>
              </div>

              {/* Coluna 2: Ticket Médio */}
              <div className="bg-zinc-50/80 border border-zinc-100 rounded-2xl p-3 flex flex-col justify-between min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Ticket Médio</span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-zinc-900 truncate mt-1.5 leading-tight">
                  <AnimatedCurrency value={stats.avg} />
                </div>
              </div>
            </div>

            {/* Rodapé inteligente: Curva de evolução (2+ compras), Barra de categorias (1 compra) ou Mensagem (0 compras) */}
            {stats.count === 1 && stats.singlePurchaseCategories.length > 0 ? (
              <div className="mt-3 pt-2.5 border-t border-zinc-100 space-y-1.5">
                {/* Mini-barra horizontal multicolorida */}
                <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden flex gap-0.5">
                  {stats.singlePurchaseCategories.map((cat) => (
                    <div
                      key={cat.category}
                      className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                      style={{
                        width: `${Math.max(6, cat.percent)}%`,
                        backgroundColor: cat.color,
                      }}
                      title={`${cat.category}: ${cat.percent}%`}
                    />
                  ))}
                </div>

                {/* Legenda compacta das principais categorias */}
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] font-semibold text-zinc-600">
                  {stats.singlePurchaseCategories.slice(0, 3).map((cat, idx, arr) => (
                    <React.Fragment key={cat.category}>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-zinc-700 font-bold">{cat.category}</span>
                        <span className="text-zinc-400 font-semibold">{cat.percent}%</span>
                      </span>
                      {idx < arr.length - 1 && <span className="text-zinc-300">•</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : sparklineData.length >= 2 ? (
              <div className="mt-3 pt-2.5 border-t border-zinc-100">
                <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400 mb-1 px-0.5">
                  <span>Curva de evolução (últimas {sparklineData.length} compras)</span>
                </div>
                <div className="h-[52px] w-full">
                  <ResponsiveContainer width="100%" height={52}>
                    <AreaChart data={sparklineData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                      <defs>
                        <linearGradient id="homeSparklineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#059669"
                        strokeWidth={2.2}
                        fill="url(#homeSparklineGradient)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={!motionConfig.shouldReduceMotion}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
                <span>Finalize mais compras para liberar o gráfico de evolução</span>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. SEÇÃO "MINHAS LISTAS" COM BOTÃO DE AÇÃO DIRETA                         */}
        {/* ========================================================================= */}
        <section aria-label="Minhas Listas" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
                Minhas Listas
              </h3>
              <span className="text-xs font-semibold text-zinc-400">
                ({lists.length})
              </span>
            </div>

            <button
              type="button"
              onClick={onNavigateToLists}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer py-1 px-1.5 -mr-1.5 rounded-lg hover:bg-emerald-50/60"
            >
              Ver todas →
            </button>
          </div>

          {lists.length === 0 ? (
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 text-center shadow-2xs">
              <p className="text-xs text-zinc-500">
                Nenhuma lista planejada cadastrada ainda.
              </p>
              <button
                type="button"
                onClick={onNavigateToLists}
                className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Criar primeira lista</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lists.slice(0, 3).map((list) => {
                const count = list.items ? list.items.length : 0;
                const previewItems = (list.items || []).slice(0, 4);
                return (
                  <div
                    key={list.id}
                    onClick={() => {
                      if (onOpenList) {
                        onOpenList(list.id);
                      } else {
                        onNavigateToLists?.();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (onOpenList) onOpenList(list.id);
                        else onNavigateToLists?.();
                      }
                    }}
                    className="w-full bg-white border border-zinc-200/90 hover:border-emerald-300 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group text-left"
                  >
                    {/* À esquerda: Nome da lista, badge de quantidade e prévia dos itens */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors truncate">
                          {list.name}
                        </h4>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-full shrink-0">
                          {count} {count === 1 ? 'item' : 'itens'}
                        </span>
                      </div>

                      {previewItems.length > 0 ? (
                        <p className="text-xs text-zinc-400 font-medium truncate mt-1">
                          {previewItems.map((it) => it.name).join(', ')}
                          {count > 4 ? '...' : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400 font-medium truncate mt-1">
                          Lista vazia — toque para adicionar itens
                        </p>
                      )}
                    </div>

                    {/* À direita: Botão rápido de ação Comprar */}
                    <button
                      type="button"
                      onClick={(e) => handleBuyFromList(e, list)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200/80 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer active:scale-95"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Comprar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 5. SEÇÃO COMPACTA "ÚLTIMA COMPRA REALIZADA" (ACESSO RÁPIDO AO RECIBO)      */}
        {/* ========================================================================= */}
        {latestFinishedPurchase && (
          <section aria-label="Última Compra Realizada" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
                  Última Compra Realizada
                </h3>
              </div>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer py-1 px-1.5 -mr-1.5 rounded-lg hover:bg-emerald-50/60"
                >
                  Ver histórico →
                </button>
              )}
            </div>

            <div
              onClick={() => {
                if (onSelectFinishedPurchase) {
                  onSelectFinishedPurchase(latestFinishedPurchase);
                } else if (onNavigateToAnalytics) {
                  onNavigateToAnalytics();
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onSelectFinishedPurchase) {
                    onSelectFinishedPurchase(latestFinishedPurchase);
                  } else if (onNavigateToAnalytics) {
                    onNavigateToAnalytics();
                  }
                }
              }}
              className="w-full bg-white border border-zinc-200/90 hover:border-emerald-300 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              {/* Ícone de recibo/check verde à esquerda + Nome e data/quantidade */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors truncate">
                      {latestFinishedPurchase.name || 'Compra Finalizada'}
                    </h4>
                    {latestFinishedPurchase.storeName && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md truncate max-w-[110px] shrink-0">
                        {latestFinishedPurchase.storeName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mt-0.5">
                    <Receipt className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>
                      {new Date(
                        latestFinishedPurchase.finishedAt || latestFinishedPurchase.createdAt
                      ).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      {latestFinishedPurchase.items?.length || 0}{' '}
                      {(latestFinishedPurchase.items?.length || 0) === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Valor total à direita */}
              <div className="text-right shrink-0">
                <span className="text-sm font-extrabold text-zinc-900 block">
                  {formatCurrencyBRL(calculatePurchaseTotal(latestFinishedPurchase))}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 group-hover:underline">
                  Ver recibo →
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAIS: PREMIUM E FEEDBACK                                                */}
      {/* ========================================================================= */}

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
                    <span>Acesso em todos os seus aparelhos</span>
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
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        userEmail={user?.email || ''}
        userName={userName}
        hasSentInSession={hasSentFeedbackInSession}
        onSendFeedback={handleSendFeedback}
      />
    </div>
  );
}
