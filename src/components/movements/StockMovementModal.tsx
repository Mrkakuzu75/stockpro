import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { Product, MovementType, MovementMotive } from '../../types/stock';
import { formatQuantityWithUnit } from '../../utils/formatters';
import { stockService } from '../../services/stockService';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProduct?: Product | null;
  initialType?: MovementType;
}

const IN_MOTIVES: { id: MovementMotive; label: string }[] = [
  { id: 'reappro', label: 'Réapprovisionnement fournisseur' },
  { id: 'retour', label: 'Retour client' },
  { id: 'correction', label: 'Correction d’inventaire (surplus)' },
  { id: 'autre', label: 'Autre motif d’entrée' },
];

const OUT_MOTIVES: { id: MovementMotive; label: string }[] = [
  { id: 'vente', label: 'Vente au comptant' },
  { id: 'perte', label: 'Perte ou disparition' },
  { id: 'casse', label: 'Casse ou avarie' },
  { id: 'conso_perso', label: 'Consommation personnelle / Famille' },
  { id: 'correction', label: 'Correction d’inventaire (manquant)' },
  { id: 'autre', label: 'Autre motif de sortie' },
];

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProduct,
  initialType = 'IN',
}) => {
  const [type, setType] = useState<MovementType>(initialType);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [motive, setMotive] = useState<MovementMotive>('reappro');
  const [customMotive, setCustomMotive] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      if (initialProduct) {
        setSelectedProductId(initialProduct.id);
      } else if (products.length > 0) {
        setSelectedProductId(products[0].id);
      } else {
        setSelectedProductId('');
      }

      setQuantity('1');
      setMotive(initialType === 'IN' ? 'reappro' : 'vente');
      setCustomMotive('');
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDate(localIso);
      setNote('');
      setError('');
    }
  }, [isOpen, initialProduct, initialType, products]);

  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    setMotive(newType === 'IN' ? 'reappro' : 'vente');
    setError('');
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const stockBefore = selectedProduct ? selectedProduct.quantity : 0;
  const numQty = Number(quantity) || 0;
  const stockAfter =
    type === 'IN' ? stockBefore + numQty : stockBefore - numQty;

  const isExitExceeding = type === 'OUT' && numQty > stockBefore;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProduct) {
      setError('Veuillez sélectionner un produit.');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('La quantité doit être un nombre strictement supérieur à zéro.');
      return;
    }

    if (type === 'OUT' && qty > selectedProduct.quantity) {
      setError(
        `Impossible de retirer ${qty} ${selectedProduct.unit}(s). Le stock disponible n'est que de ${selectedProduct.quantity}. Le stock ne peut pas être négatif.`
      );
      return;
    }

    const currentMotivesList = type === 'IN' ? IN_MOTIVES : OUT_MOTIVES;
    const selectedMotiveObj = currentMotivesList.find((m) => m.id === motive);
    const finalMotiveLabel =
      motive === 'autre' && customMotive.trim()
        ? customMotive.trim()
        : selectedMotiveObj?.label || 'Mouvement de stock';

    setIsSubmitting(true);

    try {
      const result = await stockService.recordMovement({
        productId: selectedProduct.id,
        type,
        quantity: Math.floor(qty),
        motive,
        motiveLabel: finalMotiveLabel,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        note: note.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Une erreur est survenue lors de l’enregistrement.');
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur technique lors de l’enregistrement.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700">
              Flux Rapide
            </span>
            <h2 id="movement-modal-title" className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              Enregistrer un mouvement de stock
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Action Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Type d’opération <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('IN')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'IN'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Entrée (Ajout)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('OUT')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'OUT'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>- Sortie (Retrait)</span>
              </button>
            </div>
          </div>

          {/* Produit */}
          <div>
            <label htmlFor="mov-product" className="block text-xs font-semibold text-slate-700 mb-1">
              Produit sélectionné <span className="text-rose-500">*</span>
            </label>
            <select
              id="mov-product"
              required
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ({p.quantity} {p.unit} en rayon)
                </option>
              ))}
            </select>
          </div>

          {/* Simulation Box */}
          {selectedProduct && (
            <div
              className={`p-4 rounded-2xl border transition-colors ${
                isExitExceeding
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">Stock actuel :</span>
                <span className="font-bold font-mono-numbers">
                  {formatQuantityWithUnit(stockBefore, selectedProduct.unit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-slate-500 font-mono">
                  {type === 'IN' ? 'Ajout prévu :' : 'Retrait prévu :'}
                </span>
                <span
                  className={`font-bold font-mono-numbers ${
                    type === 'IN' ? 'text-emerald-700' : 'text-blue-700'
                  }`}
                >
                  {type === 'IN' ? '+' : '-'}
                  {numQty || 0} {selectedProduct.unit}(s)
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Nouveau solde prévu :</span>
                <span
                  className={`font-black text-sm font-mono-numbers ${
                    isExitExceeding
                      ? 'text-rose-600'
                      : stockAfter === 0
                      ? 'text-amber-600'
                      : 'text-blue-700'
                  }`}
                >
                  {stockAfter} {selectedProduct.unit}(s)
                </span>
              </div>

              {isExitExceeding && (
                <p className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Stock insuffisant ! Le retrait dépasse la quantité disponible.
                </p>
              )}
            </div>
          )}

          {/* Quantité & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="mov-qty" className="block text-xs font-semibold text-slate-700 mb-1">
                Quantité <span className="text-rose-500">*</span>
              </label>
              <input
                id="mov-qty"
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError('');
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 font-mono-numbers focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  isExitExceeding ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                }`}
              />
            </div>

            <div>
              <label htmlFor="mov-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Date et heure
              </label>
              <input
                id="mov-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Motif */}
          <div>
            <label htmlFor="mov-motive" className="block text-xs font-semibold text-slate-700 mb-1">
              Motif du mouvement <span className="text-rose-500">*</span>
            </label>
            <select
              id="mov-motive"
              value={motive}
              onChange={(e) => setMotive(e.target.value as MovementMotive)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {(type === 'IN' ? IN_MOTIVES : OUT_MOTIVES).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            {motive === 'autre' && (
              <input
                type="text"
                placeholder="Précisez le motif..."
                value={customMotive}
                onChange={(e) => setCustomMotive(e.target.value)}
                className="mt-2 w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Note */}
          <div>
            <label htmlFor="mov-note" className="block text-xs font-semibold text-slate-700 mb-1">
              Note, nom du client ou bon de livraison
            </label>
            <input
              id="mov-note"
              type="text"
              placeholder="ex: Facture N° 1042, Client Kouamé..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isExitExceeding}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                type === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
              }`}
            >
              {isSubmitting
                ? 'Validation...'
                : type === 'IN'
                ? 'Valider l’entrée de stock'
                : 'Valider la sortie de stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
