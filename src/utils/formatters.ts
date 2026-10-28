import { Product, StockStatus } from '../types/stock';

/**
 * Formate un montant en Francs CFA (FCFA) selon la convention française avec espaces insécables
 * Exemple: 25000 -> "25 000 FCFA"
 */
export function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 FCFA';
  }
  const rounded = Math.round(amount);
  return `${new Intl.NumberFormat('fr-FR').format(rounded)} FCFA`;
}

/**
 * Formate un nombre simple avec séparateur de milliers
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0';
  }
  return new Intl.NumberFormat('fr-FR').format(val);
}

/**
 * Détermine le statut du stock selon les règles métier:
 * - Épuisé: quantité = 0
 * - Stock faible: quantité > 0 ET quantité <= seuil d'alerte
 * - Normal: quantité > seuil d'alerte
 */
export function getStockStatus(product: Pick<Product, 'quantity' | 'alertThreshold'>): StockStatus {
  if (product.quantity <= 0) {
    return 'out';
  }
  if (product.quantity <= product.alertThreshold) {
    return 'low';
  }
  return 'normal';
}

/**
 * Retourne le libellé en français du statut
 */
export function getStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'out':
      return 'Épuisé';
    case 'low':
      return 'Stock faible';
    case 'normal':
      return 'Stock disponible';
  }
}

/**
 * Formate une date au format français
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Formate une date courte
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Formate une quantité avec son unité
 */
export function formatQuantityWithUnit(qty: number, unit: string): string {
  const formattedNumber = formatNumber(qty);
  // Accorder au pluriel si > 1 et unité courante
  let displayUnit = unit;
  if (qty > 1 && !unit.endsWith('s') && !unit.endsWith('x')) {
    if (unit === 'pièce') displayUnit = 'pièces';
    else if (unit === 'paquet') displayUnit = 'paquets';
    else if (unit === 'bouteille') displayUnit = 'bouteilles';
    else if (unit === 'sac') displayUnit = 'sacs';
    else if (unit === 'carton') displayUnit = 'cartons';
    else if (unit === 'bidon') displayUnit = 'bidons';
    else if (unit === 'boîte') displayUnit = 'boîtes';
    else if (unit === 'pack') displayUnit = 'packs';
  }
  return `${formattedNumber} ${displayUnit}`;
}
