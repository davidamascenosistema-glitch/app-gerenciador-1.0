import React, { useState } from 'react';
import {
  X,
  ClipboardList,
  Check,
  FolderPlus,
  ArrowRight,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { List } from '../types';

interface ImportListModalProps {
  isOpen: boolean;
  lists: List[];
  onClose: () => void;
  onImportList: (list: List) => void;
}

export function ImportListModal({
  isOpen,
  lists = [],
  onClose,
  onImportList,
}: ImportListModalProps) {
  const motionConfig = useMotionConfig();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const selectedList = lists.find((l) => l.id === selectedListId);

  const handleConfirm = () => {
    if (selectedList) {
      onImportList(selectedList);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 300,
              mass: 0.8,
            }}
            className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden border border-zinc-200/90 pb-safe"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-list-title"
          >
            {/* Visual Drag Handle for mobile */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300" />
            </div>

            {/* Cabeçalho */}
            <div className="px-5 pt-3 pb-3 sm:pt-5 sm:pb-4 flex items-center justify-between border-b border-zinc-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="import-list-title"
                    className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-tight"
                  >
                    Importar de um Molde
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Injete os itens de um molde salvo nesta compra ativa
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Moldes Disponíveis */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
              {lists.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
                    <ClipboardList className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800 mb-1">
                    Nenhum molde salvo
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-xs">
                    Você ainda não possui listas ou moldes criados. Crie listas na aba &ldquo;Listas&rdquo; para reutilizá-las aqui.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-zinc-700 mb-2">
                    Selecione o molde que deseja mesclar:
                  </p>
                  {lists.map((list) => {
                    const isSelected = selectedListId === list.id;
                    const itemCount = list.items?.length || 0;
                    const previewItems = (list.items || []).slice(0, 3).map((it) => it.name);

                    return (
                      <motion.div
                        key={list.id}
                        whileTap={{ scale: 0.98 }}
                        transition={motionConfig.pressSpring}
                        onClick={() => setSelectedListId(list.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-zinc-50/70 hover:bg-zinc-100/70 border-zinc-200/80 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-zinc-200 text-emerald-700'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <ClipboardList className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                              {list.name}
                            </h4>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                              {previewItems.length > 0 && (
                                <span className="text-zinc-400">
                                  {' · '}
                                  {previewItems.join(', ')}
                                  {itemCount > 3 ? '...' : ''}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-200/70 text-zinc-600'
                            }`}
                          >
                            {itemCount} itens
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Rodapé de Ações */}
            <div className="p-4 sm:p-5 bg-white border-t border-zinc-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <motion.button
                whileTap={motionConfig.tap.button}
                transition={motionConfig.pressSpring}
                type="button"
                onClick={handleConfirm}
                disabled={!selectedList || (selectedList.items?.length || 0) === 0}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer ${
                  selectedList && (selectedList.items?.length || 0) > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-700/20'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                }`}
              >
                <span>Importar Molde</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
