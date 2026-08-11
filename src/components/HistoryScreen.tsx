import React from 'react';
import { 
  ArrowLeft, 
  Receipt, 
  ShoppingCart, 
  ClipboardList, 
  FileText, 
  Calendar, 
  ChevronRight, 
  ShoppingBag,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { Purchase } from '../types';
import { calculatePurchaseTotal, formatCurrencyBRL, formatDateBRL } from '../utils/purchaseHelpers';

interface HistoryScreenProps {
  finishedPurchases: Purchase[];
  onBack: () => void;
  onSelectPurchase?: (purchaseId: string) => void;
}

// Origin badge configuration corresponding to HomeScreen intent options
const ORIGIN_CONFIG: Record<
  string,
  { label: string; icon: typeof ShoppingCart; style: string; iconBg: string }
> = {
  list: {
    label: 'Planejada',
    icon: ClipboardList,
    style: 'bg-blue-50 text-blue-700 border-blue-200/80',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  direct: {
    label: 'Compra direta',
    icon: ShoppingCart,
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  manual: {
    label: 'Registro manual',
    icon: Receipt,
    style: 'bg-amber-50 text-amber-800 border-amber-200/80',
    iconBg: 'bg-amber-100 text-amber-800',
  },
  invoice: {
    label: 'Nota fiscal',
    icon: FileText,
    style: 'bg-purple-50 text-purple-700 border-purple-200/80',
    iconBg: 'bg-purple-100 text-purple-700',
  },
};

export function HistoryScreen({
  finishedPurchases,
  onBack,
  onSelectPurchase,
}: HistoryScreenProps) {
  const totalSpentAllTime = finishedPurchases.reduce(
    (acc, p) => acc + calculatePurchaseTotal(p),
    0
  );

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header Sticky */}
      <header className="w-full bg-white border-b border-zinc-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
              aria-label="Voltar para a página inicial"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 leading-tight">
                Histórico de Compras
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-none mt-0.5">
                {finishedPurchases.length === 1
                  ? '1 compra realizada'
                  : `${finishedPurchases.length} compras realizadas`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-xs font-semibold text-purple-800 shrink-0">
            <Receipt className="w-3.5 h-3.5 text-purple-600" />
            <span>{formatCurrencyBRL(totalSpentAllTime)}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-4 sm:py-6 flex flex-col">
        {finishedPurchases.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-4 shadow-2xs">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              Nenhuma compra no histórico
            </h2>
            <p className="text-xs text-zinc-500 max-w-xs mt-1.5 leading-relaxed">
              O seu histórico de compras aparecerá aqui assim que você finalizar a sua primeira compra.
            </p>

            <button
              type="button"
              onClick={onBack}
              className="mt-6 inline-flex items-center space-x-2 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[44px] cursor-pointer"
            >
              <span>Voltar e iniciar compra</span>
            </button>
          </div>
        ) : (
          /* List of Finished Purchases */
          <div className="space-y-3">
            {/* Quick summary header */}
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Compras Finalizadas
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                Total acumulado: <strong className="text-zinc-700 font-bold">{formatCurrencyBRL(totalSpentAllTime)}</strong>
              </span>
            </div>

            {finishedPurchases.map((purchase) => {
              const originInfo =
                ORIGIN_CONFIG[purchase.origin] || ORIGIN_CONFIG.manual;
              const OriginIcon = originInfo.icon;
              const total = calculatePurchaseTotal(purchase);
              const formattedDate = formatDateBRL(
                purchase.finishedAt || purchase.createdAt
              );
              const itemsCount = purchase.items ? purchase.items.length : 0;

              return (
                <motion.div
                  key={purchase.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPurchase && onSelectPurchase(purchase.id)}
                  className="w-full bg-white rounded-2xl border border-zinc-200/90 shadow-2xs hover:border-zinc-300 active:bg-zinc-50 p-4 transition-all text-left flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-start justify-between space-x-3">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl ${originInfo.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
                      >
                        <OriginIcon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h3 className="text-sm font-bold text-zinc-900 line-clamp-2 break-words leading-snug">
                            {purchase.name || 'Compra Finalizada'}
                          </h3>
                          {/* Badge de Origem */}
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${originInfo.style}`}
                          >
                            <span>{originInfo.label}</span>
                          </span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center space-x-1 text-xs text-zinc-500 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Arrow icon */}
                    <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0 mt-1" />
                  </div>

                  {/* Bottom Stats Footer */}
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <div className="text-zinc-500 font-medium">
                      {itemsCount === 1 ? '1 item comprado' : `${itemsCount} itens comprados`}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-zinc-400 block font-normal leading-none mb-0.5">
                        Total da compra
                      </span>
                      <span className="font-extrabold text-zinc-900 text-sm">
                        {formatCurrencyBRL(total)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200/80 bg-white py-3 mt-4">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 text-center text-[11px] text-zinc-400">
          Gerenciador de Compras &copy; {new Date().getFullYear()} &bull; Histórico
        </div>
      </footer>
    </div>
  );
}
