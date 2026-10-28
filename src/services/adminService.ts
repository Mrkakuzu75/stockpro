import { InventoryStats, Product, StockMovement, UserProfile } from '../types/stock';
import { api, getToken } from './api';

export interface PlatformStats {
  totalMerchants: number;
  activeMerchants: number;
  suspendedMerchants: number;
  totalProducts: number;
  totalMovements: number;
  totalStockValue?: number;
  totalEstimatedSalesValue?: number;
}

export interface MerchantSummary extends UserProfile {
  stats: InventoryStats;
}

export interface MerchantDashboard {
  user: UserProfile;
  stats: InventoryStats;
  products: Product[];
  movements: StockMovement[];
}

export async function fetchAdminOverview(): Promise<{
  platform: PlatformStats;
  merchants: MerchantSummary[];
}> {
  return api('/admin/overview');
}

export async function fetchMerchantDashboard(id: string): Promise<MerchantDashboard> {
  return api(`/admin/merchants/${id}`);
}

export async function updateMerchantStatus(
  id: string,
  status: 'active' | 'suspended'
): Promise<{ user: UserProfile }> {
  return api(`/admin/merchants/${id}`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function updateMerchantDetails(
  id: string,
  updates: Partial<UserProfile>
): Promise<{ user: UserProfile; stats: InventoryStats }> {
  return api(`/admin/merchants/${id}`, {
    method: 'PATCH',
    body: updates,
  });
}

export async function resetMerchantPassword(
  id: string,
  password: string
): Promise<{ ok: boolean; user: UserProfile }> {
  return api(`/admin/merchants/${id}/reset-password`, {
    method: 'POST',
    body: { password },
  });
}

export async function impersonateMerchant(id: string): Promise<{
  token: string;
  user: UserProfile;
}> {
  return api(`/admin/merchants/${id}/impersonate`, {
    method: 'POST',
  });
}

export async function clearMerchantInventory(id: string): Promise<{
  ok: boolean;
  dashboard: MerchantDashboard;
}> {
  return api(`/admin/merchants/${id}/clear-inventory`, {
    method: 'POST',
  });
}

export async function deleteMerchantAccount(id: string): Promise<{
  ok: boolean;
  platform: PlatformStats;
  merchants: MerchantSummary[];
}> {
  return api(`/admin/merchants/${id}`, { method: 'DELETE' });
}

export interface DatabaseExplorerData {
  fileInfo: {
    path: string;
    sizeBytes: number;
    sizeFormatted: string;
    lastModified: string | null;
  };
  stats: {
    usersCount: number;
    merchantsCount: number;
    adminsCount: number;
    productsCount: number;
    movementsCount: number;
  };
  collections: {
    users: (UserProfile & { role: string; status: string; updatedAt?: string; passwordHash?: string })[];
    products: (Product & { userId: string })[];
    movements: (StockMovement & { userId: string })[];
  };
  rawJson: string;
}

export async function fetchDatabaseExplorerData(): Promise<DatabaseExplorerData> {
  return api('/admin/database');
}

export async function restoreDatabaseFromData(payload: unknown): Promise<{ ok: boolean; data: DatabaseExplorerData }> {
  return api('/admin/database/restore', {
    method: 'POST',
    body: payload,
  });
}

export async function cleanupDatabaseOrphans(): Promise<{
  ok: boolean;
  cleaned: { removedProducts: number; removedMovements: number };
  data: DatabaseExplorerData;
}> {
  return api('/admin/database/cleanup', {
    method: 'POST',
  });
}

export async function downloadDatabaseBackup(): Promise<void> {
  const token = getToken();
  const res = await fetch('/api/admin/backup', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Impossible de télécharger la sauvegarde.');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stockpro-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadMerchantsCsv(): Promise<void> {
  const token = getToken();
  const res = await fetch('/api/admin/export-merchants', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Impossible d’exporter les commerçants.');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stockpro-commercants-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
