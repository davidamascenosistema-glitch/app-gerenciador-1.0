import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { PurchaseScreen } from './components/PurchaseScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { usePurchases } from './hooks/usePurchases';

/**
 * Componente principal da aplicação.
 * Responsável apenas pela orquestração das telas (roteamento/navegação simples),
 * mantendo-se enxuto e livre de lógicas de negócio ou cálculos.
 */
export default function App() {
  const purchasesHook = usePurchases();
  const [activeScreen, setActiveScreen] = useState<'home' | 'history'>('home');
  const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);

  const activePurchase = activePurchaseId
    ? purchasesHook.getPurchaseById(activePurchaseId)
    : null;

  if (activePurchase) {
    return (
      <PurchaseScreen
        purchase={activePurchase}
        allPurchases={purchasesHook.purchases}
        onBack={() => setActivePurchaseId(null)}
        onUpdateName={purchasesHook.updatePurchaseName}
        onAddItem={purchasesHook.addItemToPurchase}
        onEditItem={purchasesHook.editItemInPurchase}
        onRemoveItem={purchasesHook.removeItemFromPurchase}
        onToggleBought={purchasesHook.toggleItemBought}
        onFinishPurchase={purchasesHook.finishPurchase}
      />
    );
  }

  if (activeScreen === 'history') {
    return (
      <HistoryScreen
        finishedPurchases={purchasesHook.getFinishedPurchases()}
        onBack={() => setActiveScreen('home')}
        onSelectPurchase={(id) => setActivePurchaseId(id)}
      />
    );
  }

  return (
    <HomeScreen
      purchasesHook={purchasesHook}
      onNavigateToPurchase={(id) => setActivePurchaseId(id)}
      onNavigateToHistory={() => setActiveScreen('history')}
    />
  );
}
