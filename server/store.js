import { mkdir, readFile, writeFile, rename, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'stockpro-db.json');

const emptyDb = () => ({ users: [], products: [], movements: [] });

// --- Stockage distant (PostgreSQL) : actif si DATABASE_URL est défini ---
const DATABASE_URL = process.env.DATABASE_URL || '';
let pool = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

async function loadFromPostgres(remote) {
  await remote.query(
    `CREATE TABLE IF NOT EXISTS stockpro_state (
       id TEXT PRIMARY KEY,
       data JSONB NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );
  const { rows } = await remote.query(`SELECT data FROM stockpro_state WHERE id = 'main'`);
  if (rows.length > 0) {
    const parsed = rows[0].data || {};
    db = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      movements: Array.isArray(parsed.movements) ? parsed.movements : [],
    };
  } else {
    db = emptyDb();
    await persist();
  }
  console.log('[stockpro] Base PostgreSQL connectée.');
}

let db = emptyDb();
let writeQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function sanitizeNumber(val, defaultVal = 0, max = 1000000000) {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return defaultVal;
  return Math.min(num, max);
}

export async function initStore() {
  const remote = getPool();
  if (remote) {
    await loadFromPostgres(remote);
    await ensureAdmin();
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  if (existsSync(DB_PATH)) {
    try {
      const raw = await readFile(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      db = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        movements: Array.isArray(parsed.movements) ? parsed.movements : [],
      };
    } catch {
      db = emptyDb();
      await persist();
    }
  } else {
    db = emptyDb();
    await persist();
  }

  await ensureAdmin();
}

async function persist() {
  writeQueue = writeQueue
    .catch((err) => {
      console.error('[stockpro] Erreur dans la file d’écriture:', err);
    })
    .then(async () => {
      const remote = getPool();
      if (remote) {
        await remote.query(
          `INSERT INTO stockpro_state (id, data, updated_at) VALUES ('main', $1::jsonb, now())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [JSON.stringify(db)]
        );
        return;
      }
      await mkdir(path.dirname(DB_PATH), { recursive: true });
      const tmp = `${DB_PATH}.tmp-${Date.now()}`;
      const payload = JSON.stringify(db, null, 2);
      await writeFile(tmp, payload, 'utf8');
      try {
        await rename(tmp, DB_PATH);
      } catch {
        // Fallback pour les systèmes (notamment Windows) verrouillant temporairement les fichiers
        await writeFile(DB_PATH, payload, 'utf8');
        try {
          if (existsSync(tmp)) await unlink(tmp);
        } catch {
          // ignorer le nettoyage tmp
        }
      }
    });
  return writeQueue;
}

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@stockpro.ci').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!password) {
    console.warn('[stockpro] ADMIN_PASSWORD manquant : aucun compte admin n’est créé.');
    return;
  }

  const existing = db.users.find((u) => u.email === email);
  const hash = await bcrypt.hash(password, 10);
  const stamp = nowIso();

  if (!existing) {
    db.users.push({
      id: newId('usr'),
      email,
      passwordHash: hash,
      merchantName: process.env.ADMIN_NAME || 'Administrateur StockPro',
      shopName: 'Administration StockPro',
      phone: '',
      city: 'Abidjan',
      currency: 'FCFA',
      role: 'admin',
      status: 'active',
      createdAt: stamp,
      updatedAt: stamp,
    });
    await persist();
    console.log(`[stockpro] Compte admin créé : ${email}`);
    return;
  }

  // Toujours garantir que le compte principal conserve le rôle admin et le statut actif
  existing.role = 'admin';
  existing.status = 'active';

  if (process.env.ADMIN_RESET_PASSWORD === 'true') {
    existing.passwordHash = hash;
    existing.updatedAt = stamp;
    await persist();
    console.log(`[stockpro] Mot de passe admin réinitialisé pour ${email}`);
  }
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    merchantName: user.merchantName,
    shopName: user.shopName,
    phone: user.phone || '',
    city: user.city || '',
    currency: user.currency || 'FCFA',
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function findUserByEmail(email) {
  if (!email || typeof email !== 'string') return null;
  return db.users.find((u) => u.email === email.trim().toLowerCase()) || null;
}

