import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Check,
  Pencil,
  Trash2,
  ShoppingBag,
  ShoppingCart,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  Package,
  Layers,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  RotateCcw,
  Loader2,
  MoreVertical,
  Share2,
  Filter,
  ChevronDown,
  Keyboard,
  ClipboardList,
  Store,
  Mic,
  MicOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, Purchase, ItemSuggestion, PricingModeDefault, List } from '../types';
import { normalizeText } from '../services/suggestionsService';
import { useItemSuggestions } from '../hooks/useItemSuggestions';
import { ItemSearchBar } from './ItemSearchBar';
import { PurchaseItemCard } from './PurchaseItemCard';
import { BatchAddModal } from './BatchAddModal';
import { EditItemModal } from './EditItemModal';
import { ImportListModal } from './ImportListModal';
import { AnimatedCurrency } from './AnimatedCurrency';
import { MOTION_TOKENS, MOTION_VARIANTS, useMotionConfig } from '../styles/motionSystem';
import { fireCelebrationConfetti } from './PurchaseCelebrationModal';
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
  purchase?: Purchase | null;
  allPurchases?: Purchase[];
  lists?: List[];
  onBack: (message?: string) => void;
  onDiscardPurchase?: (purchaseId: string) => void;
  onUpdateName?: (purchaseId: string, name: string) => void;
  onAddItem?: (purchaseId: string, itemData: Omit<Item, 'id' | 'bought'> & { bought?: boolean }) => void;
  onEditItem?: (purchaseId: string, itemId: string, updatedData: Partial<Omit<Item, 'id'>>) => void;
  onRemoveItem?: (purchaseId: string, itemId: string) => void;
  onToggleBought?: (purchaseId: string, itemId: string) => void;
  onFinishPurchase?: (purchaseId: string, customName?: string) => void;
}

