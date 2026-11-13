import React, { useState } from 'react';
import {
  History,
  ClipboardList,
  BarChart3,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  ShoppingCart,
  Calendar,
  Sparkles,
  TrendingUp,
  PieChart,
  DollarSign,
  ArrowRight,
  RotateCcw,
  Layers,
  ShoppingBag,
  Check,
  X,
  Loader2,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { Purchase, List } from '../types';
import { calculatePurchaseTotal, formatCurrencyBRL, formatDateBRL } from '../utils/purchaseHelpers';
import { AnalyticsTab } from './AnalyticsTab';
import { User } from '@supabase/supabase-js';
import { useToast } from './Toast';
import {
  FeedbackModal,
  FeedbackCategory,
  MAX_FEEDBACK_LENGTH,
  FEEDBACK_SESSION_LOCK_KEY,
} from './FeedbackModal';

export type ManagerTab = 'history' | 'lists' | 'analytics';

export interface ManagerScreenProps {
  user?: User | null;
  onNavigateToProfile?: () => void;
  initialTab?: ManagerTab;
  activeTab?: ManagerTab;
  analyticsInitialPeriod?: 'week' | 'month' | 'year' | 'all';
  onTabChange?: (tab: ManagerTab) => void;
  // Props de Histórico
  finishedPurchases: Purchase[];
  onSelectPurchase: (purchase: Purchase) => void;
  onRepeatPurchase?: (purchase: Purchase) => void;
  // Props de Listas
  lists: List[];
  loadingLists?: boolean;
  onCreateList: (name: string) => Promise<void> | void;
  onOpenList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onStartPurchaseFromList: (list: List) => void;
}

const sanitizeTab = (tab: unknown): ManagerTab => {
  if (tab === 'history' || tab === 'analytics') return tab;
  return 'lists';
};

export function ManagerScreen({
  user,
  onNavigateToProfile,
  initialTab = 'lists',
  activeTab: controlledTab,
  analyticsInitialPeriod = 'month',
  onTabChange,
  finishedPurchases = [],
  onSelectPurchase,
  onRepeatPurchase,
  lists = [],
  loadingLists = false,
  onCreateList,
  onOpenList,
  onDeleteList,
  onStartPurchaseFromList,
}: ManagerScreenProps) {
  const motionConfig = useMotionConfig();
  const { showToast } = useToast();

  // Identificação do Usuário para a Top Bar fixa
  const userName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Usuário');
  const shortUserName = String(userName || 'Usuário').trim().split(/\s+/)[0] || 'Usuário';
  const userInitial = (userName || user?.email || 'U').charAt(0).toUpperCase();

  // Estado do Modal de Feedback na Top Bar
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [hasSentFeedbackInSession, setHasSentFeedbackInSession] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(FEEDBACK_SESSION_LOCK_KEY) === 'true';
    } catch {
      return false;
    }
  });

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
      // ignore
    }
  };

  // Gerenciamento de abas (controlada externamente se fornecido, ou interna)
  const safeControlledTab = controlledTab !== undefined ? sanitizeTab(controlledTab) : undefined;
  const [internalTab, setInternalTab] = useState<ManagerTab>(() => sanitizeTab(initialTab));
  const currentTab = safeControlledTab ?? internalTab;

  const handleSelectTab = (tab: ManagerTab) => {
    const safeTab = sanitizeTab(tab);
    if (typeof onTabChange === 'function') {
      try {
        onTabChange(safeTab);
      } catch (err) {
        console.error('Erro ao alternar aba:', err);
      }
    }
    setInternalTab(safeTab);
  };

  // Estados locais para a aba de Listas
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para o modal de criação de nova lista
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  const handleOpenCreateModal = () => {
    setNewListName('');
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isCreatingList) return;
    setIsCreateModalOpen(false);
    setNewListName('');
  };

  const handleConfirmCreateList = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed || isCreatingList) return;

    try {
      setIsCreatingList(true);
      await onCreateList(trimmed);
      setIsCreateModalOpen(false);
      setNewListName('');
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleDeleteList = async () => {
    if (!listToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await onDeleteList?.(listToDelete.id);
      setListToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Estados locais para a aba de Histórico
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Cálculos de Histórico com fallbacks de segurança
  const safeFinishedPurchases = Array.isArray(finishedPurchases) ? finishedPurchases : [];
  const safeLists = Array.isArray(lists) ? lists : [];

  const totalSpentAllTime = (safeFinishedPurchases || []).reduce(
    (acc, p) => acc + (p ? calculatePurchaseTotal(p.items || []) : 0),
    0
  );

  const filteredHistory = (safeFinishedPurchases || []).filter((p) => {
    if (!p) return false;
    if (!historySearchQuery.trim()) return true;
    const name = (p.name || '').toLowerCase();
    const query = historySearchQuery.toLowerCase().trim();
    return name.includes(query);
  });

  // Filtro de Listas com fallbacks de segurança
  const filteredLists = (safeLists || []).filter((l) => {
    if (!l) return false;
    const name = (l.name || '').toLowerCase();
    const query = listSearchQuery.toLowerCase().trim();
    return name.includes(query);
  });

  const formatListDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 text-zinc-900 flex flex-col selection:bg-emerald-500 selection:text-white font-sans">
      {/* Topo Fixo (Sticky): Top Bar da Página Inicial + Abas de Gestão */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
        {/* 1. Top Bar Compacta da Página Inicial */}
        <div className="w-full border-b border-zinc-100">
          <div className="w-full max-w-md md:max-w-xl mx-auto px-4 pt-3 pb-2.5 sm:px-6 flex items-center justify-between gap-2">
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
                <span className="text-sm font-bold text-zinc-900 truncate max-w-[180px] sm:max-w-[240px] leading-tight">
                  Olá, {shortUserName}
                </span>
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
        </div>

        {/* 2. Sub-barra Fixa de Gestão e Abas */}
        <div className="w-full max-w-md md:max-w-xl mx-auto px-4 pt-2.5 pb-2.5 sm:px-6">
          {/* Título & Identificação */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-tight">
                Gestão
              </h1>
              {currentTab === 'lists' && (
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                  {safeLists.length}{' '}
                  {safeLists.length === 1 ? 'lista de planejamento' : 'listas de planejamento'}
                </p>
              )}
              {currentTab === 'history' && (
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                  {safeFinishedPurchases.length}{' '}
                  {safeFinishedPurchases.length === 1 ? 'compra concluída' : 'compras concluídas'}
                </p>
              )}
            </div>

            {/* Ação rápida contextual no header (ex: Nova Lista na aba de listas) */}
            {currentTab === 'lists' && (
              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={handleOpenCreateModal}
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nova Lista</span>
              </motion.button>
            )}

            {currentTab === 'history' && safeFinishedPurchases.length > 0 && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-bold">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 -mr-0.5" />
                <span>{formatCurrencyBRL(totalSpentAllTime)}</span>
              </div>
            )}
          </div>

          {/* Segmented Control / Tabs Horizontais: 1º Listas, 2º Análises, 3º Histórico */}
          <nav
            role="tablist"
            aria-label="Abas de Gestão"
            className="flex items-center p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/70 relative"
          >
            {/* Aba 1: Listas */}
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'lists'}
              onClick={() => handleSelectTab('lists')}
              className={`relative flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[38px] ${
                currentTab === 'lists'
                  ? 'text-emerald-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {currentTab === 'lists' && (
                <motion.div
                  layoutId="manager-tab-indicator"
                  transition={motionConfig.pressSpring}
                  className="absolute inset-0 bg-white rounded-xl border border-zinc-200/80 shadow-xs"
                />
              )}
              <span className="relative z-10 flex items-center space-x-1.5">
                <ClipboardList className={`w-4 h-4 ${currentTab === 'lists' ? 'text-emerald-600' : 'text-zinc-400'}`} />
                <span>Listas</span>
                {safeLists.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      currentTab === 'lists'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {safeLists.length}
                  </span>
                )}
              </span>
            </button>

            {/* Aba 2: Análises */}
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'analytics'}
              onClick={() => handleSelectTab('analytics')}
              className={`relative flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[38px] ${
                currentTab === 'analytics'
                  ? 'text-emerald-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {currentTab === 'analytics' && (
                <motion.div
                  layoutId="manager-tab-indicator"
                  transition={motionConfig.pressSpring}
                  className="absolute inset-0 bg-white rounded-xl border border-zinc-200/80 shadow-xs"
                />
              )}
              <span className="relative z-10 flex items-center space-x-1.5">
                <BarChart3 className={`w-4 h-4 ${currentTab === 'analytics' ? 'text-emerald-600' : 'text-zinc-400'}`} />
                <span>Análises</span>
              </span>
            </button>

            {/* Aba 3: Histórico */}
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'history'}
              onClick={() => handleSelectTab('history')}
              className={`relative flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[38px] ${
                currentTab === 'history'
                  ? 'text-emerald-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {currentTab === 'history' && (
                <motion.div
                  layoutId="manager-tab-indicator"
                  transition={motionConfig.pressSpring}
                  className="absolute inset-0 bg-white rounded-xl border border-zinc-200/80 shadow-xs"
                />
              )}
              <span className="relative z-10 flex items-center space-x-1.5">
                <History className={`w-4 h-4 ${currentTab === 'history' ? 'text-emerald-600' : 'text-zinc-400'}`} />
                <span>Histórico</span>
                {safeFinishedPurchases.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      currentTab === 'history'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {safeFinishedPurchases.length}
                  </span>
                )}
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal Renderizado Conforme a Aba Ativa */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-4 sm:px-6 pt-4 pb-28 space-y-4">
        {/* ================= ABA 1: HISTÓRICO ================= */}
        {currentTab === 'history' && (
          <div className="space-y-4">
            {safeFinishedPurchases.length > 3 && (
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Buscar compra por nome..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200/90 rounded-2xl text-zinc-900 placeholder:text-zinc-400 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>
            )}

            {safeFinishedPurchases.length === 0 ? (
              <div className="py-14 text-center px-4 rounded-3xl border-2 border-dashed border-zinc-200/90 bg-white/50 my-2">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 mx-auto mb-3 shadow-2xs">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  Nenhuma compra finalizada
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1.5 leading-relaxed">
                  Assim que você concluir sua primeira compra no supermercado, ela será arquivada aqui com todos os preços e totais.
                </p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                Nenhuma compra encontrada para &ldquo;{historySearchQuery}&rdquo;.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold px-1">
                  <span>REGISTROS ANTERIORES</span>
                  <span>
                    {filteredHistory.length} {filteredHistory.length === 1 ? 'compra' : 'compras'}
                  </span>
                </div>

                {filteredHistory.map((purchase) => {
                  const total = calculatePurchaseTotal(purchase?.items || []);
                  const formattedDate = formatDateBRL(
                    purchase?.finishedAt || purchase?.createdAt
                  );
                  const itemsCount = purchase?.items ? purchase.items.length : 0;

                  return (
                    <motion.div
                      key={purchase.id}
                      whileTap={motionConfig.tap.row}
                      transition={motionConfig.pressSpring}
                      className="w-full bg-white rounded-2xl border border-zinc-200/90 hover:border-zinc-300 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                    >
                      {/* Área Clicável Principal para Ver Detalhes */}
                      <div
                        onClick={() => onSelectPurchase?.(purchase)}
                        className="p-4 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between space-x-3">
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <ShoppingCart className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate leading-snug">
                                {purchase?.name || 'Compra Finalizada'}
                              </h3>
                              <div className="flex items-center space-x-1.5 text-xs text-zinc-500 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>{formattedDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-black text-zinc-900 block leading-tight">
                              {formatCurrencyBRL(total)}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-medium">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Barra de Ações Rápidas no Rodapé do Card */}
                      <div className="border-t border-zinc-100 px-4 py-2 bg-zinc-50/70 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => onSelectPurchase?.(purchase)}
                          className="font-bold text-zinc-600 hover:text-zinc-900 flex items-center space-x-1 cursor-pointer py-1"
                        >
                          <span>Ver resumo</span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                        </button>

                        {onRepeatPurchase && (
                          <button
                            type="button"
                            onClick={() => onRepeatPurchase?.(purchase)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Repetir</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 2: LISTAS ================= */}
        {currentTab === 'lists' && (
          <div className="space-y-4">
            {safeLists.length > 2 && (
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  placeholder="Buscar por nome da lista..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200/90 rounded-2xl text-zinc-900 placeholder:text-zinc-400 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>
            )}

            {loadingLists && safeLists.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-sm">
                Carregando suas listas...
              </div>
            ) : filteredLists.length === 0 ? (
              <div className="py-14 text-center px-4 rounded-3xl border-2 border-dashed border-zinc-200/90 bg-white/50 my-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <ClipboardList className="w-8 h-8 stroke-[1.8]" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  {listSearchQuery ? 'Nenhuma lista encontrada' : 'Nenhuma lista criada ainda'}
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1.5 leading-relaxed">
                  {listSearchQuery
                    ? 'Tente pesquisar com outro nome.'
                    : 'Crie listas de compras para agilizar seu planejamento antes de ir ao supermercado.'}
                </p>
                {!listSearchQuery && (
                  <motion.button
                    whileTap={motionConfig.tap.button}
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="mt-5 inline-flex items-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-700/20 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Criar Primeira Lista</span>
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredLists.map((list) => {
                  const itemCount = list?.items ? list.items.length : 0;
                  const sampleItems = (list?.items || []).slice(0, 4);

                  return (
                    <motion.div
                      key={list.id}
                      layout
                      className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all overflow-hidden"
                    >
                      {/* Clique no corpo abre a tela de edição da lista */}
                      <div
                        onClick={() => onOpenList?.(list.id)}
                        className="p-4 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-3">
                            <h3 className="text-base font-bold text-zinc-900 leading-tight truncate">
                              {list.name}
                            </h3>
                            <div className="flex items-center space-x-2 text-xs text-zinc-500 mt-1 font-medium">
                              <span className="font-semibold text-emerald-700">
                                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                              </span>
                              {list.createdAt ? (
                                <>
                                  <span>•</span>
                                  <span>{list.createdAt ? formatListDate(list.createdAt) : ''}</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="text-zinc-400 shrink-0">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Preview dos itens */}
                        {sampleItems.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {sampleItems.map((item) => (
                              <span
                                key={item.id}
                                className="inline-block px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-[11px] font-medium truncate max-w-[140px]"
                              >
                                {item.name}
                              </span>
                            ))}
                            {itemCount > 4 && (
                              <span className="inline-block px-2 py-1 rounded-lg bg-zinc-50 text-zinc-400 text-[11px] font-medium border border-zinc-200/60 shrink-0">
                                +{itemCount - 4} outros
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Barra de Ações: Excluir e Iniciar Compra */}
                      <div className="border-t border-zinc-100 px-4 py-2.5 bg-zinc-50/80 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setListToDelete(list)}
                          className="text-xs font-semibold text-zinc-400 hover:text-red-600 transition-colors flex items-center space-x-1 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-red-50"
                          aria-label={`Excluir lista ${list.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>

                        <motion.button
                          whileTap={motionConfig.tap.button}
                          transition={motionConfig.pressSpring}
                          type="button"
                          onClick={() => onStartPurchaseFromList?.(list)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Iniciar Compra</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 3: ANÁLISES & DASHBOARD ================= */}
        {currentTab === 'analytics' && (
          <AnalyticsTab
            finishedPurchases={safeFinishedPurchases}
            onSelectPurchase={onSelectPurchase}
            initialPeriod={analyticsInitialPeriod}
          />
        )}
      </main>

      {/* Modal de Exclusão de Lista */}
      <AnimatePresence>
        {listToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={motionConfig.modalSpring}
              className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-zinc-200 relative p-5 pt-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-3 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                Excluir Lista?
              </h3>
              <p className="text-xs text-zinc-500 text-center mt-1.5 leading-relaxed">
                Tem certeza de que deseja excluir a lista{' '}
                <strong className="text-zinc-800 line-clamp-2 break-words">&ldquo;{listToDelete.name}&rdquo;</strong>? Esta ação não pode ser desfeita.
              </p>

              <div className="mt-5 flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setListToDelete(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteList}
                  className={`flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1 ${
                    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Excluindo...' : 'Excluir'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Criar Nova Lista com Validação Obrigatória de Nome */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
              transition={motionConfig.modalSpring}
              className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-zinc-200 relative"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-list-title"
            >
              <button
                type="button"
                disabled={isCreatingList}
                onClick={handleCloseCreateModal}
                aria-label="Fechar modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <form onSubmit={handleConfirmCreateList} className="p-5 pt-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 mx-auto">
                  <ClipboardList className="w-6 h-6 stroke-[2.2]" />
                </div>

                <h3 id="create-list-title" className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  Nova Lista de Compras
                </h3>
                <p className="text-xs text-zinc-500 text-center mt-1 leading-relaxed">
                  Defina um nome para planejar seus itens antes de ir às compras.
                </p>

                <div className="mt-4">
                  <label htmlFor="modal-list-name" className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                    Nome da lista *
                  </label>
                  <input
                    id="modal-list-name"
                    type="text"
                    autoFocus
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Ex: Compras do Mês, Churrasco, Feira..."
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
                  />
                  {!newListName.trim() && (
                    <span className="text-[11px] text-zinc-400 block mt-1 font-medium">
                      O nome é obrigatório para criar a lista.
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={isCreatingList}
                    onClick={handleCloseCreateModal}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={!newListName.trim() || isCreatingList}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-white font-bold text-xs transition-all min-h-[44px] flex items-center justify-center space-x-1.5 ${
                      !newListName.trim() || isCreatingList
                        ? 'bg-emerald-400 opacity-60 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-700/20 cursor-pointer'
                    }`}
                  >
                    {isCreatingList ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        <span>Criando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Criar Lista</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
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
