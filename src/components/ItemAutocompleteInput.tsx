import React, { useState, useRef, useEffect } from 'react';
import { History, Sparkles, X, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ItemSuggestion } from '../types';

interface ItemAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: ItemSuggestion) => void;
  getSuggestions: (query: string) => ItemSuggestion[];
  placeholder?: string;
  autoFocus?: boolean;
}

export function ItemAutocompleteInput({
  value,
  onChange,
  onSelectSuggestion,
  getSuggestions,
  placeholder = 'Ex: Arroz, Leite, Sabão em pó...',
  autoFocus = false,
}: ItemAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = getSuggestions(value);
  const personalSuggestions = suggestions.filter((s) => s.source === 'personal');
  const genericSuggestions = suggestions.filter((s) => s.source === 'generic');

  const hasSuggestions = suggestions.length > 0;

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

  const handleSelect = (suggestion: ItemSuggestion) => {
    onSelectSuggestion(suggestion);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-zinc-900 placeholder-zinc-400 bg-white transition-all outline-none"
        />

        {value.trim().length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center cursor-pointer transition-colors"
            title="Limpar campo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      <AnimatePresence>
        {isOpen && hasSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
          >
            {/* Seção 1: Histórico Pessoal (Prioridade Mais Alta) */}
            {personalSuggestions.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-[11px] font-bold text-emerald-800 tracking-wide">
                  <div className="flex items-center space-x-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Seu Histórico Pessoal</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-md">
                    Você já comprou
                  </span>
                </div>

                <div className="divide-y divide-zinc-100">
                  {personalSuggestions.map((item, idx) => (
                    <button
                      key={`personal-${item.name}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/50 active:bg-emerald-100/70 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-zinc-900 group-hover:text-emerald-900 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 shrink-0">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {item.count && item.count > 1 && (
                        <span className="text-[11px] font-medium text-zinc-400 shrink-0">
                          {item.count}x
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Seção 2: Base Genérica Compartilhada */}
            {genericSuggestions.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-zinc-50 border-y border-zinc-100 flex items-center space-x-1.5 text-[11px] font-bold text-zinc-600 tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sugestões Compartilhadas</span>
                </div>

                <div className="divide-y divide-zinc-100">
                  {genericSuggestions.map((item, idx) => (
                    <button
                      key={`generic-${item.name}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full text-left px-3.5 py-2 hover:bg-zinc-50 active:bg-zinc-100 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/70 shrink-0">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
