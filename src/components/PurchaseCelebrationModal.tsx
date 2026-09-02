import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Download,
  Copy,
  Check,
  Home,
  FileText,
  Calendar,
  ShoppingBag,
  PieChart,
  X,
} from 'lucide-react';
import { Purchase, Item } from '../types';
import {
  formatCurrencyBRL,
  formatDateBRL,
  calculatePurchaseTotal,
  calculateItemSubtotal,
  calculateComparisonInsight,
  exportPurchaseAsTxt,
} from '../utils/purchaseHelpers';
import { MOTION_TOKENS } from '../styles/motionSystem';

interface PurchaseCelebrationModalProps {
  isOpen: boolean;
  purchase: Purchase | null;
  allPurchases: Purchase[];
  onClose: () => void;
  onViewDetails?: (purchase: Purchase) => void;
  showToast?: (message: string) => void;
}

/**
 * Dispara uma celebração de confetes em 3 ondas (centro e canhões laterais)
 */
export function fireCelebrationConfetti() {
  try {
    // Onda 1: explosão central ampla
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.55 },
      colors: ['#059669', '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#3b82f6', '#ffffff'],
      disableForReducedMotion: true,
      zIndex: 9999,
    });

    // Onda 2: canhão lateral esquerdo
    setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 55,
        origin: { x: 0.1, y: 0.65 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b'],
        disableForReducedMotion: true,
        zIndex: 9999,
      });
    }, 180);

    // Onda 3: canhão lateral direito
    setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 55,
        origin: { x: 0.9, y: 0.65 },
        colors: ['#059669', '#10b981', '#fbbf24', '#f59e0b'],
        disableForReducedMotion: true,
        zIndex: 9999,
      });
    }, 320);
  } catch {
    // Silencioso caso não suporte canvas
  }
}

/**
 * Toca um acorde triunfante sintetizado via Web Audio API (C5, E5, G5, C6)
 */
export function playSuccessChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Acorde arpejado em Dó Maior suave e brilhante
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      const startTime = ctx.currentTime + idx * 0.07;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.52);
    });
  } catch {
    // Silencioso em caso de restrição de áudio
  }
}

