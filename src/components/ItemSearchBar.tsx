import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, ListPlus, History, Sparkles, X, CornerDownLeft, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { ItemSuggestion, PricingModeDefault } from '../types';
import { resolvePricingMode } from '../utils/purchaseHelpers';

interface ItemSearchBarProps {
  onAddItem: (
    name: string,
    category?: string,
    isWeighted?: boolean,
    pricingModeSource?: PricingModeDefault | null
  ) => void;
  onOpenBatchModal: () => void;
  getSuggestions: (query: string) => ItemSuggestion[];
  recordManualItem: (name: string, category?: string) => void;
}

export function ItemSearchBar({
  onAddItem,
  onOpenBatchModal,
  getSuggestions,
  recordManualItem,
}: ItemSearchBarProps) {
  const motionConfig = useMotionConfig();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const suggestions = getSuggestions(query);
  const personalSuggestions = suggestions.filter((s) => s.source === 'personal');
  const genericSuggestions = suggestions.filter((s) => s.source === 'generic');

  const allFilteredSuggestions = [...personalSuggestions, ...genericSuggestions];

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Limpar erro de voz após 4 segundos
  useEffect(() => {
    if (speechError) {
      const timer = setTimeout(() => setSpeechError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [speechError]);

  // Limpar reconhecimento de voz ao desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Seu navegador não possui suporte para reconhecimento de voz.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const results = event.results;
        if (results && results.length > 0) {
          const transcript = results[0][0]?.transcript || '';
          if (transcript) {
            const cleanTranscript = transcript.replace(/[.,!?]+$/, '').trim();
            setQuery(cleanTranscript);
            setIsOpen(true);
            setSelectedIndex(-1);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Permissão do microfone negada no navegador.');
        } else if (event.error === 'no-speech') {
          setSpeechError(null);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        inputRef.current?.focus();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Erro ao iniciar reconhecimento de voz:', err);
      setIsListening(false);
    }
  };

  const handleSelectSuggestion = (suggestion: ItemSuggestion) => {
    const { isWeighted, pricingModeSource } = resolvePricingMode(suggestion.defaultPricingMode);
    onAddItem(suggestion.name, suggestion.category, isWeighted, pricingModeSource);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleAddFreeText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Verificar se existe correspondência exata nas sugestões
    const exactMatch = allFilteredSuggestions.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (exactMatch) {
      handleSelectSuggestion(exactMatch);
      return;
    }

    // Item novo/livre digitado manualmente
    const defaultCategory = 'Geral';
    const { isWeighted, pricingModeSource } = resolvePricingMode(undefined);

    recordManualItem(trimmed, defaultCategory);
    onAddItem(trimmed, defaultCategory, isWeighted, pricingModeSource);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allFilteredSuggestions.length) {
        handleSelectSuggestion(allFilteredSuggestions[selectedIndex]);
      } else if (query.trim()) {
        handleAddFreeText(query);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < allFilteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full relative z-30">
      <div className="flex items-center gap-2">
        {/* Input da Barra de Busca com Alta Hierarquia Visual */}
        <div className="relative flex-1 group">
          <div
            className={`w-full flex items-center bg-white rounded-2xl border-2 transition-all shadow-sm ${
              isListening
                ? 'border-rose-400 ring-4 ring-rose-400/20'
                : 'border-emerald-500/40 hover:border-emerald-500/70 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15'
            } px-2.5 py-1.5`}
          >
            {/* Ícone de Destaque Primário */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mr-2 shadow-2xs">
              <Search className="w-4 h-4 stroke-[2.5]" />
            </div>

            {/* Campo de Entrada de Texto */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onClick={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Ouvindo... Fale o nome do item' : 'O que deseja adicionar hoje?'}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal outline-none"
            />

            {/* Ações Integradas à Direita */}
            <div className="flex items-center space-x-1 shrink-0 ml-1.5">
              {/* Indicador quando está ouvindo voz */}
              {isListening ? (
                <button
                  type="button"
                  onClick={toggleVoiceRecognition}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer shadow-2xs animate-pulse"
                  title="Clique para parar de ouvir"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                  <span className="text-[11px]">Ouvindo...</span>
                </button>
              ) : (
                /* Botão de Microfone / Pesquisa por Voz */
                <button
                  type="button"
                  onClick={toggleVoiceRecognition}
                  className="w-8 h-8 rounded-xl hover:bg-emerald-50 active:bg-emerald-100 text-zinc-400 hover:text-emerald-700 active:text-emerald-800 flex items-center justify-center cursor-pointer transition-colors"
                  title="Pesquisar ou adicionar por voz"
                  aria-label="Pesquisar por voz"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}

              {/* Botão de Limpar */}
              {query.trim().length > 0 && !isListening && (
                <motion.button
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  whileTap={motionConfig.tap.iconButton}
                  transition={motionConfig.pressSpring}
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 flex items-center justify-center cursor-pointer transition-colors"
                  title="Limpar texto"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Botão Secundário: Adicionar Vários em Lote */}
        <motion.button
          whileTap={motionConfig.tap.button}
          transition={motionConfig.pressSpring}
          type="button"
          onClick={onOpenBatchModal}
          title="Adicionar vários itens em lote (colar lista)"
          aria-label="Adicionar vários itens"
          className="h-11 sm:h-12 w-11 sm:w-auto sm:px-3.5 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/90 active:bg-emerald-200/80 border border-emerald-200/90 text-emerald-800 flex items-center justify-center sm:gap-1.5 shrink-0 shadow-2xs transition-all cursor-pointer font-bold text-xs min-h-[44px]"
        >
          <ListPlus className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="hidden sm:inline">Em Lote</span>
        </motion.button>
      </div>

      {/* Painel de Sugestões Dropdown */}
      <AnimatePresence>
        {isOpen && (allFilteredSuggestions.length > 0 || query.trim().length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={motionConfig.pressSpring}
            className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden max-h-72 overflow-y-auto z-50 divide-y divide-zinc-100"
          >
            {/* Opção rápida de adicionar texto livre caso digitado */}
            {query.trim().length > 0 && (
              <div className="p-1.5 bg-zinc-50/70 border-b border-zinc-100">
                <motion.button
                  whileTap={motionConfig.tap.row}
                  transition={motionConfig.pressSpring}
                  type="button"
                  onClick={() => handleAddFreeText(query)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 active:bg-emerald-100 border border-zinc-200/80 hover:border-emerald-300 transition-colors flex items-center justify-between text-xs font-bold text-emerald-700 cursor-pointer"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Adicionar <span className="text-zinc-900 font-extrabold">"{query.trim()}"</span> como novo item
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-normal flex items-center space-x-1 shrink-0">
                    <span>Enter</span>
                    <CornerDownLeft className="w-3 h-3" />
                  </span>
                </motion.button>
              </div>
            )}

            {/* Seção 1: Histórico Pessoal */}
            {personalSuggestions.length > 0 && (
              <div>
                <div className="px-3.5 py-1.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-[11px] font-bold text-emerald-800 tracking-wide">
                  <div className="flex items-center space-x-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Seu Histórico Pessoal</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                    {query.trim() ? 'Correspondência' : 'Mais Comprados'}
                  </span>
                </div>

                <div className="divide-y divide-zinc-100">
                  {personalSuggestions.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <motion.button
                        whileTap={motionConfig.tap.row}
                        transition={motionConfig.pressSpring}
                        key={`search-personal-${item.name}-${idx}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between group cursor-pointer ${
                          isSelected ? 'bg-emerald-100/70' : 'hover:bg-emerald-50/50 active:bg-emerald-100/70'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-zinc-900 group-hover:text-emerald-950 truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 shrink-0">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {item.count && item.count > 1 && (
                            <span className="text-[11px] font-medium text-zinc-400">
                              {item.count}x
                            </span>
                          )}
                          <Plus className="w-4 h-4 text-emerald-600 opacity-60 group-hover:opacity-100" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seção 2: Sugestões Compartilhadas / Populares */}
            {genericSuggestions.length > 0 && (
              <div>
                <div className="px-3.5 py-1.5 bg-zinc-50 border-y border-zinc-100 flex items-center space-x-1.5 text-[11px] font-bold text-zinc-600 tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{query.trim() ? 'Sugestões Compartilhadas' : 'Sugestões Populares'}</span>
                </div>

                <div className="divide-y divide-zinc-100">
                  {genericSuggestions.map((item, idx) => {
                    const globalIdx = personalSuggestions.length + idx;
                    const isSelected = selectedIndex === globalIdx;
                    return (
                      <motion.button
                        whileTap={motionConfig.tap.row}
                        transition={motionConfig.pressSpring}
                        key={`search-generic-${item.name}-${idx}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between group cursor-pointer ${
                          isSelected ? 'bg-zinc-100' : 'hover:bg-zinc-50 active:bg-zinc-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-950 truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/70 shrink-0">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <Plus className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600 shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aviso de erro de microfone / voz */}
      <AnimatePresence>
        {speechError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between"
          >
            <span>{speechError}</span>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="text-amber-600 hover:text-amber-900 font-bold ml-2 text-[11px] cursor-pointer"
            >
              Fechar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
