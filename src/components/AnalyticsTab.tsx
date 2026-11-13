import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  PieChart as PieChartIcon,
  BarChart3,
  Package,
  Store,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { motion } from 'motion/react';
import { Purchase } from '../types';
import {
  calculatePurchaseTotal,
  calculateItemSubtotal,
  formatCurrencyBRL,
  formatDateBRL,
} from '../utils/purchaseHelpers';
import { normalizeText } from '../services/suggestionsService';
import { useMotionConfig } from '../styles/motionSystem';

export type AnalyticsPeriod = 'week' | 'month' | 'year' | 'all';

export interface AnalyticsTabProps {
  finishedPurchases: Purchase[];
  onSelectPurchase?: (purchase: Purchase) => void;
  initialPeriod?: AnalyticsPeriod;
}

// Paleta harmonizada com a identidade visual do app
const CATEGORY_COLORS: Record<string, string> = {
  Alimentos: '#10b981', // emerald-500
  Mercearia: '#10b981', // emerald-500
  Bebidas: '#0ea5e9', // sky-500
  Limpeza: '#3b82f6', // blue-500
  Higiene: '#8b5cf6', // violet-500
  Açougue: '#ef4444', // red-500
  'Frutas/Legumes': '#84cc16', // lime-500
  Hortifruti: '#14b8a6', // teal-500
  Frios: '#f59e0b', // amber-500
  Padaria: '#f97316', // orange-500
  Geral: '#64748b', // slate-500
};

const COLOR_PALETTE = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#6366f1', // indigo
  '#f97316', // orange
  '#64748b', // slate
];

const getCategoryColor = (category: string, index: number): string => {
  return CATEGORY_COLORS[category] || COLOR_PALETTE[index % COLOR_PALETTE.length];
};

const getCategoryBadgeClasses = (category: string): string => {
  switch (category) {
    case 'Alimentos':
    case 'Mercearia':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    case 'Bebidas':
      return 'bg-sky-50 text-sky-700 border-sky-200/80';
    case 'Limpeza':
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    case 'Higiene':
      return 'bg-purple-50 text-purple-700 border-purple-200/80';
    case 'Açougue':
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    case 'Frutas/Legumes':
      return 'bg-lime-50 text-lime-700 border-lime-200/80';
    case 'Hortifruti':
      return 'bg-teal-50 text-teal-700 border-teal-200/80';
    case 'Frios':
      return 'bg-orange-50 text-orange-700 border-orange-200/80';
    case 'Padaria':
      return 'bg-amber-50 text-amber-700 border-amber-200/80';
    default:
      return 'bg-zinc-100 text-zinc-600 border-zinc-200/80';
  }
};