export function PurchaseCelebrationModal({
  isOpen,
  purchase,
  allPurchases,
  onClose,
  onViewDetails,
  showToast,
}: PurchaseCelebrationModalProps) {
  const [copied, setCopied] = useState(false);

  // Dispara confetes, áudio e feedback tátil ao abrir
  useEffect(() => {
    if (isOpen && purchase) {
      fireCelebrationConfetti();
      playSuccessChime();

      // Vibração tátil no mobile se disponível
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 60, 120]);
        } catch {}
      }
    }
  }, [isOpen, purchase]);

  const totalValue = useMemo(() => {
    if (!purchase) return 0;
    return calculatePurchaseTotal(purchase);
  }, [purchase]);

  const totalItemsCount = purchase?.items ? purchase.items.length : 0;
  const boughtItemsCount = purchase?.items ? purchase.items.filter((i) => i.bought).length : 0;
  const isAllBought = totalItemsCount > 0 && boughtItemsCount === totalItemsCount;
  const completionPercentage =
    totalItemsCount > 0 ? Math.round((boughtItemsCount / totalItemsCount) * 100) : 100;

  const comparisonInsight = useMemo(() => {
    if (!purchase) {
      return {
        hasHistory: false,
        averageValue: 0,
        percentageDiff: 0,
        status: 'consistent' as const,
        formattedDiffText: '',
        sampleCount: 0,
      };
    }
    return calculateComparisonInsight(purchase, allPurchases);
  }, [purchase, allPurchases]);

  // Categoria de maior gasto
  const topCategory = useMemo(() => {
    if (!purchase?.items || purchase.items.length === 0) return null;
    const totals: Record<string, number> = {};
    purchase.items.forEach((item: Item) => {
      const cat = item.category || 'Geral';
      const subtotal = calculateItemSubtotal(item);
      totals[cat] = (totals[cat] || 0) + subtotal;
    });

    const entries = Object.entries(totals);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    if (entries[0][1] <= 0) return null;
    return { name: entries[0][0], total: entries[0][1] };
  }, [purchase]);

  // Formatação de data/hora atual da finalização
  const finishTimeString = useMemo(() => {
    if (!purchase) return '';
    const date = purchase.finishedAt ? new Date(purchase.finishedAt) : new Date();
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = formatDateBRL(date.toISOString());
    return `${dateFormatted} às ${time}`;
  }, [purchase]);

  const handleCopySummary = async () => {
    if (!purchase) return;
    const textLines = [
      `🛒 *${purchase.name || 'Compra Finalizada'}*`,
      `📅 ${finishTimeString}`,
      `💰 *Total:* ${formatCurrencyBRL(totalValue)}`,
      `📦 *Itens:* ${boughtItemsCount} de ${totalItemsCount} marcados (${completionPercentage}%)`,
    ];

    if (topCategory) {
      textLines.push(`🏷️ *Maior Categoria:* ${topCategory.name} (${formatCurrencyBRL(topCategory.total)})`);
    }

    if (comparisonInsight.hasHistory) {
      textLines.push(`📊 *Comparação:* ${comparisonInsight.formattedDiffText}`);
    }

    textLines.push(`\nGerenciado pelo Gerenciador de Compras.`);

    const fullText = textLines.join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showToast?.('Resumo da compra copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast?.('Não foi possível copiar o resumo.');
    }
  };

  const handleExportTxt = () => {
    if (!purchase) return;
    exportPurchaseAsTxt(purchase);
    showToast?.('Arquivo da lista exportado com sucesso (.txt)');
  };

  if (!isOpen || !purchase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4">
      {/* Backdrop Escurecido Suave */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs"
      />

      {/* Card da Celebração - perfeitamente dimensionado para caber na altura mobile sem scroll */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={MOTION_TOKENS.spring.modal}
        className="relative z-10 w-full max-w-[370px] sm:max-w-md max-h-[96dvh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden my-auto flex flex-col justify-between"
      >
        {/* Botão Fechar X no topo */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer z-20"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </motion.button>

        {/* Topo Festivo Compacto com Ilustração e Aura */}
        <div className="relative pt-3.5 sm:pt-4 pb-2 px-4 text-center overflow-hidden bg-gradient-to-b from-emerald-50/90 via-emerald-50/40 to-transparent shrink-0">
          {/* Anel de pulso sutil */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-emerald-400/20 -z-10 blur-sm pointer-events-none"
          />

          {/* Selo Principal Triunfante Compacto */}
          <div className="relative inline-block mx-auto mb-1.5">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 18, delay: 0.08 }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 border-2 border-white mx-auto cursor-pointer"
              onClick={() => fireCelebrationConfetti()}
              title="Clique para soltar mais confetes!"
            >
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
            </motion.div>

            {/* Estrela/Brilho flutuante decorativo */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs"
            >
              <Sparkles className="w-2.5 h-2.5 fill-amber-950" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>{purchase.origin === 'manual' ? 'Registro Concluído' : 'Compra Finalizada'}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-tight truncate px-4">
              {purchase.name || 'Nova Compra'}
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
              {purchase.origin === 'manual'
                ? 'Sua compra já realizada foi salva no histórico!'
                : 'Sua lista foi concluída e salva com sucesso no histórico.'}
            </p>
          </motion.div>
        </div>

        {/* Corpo: Recibo Compacto */}
        <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-4 space-y-2.5 sm:space-y-3 shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-50/90 border border-zinc-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 relative overflow-hidden shadow-2xs space-y-2"
          >
            {/* Detalhe sutil de recibo no topo */}
            <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 border-b border-dashed border-zinc-300">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                <span className="font-medium truncate max-w-[200px]">{finishTimeString}</span>
              </div>
              <div className="flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded text-[10px]">
                <Check className="w-2.5 h-2.5" />
                <span>Salvo</span>
              </div>
            </div>

            {/* Destaque do Valor Total */}
            <div className="py-1 text-center">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Valor Total Concluído
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight font-mono">
                {formatCurrencyBRL(totalValue)}
              </div>
            </div>

            {/* Grid de Estatísticas Rápidas */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-zinc-300 text-xs">
              {/* Progresso de Itens */}
              <div className="p-2 rounded-lg bg-white border border-zinc-200/70">
                <div className="flex items-center space-x-1 text-zinc-500 mb-0.5">
                  <ShoppingBag className="w-3 h-3 text-zinc-400" />
                  <span className="font-medium text-[10px]">Itens no Carrinho</span>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="font-bold text-zinc-900 text-xs">{boughtItemsCount}</span>
                  <span className="text-zinc-400 text-[10px]">/ {totalItemsCount}</span>
                  {isAllBought && (
                    <span className="ml-auto text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                      100%
                    </span>
                  )}
                </div>
                {/* Barra de progresso visual */}
                <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Categoria com Maior Gasto */}
              <div className="p-2 rounded-lg bg-white border border-zinc-200/70">
                <div className="flex items-center space-x-1 text-zinc-500 mb-0.5">
                  <PieChart className="w-3 h-3 text-zinc-400" />
                  <span className="font-medium text-[10px]">Maior Categoria</span>
                </div>
                {topCategory ? (
                  <div>
                    <span className="font-bold text-zinc-900 text-[11px] block truncate" title={topCategory.name}>
                      {topCategory.name}
                    </span>
                    <span className="text-zinc-500 text-[10px] font-semibold">
                      {formatCurrencyBRL(topCategory.total)}
                    </span>
                  </div>
                ) : (
                  <span className="text-zinc-400 text-[10px]">Não calculado</span>
                )}
              </div>
            </div>

            {/* Comparação com a Média Histórica (se disponível) */}
            {comparisonInsight.hasHistory && (
              <div className="pt-1.5 border-t border-zinc-200/70">
                {comparisonInsight.status === 'lower' && (
                  <div className="p-1.5 px-2 rounded-lg bg-emerald-100/70 border border-emerald-200/80 flex items-center space-x-2 text-[11px] text-emerald-950">
                    <div className="w-5 h-5 rounded-md bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-emerald-900 truncate">
                        {comparisonInsight.formattedDiffText}! 🎉
                      </p>
                      <p className="text-[9px] text-emerald-700 truncate">
                        Média recente: {formatCurrencyBRL(comparisonInsight.averageValue)}
                      </p>
                    </div>
                  </div>
                )}

                {comparisonInsight.status === 'higher' && (
                  <div className="p-1.5 px-2 rounded-lg bg-amber-50 border border-amber-200/90 flex items-center space-x-2 text-[11px] text-amber-950">
                    <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-amber-900 truncate">
                        {comparisonInsight.formattedDiffText}
                      </p>
                      <p className="text-[9px] text-amber-700 truncate">
                        Média recente: {formatCurrencyBRL(comparisonInsight.averageValue)}
                      </p>
                    </div>
                  </div>
                )}

                {comparisonInsight.status === 'consistent' && (
                  <div className="p-1.5 px-2 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center space-x-2 text-[11px] text-zinc-800">
                    <div className="w-5 h-5 rounded-md bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
                      <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-900 truncate">
                        {comparisonInsight.formattedDiffText}
                      </p>
                      <p className="text-[9px] text-zinc-500 truncate">
                        Média recente: {formatCurrencyBRL(comparisonInsight.averageValue)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Botões Secundários: Copiar Resumo e Exportar .txt */}
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleCopySummary}
              className="py-2 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-[11px] border border-zinc-200 flex items-center justify-center space-x-1.5 transition-colors min-h-[38px] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-500" />
                  <span>Copiar Resumo</span>
                </>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleExportTxt}
              className="py-2 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-[11px] border border-zinc-200 flex items-center justify-center space-x-1.5 transition-colors min-h-[38px] cursor-pointer"
            >
              <Download className="w-3 h-3 text-zinc-500" />
              <span>Exportar (.txt)</span>
            </motion.button>
          </div>

          {/* Botão Primário: Voltar para a Tela Inicial */}
          <div className="space-y-1">
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              type="button"
              onClick={onClose}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/25 flex items-center justify-center space-x-1.5 transition-all min-h-[44px] cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Concluir e Voltar ao Início</span>
            </motion.button>

            {/* Link para Inspecionar no Histórico (opcional) */}
            {onViewDetails && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewDetails(purchase);
                }}
                className="w-full py-1 text-[10px] font-semibold text-zinc-500 hover:text-emerald-700 flex items-center justify-center space-x-1 transition-colors cursor-pointer"
              >
                <span>Ver detalhes completos no histórico</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
