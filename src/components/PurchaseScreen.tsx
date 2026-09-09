import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Check,
  Pencil,
  Trash2,
  ShoppingBag,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  Package,
  Layers,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Camera,
  RotateCcw,
  Upload,
  Receipt,
  Loader2,
  CheckSquare,
  Square,
  MoreVertical,
  Share2,
  Bookmark,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, Purchase, ItemSuggestion, PricingModeDefault } from '../types';
import { parseReceiptImage, ExtractedReceiptItem } from '../services/geminiService';
import { normalizeText } from '../services/suggestionsService';
import { useItemSuggestions } from '../hooks/useItemSuggestions';
import { ItemSearchBar } from './ItemSearchBar';
import { PurchaseItemCard } from './PurchaseItemCard';
import { BatchAddModal } from './BatchAddModal';
import { EditItemModal } from './EditItemModal';
import { AnimatedCurrency } from './AnimatedCurrency';
import { MOTION_TOKENS, MOTION_VARIANTS, useMotionConfig } from '../styles/motionSystem';
import {
  calculateItemSubtotal,
  calculatePurchaseTotal,
  formatCurrencyBRL,
  parseBatchItemsInput,
  calculateComparisonInsight,
  exportPurchaseAsTxt,
  generatePurchaseExportText,
  isDefaultPurchaseName,
  ITEM_CATEGORIES,
  resolvePricingMode,
  groupItemsByCategory,
  CategorySection,
} from '../utils/purchaseHelpers';
import { useToast } from './Toast';

const getCategoryBadgeStyle = (category: string) => {
  switch (category) {
    case 'Alimentos':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200/80';
    case 'Bebidas':
      return 'bg-blue-100 text-blue-800 border-blue-200/80';
    case 'Limpeza':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200/80';
    case 'Higiene':
      return 'bg-purple-100 text-purple-800 border-purple-200/80';
    case 'Açougue':
      return 'bg-rose-100 text-rose-800 border-rose-200/80';
    case 'Frutas/Legumes':
      return 'bg-lime-100 text-lime-800 border-lime-200/80';
    case 'Frios':
      return 'bg-orange-100 text-orange-800 border-orange-200/80';
    case 'Padaria':
      return 'bg-amber-100 text-amber-800 border-amber-200/80';
    case 'Hortifruti':
      return 'bg-teal-100 text-teal-800 border-teal-200/80';
    case 'Geral':
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200/80';
  }
};

const getCategoryAccentBarClass = (category: string) => {
  switch (category) {
    case 'Alimentos': return 'bg-emerald-400';
    case 'Bebidas': return 'bg-blue-400';
    case 'Limpeza': return 'bg-cyan-400';
    case 'Higiene': return 'bg-purple-400';
    case 'Açougue': return 'bg-rose-400';
    case 'Frutas/Legumes': return 'bg-lime-400';
    case 'Frios': return 'bg-orange-400';
    case 'Padaria': return 'bg-amber-400';
    case 'Hortifruti': return 'bg-teal-400';
    case 'Geral':
    default: return 'bg-zinc-400';
  }
};

interface PurchaseScreenProps {
  userId?: string | null;
  purchase: Purchase;
  allPurchases?: Purchase[];
  onBack: (message?: string) => void;
  onDiscardPurchase?: (purchaseId: string) => void;
  onUpdateName: (purchaseId: string, name: string) => void;
  onAddItem: (purchaseId: string, itemData: Omit<Item, 'id' | 'bought'> & { bought?: boolean }) => void;
  onEditItem: (purchaseId: string, itemId: string, updatedData: Partial<Omit<Item, 'id'>>) => void;
  onRemoveItem: (purchaseId: string, itemId: string) => void;
  onToggleBought: (purchaseId: string, itemId: string) => void;
  onFinishPurchase?: (purchaseId: string, customName?: string) => void;
}

