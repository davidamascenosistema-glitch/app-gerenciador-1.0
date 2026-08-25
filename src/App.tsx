import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { PurchaseScreen } from './components/PurchaseScreen';
import { PurchaseDetailScreen } from './components/PurchaseDetailScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { usePurchases } from './hooks/usePurchases';
import { ToastProvider, useToast } from './components/Toast';
import { Purchase } from './types';

/**
 * Conteúdo principal da aplicação envolto pelo ToastProvider.
 */
function MainApp() {
  const purchasesHook = usePurchases();
  const { showToast } = useToast();
  const [activeScreen, setActiveScreen] = useState<'home' | 'history' | 'profile' | 'history_select'>('home');
  const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);
  const [selectedDetailPurchaseId, setSelectedDetailPurchaseId] = useState<string | null>(null);

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


