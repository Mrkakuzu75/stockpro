# StockPro — Gestion de stock pour commerçants

Application web complète pour les commerçants de Côte d’Ivoire : inscriptions réelles, gestion de stock par boutique en FCFA, et **supervision centralisée depuis le tableau de bord administrateur**.

---

## 🚀 Fonctionnalités prêtes pour la production

### 🏪 Espace Commerçants
* **Inscriptions réelles ouvertes** : nom, boutique, e-mail, téléphone (Mobile / WhatsApp), ville (Abidjan, Bouaké, San-Pédro, Yamoussoukro...).
* **Boutique prête à l'emploi** : chaque commerçant démarre avec un espace vide prêt à accueillir son vrai catalogue.
* **Gestion des stocks en FCFA** :
  * Produits (prix d'achat, prix de vente, seuil d'alerte, unité personnalisée).
  * Entrées et sorties de stock avec motifs réels (réapprovisionnement, vente, casse, perte, inventaire).
  * Alertes visuelles de stock faible et de rupture.
  * Historique complet et traçabilité de tous les mouvements.

### 🛡️ Tableau de bord Administrateur (Pilotage & Supervision)
* **Indicateurs macro** : nombre total de commerçants, boutiques actives, boutiques suspendues, volume global d'articles et **valeur financière totale du stock supervisé**.
* **Mode Superviseur (Gestion directe des boutiques)** : l'administrateur peut accéder et gérer directement le tableau de bord de n'importe quel commerçant en 1 clic pour l'assister ou corriger des erreurs.
* **Gestion des comptes commerçants** :
  * Activation / Suspension immédiate d'une boutique.
  * Réinitialisation de mot de passe sécurisée (ou générateur de mot de passe) si un commerçant l'a oublié.
  * Remise à zéro d'un inventaire si nécessaire.
  * Suppression définitive de compte avec purge des données associées.
* **Sauvegarde & Exports** :
  * **Téléchargement de la base de données (JSON)** en un clic pour sauvegarder l'ensemble des données.
  * **Exportation de la liste des commerçants (CSV)** directement exploitable sur Excel.

---

## 🛠️ Démarrage en local (Développement)

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Configurer les variables d'environnement dans `.env` :
   ```bash
   JWT_SECRET=stockpro-jwt-local-changez-moi-avant-prod-28
   ADMIN_EMAIL=admin@stockpro.ci
   ADMIN_PASSWORD=StockProAdmin2026!
   ADMIN_NAME="Administrateur StockPro"
   PORT=4000
   NODE_ENV=development
   APP_URL=http://localhost:3000
   ```

3. Démarrer l'application (backend + frontend synchronisés) :
   ```bash
   npm run dev
   ```

* Interface utilisateur : **http://localhost:3000**
* API backend : **http://localhost:4000**
* Compte administrateur : `admin@stockpro.ci` / `StockProAdmin2026!`

---

## 🌐 Déploiement en ligne (Mise en production)

### Option 1 : Déploiement Cloud (Render, Railway, Fly.io, etc.)

1. **Variables d'environnement à configurer sur votre plateforme Cloud** :
   * `NODE_ENV` : `production`
   * `JWT_SECRET` : générer une clé secrète de plus de 32 caractères aléatoires.
   * `ADMIN_EMAIL` : adresse e-mail de l'administrateur principal.
   * `ADMIN_PASSWORD` : mot de passe fort pour l'administrateur.
   * `APP_URL` : l'URL HTTPS finale de votre site (ex: `https://stockpro.ci`).
   * `DATABASE_PATH` *(optionnel si volume persistant)* : chemin vers le fichier persistant (ex: `/var/data/stockpro-db.json`).

2. **Commande de build** :
   ```bash
   npm install && npm run build
   ```

3. **Commande de démarrage** :
   ```bash
   npm start
   ```

---

### Option 2 : Serveur VPS (Ubuntu / Debian + PM2 + Nginx)

1. **Compiler le frontend sur le serveur** :
   ```bash
   npm install
   npm run build
   ```

2. **Lancer le serveur en arrière-plan avec PM2** :
   ```bash
   pm2 start server/index.js --name "stockpro" --env production
   pm2 save
   pm2 startup
   ```

3. **Configuration Nginx avec SSL (Let's Encrypt)** :
   ```nginx
   server {
       server_name stockpro.ci www.stockpro.ci;

       location / {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🔒 Sécurité et Sauvegarde

* **Mots de passe** : hachés avec `bcryptjs` (salt 10).
* **Sessions** : jetons JWT signés avec contrôle de rôle (`admin` / `merchant`) et vérification du statut actif.
* **Sécurité HTTP** : en-têtes `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, suppression du header `X-Powered-By`.
* **Protection anti-brute force** : limitation des requêtes (`express-rate-limit`) sur les routes d'inscription et de connexion.
* **Persistance des données** : toutes les données sont enregistrées de façon atomique et sécurisée dans `data/stockpro-db.json`.
  * Vous pouvez sauvegarder ce fichier à tout moment depuis le tableau de bord administrateur avec le bouton **Sauvegarder base (JSON)**.
  * Pour forcer un nouveau mot de passe admin en cas de perte : mettez `ADMIN_RESET_PASSWORD=true` dans `.env`, redémarrez le serveur une fois, puis remettez-le à `false`.
