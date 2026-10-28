import { Product, StockMovement, UserProfile, InventoryStats, MovementType, MovementMotive } from '../types/stock';
import { api, clearToken, getToken, setToken } from './api';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying stock listener:', e);
    }
  });
}

const emptyUser = (): UserProfile => ({
  merchantName: '',
  shopName: '',
  email: '',
  currency: 'FCFA',
  isAuthenticated: false,
  role: 'merchant',
  status: 'active',
});

const emptyStats = (): InventoryStats => ({
  totalProducts: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  totalStockValue: 0,
  totalEstimatedSalesValue: 0,
});

class StockService {
  private productsCache: Product[] = [];
  private movementsCache: StockMovement[] = [];
  private userCache: UserProfile = emptyUser();
  private statsCache: InventoryStats = emptyStats();
  private booted = false;

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  getProducts(): Product[] {
    return [...this.productsCache];
  }

  getMovements(): StockMovement[] {
    return [...this.movementsCache];
  }

  getUserProfile(): UserProfile {
    return { ...this.userCache };
  }

  calculateStats(): InventoryStats {
    return { ...this.statsCache };
  }

  isReady(): boolean {
    return this.booted;
  }

  async bootstrap(): Promise<UserProfile> {
    if (!getToken()) {
      this.resetLocalState();
      this.booted = true;
      notifyListeners();
      return this.getUserProfile();
    }

    try {
      const me = await api<{ user: UserProfile; stats: InventoryStats }>('/me');
      this.userCache = { ...me.user, isAuthenticated: true };
      this.statsCache = me.stats;
      await this.refreshInventory();
    } catch {
      clearToken();
      this.resetLocalState();
    }

    this.booted = true;
    notifyListeners();
    return this.getUserProfile();
  }

  private resetLocalState() {
    this.productsCache = [];
    this.movementsCache = [];
    this.userCache = emptyUser();
    this.statsCache = emptyStats();
  }

  async refreshInventory(): Promise<void> {
    const [productsRes, movementsRes] = await Promise.all([
      api<{ products: Product[] }>('/products'),
      api<{ movements: StockMovement[] }>('/movements'),
    ]);
    this.productsCache = productsRes.products;
    this.movementsCache = movementsRes.movements;
    this.statsCache = this.computeStats(this.productsCache);
    notifyListeners();
  }

  private computeStats(products: Product[]): InventoryStats {
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;
    let totalEstimatedSalesValue = 0;
    for (const p of products) {
      if (p.quantity === 0) outOfStockCount += 1;
      else if (p.quantity <= p.alertThreshold) lowStockCount += 1;
      totalStockValue += p.quantity * p.purchasePrice;
      totalEstimatedSalesValue += p.quantity * p.sellingPrice;
    }
    return {
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      totalStockValue,
      totalEstimatedSalesValue,
    };
  }

  async login(email: string, password: string): Promise<UserProfile> {
    const res = await api<{ token: string; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(res.token);
    this.userCache = { ...res.user, isAuthenticated: true };
    await this.refreshInventory();
    notifyListeners();
    return this.getUserProfile();
  }

  private adminTokenBackup: string | null = null;
  private adminUserBackup: UserProfile | null = null;

  isImpersonating(): boolean {
    return Boolean(this.adminTokenBackup);
  }

  getAdminUser(): UserProfile | null {
    return this.adminUserBackup;
  }

  async impersonate(token: string, targetUser: UserProfile): Promise<void> {
    if (!this.adminTokenBackup) {
      this.adminTokenBackup = getToken();
      this.adminUserBackup = { ...this.userCache };
    }
    setToken(token);
    this.userCache = { ...targetUser, isAuthenticated: true };
    await this.refreshInventory();
    notifyListeners();
  }

  async stopImpersonating(): Promise<UserProfile> {
    if (this.adminTokenBackup) {
      setToken(this.adminTokenBackup);
      this.adminTokenBackup = null;
    }
    const adminUser = this.adminUserBackup || emptyUser();
    this.adminUserBackup = null;
    this.userCache = adminUser;
    await this.refreshInventory();
    notifyListeners();
    return this.getUserProfile();
  }

  async register(payload: {
    merchantName: string;
    shopName: string;
    email: string;
    password: string;
    phone?: string;
    city?: string;
  }): Promise<UserProfile> {
    const res = await api<{ token: string; user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: payload,
    });
    setToken(res.token);
    this.userCache = { ...res.user, isAuthenticated: true };
    this.productsCache = [];
    this.movementsCache = [];
    this.statsCache = emptyStats();
    notifyListeners();
    return this.getUserProfile();
  }

  logout(): void {
    clearToken();
    this.resetLocalState();
    this.booted = true;
    notifyListeners();
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const res = await api<{ product: Product; stats: InventoryStats }>('/products', {
      method: 'POST',
      body: data,
    });
    await this.refreshInventory();
    this.statsCache = res.stats;
    notifyListeners();
    return res.product;
  }

  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'createdAt'>>
  ): Promise<Product | undefined> {
    const res = await api<{ product: Product; stats: InventoryStats }>(`/products/${id}`, {
      method: 'PATCH',
      body: updates,
    });
    await this.refreshInventory();
    this.statsCache = res.stats;
    notifyListeners();
    return res.product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await api(`/products/${id}`, { method: 'DELETE' });
    await this.refreshInventory();
    return true;
  }

  async recordMovement(input: {
    productId: string;
    type: MovementType;
    quantity: number;
    motive: MovementMotive;
    motiveLabel: string;
    date?: string;
    note?: string;
  }): Promise<{ success: boolean; movement?: StockMovement; error?: string }> {
    try {
      const res = await api<{
        movement: StockMovement;
        products: Product[];
        stats: InventoryStats;
      }>('/movements', {
        method: 'POST',
        body: input,
      });
      this.productsCache = res.products;
      this.statsCache = res.stats;
      this.movementsCache = [res.movement, ...this.movementsCache.filter((m) => m.id !== res.movement.id)];
      notifyListeners();
      return { success: true, movement: res.movement };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Erreur lors de l’enregistrement.' };
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await api<{ user: UserProfile }>('/me', {
      method: 'PATCH',
      body: updates,
    });
    this.userCache = { ...res.user, isAuthenticated: true };
    notifyListeners();
    return this.getUserProfile();
  }

  async clearInventory(): Promise<void> {
    await api('/inventory', { method: 'DELETE' });
    this.productsCache = [];
    this.movementsCache = [];
    this.statsCache = emptyStats();
    notifyListeners();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api('/me/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }
}

export const stockService = new StockService();
