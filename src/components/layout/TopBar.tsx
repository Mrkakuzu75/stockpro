import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Plus,
  ArrowLeftRight,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { ActivePage, Product } from '../../types/stock';
import { formatQuantityWithUnit } from '../../utils/formatters';

interface TopBarProps {
  activePage: ActivePage;
  onOpenMobile: () => void;
  onOpenNewProduct: () => void;
  onOpenQuickMovement: () => void;
  onSelectProduct: (product: Product) => void;
  alertProducts: Product[];
  onNavigate: (page: ActivePage) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  onOpenMobile,
  onOpenNewProduct,
  onOpenQuickMovement,
  onSelectProduct,
  alertProducts,
  onNavigate,
}) => {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setIsAlertsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageTitles: Record<ActivePage, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Tableau de bord Bento',
      subtitle: 'Indicateurs de gestion lumineuse et valorisation en FCFA',
    },
    products: {
      title: 'Gestion des Produits',
      subtitle: 'Inventaire complet, tarifs d’achat/vente et seuils d’alerte',
    },
    movements: {
      title: 'Mouvements de Stock',
      subtitle: 'Enregistrement en temps réel des entrées et sorties de marchandise',
    },
    history: {
      title: 'Historique des Flux',
      subtitle: 'Journal inaltérable et traçabilité détaillée des opérations',
    },
    settings: {
      title: 'Paramètres & Boutique',
      subtitle: 'Configuration du profil commerçant et gestion des données',
    },
    admin: {
      title: 'Administration StockPro',
      subtitle: 'Inscriptions, boutiques et tableaux de bord des commerçants',
    },
  };

  const currentMeta = pageTitles[activePage] || {
    title: 'StockPro',
    subtitle: 'Gestion de stock',
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-xl border-b border-white/60 shadow-[0_4px_20px_rgba(28,55,90,0.05)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Zone 1: Mobile toggle & Breadcrumb Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider hidden sm:inline">
              StockPro
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">/</span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate tracking-tight">
              {currentMeta.title}
            </h1>
          </div>
          <p className="text-xs text-slate-500 truncate hidden md:block">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Zone 2 & 3: Actions & Alertes */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notification Popover */}
        <div className="relative" ref={alertsRef}>
          <button
            type="button"
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 bg-white transition-colors cursor-pointer shadow-2xs"
            aria-label="Alertes de stock"
            title="Alertes de stock faible ou épuisé"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
            {alertProducts.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white font-mono-numbers shadow-xs">
                {alertProducts.length}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bento-porcelain border border-white/90 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Alertes de stock</span>
                  <span className="text-[11px] font-mono-numbers bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                    {alertProducts.length} alerte(s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAlertsOpen(false);
                    onNavigate('products');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <span>Catalogue</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {alertProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Tous vos stocks sont au-dessus de leur seuil minimal.
                  </div>
                ) : (
                  alertProducts.map((p) => {
                    const isOut = p.quantity === 0;
                    return (
                      <div
                        key={p.id}
                        className="p-3 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isOut ? (
                              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {p.name}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-mono-numbers">
                            {isOut
                              ? 'Stock épuisé (0 disponible)'
                              : `Reste ${formatQuantityWithUnit(p.quantity, p.unit)} (Seuil: ${p.alertThreshold})`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAlertsOpen(false);
                            onSelectProduct(p);
                          }}
                          className="shrink-0 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Réappro
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Movement button */}
        <button
          type="button"
          onClick={onOpenQuickMovement}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl shadow-xs transition-all whitespace-nowrap cursor-pointer hover:border-blue-300"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
          <span>Mouvement</span>
        </button>

        {/* Primary Action: New Product */}
        <button
          type="button"
          onClick={onOpenNewProduct}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl shadow-md shadow-blue-500/25 transition-all whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Produit</span>
        </button>
      </div>
    </header>
  );
};
