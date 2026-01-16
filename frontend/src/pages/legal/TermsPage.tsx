import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeftIcon className="w-4 h-4" />
            Retour
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Conditions Générales d'Utilisation</h1>
              <p className="text-gray-500">Dernière mise à jour : Janvier 2026</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 prose prose-gray max-w-none">
          
          <h2>Article 1 - Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités 
            et conditions d'utilisation de la plateforme Tax Free RDC (ci-après « la Plateforme »), ainsi que les droits 
            et obligations des utilisateurs.
          </p>
          <p>
            La Plateforme est un service de gestion de la détaxe (Tax Free) permettant aux voyageurs non-résidents de 
            bénéficier du remboursement de la Taxe sur la Valeur Ajoutée (TVA) sur leurs achats effectués en République 
            Démocratique du Congo, conformément aux dispositions du <strong>Code Général des Impôts</strong> et aux 
            réglementations de la Direction Générale des Impôts (DGI) et de la Direction Générale des Douanes et Accises (DGDA).
          </p>

          <h2>Article 2 - Cadre juridique</h2>
          <p>Les présentes CGU sont régies par le droit de la République Démocratique du Congo, notamment :</p>
          <ul>
            <li>La Constitution de la République Démocratique du Congo</li>
            <li>Le Code Général des Impôts et ses textes d'application</li>
            <li>Le Code des Douanes et Accises</li>
            <li>La Loi n° 020/2017 du 29 septembre 2017 relative aux communications électroniques</li>
            <li>L'Ordonnance-loi n° 23/010 du 13 mars 2023 portant Code du numérique</li>
            <li>Les réglementations de la DGI et de la DGDA relatives au Tax Free</li>
          </ul>

          <h2>Article 3 - Définitions</h2>
          <p>Dans les présentes CGU, les termes suivants ont la signification suivante :</p>
          <ul>
            <li><strong>« Utilisateur »</strong> : Toute personne physique ou morale utilisant la Plateforme</li>
            <li><strong>« Voyageur »</strong> : Personne physique non-résidente de la RDC éligible au remboursement de TVA</li>
            <li><strong>« Commerçant »</strong> : Entreprise agréée pour émettre des bordereaux Tax Free</li>
            <li><strong>« Bordereau Tax Free »</strong> : Document électronique attestant d'un achat éligible au remboursement</li>
            <li><strong>« Agent douanier »</strong> : Agent de la DGDA habilité à valider les bordereaux Tax Free</li>
            <li><strong>« TVA »</strong> : Taxe sur la Valeur Ajoutée applicable en RDC</li>
          </ul>

          <h2>Article 4 - Acceptation des CGU</h2>
          <p>
            L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. 
            En créant un compte ou en utilisant nos services, vous reconnaissez avoir lu, compris et accepté 
            l'ensemble des dispositions des présentes CGU.
          </p>
          <p>
            Tax Free RDC se réserve le droit de modifier les présentes CGU à tout moment. Les modifications 
            entrent en vigueur dès leur publication sur la Plateforme. Il appartient à l'Utilisateur de consulter 
            régulièrement les CGU.
          </p>

          <h2>Article 5 - Conditions d'éligibilité au Tax Free</h2>
          <h3>5.1 Pour les voyageurs</h3>
          <p>Pour bénéficier du remboursement de TVA, le voyageur doit :</p>
          <ul>
            <li>Être non-résident de la République Démocratique du Congo</li>
            <li>Présenter un passeport valide et un justificatif de résidence à l'étranger</li>
            <li>Effectuer des achats d'un montant minimum fixé par la réglementation</li>
            <li>Exporter les biens achetés dans un délai de 90 jours</li>
            <li>Faire valider le bordereau Tax Free par un agent de la DGDA au point de sortie</li>
          </ul>

          <h3>5.2 Pour les commerçants</h3>
          <p>Pour être agréé Tax Free, le commerçant doit :</p>
          <ul>
            <li>Être légalement enregistré en RDC et disposer d'un NIF valide</li>
            <li>Être en règle avec ses obligations fiscales</li>
            <li>Soumettre une demande d'agrément complète</li>
            <li>Obtenir l'approbation de Tax Free RDC et de la DGI</li>
            <li>Respecter les procédures d'émission des bordereaux</li>
          </ul>

          <h2>Article 6 - Inscription et compte utilisateur</h2>
          <p>
            L'accès à certaines fonctionnalités de la Plateforme nécessite la création d'un compte utilisateur. 
            L'Utilisateur s'engage à :
          </p>
          <ul>
            <li>Fournir des informations exactes, complètes et à jour</li>
            <li>Maintenir la confidentialité de ses identifiants de connexion</li>
            <li>Notifier immédiatement Tax Free RDC de toute utilisation non autorisée de son compte</li>
            <li>Ne pas créer de compte au nom d'une autre personne sans autorisation</li>
          </ul>
          <p>
            Tax Free RDC se réserve le droit de suspendre ou de supprimer tout compte en cas de violation 
            des présentes CGU ou de la réglementation applicable.
          </p>

          <h2>Article 7 - Obligations des utilisateurs</h2>
          <h3>7.1 Obligations générales</h3>
          <p>L'Utilisateur s'engage à :</p>
          <ul>
            <li>Utiliser la Plateforme conformément à sa destination et aux présentes CGU</li>
            <li>Ne pas tenter de contourner les mesures de sécurité de la Plateforme</li>
            <li>Ne pas utiliser la Plateforme à des fins frauduleuses ou illicites</li>
            <li>Respecter les droits de propriété intellectuelle de Tax Free RDC</li>
          </ul>

          <h3>7.2 Obligations spécifiques des voyageurs</h3>
          <ul>
            <li>Présenter des documents d'identité authentiques</li>
            <li>Déclarer véridiquement son statut de non-résident</li>
            <li>Exporter effectivement les biens achetés hors de la RDC</li>
            <li>Ne pas revendre les biens en RDC après avoir obtenu le remboursement</li>
          </ul>

          <h3>7.3 Obligations spécifiques des commerçants</h3>
          <ul>
            <li>Vérifier l'éligibilité des voyageurs avant d'émettre un bordereau</li>
            <li>Émettre des bordereaux conformes et exacts</li>
            <li>Conserver les justificatifs pendant la durée légale (10 ans)</li>
            <li>Déclarer les opérations Tax Free dans les déclarations fiscales</li>
            <li>Collaborer avec les autorités en cas de contrôle</li>
          </ul>

          <h2>Article 8 - Processus de remboursement</h2>
          <p>Le remboursement de la TVA s'effectue selon le processus suivant :</p>
          <ol>
            <li>Émission du bordereau Tax Free par le commerçant agréé</li>
            <li>Validation du bordereau par un agent de la DGDA au point de sortie</li>
            <li>Traitement de la demande de remboursement par Tax Free RDC</li>
            <li>Versement du remboursement selon le mode choisi par le voyageur</li>
          </ol>
          <p>
            Le remboursement est soumis à la validation effective du bordereau par la DGDA. 
            Tax Free RDC ne peut être tenu responsable des refus de validation par les autorités douanières.
          </p>

          <h2>Article 9 - Frais et commissions</h2>
          <p>
            Des frais de service peuvent s'appliquer aux opérations Tax Free. Ces frais sont clairement 
            indiqués avant la finalisation de chaque transaction et comprennent :
          </p>
          <ul>
            <li>Frais de traitement du bordereau</li>
            <li>Frais selon le mode de remboursement choisi</li>
            <li>Le cas échéant, frais de change pour les remboursements en devises étrangères</li>
          </ul>
          <p>
            Les taux de TVA applicables et les montants de remboursement sont déterminés conformément 
            à la législation fiscale congolaise en vigueur.
          </p>

          <h2>Article 10 - Responsabilité</h2>
          <h3>10.1 Responsabilité de Tax Free RDC</h3>
          <p>
            Tax Free RDC s'engage à mettre en œuvre tous les moyens nécessaires pour assurer le bon 
            fonctionnement de la Plateforme. Toutefois, Tax Free RDC ne peut être tenu responsable :
          </p>
          <ul>
            <li>Des interruptions de service dues à des maintenances ou à des causes extérieures</li>
            <li>Des décisions des autorités fiscales ou douanières</li>
            <li>Des informations erronées fournies par les utilisateurs</li>
            <li>Des fraudes commises par des tiers</li>
          </ul>

          <h3>10.2 Responsabilité des utilisateurs</h3>
          <p>
            L'Utilisateur est seul responsable de l'utilisation qu'il fait de la Plateforme et des 
            informations qu'il fournit. Toute fraude ou tentative de fraude expose l'Utilisateur à 
            des poursuites pénales conformément au Code Pénal congolais et au Code Général des Impôts.
          </p>

          <h2>Article 11 - Sanctions en cas de fraude</h2>
          <p>
            Conformément à la législation congolaise, toute fraude au système Tax Free est passible de :
          </p>
          <ul>
            <li>Annulation des remboursements obtenus frauduleusement</li>
            <li>Remboursement des sommes indûment perçues, majorées des pénalités légales</li>
            <li>Exclusion définitive du système Tax Free</li>
            <li>Poursuites pénales pour fraude fiscale (Article 101 et suivants du Code Général des Impôts)</li>
            <li>Pour les commerçants : retrait de l'agrément et sanctions fiscales</li>
          </ul>

          <h2>Article 12 - Propriété intellectuelle</h2>
          <p>
            La Plateforme, son contenu, sa structure et tous les éléments qui la composent (textes, images, 
            logos, logiciels, bases de données) sont la propriété exclusive de Tax Free RDC ou de ses partenaires 
            et sont protégés par les lois congolaises et internationales relatives à la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification ou exploitation non autorisée est interdite et 
            constitue une contrefaçon sanctionnée par la loi.
          </p>

          <h2>Article 13 - Protection des données personnelles</h2>
          <p>
            Le traitement des données personnelles des utilisateurs est effectué conformément à notre 
            <Link to="/privacy" className="text-primary-600 hover:underline"> Politique de Confidentialité</Link>, 
            qui fait partie intégrante des présentes CGU.
          </p>

          <h2>Article 14 - Résiliation</h2>
          <p>
            L'Utilisateur peut résilier son compte à tout moment en contactant le service client. 
            Tax Free RDC peut résilier ou suspendre un compte en cas de :
          </p>
          <ul>
            <li>Violation des présentes CGU</li>
            <li>Fraude avérée ou suspectée</li>
            <li>Non-respect de la réglementation applicable</li>
            <li>Inactivité prolongée du compte</li>
          </ul>

          <h2>Article 15 - Droit applicable et juridiction</h2>
          <p>
            Les présentes CGU sont régies par le droit de la République Démocratique du Congo. 
            En cas de litige relatif à l'interprétation ou à l'exécution des présentes CGU, les parties 
            s'efforceront de trouver une solution amiable.
          </p>
          <p>
            À défaut d'accord amiable, tout litige sera soumis à la compétence exclusive des tribunaux 
            de Kinshasa, République Démocratique du Congo.
          </p>

          <h2>Article 16 - Dispositions diverses</h2>
          <p>
            Si une disposition des présentes CGU est déclarée nulle ou inapplicable, les autres dispositions 
            resteront en vigueur. Le fait pour Tax Free RDC de ne pas exercer un droit prévu aux présentes 
            CGU ne constitue pas une renonciation à ce droit.
          </p>

          <h2>Article 17 - Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU, vous pouvez nous contacter :
          </p>
          <p>
            <strong>Tax Free RDC</strong><br/>
            Adresse : Kinshasa, République Démocratique du Congo<br/>
            Email : legal@taxfree.cd<br/>
            Téléphone : +243 XXX XXX XXX
          </p>

        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>© {new Date().getFullYear()} Tax Free RDC - Tous droits réservés</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link to="/help" className="hover:text-primary-600">Aide</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-primary-600">Confidentialité</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-primary-600">Conditions</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
