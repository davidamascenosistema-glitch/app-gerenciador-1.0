import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, Purchase } from '../types';
import {
  calculateItemSubtotal,
  calculatePurchaseTotal,
  formatCurrencyBRL,
  parseBatchItemsInput,
  calculateComparisonInsight,
  exportPurchaseAsTxt,
  getFilteredQuickSuggestions,
} from '../utils/purchaseHelpers';

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
  onBack: () => void;
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
  onUpdateName,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onToggleBought,
  onFinishPurchase,
}: PurchaseScreenProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(purchase.name || 'Nova compra');

  // Finish purchase modal states
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);
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

  // Toast feedback state
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Receipt Photo & Mode State (for origin === 'manual')
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [registrationMode, setRegistrationMode] = useState<'choose' | 'manual' | 'photo'>(
    purchase.origin === 'manual' && (!purchase.items || purchase.items.length === 0) ? 'choose' : 'manual'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedbackToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast((current) => (current === msg ? null : current));
    }, 3000);
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
        showFeedbackToast('Foto da nota fiscal capturada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Save Title Handle
  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    const finalName = trimmed || 'Nova compra';
    setTitleValue(finalName);
    onUpdateName(purchase.id, finalName);
    setIsEditingTitle(false);
  };

  // Open Modal for Create
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setModalTab('single');
    setBatchText('');
    setItemName('');
    setCategory('Geral');
    setQuantity(1);
    setPriceStr('');
    setIsWeighted(false);
    setWeightStr('');
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

  const handleConfirmFinish = () => {
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
      {/* Header */}
      <header className="w-full bg-white border-b border-zinc-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <button
              onClick={onBack}
              aria-label="Voltar"
              className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 active:bg-zinc-300 flex items-center justify-center text-zinc-700 transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              {isEditingTitle ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    autoFocus
                    className="w-full text-base sm:text-lg font-bold text-zinc-900 bg-zinc-100 border border-emerald-500 rounded-lg px-2 py-0.5 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveTitle}
                    aria-label="Salvar título"
                    className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 cursor-pointer group min-h-[44px] py-1" onClick={() => setIsEditingTitle(true)}>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 line-clamp-2 break-words leading-tight">
                    {purchase.name || 'Nova compra'}
                  </h1>
                  <Pencil className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 shrink-0 transition-colors" />
                </div>
              )}
              <div className="flex items-center space-x-1.5 mt-0.5">
                {purchase.status === 'finished' ? (
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Finalizada</span>
                  </span>
                ) : purchase.origin === 'manual' ? (
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="w-2.5 h-2.5 text-amber-700" />
                    <span>Registro de compra realizada</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    purchase.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    <Clock className="w-2.5 h-2.5" />
                    <span>{purchase.status === 'in_progress' ? 'Em andamento' : 'Planejamento'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Botão de Exportar TXT */}
            <button
              type="button"
              onClick={() => {
                if (!purchase.items || purchase.items.length === 0) {
                  showFeedbackToast('Sua compra ainda não possui itens para exportar');
                  return;
                }
                exportPurchaseAsTxt(purchase);
                showFeedbackToast('Lista de compras exportada (.txt)');
              }}
              title="Exportar lista de compras em arquivo .txt"
              aria-label="Exportar lista de compras em formato .txt"
              className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 active:bg-zinc-300 flex items-center justify-center text-zinc-700 transition-colors shrink-0 cursor-pointer active:scale-95 min-h-[44px] min-w-[44px]"
            >
              <Download className="w-5 h-5 text-zinc-700" />
            </button>

            {/* Finalizar Compra Button */}
            {totalItemsCount > 0 ? (
              <button
                type="button"
                onClick={() => setIsConfirmFinishOpen(true)}
                title="Finalizar esta compra"
                className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-white font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95 min-h-[44px] flex items-center space-x-1.5 ${
                  purchase.origin === 'manual'
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md ring-2 ring-emerald-400 ring-offset-1'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-2xs'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar</span>
              </button>
            ) : (
              <button
                disabled
                title="Adicione pelo menos 1 item para finalizar a compra"
                className="px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-zinc-200 text-zinc-400 font-bold text-xs shrink-0 cursor-not-allowed opacity-80 min-h-[44px] flex items-center"
              >
                Finalizar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-4 sm:py-6 flex flex-col">
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
                onClick={() => setRegistrationMode('manual')}
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
            ) : (
              /* Photo Preview Area */
              <div>
                <div className="relative w-full rounded-xl overflow-hidden border border-zinc-200 bg-zinc-950/90 shadow-inner flex items-center justify-center min-h-[220px] max-h-[380px] p-2">
                  <img
                    src={receiptImage}
                    alt="Prévia da Nota Fiscal"
                    className="max-h-[360px] w-auto max-w-full object-contain rounded-lg shadow-md"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {/* Analisar Nota Button */}
                  <button
                    type="button"
                    onClick={() => showFeedbackToast('Em breve: leitura automática da nota')}
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

        {/* Financial & Items Summary Card */}
        <div className="mb-4 w-full rounded-2xl bg-white border border-zinc-200/90 p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total Estimado</p>
              <p className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                {formatCurrencyBRL(totalValue)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Progresso</p>
            <p className="text-sm font-bold text-zinc-800">
              <span className="text-emerald-700 font-extrabold">{boughtItemsCount}</span> / {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
            </p>
          </div>
        </div>

        {/* Action Button: Add Item */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleOpenAddModal}
          className="mb-4 w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-2xs transition-all min-h-[48px] cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Adicionar Item</span>
        </motion.button>

        {/* Items List or Empty State */}
        {totalItemsCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center bg-white rounded-2xl border border-zinc-200/80 p-6 my-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">Sua lista está vazia</h3>
            <p className="text-xs text-zinc-500 max-w-xs mb-4">
              Comece adicionando os itens que deseja comprar ou pesquisar preços.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200/80 transition-colors min-h-[44px] cursor-pointer active:scale-95"
            >
              + Adicionar primeiro item
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {purchase.items.map((item) => {
              const subtotal = calculateItemSubtotal(item);
              const badgeStyle = getCategoryBadgeStyle(item.category);

              return (
                <div
                  key={item.id}
                  className={`w-full rounded-xl border transition-all p-3.5 flex items-center justify-between gap-3 ${
                    item.bought
                      ? 'bg-zinc-100/70 border-zinc-200/70 text-zinc-500'
                      : 'bg-white border-zinc-200/90 shadow-2xs text-zinc-900'
                  }`}
                >
                  {/* Checkbox + Name + Category + Qty */}
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleBought(purchase.id, item.id)}
                      aria-label={item.bought ? 'Marcar como não comprado' : 'Marcar como comprado'}
                      className="w-11 h-11 flex items-center justify-center shrink-0 cursor-pointer rounded-xl hover:bg-zinc-100/80 active:scale-95 transition-all"
                    >
                      <div
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                          item.bought
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                            : 'border-zinc-300 bg-white hover:border-emerald-500'
                        }`}
                      >
                        {item.bought && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`text-sm font-bold leading-snug break-words line-clamp-2 ${item.bought ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                          {item.name}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-zinc-500 mt-1 font-medium">
                        {item.isWeighted ? (
                          <>
                            <span>
                              Peso: <strong className="text-zinc-800 font-bold">{item.weight ? item.weight.toString().replace('.', ',') : item.quantity} kg</strong>
                            </span>
                            {item.price ? (
                              <span>
                                R$/kg: <strong className="text-zinc-800 font-bold">{formatCurrencyBRL(item.price).replace(/^R\$\s?/, '')}</strong>
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <span>
                              Qtd: <strong className="text-zinc-800 font-bold">{item.quantity}</strong>
                            </span>
                            {item.price ? (
                              <span>
                                Un: <strong className="text-zinc-800 font-bold">{formatCurrencyBRL(item.price)}</strong>
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subtotal & Action Buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {item.price ? (
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-400 uppercase font-medium">Subtotal</p>
                        <p className={`text-xs sm:text-sm font-extrabold ${item.bought ? 'text-zinc-500' : 'text-zinc-900'}`}>
                          {formatCurrencyBRL(subtotal)}
                        </p>
                      </div>
                    ) : null}

                    <div className="flex items-center space-x-1 pl-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        title="Editar item"
                        className="p-2 rounded-lg text-zinc-500 hover:text-emerald-700 hover:bg-zinc-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onRemoveItem(purchase.id, item.id)}
                        title="Remover item"
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

                    {/* Sugestões Rápidas */}
                    {!editingItem && availableSuggestions.length > 0 && (
                      <div className="pt-3.5 border-t border-zinc-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Sugestões rápidas</span>
                          </label>
                          <span className="text-[10px] text-zinc-400 font-medium">Toque para adicionar</span>
                        </div>

                        <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none snap-x">
                          {availableSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleAddQuickSuggestion(suggestion)}
                              className="px-3.5 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200/80 text-emerald-800 text-xs font-bold shrink-0 cursor-pointer transition-all active:scale-95 flex items-center space-x-1 min-h-[38px] snap-start shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden"
            >
              <div className="p-5">
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
                    onClick={onBack}
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

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 backdrop-blur-xs text-white px-4 py-2.5 rounded-full text-xs font-medium shadow-lg flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200/80 bg-white py-3 mt-4">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 text-center text-[11px] text-zinc-400">
          Gerenciador de Compras &copy; {new Date().getFullYear()} &bull; Mobile First
        </div>
      </footer>
    </div>
  );
}
