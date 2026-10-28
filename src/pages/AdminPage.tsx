import React, { useEffect, useState } from 'react';
import {
  Shield,
  Store,
  Users,
  Package,
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  KeyRound,
  ExternalLink,
  Search,
  Phone,
  MapPin,
  Mail,
  Calendar,
  Coins,
  X,
  Database,
  HardDrive,
  FileJson,
  Copy,
  Check,
  UploadCloud,
  Wrench,
  Layers,
  FileText,
} from 'lucide-react';
import {
  deleteMerchantAccount,
  fetchAdminOverview,
  fetchMerchantDashboard,
  MerchantDashboard,
  MerchantSummary,
  PlatformStats,
  updateMerchantStatus,
  resetMerchantPassword,
  impersonateMerchant,
  clearMerchantInventory,
  downloadDatabaseBackup,
  downloadMerchantsCsv,
  fetchDatabaseExplorerData,
  restoreDatabaseFromData,
  cleanupDatabaseOrphans,
  DatabaseExplorerData,
} from '../services/adminService';
import { formatDateTime, formatFCFA, formatQuantityWithUnit } from '../utils/formatters';
import { useToast } from '../components/common/Toast';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { UserProfile } from '../types/stock';

interface AdminPageProps {
  onImpersonate?: (token: string, user: UserProfile) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onImpersonate }) => {
  const { showToast } = useToast();

  // Top Section: 'shops' (Supervision boutiques) ou 'database' (Accès direct base de données)
  const [adminSection, setAdminSection] = useState<'shops' | 'database'>('shops');

  // Overview Data
  const [platform, setPlatform] = useState<PlatformStats | null>(null);
  const [merchants, setMerchants] = useState<MerchantSummary[]>([]);
  const [selected, setSelected] = useState<MerchantDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Database Explorer Data
  const [dbData, setDbData] = useState<DatabaseExplorerData | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbCollectionTab, setDbCollectionTab] = useState<'users' | 'products' | 'movements' | 'raw'>('users');
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [selectedRawRecord, setSelectedRawRecord] = useState<unknown | null>(null);
  const [hasCopiedJson, setHasCopiedJson] = useState(false);

  // Database Actions Modals
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restorePayloadText, setRestorePayloadText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCleaningDb, setIsCleaningDb] = useState(false);

  // Modals & Actions Commerçants
  const [merchantToDelete, setMerchantToDelete] = useState<MerchantSummary | null>(null);
  const [merchantToResetPassword, setMerchantToResetPassword] = useState<MerchantSummary | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [merchantToClearInventory, setMerchantToClearInventory] = useState<MerchantDashboard | null>(null);
  const [isClearingInventory, setIsClearingInventory] = useState(false);

  // Filters & Tabs Commerçants
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedTab, setSelectedTab] = useState<'products' | 'movements'>('products');
  const [detailProductSearch, setDetailProductSearch] = useState('');
  const [detailMovementSearch, setDetailMovementSearch] = useState('');

  // Export states
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  const loadOverview = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAdminOverview();
      setPlatform(data.platform);
      setMerchants(data.merchants);
      if (selected) {
        const stillThere = data.merchants.find((m) => m.id === selected.user.id);
        if (stillThere) {
          const updatedDash = await fetchMerchantDashboard(selected.user.id!);
          setSelected(updatedDash);
        } else {
          setSelected(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger l’administration.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDatabaseData = async () => {
    setIsLoadingDb(true);
    try {
      const data = await fetchDatabaseExplorerData();
      setDbData(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Impossible de charger la base de données.', 'error');
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (adminSection === 'database' && !dbData) {
      void loadDatabaseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSection]);

  const openMerchant = async (id: string) => {
    try {
      const dash = await fetchMerchantDashboard(id);
      setSelected(dash);
      setDetailProductSearch('');
      setDetailMovementSearch('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Boutique introuvable.', 'error');
    }
  };

  const handleImpersonate = async (merchantId: string) => {
    try {
      const res = await impersonateMerchant(merchantId);
      if (onImpersonate) {
        onImpersonate(res.token, res.user);
      } else {
        showToast('Accès direct non disponible.', 'error');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Connexion impossible à cette boutique.', 'error');
    }
  };

  const toggleStatus = async (merchant: MerchantSummary) => {
    const next = merchant.status === 'active' ? 'suspended' : 'active';
    try {
      await updateMerchantStatus(merchant.id!, next);
      showToast(
        next === 'suspended'
          ? `Boutique « ${merchant.shopName} » suspendue.`
          : `Boutique « ${merchant.shopName} » réactivée avec succès.`,
        next === 'suspended' ? 'warning' : 'success'
      );
      await loadOverview();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action impossible.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!merchantToDelete?.id) return;
    try {
      const data = await deleteMerchantAccount(merchantToDelete.id);
      setPlatform(data.platform);
      setMerchants(data.merchants);
      if (selected?.user.id === merchantToDelete.id) setSelected(null);
      showToast(`Le compte de « ${merchantToDelete.shopName} » a été supprimé.`, 'info');
      if (adminSection === 'database') void loadDatabaseData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Suppression impossible.', 'error');
    } finally {
      setMerchantToDelete(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantToResetPassword?.id || newPasswordInput.trim().length < 6) {
      showToast('Le mot de passe doit comporter au moins 6 caractères.', 'error');
      return;
    }
    setIsResettingPassword(true);
    try {
      await resetMerchantPassword(merchantToResetPassword.id, newPasswordInput.trim());
      showToast(`Mot de passe réinitialisé pour ${merchantToResetPassword.merchantName}.`, 'success');
      setMerchantToResetPassword(null);
      setNewPasswordInput('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Réinitialisation impossible.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pass);
  };

  const confirmClearInventory = async () => {
    if (!merchantToClearInventory?.user?.id) return;
    setIsClearingInventory(true);
    try {
      const res = await clearMerchantInventory(merchantToClearInventory.user.id);
      setSelected(res.dashboard);
      showToast(`L'inventaire de « ${merchantToClearInventory.user.shopName} » a été vidé.`, 'info');
      await loadOverview();
      if (adminSection === 'database') void loadDatabaseData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Impossible de vider l’inventaire.', 'error');
    } finally {
      setIsClearingInventory(false);
      setMerchantToClearInventory(null);
    }
  };

  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      await downloadDatabaseBackup();
      showToast('Sauvegarde de la base de données téléchargée avec succès.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erreur de téléchargement.', 'error');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleDownloadCsv = async () => {
    setIsDownloadingCsv(true);
    try {
      await downloadMerchantsCsv();
      showToast('Rapport CSV des commerçants téléchargé.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erreur d’export.', 'error');
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const handleCopyJson = async () => {
    if (!dbData?.rawJson) return;
    try {
      await navigator.clipboard.writeText(dbData.rawJson);
      setHasCopiedJson(true);
      showToast('Contenu JSON copié dans le presse-papier.', 'info');
      setTimeout(() => setHasCopiedJson(false), 2500);
    } catch {
      showToast('Impossible de copier automatiquement.', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setRestorePayloadText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restorePayloadText.trim()) {
      showToast('Veuillez sélectionner ou coller un fichier JSON valide.', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(restorePayloadText);
      setIsRestoring(true);
      const result = await restoreDatabaseFromData(parsed);
      setDbData(result.data);
      setIsRestoreModalOpen(false);
      setRestorePayloadText('');
      showToast('Base de données restaurée avec succès.', 'success');
      await loadOverview();
    } catch (err) {
      showToast(
        err instanceof Error ? `Erreur de restauration : ${err.message}` : 'JSON invalide.',
        'error'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteCleanup = async () => {
    setIsCleaningDb(true);
    try {
      const res = await cleanupDatabaseOrphans();
      setDbData(res.data);
      const totalCleaned = res.cleaned.removedProducts + res.cleaned.removedMovements;
      if (totalCleaned > 0) {
        showToast(
          `Nettoyage terminé : ${res.cleaned.removedProducts} produit(s) et ${res.cleaned.removedMovements} mouvement(s) orphelins supprimés.`,
          'info'
        );
      } else {
        showToast('Intégrité vérifiée : aucun enregistrement orphelin détecté.', 'success');
      }
      await loadOverview();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erreur lors du nettoyage.', 'error');
    } finally {
      setIsCleaningDb(false);
    }
  };

  // Filtered merchants
  const filteredMerchants = merchants.filter((m) => {
    if (statusFilter === 'active' && m.status !== 'active') return false;
    if (statusFilter === 'suspended' && m.status !== 'suspended') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.shopName?.toLowerCase().includes(q) ||
      m.merchantName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.city?.toLowerCase().includes(q)
    );
  });

  // Filtered detail products
  const filteredDetailProducts = selected?.products.filter((p) => {
    if (!detailProductSearch.trim()) return true;
    const q = detailProductSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q));
  }) || [];

  // Filtered detail movements
  const filteredDetailMovements = selected?.movements.filter((m) => {
    if (!detailMovementSearch.trim()) return true;
    const q = detailMovementSearch.toLowerCase();
    return m.productName.toLowerCase().includes(q) || (m.motiveLabel && m.motiveLabel.toLowerCase().includes(q)) || (m.note && m.note.toLowerCase().includes(q));
  }) || [];

  // Filtered DB Users
  const filteredDbUsers = (dbData?.collections.users || []).filter((u) => {
    if (!dbSearchQuery.trim()) return true;
    const q = dbSearchQuery.toLowerCase();
    return (
      u.id?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.merchantName?.toLowerCase().includes(q) ||
      u.shopName?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.city?.toLowerCase().includes(q)
    );
  });

  // Filtered DB Products
  const filteredDbProducts = (dbData?.collections.products || []).filter((p) => {
    if (!dbSearchQuery.trim()) return true;
    const q = dbSearchQuery.toLowerCase();
    return (
      p.id?.toLowerCase().includes(q) ||
      p.userId?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );
  });

  // Filtered DB Movements
  const filteredDbMovements = (dbData?.collections.movements || []).filter((m) => {
    if (!dbSearchQuery.trim()) return true;
    const q = dbSearchQuery.toLowerCase();
    return (
      m.id?.toLowerCase().includes(q) ||
      m.userId?.toLowerCase().includes(q) ||
      m.productName?.toLowerCase().includes(q) ||
      m.type?.toLowerCase().includes(q) ||
      m.motiveLabel?.toLowerCase().includes(q) ||
      m.note?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Navigation Tabs */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-2 border-b border-slate-200">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase font-mono">
            Administration centrale StockPro
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Tableau de bord administrateur
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Supervision des boutiques et accès complet à la base de données
          </p>
        </div>

        {/* Section Switcher: Boutiques vs Base de Données */}
        <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={() => setAdminSection('shops')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              adminSection === 'shops'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Supervision Boutiques</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSection('database')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              adminSection === 'database'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4 text-amber-500" />
            <span>Base de données</span>
            {dbData?.fileInfo?.sizeFormatted && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  adminSection === 'database' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {dbData.fileInfo.sizeFormatted}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: SUPERVISION DES BOUTIQUES (Vue Métier)                         */}
      {/* ========================================================================= */}
      {adminSection === 'shops' && (
        <>
          {/* Actions rapides header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">
              Vue d'ensemble de la plateforme et des commerçants
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isDownloadingBackup}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
                title="Télécharger une copie JSON de la base"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>{isDownloadingBackup ? 'Téléchargement...' : 'Sauvegarde JSON'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={isDownloadingCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
                title="Exporter les commerçants au format CSV pour Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{isDownloadingCsv ? 'Exportation...' : 'Export Excel (CSV)'}</span>
              </button>

              <button
                type="button"
                onClick={() => void loadOverview()}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>

          {/* KPI Platform Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Commerçants', value: platform?.totalMerchants ?? '—', icon: Users, color: 'text-blue-600' },
              { label: 'Actifs', value: platform?.activeMerchants ?? '—', icon: Store, color: 'text-emerald-600' },
              { label: 'Suspendus', value: platform?.suspendedMerchants ?? '—', icon: Ban, color: 'text-rose-600' },
              { label: 'Articles', value: platform?.totalProducts ?? '—', icon: Package, color: 'text-indigo-600' },
              { label: 'Mouvements', value: platform?.totalMovements ?? '—', icon: ArrowLeftRight, color: 'text-amber-600' },
              {
                label: 'Stock total',
                value: platform?.totalStockValue ? formatFCFA(platform.totalStockValue) : '0 FCFA',
                icon: Coins,
                color: 'text-blue-700',
              },
            ].map((card) => (
              <div key={card.label} className="bento-porcelain p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide truncate">{card.label}</span>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono-numbers truncate">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* 2-column layout: merchants list and merchant detail */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left Column: Merchants List */}
            <div className="xl:col-span-5 bento-porcelain p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Commerçants inscrits</h3>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredMerchants.length} / {merchants.length}
                </span>
              </div>

              {/* Search & Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, boutique, e-mail, ville..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl text-[11px] font-semibold">
                  {(
                    [
                      { id: 'all', label: 'Tous' },
                      { id: 'active', label: 'Actifs' },
                      { id: 'suspended', label: 'Suspendus' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`flex-1 py-1 px-2 rounded-lg text-center transition-all cursor-pointer ${
                        statusFilter === f.id ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Merchant list */}
              {isLoading ? (
                <p className="text-xs text-slate-500 py-6 text-center">Chargement des comptes…</p>
              ) : filteredMerchants.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Aucun commerçant ne correspond aux filtres.'
                      : 'Aucun commerçant inscrit pour le moment. Les inscriptions ouvertes apparaîtront ici.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                  {filteredMerchants.map((merchant) => {
                    const isSelected = selected?.user.id === merchant.id;
                    return (
                      <li
                        key={merchant.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'border-blue-400 bg-blue-50/80 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 truncate">{merchant.shopName}</p>
                              {merchant.city && (
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {merchant.city}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 truncate mt-0.5">{merchant.merchantName}</p>
                            <p className="text-[11px] text-slate-400 truncate">{merchant.email}</p>
                            {merchant.phone && (
                              <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {merchant.phone}
                              </p>
                            )}
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              merchant.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                            }`}
                          >
                            {merchant.status === 'active' ? 'Actif' : 'Suspendu'}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{merchant.stats.totalProducts} produit(s)</span>
                          <span className="font-bold text-slate-800 font-mono-numbers">
                            {formatFCFA(merchant.stats.totalStockValue)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => void openMerchant(merchant.id!)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg cursor-pointer ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            Aperçu
                          </button>

                          {onImpersonate && merchant.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleImpersonate(merchant.id!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
                              title="Gérer directement cette boutique en mode superviseur"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Gérer boutique
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setMerchantToResetPassword(merchant);
                              setNewPasswordInput('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3 text-slate-500" />
                            Mot de passe
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleStatus(merchant)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                          >
                            {merchant.status === 'active' ? (
                              <>
                                <Ban className="w-3 h-3 text-rose-600" />
                                Suspendre
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Activer
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setMerchantToDelete(merchant)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 cursor-pointer ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Right Column: Selected Merchant Dashboard & Management */}
            <div className="xl:col-span-7 bento-porcelain p-5 space-y-5 min-h-[420px]">
              {!selected ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-500">
                  <Store className="w-10 h-10 text-blue-500 mb-3 opacity-60" />
                  <p className="text-sm font-bold text-slate-800">Sélectionnez une boutique</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Cliquez sur <strong>Aperçu</strong> sur n'importe quel commerçant pour inspecter ses stocks, ses alertes, ses mouvements et administrer son compte.
                  </p>
                </div>
              ) : (
                <>
                  {/* Merchant Details Header */}
                  <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">{selected.user.shopName}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selected.user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                          }`}
                        >
                          {selected.user.status === 'active' ? 'Boutique active' : 'Boutique suspendue'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                        <span><strong>Commerçant :</strong> {selected.user.merchantName}</span>
                        <span>·</span>
                        <span><Mail className="w-3 h-3 inline text-slate-400 mr-0.5" />{selected.user.email}</span>
                        {selected.user.phone && (
                          <>
                            <span>·</span>
                            <span><Phone className="w-3 h-3 inline text-slate-400 mr-0.5" />{selected.user.phone}</span>
                          </>
                        )}
                        {selected.user.city && (
                          <>
                            <span>·</span>
                            <span><MapPin className="w-3 h-3 inline text-slate-400 mr-0.5" />{selected.user.city}</span>
                          </>
                        )}
                      </p>
                      {selected.user.createdAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Inscrit le {formatDateTime(selected.user.createdAt)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {onImpersonate && selected.user.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleImpersonate(selected.user.id!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Gérer cette boutique
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const merchantSummary = merchants.find((m) => m.id === selected.user.id);
                          if (merchantSummary) {
                            setMerchantToResetPassword(merchantSummary);
                            setNewPasswordInput('');
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                        Mot de passe
                      </button>

                      <button
                        type="button"
                        onClick={() => setMerchantToClearInventory(selected)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 cursor-pointer"
                      >
                        Vider stock
                      </button>
                    </div>
                  </div>

                  {/* Merchant KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Articles</p>
                      <p className="text-xl font-black text-slate-900 font-mono-numbers">{selected.stats.totalProducts}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3 border border-amber-100">
                      <p className="text-[10px] uppercase font-bold text-amber-700">Stock faible</p>
                      <p className="text-xl font-black text-amber-800 font-mono-numbers">{selected.stats.lowStockCount}</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-3 border border-rose-100">
                      <p className="text-[10px] uppercase font-bold text-rose-700">Ruptures</p>
                      <p className="text-xl font-black text-rose-800 font-mono-numbers">{selected.stats.outOfStockCount}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-3 border border-blue-100">
                      <p className="text-[10px] uppercase font-bold text-blue-700">Valeur stock</p>
                      <p className="text-sm sm:text-base font-black text-blue-900 font-mono-numbers truncate">
                        {formatFCFA(selected.stats.totalStockValue)}
                      </p>
                    </div>
                  </div>

                  {/* Detail Tabs */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTab('products')}
                      className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                        selectedTab === 'products'
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Catalogue produits ({selected.products.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTab('movements')}
                      className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                        selectedTab === 'movements'
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Historique des flux ({selected.movements.length})</span>
                    </button>
                  </div>

                  {/* Tab 1: Products Table */}
                  {selectedTab === 'products' && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Filtrer les produits par nom, catégorie, référence..."
                          value={detailProductSearch}
                          onChange={(e) => setDetailProductSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      {filteredDetailProducts.length === 0 ? (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          {detailProductSearch ? 'Aucun produit ne correspond à la recherche.' : 'Boutique encore vide (aucun produit créé).'}
                        </p>
                      ) : (
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="text-slate-400 border-b border-slate-100 bg-slate-50/50 sticky top-0">
                              <tr>
                                <th className="py-2 px-2 font-semibold">Produit</th>
                                <th className="py-2 px-2 font-semibold">Catégorie</th>
                                <th className="py-2 px-2 font-semibold text-right">Qté</th>
                                <th className="py-2 px-2 font-semibold text-right">Achat</th>
                                <th className="py-2 px-2 font-semibold text-right">Vente</th>
                                <th className="py-2 px-2 font-semibold text-right">Valeur stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredDetailProducts.map((p) => {
                                const isLow = p.quantity <= p.alertThreshold && p.quantity > 0;
                                const isOut = p.quantity === 0;
                                return (
                                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-2 px-2 font-medium text-slate-900">
                                      <div className="flex items-center gap-1.5">
                                        <span>{p.name}</span>
                                        {isOut && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-700 rounded">
                                            Rupture
                                          </span>
                                        )}
                                        {isLow && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded">
                                            Faible
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-slate-500">{p.category || 'Divers'}</td>
                                    <td className="py-2 px-2 text-right font-mono-numbers font-bold">
                                      {formatQuantityWithUnit(p.quantity, p.unit)}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono-numbers text-slate-600">
                                      {formatFCFA(p.purchasePrice)}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono-numbers text-slate-600">
                                      {formatFCFA(p.sellingPrice)}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono-numbers font-bold text-slate-900">
                                      {formatFCFA(p.quantity * p.purchasePrice)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Movements List */}
                  {selectedTab === 'movements' && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Filtrer les mouvements par produit, motif ou note..."
                          value={detailMovementSearch}
                          onChange={(e) => setDetailMovementSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      {filteredDetailMovements.length === 0 ? (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          {detailMovementSearch ? 'Aucun mouvement trouvé.' : 'Aucun mouvement de stock enregistré.'}
                        </p>
                      ) : (
                        <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                          {filteredDetailMovements.map((m) => (
                            <li
                              key={m.id}
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                      m.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {m.type === 'IN' ? '+ ENTRÉE' : '- SORTIE'}
                                  </span>
                                  <span className="font-bold text-slate-900 truncate">{m.productName}</span>
                                  <span className="text-slate-500 font-mono-numbers">
                                    ({m.quantity} {m.unit})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {m.motiveLabel || m.motive}
                                  {m.note ? ` — « ${m.note} »` : ''}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[11px] font-mono-numbers text-slate-600">
                                  {m.stockBefore} &rarr; <strong>{m.stockAfter}</strong>
                                </p>
                                <p className="text-[10px] text-slate-400">{formatDateTime(m.date)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ACCÈS COMPLET À LA BASE DE DONNÉES (Database Explorer)          */}
      {/* ========================================================================= */}
      {adminSection === 'database' && (
        <div className="space-y-5">
          {/* File Card & Database Controls */}
          <div className="bento-porcelain p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    Fichier Base de Données StockPro
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                      JSON Atomique
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 break-all">
                    {dbData?.fileInfo?.path || 'data/stockpro-db.json'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isDownloadingBackup}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Télécharger une copie exacte du fichier"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Télécharger JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRestoreModalOpen(true);
                    setRestorePayloadText('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 shadow-sm cursor-pointer"
                  title="Restaurer la base depuis un fichier ou texte JSON"
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  <span>Restaurer / Importer</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteCleanup}
                  disabled={isCleaningDb}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Vérifier et nettoyer les enregistrements orphelins"
                >
                  <Wrench className={`w-4 h-4 text-amber-600 ${isCleaningDb ? 'animate-spin' : ''}`} />
                  <span>Vérifier intégrité</span>
                </button>

                <button
                  type="button"
                  onClick={() => void loadDatabaseData()}
                  disabled={isLoadingDb}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDb ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Taille disque</span>
                <p className="text-base font-black text-slate-900 font-mono-numbers">
                  {dbData?.fileInfo?.sizeFormatted || '—'}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-600">Total Utilisateurs</span>
                <p className="text-base font-black text-blue-900 font-mono-numbers">
                  {dbData?.stats?.usersCount ?? '—'}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-[10px] uppercase font-bold text-indigo-600">Total Produits</span>
                <p className="text-base font-black text-indigo-900 font-mono-numbers">
                  {dbData?.stats?.productsCount ?? '—'}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-700">Total Mouvements</span>
                <p className="text-base font-black text-amber-900 font-mono-numbers">
                  {dbData?.stats?.movementsCount ?? '—'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Dernière écriture</span>
                <p className="text-xs font-bold text-slate-700 mt-1 truncate">
                  {dbData?.fileInfo?.lastModified ? formatDateTime(dbData.fileInfo.lastModified) : 'À l’instant'}
                </p>
              </div>
            </div>
          </div>

          {/* Collection Explorer */}
          <div className="bento-porcelain p-5 space-y-4">
            {/* Tabs for collections */}
            <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setDbCollectionTab('users');
                    setSelectedRawRecord(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    dbCollectionTab === 'users'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Utilisateurs ({dbData?.collections.users.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDbCollectionTab('products');
                    setSelectedRawRecord(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    dbCollectionTab === 'products'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Produits ({dbData?.collections.products.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDbCollectionTab('movements');
                    setSelectedRawRecord(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    dbCollectionTab === 'movements'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mouvements ({dbData?.collections.movements.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDbCollectionTab('raw');
                    setSelectedRawRecord(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    dbCollectionTab === 'raw'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5 text-purple-600" />
                  <span>JSON Brut complet</span>
                </button>
              </div>

              {dbCollectionTab !== 'raw' && (
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={`Rechercher dans ${dbCollectionTab}...`}
                    value={dbSearchQuery}
                    onChange={(e) => setDbSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {dbSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDbSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TAB: USERS TABLE */}
            {dbCollectionTab === 'users' && (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-100 bg-slate-50/70 sticky top-0 font-semibold">
                    <tr>
                      <th className="py-2 px-2">ID</th>
                      <th className="py-2 px-2">Rôle</th>
                      <th className="py-2 px-2">Nom / Boutique</th>
                      <th className="py-2 px-2">E-mail</th>
                      <th className="py-2 px-2">Téléphone</th>
                      <th className="py-2 px-2">Ville</th>
                      <th className="py-2 px-2">Statut</th>
                      <th className="py-2 px-2">Création</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredDbUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-700">{u.id}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-sans font-medium text-slate-900">
                          {u.shopName} ({u.merchantName})
                        </td>
                        <td className="py-2 px-2 text-slate-600">{u.email}</td>
                        <td className="py-2 px-2 text-slate-500">{u.phone || '—'}</td>
                        <td className="py-2 px-2 font-sans text-slate-600">{u.city || '—'}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              u.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-400 font-sans text-[10px]">
                          {u.createdAt ? formatDateTime(u.createdAt) : '—'}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRawRecord(u)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: PRODUCTS TABLE */}
            {dbCollectionTab === 'products' && (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-100 bg-slate-50/70 sticky top-0 font-semibold">
                    <tr>
                      <th className="py-2 px-2">ID</th>
                      <th className="py-2 px-2">Propriétaire (User ID)</th>
                      <th className="py-2 px-2">Nom Produit</th>
                      <th className="py-2 px-2">Catégorie</th>
                      <th className="py-2 px-2 text-right">Quantité</th>
                      <th className="py-2 px-2 text-right">Achat</th>
                      <th className="py-2 px-2 text-right">Vente</th>
                      <th className="py-2 px-2 text-right">Seuil Alerte</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredDbProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-700">{p.id}</td>
                        <td className="py-2 px-2 text-slate-500 truncate max-w-[120px]" title={p.userId}>
                          {p.userId}
                        </td>
                        <td className="py-2 px-2 font-sans font-medium text-slate-900">{p.name}</td>
                        <td className="py-2 px-2 font-sans text-slate-500">{p.category}</td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900">
                          {p.quantity} {p.unit}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">{formatFCFA(p.purchasePrice)}</td>
                        <td className="py-2 px-2 text-right text-slate-600">{formatFCFA(p.sellingPrice)}</td>
                        <td className="py-2 px-2 text-right text-amber-700">{p.alertThreshold}</td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRawRecord(p)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: MOVEMENTS TABLE */}
            {dbCollectionTab === 'movements' && (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-100 bg-slate-50/70 sticky top-0 font-semibold">
                    <tr>
                      <th className="py-2 px-2">ID</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Produit</th>
                      <th className="py-2 px-2 text-right">Quantité</th>
                      <th className="py-2 px-2 text-right">Avant &rarr; Après</th>
                      <th className="py-2 px-2">Motif</th>
                      <th className="py-2 px-2">Date</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredDbMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-700">{m.id}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              m.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-sans font-medium text-slate-900">{m.productName}</td>
                        <td className="py-2 px-2 text-right font-bold">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">
                          {m.stockBefore} &rarr; <strong>{m.stockAfter}</strong>
                        </td>
                        <td className="py-2 px-2 font-sans text-slate-500">{m.motiveLabel || m.motive}</td>
                        <td className="py-2 px-2 font-sans text-slate-400 text-[10px]">
                          {formatDateTime(m.date)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRawRecord(m)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: RAW JSON VIEW */}
            {dbCollectionTab === 'raw' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Contenu brut de la base de données <code>stockpro-db.json</code> (lecture seule directe) :
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-sm"
                  >
                    {hasCopiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedJson ? 'Copié !' : 'Copier tout le JSON'}</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-xs overflow-x-auto max-h-[540px] overflow-y-auto border border-slate-800">
                  <pre className="whitespace-pre">{dbData?.rawJson || '// Chargement de la base de données...'}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: Modale d'enregistrement individuel JSON                           */}
      {/* ========================================================================= */}
      {selectedRawRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bento-porcelain w-full max-w-xl p-5 shadow-2xl relative space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCodeIcon className="w-4 h-4 text-blue-600" />
                Détail de l'enregistrement JSON
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRawRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] overflow-y-auto">
              <pre>{JSON.stringify(selectedRawRecord, null, 2)}</pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(JSON.stringify(selectedRawRecord, null, 2));
                  showToast('Enregistrement copié.', 'info');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copier cet enregistrement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: Restauration / Import de Base de Données                          */}
      {/* ========================================================================= */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bento-porcelain w-full max-w-xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                Restaurer ou Importer la Base de Données
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setRestorePayloadText('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Attention :</strong> L'importation remplacera l'intégralité des utilisateurs, produits et mouvements actuels par les données de ce fichier. Le compte administrateur principal sera automatiquement préservé.
              </p>
            </div>

            <form onSubmit={handleExecuteRestore} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Sélectionner un fichier de sauvegarde (.json)
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Ou coller directement le contenu JSON :
                </label>
                <textarea
                  rows={8}
                  placeholder='{"users": [...], "products": [...], "movements": [...]}'
                  value={restorePayloadText}
                  onChange={(e) => setRestorePayloadText(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRestoreModalOpen(false);
                    setRestorePayloadText('');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isRestoring || !restorePayloadText.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
                >
                  {isRestoring ? 'Restauration en cours...' : 'Valider la restauration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Password Reset */}
      {merchantToResetPassword && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bento-porcelain w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              Changer le mot de passe
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Boutique : <strong>{merchantToResetPassword.shopName}</strong> ({merchantToResetPassword.email})
            </p>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nouveau mot de passe (min. 6 caractères)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Entrez ou générez un mot de passe"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    Générer
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMerchantToResetPassword(null);
                    setNewPasswordInput('');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || newPasswordInput.trim().length < 6}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50"
                >
                  {isResettingPassword ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Merchant */}
      <ConfirmModal
        isOpen={Boolean(merchantToDelete)}
        title="Supprimer ce compte commerçant ?"
        message={`Le compte « ${merchantToDelete?.shopName} » (${merchantToDelete?.email}) et l'intégralité de son stock et ses mouvements seront définitivement effacés.`}
        confirmLabel="Oui, supprimer définitivement"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setMerchantToDelete(null)}
      />

      {/* Modal: Clear Inventory */}
      <ConfirmModal
        isOpen={Boolean(merchantToClearInventory)}
        title="Vider l'inventaire de cette boutique ?"
        message={`Tous les articles et mouvements de « ${merchantToClearInventory?.user?.shopName} » seront effacés. Le compte commerçant restera actif pour repartir à zéro.`}
        confirmLabel="Vider l'inventaire"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={confirmClearInventory}
        onCancel={() => setMerchantToClearInventory(null)}
      />
    </div>
  );
};

// Helper component for JSON record icon
function FileCodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 12.5 8 15l2 2.5" />
      <path d="m14 12.5 2 2.5-2 2.5" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
    </svg>
  );
}
