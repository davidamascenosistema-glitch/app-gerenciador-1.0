import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Download,
  Trash2,
  ChevronDown,
  Sparkles,
  Plus,
  Filter,
  Play,
  ClipboardList,
  MoreVertical,
  Check,
  Pencil,
  Keyboard,
  Mic,
  Loader2,
  X,
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
  MAX_VOICE_TRANSCRIPT_LENGTH,
  stripHtmlAndSanitizeText,
  sanitizeItemName,
  sanitizeItemCategory,
  validateItemQuantity,
  parseVoiceFallbackLocally,
} from '../utils/purchaseHelpers';
import { useMotionConfig } from '../styles/motionSystem';
import { useToast } from './Toast';

const getCategoryBadgeStyle = (category: string) => {
  switch (category) {
    case 'Alimentos':
    case 'Mercearia':
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
    case 'Mercearia':
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

const getCategorySectionContainerClass = (category: string) => {
  switch (category) {
    case 'Alimentos':
    case 'Mercearia':
      return 'bg-emerald-50/60 border-emerald-200/70';
    case 'Bebidas':
      return 'bg-blue-50/60 border-blue-200/70';
    case 'Limpeza':
      return 'bg-cyan-50/60 border-cyan-200/70';
    case 'Higiene':
      return 'bg-purple-50/60 border-purple-200/70';
    case 'Açougue':
      return 'bg-rose-50/60 border-rose-200/70';
    case 'Frutas/Legumes':
      return 'bg-lime-50/60 border-lime-200/70';
    case 'Frios':
      return 'bg-orange-50/60 border-orange-200/70';
    case 'Padaria':
      return 'bg-amber-50/60 border-amber-200/70';
    case 'Hortifruti':
      return 'bg-teal-50/60 border-teal-200/70';
    case 'Geral':
    default:
      return 'bg-zinc-100/90 border-zinc-200/80';
  }
};

const getCategoryHeaderClass = (category: string) => {
  switch (category) {
    case 'Alimentos':
    case 'Mercearia':
      return 'bg-emerald-500/15 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-950';
    case 'Bebidas':
      return 'bg-blue-500/15 hover:bg-blue-500/20 border-blue-500/30 text-blue-950';
    case 'Limpeza':
      return 'bg-cyan-500/15 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-950';
    case 'Higiene':
      return 'bg-purple-500/15 hover:bg-purple-500/20 border-purple-500/30 text-purple-950';
    case 'Açougue':
      return 'bg-rose-500/15 hover:bg-rose-500/20 border-rose-500/30 text-rose-950';
    case 'Frutas/Legumes':
      return 'bg-lime-500/15 hover:bg-lime-500/20 border-lime-500/30 text-lime-950';
    case 'Frios':
      return 'bg-orange-500/15 hover:bg-orange-500/20 border-orange-500/30 text-orange-950';
    case 'Padaria':
      return 'bg-amber-500/15 hover:bg-amber-500/20 border-amber-500/30 text-amber-950';
    case 'Hortifruti':
      return 'bg-teal-500/15 hover:bg-teal-500/20 border-teal-500/30 text-teal-950';
    case 'Geral':
    default:
      return 'bg-zinc-500/15 hover:bg-zinc-500/20 border-zinc-500/30 text-zinc-900';
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
  onAddItemsBatch?: (listId: string, itemsData: Array<Omit<ListItem, 'id'>>) => Promise<void> | void;
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
  onAddItemsBatch,
  onEditItem,
  onRemoveItem,
  onDeleteList,
  onStartPurchaseFromList,
}: ListScreenProps) {
  const motionConfig = useMotionConfig();
  const suggestionsHook = useItemSuggestions(userId, allPurchases);
  const { showToast } = useToast();

  const [titleValue, setTitleValue] = useState(list.name || '');

  useEffect(() => {
    setTitleValue(list.name || '');
  }, [list.name, list.id]);

  // Modais e menus
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStartPurchaseModalOpen, setIsStartPurchaseModalOpen] = useState(false);

  // Voice-First e Digitação states (padronizados com PurchaseScreen.tsx)
  const VOICE_COOLDOWN_MS = 3000;
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceCooldown, setIsVoiceCooldown] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const lastVoiceCallTimeRef = useRef<number>(0);
  const voiceCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptBufferRef = useRef<string>('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasProcessedRef = useRef<boolean>(false);

  const startVoiceCooldown = () => {
    lastVoiceCallTimeRef.current = Date.now();
    setIsVoiceCooldown(true);
    if (voiceCooldownTimerRef.current) {
      clearTimeout(voiceCooldownTimerRef.current);
    }
    voiceCooldownTimerRef.current = setTimeout(() => {
      setIsVoiceCooldown(false);
      voiceCooldownTimerRef.current = null;
    }, VOICE_COOLDOWN_MS);
  };

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (voiceCooldownTimerRef.current) {
        clearTimeout(voiceCooldownTimerRef.current);
      }
    };
  }, []);

  /**
   * Processa comando de voz na Lista Planejada ignorando qualquer valor financeiro
   * e salvando apenas nome, quantidade, tipo (unidade/peso) e categoria.
   */
  const processVoiceIntentWithAI = async (transcript: string) => {
    if (!transcript || !transcript.trim()) return;

    const now = Date.now();
    if (
      isProcessingVoice ||
      isVoiceCooldown ||
      now - lastVoiceCallTimeRef.current < VOICE_COOLDOWN_MS
    ) {
      showToast('Aguarde 3 segundos antes de enviar outro comando de voz.', 2500);
      return;
    }

    const sanitizedTranscript = stripHtmlAndSanitizeText(transcript, MAX_VOICE_TRANSCRIPT_LENGTH);
    if (!sanitizedTranscript) return;

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      const localParsed = parseVoiceFallbackLocally(sanitizedTranscript);
      if (!localParsed) {
        showToast('Diga o nome do produto. Ex: 2 pacotes de arroz', 3500);
        return;
      }

      startVoiceCooldown();

      onAddItem(list.id, {
        name: localParsed.name,
        category: localParsed.category,
        quantity: localParsed.isWeighted ? 1 : localParsed.quantity,
        weight: localParsed.isWeighted ? localParsed.quantity : undefined,
        isWeighted: localParsed.isWeighted,
      });

      const formattedQty = localParsed.isWeighted
        ? `${localParsed.quantity} kg`
        : `${localParsed.quantity} un`;
      showToast(`"${localParsed.name}" (${formattedQty}) adicionado à lista!`, 3500);
      return;
    }

    startVoiceCooldown();
    setIsProcessingVoice(true);
    showToast('IA analisando o comando de voz...', 2000);

    try {
      let parsedItem: {
        name?: unknown;
        quantity?: unknown;
        category?: unknown;
        is_weighted?: unknown;
        isWeighted?: unknown;
      } | null = null;

      let rateLimitedByServer = false;
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 3000);

      try {
        const serverRes = await fetch('/api/voice-parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transcript: sanitizedTranscript }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (serverRes.status === 429 || serverRes.status === 413) {
          rateLimitedByServer = true;
          const errData = await serverRes.json().catch(() => ({}));
          showToast(
            errData?.error || 'Muitas solicitações seguidas. Aguarde alguns segundos.',
            3500
          );
          return;
        }

        if (serverRes.ok) {
          const sData = await serverRes.json();
          if (sData.item && sData.item.name) {
            parsedItem = sData.item;
          } else if (sData.name) {
            parsedItem = {
              name: sData.name,
              quantity: sData.quantity ?? 1,
              category: sData.category ?? 'Geral',
              is_weighted: sData.is_weighted ?? false,
            };
          } else if (sData.text) {
            const cleanServerText = sData.text.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedItem = JSON.parse(cleanServerText);
          }
        }
      } catch (serverErr: any) {
        clearTimeout(timeoutId);
        console.warn('Falha ou timeout (>3s) em /api/voice-parse na Lista:', serverErr?.name || serverErr);
      }

      if (rateLimitedByServer) return;

      if (!parsedItem || !parsedItem.name) {
        parsedItem = parseVoiceFallbackLocally(sanitizedTranscript);
      }

      if (!parsedItem || !parsedItem.name) {
        showToast('Diga o nome do produto. Ex: 2 pacotes de arroz', 3500);
        return;
      }

      const nameStr = sanitizeItemName(parsedItem.name);
      if (!nameStr) {
        showToast('Diga o nome do produto. Ex: 2 pacotes de arroz', 3500);
        return;
      }
      const qty = validateItemQuantity(parsedItem.quantity, 1);
      const categoryStr = sanitizeItemCategory(parsedItem.category, 'Geral');
      const isWeightedItem = Boolean(
        (parsedItem as any).is_weighted || (parsedItem as any).isWeighted
      );

      // Ignora qualquer valor financeiro na Lista Planejada
      onAddItem(list.id, {
        name: nameStr,
        category: categoryStr,
        quantity: isWeightedItem ? 1 : qty,
        weight: isWeightedItem ? qty : undefined,
        isWeighted: isWeightedItem,
      });

      const formattedQty = isWeightedItem ? `${qty} kg` : `${qty} un`;
      showToast(`"${nameStr}" (${formattedQty}) adicionado à lista!`, 3500);
    } catch (err) {
      console.error('Erro no assistente de voz da lista, aplicando fallback local:', err);
      const localParsed = parseVoiceFallbackLocally(sanitizedTranscript);
      if (!localParsed) {
        showToast('Diga o nome do produto. Ex: 2 pacotes de arroz', 3500);
        return;
      }
      onAddItem(list.id, {
        name: localParsed.name,
        category: localParsed.category,
        quantity: localParsed.isWeighted ? 1 : localParsed.quantity,
        weight: localParsed.isWeighted ? localParsed.quantity : undefined,
        isWeighted: localParsed.isWeighted,
      });

      const formattedQty = localParsed.isWeighted
        ? `${localParsed.quantity} kg`
        : `${localParsed.quantity} un`;
      showToast(`"${localParsed.name}" (${formattedQty}) adicionado à lista!`, 3500);
    } finally {
      setIsProcessingVoice(false);
      startVoiceCooldown();
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
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      if (!hasProcessedRef.current && transcriptBufferRef.current.trim()) {
        hasProcessedRef.current = true;
        const fullTranscript = transcriptBufferRef.current.trim();
        transcriptBufferRef.current = '';
        processVoiceIntentWithAI(fullTranscript);
      }
      return;
    }

    if (
      isProcessingVoice ||
      isVoiceCooldown ||
      Date.now() - lastVoiceCallTimeRef.current < VOICE_COOLDOWN_MS
    ) {
      showToast('Aguarde 3 segundos antes de usar o assistente de voz novamente.', 2500);
      return;
    }

    try {
      transcriptBufferRef.current = '';
      hasProcessedRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        if (!event.results || event.results.length === 0) return;

        const lastResult = event.results[event.results.length - 1];
        const currentTranscript = (lastResult?.[0]?.transcript || '').replace(/\s+/g, ' ').trim();

        if (currentTranscript) {
          const previousTranscript = transcriptBufferRef.current.trim();
          if (
            !previousTranscript ||
            currentTranscript.toLowerCase().startsWith(previousTranscript.toLowerCase()) ||
            event.results.length === 1
          ) {
            transcriptBufferRef.current = currentTranscript;
          } else if (
            !previousTranscript.toLowerCase().includes(currentTranscript.toLowerCase())
          ) {
            transcriptBufferRef.current = currentTranscript;
          }
        }

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          if (!hasProcessedRef.current && transcriptBufferRef.current.trim()) {
            hasProcessedRef.current = true;
            const fullTranscript = transcriptBufferRef.current.trim();
            transcriptBufferRef.current = '';
            try {
              recognition.stop();
            } catch {
              // ignore
            }
            setIsRecording(false);
            processVoiceIntentWithAI(fullTranscript);
          }
        }, 1200);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsRecording(false);

        if (!hasProcessedRef.current && transcriptBufferRef.current.trim()) {
          hasProcessedRef.current = true;
          const fullTranscript = transcriptBufferRef.current.trim();
          transcriptBufferRef.current = '';
          processVoiceIntentWithAI(fullTranscript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Erro ao iniciar reconhecimento de voz:', err);
      setIsRecording(false);
    }
  };

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
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== list.name) {
      setTitleValue(trimmed);
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
    const safeName = sanitizeItemName(name);
    if (!safeName) return;
    const safeCategory = sanitizeItemCategory(category, 'Geral');

    const cleanName = normalizeText(safeName);
    const existingItem = (list.items || []).find(
      (item) => normalizeText(item.name) === cleanName
    );

    if (existingItem) {
      if (existingItem.isWeighted) {
        const rawWeight = existingItem.weight ?? existingItem.quantity ?? 1;
        const currentWeight =
          typeof rawWeight === 'string'
            ? parseFloat(String(rawWeight).replace(',', '.'))
            : Number(rawWeight || 1);
        const newWeight = Math.round(((isNaN(currentWeight) ? 1 : currentWeight) + 1) * 1000) / 1000;
        onEditItem(list.id, existingItem.id, { isWeighted: true, weight: newWeight });
        showToast(
          `"${existingItem.name}" +1kg (Total: ${newWeight.toString().replace('.', ',')} kg)`
        );
      } else {
        const rawQty = existingItem.quantity || 1;
        const currentQty =
          typeof rawQty === 'string' ? parseInt(String(rawQty), 10) : Number(rawQty || 1);
        const newQty = (isNaN(currentQty) ? 1 : currentQty) + 1;
        onEditItem(list.id, existingItem.id, { isWeighted: false, quantity: newQty });
        showToast(`"${existingItem.name}" +1 un (Total: ${newQty})`);
      }
      return;
    }

    onAddItem(list.id, {
      name: safeName,
      category: safeCategory,
      isWeighted,
      weight: isWeighted ? 1 : undefined,
      pricingModeSource,
      quantity: 1,
    });
    showToast(`"${safeName}" adicionado à lista`);
  };

  // Adicionar em lote com persistência imediata em list_items
  const handleSubmitBatch = (batchText: string) => {
    const parsed = parseBatchItemsInput(batchText);
    if (parsed.length === 0) return;

    const batchItems: Array<Omit<ListItem, 'id'>> = parsed.map((item) => {
      const isWeighted = Boolean(item.isWeighted);
      return {
        name: item.name,
        category: item.category || 'Geral',
        quantity: item.quantity || 1,
        isWeighted,
        weight: isWeighted ? (item.quantity || 1) : undefined,
      };
    });

    if (onAddItemsBatch) {
      onAddItemsBatch(list.id, batchItems);
    } else {
      batchItems.forEach((item) => {
        onAddItem(list.id, item);
      });
    }

    showToast(
      `${parsed.length} ${parsed.length === 1 ? 'item adicionado' : 'itens adicionados'} à lista`
    );
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
        const currentWeight =
          typeof rawWeight === 'string'
            ? parseFloat(String(rawWeight).replace(',', '.'))
            : Number(rawWeight || 1);
        const newWeight = Math.round(((isNaN(currentWeight) ? 1 : currentWeight) + 1) * 1000) / 1000;
        onEditItem(list.id, existingItem.id, { isWeighted: true, weight: newWeight });
        showToast(
          `"${existingItem.name}" +1kg (Total: ${newWeight.toString().replace('.', ',')} kg)`
        );
      } else {
        const rawQty = existingItem.quantity || 1;
        const currentQty =
          typeof rawQty === 'string' ? parseInt(String(rawQty), 10) : Number(rawQty || 1);
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

  // Compartilhar texto da lista
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
    if (onSaveList) {
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

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Topo Fixo Unificado: Header padronizado com PurchaseScreen */}
      <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
        <header className="w-full">
          <div className="w-full max-w-md md:max-w-xl mx-auto px-3 py-2 sm:px-6 flex items-center justify-between gap-2">
            {/* Lado Esquerdo: Botão Voltar + Nome Editável */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <button
                onClick={handleBack}
                aria-label="Voltar"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-zinc-100 hover:bg-zinc-200/80 active:bg-zinc-300 flex items-center justify-center text-zinc-700 transition-colors shrink-0 cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="relative w-full group bg-zinc-50/80 hover:bg-zinc-100/80 focus-within:bg-white border border-dashed border-zinc-300 hover:border-emerald-400 focus-within:border-solid focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-xl px-3 py-1.5 transition-all">
                  <div className="relative flex items-center">
                    <input
                      id="list-title-input"
                      type="text"
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="Nome da lista"
                      className="w-full text-sm sm:text-base font-bold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal bg-transparent border-none p-0 pr-6 outline-none leading-tight truncate focus:ring-0"
                    />
                    <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-emerald-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] text-zinc-500">
                    <span className="font-semibold text-emerald-700">Lista Planejada</span>
                    <span>•</span>
                    <span>
                      {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Menu 3 Pontos (⋮) */}
            <div className="flex items-center shrink-0 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  aria-label="Mais opções da lista"
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
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-50 overflow-hidden"
                      >
                        {/* Iniciar compra com esta lista */}
                        {totalItemsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsStartPurchaseModalOpen(true);
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                          >
                            <Play className="w-4 h-4 text-emerald-600 shrink-0 fill-current" />
                            <span>Iniciar compra com esta lista</span>
                          </button>
                        )}

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

                        {/* Excluir Lista */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                          <span>Excluir esta lista</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Conteúdo Principal com rolagem livre */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:py-4 flex flex-col pb-44 sm:pb-48">
        {/* Botão de destaque "+ Adicionar em Lote" no topo da Lista Planejada */}
        <button
          type="button"
          onClick={() => setIsBatchModalOpen(true)}
          className="bg-emerald-50 border-2 border-emerald-500/80 text-emerald-800 font-semibold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 shadow-sm w-full mb-3 hover:bg-emerald-100/80 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
          <span>Adicionar em Lote</span>
        </button>

        <div className="space-y-3">
          <div className="space-y-2.5">
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
                    className="w-full flex flex-col items-center justify-center py-6 sm:py-7 px-4 sm:px-6 text-center bg-white rounded-3xl border border-zinc-200/80 my-1 shadow-2xs"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 shadow-2xs">
                      <ClipboardList className="w-7 h-7" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">
                      Sua lista está vazia
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                      Toque no microfone abaixo para falar os itens, use o botão Digitar ou adicione vários itens de uma vez acima.
                    </p>
                  </motion.div>
                ) : (
                  visibleSections.map((section) => {
                    const isCollapsed = collapsedSections.includes(section.category);
                    return (
                      <motion.div
                        key={section.category}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        className={`transition-all duration-200 ${
                          isCollapsed
                            ? 'p-0 bg-transparent border border-transparent shadow-none mb-2 rounded-lg'
                            : `rounded-2xl p-1.5 mb-3 border shadow-sm space-y-2 ${getCategorySectionContainerClass(
                                section.category
                              )}`
                        }`}
                      >
                        {/* Header do Accordion da Categoria com Faixa Unificada e Seta Circular */}
                        <button
                          type="button"
                          onClick={() => toggleSectionCollapse(section.category)}
                          aria-expanded={!isCollapsed}
                          className={`w-full flex items-center justify-between gap-2 border cursor-pointer transition-all duration-200 group ${
                            isCollapsed
                              ? 'py-1 px-2.5 rounded-lg opacity-90'
                              : 'py-1.5 px-2.5 rounded-xl'
                          } ${getCategoryHeaderClass(section.category)}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-1 ${
                                isCollapsed ? 'h-3.5' : 'h-4'
                              } rounded-full shrink-0 transition-all duration-200 ${getCategoryAccentBarClass(
                                section.category
                              )}`}
                            />
                            <span
                              className={`${
                                isCollapsed ? 'text-[11px]' : 'text-xs'
                              } font-bold uppercase tracking-wide truncate transition-all duration-200`}
                            >
                              {section.category}
                            </span>
                            <span
                              className={`bg-white text-zinc-800 font-bold shadow-xs rounded-full shrink-0 transition-all duration-200 ${
                                isCollapsed
                                  ? 'px-1.5 py-0 text-[10px]'
                                  : 'px-1.5 py-0.5 text-[11px]'
                              }`}
                            >
                              {section.items.length}
                            </span>
                          </div>

                          <span
                            className={`${
                              isCollapsed ? 'w-5 h-5' : 'w-6 h-6'
                            } rounded-full bg-white shadow-sm border border-zinc-200/80 flex items-center justify-center text-zinc-700 font-bold shrink-0 ml-auto transition-all duration-200`}
                          >
                            <ChevronDown
                              className={`${
                                isCollapsed ? 'w-3 h-3 -rotate-90' : 'w-3.5 h-3.5 rotate-0'
                              } stroke-[2.5] transition-all duration-200`}
                            />
                          </span>
                        </button>

                        <AnimatePresence mode="popLayout" initial={false}>
                          {!isCollapsed &&
                            section.items.map((item) => (
                              <ListItemCard
                                key={item.id}
                                item={item}
                                listId={list.id}
                                onEditItem={onEditItem}
                                onRemoveItem={(lId, iId) => {
                                  onRemoveItem(lId, iId);
                                  showToast(`"${item.name}" removido da lista`);
                                }}
                                getCategoryBadgeStyle={getCategoryBadgeStyle}
                              />
                            ))}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sugestões rápidas (quando tem 0 a 2 itens) */}
          {totalItemsCount <= 2 && availableSuggestions.length > 0 && (
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

      {/* Voice-First Bottom Dock Padronizado com PurchaseScreen */}
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
                <span>Ouvindo com atenção... Diga ex: &ldquo;2 pacotes de arroz&rdquo;</span>
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

        {/* Barra Principal Inferior Voice-First com FAB Central Absoluto */}
        <div className="pointer-events-auto relative bg-white/95 backdrop-blur-md border-t border-zinc-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 pt-3 pb-8 sm:pb-9">
          <div className="w-full max-w-md md:max-w-xl mx-auto">
            {/* Linha de Contador de Itens Planejados e Iniciar Compra no topo da barra (sem Total R$) */}
            {totalItemsCount > 0 && (
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-100 mb-2">
                <span className="text-zinc-700 font-bold">
                  {totalItemsCount}{' '}
                  {totalItemsCount === 1 ? 'item planejado' : 'itens planejados'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsStartPurchaseModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Iniciar Compra</span>
                </button>
              </div>
            )}

            {/* Grid Estruturado: Esquerda (Digitar), Centro Absoluto Elevado (Microfone Rei), Direita (Salvar Lista) */}
            <div className="relative flex items-center justify-between min-h-[52px]">
              {/* 1. Lado Esquerdo: Botão de Digitação Manual */}
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

              {/* 2. Centro: O MICROFONE COMO REI */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-10 sm:-top-11 flex flex-col items-center z-20 pointer-events-auto">
                <motion.button
                  whileTap={isProcessingVoice || isVoiceCooldown ? {} : { scale: 0.92 }}
                  whileHover={isProcessingVoice || isVoiceCooldown ? {} : { scale: 1.05 }}
                  transition={motionConfig.pressSpring}
                  type="button"
                  onClick={handleToggleVoice}
                  disabled={isProcessingVoice || (!isRecording && isVoiceCooldown)}
                  aria-label={
                    isRecording
                      ? 'Ouvindo áudio... Toque para parar'
                      : isProcessingVoice
                      ? 'IA pensando...'
                      : isVoiceCooldown
                      ? 'Aguarde 3 segundos...'
                      : 'Ditar item por voz'
                  }
                  title={
                    isRecording
                      ? 'Gravando... Toque para parar'
                      : isProcessingVoice
                      ? 'IA pensando...'
                      : isVoiceCooldown
                      ? 'Aguarde 3 segundos entre comandos de voz'
                      : 'Ditar item por voz (Assistente Inteligente)'
                  }
                  className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-white shadow-2xl transition-all border-4 border-white ${
                    isRecording
                      ? 'bg-gradient-to-br from-red-500 to-rose-700 shadow-red-500/50 ring-4 ring-red-400/40 animate-pulse cursor-pointer'
                      : isProcessingVoice
                      ? 'bg-gradient-to-br from-emerald-700 to-teal-800 shadow-emerald-800/40 cursor-wait'
                      : isVoiceCooldown
                      ? 'bg-gradient-to-br from-zinc-400 to-zinc-500 shadow-zinc-400/30 opacity-75 cursor-not-allowed'
                      : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-800 shadow-emerald-600/40 hover:shadow-emerald-600/60 ring-4 ring-emerald-500/20 cursor-pointer'
                  }`}
                >
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

                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-1 text-center select-none ${
                    isRecording
                      ? 'text-red-600 animate-pulse'
                      : isProcessingVoice
                      ? 'text-emerald-700 font-bold animate-pulse'
                      : isVoiceCooldown
                      ? 'text-zinc-400 font-semibold'
                      : 'text-zinc-600'
                  }`}
                >
                  {isRecording
                    ? 'Ouvindo...'
                    : isProcessingVoice
                    ? 'IA Pensando...'
                    : isVoiceCooldown
                    ? 'Aguarde 3s...'
                    : 'Falar Item'}
                </span>
              </div>

              {/* 3. Lado Direito: Botão Salvar Lista */}
              <div className="flex-1 flex justify-end">
                <motion.button
                  whileTap={motionConfig.tap.button}
                  transition={motionConfig.pressSpring}
                  type="button"
                  onClick={handleSaveAndFinish}
                  aria-label="Salvar Lista"
                  className={`flex items-center space-x-1.5 py-2 px-3 sm:px-4 rounded-2xl border transition-all cursor-pointer min-h-[44px] ${
                    totalItemsCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-700/20 active:scale-95 border-emerald-600'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 border-zinc-200/80 font-semibold'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-xs font-bold">Salvar</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <h3 className="text-base font-bold text-zinc-900 mb-1">Excluir esta lista?</h3>
              <p className="text-xs text-zinc-500 leading-relaxed mb-5">
                A lista &ldquo;{list.name}&rdquo; e seus {totalItemsCount} itens serão removidos
                permanentemente.
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
