import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  ChevronRight,
  Sparkles,
  Layers,
  Calendar,
  MoreVertical,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { List } from '../types';
import { useMotionConfig } from '../styles/motionSystem';

interface ListsOverviewScreenProps {
  lists: List[];
  loading?: boolean;
  onCreateList: () => void;
  onOpenList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onStartPurchaseFromList: (list: List) => void;
}

export function ListsOverviewScreen({
  lists,
  loading = false,
  onCreateList,
  onOpenList,
  onDeleteList,
  onStartPurchaseFromList,
}: ListsOverviewScreenProps) {
  const motionConfig = useMotionConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [listToDelete, setListToDelete] = useState<List | null>(null);

  const filteredLists = lists.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 flex flex-col pb-28">
      {/* Header Verde Superior Estilo Dashboard */}
      <header className="bg-emerald-800 text-white pt-6 pb-6 px-4 sm:px-6 rounded-b-3xl shadow-md">
        <div className="w-full max-w-md md:max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-inner">
                <ClipboardList className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  Minhas Listas
                </h1>
                <p className="text-xs text-emerald-100/90 font-medium">
                  {lists.length} {lists.length === 1 ? 'molde de planejamento' : 'moldes de planejamento'}
                </p>
              </div>
            </div>

            <motion.button
              whileTap={motionConfig.tap.button}
              type="button"
              onClick={onCreateList}
              className="py-2 px-3.5 bg-white text-emerald-900 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 shadow-sm hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Lista</span>
            </motion.button>
          </div>

          {/* Barra de Busca de Listas */}
          {lists.length > 2 && (
            <div className="mt-4 relative">
              <Search className="w-4 h-4 text-emerald-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome da lista..."
                className="w-full pl-10 pr-4 py-2.5 bg-emerald-900/50 border border-emerald-700/60 rounded-xl text-white placeholder:text-emerald-300/70 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
              />
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="w-full max-w-md md:max-w-xl mx-auto px-4 sm:px-6 pt-5 flex-1">
        {loading && lists.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            Carregando suas listas...
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="py-14 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h2 className="text-base font-bold text-zinc-900">
              {searchQuery ? 'Nenhuma lista encontrada' : 'Nenhuma lista criada ainda'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
              {searchQuery
                ? 'Tente pesquisar com outro termo.'
                : 'Crie listas de compras modelo para agilizar seu planejamento antes de ir ao supermercado.'}
            </p>
            {!searchQuery && (
              <motion.button
                whileTap={motionConfig.tap.button}
                type="button"
                onClick={onCreateList}
                className="mt-5 inline-flex items-center space-x-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-700/20 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Criar Primeira Lista</span>
              </motion.button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold px-1">
              <span>MOLDES SALVOS</span>
              <span>{filteredLists.length} {filteredLists.length === 1 ? 'lista' : 'listas'}</span>
            </div>

            {filteredLists.map((list) => {
              const itemCount = list.items ? list.items.length : 0;
              const sampleItems = (list.items || []).slice(0, 4);

              return (
                <motion.div
                  key={list.id}
                  layout
                  className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all overflow-hidden"
                >
                  {/* Cabeçalho do Card */}
                  <div
                    onClick={() => onOpenList(list.id)}
                    className="p-4 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-3">
                        <h3 className="text-base font-bold text-zinc-900 leading-tight">
                          {list.name}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-zinc-500 mt-1 font-medium">
                          <span className="font-semibold text-emerald-700">
                            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                          </span>
                          {list.createdAt && (
                            <>
                              <span>•</span>
                              <span>{formatDate(list.createdAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-zinc-400">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Preview de Itens da Lista */}
                    {sampleItems.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sampleItems.map((item) => (
                          <span
                            key={item.id}
                            className="inline-block px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-[11px] font-medium"
                          >
                            {item.name}
                          </span>
                        ))}
                        {itemCount > 4 && (
                          <span className="inline-block px-2 py-1 rounded-lg bg-zinc-50 text-zinc-400 text-[11px] font-medium border border-zinc-200/60">
                            +{itemCount - 4} outros
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Barra de Ações Rápidas da Lista */}
                  <div className="border-t border-zinc-100 px-4 py-2.5 bg-zinc-50/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setListToDelete(list)}
                      className="text-xs font-semibold text-zinc-400 hover:text-red-600 transition-colors flex items-center space-x-1 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-red-50"
                      aria-label={`Excluir lista ${list.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>

                    <motion.button
                      whileTap={motionConfig.tap.button}
                      type="button"
                      onClick={() => onStartPurchaseFromList(list)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Iniciar Compra</span>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Confirmação de Exclusão de Lista */}
      <AnimatePresence>
        {listToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={motionConfig.modalSpring}
              className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-zinc-200 relative p-5 pt-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-3 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-zinc-900 text-center tracking-tight">
                Excluir Lista?
              </h3>
              <p className="text-xs text-zinc-500 text-center mt-1.5 leading-relaxed">
                Tem certeza de que deseja excluir o molde{' '}
                <strong className="text-zinc-800">"{listToDelete.name}"</strong>? Esta ação não pode ser desfeita.
              </p>

              <div className="mt-5 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setListToDelete(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (listToDelete) {
                      onDeleteList(listToDelete.id);
                      setListToDelete(null);
                    }
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
