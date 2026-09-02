import React, { useState, type ReactNode } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HomeScreen } from './components/HomeScreen';
import { PurchaseScreen } from './components/PurchaseScreen';
import { PurchaseDetailScreen } from './components/PurchaseDetailScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AuthScreen } from './components/AuthScreen';
import { usePurchases } from './hooks/usePurchases';
import { useAuth } from './hooks/useAuth';
import { ToastProvider, useToast } from './components/Toast';
import { PurchaseCelebrationModal } from './components/PurchaseCelebrationModal';
import { BottomNavBar } from './components/BottomNavBar';
import { Purchase } from './types';

/**
 * Conteúdo principal da aplicação envolto pelo ToastProvider e gerenciado por useAuth.
 */
function MainApp() {
  const auth = useAuth();
  const purchasesHook = usePurchases(auth.user?.id);
  const { showToast } = useToast();
  const [activeScreen, setActiveScreen] = useState<'home' | 'history' | 'profile' | 'history_select'>('home');
  const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);
  const [selectedDetailPurchaseId, setSelectedDetailPurchaseId] = useState<string | null>(null);
  const [celebratingPurchase, setCelebratingPurchase] = useState<Purchase | null>(null);

  // 1. Enquanto carrega a sessão do Supabase, exibe splash screen discreto
  if (auth.loading) {
    return (
      <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center p-6 text-zinc-800">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center mb-4 border-2 border-white animate-pulse">
          <ShoppingCart className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="flex items-center space-x-2 text-zinc-600 text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Carregando sessão...</span>
        </div>
      </div>
    );
  }

  // 2. Se o usuário NÃO estiver autenticado, exibe a AuthScreen
  if (!auth.user) {
    return <AuthScreen authHook={auth} />;
  }

  const handleBackFromPurchase = (message?: string) => {
    purchasesHook.cleanUpEmptyPurchases();
    setActivePurchaseId(null);
    if (typeof message === 'string' && message.trim().length > 0) {
      showToast(message);
    }
  };

  const activePurchase = activePurchaseId
    ? purchasesHook.getPurchaseById(activePurchaseId)
    : null;

  const selectedDetailPurchase = selectedDetailPurchaseId
    ? purchasesHook.getPurchaseById(selectedDetailPurchaseId)
    : null;

  const handleCreateNewList = () => {
    const newPurchase = purchasesHook.createPurchase({
      name: 'Planejamento de compra',
      status: 'pending',
      origin: 'list',
      items: [],
    });
    setActivePurchaseId(newPurchase.id);
  };

  const handleRegisterManual = () => {
    const newPurchase = purchasesHook.createPurchase({
      name: 'Registro de compra',
      status: 'pending',
      origin: 'manual',
      items: [],
    });
    setActivePurchaseId(newPurchase.id);
  };

  const handleStartRepeatPurchase = () => {
    setActiveScreen('history_select');
  };

  const handleSelectPurchaseToRepeat = (originalPurchase: Purchase) => {
    const newPurchase = purchasesHook.createPurchaseFromTemplate(originalPurchase);
    showToast(`Lista criada a partir de "${originalPurchase.name || 'Compra Anterior'}"`);
    setActiveScreen('home');
    setSelectedDetailPurchaseId(null);
    setActivePurchaseId(newPurchase.id);
  };

  const handleFinishPurchase = (purchaseId: string, customName?: string) => {
    const current = purchasesHook.getPurchaseById(purchaseId);
    purchasesHook.finishPurchase(purchaseId);
    if (current) {
      setCelebratingPurchase({
        ...current,
        name: customName || current.name,
        status: 'finished',
        finishedAt: new Date().toISOString(),
      });
    }
    setActivePurchaseId(null);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setActiveScreen('home');
    setActivePurchaseId(null);
    setSelectedDetailPurchaseId(null);
    showToast('Sessão encerrada com sucesso.');
  };

  // Determinar a tela ativa e chave de transição
  let screenKey = 'home';
  let content: React.ReactNode = null;

  // Se uma compra finalizada foi selecionada no histórico, exibe a tela de detalhes somente leitura
  if (selectedDetailPurchase && selectedDetailPurchase.status === 'finished') {
    screenKey = `detail-${selectedDetailPurchase.id}`;
    content = (
      <PurchaseDetailScreen
        purchase={selectedDetailPurchase}
        onBack={() => setSelectedDetailPurchaseId(null)}
        onRepeatPurchase={handleSelectPurchaseToRepeat}
      />
    );
  } else if (activePurchase && activePurchase.status === 'pending') {
    // A PurchaseScreen normal (edição) é usada EXCLUSIVAMENTE para compras com status 'pending'
    screenKey = `purchase-${activePurchase.id}`;
    content = (
      <PurchaseScreen
        userId={auth.user?.id}
        purchase={activePurchase}
        allPurchases={purchasesHook.purchases}
        onBack={handleBackFromPurchase}
        onDiscardPurchase={(id) => {
          purchasesHook.discardPurchase(id);
          setActivePurchaseId(null);
        }}
        onUpdateName={purchasesHook.updatePurchaseName}
        onAddItem={purchasesHook.addItemToPurchase}
        onEditItem={purchasesHook.editItemInPurchase}
        onRemoveItem={purchasesHook.removeItemFromPurchase}
        onToggleBought={purchasesHook.toggleItemBought}
        onFinishPurchase={handleFinishPurchase}
      />
    );
  } else if (activeScreen === 'history_select') {
    screenKey = 'history_select';
    content = (
      <HistoryScreen
        selectionMode={true}
        finishedPurchases={purchasesHook.getFinishedPurchases()}
        onBack={() => setActiveScreen('home')}
        onSelectPurchase={handleSelectPurchaseToRepeat}
      />
    );
  } else if (activeScreen === 'history') {
    screenKey = 'history';
    content = (
      <HistoryScreen
        finishedPurchases={purchasesHook.getFinishedPurchases()}
        onBack={() => setActiveScreen('home')}
        onNavigateToHome={() => setActiveScreen('home')}
        onSelectPurchase={(purchase) => setSelectedDetailPurchaseId(purchase.id)}
        onNavigateToProfile={() => setActiveScreen('profile')}
        onCreateNewList={handleCreateNewList}
        onRegisterManual={handleRegisterManual}
        onRepeatPurchase={handleStartRepeatPurchase}
      />
    );
  } else if (activeScreen === 'profile') {
    screenKey = 'profile';
    content = (
      <ProfileScreen
        user={auth.user}
        onSignOut={handleSignOut}
        onBack={() => setActiveScreen('home')}
        onNavigateToHome={() => setActiveScreen('home')}
        onNavigateToHistory={() => setActiveScreen('history')}
        onCreateNewList={handleCreateNewList}
        onRegisterManual={handleRegisterManual}
        onRepeatPurchase={handleStartRepeatPurchase}
      />
    );
  } else {
    screenKey = 'home';
    content = (
      <HomeScreen
        purchasesHook={purchasesHook}
        onNavigateToPurchase={(id) => {
          setActivePurchaseId(id);
        }}
        onNavigateToHistory={() => {
          setActiveScreen('history');
        }}
        onNavigateToProfile={() => {
          setActiveScreen('profile');
        }}
        onRepeatPurchase={handleStartRepeatPurchase}
        onSelectFinishedPurchase={(purchase) => {
          setSelectedDetailPurchaseId(purchase.id);
        }}
      />
    );
  }

  // Definir se a barra de navegação inferior deve estar visível
  const isEditingPurchase = Boolean(activePurchase && activePurchase.status === 'pending');
  const isViewingDetail = Boolean(selectedDetailPurchase && selectedDetailPurchase.status === 'finished');
  const isSelectingHistory = activeScreen === 'history_select';
  const showBottomNav = !isEditingPurchase && !isViewingDetail && !isSelectingHistory;

  return (
    <div className="w-full min-h-screen bg-zinc-50 text-zinc-900 flex flex-col relative overflow-x-clip">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screenKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="w-full flex-1 flex flex-col"
        >
          {content}
        </motion.div>
      </AnimatePresence>

      {/* Barra de Navegação Fixa Inferior Persistente - Não desmonta entre Início, Histórico e Perfil */}
      <AnimatePresence>
        {showBottomNav && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <BottomNavBar
              currentScreen={activeScreen === 'history' ? 'history' : activeScreen === 'profile' ? 'profile' : 'home'}
              onNavigateToHome={() => setActiveScreen('home')}
              onNavigateToHistory={() => setActiveScreen('history')}
              onNavigateToProfile={() => setActiveScreen('profile')}
              onCreateNewList={handleCreateNewList}
              onRegisterManual={handleRegisterManual}
              onRepeatPurchase={handleStartRepeatPurchase}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Celebração Especial de Compra Finalizada */}
      <AnimatePresence>
        {celebratingPurchase && (
          <PurchaseCelebrationModal
            isOpen={!!celebratingPurchase}
            purchase={celebratingPurchase}
            allPurchases={purchasesHook.purchases}
            onClose={() => setCelebratingPurchase(null)}
            onViewDetails={(p) => {
              setCelebratingPurchase(null);
              setSelectedDetailPurchaseId(p.id);
            }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}



