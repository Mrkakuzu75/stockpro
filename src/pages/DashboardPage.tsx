import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Store,
  Clock,
  CheckCircle2,
  ChevronDown,
  ArrowUp,
  Flame,
  ShieldCheck,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Product, StockMovement, InventoryStats, ActivePage, MovementType } from '../types/stock';
import {
  formatFCFA,
  formatQuantityWithUnit,
  formatDateTime,
  getStockStatus,
} from '../utils/formatters';

interface DashboardPageProps {
  stats: InventoryStats;
  products: Product[];
  recentMovements: StockMovement[];
  onNavigate: (page: ActivePage) => void;
  onOpenNewProduct: () => void;
  onOpenMovementForProduct: (product: Product, type: 'IN' | 'OUT') => void;
  onOpenQuickMovement?: (type: MovementType) => void;
  onSelectProduct: (product: Product) => void;
  merchantName: string;
  shopName: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  products,
  recentMovements,
  onNavigate,
  onOpenNewProduct,
  onOpenMovementForProduct,
  onOpenQuickMovement,
  onSelectProduct,
  merchantName,
  shopName,
}) => {
  // Toggle switch de la carte "Filtres"
  const [isFilterActive, setIsFilterActive] = useState(true);

  // Horloge en direct
  const [currentTime, setCurrentTime] = useState<string>('12:00:00');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s}`);

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      setCurrentDateFormatted(d.toLocaleDateString('fr-FR', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Produits sous seuil d'alerte (priorité aux ruptures 0)
  const productsToWatch = products
    .filter((p) => p.quantity <= p.alertThreshold)
    .sort((a, b) => a.quantity - b.quantity);

  const outOfStockItems = products.filter((p) => p.quantity === 0);

  // Taux de disponibilité du catalogue
  const availabilityRate =
    products.length > 0
      ? Math.round(((products.length - stats.outOfStockCount) / products.length) * 100)
      : 100;

  // Calcul marge moyenne
  const avgMarginRate =
    stats.totalEstimatedSalesValue > 0
      ? Math.round(
          ((stats.totalEstimatedSalesValue - stats.totalStockValue) /
            stats.totalEstimatedSalesValue) *
            100
        )
      : 22;

  // Calcul répartition catégories pour le graphique
  const categoryCountMap = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const maxCategoryCount = Math.max(...Object.values(categoryCountMap), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ========================================================
          1. BANDEAU D'ACCUEIL & ACTIONS CLÉS (Saute aux yeux dès connexion)
      ======================================================== */}
      <div className="bento-porcelain p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden border-blue-200/60 shadow-lg">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-l from-blue-400/10 to-transparent pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Magasin Ouvert · GMT Abidjan
            </span>
            <span className="text-xs text-slate-400 capitalize hidden sm:inline">
              {currentDateFormatted}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bonjour, {merchantName} 👋
          </h2>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
            <Store className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{shopName}</span>
            <span>·</span>
            <span className="font-mono-numbers text-slate-500">
              {stats.totalProducts} références en rayon
            </span>
          </div>
        </div>

        {/* Boutons d'Action Rapide qui sautent aux yeux */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            type="button"
            onClick={() => {
              if (onOpenQuickMovement) onOpenQuickMovement('IN');
              else onOpenMovementForProduct(products[0], 'IN');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Enregistrer une livraison ou réapprovisionnement"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Approvisionner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenQuickMovement) onOpenQuickMovement('OUT');
              else onOpenMovementForProduct(products[0], 'OUT');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Enregistrer une vente ou sortie de stock"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- Vente Comptoir</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewProduct}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200/90 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. BANDEAU D'ALERTE RUPTURES IMMÉDIAT (Impossible à rater)
      ======================================================== */}
      {productsToWatch.length > 0 && (
        <div
          role="alert"
          className="bento-porcelain p-4 sm:p-5 border-l-6 border-l-rose-500 bg-gradient-to-r from-rose-50/90 via-white/95 to-amber-50/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30 animate-bounce">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wider uppercase text-rose-600">
                  Priorité Réapprovisionnement
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {stats.outOfStockCount > 0
                    ? `${stats.outOfStockCount} rupture(s) totale(s)`
                    : `${stats.lowStockCount} stock(s) faible(s)`}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 font-medium mt-0.5">
                {outOfStockItems.length > 0 ? (
                  <>
                    <strong className="text-rose-700 font-bold">
                      {outOfStockItems[0].name}
                    </strong>{' '}
                    est totalement épuisé. Risque de vente manquée !
                  </>
                ) : (
                  <>
                    {productsToWatch.length} article(s) ont atteint ou dépassé leur seuil d'alerte minimal.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {outOfStockItems.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenMovementForProduct(outOfStockItems[0], 'IN')}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                + Commander {outOfStockItems[0].name.split(' ')[0]}
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              Voir la liste complète
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          3. LES 4 GRANDS KPI GÉANTS QUI SAUTENT AUX YEUX
      ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 : VALEUR TOTALE DU STOCK (avec les 18 barres du modèle) */}
        <div className="bento-porcelain p-5 flex flex-col justify-between border-blue-100 hover:border-blue-300 transition-all shadow-md group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase font-mono tracking-wider text-blue-600">
                Valeur du Stock (FCFA)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers mt-1 tracking-tight">
                {formatFCFA(stats.totalStockValue)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Jauge à 18 barres verticales du modèle de la vidéo */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 h-5">
              {[...Array(18)].map((_, i) => {
                const isFilled = i < 14;
                return (
                  <div
                    key={i}
                    className={`flex-1 h-full rounded-xs transition-all duration-300 ${
                      isFilled
                        ? 'bg-gradient-to-t from-blue-600 to-sky-400'
                        : 'bg-slate-200'
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-numbers mt-2">
              <span className="text-emerald-600 font-bold">+8.6% d’actif</span>
              <span className="text-slate-400">Calcul à prix d'achat</span>
            </div>
          </div>
        </div>

        {/* KPI 2 : RUPTURES CRITIQUES (0 ARTICLE) */}
        <div
          onClick={() => onNavigate('products')}
          className={`bento-porcelain p-5 flex flex-col justify-between transition-all shadow-md cursor-pointer group ${
            stats.outOfStockCount > 0
              ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase font-mono tracking-wider text-rose-600">
                Ruptures Totales (0)
              </span>
              <div className="text-3xl sm:text-4xl font-black text-rose-600 font-mono-numbers mt-1 tracking-tight flex items-baseline gap-2">
                <span>{stats.outOfStockCount}</span>
                <span className="text-xs font-semibold text-rose-600/80">article(s)</span>
              </div>
            </div>
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                stats.outOfStockCount > 0
                  ? 'bg-rose-100 text-rose-600 animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <XCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span
              className={`font-semibold ${
                stats.outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-500'
              }`}
            >
              {stats.outOfStockCount > 0
                ? 'Action immédiate requise'
                : 'Aucune rupture constatée'}
            </span>
            <span className="text-blue-600 font-bold group-hover:underline inline-flex items-center">
              Détails →
            </span>
          </div>
        </div>

        {/* KPI 3 : STOCKS FAIBLES (SOUS SEUIL D'ALERTE) */}
        <div
          onClick={() => onNavigate('products')}
          className={`bento-porcelain p-5 flex flex-col justify-between transition-all shadow-md cursor-pointer group ${
            stats.lowStockCount > 0
              ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase font-mono tracking-wider text-amber-600">
                Stocks Faibles
              </span>
              <div className="text-3xl sm:text-4xl font-black text-amber-600 font-mono-numbers mt-1 tracking-tight flex items-baseline gap-2">
                <span>{stats.lowStockCount}</span>
                <span className="text-xs font-semibold text-amber-600/80">à surveiller</span>
              </div>
            </div>
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                stats.lowStockCount > 0
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Sous le seuil d'alerte</span>
            <span className="text-blue-600 font-bold group-hover:underline inline-flex items-center">
              Commander →
            </span>
          </div>
        </div>

        {/* KPI 4 : SANTÉ GLOBALE & DISPONIBILITÉ (Jauge avec disque nuit #0f172a) */}
        <div className="bento-porcelain p-4 sm:p-5 flex items-center justify-between gap-3 shadow-md hover:border-blue-300 transition-all">
          <div>
            <span className="text-[11px] font-black uppercase font-mono tracking-wider text-slate-500">
              Disponibilité Rayon
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {stats.totalProducts - stats.outOfStockCount} / {stats.totalProducts}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-tight">
              Articles immédiatement prêts à la vente
            </p>
          </div>

          {/* Jauge circulaire avec disque intérieur bleu nuit (#0f172a) du modèle */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#e2e8f0"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#2563eb"
                strokeWidth="8"
                strokeDasharray="263.8"
                strokeDashoffset={263.8 - (263.8 * availabilityRate) / 100}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000"
              />
            </svg>

            {/* Inner Dark Navy Disc */}
            <div className="absolute w-13 h-13 rounded-full bg-[#0f172a] shadow-md flex flex-col items-center justify-center text-white">
              <span className="text-xs font-black font-mono-numbers">
                {availabilityRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. DISPOSITION À DEUX COLONNES INTUITIVES (2/3 et 1/3)
      ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            COLONNE GAUCHE (7 cols) : PRIORITÉS & DONNÉES OPÉRATIONNELLES
        ======================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* CARTE 1 GAUCHE : ARTICLES À RÉAPPROVISIONNER EN PRIORITÉ */}
          <div className="bento-porcelain p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Articles à Réapprovisionner ({productsToWatch.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Articles nécessitant une commande fournisseur immédiate
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Catalogue</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-2 divide-y divide-slate-100">
              {productsToWatch.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Tous vos stocks sont sécurisés !
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Aucun article n'a franchi son seuil minimal d'alerte.
                  </p>
                </div>
              ) : (
                productsToWatch.slice(0, 5).map((p) => {
                  const isOut = p.quantity === 0;
                  const ratio = Math.min(100, Math.round((p.quantity / (p.alertThreshold || 1)) * 100));

                  return (
                    <div
                      key={p.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-2xl transition-colors"
                    >
                      <div
                        onClick={() => onSelectProduct(p)}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate hover:text-blue-600">
                            {p.name}
                          </p>
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                              RUPTURE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                              FAIBLE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span>{p.category}</span>
                          <span>·</span>
                          <span className="font-mono-numbers">
                            Seuil : {p.alertThreshold} {p.unit}(s)
                          </span>
                          <span>·</span>
                          <span className="font-mono-numbers font-semibold text-slate-700">
                            Prix achat : {formatFCFA(p.purchasePrice)}
                          </span>
                        </div>

                        {/* Petite jauge de remplissage */}
                        <div className="w-full max-w-xs h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOut
                                ? 'bg-rose-500 w-0'
                                : ratio < 50
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(5, ratio)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right font-mono-numbers">
                          <div
                            className={`text-xs sm:text-sm font-black ${
                              isOut ? 'text-rose-600' : 'text-amber-600'
                            }`}
                          >
                            {isOut ? '0 en rayon' : `${p.quantity} ${p.unit}(s)`}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Vente : {formatFCFA(p.sellingPrice)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenMovementForProduct(p, 'IN')}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          + Réappro
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CARTE 2 GAUCHE : ROTATION PAR CATÉGORIE (Barres horizontales du modèle) */}
          <div className="bento-porcelain p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase font-mono tracking-wider">
                  Structure des stocks
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Rotation par Catégorie de Produits
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                Octobre 2026
              </span>
            </div>

            <div className="my-4 space-y-3.5">
              {sortedCategories.map(([catName, count]) => {
                const percent = Math.round((count / stats.totalProducts) * 100);
                const widthPercent = Math.max(15, Math.round((count / maxCategoryCount) * 100));

                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>{catName}</span>
                      <span className="font-mono-numbers text-slate-500 text-[11px]">
                        {count} article(s) ({percent}%)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 transition-all duration-700"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{sortedCategories.length} catégories principales en rayon</span>
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                Explorer tout l’inventaire
              </button>
            </div>
          </div>

          {/* CARTE 3 GAUCHE : DERNIERS MOUVEMENTS DU JOUR */}
          <div className="bento-porcelain p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Dernières Opérations Enregistrées
                  </h3>
                  <p className="text-xs text-slate-500">Flux d’entrées et de sorties en temps réel</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Journal complet</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-2 divide-y divide-slate-100">
              {recentMovements.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Aucun mouvement enregistré récemment.
                </div>
              ) : (
                recentMovements.slice(0, 4).map((mov) => {
                  const isEntry = mov.type === 'IN';
                  return (
                    <div
                      key={mov.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
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
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                            {mov.productName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-medium">{mov.motiveLabel}</span>
                            <span>·</span>
                            <span className="font-mono-numbers">{formatDateTime(mov.date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs sm:text-sm font-black font-mono-numbers ${
                            isEntry ? 'text-emerald-600' : 'text-blue-600'
                          }`}
                        >
                          {isEntry ? '+' : '-'}
                          {mov.quantity} {mov.unit}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono-numbers">
                          Nouveau solde : {mov.stockAfter}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            COLONNE DROITE (5 cols) : LE COCKPIT BENTO & OUTILS VIDÉO
        ======================================================== */}
        <div className="lg:col-span-5 space-y-6">
          {/* CARTE 1 DROITE : HORLOGE BOUTIQUE GMT EN TEMPS RÉEL (Modèle de la vidéo) */}
          <div className="bento-blue-gradient p-5 shadow-lg flex items-center justify-between relative overflow-hidden">
            <div className="z-10">
              <div className="flex items-center gap-1.5 text-xs text-white/90 font-bold uppercase tracking-wider font-mono">
                <Clock className="w-4 h-4" />
                <span>Horloge Boutique (GMT)</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono-numbers text-white mt-1.5 tracking-wider">
                {currentTime}
              </div>
              <p className="text-xs text-white/80 mt-1 capitalize font-medium">
                {currentDateFormatted}
              </p>
            </div>

            <div className="text-right z-10">
              <span className="text-[11px] text-white/80 font-mono block">Abidjan, CI</span>
              <span className="inline-block mt-1 px-3 py-1 rounded-full text-[11px] font-black bg-white text-blue-800 shadow-xs">
                Ouvert
              </span>
            </div>
          </div>

          {/* CARTE 2 DROITE : SPEEDOMÈTRE DE MARGE & VALEUR PRÉVISIONNELLE */}
          <div className="bento-porcelain p-5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Rentabilité
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                  Marge & Ventes Prévisionnelles
                </h4>
              </div>
              <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">
                +{avgMarginRate}% Marge
              </span>
            </div>

            <div className="my-4 flex items-center justify-between gap-4">
              {/* Semi-circular Speedometer Arc */}
              <div className="relative w-28 h-16 overflow-hidden flex items-end justify-center shrink-0">
                <svg className="w-28 h-28 absolute top-0" viewBox="0 0 100 100">
                  <path
                    d="M 15 50 A 35 35 0 0 1 85 50"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                    fill="none"
                  />
                  <path
                    d="M 15 50 A 35 35 0 0 1 85 50"
                    stroke="#2563eb"
                    strokeWidth="8"
                    strokeDasharray="110"
                    strokeDashoffset={110 - (110 * 78) / 100}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <span className="text-xs font-black font-mono text-slate-900 pb-0.5">
                  +{avgMarginRate}%
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                  Valeur de Vente Totale
                </span>
                <span className="text-base sm:text-lg font-black font-mono-numbers text-slate-900 block mt-0.5">
                  {formatFCFA(stats.totalEstimatedSalesValue)}
                </span>
                <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                  Gain net est. : +{formatFCFA(stats.totalEstimatedSalesValue - stats.totalStockValue)}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Bénéfice brut potentiel</span>
              <span className="font-mono-numbers font-bold text-slate-800">
                {avgMarginRate}% du chiffre d'affaires
              </span>
            </div>
          </div>

          {/* CARTE 3 DROITE : CYCLE D’APPROVISIONNEMENT (Gantt Blocks du modèle) */}
          <div className="bento-porcelain p-5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Gestion des flux
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                  Cycle d’Approvisionnement Magasin
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">J+1 à J+3</span>
            </div>

            {/* Stepped Gantt timeline blocks */}
            <div className="my-4 border-l-2 border-b-2 border-slate-200 p-2 space-y-2.5 bg-slate-50/60 rounded-xl">
              <div className="ml-1 w-2/5 py-1 px-2.5 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-black font-mono flex items-center justify-between">
                <span>1. Commande</span>
                <span>✓</span>
              </div>
              <div className="ml-8 w-2/5 py-1 px-2.5 rounded-lg bg-blue-500 text-white text-[10px] font-black font-mono shadow-xs flex items-center justify-between">
                <span>2. Réception</span>
                <span>✓</span>
              </div>
              <div className="ml-16 w-2/5 py-1 px-2.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black font-mono shadow-xs flex items-center justify-between">
                <span>3. Vente comptoir</span>
                <span>●</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Grossiste Adjamé</span>
              <span>Stockage</span>
              <span>Comptoir</span>
            </div>
          </div>

          {/* CARTE 4 DROITE : FILTRES & CAPSULE TOGGLE (Modèle de la vidéo) */}
          <div className="bento-porcelain p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Accès & Filtres Rapides
              </h4>

              {/* Capsule Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsFilterActive(!isFilterActive)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  isFilterActive ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                aria-label="Basculer filtre"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    isFilterActive ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Filtrez instantanément le catalogue par catégorie ou état de stock
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {['Tous les articles', 'Alimentation', 'Boissons', 'Épicerie', 'Ruptures'].map(
                (filterName, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onNavigate('products')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{filterName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
