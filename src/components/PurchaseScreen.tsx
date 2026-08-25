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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, Purchase } from '../types';
import { parseReceiptImage, ExtractedReceiptItem } from '../services/geminiService';
import {
  calculateItemSubtotal,
  calculatePurchaseTotal,
  formatCurrencyBRL,
  parseBatchItemsInput,
  calculateComparisonInsight,
  exportPurchaseAsTxt,
  generatePurchaseExportText,
  getFilteredQuickSuggestions,
  isDefaultPurchaseName,
} from '../utils/purchaseHelpers';
import { useToast } from './Toast';

const STANDARD_CATEGORIES = ['Geral', 'Alimentos', 'Bebidas', 'Limpeza', 'Higiene'];
const WEIGHT_CATEGORIES = ['Açougue', 'Frutas/Legumes', 'Frios', 'Padaria', 'Hortifruti'];

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

interface PurchaseScreenProps {
  purchase: Purchase;
  allPurchases?: Purchase[];
  onBack: (message?: string) => void;
  onDiscardPurchase?: (purchaseId: string) => void;
  onUpdateName: (purchaseId: string, name: string) => void;
  onAddItem: (purchaseId: string, itemData: Omit<Item, 'id' | 'bought'> & { bought?: boolean }) => void;
  onEditItem: (purchaseId: string, itemId: string, updatedData: Partial<Omit<Item, 'id'>>) => void;
  onRemoveItem: (purchaseId: string, itemId: string) => void;
  onToggleBought: (purchaseId: string, itemId: string) => void;
  onFinishPurchase?: (purchaseId: string) => void;
}

