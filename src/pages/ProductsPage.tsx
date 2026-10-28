import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { Product, StockStatus } from '../types/stock';
import {
  formatFCFA,
  formatQuantityWithUnit,
  getStockStatus,
} from '../utils/formatters';

interface ProductsPageProps {
  products: Product[];
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onQuickMovement: (product: Product, type: 'IN' | 'OUT') => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  onOpenNewProduct,
  onEditProduct,
  onDeleteProduct,
  onSelectProduct,
  onQuickMovement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;

      const currentStatus = getStockStatus(p);
      const matchesStatus =
        statusFilter === 'all' || currentStatus === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, statusFilter]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase font-mono">
            Catalogue & Rayons
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Gestion des Produits ({products.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Suivi des quantités en stock, prix d’achat/vente en FCFA et alertes de réapprovisionnement
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewProduct}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl shadow-md shadow-blue-500/25 transition-all self-start sm:self-auto cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un produit</span>
        </button>
      </div>

      {/* Filter Toolbar Bento Card */}
      <div className="bento-porcelain p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Rechercher par nom, catégorie, référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Category */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | StockStatus)}
              className="px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="all">Tous les états de stock</option>
              <option value="normal">Stock disponible</option>
              <option value="low">Stock faible</option>
              <option value="out">Épuisé (Rupture)</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Effacer tous les filtres"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé
            {filteredProducts.length > 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <span className="text-blue-600 font-semibold">Filtres actifs</span>
          )}
        </div>
      </div>

      {/* Main Table */}
      {filteredProducts.length === 0 ? (
        <div className="bento-porcelain p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Aucun produit trouvé</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Aucun article ne correspond à votre recherche.'
              : 'Votre inventaire est encore vide.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Réinitialiser la recherche
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenNewProduct}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                + Ajouter mon premier produit
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bento-porcelain overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-mono uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-5">Produit & Référence</th>
                    <th className="py-4 px-5">Catégorie</th>
                    <th className="py-4 px-5 text-right">Quantité en stock</th>
                    <th className="py-4 px-5 text-right">Prix d'achat</th>
                    <th className="py-4 px-5 text-right">Prix de vente</th>
                    <th className="py-4 px-5 text-center">Statut du stock</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredProducts.map((p) => {
                    const status = getStockStatus(p);
                    const isOut = status === 'out';
                    const isLow = status === 'low';

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        {/* Produit */}
                        <td className="py-3.5 px-5">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(p)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left cursor-pointer transition-colors text-sm"
                          >
                            {p.name}
                          </button>
                          {p.sku && (
                            <div className="text-[11px] text-slate-400 font-mono-numbers mt-0.5">
                              Réf : {p.sku}
                            </div>
                          )}
                        </td>

                        {/* Catégorie */}
                        <td className="py-3.5 px-5 text-slate-600">
                          {p.category}
                        </td>

                        {/* Quantité & Seuil */}
                        <td className="py-3.5 px-5 text-right">
                          <span
                            className={`font-black font-mono-numbers text-sm ${
                              isOut
                                ? 'text-red-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {p.quantity}
                          </span>{' '}
                          <span className="text-slate-400 font-medium">{p.unit}(s)</span>
                          <div className="text-[10px] text-slate-400 font-mono-numbers">
                            Alerte ≤ {p.alertThreshold}
                          </div>
                        </td>

                        {/* Prix d'achat */}
                        <td className="py-3.5 px-5 text-right font-mono-numbers text-slate-700 font-medium">
                          {formatFCFA(p.purchasePrice)}
                        </td>

                        {/* Prix de vente */}
                        <td className="py-3.5 px-5 text-right font-mono-numbers font-bold text-slate-900">
                          {formatFCFA(p.sellingPrice)}
                        </td>

                        {/* Statut */}
                        <td className="py-3.5 px-5 text-center">
                          {status === 'out' && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Épuisé</span>
                            </div>
                          )}
                          {status === 'low' && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Stock faible</span>
                            </div>
                          )}
                          {status === 'normal' && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Disponible</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onQuickMovement(p, 'IN')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Ajouter du stock (+)"
                            >
                              <ArrowDownLeft className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onQuickMovement(p, 'OUT')}
                              disabled={p.quantity <= 0}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                              title="Retirer du stock (-)"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteProduct(p)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {filteredProducts.map((p) => {
              const status = getStockStatus(p);
              const isOut = status === 'out';
              const isLow = status === 'low';

              return (
                <div key={p.id} className="bento-porcelain p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-blue-600 font-mono uppercase tracking-wider block font-semibold">
                        {p.category}
                      </span>
                      <h3
                        onClick={() => onSelectProduct(p)}
                        className="text-sm font-bold text-slate-900 truncate mt-0.5 cursor-pointer hover:text-blue-600"
                      >
                        {p.name}
                      </h3>
                      {p.sku && (
                        <p className="text-[11px] text-slate-400 font-mono-numbers">
                          Réf: {p.sku}
                        </p>
                      )}
                    </div>

                    <div>
                      {status === 'out' && (
                        <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Épuisé
                        </span>
                      )}
                      {status === 'low' && (
                        <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Faible
                        </span>
                      )}
                      {status === 'normal' && (
                        <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> OK
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">En stock</span>
                      <span
                        className={`font-black font-mono-numbers ${
                          isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {formatQuantityWithUnit(p.quantity, p.unit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Prix achat</span>
                      <span className="font-semibold text-slate-700 font-mono-numbers">
                        {formatFCFA(p.purchasePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Prix vente</span>
                      <span className="font-bold text-slate-900 font-mono-numbers">
                        {formatFCFA(p.sellingPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onQuickMovement(p, 'IN')}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 cursor-pointer"
                      >
                        + Entrée
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickMovement(p, 'OUT')}
                        disabled={p.quantity <= 0}
                        className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer disabled:opacity-30"
                      >
                        - Sortie
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-800"
                        title="Détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditProduct(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-800"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(p)}
                        className="p-1.5 text-red-500 hover:text-red-700"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