export function findUserById(id) {
  return db.users.find((u) => u.id === id) || null;
}

export async function createMerchant({ email, password, merchantName, shopName, phone, city }) {
  const normalized = email.trim().toLowerCase().slice(0, 120);
  if (findUserByEmail(normalized)) {
    const err = new Error('Un compte existe déjà avec cette adresse e-mail.');
    err.status = 409;
    throw err;
  }

  const stamp = nowIso();
  const user = {
    id: newId('usr'),
    email: normalized,
    passwordHash: await bcrypt.hash(password, 10),
    merchantName: merchantName.trim().slice(0, 100),
    shopName: (shopName || 'Ma boutique').trim().slice(0, 100),
    phone: (phone || '').trim().slice(0, 40),
    city: (city || '').trim().slice(0, 80),
    currency: 'FCFA',
    role: 'merchant',
    status: 'active',
    createdAt: stamp,
    updatedAt: stamp,
  };
  db.users.push(user);
  await persist();
  return user;
}

export async function updateUser(id, updates, isExplicitAdmin = false) {
  const user = findUserById(id);
  if (!user) return null;
  const allowed = isExplicitAdmin
    ? ['merchantName', 'shopName', 'phone', 'city', 'status']
    : ['merchantName', 'shopName', 'phone', 'city'];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      user[key] = typeof updates[key] === 'string' ? updates[key].trim().slice(0, 150) : updates[key];
    }
  }
  user.updatedAt = nowIso();
  await persist();
  return user;
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = findUserById(userId);
  if (!user) {
    throw new Error('Utilisateur introuvable.');
  }
  const valid = await bcrypt.compare(String(currentPassword || ''), user.passwordHash);
  if (!valid) {
    throw new Error('Le mot de passe actuel est incorrect.');
  }
  if (!newPassword || String(newPassword).length < 6) {
    throw new Error('Le nouveau mot de passe doit comporter au moins 6 caractères.');
  }
  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.updatedAt = nowIso();
  await persist();
  return true;
}

export function listMerchants() {
  return db.users
    .filter((u) => u.role === 'merchant')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((user) => ({
      ...publicUser(user),
      stats: calculateStats(user.id),
    }));
}

export async function deleteMerchant(id) {
  const user = findUserById(id);
  if (!user || user.role === 'admin') return false;
  db.products = db.products.filter((p) => p.userId !== id);
  db.movements = db.movements.filter((m) => m.userId !== id);
  db.users = db.users.filter((u) => u.id !== id);
  await persist();
  return true;
}

export function getProducts(userId) {
  return db.products
    .filter((p) => p.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(toPublicProduct);
}

export function getProduct(userId, productId) {
  const product = db.products.find((p) => p.id === productId && p.userId === userId);
  return product ? toPublicProduct(product) : null;
}

function toPublicProduct(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    quantity: p.quantity,
    purchasePrice: p.purchasePrice,
    sellingPrice: p.sellingPrice,
    alertThreshold: p.alertThreshold,
    sku: p.sku || '',
    description: p.description || '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function getMovements(userId) {
  return db.movements
    .filter((m) => m.userId === userId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.productName,
      type: m.type,
      quantity: m.quantity,
      unit: m.unit,
      stockBefore: m.stockBefore,
      stockAfter: m.stockAfter,
      motive: m.motive,
      motiveLabel: m.motiveLabel,
      date: m.date,
      note: m.note || '',
    }));
}