export function AnalyticsTab({
  finishedPurchases = [],
  onSelectPurchase,
  initialPeriod = 'month',
}: AnalyticsTabProps) {
  const motionConfig = useMotionConfig();
  const [periodFilter, setPeriodFilter] = useState<AnalyticsPeriod>(initialPeriod || 'month');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [timeRange, setTimeRange] = useState<'recent' | 'all'>('recent');

  // Sincroniza quando o usuário navega da Home com um período específico selecionado
  useEffect(() => {
    if (initialPeriod) {
      setPeriodFilter(initialPeriod);
    }
  }, [initialPeriod]);

  const safePurchases = useMemo(() => {
    return (Array.isArray(finishedPurchases) ? finishedPurchases : []).filter(
      (p) => p && p.status === 'finished'
    );
  }, [finishedPurchases]);

  // Lista única de estabelecimentos (storeName) presentes nas compras finalizadas
  const availableStores = useMemo(() => {
    const storeMap = new Map<string, string>();
    for (const p of safePurchases) {
      const rawStore = (p.storeName || '').trim();
      if (rawStore) {
        const key = rawStore.toLowerCase();
        if (!storeMap.has(key)) {
          storeMap.set(key, rawStore);
        }
      }
    }
    return Array.from(storeMap.values());
  }, [safePurchases]);

  // Se o mercado selecionado deixou de existir, reseta para 'ALL'
  useEffect(() => {
    if (
      selectedStore !== 'ALL' &&
      !availableStores.some((s) => s.toLowerCase() === selectedStore.toLowerCase())
    ) {
      setSelectedStore('ALL');
    }
  }, [availableStores, selectedStore]);

  // Compras filtradas dinamicamente por Período (Semana | Mês | Ano | Tudo) e por Estabelecimento
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return safePurchases.filter((p) => {
      // 1. Filtro por estabelecimento
      if (selectedStore !== 'ALL') {
        const pStore = (p.storeName || '').trim().toLowerCase();
        if (pStore !== selectedStore.trim().toLowerCase()) {
          return false;
        }
      }

      // 2. Filtro por período
      if (periodFilter === 'all') return true;

      const dateStr = p.finishedAt || p.createdAt;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;

      if (periodFilter === 'week') {
        const diffMs = now.getTime() - date.getTime();
        return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
      }
      if (periodFilter === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (periodFilter === 'year') {
        return date.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [safePurchases, periodFilter, selectedStore]);

  // Estatísticas gerais recalculadas sobre as compras filtradas
  const stats = useMemo(() => {
    if (filteredPurchases.length === 0) {
      return {
        totalSpent: 0,
        averagePerPurchase: 0,
        totalItemsCount: 0,
        averagePerItem: 0,
        topCategoryName: 'Nenhuma',
        topCategoryAmount: 0,
        topCategoryPercent: 0,
        purchasesCount: 0,
        largestPurchaseAmount: 0,
      };
    }

    let totalSpent = 0;
    let totalItemsCount = 0;
    let largestPurchaseAmount = 0;
    const categoryTotals: Record<string, { amount: number; itemsCount: number }> = {};

    for (const purchase of filteredPurchases) {
      const pTotal = calculatePurchaseTotal(purchase.items || []);
      totalSpent += pTotal;
      if (pTotal > largestPurchaseAmount) {
        largestPurchaseAmount = pTotal;
      }

      for (const item of purchase.items || []) {
        if (!item) continue;
        const itemQty = item.isWeighted ? 1 : Math.max(1, Math.round(Number(item.quantity) || 1));
        totalItemsCount += itemQty;
        const cat = (item.category && item.category.trim()) || 'Geral';
        const itemSubtotal = calculateItemSubtotal(item);

        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { amount: 0, itemsCount: 0 };
        }
        categoryTotals[cat].amount += itemSubtotal;
        categoryTotals[cat].itemsCount += itemQty;
      }
    }

    const averagePerPurchase =
      filteredPurchases.length > 0 ? totalSpent / filteredPurchases.length : 0;
    const averagePerItem = totalItemsCount > 0 ? totalSpent / totalItemsCount : 0;

    // Achar categoria com maior gasto
    let topCategoryName = 'Nenhuma';
    let topCategoryAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, data]) => {
      if (data.amount > topCategoryAmount) {
        topCategoryAmount = data.amount;
        topCategoryName = cat;
      }
    });

    const topCategoryPercent = totalSpent > 0 ? (topCategoryAmount / totalSpent) * 100 : 0;

    return {
      totalSpent,
      averagePerPurchase,
      totalItemsCount,
      averagePerItem,
      topCategoryName,
      topCategoryAmount,
      topCategoryPercent,
      purchasesCount: filteredPurchases.length,
      largestPurchaseAmount,
    };
  }, [filteredPurchases]);

  // Dados para o Gráfico de Evolução de Gastos
  const timelineData = useMemo(() => {
    if (filteredPurchases.length === 0) return [];

    // Ordena da mais antiga para a mais recente para a linha do tempo
    const sorted = [...filteredPurchases].sort((a, b) => {
      const dateA = new Date(a.finishedAt || a.createdAt).getTime();
      const dateB = new Date(b.finishedAt || b.createdAt).getTime();
      return dateA - dateB;
    });

    const selected = timeRange === 'recent' ? sorted.slice(-8) : sorted;

    return selected.map((p, idx) => {
      const dateStr = p.finishedAt || p.createdAt;
      const d = new Date(dateStr);
      const isDateValid = !isNaN(d.getTime());
      const label = isDateValid
        ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
        : `C#${idx + 1}`;

      const total = calculatePurchaseTotal(p.items || []);
      const itemCount = (p.items || []).reduce(
        (acc, item) => acc + (item?.isWeighted ? 1 : Number(item?.quantity) || 1),
        0
      );

      return {
        id: p.id,
        name: label,
        fullName: p.name || `Compra de ${label}`,
        formattedDate: isDateValid ? formatDateBRL(dateStr) : 'Data não informada',
        valor: Number(total.toFixed(2)),
        itens: itemCount,
        storeName: p.storeName || '',
        rawPurchase: p,
      };
    });
  }, [filteredPurchases, timeRange]);

  // Dados para o Gráfico de Despesas por Categoria (Donut)
  const categoryChartData = useMemo(() => {
    if (filteredPurchases.length === 0) return [];

    const map: Record<string, { name: string; value: number; itemsCount: number }> = {};

    for (const p of filteredPurchases) {
      for (const item of p.items || []) {
        if (!item) continue;
        const cat = (item.category && item.category.trim()) || 'Geral';
        const subtotal = calculateItemSubtotal(item);

        if (!map[cat]) {
          map[cat] = { name: cat, value: 0, itemsCount: 0 };
        }
        map[cat].value += subtotal;
        map[cat].itemsCount += item.isWeighted ? 1 : Number(item.quantity) || 1;
      }
    }

    const items = Object.values(map)
      .map((entry) => ({
        ...entry,
        value: Number(entry.value.toFixed(2)),
        percentage: stats.totalSpent > 0 ? (entry.value / stats.totalSpent) * 100 : 0,
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);

    return items;
  }, [filteredPurchases, stats.totalSpent]);

  // Top 5 Itens que Mais Pesaram no Bolso
  const topHeavyItems = useMemo(() => {
    if (filteredPurchases.length === 0) return [];

    const itemMap = new Map<
      string,
      {
        key: string;
        displayName: string;
        category: string;
        totalSpent: number;
        totalQuantity: number;
        totalWeight: number;
        hasWeighted: boolean;
        hasUnit: boolean;
      }
    >();

    for (const p of filteredPurchases) {
      for (const item of p.items || []) {
        if (!item || !item.name) continue;
        const subtotal = calculateItemSubtotal(item);
        if (subtotal <= 0) continue;

        const normKey = normalizeText(item.name);
        if (!normKey) continue;

        const isW = Boolean(item.isWeighted);
        const qtyVal = Number(item.quantity) || 1;
        const weightVal = Number(item.weight ?? item.quantity ?? 1);

        const existing = itemMap.get(normKey);
        if (!existing) {
          itemMap.set(normKey, {
            key: normKey,
            displayName: item.name.trim(),
            category: (item.category && item.category.trim()) || 'Geral',
            totalSpent: subtotal,
            totalQuantity: isW ? 0 : qtyVal,
            totalWeight: isW ? weightVal : 0,
            hasWeighted: isW,
            hasUnit: !isW,
          });
        } else {
          existing.totalSpent += subtotal;
          if (isW) {
            existing.totalWeight += weightVal;
            existing.hasWeighted = true;
          } else {
            existing.totalQuantity += qtyVal;
            existing.hasUnit = true;
          }
        }
      }
    }

    const sorted = Array.from(itemMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    const top5 = sorted.slice(0, 5);
    const maxItemSpent = top5.length > 0 ? top5[0].totalSpent : 0;

    return top5.map((entry, idx) => {
      let formattedAccumulated = '';
      if (entry.hasWeighted && !entry.hasUnit) {
        const roundedW = Math.round(entry.totalWeight * 100) / 100;
        formattedAccumulated = `${String(roundedW).replace('.', ',')} kg`;
      } else if (entry.hasUnit && !entry.hasWeighted) {
        const roundedQ = Math.round(entry.totalQuantity * 100) / 100;
        formattedAccumulated = `${roundedQ} ${roundedQ === 1 ? 'un' : 'uns'}`;
      } else {
        const roundedQ = Math.round(entry.totalQuantity);
        const roundedW = Math.round(entry.totalWeight * 100) / 100;
        formattedAccumulated = `${roundedQ} un + ${String(roundedW).replace('.', ',')} kg`;
      }

      return {
        rank: idx + 1,
        key: entry.key,
        name: entry.displayName,
        category: entry.category,
        totalSpent: entry.totalSpent,
        formattedQuantity: formattedAccumulated,
        percentOfMax: maxItemSpent > 0 ? (entry.totalSpent / maxItemSpent) * 100 : 0,
        percentOfTotal: stats.totalSpent > 0 ? (entry.totalSpent / stats.totalSpent) * 100 : 0,
      };
    });
  }, [filteredPurchases, stats.totalSpent]);

  // ESTADO VAZIO GLOBAL (nenhuma compra finalizada no histórico inteiro)
  if (safePurchases.length === 0) {
    return (
      <div className="space-y-4">
        {/* Banner Vazio */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-zinc-900 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 mb-4 backdrop-blur-md shadow-inner">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>

          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-2">
            Inteligência Financeira
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            Análises e Gráficos de Gastos
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/80 mt-2 leading-relaxed max-w-md">
            Conclua suas compras pelo carrinho para desbloquear relatórios automáticos com gráficos
            interativos, distribuição por categoria e evolução do seu orçamento.
          </p>
        </div>

        {/* Card Ilustrativo de recursos */}
        <div className="p-5 rounded-3xl bg-white border border-zinc-200/80 shadow-2xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <PieChartIcon className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-black text-zinc-900">
            Nenhuma compra finalizada registrada
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1 leading-relaxed">
            Assim que você finalizar a sua primeira compra, este espaço exibirá seus maiores gastos,
            médias de mercado e gráficos comparativos em tempo real.
          </p>

          <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-3 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-[10px] font-bold text-emerald-700 block">Evolução</span>
              <p className="text-[11px] text-zinc-500 mt-0.5">Gráficos de barras e linha no tempo</p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-[10px] font-bold text-sky-700 block">Categorias</span>
              <p className="text-[11px] text-zinc-500 mt-0.5">Distribuição em Donut dos itens</p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-[10px] font-bold text-violet-700 block">Médias</span>
              <p className="text-[11px] text-zinc-500 mt-0.5">Cálculo automático de ticket médio</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ================= 3. FILTRO DE PERÍODO E MERCADO NO TOPO (STICKY) ================= */}
      <div className="sticky top-[148px] z-20 bg-zinc-50/95 backdrop-blur-md py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-zinc-200/60 transition-all space-y-2">
        {/* Seletor Segmentado Enxuto: Semana | Mês | Ano | Tudo */}
        <div className="grid grid-cols-4 gap-1 bg-zinc-200/70 p-1 rounded-xl text-xs font-bold">
          {(
            [
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mês' },
              { id: 'year', label: 'Ano' },
              { id: 'all', label: 'Tudo' },
            ] as const
          ).map((option) => {
            const active = periodFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPeriodFilter(option.id)}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                  active
                    ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                    : 'text-zinc-600 hover:text-zinc-900 font-semibold'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Pílulas Horizontais de Estabelecimento (quando houver compras com storeName) */}
        {availableStores.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedStore('ALL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                selectedStore === 'ALL'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-200/80'
              }`}
            >
              <Store className="w-3 h-3 shrink-0" />
              <span>Todos os mercados</span>
            </button>

            {availableStores.map((store) => {
              const isSelected = selectedStore.toLowerCase() === store.toLowerCase();
              return (
                <button
                  key={store}
                  type="button"
                  onClick={() => setSelectedStore(store)}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-200/80'
                  }`}
                >
                  <span>{store}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Caso o filtro atual (período/mercado) não possua compras */}
      {filteredPurchases.length === 0 ? (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-2xs text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-2.5">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">
            Nenhuma compra encontrada neste filtro
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Altere o período acima para &ldquo;Ano&rdquo; ou &ldquo;Tudo&rdquo; para visualizar suas compras anteriores.
          </p>
          <button
            type="button"
            onClick={() => {
              setPeriodFilter('all');
              setSelectedStore('ALL');
            }}
            className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Mostrar todo o histórico
          </button>
        </div>
      ) : (
        <>
          {/* ================= 4. PROPORÇÃO 2x2 NOS CARDS DE RESUMO ================= */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1: Total no Período */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionConfig.spring}
              className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                  TOTAL GASTO
                </span>
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <DollarSign className="w-3.5 h-3.5 stroke-[2.4]" />
                </div>
              </div>

              <div className="mt-2 min-w-0">
                <span className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight truncate block">
                  {formatCurrencyBRL(stats.totalSpent)}
                </span>
                <span className="text-[11px] text-zinc-500 leading-tight truncate block mt-0.5">
                  {stats.purchasesCount} {stats.purchasesCount === 1 ? 'compra' : 'compras'}
                </span>
              </div>
            </motion.div>

            {/* Card 2: Ticket Médio */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionConfig.spring, delay: 0.04 }}
              className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                  TICKET MÉDIO
                </span>
                <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 stroke-[2.4]" />
                </div>
              </div>

              <div className="mt-2 min-w-0">
                <span className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight truncate block">
                  {formatCurrencyBRL(stats.averagePerPurchase)}
                </span>
                <span className="text-[11px] text-zinc-500 leading-tight truncate block mt-0.5">
                  Por compra
                </span>
              </div>
            </motion.div>

            {/* Card 3: Maior Categoria */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionConfig.spring, delay: 0.08 }}
              className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                  MAIOR DESPESA
                </span>
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                  <ShoppingBag className="w-3.5 h-3.5 stroke-[2.4]" />
                </div>
              </div>

              <div className="mt-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base sm:text-lg font-extrabold text-zinc-900 tracking-tight truncate">
                    {stats.topCategoryName}
                  </span>
                  {stats.topCategoryPercent > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/70 shrink-0 whitespace-nowrap">
                      {stats.topCategoryPercent.toFixed(0)}%
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-500 leading-tight truncate block mt-0.5">
                  {formatCurrencyBRL(stats.topCategoryAmount)} no total
                </span>
              </div>
            </motion.div>

            {/* Card 4: Volume & Custo por Item */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionConfig.spring, delay: 0.12 }}
              className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap">
                  VOLUME
                </span>
                <div className="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shrink-0">
                  <Package className="w-3.5 h-3.5 stroke-[2.4]" />
                </div>
              </div>

              <div className="mt-2 min-w-0">
                <span className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight truncate block">
                  {stats.totalItemsCount} {stats.totalItemsCount === 1 ? 'item' : 'itens'}
                </span>
                <span className="text-[11px] text-zinc-500 leading-tight truncate block mt-0.5">
                  Média {formatCurrencyBRL(stats.averagePerItem)}/un
                </span>
              </div>
            </motion.div>
          </div>

          {/* ================= GRÁFICO 1: EVOLUÇÃO DE GASTOS ================= */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionConfig.layoutSpring}
            className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <BarChart3 className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight truncate">
                  Evolução de Gastos
                </h3>
              </div>

              {/* Controles de Visualização: Tipo de Gráfico & Escopo */}
              <div className="flex items-center space-x-2 shrink-0">
                {filteredPurchases.length > 8 && (
                  <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/60 text-[11px] font-semibold text-zinc-600">
                    <button
                      type="button"
                      onClick={() => setTimeRange('recent')}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        timeRange === 'recent'
                          ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                          : 'hover:text-zinc-900'
                      }`}
                    >
                      Recentes
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeRange('all')}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        timeRange === 'all'
                          ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                          : 'hover:text-zinc-900'
                      }`}
                    >
                      Todas ({filteredPurchases.length})
                    </button>
                  </div>
                )}

                <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/60 text-[11px] font-semibold text-zinc-600">
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      chartType === 'bar'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'hover:text-zinc-900'
                    }`}
                  >
                    Barras
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('line')}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      chartType === 'line'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'hover:text-zinc-900'
                    }`}
                  >
                    Linha
                  </button>
                </div>
              </div>
            </div>

            {/* Container do Gráfico Recharts */}
            <div className="w-full h-56 sm:h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={timelineData}
                    margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload.length > 0) {
                        const raw = data.activePayload[0].payload?.rawPurchase;
                        if (raw && onSelectPurchase) {
                          onSelectPurchase(raw);
                        }
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
                      dy={4}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 10 }}
                      tickFormatter={(val) =>
                        `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-zinc-900/95 backdrop-blur-md text-white text-xs rounded-2xl p-3 shadow-xl border border-zinc-800 z-50">
                              <p className="font-bold text-white text-xs truncate max-w-[200px]">
                                {d.fullName}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">{d.formattedDate}</p>
                              <div className="mt-2 pt-2 border-t border-zinc-800 flex items-baseline justify-between gap-3">
                                <span className="text-[10px] text-zinc-400">Total:</span>
                                <span className="text-emerald-400 font-black text-sm">
                                  {formatCurrencyBRL(d.valor)}
                                </span>
                              </div>
                              {d.storeName && (
                                <p className="text-[10px] text-zinc-400 mt-1 truncate">
                                  Mercado: {d.storeName}
                                </p>
                              )}
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {d.itens} {d.itens === 1 ? 'item comprado' : 'itens comprados'}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="valor"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={44}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                    />
                  </BarChart>
                ) : (
                  <LineChart
                    data={timelineData}
                    margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload.length > 0) {
                        const raw = data.activePayload[0].payload?.rawPurchase;
                        if (raw && onSelectPurchase) {
                          onSelectPurchase(raw);
                        }
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
                      dy={4}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 10 }}
                      tickFormatter={(val) =>
                        `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-zinc-900/95 backdrop-blur-md text-white text-xs rounded-2xl p-3 shadow-xl border border-zinc-800 z-50">
                              <p className="font-bold text-white text-xs truncate max-w-[200px]">
                                {d.fullName}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">{d.formattedDate}</p>
                              <div className="mt-2 pt-2 border-t border-zinc-800 flex items-baseline justify-between gap-3">
                                <span className="text-[10px] text-zinc-400">Total:</span>
                                <span className="text-emerald-400 font-black text-sm">
                                  {formatCurrencyBRL(d.valor)}
                                </span>
                              </div>
                              {d.storeName && (
                                <p className="text-[10px] text-zinc-400 mt-1 truncate">
                                  Mercado: {d.storeName}
                                </p>
                              )}
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {d.itens} {d.itens === 1 ? 'item comprado' : 'itens comprados'}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* ================= GRÁFICO 2: DESPESAS POR CATEGORIA (DONUT + LISTA) ================= */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionConfig.layoutSpring, delay: 0.05 }}
            className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
                  <PieChartIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight truncate">
                  Despesas por Categoria
                </h3>
              </div>

              <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-xl">
                {categoryChartData.length}{' '}
                {categoryChartData.length === 1 ? 'categoria' : 'categorias'}
              </span>
            </div>

            {categoryChartData.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                Nenhum item com valor registrado nas compras filtradas.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Gráfico Donut Centralizado com ResponsiveContainer */}
                <div className="relative w-full h-52 sm:h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900/95 backdrop-blur-md text-white text-xs rounded-2xl p-2.5 shadow-xl border border-zinc-800 z-50">
                                <div className="flex items-center space-x-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: getCategoryColor(d.name, 0) }}
                                  />
                                  <span className="font-bold text-white text-xs">{d.name}</span>
                                </div>
                                <div className="mt-1.5 pt-1.5 border-t border-zinc-800 flex items-baseline justify-between gap-3">
                                  <span className="text-emerald-400 font-bold text-xs">
                                    {formatCurrencyBRL(d.value)}
                                  </span>
                                  <span className="text-zinc-400 text-[10px]">
                                    {d.percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                  {d.itemsCount} {d.itemsCount === 1 ? 'item' : 'itens'}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        cornerRadius={5}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={getCategoryColor(entry.name, index)}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Informação no miolo do Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Total
                    </span>
                    <span className="text-xs sm:text-sm font-black text-zinc-800 mt-0.5">
                      {formatCurrencyBRL(stats.totalSpent)}
                    </span>
                  </div>
                </div>

                {/* Listagem detalhada das categorias com barras de progresso */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  {categoryChartData.map((cat, idx) => {
                    const color = getCategoryColor(cat.name, idx);
                    return (
                      <div
                        key={cat.name}
                        className="p-2.5 rounded-2xl bg-zinc-50/70 border border-zinc-200/50 flex flex-col space-y-1.5 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs font-bold text-zinc-900">{cat.name}</span>
                            <span className="text-[10px] text-zinc-400">
                              ({cat.itemsCount} {cat.itemsCount === 1 ? 'item' : 'itens'})
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-zinc-900">
                              {formatCurrencyBRL(cat.value)}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500 bg-white px-1.5 py-0.5 rounded-md border border-zinc-200/60 shadow-2xs">
                              {cat.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Barra de progresso visual */}
                        <div className="w-full h-1.5 bg-zinc-200/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(3, cat.percentage))}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* ================= 5. NOVO CARD: TOP 5 ITENS QUE MAIS PESARAM NO BOLSO ================= */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionConfig.layoutSpring, delay: 0.08 }}
            className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
                  <Flame className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <h3 className="text-sm font-black text-zinc-900 tracking-tight truncate">
                  Itens que Mais Pesaram
                </h3>
              </div>

              {topHeavyItems.length > 0 && (
                <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-xl">
                  Top {topHeavyItems.length}
                </span>
              )}
            </div>

            {topHeavyItems.length === 0 ? (
              <div className="py-6 text-center text-zinc-400 text-xs">
                Adicione preços aos itens das suas compras para visualizar o ranking de impacto.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topHeavyItems.map((item) => {
                  const catColor = getCategoryColor(item.category, item.rank - 1);
                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded-2xl bg-zinc-50/80 border border-zinc-200/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Esquerda: Posição + Nome + Categoria + Quantidade */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                              item.rank === 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : item.rank === 2
                                ? 'bg-zinc-200/80 text-zinc-800 border border-zinc-300/80'
                                : item.rank === 3
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : 'bg-white text-zinc-500 border border-zinc-200'
                            }`}
                          >
                            {item.rank}º
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-zinc-900 truncate max-w-[150px] sm:max-w-[220px]">
                                {item.name}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${getCategoryBadgeClasses(
                                  item.category
                                )}`}
                              >
                                {item.category}
                              </span>
                            </div>

                            <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
                              Acumulado: {item.formattedQuantity}
                            </span>
                          </div>
                        </div>

                        {/* Direita: Valor Total Gasto + % do orçamento */}
                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold text-zinc-900 block">
                            {formatCurrencyBRL(item.totalSpent)}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-400">
                            {item.percentOfTotal.toFixed(1)}% do total
                          </span>
                        </div>
                      </div>

                      {/* Barra proporcional ao líder */}
                      <div className="w-full h-1.5 bg-zinc-200/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(6, item.percentOfMax))}%`,
                            backgroundColor: catColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
