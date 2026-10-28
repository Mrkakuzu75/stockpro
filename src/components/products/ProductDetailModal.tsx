import React from 'react';
import {
  X,
  Edit2,
  Trash2,
  PlusCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { Product, StockMovement } from '../../types/stock';
import {
  formatFCFA,
  getStockStatus,
  formatDateTime,
} from '../../utils/formatters';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onMovement: (product: Product, type: 'IN' | 'OUT') => void;
  movements: StockMovement[];
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onMovement,
  movements,
}) => {
  if (!isOpen || !product) return null;

  const status = getStockStatus(product);

  const productMovements = movements
    .filter((m) => m.productId === product.id)
    .slice(0, 6);

  const stockValue = product.quantity * product.purchasePrice;
  const unitMargin = product.sellingPrice - product.purchasePrice;
  const marginPercent =
    product.sellingPrice > 0
      ? ((unitMargin / product.sellingPrice) * 100).toFixed(1)
      : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 shadow-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-wider">
                {product.category}
              </span>
              {product.sku && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-mono font-medium text-slate-500">
                    Réf : {product.sku}
                  </span>
                </>
              )}
            </div>
            <h2 id="product-detail-title" className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Main Hero Qty Bento */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 font-mono uppercase block">
                Quantité en stock
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black text-slate-900 font-mono-numbers">
                  {product.quantity}
                </span>
                <span className="text-sm font-medium text-slate-600 capitalize">
                  {product.unit}(s)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status === 'out' && (
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Rupture totale (0 disponible)</span>
                </div>
              )}
              {status === 'low' && (
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Stock faible (Seuil: {product.alertThreshold})</span>
                </div>
              )}
              {status === 'normal' && (
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Stock suffisant (Seuil: {product.alertThreshold})</span>
                </div>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Prix achat</span>
              <p className="text-sm font-bold text-slate-900 mt-1 font-mono-numbers">
                {formatFCFA(product.purchasePrice)}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Prix vente</span>
              <p className="text-sm font-bold text-slate-900 mt-1 font-mono-numbers">
                {formatFCFA(product.sellingPrice)}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Marge unitaire</span>
              <p className="text-sm font-bold text-blue-700 mt-1 font-mono-numbers">
                +{formatFCFA(unitMargin)}
              </p>
              <span className="text-[10px] text-slate-500 font-mono-numbers">{marginPercent}%</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Valeur totale</span>
              <p className="text-sm font-bold text-slate-900 mt-1 font-mono-numbers">
                {formatFCFA(stockValue)}
              </p>
            </div>
          </div>

          {/* Quick Action Strip */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-blue-900 block">
                Actions directes sur cet article
              </span>
              <p className="text-[11px] text-slate-600">
                Enregistrez immédiatement un approvisionnement ou une vente
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onMovement(product, 'IN')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Entrée</span>
              </button>
              <button
                type="button"
                onClick={() => onMovement(product, 'OUT')}
                disabled={product.quantity <= 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-800 bg-white border border-blue-300 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <MinusCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>- Sortie</span>
              </button>
            </div>
          </div>

          {/* Movements */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
                Derniers flux de cet article
              </h3>
              <span className="text-[11px] text-slate-500 font-mono-numbers">
                {productMovements.length} enregistré(s)
              </span>
            </div>

            {productMovements.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">
                  Aucun mouvement spécifique enregistré pour ce produit.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {productMovements.map((m) => {
                  const isEntry = m.type === 'IN';
                  return (
                    <div
                      key={m.id}
                      className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isEntry
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-blue-50 text-blue-600 border border-blue-200'
                          }`}
                        >
                          {isEntry ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {m.motiveLabel}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateTime(m.date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold font-mono-numbers ${
                            isEntry ? 'text-emerald-700' : 'text-blue-700'
                          }`}
                        >
                          {isEntry ? '+' : '-'}
                          {m.quantity} {m.unit}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono-numbers">
                          Solde : {m.stockAfter}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDelete(product)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Supprimer</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modifier la fiche</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
