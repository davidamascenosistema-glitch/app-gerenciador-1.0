import { 
  ArrowLeft, 
  RotateCcw, 
  Receipt, 
  Calendar, 
  CheckCircle2, 
  Package, 
  Download,
  Share2,
  FileText,
  ClipboardList,
  ShoppingCart
} from 'lucide-react';
import { motion } from 'motion/react';
import { Purchase, Item } from '../types';
import { 
  calculatePurchaseTotal, 
  calculateItemSubtotal, 
  formatCurrencyBRL, 
  formatDateBRL,
  exportPurchaseAsTxt,
  generatePurchaseExportText
} from '../utils/purchaseHelpers';
import { useToast } from './Toast';

interface PurchaseDetailScreenProps {
  purchase: Purchase;
  onBack: () => void;
  onRepeatPurchase: (purchase: Purchase) => void;
}

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'Alimentos':
    case 'Mercearia':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200/80';
    case 'Bebidas':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200/80';
    case 'Higiene':
    case 'Limpeza':
      return 'bg-blue-100 text-blue-800 border-blue-200/80';
    case 'Laticínios':
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

const ORIGIN_CONFIG: Record<
  string,
  { label: string; icon: typeof ShoppingCart | typeof ClipboardList | typeof Receipt | typeof FileText; style: string }
> = {
  list: {
    label: 'Lista planejada',
    icon: ClipboardList,
    style: 'bg-blue-50 text-blue-700 border-blue-200/80',
  },
  manual: {
    label: 'Registro manual',
    icon: Receipt,
    style: 'bg-amber-50 text-amber-800 border-amber-200/80',
  },
  invoice: {
    label: 'Nota fiscal',
    icon: FileText,
    style: 'bg-purple-50 text-purple-700 border-purple-200/80',
  },
};

export function PurchaseDetailScreen({
  purchase,
  onBack,
  onRepeatPurchase,
}: PurchaseDetailScreenProps) {
  const { showToast } = useToast();
  const totalValue = calculatePurchaseTotal(purchase);
  const items = purchase.items || [];
  const totalItemsCount = items.length;
  const formattedDate = formatDateBRL(purchase.finishedAt || purchase.createdAt);
  const originInfo = ORIGIN_CONFIG[purchase.origin] || ORIGIN_CONFIG.manual;
  const OriginIcon = originInfo.icon;

  const handleExport = () => {
    if (items.length === 0) {
      showToast('Esta compra não possui itens para exportar');
      return;
    }
    exportPurchaseAsTxt(purchase);
    showToast('Lista exportada com sucesso (.txt)');
  };

  const handleShare = async () => {
    if (items.length === 0) {
      showToast('Esta compra não possui itens para compartilhar');
      return;
    }

    const shareText = generatePurchaseExportText(purchase);
    const shareTitle = purchase.name || 'Resumo de Compra';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        showToast('Lista compartilhada com sucesso!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('Resumo copiado para a área de transferência!');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Resumo copiado para a área de transferência!');
      }
    } catch {
      showToast('Não foi possível copiar o texto');
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative">
      {/* Header Sticky */}
      <header className="w-full bg-white border-b border-zinc-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="w-full max-w-md md:max-w-xl mx-auto px-3.5 py-3 sm:px-6 flex items-center justify-between gap-2">
          {/* Botão Voltar + Título */}
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onBack()}
              className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
              aria-label="Voltar para o histórico"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 leading-tight truncate">
                {purchase.name || 'Compra Finalizada'}
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-none mt-0.5 truncate">
                Detalhes da compra finalizada
              </p>
            </div>
          </div>

          {/* Ações Rápidas de Compartilhamento / Exportação */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              title="Compartilhar lista"
              aria-label="Compartilhar lista"
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px]"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExport}
              title="Exportar (.txt)"
              aria-label="Exportar (.txt)"
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px]"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal (Somente Leitura) */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-3.5 py-4 sm:py-6 pb-28 sm:pb-32 flex flex-col">
        {/* Card de Resumo do Cabeçalho */}
        <div className="w-full bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center space-x-1.5 flex-wrap gap-1">
              {/* Badge de Status */}
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                <CheckCircle2 className="w-3 h-3" />
                <span>Finalizada</span>
              </span>

              {/* Badge de Origem */}
              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${originInfo.style}`}>
                <OriginIcon className="w-3 h-3" />
                <span>{originInfo.label}</span>
              </span>
            </div>

            {/* Data */}
            <div className="flex items-center space-x-1 text-xs text-zinc-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-zinc-500 font-medium block">
                Valor Total da Compra
              </span>
              <span className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                {formatCurrencyBRL(totalValue)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500 font-medium block">
                Total de Itens
              </span>
              <span className="text-sm font-bold text-zinc-700">
                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Itens (Somente Leitura) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 mb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center space-x-1.5">
              <Package className="w-3.5 h-3.5 text-zinc-400" />
              <span>Itens Registrados ({totalItemsCount})</span>
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="w-full bg-white rounded-2xl border border-zinc-200/80 p-8 text-center shadow-2xs">
              <Package className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs text-zinc-500 font-medium">
                Nenhum item registrado nesta compra.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item: Item) => {
                const subtotal = calculateItemSubtotal(item);
                const hasPrice = item.price !== undefined && item.price > 0;

                return (
                  <div
                    key={item.id}
                    className="w-full bg-white rounded-xl border border-zinc-200/80 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between space-x-3 transition-colors"
                  >
                    {/* Detalhes do Item */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-sm sm:text-base font-bold text-zinc-900 line-clamp-1 break-words">
                          {item.name}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getCategoryBadgeClass(
                            item.category || 'Geral'
                          )}`}
                        >
                          {item.category || 'Geral'}
                        </span>
                      </div>

                      {/* Quantidade e Preço Unitário */}
                      <div className="text-xs text-zinc-500 mt-1 flex items-center space-x-2">
                        <span>
                          {item.isWeighted
                            ? `${(item.weight || item.quantity).toString().replace('.', ',')} kg`
                            : `${item.quantity} un`}
                        </span>
                        {hasPrice && (
                          <>
                            <span className="text-zinc-300">•</span>
                            <span>
                              {formatCurrencyBRL(item.price!)}
                              {item.isWeighted ? '/kg' : ' cada'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Subtotal do Item */}
                    <div className="text-right shrink-0">
                      {hasPrice ? (
                        <div>
                          <span className="text-[10px] text-zinc-400 block font-normal leading-none mb-0.5">
                            Subtotal
                          </span>
                          <span className="font-extrabold text-zinc-900 text-sm sm:text-base">
                            {formatCurrencyBRL(subtotal)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 font-medium italic">
                          Sem preço
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Rodapé Fixo / Sticky Bottom Footer com Ação Única */}
      <div className="sticky bottom-0 z-20 w-full bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] py-3 px-3.5 sm:px-6">
        <div className="w-full max-w-md md:max-w-xl mx-auto space-y-2">
          {/* Resumo compacto */}
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="text-zinc-500 font-medium">Total da Compra:</span>
            <span className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
              {formatCurrencyBRL(totalValue)}
            </span>
          </div>

          {/* Botão Único: Repetir Esta Compra */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onRepeatPurchase(purchase)}
            type="button"
            className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition-all min-h-[48px] cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>Repetir Esta Compra</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
