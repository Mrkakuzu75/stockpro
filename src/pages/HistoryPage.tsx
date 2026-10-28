import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import { StockMovement, Product, MovementType } from '../types/stock';
import { formatDateTime } from '../utils/formatters';

interface HistoryPageProps {
  movements: StockMovement[];
  products: Product[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  movements,
  products,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const filteredMovements = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return movements.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        m.motiveLabel.toLowerCase().includes(q) ||
        (m.note && m.note.toLowerCase().includes(q));

      const matchesType = typeFilter === 'all' || m.type === typeFilter;
      const matchesProduct =
        selectedProductId === 'all' || m.productId === selectedProductId;

      let matchesPeriod = true;
      if (periodFilter !== 'all') {
        const mTime = new Date(m.date).getTime();
        if (periodFilter === 'today') {
          matchesPeriod = mTime >= startOfToday;
        } else if (periodFilter === 'week') {
          matchesPeriod = mTime >= startOfWeek;
        } else if (periodFilter === 'month') {
          matchesPeriod = mTime >= startOfMonth;
        }
      }

      return matchesSearch && matchesType && matchesProduct && matchesPeriod;
    });
  }, [movements, searchQuery, typeFilter, selectedProductId, periodFilter]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    typeFilter !== 'all' ||
    selectedProductId !== 'all' ||
    periodFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setSelectedProductId('all');
    setPeriodFilter('all');
  };

  const handleExportCSV = () => {
    if (filteredMovements.length === 0) return;

    const headers = [
      'Date & Heure',
      'Produit',
      'Type',
      'Quantité',
      'Unité',
      'Motif',
      'Stock Avant',
      'Stock Après',
      'Notes',
    ];

    const rows = filteredMovements.map((m) => [
      `"${formatDateTime(m.date)}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      m.type === 'IN' ? 'Entrée' : 'Sortie',
      m.quantity,
      `"${m.unit}"`,
      `"${m.motiveLabel.replace(/"/g, '""')}"`,
      m.stockBefore,
      m.stockAfter,
      `"${(m.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `StockPro_Historique_Mouvements_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalEntries = filteredMovements
    .filter((m) => m.type === 'IN')
    .reduce((acc, m) => acc + m.quantity, 0);

  const totalExits = filteredMovements
    .filter((m) => m.type === 'OUT')
    .reduce((acc, m) => acc + m.quantity, 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase font-mono">
            Traçabilité & Journal
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Historique des Flux ({movements.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Journal inaltérable des entrées et sorties de marchandise avec export CSV
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filteredMovements.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl shadow-xs transition-colors cursor-pointer disabled:opacity-40 self-start sm:self-auto hover:border-blue-300"
        >
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          <span>Exporter en CSV</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-porcelain p-4">
          <span className="text-[10px] text-slate-400 block font-mono uppercase font-bold">
            Opérations répertoriées
          </span>
          <span className="text-2xl font-black text-slate-900 font-mono-numbers mt-1 block">
            {filteredMovements.length}
          </span>
        </div>
        <div className="bento-porcelain p-4 border-emerald-200/80 bg-emerald-50/50">
          <span className="text-[10px] text-emerald-800 block font-mono uppercase font-bold">
            Articles entrés (+)
          </span>
          <span className="text-2xl font-black text-emerald-700 font-mono-numbers mt-1 block">
            +{totalEntries}
          </span>
        </div>
        <div className="bento-porcelain p-4 border-blue-200/80 bg-blue-50/50">
          <span className="text-[10px] text-blue-800 block font-mono uppercase font-bold">
            Articles sortis (-)
          </span>
          <span className="text-2xl font-black text-blue-700 font-mono-numbers mt-1 block">
            -{totalExits}
          </span>
        </div>
      </div>

      {/* Filter Toolbar Bento */}
      <div className="bento-porcelain p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Rechercher par article, motif ou note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Filter Type */}
          <div className="md:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | MovementType)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="all">Tous les flux (Entrées & Sorties)</option>
              <option value="IN">Entrées uniquement (+)</option>
              <option value="OUT">Sorties uniquement (-)</option>
            </select>
          </div>

          {/* Filter Product */}
          <div className="md:col-span-3">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="all">Tous les articles</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Period */}
          <div className="md:col-span-2">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="all">Toutes périodes</option>
              <option value="today">Aujourd’hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">Ce mois-ci</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {filteredMovements.length} enregistrement(s) trouvé(s)
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </button>
          </div>
        )}
      </div>

      {/* Movement Table */}
      {filteredMovements.length === 0 ? (
        <div className="bento-porcelain p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Aucun mouvement trouvé</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Aucun mouvement ne correspond aux filtres actuels.'
              : 'Aucune transaction enregistrée.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="bento-porcelain overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-5">Date & Heure</th>
                  <th className="py-4 px-5">Article</th>
                  <th className="py-4 px-5">Type de flux</th>
                  <th className="py-4 px-5 text-right">Quantité</th>
                  <th className="py-4 px-5">Motif & Référence</th>
                  <th className="py-4 px-5 text-right">Stock avant</th>
                  <th className="py-4 px-5 text-right">Nouveau solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredMovements.map((m) => {
                  const isEntry = m.type === 'IN';
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono-numbers text-slate-400 whitespace-nowrap">
                        {formatDateTime(m.date)}
                      </td>

                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        {m.productName}
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1.5 font-bold text-xs ${
                            isEntry ? 'text-emerald-700' : 'text-blue-700'
                          }`}
                        >
                          {isEntry ? (
                            <ArrowDownLeft className="w-4 h-4 shrink-0 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 shrink-0 text-blue-600" />
                          )}
                          <span>{isEntry ? 'Entrée (+)' : 'Sortie (-)'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono-numbers whitespace-nowrap">
                        <span
                          className={`font-black text-sm ${
                            isEntry ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {isEntry ? '+' : '-'}
                          {m.quantity}
                        </span>{' '}
                        <span className="text-slate-400 font-medium">{m.unit}(s)</span>
                      </td>

                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-800">{m.motiveLabel}</p>
                        {m.note && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">
                            "{m.note}"
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono-numbers text-slate-400">
                        {m.stockBefore}
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono-numbers font-black text-slate-900">
                        {m.stockAfter}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
