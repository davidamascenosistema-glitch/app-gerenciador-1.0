import React, { useState } from 'react';
import { 
  ClipboardList, 
  X, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Layers, 
  Tag, 
  ArrowRight,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { List, ListItem } from '../types';
import { formatCurrencyBRL } from '../utils/purchaseHelpers';

interface ListDetailModalProps {
  list: List | null;
  isOpen: boolean;
  onClose: () => void;
  onStartPurchaseWithList: (list: List) => void;
  onAddItemToList: (listId: string, item: Omit<ListItem, 'id'>) => void;
  onRemoveItemFromList: (listId: string, itemId: string) => void;
  onDeleteList: (listId: string) => void;
}

export function ListDetailModal({
  list,
  isOpen,
  onClose,
  onStartPurchaseWithList,
  onAddItemToList,
  onRemoveItemFromList,
  onDeleteList,
}: ListDetailModalProps) {
  const motionConfig = useMotionConfig();
  const [newItemName, setNewItemName] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen || !list) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    onAddItemToList(list.id, {
      name: trimmed,
      category: 'Geral',
      quantity: 1,
      isWeighted: false,
    });
    setNewItemName('');
  };

  const handleDeleteListConfirm = () => {
    onDeleteList(list.id);
    setShowConfirmDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={motionConfig.modalSpring}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-zinc-900 text-white p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
            <span>Molde de Lista</span>
          </div>

          <h3 className="text-xl font-bold tracking-tight text-white leading-snug truncate pr-8">
            {list.name}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {list.items.length} {list.items.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
          </p>
        </div>

        {/* Corpo: Lista de Itens */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
          {/* Formulário para adicionar item rápido ao molde */}
          <form onSubmit={handleAddItem} className="flex items-center space-x-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Adicionar item a este molde..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm text-zinc-900 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer min-h-[42px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Adicionar</span>
            </button>
          </form>

          {/* Lista com itens */}
          <div className="space-y-1.5 pt-1">
            {list.items.length === 0 ? (
              <div className="p-6 text-center bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <Package className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-600">
                  Nenhum item adicionado ainda
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Digite itens acima para compor este molde.
                </p>
              </div>
            ) : (
              list.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 border border-zinc-200/70 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-semibold text-zinc-800 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-0.5">
                      <span>Qtd: {item.quantity}{item.isWeighted && item.weight ? ` (${item.weight} kg)` : ''}</span>
                      {item.price && (
                        <span>• Ref: {formatCurrencyBRL(item.price)}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItemFromList(list.id, item.id)}
                    title="Remover item do molde"
                    aria-label={`Remover ${item.name}`}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 active:bg-red-100 text-zinc-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rodapé: Iniciar Compra ou Excluir Lista */}
        <div className="p-4 sm:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col space-y-2 shrink-0">
          <motion.button
            whileTap={motionConfig.tap.button}
            transition={motionConfig.pressSpring}
            type="button"
            onClick={() => {
              onClose();
              onStartPurchaseWithList(list);
            }}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[46px]"
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            <span>Iniciar Compra com esta Lista</span>
            <ArrowRight className="w-4 h-4 ml-0.5 opacity-80" />
          </motion.button>

          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full py-2 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer text-center"
            >
              Excluir este molde de lista
            </button>
          ) : (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-red-700">Confirmar exclusão?</span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteListConfirm}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
