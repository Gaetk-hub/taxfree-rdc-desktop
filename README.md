# Tax Free RDC - Système de Détaxe pour la République Démocratique du Congo

Système complet de gestion de la détaxe (Tax Free / VAT Refund) pour les voyageurs non-résidents en République Démocratique du Congo.

## 🏗️ Architecture

```
projetdetaxe/
├── backend/          # Django REST API
│   ├── apps/         # Applications Django
│   │   ├── accounts/     # Gestion des utilisateurs et authentification
│   │   ├── merchants/    # Gestion des commerçants
│   │   ├── sales/        # Factures et articles
│   │   ├── taxfree/      # Bordereaux Tax Free
│   │   ├── customs/      # Validation douanière
│   │   ├── refunds/      # Remboursements
│   │   ├── disputes/     # Litiges
│   │   ├── rules/        # Moteur de règles
│   │   ├── audit/        # Journal d'audit
│   │   ├── notifications/# Notifications
│   │   └── b2b_vat/      # Crédit TVA B2B (optionnel)
│   ├── services/     # Services métier
│   ├── providers/    # Fournisseurs de paiement/notification (mock)
│   └── tests/        # Tests unitaires et d'intégration
├── frontend/         # React SPA
│   └── src/
│       ├── layouts/      # Layouts (Main, Auth)
│       ├── pages/        # Pages par rôle
│       ├── services/     # API client
│       └── store/        # État global (Zustand)
└── docker-compose.yml
```

## 🚀 Démarrage Rapide

### Prérequis

- Docker & Docker Compose
- Node.js 20+ (pour développement frontend)
- Python 3.11+ (pour développement backend)

### Avec Docker (Recommandé)

```bash
# Cloner le projet
git clone <repo-url>
cd projetdetaxe

# Lancer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

Services disponibles:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **API Docs**: http://localhost:8000/api/docs/

### Développement Local

#### Backend

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres

# Appliquer les migrations
python manage.py migrate

# Charger les données initiales
python manage.py seed_data

# Lancer le serveur
python manage.py runserver
```

#### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
```

## 👥 Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@taxfree.cd | admin123 |
| Commerçant | merchant@luxekin.cd | merchant123 |
| Douanier | customs@dgda.cd | customs123 |
| Opérateur | operator@taxfree.cd | operator123 |
| Auditeur | auditor@taxfree.cd | auditor123 |

## 📋 Fonctionnalités

### Commerçants
- ✅ Création de bordereaux Tax Free
- ✅ Gestion des ventes et articles
- ✅ Impression avec QR code
- ✅ Suivi des bordereaux

### Douane
- ✅ Scan QR code pour validation
- ✅ Mode hors-ligne avec synchronisation
- ✅ Validation/Refus des bordereaux
- ✅ Contrôle physique si requis

### Opérateurs
- ✅ File des remboursements
- ✅ Paiement par carte, virement, Mobile Money, espèces
- ✅ Relance des paiements échoués

### Administration
- ✅ Gestion des commerçants (approbation, suspension)
- ✅ Gestion des utilisateurs
- ✅ Configuration des règles (seuils, TVA, frais)
- ✅ Journal d'audit immutable
- ✅ Rapports et exports CSV

### Voyageurs
- ✅ Vérification du statut (page publique)

## 🔧 Configuration

### Variables d'Environnement Backend

```env
# Django
DEBUG=False
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de données
DATABASE_URL=postgres://user:pass@localhost:5432/taxfree_db

# Redis/Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7
```

### Règles Configurables

Le système utilise un moteur de règles flexible:

- **Montant minimum d'achat**: 100,000 CDF par défaut
- **Taux de TVA**: 16% par défaut
- **Frais opérateur**: 15% du remboursement
- **Délai de sortie**: 3 mois
- **Pays éligibles**: Tous sauf CD (RDC)
- **Catégories exclues**: Configurables

## 🔒 Sécurité

- Authentification JWT avec refresh tokens
- RBAC (Role-Based Access Control)
- Audit logging immutable
- Validation des données côté serveur
- Protection CSRF
- Headers de sécurité (X-Frame-Options, etc.)

## 📱 PWA

Le frontend supporte le mode PWA pour les agents douaniers:
- Installation sur mobile
- Mode hors-ligne
- Synchronisation automatique

## 🧪 Tests

```bash
# Backend
cd backend
pytest

# Avec couverture
pytest --cov=apps
```

## 📄 API Documentation

Documentation OpenAPI disponible à:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

## 🏛️ Licence

Propriétaire - Tous droits réservés
