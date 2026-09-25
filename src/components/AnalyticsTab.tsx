import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Receipt,
  Layers,
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
import { Purchase, Item } from '../types';
import {
  calculatePurchaseTotal,
  calculateItemSubtotal,
  formatCurrencyBRL,
  formatDateBRL,
} from '../utils/purchaseHelpers';
import { useMotionConfig } from '../styles/motionSystem';

export interface AnalyticsTabProps {
  finishedPurchases: Purchase[];
  onSelectPurchase?: (purchase: Purchase) => void;
}

// Paleta harmonizada com a identidade visual do app
const CATEGORY_COLORS: Record<string, string> = {
  Alimentos: '#10b981', // emerald-500
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

export function AnalyticsTab({ finishedPurchases = [], onSelectPurchase }: AnalyticsTabProps) {
  const motionConfig = useMotionConfig();
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [timeRange, setTimeRange] = useState<'recent' | 'all'>('recent');

  const safePurchases = useMemo(() => {
    return (Array.isArray(finishedPurchases) ? finishedPurchases : []).filter(
      (p) => p && p.status === 'finished'
    );
  }, [finishedPurchases]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    if (safePurchases.length === 0) {
      return {
        totalSpent: 0,
        averagePerPurchase: 0,
        totalItemsCount: 0,
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

    for (const purchase of safePurchases) {
      const pTotal = calculatePurchaseTotal(purchase.items || []);
      totalSpent += pTotal;
      if (pTotal > largestPurchaseAmount) {
        largestPurchaseAmount = pTotal;
      }

      for (const item of purchase.items || []) {
        if (!item) continue;
        totalItemsCount += item.quantity || 1;
        const cat = (item.category && item.category.trim()) || 'Geral';
        const itemSubtotal = calculateItemSubtotal(item);

        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { amount: 0, itemsCount: 0 };
        }
        categoryTotals[cat].amount += itemSubtotal;
        categoryTotals[cat].itemsCount += item.quantity || 1;
      }
    }

    const averagePerPurchase = safePurchases.length > 0 ? totalSpent / safePurchases.length : 0;

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
      topCategoryName,
      topCategoryAmount,
      topCategoryPercent,
      purchasesCount: safePurchases.length,
      largestPurchaseAmount,
    };
  }, [safePurchases]);

  // Dados para o Gráfico de Evolução de Gastos
  const timelineData = useMemo(() => {
    if (safePurchases.length === 0) return [];

    // Ordena da mais antiga para a mais recente para a linha do tempo
    const sorted = [...safePurchases].sort((a, b) => {
      const dateA = new Date(a.finishedAt || a.createdAt).getTime();
      const dateB = new Date(b.finishedAt || b.createdAt).getTime();
      return dateA - dateB;
    });

    // Se recente, pega as últimas 8
    const selected = timeRange === 'recent' ? sorted.slice(-8) : sorted;

    return selected.map((p, idx) => {
      const dateStr = p.finishedAt || p.createdAt;
      const d = new Date(dateStr);
      const isDateValid = !isNaN(d.getTime());
      const label = isDateValid
        ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
        : `C#${idx + 1}`;

      const total = calculatePurchaseTotal(p.items || []);
      const itemCount = (p.items || []).reduce((acc, item) => acc + (item?.quantity || 1), 0);

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
  }, [safePurchases, timeRange]);

  // Dados para o Gráfico de Despesas por Categoria (Donut)
  const categoryChartData = useMemo(() => {
    if (safePurchases.length === 0) return [];

    const map: Record<string, { name: string; value: number; itemsCount: number }> = {};

    for (const p of safePurchases) {
      for (const item of p.items || []) {
        if (!item) continue;
        const cat = (item.category && item.category.trim()) || 'Geral';
        const subtotal = calculateItemSubtotal(item);

        if (!map[cat]) {
          map[cat] = { name: cat, value: 0, itemsCount: 0 };
        }
        map[cat].value += subtotal;
        map[cat].itemsCount += item.quantity || 1;
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
  }, [safePurchases, stats.totalSpent]);

  // ESTADO VAZIO ELEGANTE
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
      {/* ================= CARDS DE RESUMO VISUAL ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total Histórico Gasto */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionConfig.spring}
          className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Total Histórico
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-4 h-4 stroke-[2.4]" />
            </div>
          </div>

          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight block">
              {formatCurrencyBRL(stats.totalSpent)}
            </span>
            <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-zinc-500 font-medium">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {stats.purchasesCount} {stats.purchasesCount === 1 ? 'compra' : 'compras'} ({stats.totalItemsCount} {stats.totalItemsCount === 1 ? 'item' : 'itens'})
              </span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Média por Compra */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...motionConfig.spring, delay: 0.05 }}
          className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Média por Compra
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <TrendingUp className="w-4 h-4 stroke-[2.4]" />
            </div>
          </div>

          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight block">
              {formatCurrencyBRL(stats.averagePerPurchase)}
            </span>
            <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-zinc-500 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Ticket médio por ida ao mercado</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Categoria Favorita / Maior Gasto */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...motionConfig.spring, delay: 0.1 }}
          className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Maior Despesa
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <ShoppingBag className="w-4 h-4 stroke-[2.4]" />
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight truncate max-w-[140px] block">
                {stats.topCategoryName}
              </span>
              {stats.topCategoryPercent > 0 && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                  {stats.topCategoryPercent.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1 mt-1 text-[11px] text-zinc-500 font-medium">
              <span>{formatCurrencyBRL(stats.topCategoryAmount)} no total</span>
            </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <BarChart3 className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                Evolução de Gastos
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Valor desembolsado por compra finalizada
            </p>
          </div>

          {/* Controles de Visualização: Tipo de Gráfico & Escopo */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {safePurchases.length > 8 && (
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
                  Todas ({safePurchases.length})
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
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
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
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
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
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                <PieChartIcon className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                Despesas por Categoria
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Participação de cada departamento no valor total
            </p>
          </div>

          <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded-xl">
            {categoryChartData.length} {categoryChartData.length === 1 ? 'categoria' : 'categorias'}
          </span>
        </div>

        {categoryChartData.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 text-xs">
            Nenhum item com valor registrado nas compras finalizadas.
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
    </div>
  );
}
