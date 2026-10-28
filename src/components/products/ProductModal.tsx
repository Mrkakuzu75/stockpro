import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Product, StockUnit } from '../../types/stock';
import { formatFCFA } from '../../utils/formatters';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => void | Promise<void>;
  productToEdit?: Product | null;
}

const COMMON_CATEGORIES = [
  'Alimentation générale',
  'Épicerie',
  'Boissons',
  'Entretien & Lessive',
  'Hygiène & Beauté',
  'Divers',
];

const COMMON_UNITS: StockUnit[] = [
  'pièce',
  'paquet',
  'sac',
  'carton',
  'bidon',
  'bouteille',
  'boîte',
  'kilogramme',
  'litre',
  'pack',
  'autre',
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
}) => {
  const isEditing = Boolean(productToEdit);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Alimentation générale');
  const [customCategory, setCustomCategory] = useState('');
  const [unit, setUnit] = useState<string>('pièce');
  const [customUnit, setCustomUnit] = useState('');
  const [quantity, setQuantity] = useState<number | string>('10');
  const [purchasePrice, setPurchasePrice] = useState<number | string>('1000');
  const [sellingPrice, setSellingPrice] = useState<number | string>('1200');
  const [alertThreshold, setAlertThreshold] = useState<number | string>('5');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      if (COMMON_CATEGORIES.includes(productToEdit.category)) {
        setCategory(productToEdit.category);
        setCustomCategory('');
      } else {
        setCategory('autre');
        setCustomCategory(productToEdit.category);
      }

      if (COMMON_UNITS.includes(productToEdit.unit as StockUnit)) {
        setUnit(productToEdit.unit);
        setCustomUnit('');
      } else {
        setUnit('autre');
        setCustomUnit(productToEdit.unit);
      }

      setQuantity(productToEdit.quantity.toString());
      setPurchasePrice(productToEdit.purchasePrice.toString());
      setSellingPrice(productToEdit.sellingPrice.toString());
      setAlertThreshold(productToEdit.alertThreshold.toString());
      setSku(productToEdit.sku || '');
      setDescription(productToEdit.description || '');
    } else {
      setName('');
      setCategory('Alimentation générale');
      setCustomCategory('');
      setUnit('pièce');
      setCustomUnit('');
      setQuantity('10');
      setPurchasePrice('1000');
      setSellingPrice('1250');
      setAlertThreshold('5');
      setSku('');
      setDescription('');
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const numPurchase = Number(purchasePrice) || 0;
  const numSelling = Number(sellingPrice) || 0;
  const unitMargin = numSelling - numPurchase;
  const marginPercent = numSelling > 0 ? ((unitMargin / numSelling) * 100).toFixed(1) : '0';

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Le nom du produit est obligatoire.';
    }

    if (category === 'autre' && !customCategory.trim()) {
      errs.category = 'Veuillez préciser la catégorie.';
    }

    if (unit === 'autre' && !customUnit.trim()) {
      errs.unit = 'Veuillez préciser l’unité.';
    }

    const qtyNum = Number(quantity);
    if (quantity === '' || isNaN(qtyNum) || qtyNum < 0) {
      errs.quantity = 'La quantité doit être un nombre supérieur ou égal à zéro.';
    }

    const buyNum = Number(purchasePrice);
    if (purchasePrice === '' || isNaN(buyNum) || buyNum < 0) {
      errs.purchasePrice = 'Le prix d’achat doit être un montant positif ou nul en FCFA.';
    }

    const sellNum = Number(sellingPrice);
    if (sellingPrice === '' || isNaN(sellNum) || sellNum < 0) {
      errs.sellingPrice = 'Le prix de vente doit être un montant positif ou nul en FCFA.';
    }

    const alertNum = Number(alertThreshold);
    if (alertThreshold === '' || isNaN(alertNum) || alertNum < 0) {
      errs.alertThreshold = 'Le seuil d’alerte doit être un nombre supérieur ou égal à zéro.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);

    const finalCategory = category === 'autre' ? customCategory.trim() : category;
    const finalUnit = unit === 'autre' ? customUnit.trim() : unit;

    try {
      await onSave(
        {
          name: name.trim(),
          category: finalCategory,
          unit: finalUnit,
          quantity: Math.max(0, Math.floor(Number(quantity))),
          purchasePrice: Math.max(0, Math.round(Number(purchasePrice))),
          sellingPrice: Math.max(0, Math.round(Number(sellingPrice))),
          alertThreshold: Math.max(0, Math.floor(Number(alertThreshold))),
          sku: sku.trim() || undefined,
          description: description.trim() || undefined,
        },
        productToEdit?.id
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/80 shadow-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700">
              Fiche Article
            </span>
            <h2 id="product-modal-title" className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {isEditing ? 'Modifier la fiche produit' : 'Ajouter un nouveau produit'}
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
          {/* Nom */}
          <div>
            <label htmlFor="prod-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Nom de l'article <span className="text-rose-500">*</span>
            </label>
            <input
              id="prod-name"
              type="text"
              required
              placeholder="ex: Riz parfumé Dinor 25kg, Sucre SOSUCO 1kg..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                errors.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Catégorie & Unité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="prod-category" className="block text-xs font-semibold text-slate-700 mb-1">
                Catégorie
              </label>
              <select
                id="prod-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="autre">+ Autre catégorie personnalisée</option>
              </select>
              {category === 'autre' && (
                <input
                  type="text"
                  placeholder="Précisez la catégorie..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label htmlFor="prod-unit" className="block text-xs font-semibold text-slate-700 mb-1">
                Unité de stock
              </label>
              <select
                id="prod-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 capitalize"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} className="capitalize">
                    {u}
                  </option>
                ))}
              </select>
              {unit === 'autre' && (
                <input
                  type="text"
                  placeholder="ex: sachet, barquette..."
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          {/* Quantité & Seuil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="prod-qty" className="block text-xs font-semibold text-slate-700 mb-1">
                {isEditing ? 'Quantité en rayon' : 'Quantité initiale'} <span className="text-rose-500">*</span>
              </label>
              <input
                id="prod-qty"
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono-numbers focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-rose-600">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label htmlFor="prod-threshold" className="block text-xs font-semibold text-slate-700 mb-1">
                Seuil d’alerte (Stock faible) <span className="text-rose-500">*</span>
              </label>
              <input
                id="prod-threshold"
                type="number"
                min="0"
                step="1"
                required
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-mono-numbers focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Alerte si stock ≤ {alertThreshold || 0}
              </p>
            </div>
          </div>

          {/* Tarification */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Tarification unitaire</span>
              <span className="text-[11px] font-mono text-blue-700 font-bold">Monnaie : FCFA</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="prod-buy" className="block text-xs text-slate-600 mb-1">
                  Prix d’achat (FCFA) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="prod-buy"
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full pl-3 pr-14 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 font-mono-numbers focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">FCFA</span>
                </div>
              </div>

              <div>
                <label htmlFor="prod-sell" className="block text-xs text-slate-600 mb-1">
                  Prix de vente (FCFA) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="prod-sell"
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full pl-3 pr-14 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 font-mono-numbers focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">FCFA</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Marge brute estimée :</span>
              <span className="font-mono-numbers font-bold text-blue-700">
                +{formatFCFA(unitMargin)} ({marginPercent}%)
              </span>
            </div>
          </div>

          {/* SKU & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="prod-sku" className="block text-xs font-semibold text-slate-700 mb-1">
                Référence interne / SKU
              </label>
              <input
                id="prod-sku"
                type="text"
                placeholder="ex: RIZ-25KG-01"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 uppercase font-mono-numbers focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="prod-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Fournisseur
              </label>
              <input
                id="prod-desc"
                type="text"
                placeholder="ex: Grossiste Adjamé..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

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
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? 'Enregistrement...'
                : isEditing
                ? 'Mettre à jour le produit'
                : 'Enregistrer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
