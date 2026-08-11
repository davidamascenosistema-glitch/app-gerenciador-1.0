import React, { useState } from 'react';
import { 
  ShoppingCart, 
  ClipboardList, 
  Receipt, 
  BarChart3, 
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Play,
  Trash2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePurchases } from '../hooks/usePurchases';
import { calculatePurchaseTotal, formatCurrencyBRL } from '../utils/purchaseHelpers';

interface IntentOption {
  id: string;
  lucideIcon: typeof ShoppingCart;
  title: string;
  description: string;
  iconStyle: string;
  isPrimary?: boolean;
  borderColor?: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'in_progress',
    lucideIcon: ShoppingCart,
    title: 'Ir às compras agora',
    description: 'Carrinho em tempo real no mercado',
    iconStyle: 'bg-emerald-600 text-white shadow-xs',
    isPrimary: true
  },
  {
    id: 'planning',
    lucideIcon: ClipboardList,
    title: 'Planejar uma compra',
    description: 'Lista prévia com estimativa de custo',
    iconStyle: 'bg-blue-100 text-blue-700 border border-blue-200/80',
    borderColor: '#1447e6',
  },
  {
    id: 'finished',
    lucideIcon: Receipt,
    title: 'Registrar compra já feita',
    description: 'Lançar comprovante ou nota fiscal',
    iconStyle: 'bg-amber-100 text-amber-800 border border-amber-200/80',
    borderColor: '#973c00',
  },
  {
    id: 'history',
    lucideIcon: BarChart3,
    title: 'Ver histórico e gastos',
    description: 'Resumo de despesas e evolução',
    iconStyle: 'bg-purple-100 text-purple-700 border border-purple-200/80',
    borderColor: '#8200db',
  }
];

interface HomeScreenProps {
  purchasesHook?: ReturnType<typeof usePurchases>;
  onNavigateToPurchase?: (purchaseId: string) => void;
  onNavigateToHistory?: () => void;
}

