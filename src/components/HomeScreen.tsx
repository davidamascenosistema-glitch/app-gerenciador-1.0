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
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePurchases } from '../hooks/usePurchases';
import { calculatePurchaseTotal, formatCurrencyBRL, formatDateBRL } from '../utils/purchaseHelpers';
import { Purchase } from '../types';
import { useToast } from './Toast';

interface HomeScreenProps {
  purchasesHook?: ReturnType<typeof usePurchases>;
  onNavigateToPurchase?: (purchaseId: string) => void;
  onNavigateToHistory?: () => void;
  onNavigateToProfile?: () => void;
  onRepeatPurchase?: () => void;
  onSelectFinishedPurchase?: (purchase: Purchase) => void;
  initialToastMessage?: string;
}

export function HomeScreen({
  purchasesHook,
  onNavigateToPurchase,
  onNavigateToHistory,
  onNavigateToProfile,
  onRepeatPurchase,
  onSelectFinishedPurchase,
  initialToastMessage,
}: HomeScreenProps) {
  const localHook = usePurchases();
  const hook = purchasesHook || localHook;
  const { getPendingPurchases, getFinishedPurchases, discardPurchase, createPurchase, createPurchaseFromTemplate } = hook;
  
  const pendingPurchases = (getPendingPurchases() || []).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const finishedPurchases = getFinishedPurchases() || [];
  const latestFinishedPurchase = finishedPurchases.length > 0 ? finishedPurchases[0] : null;

  // Cálculo de gastos do mês atual
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

  const { showToast } = useToast();

  const [purchaseToDiscard, setPurchaseToDiscard] = useState<Purchase | null>(null);

  React.useEffect(() => {
    if (initialToastMessage) {
      showToast(initialToastMessage);
    }
  }, [initialToastMessage, showToast]);

  // Handler for creating a new list directly
  const handleCreateNewList = () => {
    const newPurchase = createPurchase({
      name: 'Planejamento de compra',
      status: 'pending',
      origin: 'list',
      items: [],
    });

    if (onNavigateToPurchase) {
      onNavigateToPurchase(newPurchase.id);
    } else {
      showToast(`Lista criada: "${newPurchase.name}"`);
    }
  };

  // Handler for registering manual purchase retroactively
  const handleRegisterManual = () => {
    const newPurchase = createPurchase({
      name: 'Registro de compra',
      status: 'pending',
      origin: 'manual',
      items: [],
    });

    if (onNavigateToPurchase) {
      onNavigateToPurchase(newPurchase.id);
    } else {
      showToast(`Registro de compra iniciado`);
    }
  };

  // Handler to repeat the latest purchase
  const handleRepeatLatestPurchase = (template: Purchase) => {
    const newPurchase = createPurchaseFromTemplate(template);
    showToast(`Lista criada a partir de "${template.name || 'Última compra'}"`);
    if (onNavigateToPurchase) {
      onNavigateToPurchase(newPurchase.id);
    }
  };

  // Handler to continue a specific pending purchase
  const handleContinuePending = (purchase: Purchase) => {
    if (onNavigateToPurchase) {
      onNavigateToPurchase(purchase.id);
    } else {
      const name = purchase.name || 'Compra sem nome';
      showToast(`Continuando: "${name}" (${purchase.items.length} itens)`);
    }
  };

  // Handler to open discard modal for a specific purchase
  const handleOpenDiscardModal = (purchase: Purchase, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPurchaseToDiscard(purchase);
  };

  // Handler to confirm discard in modal
  const handleConfirmDiscard = () => {
    if (!purchaseToDiscard) return;
    const name = purchaseToDiscard.name || 'Compra sem nome';
    const pendingId = purchaseToDiscard.id;

    discardPurchase(pendingId);
    setPurchaseToDiscard(null);
    showToast(`Compra "${name}" descartada com sucesso.`);
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
                Gerenciador de Compras
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-none mt-0.5">
                Organize e controle seus gastos
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

      {/* Main Content Area - with optimized top spacing and generous bottom padding for the fixed BottomNavBar */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 pt-3 sm:pt-4 pb-28 sm:pb-32 flex flex-col space-y-4 sm:space-y-5">
        {/* Section: Listas & Planejamento */}
        <section className="w-full">
          {/* Section Header */}
          <div className="mb-2.5 sm:mb-3">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight leading-snug">
              Listas & Planejamento
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 leading-normal">
              Suas listas de compras
            </p>
          </div>

          {/* 1. AÇÃO EM DESTAQUE (HERO ACTION) - BASEADO NA QUANTIDADE DE COMPRAS PENDENTES */}
          <div className="w-full">
            {pendingPurchases.length === 0 ? (
              /* CENÁRIO 1: 0 PENDÊNCIAS -> Card Completo de Estado Vazio */
              <motion.div
                key="empty-pending-card"
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 text-center flex flex-col items-center justify-center shadow-2xs"
              >
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-2xs">
                  <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 mb-1">
                  Nenhuma lista pendente
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mb-4">
                  Comece uma nova lista para planejar ou organizar sua próxima compra
                </p>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={handleCreateNewList}
                  type="button"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all min-h-[48px] cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                  <span>Criar Nova Lista</span>
                </motion.button>
              </motion.div>
            ) : pendingPurchases.length === 1 ? (
              /* CENÁRIO 2: EXATAMENTE 1 PENDÊNCIA -> Card Grande em Estilo Neutro */
              <motion.div
                key="single-pending-section"
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="space-y-2.5 w-full"
              >
                {(() => {
                  const singlePending = pendingPurchases[0];
                  return (
                    <div
                      onClick={() => handleContinuePending(singlePending)}
                      className="w-full rounded-2xl bg-white border border-zinc-200 hover:border-emerald-300 active:border-emerald-400 p-4 sm:p-5 shadow-2xs relative overflow-hidden cursor-pointer transition-all hover:shadow-xs group"
                    >
                      {/* Top Row: Badge Neutro c/ Toque Âmbar Sutil + Items Count */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 text-amber-700 border border-zinc-200 text-[11px] font-bold uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>Lista pendente</span>
                        </span>

                        <span className="text-xs font-semibold text-zinc-600 bg-zinc-50 px-2.5 py-0.5 rounded-md border border-zinc-200">
                          {singlePending.items.length} {singlePending.items.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>

                      {/* Purchase Details */}
                      <div className="mb-3.5">
                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 group-hover:text-emerald-800 tracking-tight leading-tight transition-colors">
                          {singlePending.name || 'Compra sem nome'}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 flex items-center justify-between font-medium">
                          <span>Total estimado:</span>
                          <span className="font-extrabold text-zinc-900 text-sm sm:text-base">
                            {formatCurrencyBRL(calculatePurchaseTotal(singlePending))}
                          </span>
                        </p>
                      </div>

                      {/* Action Buttons: Continue (Emerald) & Discard (White/Red) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative z-10">
                        {/* Continuar esta compra - Verde Esmeralda Primário */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContinuePending(singlePending);
                          }}
                          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-2xs shadow-emerald-700/15 transition-all min-h-[44px] cursor-pointer active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Continuar esta compra</span>
                        </button>

                        {/* Descartar */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenDiscardModal(singlePending, e)}
                          className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs sm:text-sm transition-all min-h-[44px] cursor-pointer active:scale-95 relative z-10"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                          <span>Descartar</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Botão para criar nova lista mesmo quando já existe uma pendência */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateNewList}
                  type="button"
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 border border-zinc-200 font-bold text-xs sm:text-sm transition-all min-h-[44px] shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Criar outra lista</span>
                </motion.button>
              </motion.div>
            ) : (
              /* CENÁRIO 3: 2 OU MAIS PENDÊNCIAS -> Cards Compactos em Estilo Neutro */
              <motion.div
                key="multiple-pending-section"
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="space-y-2.5 w-full"
              >
                {/* Header da lista de compras pendentes com botão de nova lista */}
                <div className="flex items-center justify-between px-0.5 mb-1">
                  <span className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>Listas Pendentes ({pendingPurchases.length})</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCreateNewList}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200/80 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Lista</span>
                  </button>
                </div>

                {/* Lista Vertical de Cards Compactos Neutros */}
                <div className="space-y-2">
                  {pendingPurchases.map((purchase) => {
                    const total = calculatePurchaseTotal(purchase);
                    const itemsCount = purchase.items.length;
                    return (
                      <div
                        key={purchase.id}
                        onClick={() => handleContinuePending(purchase)}
                        className="w-full rounded-xl bg-white border border-zinc-200 hover:border-emerald-300 active:border-emerald-400 p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2.5 transition-all hover:shadow-xs cursor-pointer group"
                      >
                        {/* Lado Esquerdo: Detalhes Enxutos */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-0.5">
                            <span className="text-[11px] font-semibold text-zinc-500">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-zinc-900 group-hover:text-emerald-800 truncate leading-snug transition-colors">
                            {purchase.name || 'Compra sem nome'}
                          </h4>

                          <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            Total: <strong className="text-zinc-900 font-extrabold">{formatCurrencyBRL(total)}</strong>
                          </p>
                        </div>

                        {/* Lado Direito: Dois Botões de Ícones (Continuar Verde Esmeralda e Descartar) */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          {/* Continuar (Play Verde Esmeralda) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContinuePending(purchase);
                            }}
                            title="Continuar esta compra"
                            aria-label={`Continuar compra ${purchase.name || ''}`}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shadow-2xs shadow-emerald-700/15 transition-all min-h-[44px] min-w-[44px] cursor-pointer active:scale-95"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </button>

                          {/* Descartar (Trash Vermelho Suave) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenDiscardModal(purchase, e)}
                            title="Descartar esta compra"
                            aria-label={`Descartar compra ${purchase.name || ''}`}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-all min-h-[44px] min-w-[44px] cursor-pointer active:scale-95"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* PARTE B: SEÇÃO COMPACTA DE RESUMO E ATALHO QUANDO HOUVER HISTÓRICO DE COMPRAS FINALIZADAS */}
        {finishedPurchases.length > 0 && (
          <section className="w-full pt-1 border-t border-zinc-200/70 space-y-3">
            {/* Header da Seção de Resumo com link para o histórico */}
            <div className="flex items-center justify-between px-0.5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                  Resumo de Gastos
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Dados das suas compras finalizadas
                </p>
              </div>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-0.5 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer min-h-[32px]"
                >
                  <span>Ver histórico</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Card Compacto com Gastos do Mês e Total de Compras */}
            <div className="w-full bg-white rounded-2xl border border-zinc-200 p-3.5 sm:p-4 shadow-2xs">
              <div className="grid grid-cols-2 gap-3 divide-x divide-zinc-100">
                {/* Total Gasto este mês */}
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

                {/* Compras Finalizadas */}
                <div className="pl-3 flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200/80 text-zinc-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-zinc-500 truncate">
                      Compras feitas
                    </p>
                    <p className="text-sm sm:text-base font-extrabold text-zinc-900 truncate">
                      {finishedPurchases.length} {finishedPurchases.length === 1 ? 'finalizada' : 'finalizadas'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Atalho Rápido para a Última Compra Finalizada com Botão "Repetir" */}
            {latestFinishedPurchase && (
              <div
                onClick={() => {
                  if (onSelectFinishedPurchase) {
                    onSelectFinishedPurchase(latestFinishedPurchase);
                  }
                }}
                className="w-full bg-white rounded-xl border border-zinc-200 hover:border-emerald-300 active:border-emerald-400 p-3 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-xs group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Última compra ({formatDateBRL(latestFinishedPurchase.finishedAt || latestFinishedPurchase.createdAt)})
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-800 group-hover:text-emerald-800 truncate transition-colors">
                    {latestFinishedPurchase.name || 'Compra sem nome'}
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

        {/* Modal Customizado para Confirmar Descarte de Compra Pendente Específica */}
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
                {/* Botão Fechar (X) no canto superior direito: apenas fecha o modal sem descartar */}
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
                    Descartar compra pendente?
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
                      <span>Confirmar Descarte</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}


