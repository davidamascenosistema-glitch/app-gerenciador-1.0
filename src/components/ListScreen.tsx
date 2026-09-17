import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Download,
  Trash2,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  Plus,
  Filter,
  Play,
  ClipboardList,
  MoreVertical,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { List, ListItem, ItemSuggestion, Purchase, PricingModeDefault } from '../types';
import { ItemSearchBar } from './ItemSearchBar';
import { ListItemCard } from './ListItemCard';
import { BatchAddModal } from './BatchAddModal';
import { StartPurchaseModal } from './StartPurchaseModal';
import { useItemSuggestions } from '../hooks/useItemSuggestions';
import {
  groupItemsByCategory,
  parseBatchItemsInput,
  resolvePricingMode,
  formatDateBRL,
} from '../utils/purchaseHelpers';
import { useMotionConfig } from '../styles/motionSystem';
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
    case 'Alimentos':
      return 'bg-emerald-400';
    case 'Bebidas':
      return 'bg-blue-400';
    case 'Limpeza':
      return 'bg-cyan-400';
    case 'Higiene':
      return 'bg-purple-400';
    case 'Açougue':
      return 'bg-rose-400';
    case 'Frutas/Legumes':
      return 'bg-lime-400';
    case 'Frios':
      return 'bg-orange-400';
    case 'Padaria':
      return 'bg-amber-400';
    case 'Hortifruti':
      return 'bg-teal-400';
    case 'Geral':
    default:
      return 'bg-zinc-400';
  }
};

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

interface ListScreenProps {
  userId?: string | null;
  list: List;
  allPurchases?: Purchase[];
  onBack: () => void;
  onSaveList?: (list: List) => Promise<boolean | void> | void;
  onUpdateName: (listId: string, name: string) => void;
  onAddItem: (listId: string, itemData: Omit<ListItem, 'id'>) => void;
  onEditItem: (listId: string, itemId: string, updates: Partial<ListItem>) => void;
  onRemoveItem: (listId: string, itemId: string) => void;
  onDeleteList: (listId: string) => void;
  onStartPurchaseFromList: (list: List) => void;
}