export function PurchaseScreen({
  userId,
  purchase,
  allPurchases = [],
  lists = [],
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
    purchase && !isDefaultPurchaseName(purchase.name) ? (purchase.name || '') : ''
  );

  useEffect(() => {
    if (purchase) {
      setTitleValue(isDefaultPurchaseName(purchase.name) ? '' : (purchase.name || ''));
    }
  }, [purchase?.name, purchase?.id]);

  // Modais de descarte e finalização
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isPriceWarningModalOpen, setIsPriceWarningModalOpen] = useState(false);
  const [highlightMissingPrices, setHighlightMissingPrices] = useState(false);

  // Desativa o destaque automaticamente assim que todos os itens receberem um preço válido
  useEffect(() => {
    if (highlightMissingPrices) {
      const remainingWithoutPrice = (purchase?.items || []).filter(
        (item) => item.price == null || isNaN(Number(item.price)) || Number(item.price) <= 0
      );
      if (remainingWithoutPrice.length === 0) {
        setHighlightMissingPrices(false);
      }
    }
  }, [purchase?.items, highlightMissingPrices]);

  // Modal de Importação de Molde
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Finish purchase modal states
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);
  const [finishNameInput, setFinishNameInput] = useState('');

  // Modais de Adicionar em Lote e Edição Completa
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Toast feedback hook
  const { showToast } = useToast();

  // Voice processing & recording states for Voice-First bar
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  /**
   * Processa a intenção de voz do usuário utilizando a API do Gemini com Processamento
   * de Linguagem Natural (NLP), substituindo a lógica legada de expressões regulares.
   */
  const processVoiceIntentWithAI = async (transcript: string) => {
    if (!transcript || !transcript.trim()) return;

    if (!purchase || !purchase.id) {
      showToast('Nenhuma compra ativa para adicionar o item');
      return;
    }

    // 1. Ativa estado de carregamento para a UI indicar que a IA está a "pensar"
    setIsProcessingVoice(true);
    showToast('IA analisando o comando de voz...', 2000);

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
      let parsedItem: {
        name: string;
        quantity: number;
        price: number;
        category: string;
      } | null = null;

      const requestBody = {
        system_instruction: {
          parts: [{
            text: 'Você é um assistente de supermercado. Extraia da frase do usuário o nome do produto, quantidade, preço unitário e categoria. Retorne APENAS um JSON estrito com esta estrutura exata: {"name": "Nome Capitalizado", "quantity": numero_ou_1, "price": numero_ou_0, "category": "Categoria"}. Não inclua crases (```json) ou texto adicional.'
          }]
        },
        contents: [
          { role: 'user', parts: [{ text: transcript }] }
        ],
        generationConfig: {
          response_mime_type: 'application/json'
        }
      };

      // 2. Integração com a API do Gemini via fetch POST direto se houver chave cliente
      if (apiKey) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textContent) {
              const cleanText = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
              parsedItem = JSON.parse(cleanText);
            }
          }
        } catch (clientErr) {
          console.warn('Tentativa direta com Gemini API falhou, acionando proxy do servidor:', clientErr);
        }
      }

      // Se não houver chave no cliente ou a chamada direta falhar, recorre à rota proxy /api/voice-parse do servidor
      if (!parsedItem || !parsedItem.name) {
        try {
          const serverRes = await fetch('/api/voice-parse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transcript }),
          });

          if (serverRes.ok) {
            const sData = await serverRes.json();
            const rawText = sData.text || '';
            if (rawText) {
              const cleanServerText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
              parsedItem = JSON.parse(cleanServerText);
            } else if (sData.name) {
              parsedItem = {
                name: sData.name,
                quantity: sData.quantity || 1,
                price: sData.price || 0,
                category: sData.category || 'Geral',
              };
            }
          }
        } catch (serverErr) {
          console.warn('Falha no fallback /api/voice-parse:', serverErr);
        }
      }

      if (!parsedItem || !parsedItem.name) {
        throw new Error('Não foi possível obter dados estruturados da IA');
      }

      // Injeta o item no carrinho com os dados estruturados da IA
      if (onAddItem) {
        const qty = typeof parsedItem.quantity === 'number' && parsedItem.quantity > 0 ? parsedItem.quantity : 1;
        const priceNum = typeof parsedItem.price === 'number' && parsedItem.price > 0 ? parsedItem.price : undefined;
        const categoryStr = parsedItem.category?.trim() || 'Geral';
        const nameStr = parsedItem.name.trim();

        onAddItem(purchase.id, {
          name: nameStr,
          category: categoryStr,
          quantity: qty,
          isWeighted: false,
          price: priceNum,
          bought: Boolean(priceNum && priceNum > 0),
        });

        const formattedQty = `${qty} un`;
        const formattedPrice = priceNum ? ` por ${formatCurrencyBRL(priceNum)}` : '';
        showToast(`"${nameStr}" (${formattedQty}${formattedPrice}) adicionado!`, 3500);
      }
    } catch (err) {
      console.error('Erro na IA do assistente de voz, usando fallback:', err);
      // 3. Fallback: Se a IA falhar ou o JSON vier quebrado, adiciona o item apenas com o nome bruto que a pessoa falou e preço zero
      if (onAddItem && purchase && purchase.id) {
        const rawName = transcript.trim();
        const fallbackName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        onAddItem(purchase.id, {
          name: fallbackName,
          category: 'Geral',
          quantity: 1,
          isWeighted: false,
          price: undefined,
          bought: false,
        });
        showToast(`"${fallbackName}" adicionado à lista.`, 3000);
      }
    } finally {
      // Desativa o loading
      setIsProcessingVoice(false);
    }
  };

  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Reconhecimento de voz não suportado pelo navegador.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          processVoiceIntentWithAI(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Erro ao iniciar reconhecimento de voz:', err);
      setIsRecording(false);
    }
  };

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

  const handleImportList = (list: List) => {
    if (!purchase || !onAddItem) return;
    const itemsToImport = list.items || [];
    if (itemsToImport.length === 0) {
      showToast(`A lista "${list.name}" não possui itens cadastrados.`);
      setIsImportModalOpen(false);
      return;
    }

    itemsToImport.forEach((item) => {
      onAddItem(purchase.id, {
        name: item.name,
        category: item.category || 'Geral',
        quantity: item.quantity ?? (item.isWeighted ? 1 : 1),
        weight: item.weight,
        isWeighted: Boolean(item.isWeighted),
        price: item.price,
        bought: false,
        pricingModeSource: item.pricingModeSource ?? null,
      });
    });

    setIsImportModalOpen(false);
    const count = itemsToImport.length;
    showToast(`${count} ${count === 1 ? 'item importado' : 'itens importados'} da lista "${list.name}"!`);
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
      bought: false,
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
        bought: false,
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
      bought: false,
    });
    showFeedbackToast(`"${suggestion.name}" adicionado à lista`);
  };

  const handleBackClick = () => {
    if (!purchase) {
      onBack();
      return;
    }
    const itemsCount = purchase.items ? purchase.items.length : 0;
    if (purchase.status === 'finished' || itemsCount === 0) {
      if (itemsCount === 0 && purchase.status !== 'finished' && onDiscardPurchase) {
        onDiscardPurchase(purchase.id);
      } else {
        onBack();
      }
      return;
    }

    // Na compra ativa (carrinho), voltar apenas retorna mantendo o estado salvo
    onBack();
  };

  const handleConfirmFinish = () => {
    if (!purchase) return;
    const trimmed = finishNameInput.trim();
    if (trimmed && onUpdateName) {
      onUpdateName(purchase.id, trimmed);
    }
    setIsConfirmFinishOpen(false);
    if (onFinishPurchase) {
      onFinishPurchase(purchase.id, trimmed || undefined);
    }
  };

  if (!purchase || !purchase.id) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center h-full mt-20">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingCart className="w-10 h-10 text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Nenhuma compra em andamento</h2>
        <p className="text-zinc-500 max-w-[250px]">
          Inicie uma nova compra a partir da tela de Início ou de suas Listas.
        </p>
      </div>
    );
  }

  const totalValue = calculatePurchaseTotal(purchase);
  const totalItemsCount = purchase?.items ? purchase.items.length : 0;
  const boughtItemsCount = purchase?.items ? purchase.items.filter((i) => i.bought).length : 0;
  const comparisonInsight = calculateComparisonInsight(purchase, allPurchases);

  // Identifica itens sem preço preenchido (0, nulo ou indefinido)
  const getItemsWithoutPrice = () => {
    if (!purchase?.items) return [];
    return purchase.items.filter(
      (item) => item.price == null || isNaN(Number(item.price)) || Number(item.price) <= 0
    );
  };

  // Execução da finalização da compra no banco de dados e disparo de celebração
  const executeFinalizarCompra = async () => {
    if (isFinishing) return;
    try {
      setIsFinishing(true);
      const trimmed = titleValue.trim();
      if (trimmed && onUpdateName && trimmed !== purchase.name) {
        onUpdateName(purchase.id, trimmed);
      }

      // Disparar animação de celebração
      fireCelebrationConfetti();

      // Finalizar a compra chamando o hook que faz UPDATE no registro existente (NUNCA INSERT)
      if (onFinishPurchase) {
        await onFinishPurchase(purchase.id, trimmed || purchase.name);
      }
    } finally {
      setIsFinishing(false);
      setIsPriceWarningModalOpen(false);
    }
  };

  // Handler de retorno para preenchimento de preços: mantém o destaque visual ativo até que os itens recebam preço
  const handleBackAndFillPrices = () => {
    setIsPriceWarningModalOpen(false);
    setHighlightMissingPrices(true);
  };

  // Handler de conclusão com validações de integridade
  const handleConcluirCompra = async () => {
    if (isFinishing) return;

    // 1. Validação de Carrinho Vazio
    if (totalItemsCount === 0 || !purchase.items || purchase.items.length === 0) {
      showToast('Sua compra está vazia. Adicione itens ou descarte a lista no menu de opções.');
      return;
    }

    // 2. Validação de Itens sem Preço
    const itemsWithoutPrice = getItemsWithoutPrice();
    if (itemsWithoutPrice.length > 0) {
      setIsPriceWarningModalOpen(true);
      return;
    }

    await executeFinalizarCompra();
  };

  // Orçamento (Budget) da compra
  const numericBudget = purchase.budget != null && Number(purchase.budget) > 0 ? Number(purchase.budget) : undefined;
  const percentageUsed = numericBudget ? (totalValue / numericBudget) * 100 : 0;
  const isOverBudget = percentageUsed >= 100;
  const isNearBudget = percentageUsed >= 80 && percentageUsed < 100;

  // Notificação e vibração hápica no exato momento em que o orçamento é extrapolado
  const hasTriggeredOverBudgetToastRef = useRef(false);
  useEffect(() => {
    if (isOverBudget && numericBudget !== undefined && !hasTriggeredOverBudgetToastRef.current) {
      hasTriggeredOverBudgetToastRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {
          // ignore
        }
      }
      showToast(
        `Atenção: Orçamento ultrapassado em ${formatCurrencyBRL(totalValue - numericBudget)}!`,
        3500
      );
    } else if (!isOverBudget) {
      hasTriggeredOverBudgetToastRef.current = false;
    }
  }, [isOverBudget, numericBudget, totalValue, showToast]);

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
                <div className="relative w-full group bg-zinc-50/80 hover:bg-zinc-100/80 focus-within:bg-white border border-dashed border-zinc-300 hover:border-emerald-400 focus-within:border-solid focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-xl px-3 py-1.5 transition-all">
                  <div className="relative flex items-center">
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
                      placeholder="Nome da compra"
                      className="w-full text-sm sm:text-base font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal bg-transparent border-none p-0 pr-6 outline-none leading-tight truncate focus:ring-0"
                    />
                    <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-emerald-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    </div>
                  </div>

                  {purchase?.storeName && (
                    <div className="flex items-center space-x-1 mt-0.5 min-w-0">
                      <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="text-[10px] font-semibold text-emerald-700 truncate">
                        {purchase.storeName}
                      </span>
                    </div>
                  )}
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

            {/* Lado Direito: Menu de Opções (⋮) */}
            <div className="flex items-center shrink-0 relative">
              {/* Menu de 3 Pontinhos (⋮) para Ações Secundárias */}
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
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-50 overflow-hidden"
                      >
                        {/* 1. Importar itens de uma lista salva (Salva-Vidas) */}
                        {purchase.status !== 'finished' && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsImportModalOpen(true);
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                          >
                            <ClipboardList className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Importar itens de uma lista</span>
                          </button>
                        )}

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
                          <span>Descartar lista</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Barra de Progresso do Orçamento (Abaixo do subtotal no topo da tela) */}
        {numericBudget !== undefined && (
          <div className="w-full max-w-md md:max-w-xl mx-auto px-3 sm:px-6 pb-2.5 pt-0">
            <motion.div
              key={isOverBudget ? 'budget-exceeded' : 'budget-ok'}
              initial={isOverBudget ? { x: -8, scale: 0.98 } : false}
              animate={
                isOverBudget
                  ? { x: [0, -7, 7, -5, 5, -3, 3, 0], scale: [1, 1.02, 1] }
                  : { x: 0, scale: 1 }
              }
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 ${
                isOverBudget
                  ? 'bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.55)] animate-pulse'
                  : isNearBudget
                  ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-xs animate-pulse'
                  : 'bg-emerald-50/95 border-emerald-300/80 text-emerald-950 shadow-xs'
              }`}
            >
              {/* Linha superior: Subtotal e R$ X de R$ Y */}
              <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                <div className="flex items-center space-x-1 min-w-0">
                  <span className="font-semibold text-zinc-600 shrink-0">Subtotal:</span>
                  <span
                    className={`font-black text-xs sm:text-sm truncate ${
                      isOverBudget ? 'text-rose-600' : 'text-zinc-900'
                    }`}
                  >
                    {formatCurrencyBRL(totalValue)}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0 text-right">
                  {isOverBudget && (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-bounce shadow-xs">
                      <span>Excedido</span>
                    </span>
                  )}
                  <span
                    className={`font-bold text-xs ${
                      isOverBudget
                        ? 'text-rose-600 font-extrabold'
                        : isNearBudget
                        ? 'text-amber-800 font-extrabold'
                        : 'text-zinc-700'
                    }`}
                  >
                    {formatCurrencyBRL(totalValue)} de {formatCurrencyBRL(numericBudget)}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso visual animada */}
              <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverBudget
                      ? 'bg-rose-500 animate-pulse'
                      : isNearBudget
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round(percentageUsed))}%`,
                  }}
                />
              </div>

              {/* Informação descritiva de limite */}
              <div className="flex items-center justify-between text-[11px] mt-1.5 font-semibold">
                {isOverBudget ? (
                  <span className="text-rose-600 font-bold flex items-center space-x-1 min-w-0 truncate">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce shrink-0" />
                    <span className="truncate">
                      Orçamento excedido em {formatCurrencyBRL(totalValue - numericBudget)}
                    </span>
                  </span>
                ) : (
                  <span className="text-zinc-600 truncate">
                    Restam {formatCurrencyBRL(numericBudget - totalValue)} para atingir o limite
                  </span>
                )}
                <span
                  className={
                    isOverBudget
                      ? 'text-rose-600 font-black'
                      : isNearBudget
                      ? 'text-amber-800 font-bold'
                      : 'text-emerald-700 font-bold'
                  }
                >
                  {Math.round(percentageUsed)}%
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Main Content (Rolagem Livre com padding inferior dinâmico para não sobrepor o rodapé fixo) */}
      <main
        className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:py-4 flex flex-col pb-44 sm:pb-48"
      >
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

                      {purchase.status !== 'finished' && (
                        <button
                          type="button"
                          onClick={() => setIsImportModalOpen(true)}
                          className="bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 mt-4 transition-colors cursor-pointer text-xs sm:text-sm border border-emerald-200/80 shadow-2xs active:scale-95"
                        >
                          <ClipboardList className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Importar itens de uma Lista salva</span>
                        </button>
                      )}
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
                                highlightMissingPrice={highlightMissingPrices}
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

                <div className="flex overflow-x-auto whitespace-nowrap gap-2 pb-2 no-scrollbar scrollbar-hide -mx-1 px-1">
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

      {/* Modal de Adicionar em Lote */}
      <BatchAddModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSubmit={handleSubmitBatch}
      />

      {/* Modal de Importação de Molde */}
      <ImportListModal
        isOpen={isImportModalOpen}
        lists={lists}
        onClose={() => setIsImportModalOpen(false)}
        onImportList={handleImportList}
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
                  Finalizar Compra?
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 text-center mt-0.5">
                  Confira os dados antes de concluir e arquivar esta compra:
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

                {/* Aviso se houver itens não comprados */}
                {totalItemsCount - boughtItemsCount > 0 && (
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
                    Confirmar e Finalizar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação para Descartar Lista do Menu */}
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
                  Descartar lista?
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
                    disabled={isDiscarding}
                    onClick={async () => {
                      if (isDiscarding) return;
                      try {
                        setIsDiscarding(true);
                        if (onDiscardPurchase) {
                          await onDiscardPurchase(purchase.id);
                          showFeedbackToast('Lista de compras descartada');
                        } else {
                          onBack();
                        }
                        setIsDiscardModalOpen(false);
                      } finally {
                        setIsDiscarding(false);
                      }
                    }}
                    className={`w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95 ${
                      isDiscarding ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    <span>{isDiscarding ? 'Descartando...' : 'Descartar Lista'}</span>
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

      {/* Modal de Confirmação: Alerta de Itens sem Preço */}
      <AnimatePresence>
        {isPriceWarningModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isFinishing) setIsPriceWarningModalOpen(false);
            }}
          >
            <motion.div
              {...MOTION_VARIANTS.modalContent}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden relative font-sans"
            >
              {/* Botão Fechar (X) */}
              <button
                type="button"
                disabled={isFinishing}
                onClick={() => setIsPriceWarningModalOpen(false)}
                aria-label="Fechar modal"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-5 pt-6">
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center mb-3.5 mx-auto bg-amber-50 border border-amber-200 text-amber-600 shadow-2xs">
                  <AlertTriangle className="w-6 h-6 stroke-[2.3]" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                  Itens sem preço
                </h3>
                <p className="text-xs text-zinc-600 text-center mt-2 leading-relaxed">
                  Você possui itens no carrinho sem preço preenchido. Isso pode afetar suas análises futuras. Deseja concluir a compra assim mesmo ou voltar para preencher?
                </p>

                {/* Lista contextual de itens sem valor */}
                {(() => {
                  const itemsWithoutPrice = getItemsWithoutPrice();
                  if (itemsWithoutPrice.length === 0) return null;
                  return (
                    <div className="mt-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span>Itens sem valor definido:</span>
                        <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full text-[10px]">
                          {itemsWithoutPrice.length} {itemsWithoutPrice.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      <div className="max-h-24 overflow-y-auto no-scrollbar divide-y divide-amber-100/80 pt-1">
                        {itemsWithoutPrice.slice(0, 5).map((it) => (
                          <div key={it.id} className="py-1 flex items-center justify-between text-zinc-700">
                            <span className="truncate pr-2 font-medium">{it.name}</span>
                            <span className="text-[10px] text-amber-700 font-semibold shrink-0">R$ 0,00</span>
                          </div>
                        ))}
                        {itemsWithoutPrice.length > 5 && (
                          <p className="pt-1 text-[10px] text-amber-800 font-semibold text-center">
                            + {itemsWithoutPrice.length - 5} outro(s) item(ns)
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-5 space-y-2">
                  {/* Botão Secundário: Voltar e preencher */}
                  <button
                    type="button"
                    disabled={isFinishing}
                    onClick={handleBackAndFillPrices}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-bold text-xs sm:text-sm transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <span>Voltar e preencher</span>
                  </button>

                  {/* Botão de Confirmação: Concluir mesmo assim */}
                  <button
                    type="button"
                    disabled={isFinishing}
                    onClick={executeFinalizarCompra}
                    className={`w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95 ${
                      isFinishing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isFinishing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.3]" />
                    )}
                    <span>{isFinishing ? 'Salvando compra...' : 'Concluir mesmo assim'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice-First Bottom Dock - Barra Inferior com Microfone como Rei (FAB Central Estilo Assistente Virtual Siri/Google) */}
      {purchase.status !== 'finished' ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-none">
          {/* Banner flutuante com instrução de fala durante a gravação */}
          <div className="w-full max-w-md md:max-w-xl mx-auto px-4">
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="pointer-events-auto mb-3 px-4 py-2.5 rounded-2xl bg-zinc-900/90 backdrop-blur-md text-white text-xs font-semibold shadow-2xl flex items-center justify-center space-x-2 border border-white/10"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>Ouvindo com atenção... Diga ex: &ldquo;2 caixas de leite por 5 reais&rdquo;</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Painel Expansível de Digitação Discreta */}
          <AnimatePresence>
            {isKeyboardOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.18 }}
                className="pointer-events-auto bg-white/98 backdrop-blur-md border-t border-zinc-200 shadow-2xl px-3.5 sm:px-6 pt-3 pb-2"
              >
                <div className="w-full max-w-md md:max-w-xl mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-700 flex items-center space-x-1.5">
                      <Keyboard className="w-4 h-4 text-emerald-600" />
                      <span>Digitar Item Manualmente</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsKeyboardOpen(false)}
                      className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Fechar digitação"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ItemSearchBar
                    hideVoiceButton={true}
                    dropdownDirection="up"
                    onAddItem={(name, category, isWeighted, pricingModeSource) => {
                      handleAddItemFromSearch(name, category, isWeighted, pricingModeSource);
                    }}
                    onOpenBatchModal={() => setIsBatchModalOpen(true)}
                    getSuggestions={suggestionsHook.getCombinedSuggestions}
                    recordManualItem={suggestionsHook.recordManualItem}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Barra Principal Inferior Voice-First com FAB Central Absoluto estilo Siri/Google Assistant */}
          <div className="pointer-events-auto relative bg-white/95 backdrop-blur-md border-t border-zinc-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 pt-3 pb-8 sm:pb-9">
            <div className="w-full max-w-md md:max-w-xl mx-auto">
              {/* Linha de Resumo Financeiro / Itens no topo da barra */}
              {totalItemsCount > 0 && (
                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-100 mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-zinc-400 font-medium">Total:</span>
                    <span className="text-sm sm:text-base font-black text-zinc-900 tracking-tight">
                      <AnimatedCurrency value={totalValue} />
                    </span>
                  </div>
                  <div className="text-zinc-600 font-semibold text-xs flex items-center space-x-1">
                    <span className="font-bold text-emerald-700">{boughtItemsCount}</span>
                    <span>
                      /{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                </div>
              )}

              {/* Grid Estruturado: Esquerda (Digitar), Centro Absoluto Elevado (Microfone Rei), Direita (Concluir) */}
              <div className="relative flex items-center justify-between min-h-[52px]">
                {/* 1. Lado Esquerdo: Campo / Botão de Digitação Manual Discreto */}
                <div className="flex-1 flex justify-start">
                  <motion.button
                    whileTap={motionConfig.tap.button}
                    transition={motionConfig.pressSpring}
                    type="button"
                    onClick={() => setIsKeyboardOpen((prev) => !prev)}
                    aria-label={isKeyboardOpen ? 'Fechar digitação' : 'Abrir digitação por teclado'}
                    title="Digitação manual"
                    className={`flex items-center space-x-1.5 py-2 px-3 sm:px-4 rounded-2xl border transition-all cursor-pointer min-h-[44px] active:scale-95 ${
                      isKeyboardOpen
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-xs'
                        : 'bg-zinc-100/90 hover:bg-zinc-200/90 text-zinc-600 border-zinc-200/80 hover:text-zinc-900 font-semibold'
                    }`}
                  >
                    <Keyboard className="w-4 h-4 text-zinc-600" />
                    <span className="text-xs">Digitar</span>
                  </motion.button>
                </div>

                {/* 2. Centro: O MICROFONE COMO REI (Elevado para ergonomia de uma mão só / polegar) */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-10 sm:-top-11 flex flex-col items-center z-20 pointer-events-auto">
                  {/* Botão FAB Circular Gigante */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    transition={motionConfig.pressSpring}
                    type="button"
                    onClick={handleToggleVoice}
                    disabled={isProcessingVoice}
                    aria-label={
                      isRecording
                        ? 'Ouvindo áudio... Toque para parar'
                        : isProcessingVoice
                        ? 'IA pensando...'
                        : 'Ditar item por voz'
                    }
                    title={
                      isRecording
                        ? 'Gravando... Toque para parar'
                        : isProcessingVoice
                        ? 'IA pensando...'
                        : 'Ditar item por voz (Assistente Inteligente)'
                    }
                    className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-white shadow-2xl transition-all cursor-pointer border-4 border-white ${
                      isRecording
                        ? 'bg-gradient-to-br from-red-500 to-rose-700 shadow-red-500/50 ring-4 ring-red-400/40 animate-pulse'
                        : isProcessingVoice
                        ? 'bg-gradient-to-br from-emerald-700 to-teal-800 shadow-emerald-800/40 cursor-wait'
                        : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-800 shadow-emerald-600/40 hover:shadow-emerald-600/60 ring-4 ring-emerald-500/20'
                    }`}
                  >
                    {/* Anéis de pulso de voz estilo Siri durante a escuta */}
                    {isRecording && (
                      <>
                        <span className="absolute -inset-2 rounded-full bg-red-500/25 animate-ping pointer-events-none" />
                        <span className="absolute -inset-4 rounded-full bg-red-500/15 animate-pulse pointer-events-none" />
                      </>
                    )}

                    {isProcessingVoice ? (
                      <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-white" />
                    ) : isRecording ? (
                      <Mic className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce stroke-[2.5]" />
                    ) : (
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-8 h-8 rounded-full bg-white/20 blur-xs" />
                        <Mic className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.3] relative z-10" />
                      </div>
                    )}
                  </motion.button>

                  {/* Rótulo de status elegante do assistente */}
                  <span
                    className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-1 text-center select-none ${
                      isRecording
                        ? 'text-red-600 animate-pulse'
                        : isProcessingVoice
                        ? 'text-emerald-700 font-bold animate-pulse'
                        : 'text-zinc-600'
                    }`}
                  >
                    {isRecording ? 'Ouvindo...' : isProcessingVoice ? 'IA Pensando...' : 'Falar Item'}
                  </span>
                </div>

                {/* 3. Lado Direito: Botão Concluir/Finalizar Compra */}
                <div className="flex-1 flex justify-end">
                  <motion.button
                    whileTap={isFinishing ? {} : motionConfig.tap.button}
                    transition={motionConfig.pressSpring}
                    type="button"
                    onClick={handleConcluirCompra}
                    disabled={isFinishing}
                    aria-label="Finalizar Compra"
                    className={`flex items-center space-x-1.5 py-2 px-3 sm:px-4 rounded-2xl border transition-all cursor-pointer min-h-[44px] ${
                      totalItemsCount > 0 && !isFinishing
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-700/20 active:scale-95 border-emerald-600'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 border-zinc-200/80 font-semibold'
                    }`}
                  >
                    {isFinishing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span className="text-xs font-bold">
                      {isFinishing ? 'Salvando...' : 'Concluir'}
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Rodapé de Compra Finalizada (Modo Visualização) */
        <footer className="fixed bottom-0 left-0 right-0 z-30 w-full bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-3.5 sm:px-6 pb-safe">
          <div className="w-full max-w-md md:max-w-xl mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs px-0.5">
              <div className="flex items-center space-x-1.5">
                <span className="text-zinc-500 font-medium">Total:</span>
                <span className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                  <AnimatedCurrency value={totalValue} />
                </span>
              </div>
              <div className="text-zinc-600 font-semibold text-xs flex items-center space-x-1">
                <span>
                  {boughtItemsCount}/{totalItemsCount}{' '}
                  {totalItemsCount === 1 ? 'item' : 'itens'} comprados
                </span>
              </div>
            </div>
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
          </div>
        </footer>
      )}
    </div>
  );
}
