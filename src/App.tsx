import { useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { HomeScreen } from './components/HomeScreen';
import { PurchaseScreen } from './components/PurchaseScreen';
import { PurchaseDetailScreen } from './components/PurchaseDetailScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AuthScreen } from './components/AuthScreen';
import { usePurchases } from './hooks/usePurchases';
import { useAuth } from './hooks/useAuth';
import { ToastProvider, useToast } from './components/Toast';
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

  const handleSignOut = async () => {
    await auth.signOut();
    setActiveScreen('home');
    setActivePurchaseId(null);
    setSelectedDetailPurchaseId(null);
    showToast('Sessão encerrada com sucesso.');
  };

  // Se uma compra finalizada foi selecionada no histórico, exibe a tela de detalhes somente leitura
  if (selectedDetailPurchase && selectedDetailPurchase.status === 'finished') {
    return (
      <PurchaseDetailScreen
        purchase={selectedDetailPurchase}
        onBack={() => setSelectedDetailPurchaseId(null)}
        onRepeatPurchase={handleSelectPurchaseToRepeat}
      />
    );
  }

  // A PurchaseScreen normal (edição) é usada EXCLUSIVAMENTE para compras com status 'pending'
  if (activePurchase && activePurchase.status === 'pending') {
    return (
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
        onFinishPurchase={purchasesHook.finishPurchase}
      />
    );
  }

  if (activeScreen === 'history_select') {
    return (
      <HistoryScreen
        selectionMode={true}
        finishedPurchases={purchasesHook.getFinishedPurchases()}
        onBack={() => setActiveScreen('home')}
        onSelectPurchase={handleSelectPurchaseToRepeat}
      />
    );
  }

  if (activeScreen === 'history') {
    return (
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
  }

  if (activeScreen === 'profile') {
    return (
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
  }

  return (
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

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}