export function calculateStats(userId) {
  const products = db.products.filter((p) => p.userId === userId);
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

export async function createProduct(userId, data) {
  const stamp = nowIso();
  const product = {
    id: newId('prod'),
    userId,
    name: String(data.name || '').trim().slice(0, 150),
    category: String(data.category || 'Divers').trim().slice(0, 60),
    unit: String(data.unit || 'pièce').trim().slice(0, 30),
    quantity: sanitizeNumber(data.quantity, 0, 10000000),
    purchasePrice: sanitizeNumber(data.purchasePrice, 0, 1000000000),
    sellingPrice: sanitizeNumber(data.sellingPrice, 0, 1000000000),
    alertThreshold: sanitizeNumber(data.alertThreshold, 0, 10000000),
    sku: String(data.sku || '').trim().slice(0, 60),
    description: String(data.description || '').trim().slice(0, 500),
    createdAt: stamp,
    updatedAt: stamp,
  };
  db.products.unshift(product);

  if (product.quantity > 0) {
    db.movements.unshift({
      id: newId('mov'),
      userId,
      productId: product.id,
      productName: product.name,
      type: 'IN',
      quantity: product.quantity,
      unit: product.unit,
      stockBefore: 0,
      stockAfter: product.quantity,
      motive: 'reappro',
      motiveLabel: 'Stock initial à la création',
      date: stamp,
      note: 'Inventaire de départ du produit',
    });
  }

  await persist();
  return toPublicProduct(product);
}

export async function updateProduct(userId, productId, updates) {
  const product = db.products.find((p) => p.id === productId && p.userId === userId);
  if (!product) return null;

  const previousQty = product.quantity;
  const stringFields = ['name', 'category', 'unit', 'sku', 'description'];
  for (const key of stringFields) {
    if (updates[key] !== undefined && typeof updates[key] === 'string') {
      const maxLen = key === 'description' ? 500 : 150;
      product[key] = updates[key].trim().slice(0, maxLen);
    }
  }

  const numFields = ['purchasePrice', 'sellingPrice', 'alertThreshold', 'quantity'];
  for (const key of numFields) {
    if (updates[key] !== undefined) {
      const max = ['purchasePrice', 'sellingPrice'].includes(key) ? 1000000000 : 10000000;
      product[key] = sanitizeNumber(updates[key], product[key], max);
    }
  }
  product.updatedAt = nowIso();

  if (updates.quantity !== undefined && product.quantity !== previousQty) {
    const diff = product.quantity - previousQty;
    db.movements.unshift({
      id: newId('mov'),
      userId,
      productId: product.id,
      productName: product.name,
      type: diff > 0 ? 'IN' : 'OUT',
      quantity: Math.abs(diff),
      unit: product.unit,
      stockBefore: previousQty,
      stockAfter: product.quantity,
      motive: 'correction',
      motiveLabel: "Correction d'inventaire",
      date: product.updatedAt,
      note: `Ajustement manuel via fiche produit (${previousQty} -> ${product.quantity})`,
    });
  }

  await persist();
  return toPublicProduct(product);
}

export async function deleteProduct(userId, productId) {
  const before = db.products.length;
  db.products = db.products.filter((p) => !(p.id === productId && p.userId === userId));
  if (db.products.length === before) return false;
  db.movements = db.movements.filter((m) => !(m.productId === productId && m.userId === userId));
  await persist();
  return true;
}

export async function recordMovement(userId, input) {
  const type = String(input.type || '').toUpperCase();
  if (type !== 'IN' && type !== 'OUT') {
    return { success: false, error: 'Type de mouvement invalide (IN ou OUT requis).' };
  }

  const product = db.products.find((p) => p.id === input.productId && p.userId === userId);
  if (!product) {
    return { success: false, error: 'Produit introuvable.' };
  }

  const qty = sanitizeNumber(input.quantity, 0, 10000000);
  if (qty <= 0) {
    return { success: false, error: 'La quantité doit être un nombre strictement supérieur à zéro.' };
  }

  const stockBefore = product.quantity;
  let stockAfter;
  if (type === 'IN') {
    stockAfter = stockBefore + qty;
  } else {
    if (qty > stockBefore) {
      return {
        success: false,
        error: `Quantité insuffisante en stock. Disponible : ${stockBefore} ${product.unit}(s), retrait demandé : ${qty}. Le stock ne peut pas être négatif.`,
      };
    }
    stockAfter = stockBefore - qty;
  }

  const stamp = nowIso();
  product.quantity = stockAfter;
  product.updatedAt = stamp;

  const movement = {
    id: newId('mov'),
    userId,
    productId: product.id,
    productName: product.name,
    type,
    quantity: qty,
    unit: product.unit,
    stockBefore,
    stockAfter,
    motive: String(input.motive || 'autre').slice(0, 50),
    motiveLabel: String(input.motiveLabel || '').trim().slice(0, 100),
    date: input.date || stamp,
    note: (input.note || '').trim().slice(0, 300),
  };
  db.movements.unshift(movement);
  await persist();
  return { success: true, movement: getMovements(userId).find((m) => m.id === movement.id) };
}

export async function clearInventory(userId) {
  db.products = db.products.filter((p) => p.userId !== userId);
  db.movements = db.movements.filter((m) => m.userId !== userId);
  await persist();
}

export function platformStats() {
  const merchants = db.users.filter((u) => u.role === 'merchant');
  const active = merchants.filter((u) => u.status === 'active').length;
  let totalStockValue = 0;
  let totalEstimatedSalesValue = 0;

  for (const p of db.products) {
    const qty = Number(p.quantity) || 0;
    totalStockValue += qty * (Number(p.purchasePrice) || 0);
    totalEstimatedSalesValue += qty * (Number(p.sellingPrice) || 0);
  }

  return {
    totalMerchants: merchants.length,
    activeMerchants: active,
    suspendedMerchants: merchants.length - active,
    totalProducts: db.products.length,
    totalMovements: db.movements.length,
    totalStockValue,
    totalEstimatedSalesValue,
  };
}

export async function resetMerchantPassword(userId, newPassword) {
  const user = findUserById(userId);
  if (!user || user.role === 'admin') return null;
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.updatedAt = nowIso();
  await persist();
  return publicUser(user);
}

export function getMerchantDashboard(userId) {
  const user = findUserById(userId);
  if (!user || user.role !== 'merchant') return null;
  return {
    user: publicUser(user),
    stats: calculateStats(user.id),
    products: getProducts(user.id),
    movements: getMovements(user.id),
  };
}

export function getDatabaseRaw() {
  return JSON.stringify(db, null, 2);
}

export function exportMerchantsCsv() {
  const merchants = listMerchants();
  const headers = [
    'ID',
    'Boutique',
    'Commerçant',
    'Email',
    'Téléphone',
    'Ville',
    'Statut',
    'Date inscription',
    'Nombre produits',
    'Valeur stock (FCFA)',
    'Valeur vente estimée (FCFA)',
    'Alertes stock faible',
    'Ruptures de stock',
  ];

  const escapeCol = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = merchants.map((m) => [
    escapeCol(m.id),
    escapeCol(m.shopName),
    escapeCol(m.merchantName),
    escapeCol(m.email),
    escapeCol(m.phone),
    escapeCol(m.city),
    escapeCol(m.status === 'active' ? 'Actif' : 'Suspendu'),
    escapeCol(m.createdAt),
    m.stats.totalProducts,
    m.stats.totalStockValue,
    m.stats.totalEstimatedSalesValue,
    m.stats.lowStockCount,
    m.stats.outOfStockCount,
  ]);

  // Byte Order Mark (\uFEFF) pour compatibilité Excel Windows & Mac
  return '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
}

export async function getDatabaseExplorerData() {
  let sizeBytes = 0;
  let lastModified = null;
  try {
    if (existsSync(DB_PATH)) {
      const s = await stat(DB_PATH);
      sizeBytes = s.size;
      lastModified = s.mtime.toISOString();
    }
  } catch {
    // ignoré si le fichier vient d'être créé
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  return {
    fileInfo: {
      path: DB_PATH,
      sizeBytes,
      sizeFormatted: formatSize(sizeBytes),
      lastModified,
    },
    stats: {
      usersCount: db.users.length,
      merchantsCount: db.users.filter((u) => u.role === 'merchant').length,
      adminsCount: db.users.filter((u) => u.role === 'admin').length,
      productsCount: db.products.length,
      movementsCount: db.movements.length,
    },
    collections: {
      users: db.users.map((u) => ({
        ...u,
        passwordHash: u.passwordHash ? '•••••••• [haché bcrypt]' : 'aucun',
      })),
      products: [...db.products],
      movements: [...db.movements],
    },
    rawJson: JSON.stringify(db, null, 2),
  };
}

export async function restoreDatabase(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Données de sauvegarde invalides.');
  }
  if (!Array.isArray(payload.users) || !Array.isArray(payload.products) || !Array.isArray(payload.movements)) {
    throw new Error('Format de base de données non conforme : les tableaux users, products et movements sont requis.');
  }

  // Nettoyage et assainissement strict des utilisateurs
  const cleanUsers = payload.users
    .filter((u) => u && typeof u === 'object' && u.id && u.email)
    .map((u) => ({
      id: String(u.id),
      email: String(u.email).trim().toLowerCase().slice(0, 120),
      passwordHash: String(u.passwordHash || ''),
      merchantName: String(u.merchantName || '').trim().slice(0, 150),
      shopName: String(u.shopName || 'Boutique').trim().slice(0, 150),
      phone: String(u.phone || '').trim().slice(0, 40),
      city: String(u.city || '').trim().slice(0, 80),
      currency: String(u.currency || 'FCFA').slice(0, 10),
      role: u.role === 'admin' ? 'admin' : 'merchant',
      status: u.status === 'suspended' ? 'suspended' : 'active',
      createdAt: u.createdAt || nowIso(),
      updatedAt: u.updatedAt || nowIso(),
    }));

  // Nettoyage et assainissement strict des produits
  const cleanProducts = payload.products
    .filter((p) => p && typeof p === 'object' && p.id && p.userId)
    .map((p) => ({
      id: String(p.id),
      userId: String(p.userId),
      name: String(p.name || '').trim().slice(0, 150),
      category: String(p.category || 'Divers').trim().slice(0, 60),
      unit: String(p.unit || 'pièce').trim().slice(0, 30),
      quantity: sanitizeNumber(p.quantity, 0, 10000000),
      purchasePrice: sanitizeNumber(p.purchasePrice, 0, 1000000000),
      sellingPrice: sanitizeNumber(p.sellingPrice, 0, 1000000000),
      alertThreshold: sanitizeNumber(p.alertThreshold, 0, 10000000),
      sku: String(p.sku || '').trim().slice(0, 60),
      description: String(p.description || '').trim().slice(0, 500),
      createdAt: p.createdAt || nowIso(),
      updatedAt: p.updatedAt || nowIso(),
    }));

  // Nettoyage et assainissement strict des mouvements
  const cleanMovements = payload.movements
    .filter((m) => m && typeof m === 'object' && m.id && m.userId && m.productId)
    .map((m) => ({
      id: String(m.id),
      userId: String(m.userId),
      productId: String(m.productId),
      productName: String(m.productName || '').trim().slice(0, 150),
      type: String(m.type || '').toUpperCase() === 'OUT' ? 'OUT' : 'IN',
      quantity: sanitizeNumber(m.quantity, 1, 10000000),
      unit: String(m.unit || 'pièce').trim().slice(0, 30),
      stockBefore: sanitizeNumber(m.stockBefore, 0, 10000000),
      stockAfter: sanitizeNumber(m.stockAfter, 0, 10000000),
      motive: String(m.motive || 'autre').slice(0, 50),
      motiveLabel: String(m.motiveLabel || '').trim().slice(0, 100),
      date: m.date || nowIso(),
      note: String(m.note || '').trim().slice(0, 300),
    }));

  db = {
    users: cleanUsers,
    products: cleanProducts,
    movements: cleanMovements,
  };

  await ensureAdmin();
  await persist();
  return getDatabaseExplorerData();
}

export async function cleanupOrphans() {
  const userIds = new Set(db.users.map((u) => u.id));

  const prodBefore = db.products.length;
  db.products = db.products.filter((p) => userIds.has(p.userId));
  const removedProducts = prodBefore - db.products.length;

  const movBefore = db.movements.length;
  db.movements = db.movements.filter((m) => userIds.has(m.userId));
  const removedMovements = movBefore - db.movements.length;

  if (removedProducts > 0 || removedMovements > 0) {
    await persist();
  }

  return {
    removedProducts,
    removedMovements,
  };
}
