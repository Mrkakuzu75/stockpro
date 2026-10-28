import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import {
  initStore,
  findUserByEmail,
  findUserById,
  createMerchant,
  publicUser,
  updateUser,
  listMerchants,
  deleteMerchant,
  getProducts,
  getMovements,
  calculateStats,
  createProduct,
  updateProduct,
  deleteProduct,
  recordMovement,
  clearInventory,
  platformStats,
  resetMerchantPassword,
  getMerchantDashboard,
  getDatabaseRaw,
  exportMerchantsCsv,
  getDatabaseExplorerData,
  restoreDatabase,
  cleanupOrphans,
  changeUserPassword,
} from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || '';
const isProd = process.env.NODE_ENV === 'production';

if (!JWT_SECRET || JWT_SECRET.length < 24) {
  console.error('[stockpro] JWT_SECRET doit faire au moins 24 caractères dans le fichier .env');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');

// En-têtes de sécurité de base
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.set('trust proxy', 1);

// Configuration CORS dynamique et tolérante (production + dev)
const rawAppUrl = process.env.APP_URL || '';
const allowedOrigins = rawAppUrl
  ? rawAppUrl.split(',').map((u) => u.trim().replace(/\/+$/, ''))
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      if (!isProd) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// Limiteur général pour l'API (protection anti-DoS)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requêtes atteinte. Veuillez patienter quelques minutes.' },
});
app.use('/api/', generalLimiter);

// Limiteur spécifique et plus strict pour les tentatives d'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Compte introuvable.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Ce compte a été suspendu. Contactez l’administrateur.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session invalide. Reconnectez-vous.' });
  }
}

function adminRequired(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé à l’administrateur.' });
  }
  next();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'stockpro',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    platform: platformStats(),
  });
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { merchantName, shopName, email, password, phone, city } = req.body || {};
    if (!merchantName?.trim()) {
      return res.status(400).json({ error: 'Le nom du commerçant est obligatoire.' });
    }
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Adresse e-mail invalide.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 6 caractères.' });
    }

    const user = await createMerchant({
      email: cleanEmail,
      password: String(password),
      merchantName: String(merchantName).trim(),
      shopName: shopName ? String(shopName).trim() : 'Ma boutique',
      phone: phone ? String(phone).trim() : '',
      city: city ? String(city).trim() : '',
    });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Inscription impossible.' });
  }
});

// Hash factice pour neutraliser les attaques temporelles (timing attacks) sur l'énumération d'utilisateurs
const DUMMY_HASH = '$2a$10$w8.tB9fM1U3iA9zI8B7iSe0P0j6m9Z5q3V7w8.tB9fM1U3iA9zI8B';

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'E-mail et mot de passe requis.' });
    }
    const user = findUserByEmail(cleanEmail);
    if (!user) {
      // Égalise le temps de réponse pour empêcher l'énumération par canal auxiliaire
      await bcrypt.compare(String(password), DUMMY_HASH).catch(() => false);
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Ce compte a été suspendu. Contactez l’administrateur.' });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch {
    res.status(500).json({ error: 'Connexion impossible pour le moment.' });
  }
});

app.get('/api/me', authRequired, (req, res) => {
  res.json({
    user: publicUser(req.user),
    stats: calculateStats(req.user.id),
  });
});

app.patch('/api/me', authRequired, async (req, res) => {
  const user = await updateUser(req.user.id, {
    merchantName: req.body.merchantName,
    shopName: req.body.shopName,
    phone: req.body.phone,
    city: req.body.city,
  }, false);
  res.json({ user: publicUser(user) });
});

// Modification de mot de passe sécurisée pour l'utilisateur connecté
app.post('/api/me/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis.' });
    }
    await changeUserPassword(req.user.id, currentPassword, newPassword);
    res.json({ ok: true, message: 'Mot de passe mis à jour avec succès.' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Impossible de modifier le mot de passe.' });
  }
});

app.get('/api/products', authRequired, (req, res) => {
  res.json({ products: getProducts(req.user.id) });
});

app.post('/api/products', authRequired, async (req, res) => {
  if (!req.body?.name?.trim()) {
    return res.status(400).json({ error: 'Le nom du produit est obligatoire.' });
  }
  const product = await createProduct(req.user.id, req.body);
  res.status(201).json({ product, stats: calculateStats(req.user.id) });
});

app.patch('/api/products/:id', authRequired, async (req, res) => {
  const product = await updateProduct(req.user.id, req.params.id, req.body || {});
  if (!product) return res.status(404).json({ error: 'Produit introuvable.' });
  res.json({ product, stats: calculateStats(req.user.id) });
});

