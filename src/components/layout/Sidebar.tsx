import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  History,
  Settings,
  Shield,
  Boxes,
  X,
  LogOut,
  Store,
  AlertTriangle,
} from 'lucide-react';
import { ActivePage, UserProfile } from '../../types/stock';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  user: UserProfile;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  lowStockAlertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  user,
  isOpenMobile,
  onCloseMobile,
  onLogout,
  lowStockAlertCount,
}) => {
  const navItems: { id: ActivePage; label: string; icon: React.ReactNode; badge?: number }[] = [
    ...(user.role === 'admin'
      ? [
          {
            id: 'admin' as ActivePage,
            label: 'Administration',
            icon: <Shield className="w-4 h-4 shrink-0" />,
          },
        ]
      : []),
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'products',
      label: 'Produits en stock',
      icon: <Package className="w-4 h-4 shrink-0" />,
      badge: lowStockAlertCount > 0 ? lowStockAlertCount : undefined,
    },
    {
      id: 'movements',
      label: 'Mouvements de stock',
      icon: <ArrowLeftRight className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'history',
      label: 'Historique des flux',
      icon: <History className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Paramètres & Boutique',
      icon: <Settings className="w-4 h-4 shrink-0" />,
    },
  ];

  const handleNavClick = (page: ActivePage) => {
    onNavigate(page);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-xl border-r border-white/60 shadow-[0_10px_30px_rgba(28,55,90,0.08)] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-tight">
                StockPro
              </span>
              <span className="text-[10px] text-blue-600 font-mono uppercase tracking-wider font-semibold">
                Porcelain Bento
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{item.badge}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                {user.merchantName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.merchantName}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                  <Store className="w-3 h-3 shrink-0 text-blue-600" />
                  <span className="truncate">{user.shopName}</span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-mono-numbers">FCFA (Côte d'Ivoire)</span>
              <button
                type="button"
                onClick={onLogout}
                className="text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                title="Quitter la session"
              >
                <LogOut className="w-3 h-3" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
