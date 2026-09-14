import React, { useState } from 'react';
import { 
  ShoppingCart,
  Play,
  Trash2,
  Clock,
  Plus,
  ShoppingBag,
  X,
  TrendingUp,
  RotateCcw,
  Receipt,
  ChevronRight,
  User,
  ClipboardList,
  Store,
  DollarSign,
  ListPlus,
  Layers,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { usePurchases } from '../hooks/usePurchases';
import { useLists } from '../hooks/useLists';
import { calculatePurchaseTotal, formatCurrencyBRL, formatDateBRL } from '../utils/purchaseHelpers';
import { Purchase, List, ListItem, Item } from '../types';
import { useToast } from './Toast';
import { NewPurchaseModal } from './NewPurchaseModal';

interface HomeScreenProps {
  purchasesHook?: ReturnType<typeof usePurchases>;
  listsHook?: ReturnType<typeof useLists>;
  onNavigateToPurchase?: (purchaseId: string) => void;
  onNavigateToList?: (listId: string) => void;
  onNavigateToHistory?: () => void;
  onNavigateToProfile?: () => void;
  onRepeatPurchase?: () => void;
  onSelectFinishedPurchase?: (purchase: Purchase) => void;
  initialToastMessage?: string;
}

export function HomeScreen({
  purchasesHook: externalPurchasesHook,
  listsHook: externalListsHook,
  onNavigateToPurchase,
  onNavigateToList,
  onNavigateToHistory,
  onNavigateToProfile,
  onRepeatPurchase,
  onSelectFinishedPurchase,
  initialToastMessage,
}: HomeScreenProps) {
  const motionConfig = useMotionConfig();
  const localPurchasesHook = usePurchases();
  const purchasesHook = externalPurchasesHook || localPurchasesHook;

  const localListsHook = useLists();
  const listsHook = externalListsHook || localListsHook;

  const { 
    getPendingPurchases, 
    getFinishedPurchases, 
    discardPurchase, 
    createPurchase, 
    createPurchaseFromTemplate,
    createPurchaseFromList 
  } = purchasesHook;

  const { lists, createList, deleteList, addItemToList, removeItemFromList } = listsHook;

  const { showToast } = useToast();

  // Estados dos Modais
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [selectedListForPurchase, setSelectedListForPurchase] = useState<string | null>(null);
  const [purchaseToDiscard, setPurchaseToDiscard] = useState<Purchase | null>(null);

  // Navegação para a nova tela cheia de gerenciamento de lista
  const handleOpenListScreen = (listId: string) => {
    if (onNavigateToList) {
      onNavigateToList(listId);
    }
  };

  const handleCreateNewListTemplate = async () => {
    const created = await createList({ name: 'Nova Lista' });
    if (onNavigateToList) {
      onNavigateToList(created.id);
    } else {
      showToast(`Molde "${created.name}" criado!`);
    }
  };

  const pendingPurchases = (getPendingPurchases() || []).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const finishedPurchases = getFinishedPurchases() || [];
  const latestFinishedPurchase = finishedPurchases.length > 0 ? finishedPurchases[0] : null;

  // Gastos do mês atual
  const currentMonthTotal = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return finishedPurchases.reduce((acc, p) => {
      const dateStr = p.finishedAt || p.createdAt;
      if (!dateStr) return acc;
      const date = new Date(dateStr);
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        return acc + calculatePurchaseTotal(p);
      }
      return acc;
    }, 0);
  }, [finishedPurchases]);

  React.useEffect(() => {
    if (initialToastMessage) {
      showToast(initialToastMessage);
    }
  }, [initialToastMessage, showToast]);

  // Handler para iniciar compra através do modal de configuração ágil
  const handleStartPurchaseSession = (params: {
    name?: string;
    storeName?: string;
    budget?: number;
    fromListId?: string;
  }) => {
    let initialItems: Item[] = [];

    if (params.fromListId) {
      const foundList = listsHook.getListById(params.fromListId);
      if (foundList && foundList.items) {
        initialItems = foundList.items.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name,
          category: item.category || 'Geral',
          quantity: item.quantity || 1,
          weight: item.weight,
          isWeighted: item.isWeighted || false,
          price: item.price,
          bought: false,
          pricingModeSource: item.pricingModeSource ?? null,
        }));
      }
    }

    const newPurchase = createPurchase({
      name: params.name || 'Nova Compra',
      status: 'pending',
      origin: 'list',
      items: initialItems,
      budget: params.budget,
      storeName: params.storeName,
      fromListId: params.fromListId,
    });

    setIsNewPurchaseModalOpen(false);
    setSelectedListForPurchase(null);

    if (onNavigateToPurchase) {
      onNavigateToPurchase(newPurchase.id);
    } else {
      showToast(`Compra iniciada: "${newPurchase.name}"`);
    }
  };

  // Handler para criar nova lista de planejamento
  const handleCreateListSubmit = async (name: string, items?: Omit<ListItem, 'id'>[]) => {
    const created = await createList({ name, items });
    showToast(`Molde de lista "${created.name}" criado com sucesso!`);
  };

  // Handler para abrir modal de nova compra a partir de um molde de lista específico
  const handleOpenPurchaseWithList = (list: List) => {
    setSelectedListForPurchase(list.id);
    setIsNewPurchaseModalOpen(true);
  };

  // Handler para continuar compra pendente existente
  const handleContinuePending = (purchase: Purchase) => {
    if (onNavigateToPurchase) {
      onNavigateToPurchase(purchase.id);
    } else {
      const name = purchase.name || 'Compra sem nome';
      showToast(`Continuando: "${name}" (${purchase.items.length} itens)`);
    }
  };

  // Handler para descarte
  const handleOpenDiscardModal = (purchase: Purchase, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPurchaseToDiscard(purchase);
  };

  const handleConfirmDiscard = () => {
    if (!purchaseToDiscard) return;
    const name = purchaseToDiscard.name || 'Compra sem nome';
    const pendingId = purchaseToDiscard.id;

    discardPurchase(pendingId);
    setPurchaseToDiscard(null);
    showToast(`Compra "${name}" descartada com sucesso.`);
  };

  // Handler para repetir última compra
  const handleRepeatLatestPurchase = (template: Purchase) => {
    const newPurchase = createPurchaseFromTemplate(template);
    showToast(`Compra criada a partir de "${template.name || 'Última compra'}"`);
    if (onNavigateToPurchase) {
      onNavigateToPurchase(newPurchase.id);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative">
      {/* Mobile-Optimized Header */}
      <header className="w-full bg-white border-b border-zinc-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-2xs shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 leading-tight">
                Lista &amp; Compra
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-none mt-0.5">
                Organize listas e controle seus gastos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToProfile}
            aria-label="Ver Perfil"
            className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-600 hover:text-emerald-700 active:text-emerald-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] active:scale-95"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 pt-3.5 sm:pt-4 pb-28 sm:pb-32 flex flex-col space-y-5">
        
        {/* ========================================================================= */}
        {/* 1. DUAS AÇÕES PRIMÁRIAS EM DESTAQUE (HERO ACTIONS)                         */}
        {/*    - Criar Lista (Planejamento em casa)                                   */}
        {/*    - Iniciar Compra (Uso ativo no mercado)                                */}
        {/* ========================================================================= */}
        <section className="w-full space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Ação 1: Criar Lista (Planejamento em Casa) */}
            <motion.button
              whileTap={motionConfig.tap.card}
              whileHover={motionConfig.shouldReduceMotion ? {} : { scale: 1.015 }}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={handleCreateNewListTemplate}
              className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-white border border-zinc-200 hover:border-indigo-300 active:border-indigo-400 shadow-2xs hover:shadow-xs transition-all text-left cursor-pointer group min-h-[120px] relative overflow-hidden"
            >
              {/* Top Row: Badge & Ícone */}
              <div className="flex items-center justify-between w-full mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Em Casa
                </span>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <ClipboardList className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
                </div>
              </div>

              {/* Título e Descrição */}
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 group-hover:text-indigo-900 leading-tight transition-colors flex items-center space-x-1">
                  <span>Criar Lista</span>
                  <Plus className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-snug mt-1">
                  Planeje moldes para reutilizar
                </p>
              </div>
            </motion.button>

            {/* Ação 2: Iniciar Compra (Uso Ativo no Mercado) */}
            <motion.button
              whileTap={motionConfig.tap.card}
              whileHover={motionConfig.shouldReduceMotion ? {} : { scale: 1.015 }}
              transition={motionConfig.pressSpring}
              type="button"
              onClick={() => {
                setSelectedListForPurchase(null);
                setIsNewPurchaseModalOpen(true);
              }}
              className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:from-emerald-800 active:to-teal-900 text-white shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/25 transition-all text-left cursor-pointer group min-h-[120px] relative overflow-hidden"
            >
              {/* Top Row: Badge & Ícone */}
              <div className="flex items-center justify-between w-full mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/20 border border-white/25 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  No Mercado
                </span>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 text-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
                </div>
              </div>

              {/* Título e Descrição */}
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight flex items-center space-x-1">
                  <span>Iniciar Compra</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] opacity-90 group-hover:translate-x-0.5 transition-transform" />
                </h3>
                <p className="text-[11px] sm:text-xs text-emerald-100 font-medium leading-snug mt-1">
                  Marque preços e teto de gastos
                </p>
              </div>
            </motion.button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. SEÇÃO: SUAS LISTAS (MOLDES DE PLANEJAMENTO REAPROVEITÁVEIS)             */}
        {/* ========================================================================= */}
        <section className="w-full space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight leading-snug flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Suas Listas</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {lists.length}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">
                Moldes prontos para planejar e reaproveitar
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateNewListTemplate}
              className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200/80 border border-indigo-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer min-h-[32px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Lista</span>
            </button>
          </div>

          {/* Cards das Listas de Molde */}
          {lists.length === 0 ? (
            <div className="w-full bg-white rounded-2xl border border-dashed border-zinc-300 p-5 text-center flex flex-col items-center justify-center shadow-2xs">
              <ClipboardList className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-xs font-bold text-zinc-800">
                Nenhum molde de lista criado
              </p>
              <p className="text-[11px] text-zinc-500 max-w-xs mt-0.5 mb-3">
                Crie listas com os itens que você costuma comprar com frequência para agilizar suas idas ao mercado.
              </p>
              <button
                type="button"
                onClick={handleCreateNewListTemplate}
                className="py-2 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors cursor-pointer min-h-[38px] flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Primeiro Molde</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {lists.map((list) => {
                const itemCount = list.items ? list.items.length : 0;
                return (
                  <div
                    key={list.id}
                    className="w-full bg-white rounded-2xl border border-zinc-200 hover:border-indigo-300 p-3.5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs group"
                  >
                    {/* Top: Nome da Lista e Quantidade de Itens */}
                    <div
                      className="mb-2.5 cursor-pointer"
                      onClick={() => handleOpenListScreen(list.id)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-sm font-bold text-zinc-900 group-hover:text-indigo-900 truncate leading-snug transition-colors">
                          {list.name}
                        </h4>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 shrink-0">
                          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                        </span>
                      </div>

                      {/* Prévia de itens */}
                      <p className="text-[11px] text-zinc-500 line-clamp-1">
                        {itemCount > 0
                          ? list.items.slice(0, 3).map((i) => i.name).join(', ') + (itemCount > 3 ? ` e mais ${itemCount - 3}` : '')
                          : 'Lista sem itens ainda'}
                      </p>
                    </div>

                    {/* Ações da Lista: Iniciar Compra & Ver Molde */}
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => handleOpenListScreen(list.id)}
                        className="w-full py-2 px-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 font-semibold text-xs flex items-center justify-center space-x-1 transition-colors cursor-pointer min-h-[38px]"
                      >
                        <span>Ver Molde</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPurchaseWithList(list)}
                        className="w-full py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-2xs shadow-emerald-700/15 transition-all cursor-pointer min-h-[38px]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Comprar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 3. SEÇÃO: COMPRAS EM ANDAMENTO (NO MERCADO)                                */}
        {/* ========================================================================= */}
        {pendingPurchases.length > 0 && (
          <section className="w-full space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Em Andamento no Mercado ({pendingPurchases.length})</span>
              </span>
            </div>

            <div className="space-y-2">
              {pendingPurchases.map((purchase) => {
                const total = calculatePurchaseTotal(purchase);
                const itemsCount = purchase.items.length;
                const boughtCount = purchase.items.filter((i) => i.bought).length;
                const hasBudget = purchase.budget != null && purchase.budget > 0;
                const budgetExceeded = hasBudget && total > (purchase.budget || 0);

                return (
                  <div
                    key={purchase.id}
                    onClick={() => handleContinuePending(purchase)}
                    className="w-full rounded-2xl bg-white border border-zinc-200 hover:border-emerald-300 p-3.5 sm:p-4 shadow-2xs transition-all hover:shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        {/* Loja / Estabelecimento se houver */}
                        {purchase.storeName && (
                          <div className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 mb-1">
                            <Store className="w-3 h-3" />
                            <span>{purchase.storeName}</span>
                          </div>
                        )}
                        <h4 className="text-sm sm:text-base font-bold text-zinc-900 group-hover:text-emerald-800 transition-colors leading-tight">
                          {purchase.name || 'Compra no Mercado'}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {boughtCount} de {itemsCount} itens no carrinho
                        </p>
                      </div>

                      {/* Total & Orçamento */}
                      <div className="text-right">
                        <p className="text-xs text-zinc-500 font-medium">Subtotal</p>
                        <p className={`text-sm sm:text-base font-extrabold ${budgetExceeded ? 'text-rose-600' : 'text-zinc-900'}`}>
                          {formatCurrencyBRL(total)}
                        </p>
                        {hasBudget && (
                          <p className={`text-[10px] font-bold ${budgetExceeded ? 'text-rose-600 font-extrabold' : 'text-zinc-400'}`}>
                            Teto: {formatCurrencyBRL(purchase.budget!)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Barra de Progresso de Orçamento se configurado */}
                    {hasBudget && (
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full transition-all duration-300 ${
                            budgetExceeded ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (total / (purchase.budget || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    )}

                    {/* Ações: Continuar & Descartar */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContinuePending(purchase);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-2xs shadow-emerald-700/15 transition-all min-h-[42px] cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Continuar Compra</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenDiscardModal(purchase, e)}
                        className="py-2.5 px-3 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-xs transition-colors min-h-[42px] cursor-pointer"
                        title="Descartar compra em andamento"
                        aria-label="Descartar compra"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 4. SEÇÃO: HISTÓRICO DE COMPRAS FINALIZADAS                                  */}
        {/* ========================================================================= */}
        {finishedPurchases.length > 0 && (
          <section className="w-full pt-2 border-t border-zinc-200/80 space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center space-x-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Histórico de Compras</span>
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Resumo dos seus gastos anteriores
                </p>
              </div>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-0.5 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer min-h-[32px]"
                >
                  <span>Ver todas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Card com Total do Mês e Total de Compras */}
            <div className="w-full bg-white rounded-2xl border border-zinc-200 p-3.5 sm:p-4 shadow-2xs">
              <div className="grid grid-cols-2 gap-3 divide-x divide-zinc-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-zinc-500 truncate">
                      Gasto este mês
                    </p>
                    <p className="text-sm sm:text-base font-extrabold text-zinc-900 truncate">
                      {formatCurrencyBRL(currentMonthTotal)}
                    </p>
                  </div>
                </div>

                <div className="pl-3 flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200/80 text-zinc-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-zinc-500 truncate">
                      Finalizadas
                    </p>
                    <p className="text-sm sm:text-base font-extrabold text-zinc-900 truncate">
                      {finishedPurchases.length} {finishedPurchases.length === 1 ? 'compra' : 'compras'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Atalho para a última compra finalizada */}
            {latestFinishedPurchase && (
              <div
                onClick={() => {
                  if (onSelectFinishedPurchase) {
                    onSelectFinishedPurchase(latestFinishedPurchase);
                  }
                }}
                className="w-full bg-white rounded-xl border border-zinc-200 hover:border-emerald-300 p-3 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-xs group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Última compra ({formatDateBRL(latestFinishedPurchase.finishedAt || latestFinishedPurchase.createdAt)})
                    </span>
                    {latestFinishedPurchase.storeName && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                        {latestFinishedPurchase.storeName}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-800 group-hover:text-emerald-800 truncate transition-colors">
                    {latestFinishedPurchase.name || 'Compra no Mercado'}
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    {latestFinishedPurchase.items.length} itens • <span className="font-semibold text-zinc-700">{formatCurrencyBRL(calculatePurchaseTotal(latestFinishedPurchase))}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRepeatLatestPurchase(latestFinishedPurchase);
                  }}
                  title="Criar nova lista com estes itens"
                  className="shrink-0 flex items-center space-x-1.5 py-2 px-3 rounded-xl bg-zinc-100 group-hover:bg-emerald-50 active:bg-emerald-100 text-zinc-700 group-hover:text-emerald-700 border border-zinc-200 group-hover:border-emerald-200 text-xs font-bold transition-all min-h-[38px] cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Repetir</span>
                </button>
              </div>
            )}
          </section>
        )}

      </main>

      {/* Modal: Iniciar Nova Compra (Agile Buyo-inspired flow) */}
      <AnimatePresence>
        {isNewPurchaseModalOpen && (
          <NewPurchaseModal
            isOpen={isNewPurchaseModalOpen}
            lists={lists}
            selectedListId={selectedListForPurchase}
            onClose={() => {
              setIsNewPurchaseModalOpen(false);
              setSelectedListForPurchase(null);
            }}
            onStartPurchase={handleStartPurchaseSession}
          />
        )}
      </AnimatePresence>

      {/* Modal: Confirmar Descarte de Compra Pendente */}
      <AnimatePresence>
        {purchaseToDiscard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPurchaseToDiscard(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden relative"
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
                  <strong className="text-zinc-800">
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
                      {formatCurrencyBRL(calculatePurchaseTotal(purchaseToDiscard))}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPurchaseToDiscard(null)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDiscard}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