export function PurchaseScreen({
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

  // Naming modal state (for 3+ items with default name on back click or Guardar Lista)
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [namingInput, setNamingInput] = useState('');

  // Finish purchase modal states
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);
  const [finishNameInput, setFinishNameInput] = useState('');
  const [isFinishedSummaryOpen, setIsFinishedSummaryOpen] = useState(false);

  // Modal State for Add / Edit Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [modalTab, setModalTab] = useState<'single' | 'batch'>('single');
  const [batchText, setBatchText] = useState('');

  // Single Item Form State
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Geral');
  const [quantity, setQuantity] = useState<number>(1);
  const [priceStr, setPriceStr] = useState('');
  const [isWeighted, setIsWeighted] = useState(false);
  const [weightStr, setWeightStr] = useState('');

  // Toast feedback hook
  const { showToast } = useToast();

  // Receipt Photo & Mode State (for origin === 'manual')
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [registrationMode, setRegistrationMode] = useState<'choose' | 'manual' | 'photo'>(
    purchase.origin === 'manual' && (!purchase.items || purchase.items.length === 0) ? 'choose' : 'manual'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Receipt AI Analysis State
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedReceiptItem[]>([]);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isReviewingReceipt, setIsReviewingReceipt] = useState(false);

  // Header 3-dots Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        // Se o usuário não cancelou a janela, tenta o fallback
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

  // Open Modal for Create (supports single or batch mode directly)
  const handleOpenAddModal = (mode: 'single' | 'batch' = 'single') => {
    setEditingItem(null);
    setModalTab(mode);
    setBatchText('');
    setItemName('');
    setCategory('Geral');
    setQuantity(1);
    setPriceStr('');
    setIsWeighted(false);
    setWeightStr('');
    setIsFabMenuOpen(false);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setModalTab('single');
    setItemName(item.name);
    setCategory(item.category || (item.isWeighted ? 'Açougue' : 'Geral'));
    setQuantity(item.quantity || 1);
    setPriceStr(item.price ? item.price.toString() : '');
    setIsWeighted(item.isWeighted || false);
    setWeightStr(item.weight ? item.weight.toString() : '');
    setIsModalOpen(true);
  };

  // Handle Weighted toggle changes & switch active categories accordingly
  const handleToggleWeighted = (checked: boolean) => {
    setIsWeighted(checked);
    if (checked) {
      if (!WEIGHT_CATEGORIES.includes(category)) {
        setCategory('Açougue');
      }
    } else {
      if (!STANDARD_CATEGORIES.includes(category)) {
        setCategory('Geral');
      }
    }
  };

  // Save Item Submit
  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const parsedPrice = priceStr ? parseFloat(priceStr.replace(',', '.')) : undefined;
    const parsedWeight = isWeighted && weightStr ? parseFloat(weightStr.replace(',', '.')) : undefined;

    if (editingItem) {
      onEditItem(purchase.id, editingItem.id, {
        name: itemName.trim(),
        category,
        quantity: Math.max(1, quantity),
        price: parsedPrice && !isNaN(parsedPrice) ? parsedPrice : undefined,
        isWeighted,
        weight: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : undefined,
      });
      showToast(`"${itemName.trim()}" atualizado`);
    } else {
      onAddItem(purchase.id, {
        name: itemName.trim(),
        category,
        quantity: Math.max(1, quantity),
        price: parsedPrice && !isNaN(parsedPrice) ? parsedPrice : undefined,
        isWeighted,
        weight: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : undefined,
        bought: purchase.origin === 'manual' ? true : false,
      });
      showToast(`"${itemName.trim()}" adicionado à lista`);
    }

    setIsModalOpen(false);
  };

  // Save Batch Items Submit
  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBatchItemsInput(batchText);
    if (parsed.length === 0) return;

    parsed.forEach((item) => {
      onAddItem(purchase.id, {
        ...item,
        bought: purchase.origin === 'manual' ? true : false,
      });
    });

    showToast(`${parsed.length} ${parsed.length === 1 ? 'item adicionado' : 'itens adicionados'} à lista`);
    setIsModalOpen(false);
  };

  const availableSuggestions = getFilteredQuickSuggestions(purchase.items || []);

  const handleAddQuickSuggestion = (suggestionName: string) => {
    onAddItem(purchase.id, {
      name: suggestionName,
      category: 'Geral',
      quantity: 1,
      isWeighted: false,
      bought: purchase.origin === 'manual' ? true : false,
    });
    showFeedbackToast(`"${suggestionName}" adicionado à lista`);
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
    if (itemsCount === 1 || itemsCount === 2) {
      setBackNameInput('');
      setIsBackModalOpen(true);
      return;
    }

    // 3 ou mais itens no planejamento:
    // SE a Purchase tiver o nome padrão automático (nunca foi renomeada manualmente):
    if (isDefaultPurchaseName(purchase.name)) {
      setNamingInput('');
      setIsNamingModalOpen(true);
      return;
    }

    // SE já tiver um nome personalizado: salva direto e mostra toast
    onBack('Lista salva automaticamente');
  };

  const handleSaveNameAndExit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = namingInput.trim();
    if (trimmed) {
      onUpdateName(purchase.id, trimmed);
    }
    setIsNamingModalOpen(false);
    onBack('Lista salva automaticamente');
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
    if (onDiscardPurchase) {
      onDiscardPurchase(purchase.id);
    } else {
      onBack();
    }
  };

  const handleConfirmFinish = () => {
    const trimmed = finishNameInput.trim();
    if (trimmed) {
      onUpdateName(purchase.id, trimmed);
    }
    if (onFinishPurchase) {
      onFinishPurchase(purchase.id);
    }
    setIsConfirmFinishOpen(false);
    setIsFinishedSummaryOpen(true);
  };

  const totalValue = calculatePurchaseTotal(purchase);
  const totalItemsCount = purchase.items.length;
  const boughtItemsCount = purchase.items.filter((i) => i.bought).length;
  const comparisonInsight = calculateComparisonInsight(purchase, allPurchases);

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header (Compacto & Sticky) */}
      <header className="w-full bg-white border-b border-zinc-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3 py-2.5 sm:px-6 flex items-center justify-between gap-2">
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
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-zinc-100 hover:bg-zinc-200/80 active:bg-zinc-300 flex items-center justify-center text-zinc-700 transition-colors shrink-0 cursor-pointer active:scale-95"
              >
                <MoreVertical className="w-5 h-5 text-zinc-700" />
              </button>

              {isMenuOpen && (
                <>
                  {/* Backdrop para fechar ao clicar fora */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
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
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content (Rolagem Livre) */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-4 sm:py-5 flex flex-col pb-8">
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
                  handleOpenAddModal('single');
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
          totalItemsCount === 0 ? (
            <div className="flex-1 min-h-[460px] sm:min-h-[520px] flex flex-col items-center justify-center py-10 px-4 sm:px-6 text-center bg-white rounded-3xl border border-zinc-200/80 my-2 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-2xs">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-1.5">Sua lista está vazia</h3>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mb-5">
                Toque no botão abaixo para começar a montar sua lista ou escolha uma sugestão rápida.
              </p>
              {/* Botão de + verde chamativo abaixo do subtítulo */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.08 }}
                onClick={() => handleOpenAddModal('single')}
                aria-label="Adicionar item"
                title="Adicionar item"
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shadow-lg shadow-emerald-600/35 cursor-pointer transition-all active:scale-95 mb-6"
              >
                <Plus className="w-7 h-7 stroke-[2.5]" />
              </motion.button>

              {/* Sugestões Rápidas no Card Vazio */}
              {availableSuggestions.length > 0 && (
                <div className="w-full max-w-sm pt-5 border-t border-zinc-100">
                  <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-zinc-700 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Sugestões rápidas para começar</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {availableSuggestions.slice(0, 8).map((suggestion) => (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        whileHover={{ scale: 1.04 }}
                        key={suggestion}
                        type="button"
                        onClick={() => handleAddQuickSuggestion(suggestion)}
                        className="px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200/80 text-emerald-800 text-xs font-bold shrink-0 cursor-pointer transition-all flex items-center space-x-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{suggestion}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-28 sm:pb-32">
              {/* Barra de Sugestões Rápidas na Tela com Itens */}
              {availableSuggestions.length > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-3 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-700">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Sugestões rápidas</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium">Toque para adicionar</span>
                  </div>

                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none snap-x">
                    {availableSuggestions.map((suggestion) => (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        key={suggestion}
                        type="button"
                        onClick={() => handleAddQuickSuggestion(suggestion)}
                        className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200/80 text-emerald-800 text-xs font-bold shrink-0 cursor-pointer transition-all flex items-center space-x-1 min-h-[34px] snap-start shadow-2xs whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{suggestion}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {purchase.items.map((item) => {
              const subtotal = calculateItemSubtotal(item);
              const badgeStyle = getCategoryBadgeStyle(item.category);
              // Remove redundant (kg) or (un) suffix if present in the stored name
              const cleanItemName = item.name.replace(/\s*\((?:kg|un|unidade)\)/gi, '').trim();

              return (
                <div
                  key={item.id}
                  className={`w-full rounded-2xl border transition-all p-3 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-2.5 ${
                    item.bought
                      ? 'bg-zinc-100/70 border-zinc-200/70 text-zinc-500'
                      : 'bg-white border-zinc-200/90 shadow-2xs text-zinc-900'
                  }`}
                >
                  {/* Checkbox + Info (Linha 1: Nome + Badge / Linha 2: Frase Compacta) */}
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleBought(purchase.id, item.id)}
                      aria-label={item.bought ? 'Marcar como não comprado' : 'Marcar como comprado'}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] sm:w-11 sm:h-11 sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer rounded-xl hover:bg-zinc-100/80 active:scale-95 transition-all"
                    >
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          item.bought
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                            : 'border-zinc-300 bg-white hover:border-emerald-500'
                        }`}
                      >
                        {item.bought && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </button>

                    <div className="min-w-0 flex-1 pr-1">
                      {/* LINHA 1 (informação primária): nome do item + badge de categoria na MESMA linha */}
                      <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
                        <span className={`text-sm sm:text-base font-bold leading-snug break-words ${item.bought ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                          {cleanItemName}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
                          {item.category}
                        </span>
                      </div>

                      {/* LINHA 2 (informação secundária): frase compacta e única sem quebras prematuras */}
                      <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 font-medium leading-tight">
                        {item.isWeighted ? (
                          item.price ? (
                            `${item.weight ? item.weight.toString().replace('.', ',') : item.quantity.toString().replace('.', ',')} kg × ${formatCurrencyBRL(item.price)}/kg`
                          ) : (
                            `${item.weight ? item.weight.toString().replace('.', ',') : item.quantity.toString().replace('.', ',')} kg`
                          )
                        ) : (
                          item.price ? (
                            `${item.quantity} un × ${formatCurrencyBRL(item.price)}`
                          ) : (
                            `${item.quantity} un`
                          )
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Subtotal & Action Buttons */}
                  <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                    {/* Subtotal em destaque visual */}
                    <div className="text-right">
                      <p className={`text-sm sm:text-base font-black tracking-tight ${item.bought ? 'text-zinc-400' : 'text-zinc-900'}`}>
                        {formatCurrencyBRL(subtotal)}
                      </p>
                    </div>

                    {/* Botões de Ação com ícones discretos */}
                    <div className="flex items-center">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        title="Editar item"
                        aria-label="Editar item"
                        className="w-9 h-9 min-h-[38px] min-w-[38px] sm:w-10 sm:h-10 sm:min-h-[44px] sm:min-w-[44px] rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          onRemoveItem(purchase.id, item.id);
                          showToast(`"${item.name}" removido da lista`);
                        }}
                        title="Remover item"
                        aria-label="Remover item"
                        className="w-9 h-9 min-h-[38px] min-w-[38px] sm:w-10 sm:h-10 sm:min-h-[44px] sm:min-w-[44px] rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </main>

      {/* Item Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md max-h-[88vh] bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col my-auto"
            >
              {/* Modal Header (Fixed Top) */}
              <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200/80 flex items-center justify-between shrink-0 bg-white z-10">
                <h3 className="text-base font-bold text-zinc-900">
                  {editingItem ? 'Editar Item' : 'Novo Item'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-11 h-11 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              {modalTab === 'batch' && !editingItem ? (
                /* Batch Addition Form */
                <form onSubmit={handleSubmitBatch} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                  {/* Scrollable Body */}
                  <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                    {/* Tab selector for new items */}
                    <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/80">
                      <button
                        type="button"
                        onClick={() => setModalTab('single')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          modalTab === 'single'
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Item Único</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalTab('batch')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          modalTab === 'batch'
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Adicionar Vários</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Lista de itens (um por linha) <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={5}
                        required
                        placeholder={`2 Leite\n1 Arroz 5kg\nCafé\n3 Sabão em pó`}
                        value={batchText}
                        onChange={(e) => setBatchText(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium text-zinc-900 placeholder-zinc-400 font-mono"
                      />
                    </div>

                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed">
                      <span className="font-bold block mb-1">💡 Exemplo de uso:</span>
                      Digite ou cole vários itens, um por linha. Você pode incluir a quantidade no início (ex: <code className="bg-emerald-100 px-1 rounded font-bold text-emerald-950">2 Leite</code> ou apenas <code className="bg-emerald-100 px-1 rounded font-bold text-emerald-950">Leite</code>). Todos serão criados na categoria <strong className="font-bold">Geral</strong> e você poderá ajustar preços, peso ou categorias individualmente depois.
                    </div>
                  </div>

                  {/* Fixed Footer Actions */}
                  <div className="p-4 sm:px-5 border-t border-zinc-200/80 bg-white flex items-center space-x-2 shrink-0 z-10">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!batchText.trim()}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {parseBatchItemsInput(batchText).length > 1
                        ? `Adicionar ${parseBatchItemsInput(batchText).length} Itens`
                        : 'Adicionar Itens'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Single Item Form */
                <form onSubmit={handleSubmitItem} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                  {/* Scrollable Body */}
                  <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                    {/* Tab selector for new items */}
                    {!editingItem && (
                      <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/80">
                        <button
                          type="button"
                          onClick={() => setModalTab('single')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                            modalTab === 'single'
                              ? 'bg-white text-zinc-900 shadow-2xs'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Item Único</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalTab('batch')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                            modalTab === 'batch'
                              ? 'bg-white text-zinc-900 shadow-2xs'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Adicionar Vários</span>
                        </button>
                      </div>
                    )}

                    {/* Nome do Item */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Nome do Item <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Arroz, Leite, Sabão em pó..."
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium text-zinc-900 placeholder-zinc-400"
                      />
                    </div>

                    {/* Produto por peso (kg) toggle */}
                    <div className="pt-0.5">
                      <label className="flex items-center space-x-2.5 cursor-pointer py-1 min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={isWeighted}
                          onChange={(e) => handleToggleWeighted(e.target.checked)}
                          className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-800">Produto vendido por peso (kg)</span>
                      </label>

                      {isWeighted && (
                        <div className="mt-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Peso estimado em kg (ex: 0,85)"
                            value={weightStr}
                            onChange={(e) => setWeightStr(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 focus:border-emerald-500 text-sm font-medium text-zinc-900"
                          />
                        </div>
                      )}
                    </div>

                    {/* Categoria */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Categoria {isWeighted && <span className="text-emerald-700 font-bold">(Produtos por Peso)</span>}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(isWeighted ? WEIGHT_CATEGORIES : STANDARD_CATEGORIES).map((cat) => (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[40px] active:scale-95 flex items-center justify-center ${
                              category === cat
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80 border border-zinc-200/80'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantidade e Preço Unitário */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Quantidade
                        </label>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 font-bold text-zinc-700 flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0 cursor-pointer active:scale-95 transition-all text-base"
                            aria-label="Diminuir quantidade"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            className="w-full text-center py-2.5 rounded-xl border border-zinc-300 text-sm font-bold text-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-11"
                          />
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => q + 1)}
                            className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 font-bold text-zinc-700 flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0 cursor-pointer active:scale-95 transition-all text-base"
                            aria-label="Aumentar quantidade"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          {isWeighted ? 'Preço por kg (R$)' : 'Preço Unitário (R$)'}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00 (opcional)"
                          value={priceStr}
                          onChange={(e) => setPriceStr(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium text-zinc-900 placeholder-zinc-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fixed Footer Actions */}
                  <div className="p-4 sm:px-5 border-t border-zinc-200/80 bg-white flex items-center space-x-2 shrink-0 z-10">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer active:scale-95"
                    >
                      {editingItem ? 'Salvar alterações' : 'Adicionar Item'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Finalização */}
      <AnimatePresence>
        {isConfirmFinishOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsConfirmFinishOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden relative"
            >
              {/* Botão Fechar (X) no canto superior direito: apenas fecha o modal */}
              <button
                type="button"
                onClick={() => setIsConfirmFinishOpen(false)}
                aria-label="Fechar modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-5 pt-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  {purchase.origin === 'manual' ? 'Confirmar registro desta compra?' : 'Finalizar Compra?'}
                </h3>
                <p className="text-xs text-zinc-500 text-center mt-1">
                  {purchase.origin === 'manual'
                    ? 'Confira o resumo antes de concluir este registro:'
                    : 'Confira o resumo antes de concluir esta compra:'}
                </p>

                {/* Resumo financeiro e contagem */}
                <div className="mt-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Valor Total Estimado:</span>
                    <span className="font-extrabold text-zinc-900 text-sm">{formatCurrencyBRL(totalValue)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Itens Comprados:</span>
                    <span className="font-bold text-zinc-800">
                      {boughtItemsCount} de {totalItemsCount}
                    </span>
                  </div>
                </div>

                {/* Aviso se houver itens não comprados (Apenas para compras normais/não manuais) */}
                {purchase.origin !== 'manual' && totalItemsCount - boughtItemsCount > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs leading-relaxed flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">
                        {totalItemsCount - boughtItemsCount}{' '}
                        {totalItemsCount - boughtItemsCount === 1
                          ? 'item ainda não foi marcado'
                          : 'itens ainda não foram marcados'}{' '}
                        como comprado.
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Deseja finalizar a compra mesmo assim?
                      </p>
                    </div>
                  </div>
                )}

                {/* Campo de nome opcional se a purchase ainda tiver o nome padrão automático */}
                {isDefaultPurchaseName(purchase.name) && (
                  <div className="mt-3.5">
                    <label htmlFor="finish-purchase-name-input" className="sr-only">
                      Nome da lista
                    </label>
                    <input
                      id="finish-purchase-name-input"
                      type="text"
                      value={finishNameInput}
                      onChange={(e) => setFinishNameInput(e.target.value)}
                      placeholder="Dê um nome a esta lista (opcional)"
                      className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-zinc-900 placeholder:text-zinc-400 font-medium transition-all outline-none"
                    />
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="mt-5 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmFinishOpen(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmFinish}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer"
                  >
                    {purchase.origin === 'manual' ? 'Confirmar e Registrar' : 'Confirmar e Finalizar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Resumo Pós-Compra */}
      <AnimatePresence>
        {isFinishedSummaryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200/90 overflow-hidden text-center"
            >
              <div className="p-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 mx-auto shadow-2xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200 mb-2">
                  Compra Concluída!
                </span>

                <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
                  {purchase.name || 'Nova compra'}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Resumo final da sua compra registrada:
                </p>

                <div className="mt-5 bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 space-y-3 text-left">
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                    <span className="text-xs text-zinc-500 font-medium">Valor Total Final:</span>
                    <span className="text-lg font-black text-emerald-700 tracking-tight">
                      {formatCurrencyBRL(totalValue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Itens Comprados:</span>
                    <span className="font-bold text-zinc-800">
                      {boughtItemsCount} de {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* Insight de Comparação com Média Histórica (exibido apenas se houver histórico) */}
                  {comparisonInsight.hasHistory && (
                    <div className="pt-2 border-t border-zinc-200/60">
                      {comparisonInsight.status === 'higher' && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center space-x-2 text-xs">
                          <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold text-amber-900 block">
                              {comparisonInsight.formattedDiffText}
                            </span>
                            <span className="text-[10px] text-amber-700 font-normal block mt-0.5">
                              Média recente: {formatCurrencyBRL(comparisonInsight.averageValue)}
                            </span>
                          </div>
                        </div>
                      )}

                      {comparisonInsight.status === 'lower' && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center space-x-2 text-xs">
                          <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-emerald-900 block">
                              {comparisonInsight.formattedDiffText}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-normal block mt-0.5">
                              Média recente: {formatCurrencyBRL(comparisonInsight.averageValue)}
                            </span>
                          </div>
                        </div>
                      )}

                      {comparisonInsight.status === 'consistent' && (
                        <div className="p-2.5 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center space-x-2 text-xs">
                          <Minus className="w-4 h-4 text-zinc-500 shrink-0" />
                          <div>
                            <span className="font-semibold text-zinc-800 block">
                              {comparisonInsight.formattedDiffText}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-normal block mt-0.5">
                              Média recente: {formatCurrencyBRL(comparisonInsight.averageValue)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportPurchaseAsTxt(purchase);
                      showFeedbackToast('Lista exportada com sucesso (.txt)');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-bold text-xs border border-zinc-200/90 shadow-2xs transition-all min-h-[44px] cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4 text-zinc-600" />
                    <span>Exportar Lista de Compras (.txt)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBack()}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-2xs transition-all min-h-[48px] cursor-pointer active:scale-95"
                  >
                    Voltar para a Tela Inicial
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante (FAB) com Speed Dial Animado para Item Único e Adicionar Vários */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-26 sm:bottom-28 right-4 sm:right-6 md:right-[calc(50%-270px)] z-40 flex flex-col items-end">
          {/* Backdrop sutil ao abrir o menu flutuante para fechar com clique fora */}
          <AnimatePresence>
            {isFabMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsFabMenuOpen(false)}
                className="fixed inset-0 z-30 bg-black/25 backdrop-blur-2xs cursor-pointer"
              />
            )}
          </AnimatePresence>

          {/* Opções Flutuantes do Menu (Item Único e Adicionar Vários) */}
          <AnimatePresence>
            {isFabMenuOpen && (
              <div className="relative z-40 flex flex-col items-end space-y-2.5 mb-3">
                {/* Opção 1: Adicionar Vários */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.85 }}
                  transition={{ duration: 0.18, delay: 0.04 }}
                  className="flex items-center space-x-2.5"
                >
                  <span className="bg-zinc-900/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md pointer-events-none whitespace-nowrap">
                    Adicionar Vários
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal('batch')}
                    aria-label="Adicionar vários itens"
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 border border-emerald-200/80 shadow-lg flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  >
                    <Layers className="w-5 h-5" />
                  </button>
                </motion.div>

                {/* Opção 2: Item Único */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.85 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center space-x-2.5"
                >
                  <span className="bg-zinc-900/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md pointer-events-none whitespace-nowrap">
                    Item Único
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal('single')}
                    aria-label="Adicionar item único"
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Botão Principal FAB (+) com rotação animada */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsFabMenuOpen((prev) => !prev)}
            aria-label={isFabMenuOpen ? 'Fechar opções de adicionar' : 'Abrir opções de adicionar item'}
            title={isFabMenuOpen ? 'Fechar' : 'Adicionar itens'}
            className={`relative z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-xl shadow-emerald-950/25 border border-white/30 cursor-pointer transition-all ${
              isFabMenuOpen
                ? 'bg-zinc-800 text-white hover:bg-zinc-900 shadow-zinc-950/30'
                : 'bg-emerald-600/95 hover:bg-emerald-600 active:bg-emerald-700 text-white backdrop-blur-xs'
            }`}
          >
            <motion.div
              animate={{ rotate: isFabMenuOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </motion.div>
          </motion.button>
        </div>
      )}

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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
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
                    <span>Descartar Tudo</span>
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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
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
                  Sua lista possui {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'} e será salva automaticamente.
                </p>

                <form onSubmit={handleSaveNameAndExit} className="mt-4 space-y-4">
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
                    <span>Salvar</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rodapé Fixo / Sticky Bottom Footer (visível apenas quando há itens na lista) */}
      {totalItemsCount > 0 && (
        <div className="sticky bottom-0 z-20 w-full bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] py-3 px-3.5 sm:px-6">
          <div className="w-full max-w-md md:max-w-xl mx-auto space-y-2">
            {/* Resumo compacto em uma linha: valor total e contagem de itens */}
            <div className="flex items-center justify-between text-xs px-0.5">
              <div className="flex items-center space-x-1.5">
                <span className="text-zinc-500 font-medium">Total:</span>
                <span className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                  {formatCurrencyBRL(totalValue)}
                </span>
              </div>
              <div className="text-zinc-600 font-semibold text-xs">
                <span className="text-emerald-700 font-bold">{boughtItemsCount}</span>/{totalItemsCount}{' '}
                {totalItemsCount === 1 ? 'item' : 'itens'}{' '}
                {boughtItemsCount === totalItemsCount ? '✓' : 'comprados'}
              </div>
            </div>

            {/* Botões de Ação do Rodapé */}
            {purchase.status === 'finished' ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onBack()}
                type="button"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all min-h-[48px] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para o Início</span>
              </motion.button>
            ) : purchase.origin === 'manual' ? (
              /* Sessão de Registrar Compra Já Feita: apenas o botão principal de Registrar Compra (sem Guardar Lista) */
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setFinishNameInput('');
                  setIsConfirmFinishOpen(true);
                }}
                type="button"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all min-h-[48px] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Registrar Compra</span>
              </motion.button>
            ) : (
              /* Sessão de Planejamento de Compra: exibe Guardar Lista e Finalizar Compra */
              <div className="grid grid-cols-2 gap-2">
                {/* Botão Guardar Lista */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveListForLater}
                  type="button"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-3 sm:px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 border border-zinc-200/80 font-bold text-xs sm:text-sm transition-all min-h-[48px] cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 text-zinc-600" />
                  <span>Guardar Lista</span>
                </motion.button>

                {/* Botão Finalizar Compra */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFinishNameInput('');
                    setIsConfirmFinishOpen(true);
                  }}
                  type="button"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-3 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all min-h-[48px] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Finalizar Compra</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
