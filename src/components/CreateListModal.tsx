import React, { useState } from 'react';
import { 
  ClipboardList, 
  X, 
  Plus, 
  Sparkles, 
  ListPlus,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { ListItem } from '../types';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateList: (name: string, items?: Omit<ListItem, 'id'>[]) => void;
}

const TEMPLATE_SUGGESTIONS = [
  'Compras do Mês',
  'Feira Semanal',
  'Churrasco',
  'Limpeza da Casa',
  'Farmácia & Higiene',
  'Padaria & Café',
];

export function CreateListModal({
  isOpen,
  onClose,
  onCreateList,
}: CreateListModalProps) {
  const motionConfig = useMotionConfig();
  const [listName, setListName] = useState('');
  const [rawItems, setRawItems] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = listName.trim() || 'Nova Lista de Planejamento';

    const parsedItems: Omit<ListItem, 'id'>[] = [];
    if (rawItems.trim()) {
      const lines = rawItems
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      lines.forEach((name) => {
        parsedItems.push({
          name,
          category: 'Geral',
          quantity: 1,
          isWeighted: false,
        });
      });
    }

    onCreateList(cleanName, parsedItems.length > 0 ? parsedItems : undefined);
    setListName('');
    setRawItems('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={motionConfig.modalSpring}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto"
      >
        {/* Header da Lista de Planejamento */}
        <div className="bg-gradient-to-br from-indigo-700 to-emerald-700 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-2.5">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Molde de Planejamento</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Criar Nova Lista
          </h3>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1 font-medium leading-normal">
            Monte um modelo de compras em casa para reutilizar no mercado
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Nome da Lista */}
          <div className="space-y-2">
            <label htmlFor="list-name-input" className="text-xs font-bold uppercase tracking-wider text-zinc-700 block">
              Nome da Lista
            </label>
            <input
              id="list-name-input"
              type="text"
              autoFocus
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Ex: Compras do Mês, Feira de Quarta..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 transition-all outline-none min-h-[44px]"
            />

            {/* Sugestões rápidas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TEMPLATE_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setListName(sug)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    listName === sug
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200/80'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Itens Iniciais (Opcional) */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label htmlFor="raw-items-textarea" className="text-xs font-bold uppercase tracking-wider text-zinc-700 block">
                Itens Iniciais (opcional)
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">Opcional</span>
            </div>
            <textarea
              id="raw-items-textarea"
              rows={3}
              value={rawItems}
              onChange={(e) => setRawItems(e.target.value)}
              placeholder="Digite itens separados por vírgula ou por linha (ex: Arroz, Feijão, Leite, Café)..."
              className="w-full p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all outline-none resize-none leading-relaxed"
            />
            <p className="text-[11px] text-zinc-500">
              Você também pode adicionar e editar itens depois a qualquer momento.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-zinc-100 flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer min-h-[46px]"
            >
              Cancelar
            </button>
            <motion.button
              whileTap={motionConfig.tap.button}
              transition={motionConfig.pressSpring}
              type="submit"
              className="flex-2 py-3 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-700/20 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[46px]"
            >
              <ListPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Lista</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
