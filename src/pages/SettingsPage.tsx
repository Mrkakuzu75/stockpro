import React, { useState } from 'react';
import {
  User,
  Store,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  RotateCcw,
  LogOut,
  Save,
  Lock,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile } from '../types/stock';
import { stockService } from '../services/stockService';
import { useToast } from '../components/common/Toast';
import { ConfirmModal } from '../components/common/ConfirmModal';

interface SettingsPageProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onClearInventory: () => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  onUpdateUser,
  onClearInventory,
  onLogout,
}) => {
  const { showToast } = useToast();

  const [merchantName, setMerchantName] = useState(user.merchantName);
  const [shopName, setShopName] = useState(user.shopName);
  const [phone, setPhone] = useState(user.phone || '');
  const [city, setCity] = useState(user.city || '');
  const [showResetModal, setShowResetModal] = useState(false);

  // Sécurité & Changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantName.trim() || !shopName.trim()) {
      showToast('Le nom du commerçant et celui de la boutique sont requis.', 'warning');
      return;
    }

    onUpdateUser({
      merchantName: merchantName.trim(),
      shopName: shopName.trim(),
      phone: phone.trim() || undefined,
      city: city.trim() || undefined,
    });

    showToast('Profil et informations de la boutique mis à jour avec succès.', 'success');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Veuillez renseigner votre mot de passe actuel.', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Le nouveau mot de passe doit comporter au moins 6 caractères.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Les deux nouveaux mots de passe ne correspondent pas.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await stockService.changePassword(currentPassword, newPassword);
      showToast('Votre mot de passe a été modifié avec succès.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Impossible de modifier le mot de passe.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase font-mono">
          Configuration & Point de Vente
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
          Paramètres & Profil Commerçant
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Gérez l’identité de votre commerce et les préférences de l'application
        </p>
      </div>

      {/* Security Info Bento */}
      <div className="bento-porcelain p-5 sm:p-6 space-y-2 border-l-4 border-l-blue-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800">
            Compte en ligne et confidentialité
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Vos produits et mouvements sont enregistrés sur le serveur StockPro, liés uniquement à votre compte.
          Un autre commerçant ne voit jamais votre stock.
        </p>
        <div className="pt-1 flex items-center gap-2 text-xs text-blue-700 font-medium">
          <Lock className="w-3.5 h-3.5" />
          <span>Connexion sécurisée. Mot de passe jamais affiché ni stocké en clair.</span>
        </div>
      </div>

      {/* Form: Profile */}
      <div className="bento-porcelain p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Identité de votre commerce
              </h3>
              <p className="text-[11px] text-slate-500">Coordonnées affichées sur vos fiches</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono">
            Devise : FCFA
          </span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom */}
            <div>
              <label htmlFor="set-merchant" className="block text-xs font-semibold text-slate-700 mb-1">
                Nom complet du gérant <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="set-merchant"
                  type="text"
                  required
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Boutique */}
            <div>
              <label htmlFor="set-shop" className="block text-xs font-semibold text-slate-700 mb-1">
                Nom de la boutique <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="set-shop"
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email (Identifiant de connexion immuable) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="set-email" className="block text-xs font-semibold text-slate-700">
                  Adresse e-mail (Identifiant)
                </label>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Immuable
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="set-email"
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="set-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="set-phone"
                  type="text"
                  placeholder="+225 07 00 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 font-mono-numbers focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Commune */}
          <div>
            <label htmlFor="set-city" className="block text-xs font-semibold text-slate-700 mb-1">
              Localisation (Commune / Ville)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="set-city"
                type="text"
                placeholder="ex: Abidjan (Treichville, Cocody, Yopougon...)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sécurité : Changement de mot de passe */}
      <div className="bento-porcelain p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Sécurité & Mot de passe
            </h3>
            <p className="text-[11px] text-slate-500">Mettez à jour le mot de passe d’accès à votre boutique</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="curr-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe actuel <span className="text-rose-500">*</span>
              </label>
              <input
                id="curr-pass"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                Nouveau mot de passe <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-pass"
                type="password"
                required
                placeholder="Min. 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="confirm-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                Confirmer le nouveau <span className="text-rose-500">*</span>
              </label>
              <input
                id="confirm-pass"
                type="password"
                required
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isChangingPassword || !currentPassword || newPassword.length < 6}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50 transition-all"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isChangingPassword ? 'Enregistrement...' : 'Modifier le mot de passe'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bento-porcelain p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">
          Gestion des données & Déconnexion
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div>
            <p className="text-xs font-semibold text-slate-800">
              Vider l’inventaire de cette boutique
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Supprime tous les produits et l’historique de mouvements de votre compte. Cette action est définitive.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-blue-600" />
            <span>Vider le stock</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/60 border border-rose-200/60">
          <div>
            <p className="text-xs font-semibold text-rose-800">
              Quitter la session de travail
            </p>
            <p className="text-xs text-rose-600/80 mt-0.5">
              Retourne à la page de connexion de StockPro.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetModal}
        title="Vider tout l’inventaire ?"
        message="Tous vos produits et mouvements seront effacés de façon définitive. Cette action ne peut pas être annulée."
        confirmLabel="Oui, vider"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={() => {
          onClearInventory();
          setShowResetModal(false);
        }}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
};
