export type StockUnit =
  | 'pièce'
  | 'paquet'
  | 'bouteille'
  | 'sac'
  | 'kilogramme'
  | 'litre'
  | 'carton'
  | 'bidon'
  | 'boîte'
  | 'pack'
  | 'autre';

export type StockStatus = 'normal' | 'low' | 'out';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: StockUnit | string;
  quantity: number;
  purchasePrice: number; // en FCFA
  sellingPrice: number;  // en FCFA
  alertThreshold: number;
  sku?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'IN' | 'OUT';

export type InMotive = 'reappro' | 'retour' | 'correction' | 'autre';
export type OutMotive = 'vente' | 'perte' | 'casse' | 'conso_perso' | 'correction' | 'autre';

export type MovementMotive = InMotive | OutMotive;

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  unit: string;
  stockBefore: number;
  stockAfter: number;
  motive: MovementMotive;
  motiveLabel: string;
  date: string;
  note?: string;
}

export interface UserProfile {
  id?: string;
  merchantName: string;
  shopName: string;
  email: string;
  phone?: string;
  city?: string;
  currency: string;
  isAuthenticated: boolean;
  role?: 'merchant' | 'admin';
  status?: 'active' | 'suspended';
  createdAt?: string;
}

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number; // en FCFA
  totalEstimatedSalesValue: number; // en FCFA
}

export type ActivePage =
  | 'dashboard'
  | 'products'
  | 'movements'
  | 'history'
  | 'settings'
  | 'admin';
