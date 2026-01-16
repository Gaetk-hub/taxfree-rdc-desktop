# Politique de Sécurité - Tax Free RDC

## 🔐 Mesures de Sécurité Implémentées

### Authentification

- **JWT (JSON Web Tokens)**: Tokens d'accès à courte durée de vie (60 min par défaut)
- **Refresh Tokens**: Tokens de rafraîchissement à longue durée (7 jours)
- **Hachage des mots de passe**: Utilisation de PBKDF2 avec SHA256
- **Validation des mots de passe**: Longueur minimale, complexité requise

### Autorisation

- **RBAC (Role-Based Access Control)**: 5 rôles distincts
  - `ADMIN`: Accès complet au système
  - `MERCHANT`: Gestion des ventes et bordereaux
  - `CUSTOMS_AGENT`: Validation des bordereaux
  - `OPERATOR`: Traitement des remboursements
  - `AUDITOR`: Consultation des rapports et audit

- **Permissions par endpoint**: Chaque API vérifie les permissions requises
- **Isolation des données**: Les commerçants ne voient que leurs propres données

### Protection des Données

- **Chiffrement en transit**: HTTPS obligatoire en production
- **Données sensibles masquées**: Numéros de passeport partiellement masqués
- **Audit immutable**: Toutes les actions critiques sont journalisées
- **Pas de suppression physique**: Soft delete pour la traçabilité

### Protection contre les Attaques

- **CSRF Protection**: Tokens CSRF pour les formulaires
- **XSS Prevention**: Échappement automatique des données
- **SQL Injection**: Utilisation de l'ORM Django (requêtes paramétrées)
- **Rate Limiting**: Limitation du nombre de requêtes (à configurer en production)
- **CORS**: Origines autorisées explicitement configurées

### Headers de Sécurité

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## 🚨 Signalement de Vulnérabilités

Si vous découvrez une vulnérabilité de sécurité, veuillez nous contacter immédiatement:

- **Email**: security@taxfree.cd
- **Ne pas divulguer publiquement** avant correction

## 📋 Checklist de Déploiement Production

### Configuration Django

- [ ] `DEBUG = False`
- [ ] `SECRET_KEY` unique et complexe (min. 50 caractères)
- [ ] `ALLOWED_HOSTS` configuré avec les domaines exacts
- [ ] `SECURE_SSL_REDIRECT = True`
- [ ] `SESSION_COOKIE_SECURE = True`
- [ ] `CSRF_COOKIE_SECURE = True`
- [ ] `SECURE_HSTS_SECONDS = 31536000`

### Base de Données

- [ ] Utilisateur PostgreSQL dédié avec permissions limitées
- [ ] Mot de passe fort pour la base de données
- [ ] Connexions SSL activées
- [ ] Sauvegardes automatiques chiffrées

### Infrastructure

- [ ] Certificat SSL/TLS valide (Let's Encrypt ou commercial)
- [ ] Pare-feu configuré (ports 80, 443 uniquement)
- [ ] Fail2ban ou équivalent pour bloquer les attaques brute-force
- [ ] Logs centralisés et surveillés
- [ ] Mises à jour de sécurité automatiques

### Monitoring

- [ ] Alertes sur les erreurs 500
- [ ] Alertes sur les tentatives de connexion échouées
- [ ] Surveillance des performances
- [ ] Audit régulier des logs

## 🔄 Rotation des Secrets

### Fréquence Recommandée

| Secret | Fréquence |
|--------|-----------|
| SECRET_KEY Django | Annuelle |
| Mots de passe DB | Trimestrielle |
| Tokens API externes | Selon politique du fournisseur |
| Certificats SSL | Avant expiration |

### Procédure de Rotation

1. Générer le nouveau secret
2. Mettre à jour la configuration
3. Redéployer l'application
4. Vérifier le bon fonctionnement
5. Révoquer l'ancien secret si applicable

## 📊 Conformité

### RGPD / Protection des Données

- Consentement explicite pour la collecte de données
- Droit d'accès aux données personnelles
- Droit à l'effacement (anonymisation)
- Registre des traitements maintenu

### Audit Trail

Toutes les actions suivantes sont journalisées:

- Connexions/Déconnexions
- Création/Modification de bordereaux
- Validations douanières
- Remboursements
- Modifications de configuration
- Actions administratives

Format du log:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "actor_id": "uuid",
  "actor_email": "user@example.com",
  "action": "FORM_VALIDATED",
  "entity": "TaxFreeForm",
  "entity_id": "uuid",
  "ip_address": "192.168.1.1",
  "metadata": {}
}
```

## 🛡️ Réponse aux Incidents

### Niveaux de Sévérité

| Niveau | Description | Temps de Réponse |
|--------|-------------|------------------|
| Critique | Brèche de données, système compromis | < 1 heure |
| Élevé | Vulnérabilité exploitable | < 4 heures |
| Moyen | Vulnérabilité potentielle | < 24 heures |
| Faible | Amélioration de sécurité | < 1 semaine |

### Procédure

1. **Détection**: Identifier et confirmer l'incident
2. **Containment**: Isoler les systèmes affectés
3. **Éradication**: Supprimer la menace
4. **Récupération**: Restaurer les services
5. **Post-mortem**: Analyser et documenter
