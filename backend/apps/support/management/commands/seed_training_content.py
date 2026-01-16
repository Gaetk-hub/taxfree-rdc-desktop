"""
Management command to seed training content for all user roles.
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.support.models import TrainingCategory, TrainingContent, TrainingContentType
from apps.accounts.models import UserRole


class Command(BaseCommand):
    help = 'Seed training content for all user roles'

    def handle(self, *args, **options):
        self.stdout.write('Creating training categories and content...')
        
        # Create categories
        categories = self.create_categories()
        
        # Create content for each role
        self.create_admin_content(categories)
        self.create_merchant_content(categories)
        self.create_customs_content(categories)
        
        self.stdout.write(self.style.SUCCESS('Training content seeded successfully!'))

    def create_categories(self):
        """Create training categories."""
        categories_data = [
            {
                'name': 'Prise en main',
                'slug': 'getting-started',
                'description': 'Guides de démarrage rapide pour bien commencer',
                'icon': 'rocket',
                'target_roles': [UserRole.ADMIN, UserRole.MERCHANT, UserRole.CUSTOMS_AGENT, UserRole.OPERATOR, UserRole.AUDITOR],
                'order': 1
            },
            {
                'name': 'Bordereaux Tax Free',
                'slug': 'tax-free-forms',
                'description': 'Tout sur la création et gestion des bordereaux',
                'icon': 'document-text',
                'target_roles': [UserRole.ADMIN, UserRole.MERCHANT, UserRole.CUSTOMS_AGENT],
                'order': 2
            },
            {
                'name': 'Validation Douanière',
                'slug': 'customs-validation',
                'description': 'Procédures de validation et contrôle douanier',
                'icon': 'shield-check',
                'target_roles': [UserRole.ADMIN, UserRole.CUSTOMS_AGENT],
                'order': 3
            },
            {
                'name': 'Remboursements',
                'slug': 'refunds',
                'description': 'Gestion des remboursements et paiements',
                'icon': 'banknotes',
                'target_roles': [UserRole.ADMIN, UserRole.MERCHANT, UserRole.OPERATOR],
                'order': 4
            },
            {
                'name': 'Administration',
                'slug': 'administration',
                'description': 'Configuration et gestion du système',
                'icon': 'cog',
                'target_roles': [UserRole.ADMIN],
                'order': 5
            },
            {
                'name': 'Rapports & Statistiques',
                'slug': 'reports',
                'description': 'Analyse des données et génération de rapports',
                'icon': 'chart-bar',
                'target_roles': [UserRole.ADMIN, UserRole.MERCHANT, UserRole.AUDITOR],
                'order': 6
            },
            {
                'name': 'Sécurité',
                'slug': 'security',
                'description': 'Bonnes pratiques de sécurité et conformité',
                'icon': 'lock-closed',
                'target_roles': [UserRole.ADMIN, UserRole.MERCHANT, UserRole.CUSTOMS_AGENT],
                'order': 7
            },
            {
                'name': 'FAQ',
                'slug': 'faq',
                'description': 'Questions fréquemment posées',
                'icon': 'question-mark-circle',
                'target_roles': [UserRole.ADMIN, UserRole.MERCHANT, UserRole.CUSTOMS_AGENT, UserRole.OPERATOR, UserRole.AUDITOR],
                'order': 8
            },
        ]
        
        categories = {}
        for data in categories_data:
            cat, created = TrainingCategory.objects.update_or_create(
                slug=data['slug'],
                defaults=data
            )
            categories[data['slug']] = cat
            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status} category: {cat.name}')
        
        return categories

    def create_admin_content(self, categories):
        """Create training content for administrators."""
        self.stdout.write('\nCreating admin content...')
        
        contents = [
            # Getting Started
            {
                'category': categories['getting-started'],
                'title': 'Bienvenue sur Tax Free RDC - Guide Administrateur',
                'slug': 'admin-welcome-guide',
                'description': 'Découvrez les fonctionnalités principales du système Tax Free RDC en tant qu\'administrateur.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.ADMIN],
                'is_featured': True,
                'reading_time': 10,
                'body': '''
<h2>Bienvenue sur Tax Free RDC</h2>
<p>En tant qu'administrateur, vous avez accès à l'ensemble des fonctionnalités du système. Ce guide vous présente les principales sections de votre tableau de bord.</p>

<h3>1. Tableau de bord principal</h3>
<p>Votre tableau de bord affiche en temps réel :</p>
<ul>
    <li><strong>Statistiques globales</strong> : nombre de bordereaux, montants remboursés, taux de validation</li>
    <li><strong>Graphiques d'évolution</strong> : tendances sur les 14 derniers jours</li>
    <li><strong>Alertes</strong> : bordereaux en attente, demandes urgentes</li>
</ul>

<h3>2. Gestion des commerçants</h3>
<p>Depuis la section "Commerçants", vous pouvez :</p>
<ul>
    <li>Approuver ou rejeter les demandes d'inscription</li>
    <li>Gérer les points de vente</li>
    <li>Consulter l'historique des transactions</li>
</ul>

<h3>3. Gestion des utilisateurs</h3>
<p>Créez et gérez les comptes utilisateurs :</p>
<ul>
    <li>Agents douaniers</li>
    <li>Opérateurs de remboursement</li>
    <li>Auditeurs</li>
</ul>

<h3>4. Paramètres système</h3>
<p>Configurez les règles métier, les taux de TVA, les seuils de remboursement et les paramètres de sécurité.</p>

<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
    <p class="font-semibold">💡 Conseil</p>
    <p>Commencez par configurer les paramètres système avant d'approuver les premiers commerçants.</p>
</div>
'''
            },
            # Administration
            {
                'category': categories['administration'],
                'title': 'Configuration des paramètres système',
                'slug': 'system-settings-guide',
                'description': 'Apprenez à configurer tous les paramètres du système Tax Free.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.ADMIN],
                'reading_time': 15,
                'related_feature': 'admin.settings',
                'body': '''
<h2>Configuration des paramètres système</h2>

<h3>Paramètres généraux</h3>
<p>Les paramètres généraux définissent le comportement global du système :</p>
<ul>
    <li><strong>Nom du système</strong> : Affiché dans l'interface et les emails</li>
    <li><strong>Email de contact</strong> : Pour les notifications système</li>
    <li><strong>Langue par défaut</strong> : Français ou Anglais</li>
</ul>

<h3>Paramètres Tax Free</h3>
<p>Configurez les règles métier :</p>
<ul>
    <li><strong>Montant minimum d'achat</strong> : Seuil pour éligibilité Tax Free</li>
    <li><strong>Taux de TVA</strong> : Pourcentage applicable</li>
    <li><strong>Délai de validité</strong> : Durée de validité des bordereaux</li>
    <li><strong>Montant maximum de remboursement</strong> : Plafond par transaction</li>
</ul>

<h3>Paramètres de sécurité</h3>
<p>Renforcez la sécurité du système :</p>
<ul>
    <li><strong>Durée de session</strong> : Déconnexion automatique après inactivité</li>
    <li><strong>Tentatives de connexion</strong> : Nombre maximum avant blocage</li>
    <li><strong>Expiration du mot de passe</strong> : Forcer le renouvellement</li>
    <li><strong>Authentification 2FA</strong> : Activer/désactiver</li>
</ul>

<h3>Mode maintenance</h3>
<p>Activez le mode maintenance pour effectuer des opérations de maintenance :</p>
<ul>
    <li>Seuls les administrateurs peuvent accéder au système</li>
    <li>Un message personnalisé est affiché aux utilisateurs</li>
    <li>Les adresses IP whitelistées peuvent toujours accéder</li>
</ul>
'''
            },
            {
                'category': categories['administration'],
                'title': 'Gestion des utilisateurs et des rôles',
                'slug': 'user-management-guide',
                'description': 'Comment créer et gérer les comptes utilisateurs avec leurs permissions.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.ADMIN],
                'reading_time': 12,
                'related_feature': 'admin.users',
                'body': '''
<h2>Gestion des utilisateurs</h2>

<h3>Types de rôles</h3>
<p>Le système dispose de plusieurs rôles avec des permissions spécifiques :</p>

<table class="w-full border-collapse border border-gray-300 my-4">
    <thead>
        <tr class="bg-gray-100">
            <th class="border border-gray-300 p-2">Rôle</th>
            <th class="border border-gray-300 p-2">Description</th>
            <th class="border border-gray-300 p-2">Permissions principales</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="border border-gray-300 p-2"><strong>Admin</strong></td>
            <td class="border border-gray-300 p-2">Administrateur système</td>
            <td class="border border-gray-300 p-2">Accès complet à toutes les fonctionnalités</td>
        </tr>
        <tr>
            <td class="border border-gray-300 p-2"><strong>Commerçant</strong></td>
            <td class="border border-gray-300 p-2">Gestionnaire de boutique</td>
            <td class="border border-gray-300 p-2">Création de bordereaux, gestion des employés</td>
        </tr>
        <tr>
            <td class="border border-gray-300 p-2"><strong>Agent douanier</strong></td>
            <td class="border border-gray-300 p-2">Validation des bordereaux</td>
            <td class="border border-gray-300 p-2">Scan, validation, rejet des bordereaux</td>
        </tr>
        <tr>
            <td class="border border-gray-300 p-2"><strong>Opérateur</strong></td>
            <td class="border border-gray-300 p-2">Traitement des remboursements</td>
            <td class="border border-gray-300 p-2">Validation et exécution des paiements</td>
        </tr>
        <tr>
            <td class="border border-gray-300 p-2"><strong>Auditeur</strong></td>
            <td class="border border-gray-300 p-2">Contrôle et audit</td>
            <td class="border border-gray-300 p-2">Consultation des logs, rapports</td>
        </tr>
    </tbody>
</table>

<h3>Créer un utilisateur</h3>
<ol>
    <li>Allez dans <strong>Administration > Utilisateurs</strong></li>
    <li>Cliquez sur <strong>Nouvel utilisateur</strong></li>
    <li>Remplissez les informations requises</li>
    <li>Sélectionnez le rôle approprié</li>
    <li>Un email d'activation sera envoyé automatiquement</li>
</ol>

<h3>Désactiver un utilisateur</h3>
<p>Pour désactiver un compte sans le supprimer :</p>
<ol>
    <li>Trouvez l'utilisateur dans la liste</li>
    <li>Cliquez sur les trois points (⋮)</li>
    <li>Sélectionnez "Désactiver"</li>
</ol>
'''
            },
            # Security
            {
                'category': categories['security'],
                'title': 'Journal d\'audit et traçabilité',
                'slug': 'audit-log-guide',
                'description': 'Comprendre et utiliser le journal d\'audit pour la traçabilité des actions.',
                'content_type': TrainingContentType.ARTICLE,
                'target_roles': [UserRole.ADMIN, UserRole.AUDITOR],
                'reading_time': 8,
                'related_feature': 'admin.audit',
                'body': '''
<h2>Journal d'audit</h2>

<p>Le journal d'audit enregistre toutes les actions importantes effectuées dans le système pour garantir la traçabilité et la conformité.</p>

<h3>Actions enregistrées</h3>
<ul>
    <li>Connexions et déconnexions</li>
    <li>Création et modification de bordereaux</li>
    <li>Validations et rejets douaniers</li>
    <li>Remboursements effectués</li>
    <li>Modifications de paramètres</li>
    <li>Création et modification d'utilisateurs</li>
</ul>

<h3>Filtrer les logs</h3>
<p>Utilisez les filtres pour trouver rapidement les informations :</p>
<ul>
    <li><strong>Par utilisateur</strong> : Voir les actions d'un utilisateur spécifique</li>
    <li><strong>Par type d'action</strong> : Filtrer par catégorie d'action</li>
    <li><strong>Par date</strong> : Définir une plage de dates</li>
    <li><strong>Par entité</strong> : Bordereau, utilisateur, commerçant, etc.</li>
</ul>

<h3>Exporter les logs</h3>
<p>Vous pouvez exporter les logs au format CSV ou PDF pour archivage ou analyse externe.</p>
'''
            },
            # Reports
            {
                'category': categories['reports'],
                'title': 'Génération et analyse des rapports',
                'slug': 'reports-guide-admin',
                'description': 'Comment générer et interpréter les rapports du système.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.ADMIN, UserRole.AUDITOR],
                'reading_time': 10,
                'related_feature': 'admin.reports',
                'body': '''
<h2>Rapports et statistiques</h2>

<h3>Types de rapports disponibles</h3>

<h4>1. Rapport de synthèse</h4>
<p>Vue d'ensemble des activités sur une période donnée :</p>
<ul>
    <li>Nombre total de bordereaux</li>
    <li>Montants remboursés</li>
    <li>Taux de validation</li>
    <li>Répartition par statut</li>
</ul>

<h4>2. Rapport par commerçant</h4>
<p>Performance détaillée de chaque commerçant :</p>
<ul>
    <li>Volume de transactions</li>
    <li>Montant moyen des bordereaux</li>
    <li>Taux de rejet</li>
</ul>

<h4>3. Rapport douanier</h4>
<p>Statistiques de validation par poste frontière :</p>
<ul>
    <li>Nombre de validations par agent</li>
    <li>Temps moyen de traitement</li>
    <li>Motifs de rejet</li>
</ul>

<h3>Exporter les rapports</h3>
<p>Tous les rapports peuvent être exportés en :</p>
<ul>
    <li><strong>PDF</strong> : Pour impression et archivage</li>
    <li><strong>Excel</strong> : Pour analyse approfondie</li>
    <li><strong>CSV</strong> : Pour intégration avec d'autres systèmes</li>
</ul>
'''
            },
        ]
        
        self._create_contents(contents)

    def create_merchant_content(self, categories):
        """Create training content for merchants."""
        self.stdout.write('\nCreating merchant content...')
        
        contents = [
            # Getting Started
            {
                'category': categories['getting-started'],
                'title': 'Guide de démarrage pour commerçants',
                'slug': 'merchant-getting-started',
                'description': 'Tout ce que vous devez savoir pour commencer à utiliser Tax Free RDC.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.MERCHANT],
                'is_featured': True,
                'reading_time': 8,
                'body': '''
<h2>Bienvenue sur Tax Free RDC</h2>

<p>Ce guide vous accompagne dans vos premiers pas sur la plateforme Tax Free RDC.</p>

<h3>Étape 1 : Compléter votre profil</h3>
<p>Assurez-vous que toutes les informations de votre entreprise sont à jour :</p>
<ul>
    <li>Raison sociale et RCCM</li>
    <li>Adresse et coordonnées</li>
    <li>Informations bancaires pour les remboursements</li>
</ul>

<h3>Étape 2 : Configurer vos points de vente</h3>
<p>Ajoutez tous vos points de vente depuis <strong>Administration > Points de vente</strong>.</p>

<h3>Étape 3 : Inviter vos employés</h3>
<p>Créez des comptes pour vos employés qui créeront les bordereaux.</p>

<h3>Étape 4 : Créer votre premier bordereau</h3>
<p>Vous êtes prêt ! Créez votre premier bordereau Tax Free.</p>

<div class="bg-green-50 border-l-4 border-green-500 p-4 my-4">
    <p class="font-semibold">✅ Conseil</p>
    <p>Consultez la section "Bordereaux Tax Free" pour un guide détaillé sur la création de bordereaux.</p>
</div>
'''
            },
            # Tax Free Forms
            {
                'category': categories['tax-free-forms'],
                'title': 'Créer un bordereau Tax Free',
                'slug': 'create-tax-free-form',
                'description': 'Guide pas-à-pas pour créer un bordereau Tax Free correctement.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.MERCHANT],
                'is_featured': True,
                'reading_time': 10,
                'related_feature': 'merchant.forms.create',
                'body': '''
<h2>Créer un bordereau Tax Free</h2>

<h3>Conditions d'éligibilité</h3>
<p>Avant de créer un bordereau, vérifiez que :</p>
<ul>
    <li>Le client est un voyageur non-résident</li>
    <li>Le montant d'achat atteint le seuil minimum</li>
    <li>Les articles sont éligibles au Tax Free</li>
</ul>

<h3>Étapes de création</h3>

<h4>1. Informations du voyageur</h4>
<p>Collectez les informations du passeport :</p>
<ul>
    <li>Nom et prénom</li>
    <li>Numéro de passeport</li>
    <li>Nationalité</li>
    <li>Date de naissance</li>
</ul>

<h4>2. Articles achetés</h4>
<p>Pour chaque article, indiquez :</p>
<ul>
    <li>Description de l'article</li>
    <li>Catégorie</li>
    <li>Quantité</li>
    <li>Prix unitaire TTC</li>
</ul>

<h4>3. Vérification et validation</h4>
<p>Vérifiez le récapitulatif :</p>
<ul>
    <li>Total des achats</li>
    <li>Montant de TVA</li>
    <li>Montant du remboursement</li>
</ul>

<h4>4. Signature et impression</h4>
<p>Faites signer le bordereau par le client et imprimez-le.</p>

<div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
    <p class="font-semibold">⚠️ Important</p>
    <p>Le voyageur doit présenter ce bordereau à la douane avant son départ pour validation.</p>
</div>
'''
            },
            {
                'category': categories['tax-free-forms'],
                'title': 'Suivi de vos bordereaux',
                'slug': 'track-forms',
                'description': 'Comment suivre le statut de vos bordereaux Tax Free.',
                'content_type': TrainingContentType.ARTICLE,
                'target_roles': [UserRole.MERCHANT],
                'reading_time': 5,
                'related_feature': 'merchant.forms.list',
                'body': '''
<h2>Suivi des bordereaux</h2>

<h3>Les différents statuts</h3>

<table class="w-full border-collapse border border-gray-300 my-4">
    <thead>
        <tr class="bg-gray-100">
            <th class="border border-gray-300 p-2">Statut</th>
            <th class="border border-gray-300 p-2">Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="border border-gray-300 p-2"><span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">En attente</span></td>
            <td class="border border-gray-300 p-2">Le bordereau attend la validation douanière</td>
        </tr>
        <tr>
            <td class="border border-gray-300 p-2"><span class="px-2 py-1 bg-green-100 text-green-800 rounded">Validé</span></td>
            <td class="border border-gray-300 p-2">Validé par la douane, en attente de remboursement</td>
        </tr>
        <tr>
            <td class="border border-gray-300 p-2"><span class="px-2 py-1 bg-blue-100 text-blue-800 rounded">Remboursé</span></td>
            <td class="border border-gray-300 p-2">Le remboursement a été effectué</td>
        </tr>
        <tr>
            <td class="border border-gray-300 p-2"><span class="px-2 py-1 bg-red-100 text-red-800 rounded">Rejeté</span></td>
            <td class="border border-gray-300 p-2">Rejeté par la douane (voir motif)</td>
        </tr>
        <tr>
            <td class="border border-gray-300 p-2"><span class="px-2 py-1 bg-gray-100 text-gray-800 rounded">Expiré</span></td>
            <td class="border border-gray-300 p-2">Non présenté à la douane dans les délais</td>
        </tr>
    </tbody>
</table>

<h3>Filtrer vos bordereaux</h3>
<p>Utilisez les filtres pour retrouver rapidement un bordereau :</p>
<ul>
    <li>Par numéro de référence</li>
    <li>Par nom du voyageur</li>
    <li>Par statut</li>
    <li>Par date</li>
</ul>
'''
            },
            # Refunds
            {
                'category': categories['refunds'],
                'title': 'Comprendre le processus de remboursement',
                'slug': 'refund-process-merchant',
                'description': 'Comment fonctionne le remboursement Tax Free pour les commerçants.',
                'content_type': TrainingContentType.ARTICLE,
                'target_roles': [UserRole.MERCHANT],
                'reading_time': 6,
                'body': '''
<h2>Processus de remboursement</h2>

<h3>Flux de remboursement</h3>
<ol>
    <li><strong>Création du bordereau</strong> : Vous créez le bordereau lors de l'achat</li>
    <li><strong>Validation douanière</strong> : Le voyageur présente le bordereau à la douane</li>
    <li><strong>Traitement</strong> : L'opérateur traite la demande de remboursement</li>
    <li><strong>Paiement</strong> : Le remboursement est effectué au voyageur</li>
</ol>

<h3>Délais de traitement</h3>
<p>Les délais moyens sont :</p>
<ul>
    <li>Validation douanière : immédiate</li>
    <li>Traitement du remboursement : 24-48h</li>
    <li>Virement bancaire : 3-5 jours ouvrés</li>
</ul>

<h3>Suivi des remboursements</h3>
<p>Consultez la section "Remboursements" pour voir l'état de tous les remboursements liés à vos bordereaux.</p>
'''
            },
            # Reports
            {
                'category': categories['reports'],
                'title': 'Consulter vos statistiques',
                'slug': 'merchant-statistics',
                'description': 'Analysez vos performances avec les rapports et statistiques.',
                'content_type': TrainingContentType.ARTICLE,
                'target_roles': [UserRole.MERCHANT],
                'reading_time': 5,
                'related_feature': 'merchant.reports',
                'body': '''
<h2>Vos statistiques</h2>

<h3>Tableau de bord</h3>
<p>Votre tableau de bord affiche :</p>
<ul>
    <li>Nombre de bordereaux créés</li>
    <li>Montant total des ventes Tax Free</li>
    <li>Taux de validation</li>
    <li>Évolution sur les derniers jours</li>
</ul>

<h3>Rapports détaillés</h3>
<p>Accédez à des rapports plus détaillés :</p>
<ul>
    <li><strong>Par période</strong> : Jour, semaine, mois, année</li>
    <li><strong>Par point de vente</strong> : Performance de chaque boutique</li>
    <li><strong>Par employé</strong> : Activité de chaque vendeur</li>
</ul>

<h3>Export</h3>
<p>Exportez vos données en Excel ou PDF pour votre comptabilité.</p>
'''
            },
            # FAQ
            {
                'category': categories['faq'],
                'title': 'FAQ Commerçants',
                'slug': 'merchant-faq',
                'description': 'Réponses aux questions fréquentes des commerçants.',
                'content_type': TrainingContentType.FAQ,
                'target_roles': [UserRole.MERCHANT],
                'reading_time': 8,
                'body': '''
<h2>Questions fréquentes</h2>

<div class="space-y-4">
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Quel est le montant minimum pour un bordereau Tax Free ?</h4>
        <p class="mt-2 text-gray-600">Le montant minimum est défini dans les paramètres système. Consultez votre tableau de bord pour voir le seuil actuel.</p>
    </div>
    
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Combien de temps un bordereau est-il valide ?</h4>
        <p class="mt-2 text-gray-600">Un bordereau est généralement valide 90 jours à partir de sa date de création. Passé ce délai, il expire automatiquement.</p>
    </div>
    
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Que faire si un bordereau est rejeté ?</h4>
        <p class="mt-2 text-gray-600">Consultez le motif de rejet dans les détails du bordereau. Si vous pensez qu'il s'agit d'une erreur, contactez le support.</p>
    </div>
    
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Comment ajouter un employé ?</h4>
        <p class="mt-2 text-gray-600">Allez dans Administration > Utilisateurs, puis cliquez sur "Inviter un employé". Un email d'activation sera envoyé.</p>
    </div>
    
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Comment modifier un bordereau après création ?</h4>
        <p class="mt-2 text-gray-600">Un bordereau ne peut être modifié que s'il n'a pas encore été validé par la douane. Cliquez sur "Modifier" dans les détails du bordereau.</p>
    </div>
</div>
'''
            },
        ]
        
        self._create_contents(contents)

    def create_customs_content(self, categories):
        """Create training content for customs agents."""
        self.stdout.write('\nCreating customs agent content...')
        
        contents = [
            # Getting Started
            {
                'category': categories['getting-started'],
                'title': 'Guide de démarrage pour agents douaniers',
                'slug': 'customs-getting-started',
                'description': 'Apprenez à utiliser le système Tax Free RDC pour la validation des bordereaux.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.CUSTOMS_AGENT],
                'is_featured': True,
                'reading_time': 8,
                'body': '''
<h2>Bienvenue - Agent Douanier</h2>

<p>En tant qu'agent douanier, votre rôle est de valider les bordereaux Tax Free présentés par les voyageurs avant leur départ.</p>

<h3>Vos responsabilités</h3>
<ul>
    <li>Vérifier l'identité du voyageur</li>
    <li>Contrôler les articles déclarés</li>
    <li>Valider ou rejeter les bordereaux</li>
    <li>Documenter les contrôles effectués</li>
</ul>

<h3>Accès au système</h3>
<p>Votre tableau de bord vous donne accès à :</p>
<ul>
    <li><strong>Scanner</strong> : Pour scanner les QR codes des bordereaux</li>
    <li><strong>Liste des bordereaux</strong> : Tous les bordereaux à traiter</li>
    <li><strong>Historique</strong> : Vos validations précédentes</li>
</ul>

<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
    <p class="font-semibold">💡 Mode hors ligne</p>
    <p>Le système fonctionne même sans connexion internet. Les validations seront synchronisées automatiquement.</p>
</div>
'''
            },
            # Customs Validation
            {
                'category': categories['customs-validation'],
                'title': 'Procédure de validation d\'un bordereau',
                'slug': 'validation-procedure',
                'description': 'Guide complet de la procédure de validation douanière.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.CUSTOMS_AGENT],
                'is_featured': True,
                'reading_time': 12,
                'related_feature': 'customs.validate',
                'body': '''
<h2>Procédure de validation</h2>

<h3>Étape 1 : Identification du voyageur</h3>
<p>Demandez au voyageur :</p>
<ul>
    <li>Son passeport</li>
    <li>Son bordereau Tax Free (papier ou numérique)</li>
    <li>Sa carte d'embarquement</li>
</ul>

<h3>Étape 2 : Scanner le bordereau</h3>
<p>Utilisez le scanner pour lire le QR code du bordereau. Les informations s'affichent automatiquement :</p>
<ul>
    <li>Identité du voyageur</li>
    <li>Liste des articles</li>
    <li>Montant du remboursement</li>
</ul>

<h3>Étape 3 : Vérification des articles</h3>
<p>Contrôlez que les articles correspondent à ceux déclarés :</p>
<ul>
    <li>Vérifiez la description</li>
    <li>Vérifiez la quantité</li>
    <li>Vérifiez que les articles sont neufs et non utilisés</li>
</ul>

<h3>Étape 4 : Décision</h3>

<h4>✅ Validation</h4>
<p>Si tout est conforme, cliquez sur "Valider". Le bordereau passe en statut "Validé".</p>

<h4>❌ Rejet</h4>
<p>En cas de non-conformité, cliquez sur "Rejeter" et sélectionnez le motif :</p>
<ul>
    <li>Articles non présentés</li>
    <li>Articles non conformes</li>
    <li>Documents invalides</li>
    <li>Bordereau expiré</li>
    <li>Fraude suspectée</li>
</ul>

<div class="bg-red-50 border-l-4 border-red-500 p-4 my-4">
    <p class="font-semibold">⚠️ Attention</p>
    <p>En cas de suspicion de fraude, signalez immédiatement à votre superviseur et documentez le cas.</p>
</div>
'''
            },
            {
                'category': categories['customs-validation'],
                'title': 'Utiliser le scanner QR Code',
                'slug': 'qr-scanner-guide',
                'description': 'Comment utiliser efficacement le scanner de QR code.',
                'content_type': TrainingContentType.GUIDE,
                'target_roles': [UserRole.CUSTOMS_AGENT],
                'reading_time': 5,
                'related_feature': 'customs.scan',
                'body': '''
<h2>Scanner les bordereaux</h2>

<h3>Accéder au scanner</h3>
<p>Cliquez sur "Scanner" dans le menu ou utilisez le raccourci clavier <kbd>Ctrl</kbd> + <kbd>S</kbd>.</p>

<h3>Scanner un QR code</h3>
<ol>
    <li>Autorisez l'accès à la caméra si demandé</li>
    <li>Positionnez le QR code dans le cadre</li>
    <li>Le scan est automatique</li>
    <li>Les informations du bordereau s'affichent</li>
</ol>

<h3>Recherche manuelle</h3>
<p>Si le QR code est illisible, vous pouvez rechercher le bordereau par :</p>
<ul>
    <li>Numéro de référence</li>
    <li>Numéro de passeport</li>
</ul>

<h3>Problèmes courants</h3>
<ul>
    <li><strong>QR code flou</strong> : Demandez une meilleure impression ou utilisez la recherche manuelle</li>
    <li><strong>Bordereau non trouvé</strong> : Vérifiez que le bordereau existe dans le système</li>
    <li><strong>Bordereau déjà validé</strong> : Le bordereau a déjà été traité</li>
</ul>
'''
            },
            {
                'category': categories['customs-validation'],
                'title': 'Mode hors ligne',
                'slug': 'offline-mode',
                'description': 'Comment travailler sans connexion internet.',
                'content_type': TrainingContentType.ARTICLE,
                'target_roles': [UserRole.CUSTOMS_AGENT],
                'reading_time': 4,
                'related_feature': 'customs.offline',
                'body': '''
<h2>Mode hors ligne</h2>

<p>Le système Tax Free RDC fonctionne même sans connexion internet grâce au mode hors ligne.</p>

<h3>Activation automatique</h3>
<p>Le mode hors ligne s'active automatiquement lorsque la connexion est perdue. Un indicateur orange apparaît dans la barre de navigation.</p>

<h3>Fonctionnalités disponibles</h3>
<ul>
    <li>✅ Scanner les bordereaux</li>
    <li>✅ Valider les bordereaux</li>
    <li>✅ Rejeter les bordereaux</li>
    <li>✅ Consulter l'historique local</li>
</ul>

<h3>Synchronisation</h3>
<p>Lorsque la connexion est rétablie :</p>
<ol>
    <li>Les validations sont envoyées au serveur</li>
    <li>Les nouvelles données sont téléchargées</li>
    <li>L'indicateur redevient vert</li>
</ol>

<div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
    <p class="font-semibold">⚠️ Important</p>
    <p>Synchronisez régulièrement pour éviter les conflits et garder vos données à jour.</p>
</div>
'''
            },
            # Security
            {
                'category': categories['security'],
                'title': 'Détection des fraudes',
                'slug': 'fraud-detection',
                'description': 'Comment identifier et signaler les tentatives de fraude.',
                'content_type': TrainingContentType.ARTICLE,
                'target_roles': [UserRole.CUSTOMS_AGENT],
                'reading_time': 10,
                'body': '''
<h2>Détection des fraudes</h2>

<h3>Signaux d'alerte</h3>
<p>Soyez vigilant face à ces indicateurs :</p>

<h4>Documents suspects</h4>
<ul>
    <li>Bordereau mal imprimé ou modifié</li>
    <li>QR code illisible ou altéré</li>
    <li>Incohérences dans les informations</li>
</ul>

<h4>Comportement suspect</h4>
<ul>
    <li>Voyageur nerveux ou évasif</li>
    <li>Refus de présenter les articles</li>
    <li>Multiples bordereaux pour le même voyageur</li>
</ul>

<h4>Articles suspects</h4>
<ul>
    <li>Articles visiblement utilisés</li>
    <li>Quantités anormalement élevées</li>
    <li>Articles ne correspondant pas à la description</li>
</ul>

<h3>Procédure en cas de fraude</h3>
<ol>
    <li>Ne validez pas le bordereau</li>
    <li>Sélectionnez "Fraude suspectée" comme motif de rejet</li>
    <li>Documentez les observations</li>
    <li>Informez votre superviseur</li>
    <li>Conservez les preuves si possible</li>
</ol>
'''
            },
            # FAQ
            {
                'category': categories['faq'],
                'title': 'FAQ Agents Douaniers',
                'slug': 'customs-faq',
                'description': 'Réponses aux questions fréquentes des agents douaniers.',
                'content_type': TrainingContentType.FAQ,
                'target_roles': [UserRole.CUSTOMS_AGENT],
                'reading_time': 6,
                'body': '''
<h2>Questions fréquentes</h2>

<div class="space-y-4">
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Que faire si le voyageur n'a pas tous les articles ?</h4>
        <p class="mt-2 text-gray-600">Vous pouvez valider partiellement le bordereau en indiquant les articles manquants, ou rejeter si les articles principaux ne sont pas présentés.</p>
    </div>
    
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Le bordereau est expiré, que faire ?</h4>
        <p class="mt-2 text-gray-600">Un bordereau expiré ne peut pas être validé. Informez le voyageur qu'il ne peut plus bénéficier du remboursement.</p>
    </div>
    
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Comment annuler une validation par erreur ?</h4>
        <p class="mt-2 text-gray-600">Contactez votre superviseur. Seul un administrateur peut annuler une validation confirmée.</p>
    </div>
    
    <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900">Le système ne fonctionne pas, que faire ?</h4>
        <p class="mt-2 text-gray-600">Vérifiez votre connexion internet. Si le problème persiste, passez en mode hors ligne et contactez le support technique.</p>
    </div>
</div>
'''
            },
        ]
        
        self._create_contents(contents)

    def _create_contents(self, contents):
        """Helper to create content items."""
        for data in contents:
            content, created = TrainingContent.objects.update_or_create(
                slug=data['slug'],
                defaults={
                    **data,
                    'is_published': True,
                }
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status}: {content.title}')