export function ListScreen({
  userId,
  list,
  allPurchases = [],
  onBack,
  onSaveList,
  onUpdateName,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onDeleteList,
  onStartPurchaseFromList,
}: ListScreenProps) {
  const motionConfig = useMotionConfig();
  const suggestionsHook = useItemSuggestions(userId, allPurchases);
  const { showToast } = useToast();

  const [titleValue, setTitleValue] = useState(list.name || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleValue(list.name || '');
  }, [list.name]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Modais e menus
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStartPurchaseModalOpen, setIsStartPurchaseModalOpen] = useState(false);

  // Filtro por categorias e accordion
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  const toggleCategoryFilter = (category: string) => {
    setActiveCategoryFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const toggleSectionCollapse = (category: string) => {
    setCollapsedSections((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Fechar menu de 3 pontinhos com scroll ou Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleScrollOrResize = () => setIsMenuOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('touchmove', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('touchmove', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Salvar título da lista
  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== list.name) {
      onUpdateName(list.id, trimmed);
      showToast(`Nome da lista alterado para "${trimmed}"`);
    } else {
      setTitleValue(list.name || 'Nova Lista');
    }
  };

  // Adicionar item direto da barra de pesquisa
  const handleAddItemFromSearch = (
    name: string,
    category: string = 'Geral',
    isWeighted: boolean = false,
    pricingModeSource?: PricingModeDefault | null
  ) => {
    const cleanName = normalizeText(name);
    const existingItem = (list.items || []).find(
      (item) => normalizeText(item.name) === cleanName
    );

    if (existingItem) {
      if (existingItem.isWeighted) {
        const rawWeight = existingItem.weight ?? existingItem.quantity ?? 1;
        const currentWeight = typeof rawWeight === 'string' ? parseFloat(String(rawWeight).replace(',', '.')) : Number(rawWeight || 1);
        const newWeight = Math.round(((isNaN(currentWeight) ? 1 : currentWeight) + 1) * 1000) / 1000;
        onEditItem(list.id, existingItem.id, { isWeighted: true, weight: newWeight });
        showToast(`"${existingItem.name}" +1kg (Total: ${newWeight.toString().replace('.', ',')} kg)`);
      } else {
        const rawQty = existingItem.quantity || 1;
        const currentQty = typeof rawQty === 'string' ? parseInt(String(rawQty), 10) : Number(rawQty || 1);
        const newQty = (isNaN(currentQty) ? 1 : currentQty) + 1;
        onEditItem(list.id, existingItem.id, { isWeighted: false, quantity: newQty });
        showToast(`"${existingItem.name}" +1 un (Total: ${newQty})`);
      }
      return;
    }

    onAddItem(list.id, {
      name,
      category,
      isWeighted,
      weight: isWeighted ? 1 : undefined,
      pricingModeSource,
      quantity: 1,
    });
    showToast(`"${name}" adicionado à lista`);
  };

  // Adicionar em lote
  const handleSubmitBatch = (batchText: string) => {
    const parsed = parseBatchItemsInput(batchText);
    if (parsed.length === 0) return;

    parsed.forEach((item) => {
      const isWeighted = Boolean(item.isWeighted);
      onAddItem(list.id, {
        name: item.name,
        category: item.category || 'Geral',
        quantity: item.quantity || 1,
        isWeighted,
        weight: isWeighted ? 1 : undefined,
      });
    });

    showToast(`${parsed.length} ${parsed.length === 1 ? 'item adicionado' : 'itens adicionados'} à lista`);
  };

  // Sugestões rápidas
  const alreadyAddedNames = (list.items || []).map((i) => i.name);
  const availableSuggestions = suggestionsHook.getQuickSuggestions(alreadyAddedNames, 6);

  const handleAddQuickSuggestion = (suggestion: ItemSuggestion) => {
    const cleanName = normalizeText(suggestion.name);
    const existingItem = (list.items || []).find(
      (item) => normalizeText(item.name) === cleanName
    );

    if (existingItem) {
      if (existingItem.isWeighted) {
        const rawWeight = existingItem.weight ?? existingItem.quantity ?? 1;
        const currentWeight = typeof rawWeight === 'string' ? parseFloat(String(rawWeight).replace(',', '.')) : Number(rawWeight || 1);
        const newWeight = Math.round(((isNaN(currentWeight) ? 1 : currentWeight) + 1) * 1000) / 1000;
        onEditItem(list.id, existingItem.id, { isWeighted: true, weight: newWeight });
        showToast(`"${existingItem.name}" +1kg (Total: ${newWeight.toString().replace('.', ',')} kg)`);
      } else {
        const rawQty = existingItem.quantity || 1;
        const currentQty = typeof rawQty === 'string' ? parseInt(String(rawQty), 10) : Number(rawQty || 1);
        const newQty = (isNaN(currentQty) ? 1 : currentQty) + 1;
        onEditItem(list.id, existingItem.id, { isWeighted: false, quantity: newQty });
        showToast(`"${existingItem.name}" +1 un (Total: ${newQty})`);
      }
      return;
    }

    const { isWeighted, pricingModeSource } = resolvePricingMode(suggestion.defaultPricingMode);

    onAddItem(list.id, {
      name: suggestion.name,
      category: suggestion.category,
      quantity: 1,
      isWeighted,
      weight: isWeighted ? 1 : undefined,
      pricingModeSource,
    });
    showToast(`"${suggestion.name}" adicionado`);
  };

  // Compartilhar texto da lista (sem valores financeiros)
  const generateListText = () => {
    const categoriesMap: Record<string, ListItem[]> = {};
    (list.items || []).forEach((item) => {
      const cat = item.category || 'Geral';
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(item);
    });

    const lines: string[] = [];
    lines.push(`📝 LISTA DE COMPRAS: ${list.name}`);
    lines.push(`Total de itens: ${(list.items || []).length}`);
    lines.push('----------------------------------------\n');

    Object.keys(categoriesMap)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .forEach((cat) => {
        lines.push(`[${cat.toUpperCase()}]`);
        categoriesMap[cat].forEach((i) => {
          const qtyText = i.isWeighted
            ? `${(i.weight || i.quantity || 1).toString().replace('.', ',')} kg`
            : `${i.quantity || 1} un`;
          lines.push(`• ${i.name} - ${qtyText}`);
        });
        lines.push('');
      });

    return lines.join('\n');
  };

  const handleShareList = async () => {
    setIsMenuOpen(false);
    if (!list.items || list.items.length === 0) {
      showToast('Sua lista não possui itens para compartilhar');
      return;
    }

    const text = generateListText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: list.name,
          text,
        });
        showToast('Lista compartilhada com sucesso!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await copyToClipboard(text);
        }
      }
    } else {
      await copyToClipboard(text);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast('Lista copiada para a área de transferência!');
    } catch {
      showToast('Não foi possível copiar o texto');
    }
  };

  const handleExportTxt = () => {
    setIsMenuOpen(false);
    if (!list.items || list.items.length === 0) {
      showToast('Sua lista não possui itens para exportar');
      return;
    }

    const text = generateListText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitized = list.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.download = `${sanitized || 'lista'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Lista exportada (.txt)');
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
    onDeleteList(list.id);
  };

  const handleSaveAndFinish = async () => {
    if (onSaveList) {
      await onSaveList(list);
    }
    showToast('Lista salva com sucesso!');
    onBack();
  };

  const handleBack = () => {
    if (onSaveList && list.items && list.items.length > 0) {
      onSaveList(list);
    }
    onBack();
  };

  const allSections = groupItemsByCategory(list.items || []);
  const visibleSections =
    activeCategoryFilters.length > 0
      ? allSections.filter((s) => activeCategoryFilters.includes(s.category))
      : allSections;

  const totalItemsCount = list.items ? list.items.length : 0;
  const totalCategoriesCount = allSections.length;

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Topo Fixo: Header + Barra de Pesquisa */}
      <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
        <header className="w-full">
          <div className="w-full max-w-md md:max-w-xl mx-auto px-3 py-2.5 sm:px-6 flex items-center justify-between gap-2">
            {/* Lado Esquerdo: Botão Voltar + Nome da Lista */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <button
                onClick={handleBack}
                aria-label="Voltar para início"
                className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex-1">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') {
                        setTitleValue(list.name || '');
                        setIsEditingTitle(false);
                      }
                    }}
                    placeholder="Nome da lista"
                    className="w-full text-base sm:text-lg font-bold text-zinc-900 bg-white border border-emerald-500 rounded-lg px-2 py-0.5 outline-none shadow-2xs"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingTitle(true)}
                    className="cursor-pointer group flex items-center space-x-1.5"
                    title="Toque para editar o nome da lista"
                  >
                    <h1 className="text-base sm:text-lg font-bold text-zinc-900 truncate group-hover:text-emerald-700 transition-colors">
                      {list.name || 'Nova Lista'}
                    </h1>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
                  <span className="font-semibold text-emerald-700">Molde de Planejamento</span>
                  <span>•</span>
                  <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}</span>
                </div>
              </div>
            </div>

            {/* Lado Direito: Menu 3 Pontos */}
            <div className="flex items-center space-x-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Mais opções da lista"
                  className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-50 overflow-hidden"
                      >
                        {/* Salvar lista */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleSaveAndFinish();
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                          <span>Salvar lista</span>
                        </button>

                        {/* Compartilhar */}
                        <button
                          type="button"
                          onClick={handleShareList}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Share2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Compartilhar lista</span>
                        </button>

                        {/* Exportar lista */}
                        <button
                          type="button"
                          onClick={handleExportTxt}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Exportar lista (.txt)</span>
                        </button>

                        <div className="h-px bg-zinc-100 my-1" />

                        {/* Excluir Molde */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                          <span>Excluir este molde</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Barra de Pesquisa Fixa */}
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3 sm:px-6 pb-2.5 pt-0.5">
          <ItemSearchBar
            onAddItem={handleAddItemFromSearch}
            onOpenBatchModal={() => setIsBatchModalOpen(true)}
            getSuggestions={suggestionsHook.getCombinedSuggestions}
            recordManualItem={suggestionsHook.recordManualItem}
          />
        </div>
      </div>

      {/* Conteúdo Principal com rolagem livre */}
      <main
        className={`flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:py-4 flex flex-col ${
          totalItemsCount > 0 ? 'pb-28 sm:pb-32' : 'pb-6'
        }`}
      >
        <div className="space-y-3">
          {/* Filtro horizontal por categoria */}
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
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-bold shrink-0 whitespace-nowrap cursor-pointer transition-all ${
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

          {/* Lista de seções e cards */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {totalItemsCount === 0 ? (
                <motion.div
                  key="empty-state-list"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2 }}
                  className="w-full flex flex-col items-center justify-center py-8 sm:py-10 px-4 sm:px-6 text-center bg-white rounded-3xl border border-zinc-200/80 my-2 shadow-2xs"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-2xs">
                    <ClipboardList className="w-7 h-7" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">
                    Seu molde está sem itens
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mb-4">
                    Adicione os produtos que você costuma comprar com frequência usando a barra de busca acima.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(true)}
                    className="py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar em lote</span>
                  </button>
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
                    {/* Header do Accordion da Categoria */}
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse(section.category)}
                      className="flex items-center gap-2 px-1 pt-1.5 pb-0.5 w-full cursor-pointer"
                    >
                      <span className={`w-1 h-3.5 rounded-full shrink-0 ${getCategoryAccentBarClass(section.category)}`} />
                      <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide">
                        {section.category}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {section.items.length} {section.items.length === 1 ? 'item' : 'itens'}
                      </span>
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
                          <ListItemCard
                            key={item.id}
                            item={item}
                            listId={list.id}
                            onEditItem={onEditItem}
                            onRemoveItem={(lId, iId) => {
                              onRemoveItem(lId, iId);
                              showToast(`"${item.name}" removido`);
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

          {/* Sugestões rápidas (quando tem 0 a 2 itens) */}
          {totalItemsCount <= 2 && availableSuggestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-3 sm:p-4 shadow-2xs mt-3">
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
      </main>

      {/* Rodapé Fixo com Botão de Ação: Iniciar Compra */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-200 flex flex-row gap-3 w-full z-30">
          <motion.button
            whileTap={motionConfig.tap.button}
            transition={motionConfig.pressSpring}
            type="button"
            onClick={handleSaveAndFinish}
            className="flex-1 h-12 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>Salvar Lista</span>
          </motion.button>

          <motion.button
            whileTap={motionConfig.tap.button}
            transition={motionConfig.pressSpring}
            type="button"
            onClick={() => setIsStartPurchaseModalOpen(true)}
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Iniciar Compra</span>
          </motion.button>
        </div>
      )}

      {/* Modal de Adicionar em Lote */}
      <BatchAddModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSubmit={handleSubmitBatch}
      />

      {/* Modal de Inicialização de Compra */}
      <StartPurchaseModal
        isOpen={isStartPurchaseModalOpen}
        lists={[list]}
        selectedListId={list.id}
        onClose={() => setIsStartPurchaseModalOpen(false)}
        onStartPurchase={async (params) => {
          if (onSaveList && list.items) {
            await onSaveList(list);
          }
          setIsStartPurchaseModalOpen(false);
          onStartPurchaseFromList({
            ...list,
            name: params.name || list.name,
          });
        }}
      />

      {/* Modal de Confirmação de Exclusão da Lista */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-10 w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl border border-zinc-200 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-1">
                Excluir este molde de lista?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed mb-5">
                A lista "{list.name}" e seus {totalItemsCount} itens serão removidos permanentemente.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                >
                  Sim, excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