export function PurchaseScreen({
  userId,
  purchase,
  allPurchases = [],
  onBack,
  onDiscardPurchase,
  onUpdateName,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onToggleBought,
  onFinishPurchase,
}: PurchaseScreenProps) {
  const motionConfig = useMotionConfig();
  const suggestionsHook = useItemSuggestions(userId, allPurchases);
  const selectedFromSuggestionRef = useRef<boolean>(false);

  const [titleValue, setTitleValue] = useState(() =>
    isDefaultPurchaseName(purchase.name) ? '' : (purchase.name || '')
  );

  useEffect(() => {
    setTitleValue(isDefaultPurchaseName(purchase.name) ? '' : (purchase.name || ''));
  }, [purchase.name, purchase.id]);

  // Back confirmation modal state
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [backNameInput, setBackNameInput] = useState('');
  const [isDiscardManualModalOpen, setIsDiscardManualModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  // Naming modal state (for 3+ items with default name on back click or Guardar Lista)
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [namingInput, setNamingInput] = useState('');

  // Finish purchase modal states
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);
  const [finishNameInput, setFinishNameInput] = useState('');

  // Modais de Adicionar em Lote e Edição Completa
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Toast feedback hook
  const { showToast } = useToast();

  // Receipt Photo & Mode State (for origin === 'manual')
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [registrationMode, setRegistrationMode] = useState<'choose' | 'manual' | 'photo'>(
    purchase.origin === 'manual' && (!purchase.items || purchase.items.length === 0) ? 'choose' : 'manual'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Multi-Selection Filter State
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<string[]>([]);

  const toggleCategoryFilter = (category: string) => {
    setActiveCategoryFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const [collapsedSections, setCollapsedSections] = useState<string[]>([]); // vazio = tudo aberto

  const toggleSectionCollapse = (category: string) => {
    setCollapsedSections((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Receipt AI Analysis State
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedReceiptItem[]>([]);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isReviewingReceipt, setIsReviewingReceipt] = useState(false);

  // Header 3-dots Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Auto-fechar o menu de 3 pontinhos ao rolar a página, redimensionar a tela ou pressionar Escape
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleScrollOrResize = () => {
      setIsMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    // Usar capture: true para detectar qualquer evento de scroll na janela ou em containers filhos
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('touchmove', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('touchmove', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Floating Action Button Speed Dial Menu State
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const showFeedbackToast = (msg: string) => {
    showToast(msg);
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('Lista copiada para a área de transferência!');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Lista copiada para a área de transferência!');
      }
    } catch (err) {
      console.error('Falha ao copiar texto:', err);
      showToast('Não foi possível copiar a lista');
    }
  };

  const handleExportPurchase = () => {
    setIsMenuOpen(false);
    if (!purchase.items || purchase.items.length === 0) {
      showFeedbackToast('Sua compra ainda não possui itens para exportar');
      return;
    }
    exportPurchaseAsTxt(purchase);
    showFeedbackToast('Lista de compras exportada (.txt)');
  };

  const handleSharePurchase = async () => {
    setIsMenuOpen(false);
    if (!purchase.items || purchase.items.length === 0) {
      showFeedbackToast('Sua compra ainda não possui itens para compartilhar');
      return;
    }

    const shareText = generatePurchaseExportText(purchase);
    const shareTitle = purchase.name || 'Lista de Compras';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        showFeedbackToast('Lista compartilhada com sucesso!');
      } catch (err: any) {
        // Se o usuário não cancelou a janela, copia para a área de transferência
        if (err.name !== 'AbortError') {
          await copyToClipboard(shareText);
        }
      }
    } else {
      await copyToClipboard(shareText);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
        setReceiptError(null);
        showFeedbackToast('Foto da nota fiscal capturada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerCamera = () => {
    setReceiptError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleAnalyzeReceipt = async () => {
    if (!receiptImage) return;

    setIsAnalyzingReceipt(true);
    setReceiptError(null);

    try {
      const items = await parseReceiptImage(receiptImage);
      if (items.length === 0) {
        setReceiptError(
          'Não foi possível identificar nenhum item na foto. A nota fiscal pode estar borrada, pouco iluminada ou ilegível.'
        );
      } else {
        setExtractedItems(items);
        setIsReviewingReceipt(true);
      }
    } catch (err: any) {
      console.error('Erro na análise da nota:', err);
      setReceiptError(
        err.message || 'Ocorreu uma falha ao tentar ler a nota fiscal. Tente tirar outra foto ou prossiga manualmente.'
      );
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  const handleToggleExtractedItem = (id: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleAllExtractedItems = (selectAll: boolean) => {
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected: selectAll })));
  };

  const handleUpdateExtractedItemName = (id: string, newName: string) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    );
  };

  const handleUpdateExtractedItemQuantity = (id: string, delta: number) => {
    setExtractedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleUpdateExtractedItemPrice = (id: string, newPrice: number) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: Math.max(0, newPrice) } : item))
    );
  };

  const handleRemoveExtractedItem = (id: string) => {
    setExtractedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddManualExtractedItem = () => {
    const newItem: ExtractedReceiptItem = {
      id: `extracted-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      quantity: 1,
      price: 0,
      selected: true,
    };
    setExtractedItems((prev) => [...prev, newItem]);
  };

  const handleConfirmExtractedItems = () => {
    const selectedItems = extractedItems.filter(
      (item) => item.selected && item.name.trim().length > 0
    );

    if (selectedItems.length === 0) {
      showFeedbackToast('Marque pelo menos 1 item válido para adicionar.');
      return;
    }

    selectedItems.forEach((item) => {
      onAddItem(purchase.id, {
        name: item.name.trim(),
        category: 'Geral',
        quantity: item.quantity,
        price: item.price,
        isWeighted: false,
        bought: true,
      });
    });

    showFeedbackToast(`${selectedItems.length} item(ns) importado(s) da nota fiscal com sucesso!`);
    setIsReviewingReceipt(false);
    setExtractedItems([]);
    setReceiptImage(null);
    setRegistrationMode('manual');
  };

  const handleCancelReceiptReview = () => {
    setIsReviewingReceipt(false);
    setExtractedItems([]);
  };

  // Save Title Handle
  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed) {
      setTitleValue(trimmed);
      onUpdateName(purchase.id, trimmed);
    } else {
      // Se estiver vazio, mantém o nome padrão da compra e deixa o placeholder visível
      setTitleValue('');
    }
  };

  // Adição direta vinda da ItemSearchBar
  const handleAddItemFromSearch = (
    name: string,
    category: string = 'Geral',
    isWeighted: boolean = false,
    pricingModeSource?: PricingModeDefault | null
  ) => {
    const cleanName = normalizeText(name);
    const existingItem = (purchase.items || []).find(
      (item) => normalizeText(item.name) === cleanName
    );

    if (existingItem) {
      if (existingItem.isWeighted) {
        const currentWeight = existingItem.weight ?? existingItem.quantity ?? 1;
        const newWeight = Math.round((currentWeight + 1) * 1000) / 1000;
        onEditItem(purchase.id, existingItem.id, { weight: newWeight });
        showFeedbackToast(`"${existingItem.name}" +1kg (Total: ${newWeight.toString().replace('.', ',')} kg)`);
      } else {
        const currentQty = (existingItem.quantity || 1) + 1;
        onEditItem(purchase.id, existingItem.id, { quantity: currentQty });
        showFeedbackToast(`"${existingItem.name}" +1 un (Total: ${currentQty})`);
      }
      return;
    }

    onAddItem(purchase.id, {
      name,
      category,
      isWeighted,
      pricingModeSource,
      quantity: 1,
      price: undefined,
      bought: purchase.origin === 'manual' ? true : false,
    });
    showFeedbackToast(`"${name}" adicionado à lista`);
  };

  // Abrir Modal de Edição Completa
  const handleOpenFullEdit = (item: Item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // Salvar Modal de Edição Completa
  const handleSaveFullEdit = (itemId: string, updates: Partial<Item>) => {
    onEditItem(purchase.id, itemId, updates);
    showFeedbackToast(`"${updates.name || 'Item'}" atualizado`);
  };

  // Submissão do Modal de Adicionar em Lote
  const handleSubmitBatch = (batchText: string) => {
    const parsed = parseBatchItemsInput(batchText);
    if (parsed.length === 0) return;

    parsed.forEach((item) => {
      onAddItem(purchase.id, {
        ...item,
        bought: purchase.origin === 'manual' ? true : false,
      });
    });

    showToast(`${parsed.length} ${parsed.length === 1 ? 'item adicionado' : 'itens adicionados'} à lista`);
  };

  const alreadyAddedNames = (purchase.items || []).map((i) => i.name);
  const availableSuggestions = suggestionsHook.getQuickSuggestions(alreadyAddedNames, 6);

  const handleAddQuickSuggestion = (suggestion: ItemSuggestion) => {
    const cleanName = normalizeText(suggestion.name);
    const existingItem = (purchase.items || []).find(
      (item) => normalizeText(item.name) === cleanName
    );

    if (existingItem) {
      if (existingItem.isWeighted) {
        const currentWeight = existingItem.weight ?? existingItem.quantity ?? 1;
        const newWeight = Math.round((currentWeight + 1) * 1000) / 1000;
        onEditItem(purchase.id, existingItem.id, { weight: newWeight });
        showFeedbackToast(`"${existingItem.name}" +1kg (Total: ${newWeight.toString().replace('.', ',')} kg)`);
      } else {
        const currentQty = (existingItem.quantity || 1) + 1;
        onEditItem(purchase.id, existingItem.id, { quantity: currentQty });
        showFeedbackToast(`"${existingItem.name}" +1 un (Total: ${currentQty})`);
      }
      return;
    }

    const { isWeighted, pricingModeSource } = resolvePricingMode(
      suggestion.defaultPricingMode
    );

    onAddItem(purchase.id, {
      name: suggestion.name,
      category: suggestion.category,
      quantity: 1,
      isWeighted,
      pricingModeSource,
      bought: purchase.origin === 'manual' ? true : false,
    });
    showFeedbackToast(`"${suggestion.name}" adicionado à lista`);
  };

  const handleBackClick = () => {
    const itemsCount = purchase.items ? purchase.items.length : 0;
    if (purchase.status === 'finished' || itemsCount === 0) {
      if (itemsCount === 0 && purchase.status !== 'finished' && onDiscardPurchase) {
        onDiscardPurchase(purchase.id);
      } else {
        onBack();
      }
      return;
    }

    // Sessão de "Registrar compra já feita" (origin === 'manual'):
    // Ao ter 1 ou mais itens, pergunta se deseja descartar o registro ou continuar com o registro
    if (purchase.origin === 'manual') {
      setIsDiscardManualModalOpen(true);
      return;
    }

    // Sessão de "Planejamento de compras" (origin === 'list'):
    // Abre a janela de confirmação para salvar ou descartar a lista
    setBackNameInput(isDefaultPurchaseName(purchase.name) ? '' : purchase.name);
    setIsBackModalOpen(true);
  };

  const handleSaveNameAndExit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = namingInput.trim();
    if (trimmed) {
      onUpdateName(purchase.id, trimmed);
    }
    setIsNamingModalOpen(false);
    onBack('Lista salva com sucesso');
  };

  const handleSaveAndExit = () => {
    const trimmed = backNameInput.trim();
    if (trimmed) {
      onUpdateName(purchase.id, trimmed);
    }
    setIsBackModalOpen(false);
    onBack('Lista salva com sucesso');
  };

  const handleSaveListForLater = () => {
    if (isDefaultPurchaseName(purchase.name)) {
      setNamingInput('');
      setIsNamingModalOpen(true);
      return;
    }

    showFeedbackToast('Lista salva com sucesso');
    setTimeout(() => {
      onBack('Lista salva com sucesso');
    }, 150);
  };

  const handleDiscardAndExit = () => {
    setIsBackModalOpen(false);
    setIsNamingModalOpen(false);
    if (onDiscardPurchase) {
      onDiscardPurchase(purchase.id);
      showFeedbackToast(
        purchase.origin === 'manual'
          ? 'Registro de compra descartado'
          : 'Lista de compras descartada'
      );
    } else {
      onBack();
    }
  };

  const handleConfirmFinish = () => {
    const trimmed = finishNameInput.trim();
    if (trimmed) {
      onUpdateName(purchase.id, trimmed);
    }
    setIsConfirmFinishOpen(false);
    if (onFinishPurchase) {
      onFinishPurchase(purchase.id, trimmed || undefined);
    }
  };

  const totalValue = calculatePurchaseTotal(purchase);
  const totalItemsCount = purchase.items.length;
  const boughtItemsCount = purchase.items.filter((i) => i.bought).length;
  const comparisonInsight = calculateComparisonInsight(purchase, allPurchases);

  const allSections = groupItemsByCategory(purchase.items);
  const visibleSections =
    activeCategoryFilters.length > 0
      ? allSections.filter((s) => activeCategoryFilters.includes(s.category))
      : allSections;

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Topo Fixo Unificado: Header + Barra de Pesquisa Fixa ao Rolar */}
      <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
        <header className="w-full">
          <div className="w-full max-w-md md:max-w-xl mx-auto px-3 py-2 sm:px-6 flex items-center justify-between gap-2">
            {/* Lado Esquerdo: Botão Voltar + Nome Editável */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <button
                onClick={handleBackClick}
                aria-label="Voltar"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-zinc-100 hover:bg-zinc-200/80 active:bg-zinc-300 flex items-center justify-center text-zinc-700 transition-colors shrink-0 cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="relative w-full group">
                  <input
                    id="purchase-title-input"
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Digite aqui o nome da lista"
                    className="w-full text-sm sm:text-base font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal bg-zinc-50/80 hover:bg-zinc-100/80 focus:bg-white border border-dashed border-zinc-300 hover:border-emerald-400 focus:border-solid focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-1.5 pr-8 transition-all outline-none leading-tight truncate"
                  />
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-emerald-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  </div>
                </div>
                {purchase.status === 'finished' && (
                  <div className="flex items-center space-x-1.5 mt-0.5 px-0.5">
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Finalizada</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Lado Direito: Menu de 3 Pontinhos (⋮) para Ações Secundárias */}
            <div className="flex items-center shrink-0 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  aria-label="Mais opções"
                  title="Mais opções"
                  className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-95 ${
                    isMenuOpen
                      ? 'bg-zinc-200 text-zinc-900'
                      : 'bg-zinc-100 hover:bg-zinc-200/80 active:bg-zinc-300 text-zinc-700'
                  }`}
                >
                  <MoreVertical className="w-5 h-5 text-zinc-700" />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      {/* Backdrop para fechar ao tocar fora */}
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      {/* Menu Popover */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-50 overflow-hidden"
                      >
                        {/* Compartilhar */}
                        <button
                          type="button"
                          onClick={handleSharePurchase}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Share2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Compartilhar</span>
                        </button>

                        {/* Exportar lista */}
                        <button
                          type="button"
                          onClick={handleExportPurchase}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Exportar lista (.txt)</span>
                        </button>

                        {/* Divisor */}
                        <div className="h-px bg-zinc-100 my-1" />

                        {/* Descartar lista / Descartar registro */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDiscardModalOpen(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                          <span>{purchase.origin === 'manual' ? 'Descartar registro' : 'Descartar lista'}</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Barra de Pesquisa Fixa integrada ao Header (visível durante planejamento ou digitação manual) */}
        {purchase.status !== 'finished' &&
          (purchase.origin !== 'manual' || registrationMode === 'manual') && (
            <div className="w-full max-w-md md:max-w-xl mx-auto px-3 sm:px-6 pb-2.5 pt-0.5">
              <ItemSearchBar
                onAddItem={handleAddItemFromSearch}
                onOpenBatchModal={() => setIsBatchModalOpen(true)}
                getSuggestions={suggestionsHook.getCombinedSuggestions}
                recordManualItem={suggestionsHook.recordManualItem}
              />
            </div>
          )}
      </div>

      {/* Main Content (Rolagem Livre com padding inferior dinâmico para não sobrepor o rodapé fixo) */}
      <main
        className={`flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:py-4 flex flex-col ${
          totalItemsCount > 0 ? 'pb-32 sm:pb-36' : 'pb-4 sm:pb-6'
        }`}
      >
        {/* Hidden Camera / File Input for Receipt Photo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageCapture}
          className="hidden"
          id="receipt-camera-input"
        />

        {/* Flow Selection for 'Registrar compra já feita' */}
        {purchase.origin === 'manual' && registrationMode === 'choose' && (
          <div className="w-full bg-white rounded-2xl border border-amber-200/90 p-4 sm:p-5 shadow-2xs mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-full flex items-center space-x-1">
                <Receipt className="w-3 h-3 text-amber-600" />
                <span>Registrar compra já feita</span>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight mb-1">
              Como deseja registrar esta compra?
            </h2>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Escolha entre lançar os itens manualmente ou fotografar a nota fiscal para anexar.
            </p>

            <div className="space-y-3">
              {/* Option 1: Adicionar itens manualmente */}
              <button
                type="button"
                onClick={() => {
                  setRegistrationMode('manual');
                }}
                className="w-full p-3.5 sm:p-4 rounded-xl border border-zinc-200 hover:border-emerald-500 bg-zinc-50/80 hover:bg-emerald-50/50 transition-all flex items-center space-x-3.5 text-left cursor-pointer group active:scale-[0.98] min-h-[60px]"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-900 transition-colors">
                    Adicionar itens manualmente
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-tight">
                    Digitar produtos, quantidades e preços um a um
                  </p>
                </div>
              </button>

              {/* Option 2: Anexar foto da nota fiscal */}
              <button
                type="button"
                onClick={() => {
                  setRegistrationMode('photo');
                  setTimeout(() => handleTriggerCamera(), 100);
                }}
                className="w-full p-3.5 sm:p-4 rounded-xl border border-amber-200/90 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 transition-all flex items-center space-x-3.5 text-left cursor-pointer group active:scale-[0.98] min-h-[60px]"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-zinc-900 group-hover:text-amber-950 transition-colors">
                      Anexar foto da nota fiscal
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-tight">
                    Tirar foto do cupom impresso diretamente com a câmera
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Receipt Photo Section */}
        {purchase.origin === 'manual' && registrationMode === 'photo' && (
          <div className="w-full bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-full flex items-center space-x-1">
                <Camera className="w-3 h-3 text-amber-600" />
                <span>Foto da Nota Fiscal</span>
              </span>
              <button
                type="button"
                onClick={() => setRegistrationMode('choose')}
                className="text-xs text-zinc-500 hover:text-zinc-800 font-semibold px-2 py-1 rounded-lg hover:bg-zinc-100 cursor-pointer transition-colors min-h-[36px]"
              >
                Mudar modo
              </button>
            </div>

            {!receiptImage ? (
              /* Photo Capture Area */
              <div>
                <label
                  htmlFor="receipt-camera-input"
                  className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 rounded-2xl cursor-pointer transition-all group my-1 min-h-[190px] text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-2xs">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 mb-1">
                    Tirar foto da nota fiscal
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-xs mb-3 leading-relaxed">
                    Toque aqui para abrir a câmera do seu celular ou dispositivo.
                  </p>
                  <span className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs group-hover:bg-emerald-700 transition-colors min-h-[44px]">
                    <Camera className="w-4 h-4" />
                    <span>Abrir Câmera</span>
                  </span>
                </label>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setRegistrationMode('choose')}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs transition-colors min-h-[44px] cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            ) : isReviewingReceipt ? (
              /* TELA DE CONFERÊNCIA DA LEITURA DA NOTA */
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Conferência de Itens Extraídos</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Confira, desmarque ou ajuste os dados antes de adicionar à compra.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddManualExtractedItem}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer shrink-0 min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Item</span>
                  </button>
                </div>

                {/* Batch select and Summary bar */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = extractedItems.every((i) => i.selected);
                        handleToggleAllExtractedItems(!allSelected);
                      }}
                      className="text-zinc-600 hover:text-zinc-900 font-semibold flex items-center space-x-1.5 cursor-pointer py-1"
                    >
                      {extractedItems.every((i) => i.selected) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                      <span>
                        {extractedItems.filter((i) => i.selected).length} de {extractedItems.length} selecionado(s)
                      </span>
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-zinc-500 text-[11px]">Subtotal: </span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {formatCurrencyBRL(
                        extractedItems
                          .filter((i) => i.selected)
                          .reduce((sum, item) => sum + item.quantity * item.price, 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {extractedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        item.selected
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-zinc-50/60 border-zinc-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2">
                        <button
                          type="button"
                          onClick={() => handleToggleExtractedItem(item.id)}
                          className="cursor-pointer text-emerald-600 shrink-0 p-0.5"
                        >
                          {item.selected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-zinc-400" />
                          )}
                        </button>

                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateExtractedItemName(item.id, e.target.value)}
                          placeholder="Nome do produto"
                          className="flex-1 text-xs sm:text-sm font-bold text-zinc-900 bg-white border border-zinc-200 rounded-lg px-2 py-1.5 focus:border-emerald-500 focus:outline-hidden"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveExtractedItem(item.id)}
                          className="text-zinc-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pl-7">
                        {/* Quantity controls */}
                        <div className="flex items-center space-x-1.5 bg-white border border-zinc-200 rounded-lg p-1">
                          <span className="text-[11px] text-zinc-400 font-medium pl-1">Qtd:</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateExtractedItemQuantity(item.id, -1)}
                            className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-zinc-800 min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateExtractedItemQuantity(item.id, 1)}
                            className="w-6 h-6 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Input */}
                        <div className="flex items-center space-x-1 bg-white border border-zinc-200 rounded-lg px-2 py-1">
                          <span className="text-[11px] font-bold text-zinc-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price === 0 ? '' : item.price}
                            onChange={(e) =>
                              handleUpdateExtractedItemPrice(
                                item.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0,00"
                            className="w-full text-xs font-bold text-zinc-900 bg-transparent border-none focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Review Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleConfirmExtractedItems}
                    disabled={extractedItems.filter((i) => i.selected).length === 0}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-2xs transition-all min-h-[48px] cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      Confirmar e Adicionar {extractedItems.filter((i) => i.selected).length} Item(ns)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelReceiptReview}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs transition-colors min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Photo Preview & Analysis Area */
              <div>
                <div className="relative w-full rounded-xl overflow-hidden border border-zinc-200 bg-zinc-950/90 shadow-inner flex items-center justify-center min-h-[220px] max-h-[380px] p-2">
                  <img
                    src={receiptImage}
                    alt="Prévia da Nota Fiscal"
                    className="max-h-[360px] w-auto max-w-full object-contain rounded-lg shadow-md"
                  />
                  {/* Linha de Varredura Laser durante processamento OCR */}
                  {isAnalyzingReceipt && (
                    <motion.div
                      initial={{ top: '0%' }}
                      animate={motionConfig.shouldReduceMotion ? { top: '0%' } : { top: ['0%', '94%', '0%'] }}
                      transition={
                        motionConfig.shouldReduceMotion
                          ? { duration: 0 }
                          : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                      }
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/10 via-emerald-400 to-emerald-500/10 shadow-[0_0_18px_3px_rgba(16,185,129,0.85)] z-10 pointer-events-none"
                    />
                  )}
                </div>

                {/* Loading State during AI parsing */}
                {isAnalyzingReceipt && (
                  <div className="mt-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col items-center justify-center text-center space-y-2.5 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">Lendo nota fiscal...</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        O Gemini está identificando os produtos, quantidades e preços.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error State if parsing fails */}
                {receiptError && !isAnalyzingReceipt && (
                  <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Não foi possível ler a nota</h4>
                        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{receiptError}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTriggerCamera}
                        className="py-2 px-3 rounded-xl bg-amber-200/80 hover:bg-amber-300 active:bg-amber-400 text-amber-900 font-bold text-xs transition-colors min-h-[40px] flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Tirar outra foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptError(null);
                          setRegistrationMode('manual');
                        }}
                        className="py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors border border-amber-300 min-h-[40px] flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Digitar manualmente</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Standard Photo Actions when not loading */}
                {!isAnalyzingReceipt && !receiptError && (
                  <div className="mt-4 space-y-2">
                    {/* Analisar Nota Button */}
                    <button
                      type="button"
                      onClick={handleAnalyzeReceipt}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all min-h-[48px] cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Analisar Nota</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Tirar outra foto Button */}
                      <button
                        type="button"
                        onClick={handleTriggerCamera}
                        className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-bold text-xs transition-colors min-h-[44px] cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5 border border-zinc-200/80"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Tirar outra foto</span>
                      </button>

                      {/* Cancelar Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImage(null);
                          setRegistrationMode('choose');
                        }}
                        className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-red-50 active:bg-red-100 text-red-600 hover:text-red-700 font-bold text-xs transition-colors min-h-[44px] cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5 border border-zinc-200/80"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual Mode Switcher Banner */}
        {purchase.origin === 'manual' && registrationMode === 'manual' && (
          <div className="mb-3.5 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200/80 text-xs">
            <span className="font-semibold text-zinc-700 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Modo: Digitação Manual</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setRegistrationMode('photo');
                if (!receiptImage) {
                  setTimeout(() => handleTriggerCamera(), 100);
                }
              }}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 cursor-pointer active:scale-95 transition-all min-h-[36px]"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Anexar Nota</span>
            </button>
          </div>
        )}

        {/* Items List or Empty State (Hidden when choosing registration mode or taking photo) */}
        {purchase.origin === 'manual' && (registrationMode === 'choose' || registrationMode === 'photo') ? null : (
          <div className="space-y-3">
            {/* Lista de Cards de Itens ou Estado Vazio com Animação Fluida desde o 1º item */}
            <div className="space-y-2.5">
              {totalItemsCount > 0 && allSections.length > 1 && (
                <div
                  className="flex flex-nowrap items-center gap-1.5 px-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: 'none' }}
                >
                  <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 shrink-0 mr-0.5">
                    <Filter className="w-3 h-3" />
                    Filtrar:
                  </span>
                  {allSections.map((section) => {
                    const isActive = activeCategoryFilters.includes(section.category);
                    return (
                      <motion.button
                        key={section.category}
                        type="button"
                        whileTap={motionConfig.tap.pill}
                        transition={motionConfig.pressSpring}
                        onClick={() => toggleCategoryFilter(section.category)}
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-bold shrink-0 whitespace-nowrap cursor-pointer transition-all ${
                          isActive
                            ? getCategoryBadgeStyle(section.category)
                            : 'bg-white text-zinc-500 border-zinc-200/90 hover:bg-zinc-50'
                        }`}
                      >
                        {isActive ? `${section.category} · ${section.items.length}` : section.category}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {totalItemsCount === 0 ? (
                    <motion.div
                      key="empty-state-banner"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.2 }}
                      className="w-full flex flex-col items-center justify-center py-6 sm:py-7 px-4 sm:px-6 text-center bg-white rounded-3xl border border-zinc-200/80 my-1 shadow-2xs"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 shadow-2xs">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">Sua lista está vazia</h3>
                      <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                        Use a barra de busca acima para pesquisar ou adicionar itens à sua lista.
                      </p>
                    </motion.div>
                  ) : (
                    visibleSections.map((section) => (
                      <motion.div
                        key={section.category}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        className="space-y-2"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSectionCollapse(section.category)}
                          className="flex items-center gap-2 px-1 pt-1.5 pb-0.5 w-full cursor-pointer"
                        >
                          <span className={`w-1 h-3.5 rounded-full shrink-0 ${getCategoryAccentBarClass(section.category)}`} />
                          <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide">
                            {section.category}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-medium">{section.items.length}</span>
                          <motion.span
                            animate={{ rotate: collapsedSections.includes(section.category) ? -90 : 0 }}
                            transition={motionConfig.spring}
                            className="ml-auto text-zinc-400"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </motion.span>
                        </button>

                        <AnimatePresence mode="popLayout" initial={false}>
                          {!collapsedSections.includes(section.category) &&
                            section.items.map((item) => (
                              <PurchaseItemCard
                                key={item.id}
                                item={item}
                                purchaseId={purchase.id}
                                onToggleBought={onToggleBought}
                                onEditItem={onEditItem}
                                onRemoveItem={(pId, iId) => {
                                  onRemoveItem(pId, iId);
                                  showToast(`"${item.name}" removido da lista`);
                                }}
                                getCategoryBadgeStyle={getCategoryBadgeStyle}
                              />
                            ))}
                        </AnimatePresence>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Seção de Sugestões Rápidas: Abaixo do bloco central, exibida apenas de 0 a 2 itens */}
            {purchase.status !== 'finished' && totalItemsCount <= 2 && availableSuggestions.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-3 sm:p-4 shadow-2xs mt-2">
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-700">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Sugestões rápidas</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium">Toque para adicionar</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {availableSuggestions.map((suggestion, idx) => (
                    <motion.button
                      whileTap={motionConfig.tap.button}
                      transition={motionConfig.pressSpring}
                      key={`quick-sug-${suggestion.name}-${idx}`}
                      type="button"
                      onClick={() => handleAddQuickSuggestion(suggestion)}
                      className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200/80 text-emerald-800 text-xs font-bold shrink-0 cursor-pointer transition-all flex items-center space-x-1 min-h-[32px] shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{suggestion.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Adicionar em Lote */}
      <BatchAddModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSubmit={handleSubmitBatch}
      />

      {/* Modal de Edição Completa */}
      <EditItemModal
        isOpen={isEditModalOpen}
        item={editingItem}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveFullEdit}
      />

      {/* Modal de Confirmação de Finalização */}
      <AnimatePresence>
        {isConfirmFinishOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmFinishOpen(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={motionConfig.modalSpring}
              className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto"
            >
              {/* Botão Fechar (X) */}
              <motion.button
                whileTap={motionConfig.tap.iconButton}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={() => setIsConfirmFinishOpen(false)}
                aria-label="Fechar modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </motion.button>

              <div className="p-4 sm:p-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/90 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-2.5 mx-auto shadow-2xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 text-center tracking-tight">
                  {purchase.origin === 'manual' ? 'Confirmar Registro?' : 'Finalizar Compra?'}
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 text-center mt-0.5">
                  {purchase.origin === 'manual'
                    ? 'Confira os dados antes de salvar o registro no histórico:'
                    : 'Confira os dados antes de concluir e arquivar esta compra:'}
                </p>

                {/* Resumo financeiro e contagem */}
                <div className="mt-3 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Valor Total:</span>
                    <span className="font-extrabold text-emerald-700 text-sm sm:text-base">{formatCurrencyBRL(totalValue)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200/60">
                    <span className="text-zinc-500 font-medium">Itens no Carrinho:</span>
                    <span className="font-bold text-zinc-800">
                      {boughtItemsCount} de {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* Barra de progresso visual */}
                  {totalItemsCount > 0 && (
                    <div className="w-full h-1.5 bg-zinc-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.round((boughtItemsCount / totalItemsCount) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Aviso se houver itens não comprados (Apenas para compras normais/não manuais) */}
                {purchase.origin !== 'manual' && totalItemsCount - boughtItemsCount > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs leading-relaxed flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900 text-[11px]">
                        {totalItemsCount - boughtItemsCount}{' '}
                        {totalItemsCount - boughtItemsCount === 1
                          ? 'item ainda não foi marcado'
                          : 'itens ainda não foram marcados'}{' '}
                        como comprado.
                      </p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Os itens não marcados serão salvos como pendentes no histórico.
                      </p>
                    </div>
                  </div>
                )}

                {/* Campo de nome opcional se a purchase ainda tiver o nome padrão automático */}
                {isDefaultPurchaseName(purchase.name) && (
                  <div className="mt-2.5">
                    <label htmlFor="finish-purchase-name-input" className="sr-only">
                      Nome da lista
                    </label>
                    <input
                      id="finish-purchase-name-input"
                      type="text"
                      value={finishNameInput}
                      onChange={(e) => setFinishNameInput(e.target.value)}
                      placeholder="Dê um nome a esta lista (opcional)"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-zinc-900 placeholder:text-zinc-400 font-medium transition-all outline-none"
                    />
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="mt-4 flex items-center space-x-2">
                  <motion.button
                    whileTap={motionConfig.tap.button}
                    transition={motionConfig.pressSpring}
                    type="button"
                    onClick={() => setIsConfirmFinishOpen(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                  >
                    Continuar
                  </motion.button>
                  <motion.button
                    whileTap={motionConfig.tap.button}
                    transition={motionConfig.pressSpring}
                    type="button"
                    onClick={handleConfirmFinish}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-colors min-h-[44px] cursor-pointer"
                  >
                    {purchase.origin === 'manual' ? 'Confirmar Registro' : 'Confirmar e Finalizar'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Modal Customizado para Registrar Compra Já Feita (ao clicar em Voltar com 1+ itens) */}
      <AnimatePresence>
        {isDiscardManualModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsDiscardManualModalOpen(false);
            }}
          >
            <motion.div
              {...MOTION_VARIANTS.modalContent}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden relative"
            >
              {/* Botão Fechar (X) no canto superior direito: apenas fecha o modal e continua no registro */}
              <button
                type="button"
                onClick={() => setIsDiscardManualModalOpen(false)}
                aria-label="Fechar e continuar com o registro"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-5 pt-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 mx-auto bg-amber-100 border border-amber-200 text-amber-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  Descartar registro?
                </h3>
                <p className="text-xs text-zinc-500 text-center mt-1.5 leading-relaxed">
                  Você já adicionou {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}. Deseja descartar este registro ou continuar registrando a compra?
                </p>

                <div className="mt-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Itens no registro:</span>
                    <span className="font-bold text-zinc-800">{totalItemsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Valor total registrado:</span>
                    <span className="font-bold text-zinc-800">{formatCurrencyBRL(totalValue)}</span>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {/* Continuar com o registro (Ação Primária / Segura) */}
                  <button
                    type="button"
                    onClick={() => setIsDiscardManualModalOpen(false)}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <span>Continuar com o registro</span>
                  </button>

                  {/* Descartar registro (Ação Destrutiva) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDiscardManualModalOpen(false);
                      if (onDiscardPurchase) {
                        onDiscardPurchase(purchase.id);
                      } else {
                        onBack();
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Descartar o registro</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação para Descartar Lista / Registro do Menu */}
      <AnimatePresence>
        {isDiscardModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsDiscardModalOpen(false);
            }}
          >
            <motion.div
              {...MOTION_VARIANTS.modalContent}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden relative"
            >
              {/* Botão Fechar (X) */}
              <button
                type="button"
                onClick={() => setIsDiscardModalOpen(false)}
                aria-label="Fechar modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-5 pt-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 mx-auto bg-red-100 border border-red-200 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  {purchase.origin === 'manual' ? 'Descartar registro?' : 'Descartar lista?'}
                </h3>
                <p className="text-xs text-zinc-500 text-center mt-1.5 leading-relaxed">
                  {totalItemsCount > 0
                    ? `Esta ação apagará permanentemente esta lista e todos os ${totalItemsCount} ${
                        totalItemsCount === 1 ? 'item adicionado' : 'itens adicionados'
                      }.`
                    : 'Esta ação apagará permanentemente esta lista.'}
                </p>

                {totalItemsCount > 0 && (
                  <div className="mt-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-zinc-600">
                      <span>Itens na lista:</span>
                      <span className="font-bold text-zinc-800">{totalItemsCount}</span>
                    </div>
                    {totalValue > 0 && (
                      <div className="flex items-center justify-between text-zinc-600">
                        <span>Valor total estimado:</span>
                        <span className="font-bold text-zinc-800">{formatCurrencyBRL(totalValue)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 space-y-2">
                  {/* Ação Destrutiva em Destaque Vermelho */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDiscardModalOpen(false);
                      if (onDiscardPurchase) {
                        onDiscardPurchase(purchase.id);
                        showFeedbackToast(
                          purchase.origin === 'manual'
                            ? 'Registro de compra descartado'
                            : 'Lista de compras descartada'
                        );
                      } else {
                        onBack();
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    <span>{purchase.origin === 'manual' ? 'Descartar Registro' : 'Descartar Lista'}</span>
                  </button>

                  {/* Ação Segura de Cancelar */}
                  <button
                    type="button"
                    onClick={() => setIsDiscardModalOpen(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer flex items-center justify-center active:scale-95"
                  >
                    <span>Continuar com a lista</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Customizado de Confirmação ao Voltar */}
      <AnimatePresence>
        {isBackModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsBackModalOpen(false);
            }}
          >
            <motion.div
              {...MOTION_VARIANTS.modalContent}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden relative"
            >
              {/* Botão Fechar (X) no canto superior direito: apenas fecha o modal e continua na tela */}
              <button
                type="button"
                onClick={() => setIsBackModalOpen(false)}
                aria-label="Fechar modal e continuar editando"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-5 pt-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 mx-auto bg-emerald-100 border border-emerald-200 text-emerald-700">
                  <ShoppingBag className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  Deseja salvar esta lista?
                </h3>
                <p className="text-xs text-zinc-500 text-center mt-1.5 leading-relaxed">
                  Sua lista possui itens adicionados. Deseja salvar para comprar mais tarde ou descartar?
                </p>

                <div className="mt-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Itens adicionados:</span>
                    <span className="font-bold text-zinc-800">{totalItemsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Valor estimado:</span>
                    <span className="font-bold text-zinc-800">{formatCurrencyBRL(totalValue)}</span>
                  </div>
                </div>

                {/* Campo de nome opcional se a purchase ainda tiver o nome padrão automático */}
                {isDefaultPurchaseName(purchase.name) && (
                  <div className="mt-3.5">
                    <label htmlFor="back-purchase-name-input" className="sr-only">
                      Nome da lista
                    </label>
                    <input
                      id="back-purchase-name-input"
                      type="text"
                      value={backNameInput}
                      onChange={(e) => setBackNameInput(e.target.value)}
                      placeholder="Dê um nome a esta lista (opcional)"
                      className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-zinc-900 placeholder:text-zinc-400 font-medium transition-all outline-none"
                    />
                  </div>
                )}

                <div className="mt-5 space-y-2">
                  {/* Ação Primária em Destaque */}
                  <button
                    type="button"
                    onClick={handleSaveAndExit}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Salvar Lista</span>
                  </button>

                  {/* Ação Destrutiva Secundária */}
                  <button
                    type="button"
                    onClick={handleDiscardAndExit}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Descartar Lista</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Nomear Lista ao Salvar Automaticamente (3+ itens com nome padrão ou Guardar Lista) */}
      <AnimatePresence>
        {isNamingModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsNamingModalOpen(false);
            }}
          >
            <motion.div
              {...MOTION_VARIANTS.modalContent}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden relative"
            >
              {/* Botão Fechar (X) no canto superior direito: apenas fecha o modal e continua na tela */}
              <button
                type="button"
                onClick={() => setIsNamingModalOpen(false)}
                aria-label="Fechar modal e continuar editando"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-5 pt-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 mx-auto bg-emerald-100 border border-emerald-200 text-emerald-700">
                  <ShoppingBag className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  Salvar Lista
                </h3>
                <p className="text-xs text-zinc-500 text-center mt-1.5 leading-relaxed">
                  Sua lista possui {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}. Deseja salvar para mais tarde ou descartar?
                </p>

                <form onSubmit={handleSaveNameAndExit} className="mt-4 space-y-3">
                  <div>
                    <label htmlFor="purchase-name-input" className="sr-only">
                      Nome da lista
                    </label>
                    <input
                      id="purchase-name-input"
                      type="text"
                      value={namingInput}
                      onChange={(e) => setNamingInput(e.target.value)}
                      placeholder="Dê um nome a esta lista (opcional)"
                      autoFocus
                      className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-zinc-900 placeholder:text-zinc-400 font-medium transition-all outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Salvar Lista</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDiscardAndExit}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Descartar Lista</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rodapé Fixo Inferior - Sempre à mostra na viewport quando há itens na lista */}
      <AnimatePresence>
        {totalItemsCount > 0 && (
          <motion.footer
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-30 w-full bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-3.5 sm:px-6"
          >
            <div className="w-full max-w-md md:max-w-xl mx-auto space-y-2">
              {/* Resumo compacto em uma linha: valor total com odômetro animado e contagem tátil */}
              <div className="flex items-center justify-between text-xs px-0.5">
                <div className="flex items-center space-x-1.5">
                  <span className="text-zinc-500 font-medium">Total:</span>
                  <span className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                    <AnimatedCurrency value={totalValue} />
                  </span>
                </div>
                <div className="text-zinc-600 font-semibold text-xs flex items-center space-x-1">
                  <motion.span
                    key={boughtItemsCount}
                    initial={{ scale: 1.28, color: '#059669' }}
                    animate={{ scale: 1, color: '#047857' }}
                    transition={motionConfig.pressSpring}
                    className="inline-block font-bold"
                  >
                    {boughtItemsCount}
                  </motion.span>
                  <span>
                    /{totalItemsCount}{' '}
                    {totalItemsCount === 1 ? 'item' : 'itens'}{' '}
                    {boughtItemsCount === totalItemsCount ? '✓' : 'comprados'}
                  </span>
                </div>
              </div>

              {/* Botões de Ação do Rodapé */}
              {purchase.status === 'finished' ? (
                <motion.button
                  whileTap={motionConfig.tap.button}
                  transition={motionConfig.pressSpring}
                  onClick={() => onBack()}
                  type="button"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition-colors min-h-[48px] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para o Início</span>
                </motion.button>
              ) : purchase.origin === 'manual' ? (
                /* Sessão de Registrar Compra Já Feita: apenas o botão principal de Registrar Compra (sem Guardar Lista) */
                <motion.button
                  whileTap={motionConfig.tap.button}
                  transition={motionConfig.pressSpring}
                  onClick={() => {
                    setFinishNameInput('');
                    setIsConfirmFinishOpen(true);
                  }}
                  type="button"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-colors min-h-[48px] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Registrar Compra</span>
                </motion.button>
              ) : (
                /* Sessão de Planejamento de Compra: exibe Guardar Lista e Finalizar Compra */
                <div className="grid grid-cols-2 gap-2">
                  {/* Botão Guardar Lista */}
                  <motion.button
                    whileTap={motionConfig.tap.button}
                    transition={motionConfig.pressSpring}
                    onClick={handleSaveListForLater}
                    type="button"
                    className="w-full flex items-center justify-center space-x-2 py-3 px-3 sm:px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 border border-zinc-200/80 font-bold text-xs sm:text-sm transition-colors min-h-[48px] cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 text-zinc-600" />
                    <span>Guardar Lista</span>
                  </motion.button>

                  {/* Botão Finalizar Compra */}
                  <motion.button
                    whileTap={motionConfig.tap.button}
                    transition={motionConfig.pressSpring}
                    onClick={() => {
                      setFinishNameInput('');
                      setIsConfirmFinishOpen(true);
                    }}
                    type="button"
                    className="w-full flex items-center justify-center space-x-2 py-3 px-3 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-colors min-h-[48px] cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Finalizar Compra</span>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
