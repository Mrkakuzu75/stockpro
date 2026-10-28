import React, { useState, useEffect, useCallback } from 'react';
import { stockService } from './services/stockService';
import { ActivePage, Product, UserProfile, MovementType } from './types/stock';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { MovementsPage } from './pages/MovementsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { ProductModal } from './components/products/ProductModal';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { StockMovementModal } from './components/movements/StockMovementModal';
import { ConfirmModal } from './components/common/ConfirmModal';
import { ToastProvider, useToast } from './components/common/Toast';

function StockProApp() {
  const { showToast } = useToast();
  const [isBooting, setIsBooting] = useState(true);

  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [user, setUser] = useState<UserProfile>(() => stockService.getUserProfile());

  const [products, setProducts] = useState<Product[]>(() => stockService.getProducts());
  const [movements, setMovements] = useState(() => stockService.getMovements());
  const [stats, setStats] = useState(() => stockService.calculateStats());

  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movementInitialType, setMovementInitialType] = useState<MovementType>('IN');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const refreshData = useCallback(() => {
    const updatedProducts = stockService.getProducts();
    const updatedMovements = stockService.getMovements();
    const updatedStats = stockService.calculateStats();
    const updatedUser = stockService.getUserProfile();

    setProducts(updatedProducts);
    setMovements(updatedMovements);
    setStats(updatedStats);
    setUser(updatedUser);

    setSelectedProduct((current) => {
      if (!current) return null;
      return updatedProducts.find((p) => p.id === current.id) || null;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = stockService.subscribe(refreshData);
    return () => unsubscribe();
  }, [refreshData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await stockService.bootstrap();
      if (cancelled) return;
      if (profile.role === 'admin') {
        setActivePage('admin');
      }
      setIsBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const alertProducts = products.filter((p) => p.quantity <= p.alertThreshold);

  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsProductModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleSaveProduct = async (
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => {
    try {
      if (id) {
        await stockService.updateProduct(id, data);
        showToast(`Produit "${data.name}" mis à jour avec succès.`, 'success');
      } else {
        await stockService.createProduct(data);
        showToast(`Nouveau produit "${data.name}" ajouté à l'inventaire !`, 'success');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Enregistrement impossible.', 'error');
    }
  };

  const handleDeleteProductPrompt = (prod: Product) => {
    setProductToDelete(prod);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const name = productToDelete.name;
    try {
      await stockService.deleteProduct(productToDelete.id);
      setIsDeleteModalOpen(false);
      setIsDetailModalOpen(false);
      setProductToDelete(null);
      showToast(`Le produit "${name}" a été retiré de l'inventaire.`, 'info');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Suppression impossible.', 'error');
    }
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setIsDetailModalOpen(true);
  };

  const handleQuickMovement = (prod?: Product | null, type: MovementType = 'IN') => {
    setMovementProduct(prod || null);
    setMovementInitialType(type);
    setIsMovementModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleUpdateUserProfile = async (updated: Partial<UserProfile>) => {
    try {
      await stockService.updateUserProfile(updated);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Mise à jour impossible.', 'error');
    }
  };

  const handleImpersonate = async (token: string, merchantUser: UserProfile) => {
    await stockService.impersonate(token, merchantUser);
    setActivePage('dashboard');
    showToast(`Mode superviseur actif : boutique « ${merchantUser.shopName} »`, 'info');
  };

  const handleStopImpersonate = async () => {
    await stockService.stopImpersonating();
    setActivePage('admin');
    showToast('Retour à l’administration réussi.', 'info');
  };

  const handleClearInventory = async () => {
    try {
      await stockService.clearInventory();
      showToast('Inventaire vidé. Vous pouvez saisir vos vrais articles.', 'info');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action impossible.', 'error');
    }
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    setActivePage(profile.role === 'admin' ? 'admin' : 'dashboard');
    showToast(`Bienvenue, ${profile.merchantName} ! Session active.`, 'success');
  };

  const handleLogout = () => {
    stockService.logout();
    setActivePage('dashboard');
    showToast('Vous avez été déconnecté.', 'info');
  };

  if (isBooting) {
    return (
      <div className="min-h-screen bg-[#92afc5] flex items-center justify-center">
        <div className="bento-porcelain px-8 py-6 text-center">
          <p className="text-sm font-bold text-slate-800">StockPro</p>
          <p className="text-xs text-slate-500 mt-1">Ouverture de votre session…</p>
        </div>
      </div>
    );
  }

  if (!user.isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#92afc5] text-slate-800 flex relative selection:bg-blue-600 selection:text-white screen-vignette">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        user={user}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        onLogout={handleLogout}
        lowStockAlertCount={alertProducts.length}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full relative z-10">
        {stockService.isImpersonating() && (
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-950/40 text-amber-100 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-300/30">
                Mode Superviseur
              </span>
              <span>
                Gestion active de la boutique : <strong>{user.shopName}</strong> ({user.merchantName} · {user.email})
              </span>
            </div>
            <button
              type="button"
              onClick={handleStopImpersonate}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-amber-900 rounded-lg font-bold text-xs hover:bg-amber-50 shadow-sm cursor-pointer shrink-0 transition-colors"
            >
              Quitter la supervision
            </button>
          </div>
        )}

        <TopBar
          activePage={activePage}
          onOpenMobile={() => setIsOpenMobile(true)}
          onOpenNewProduct={handleOpenNewProduct}
          onOpenQuickMovement={() => handleQuickMovement(null, 'IN')}
          onSelectProduct={handleSelectProduct}
          alertProducts={alertProducts}
          onNavigate={setActivePage}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {activePage === 'admin' && user.role === 'admin' && (
            <AdminPage onImpersonate={handleImpersonate} />
          )}

          {activePage === 'dashboard' && (
            <DashboardPage
              stats={stats}
              products={products}
              recentMovements={movements}
              onNavigate={setActivePage}
              onOpenNewProduct={handleOpenNewProduct}
              onOpenMovementForProduct={(p, type) => handleQuickMovement(p, type)}
              onOpenQuickMovement={(type) => handleQuickMovement(null, type)}
              onSelectProduct={handleSelectProduct}
              merchantName={user.merchantName}
              shopName={user.shopName}
            />
          )}

          {activePage === 'products' && (
            <ProductsPage
              products={products}
              onOpenNewProduct={handleOpenNewProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProductPrompt}
              onSelectProduct={handleSelectProduct}
              onQuickMovement={(p, type) => handleQuickMovement(p, type)}
            />
          )}

          {activePage === 'movements' && (
            <MovementsPage
              products={products}
              recentMovements={movements}
              onMovementSuccess={refreshData}
            />
          )}

          {activePage === 'history' && (
            <HistoryPage movements={movements} products={products} />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              user={user}
              onUpdateUser={handleUpdateUserProfile}
              onClearInventory={handleClearInventory}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
      />

      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProductPrompt}
        onMovement={(p, type) => handleQuickMovement(p, type)}
        movements={movements}
      />

      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        products={products}
        initialProduct={movementProduct}
        initialType={movementInitialType}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Supprimer définitivement cet article ?"
        message={`Êtes-vous certain de vouloir supprimer "${productToDelete?.name}" de votre catalogue ? Cette opération retirera l'article de la boutique.`}
        confirmLabel="Oui, supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StockProApp />
    </ToastProvider>
  );
}
