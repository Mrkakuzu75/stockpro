import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { Product, MovementType, MovementMotive, StockMovement } from '../types/stock';
import { stockService } from '../services/stockService';
import { useToast } from '../components/common/Toast';
import { formatQuantityWithUnit, formatDateTime } from '../utils/formatters';

interface MovementsPageProps {
  products: Product[];
  recentMovements: StockMovement[];
  onMovementSuccess: () => void;
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

export const MovementsPage: React.FC<MovementsPageProps> = ({
  products,
  recentMovements,
  onMovementSuccess,
}) => {
  const { showToast } = useToast();

  const [type, setType] = useState<MovementType>('IN');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<string>('5');
  const [motive, setMotive] = useState<MovementMotive>('reappro');
  const [customMotive, setCustomMotive] = useState<string>('');
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    setMotive(newType === 'IN' ? 'reappro' : 'vente');
    setError('');
  };

  const stockBefore = selectedProduct ? selectedProduct.quantity : 0;
  const numQty = Number(quantity) || 0;
  const stockAfter =
    type === 'IN' ? stockBefore + numQty : stockBefore - numQty;

  const isExitExceeding = type === 'OUT' && numQty > stockBefore;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProduct) {
      setError('Veuillez sélectionner un article.');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('La quantité doit être un nombre strictement supérieur à zéro.');
      return;
    }

    if (type === 'OUT' && qty > selectedProduct.quantity) {
      setError(
        `Opération impossible : Vous essayez de retirer ${qty} ${selectedProduct.unit}(s), or il ne reste que ${selectedProduct.quantity} en stock. Le stock ne peut jamais devenir négatif.`
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
        setError(result.error || 'Erreur lors de l’enregistrement.');
        setIsSubmitting(false);
        return;
      }

      showToast(
        `${type === 'IN' ? 'Entrée' : 'Sortie'} de ${qty} ${selectedProduct.unit}(s) de ${selectedProduct.name} validée ! Nouveau stock : ${stockAfter}.`,
        'success'
      );

      setQuantity('1');
      setNote('');
      setCustomMotive('');
      setError('');
      onMovementSuccess();
    } catch (err: any) {
      setError(err?.message || 'Erreur imprévue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase font-mono">
          Flux & Mouvements
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
          Entrées et Sorties de Stock
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Enregistrement immédiat des approvisionnements et des ventes au comptoir
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7 bento-porcelain p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Formulaire de Saisie
            </h3>
            <span className="text-[10px] text-blue-700 font-mono uppercase bg-blue-50 px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
              Contrôle Anti-Négatif Actif
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode selection tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Type d’opération <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTypeChange('IN')}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    type === 'IN'
                      ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      type === 'IN'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Ajouter du stock (Entrée)</span>
                  <span className="text-[11px] text-slate-500">Approvisionnement fournisseur</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('OUT')}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    type === 'OUT'
                      ? 'border-blue-300 bg-blue-50/80 text-blue-900 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      type === 'OUT'
                        ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Retirer du stock (Sortie)</span>
                  <span className="text-[11px] text-slate-500">Vente comptant, perte, avarie</span>
                </button>
              </div>
            </div>

            {/* Select product */}
            <div>
              <label htmlFor="form-prod" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Article concerné <span className="text-red-500">*</span>
              </label>
              <select
                id="form-prod"
                required
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                {products.length === 0 ? (
                  <option value="">Aucun article disponible</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — [Disponible : {p.quantity} {p.unit}(s)]
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Simulation Preview Strip */}
            {selectedProduct && (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isExitExceeding
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-slate-50/80 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-mono">
                    Impact sur l’inventaire
                  </span>
                  <span className="font-mono text-blue-600 font-bold">
                    {selectedProduct.category}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200/60">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-mono">Avant</span>
                    <span className="text-sm font-bold text-slate-800 font-mono-numbers">
                      {stockBefore} {selectedProduct.unit}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {type === 'IN' ? 'Ajout' : 'Retrait'}
                    </span>
                    <span
                      className={`text-sm font-bold font-mono-numbers ${
                        type === 'IN' ? 'text-emerald-600' : 'text-blue-600'
                      }`}
                    >
                      {type === 'IN' ? '+' : '-'}
                      {numQty || 0}
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border shadow-2xs ${
                      isExitExceeding
                        ? 'bg-red-100 border-red-300 text-red-800'
                        : 'bg-white border-blue-200 text-blue-700'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 block font-mono">Nouveau Solde</span>
                    <span className="text-sm font-black font-mono-numbers">
                      {stockAfter} {selectedProduct.unit}
                    </span>
                  </div>
                </div>

                {isExitExceeding && (
                  <p className="mt-3 text-xs text-red-700 font-medium flex items-center gap-1.5 bg-red-100/80 p-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Stock insuffisant ! Le retrait ne peut pas dépasser le stock disponible ({stockBefore} en rayon).
                  </p>
                )}
              </div>
            )}

            {/* Quantité & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="page-qty" className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantité ({selectedProduct?.unit || 'unités'}) <span className="text-red-500">*</span>
                </label>
                <input
                  id="page-qty"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setError('');
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white font-mono-numbers focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    isExitExceeding ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="page-date" className="block text-xs font-semibold text-slate-700 mb-1">
                  Date & heure
                </label>
                <input
                  id="page-date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Motif */}
            <div>
              <label htmlFor="page-motive" className="block text-xs font-semibold text-slate-700 mb-1">
                Motif de l’opération <span className="text-red-500">*</span>
              </label>
              <select
                id="page-motive"
                value={motive}
                onChange={(e) => setMotive(e.target.value as MovementMotive)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  placeholder="Précisez la raison détaillée..."
                  value={customMotive}
                  onChange={(e) => setCustomMotive(e.target.value)}
                  className="mt-2 w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Note */}
            <div>
              <label htmlFor="page-note" className="block text-xs font-semibold text-slate-700 mb-1">
                Référence, facture ou nom du client (facultatif)
              </label>
              <input
                id="page-note"
                type="text"
                placeholder="ex: Client régulier, Bon N° 890, Livraison Adjamé..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isExitExceeding || products.length === 0}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-sm text-white shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  type === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                }`}
              >
                {isSubmitting
                  ? 'Enregistrement en cours...'
                  : type === 'IN'
                  ? `Valider l’entrée (+${quantity || 0} ${selectedProduct?.unit || ''})`
                  : `Valider la sortie (-${quantity || 0} ${selectedProduct?.unit || ''})`}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Recent movements & Advice (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bento-porcelain p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Dernières Saisies
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {recentMovements.length} au total
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {recentMovements.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Aucun mouvement enregistré pour le moment.
                </div>
              ) : (
                recentMovements.slice(0, 6).map((mov) => {
                  const isEntry = mov.type === 'IN';
                  return (
                    <div
                      key={mov.id}
                      className="py-3 text-xs flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
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
                          <p className="font-bold text-slate-900 truncate">
                            {mov.productName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <span>{mov.motiveLabel}</span>
                            <span>·</span>
                            <span>{formatDateTime(mov.date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold font-mono-numbers ${
                            isEntry ? 'text-emerald-600' : 'text-slate-800'
                          }`}
                        >
                          {isEntry ? '+' : '-'}
                          {mov.quantity} {mov.unit}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono-numbers">
                          Solde : {mov.stockAfter}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bento-porcelain p-5 space-y-2 border-blue-200/80 bg-blue-50/40">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
              <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Conseil de gestion pour votre commerce</span>
            </div>
            <p className="text-xs text-blue-800/80 leading-relaxed">
              Enregistrez chaque sortie ou vente au fur et à mesure pour préserver la précision de vos alertes et de la valorisation marchande en FCFA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