app.delete('/api/products/:id', authRequired, async (req, res) => {
  const ok = await deleteProduct(req.user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Produit introuvable.' });
  res.json({ ok: true, stats: calculateStats(req.user.id) });
});

app.get('/api/movements', authRequired, (req, res) => {
  res.json({ movements: getMovements(req.user.id) });
});

app.post('/api/movements', authRequired, async (req, res) => {
  const result = await recordMovement(req.user.id, req.body || {});
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json({
    movement: result.movement,
    products: getProducts(req.user.id),
    stats: calculateStats(req.user.id),
  });
});

app.delete('/api/inventory', authRequired, async (req, res) => {
  await clearInventory(req.user.id);
  res.json({ ok: true });
});

app.get('/api/admin/overview', authRequired, adminRequired, (_req, res) => {
  res.json({
    platform: platformStats(),
    merchants: listMerchants(),
  });
});

app.get('/api/admin/merchants/:id', authRequired, adminRequired, (req, res) => {
  const dash = getMerchantDashboard(req.params.id);
  if (!dash) {
    return res.status(404).json({ error: 'Commerçant introuvable.' });
  }
  res.json(dash);
});

app.patch('/api/admin/merchants/:id', authRequired, adminRequired, async (req, res) => {
  const user = findUserById(req.params.id);
  if (!user || user.role !== 'merchant') {
    return res.status(404).json({ error: 'Commerçant introuvable.' });
  }
  if (req.body.status && !['active', 'suspended'].includes(req.body.status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  const updated = await updateUser(user.id, {
    status: req.body.status,
    merchantName: req.body.merchantName,
    shopName: req.body.shopName,
    phone: req.body.phone,
    city: req.body.city,
  }, true);
  res.json({ user: publicUser(updated), stats: calculateStats(updated.id) });
});

// Réinitialisation de mot de passe par l'administrateur
app.post('/api/admin/merchants/:id/reset-password', authRequired, adminRequired, async (req, res) => {
  const user = findUserById(req.params.id);
  if (!user || user.role !== 'merchant') {
    return res.status(404).json({ error: 'Commerçant introuvable.' });
  }
  const { password } = req.body || {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 6 caractères.' });
  }
  const updated = await resetMerchantPassword(user.id, String(password));
  res.json({ ok: true, user: updated });
});

// Mode Superviseur / Accès direct au tableau de bord du commerçant
app.post('/api/admin/merchants/:id/impersonate', authRequired, adminRequired, (req, res) => {
  const user = findUserById(req.params.id);
  if (!user || user.role !== 'merchant') {
    return res.status(404).json({ error: 'Commerçant introuvable.' });
  }
  if (user.status !== 'active') {
    return res.status(400).json({ error: 'Impossible de gérer une boutique suspendue. Réactivez-la d’abord.' });
  }
  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email, impersonatedBy: req.user.id },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  res.json({ token, user: publicUser(user) });
});

// Réinitialisation de l'inventaire d'un commerçant depuis l'admin
app.post('/api/admin/merchants/:id/clear-inventory', authRequired, adminRequired, async (req, res) => {
  const user = findUserById(req.params.id);
  if (!user || user.role !== 'merchant') {
    return res.status(404).json({ error: 'Commerçant introuvable.' });
  }
  await clearInventory(user.id);
  const dash = getMerchantDashboard(user.id);
  res.json({ ok: true, dashboard: dash });
});

app.delete('/api/admin/merchants/:id', authRequired, adminRequired, async (req, res) => {
  const ok = await deleteMerchant(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Commerçant introuvable.' });
  res.json({ ok: true, platform: platformStats(), merchants: listMerchants() });
});

// Téléchargement d'une sauvegarde complète de la base de données (JSON)
app.get('/api/admin/backup', authRequired, adminRequired, (_req, res) => {
  try {
    const raw = getDatabaseRaw();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="stockpro-backup-${dateStr}.json"`);
    res.send(raw);
  } catch {
    res.status(500).json({ error: 'Impossible d’exporter la sauvegarde.' });
  }
});

// Exportation de la liste des commerçants et statistiques (CSV Excel)
app.get('/api/admin/export-merchants', authRequired, adminRequired, (_req, res) => {
  try {
    const csv = exportMerchantsCsv();
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stockpro-commercants-${dateStr}.csv"`);
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Impossible d’exporter les commerçants.' });
  }
});

// Explorateur & Métriques de la base de données (JSON)
app.get('/api/admin/database', authRequired, adminRequired, async (_req, res) => {
  try {
    const data = await getDatabaseExplorerData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Impossible de charger la base de données.' });
  }
});

// Restauration de la base de données depuis un payload JSON
app.post('/api/admin/database/restore', authRequired, adminRequired, async (req, res) => {
  try {
    const updated = await restoreDatabase(req.body);
    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Restauration impossible.' });
  }
});

// Nettoyage et vérification d'intégrité de la base de données
app.post('/api/admin/database/cleanup', authRequired, adminRequired, async (_req, res) => {
  try {
    const result = await cleanupOrphans();
    const data = await getDatabaseExplorerData();
    res.json({ ok: true, cleaned: result, data });
  } catch (err) {
    res.status(500).json({ error: 'Impossible d’effectuer le nettoyage.' });
  }
});

// Distribution des fichiers statiques compilés en production
const distPath = path.join(ROOT, 'dist');
const hasDist = existsSync(distPath) && existsSync(path.join(distPath, 'index.html'));

if (isProd || hasDist) {
  app.use(
    express.static(distPath, {
      maxAge: '7d',
      index: false,
    })
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (existsSync(path.join(distPath, 'index.html'))) {
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    res.status(503).send(`
      <!DOCTYPE html>
      <html lang="fr">
        <head><title>StockPro - Initialisation</title><meta charset="utf-8"/></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>StockPro API active</h1>
          <p>L'interface web n'est pas encore compilée. Exécutez <code>npm run build</code>.</p>
        </body>
      </html>
    `);
  });
}

app.use((err, _req, res, _next) => {
  console.error('[stockpro]', err.message);
  res.status(500).json({ error: 'Erreur serveur.' });
});

await initStore();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[stockpro] API prête sur http://localhost:${PORT}`);
  console.log(`[stockpro] Inscriptions ouvertes. Tableau admin : ${process.env.ADMIN_EMAIL || 'admin@stockpro.ci'}`);
});