export function HomeScreen({
  purchasesHook,
  onNavigateToPurchase,
  onNavigateToHistory,
}: HomeScreenProps) {
  const localHook = usePurchases();
  const { getPendingPurchase, discardPendingPurchase, createPurchase } = purchasesHook || localHook;
  const pendingPurchase = getPendingPurchase();

  const [selectedActionMessage, setSelectedActionMessage] = useState<string | null>(null);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [pendingIntentOption, setPendingIntentOption] = useState<IntentOption | null>(null);

  const showFeedbackToast = (msg: string) => {
    setSelectedActionMessage(msg);
    setTimeout(() => {
      setSelectedActionMessage(null);
    }, 3500);
  };

  // Handler for option clicks with interception logic
  const handleIntentClick = (option: IntentOption) => {
    if (option.id === 'in_progress' || option.id === 'planning') {
      // Intercept if clicking "Ir às compras agora" or "Planejar uma compra" and there's a pending purchase
      if (pendingPurchase) {
        setPendingIntentOption(option);
        setIsDiscardModalOpen(true);
        return;
      }

      // Create new purchase
      const isProgress = option.id === 'in_progress';
      const newPurchase = createPurchase({
        name: isProgress ? 'Nova compra' : 'Planejamento de compra',
        status: isProgress ? 'in_progress' : 'planning',
        origin: isProgress ? 'direct' : 'list',
        items: [],
      });

      if (onNavigateToPurchase) {
        onNavigateToPurchase(newPurchase.id);
      } else {
        showFeedbackToast(`Compra criada: "${newPurchase.name}"`);
      }
      return;
    }

    if (option.id === 'finished') {
      const newPurchase = createPurchase({
        name: 'Registro de compra',
        status: 'in_progress',
        origin: 'manual',
        items: [],
      });

      if (onNavigateToPurchase) {
        onNavigateToPurchase(newPurchase.id);
      } else {
        showFeedbackToast(`Registro de compra iniciado`);
      }
      return;
    }

    if (option.id === 'history') {
      if (onNavigateToHistory) {
        onNavigateToHistory();
      } else {
        showFeedbackToast(`Exibindo histórico de compras`);
      }
      return;
    }

    console.log(`Iniciando ação: "${option.title}" (ID: ${option.id})`);
    showFeedbackToast(`Opção selecionada: "${option.title}"`);
  };

  // Handler to continue pending purchase
  const handleContinuePending = () => {
    if (!pendingPurchase) return;
    if (onNavigateToPurchase) {
      onNavigateToPurchase(pendingPurchase.id);
    } else {
      const name = pendingPurchase.name || 'Compra sem nome';
      showFeedbackToast(`Continuando: "${name}" (${pendingPurchase.items.length} itens)`);
    }
  };

  // Handler to open discard modal
  const handleDiscardPending = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!pendingPurchase) return;
    setPendingIntentOption(null);
    setIsDiscardModalOpen(true);
  };

  // Handler to continue pending purchase from modal
  const handleContinueFromModal = () => {
    setIsDiscardModalOpen(false);
    setPendingIntentOption(null);
    handleContinuePending();
  };

  // Handler to confirm discard in modal
  const handleConfirmDiscard = () => {
    if (!pendingPurchase) return;
    const name = pendingPurchase.name || 'Compra sem nome';
    const pendingId = pendingPurchase.id;

    discardPendingPurchase(pendingId);
    setIsDiscardModalOpen(false);

    if (pendingIntentOption) {
      const isProgress = pendingIntentOption.id === 'in_progress';
      const newPurchase = createPurchase({
        name: isProgress ? 'Nova compra' : 'Planejamento de compra',
        status: isProgress ? 'in_progress' : 'planning',
        origin: isProgress ? 'direct' : 'list',
        items: [],
      });

      setPendingIntentOption(null);

      if (onNavigateToPurchase) {
        onNavigateToPurchase(newPurchase.id);
      } else {
        showFeedbackToast(`Compra criada: "${newPurchase.name}"`);
      }
    } else {
      showFeedbackToast(`Compra "${name}" descartada com sucesso.`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
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

          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200/80 text-[11px] font-medium text-zinc-600 shrink-0">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>v2.0</span>
          </div>
        </div>
      </header>

      {/* Main Content Area - Full Width Mobile First */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-4 sm:py-6 flex flex-col justify-center">
        {/* Welcome Header */}
        <div className="mb-4 sm:mb-5">
          <span className="inline-block px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200/80 mb-2">
            O que deseja fazer?
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight leading-snug">
            Selecione uma opção
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm mt-0.5 leading-relaxed">
            Acesse seus fluxos de compras de forma simples e direta.
          </p>
        </div>

        {/* Feedback Toast / Banner */}
        <AnimatePresence>
          {selectedActionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              className="mb-3 p-3 rounded-xl bg-zinc-900 text-white shadow-md flex items-center justify-between border border-zinc-800"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-zinc-400 font-medium leading-none">Aviso:</p>
                  <p className="text-xs font-semibold text-white truncate mt-0.5">{selectedActionMessage}</p>
                </div>
              </div>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono shrink-0 ml-2">
                Console
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PENDING PURCHASE CARD - Amber theme for attention/pending state */}
        <AnimatePresence>
          {pendingPurchase && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -6 }}
              className="mb-4 w-full rounded-2xl bg-amber-50/90 border border-amber-300/80 p-4 shadow-2xs relative overflow-hidden"
            >
              {/* Top Row: Pending Badge + Items Count */}
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/70 text-[11px] font-bold uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                  <span>
                    {pendingPurchase.status === 'in_progress' ? 'Compra em andamento' : 'Compra planejada'}
                  </span>
                </span>

                <span className="text-xs font-semibold text-zinc-700 bg-white/90 px-2 py-0.5 rounded-md border border-amber-200/80">
                  {pendingPurchase.items.length} {pendingPurchase.items.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {/* Purchase Details */}
              <div className="mb-3.5">
                <h3 className="text-base font-extrabold text-zinc-900 tracking-tight leading-tight">
                  {pendingPurchase.name || 'Compra sem nome'}
                </h3>
                <p className="text-xs text-zinc-600 mt-1 flex items-center justify-between font-medium">
                  <span>Total estimado:</span>
                  <span className="font-extrabold text-zinc-900 text-sm sm:text-base">
                    {formatCurrencyBRL(calculatePurchaseTotal(pendingPurchase))}
                  </span>
                </p>
              </div>

              {/* Action Buttons: Continue (Amber) & Discard (Red Destructive) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative z-10">
                {/* Continuar esta compra */}
                <button
                  type="button"
                  onClick={handleContinuePending}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Continuar esta compra</span>
                </button>

                {/* Descartar - Red Destructive */}
                <button
                  type="button"
                  onClick={(e) => handleDiscardPending(e)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs transition-all min-h-[44px] cursor-pointer active:scale-95 relative z-10"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Descartar</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Customizado para Confirmar Descarte / Interceptação de Compra Pendente */}
        <AnimatePresence>
          {isDiscardModalOpen && pendingPurchase && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden"
              >
                <div className="p-5">
                  {pendingIntentOption ? (
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 mb-3 mx-auto">
                      <Clock className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-3 mx-auto">
                      <Trash2 className="w-6 h-6" />
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                    {pendingIntentOption
                      ? 'Já existe uma compra pendente'
                      : 'Descartar compra pendente?'}
                  </h3>
                  <p className="text-xs text-zinc-500 text-center mt-1.5 leading-relaxed">
                    {pendingIntentOption ? (
                      <>
                        Você possui a compra{' '}
                        <strong className="text-zinc-800">
                          "{pendingPurchase.name || 'Compra sem nome'}"
                        </strong>{' '}
                        em andamento. Escolha como deseja prosseguir:
                      </>
                    ) : (
                      <>
                        Deseja realmente descartar a compra{' '}
                        <strong className="text-zinc-800">
                          "{pendingPurchase.name || 'Compra sem nome'}"
                        </strong>
                        ?
                      </>
                    )}
                  </p>

                  <div className="mt-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-zinc-600">
                      <span>Itens adicionados:</span>
                      <span className="font-bold text-zinc-800">
                        {pendingPurchase.items.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-600">
                      <span>Valor estimado:</span>
                      <span className="font-bold text-zinc-800">
                        {formatCurrencyBRL(calculatePurchaseTotal(pendingPurchase))}
                      </span>
                    </div>
                  </div>

                  {pendingIntentOption ? (
                    <div className="mt-5 space-y-2">
                      {/* Ação 1: Continuar compra pendente */}
                      <button
                        type="button"
                        onClick={handleContinueFromModal}
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Continuar compra pendente</span>
                      </button>

                      {/* Ações 2 e 3: Cancelar e Descartar/Criar Nova */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDiscardModalOpen(false);
                            setPendingIntentOption(null);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDiscard}
                          className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Descartar e criar nova</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDiscardModalOpen(false);
                          setPendingIntentOption(null);
                        }}
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
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 4 Intent Buttons - Clean design system */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2.5 sm:gap-3.5 w-full">
          {INTENT_OPTIONS.map((option) => {
            const IconComponent = option.lucideIcon;
            return (
              <motion.button
                key={option.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleIntentClick(option)}
                style={option.borderColor ? { borderColor: option.borderColor } : undefined}
                className={`w-full group relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-white border ${
                  option.isPrimary ? 'border-emerald-200 shadow-2xs hover:border-emerald-400' : 'border-zinc-200/90 shadow-2xs hover:border-zinc-300'
                } active:bg-zinc-100/80 transition-all text-left min-h-[64px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 cursor-pointer`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <span className={`w-10 h-10 rounded-xl ${option.iconStyle} flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors line-clamp-2 break-words">
                      {option.title}
                    </h3>
                    <p className="text-[12px] text-zinc-500 mt-0.5 line-clamp-2 break-words leading-tight">
                      {option.description}
                    </p>
                  </div>
                </div>

                <div className="pl-2 shrink-0">
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200/80 bg-white py-3 mt-4">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 text-center text-[11px] text-zinc-400">
          Gerenciador de Compras &copy; {new Date().getFullYear()} &bull; Mobile First
        </div>
      </footer>
    </div>
  );
}
