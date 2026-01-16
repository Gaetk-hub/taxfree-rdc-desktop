import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export default function PrivacyPage() {
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
              <ShieldCheckIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Politique de Confidentialité</h1>
              <p className="text-gray-500">Dernière mise à jour : Janvier 2026</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 prose prose-gray max-w-none">
          
          <h2>1. Introduction</h2>
          <p>
            La présente Politique de Confidentialité décrit la manière dont Tax Free RDC (ci-après « nous », « notre » ou « la Plateforme ») 
            collecte, utilise, stocke et protège vos données personnelles dans le cadre de l'utilisation de notre système de détaxe.
          </p>
          <p>
            Cette politique est établie conformément à la <strong>Constitution de la République Démocratique du Congo</strong> (Article 31 sur 
            le droit à la vie privée), à la <strong>Loi n° 020/2017 du 29 septembre 2017</strong> relative aux communications électroniques, 
            et aux principes généraux de protection des données personnelles reconnus internationalement.
          </p>

          <h2>2. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles est Tax Free RDC, opérant sous l'autorité de la Direction Générale 
            des Impôts (DGI) et de la Direction Générale des Douanes et Accises (DGDA) de la République Démocratique du Congo.
          </p>
          <p>
            <strong>Adresse :</strong> Kinshasa, République Démocratique du Congo<br/>
            <strong>Email :</strong> privacy@taxfree.cd<br/>
            <strong>Téléphone :</strong> +243 XXX XXX XXX
          </p>

          <h2>3. Données collectées</h2>
          <p>Dans le cadre de nos services, nous collectons les catégories de données suivantes :</p>
          
          <h3>3.1 Données d'identification</h3>
          <ul>
            <li>Nom et prénom</li>
            <li>Numéro de passeport et nationalité</li>
            <li>Adresse de résidence à l'étranger</li>
            <li>Date de naissance</li>
            <li>Coordonnées (email, téléphone)</li>
          </ul>

          <h3>3.2 Données de transaction</h3>
          <ul>
            <li>Détails des achats (produits, montants, dates)</li>
            <li>Informations sur les commerçants</li>
            <li>Numéros de bordereaux Tax Free</li>
            <li>Historique des remboursements</li>
          </ul>

          <h3>3.3 Données de voyage</h3>
          <ul>
            <li>Dates d'entrée et de sortie du territoire</li>
            <li>Points de sortie (aéroports, postes frontières)</li>
            <li>Informations de validation douanière</li>
          </ul>

          <h3>3.4 Données techniques</h3>
          <ul>
            <li>Adresse IP</li>
            <li>Type de navigateur et appareil</li>
            <li>Journaux de connexion</li>
          </ul>

          <h2>4. Finalités du traitement</h2>
          <p>Vos données personnelles sont traitées pour les finalités suivantes :</p>
          <ul>
            <li><strong>Exécution du service Tax Free :</strong> Traitement des demandes de remboursement de TVA</li>
            <li><strong>Vérification d'éligibilité :</strong> Contrôle du statut de non-résident et de l'éligibilité aux remboursements</li>
            <li><strong>Obligations légales :</strong> Conformité avec les exigences fiscales et douanières de la RDC</li>
            <li><strong>Prévention de la fraude :</strong> Détection et prévention des activités frauduleuses</li>
            <li><strong>Amélioration des services :</strong> Analyse statistique anonymisée pour améliorer nos services</li>
            <li><strong>Communication :</strong> Envoi d'informations relatives à vos transactions et à nos services</li>
          </ul>

          <h2>5. Base légale du traitement</h2>
          <p>Le traitement de vos données repose sur les bases légales suivantes :</p>
          <ul>
            <li><strong>Exécution d'un contrat :</strong> Le traitement est nécessaire à l'exécution du service de remboursement de TVA</li>
            <li><strong>Obligation légale :</strong> Conformité avec le Code Général des Impôts et les réglementations douanières</li>
            <li><strong>Intérêt légitime :</strong> Prévention de la fraude et sécurité du système</li>
            <li><strong>Consentement :</strong> Pour certaines communications marketing (le cas échéant)</li>
          </ul>

          <h2>6. Destinataires des données</h2>
          <p>Vos données peuvent être communiquées aux destinataires suivants :</p>
          <ul>
            <li><strong>Autorités fiscales :</strong> Direction Générale des Impôts (DGI)</li>
            <li><strong>Autorités douanières :</strong> Direction Générale des Douanes et Accises (DGDA)</li>
            <li><strong>Commerçants agréés :</strong> Pour la gestion des bordereaux Tax Free</li>
            <li><strong>Prestataires de paiement :</strong> Pour l'exécution des remboursements</li>
            <li><strong>Sous-traitants techniques :</strong> Hébergeurs et prestataires informatiques (sous contrat de confidentialité)</li>
          </ul>

          <h2>7. Transferts internationaux</h2>
          <p>
            Vos données sont principalement stockées et traitées en République Démocratique du Congo. En cas de transfert 
            vers un pays tiers, nous nous assurons que des garanties appropriées sont mises en place pour protéger vos données, 
            conformément aux standards internationaux de protection des données.
          </p>

          <h2>8. Durée de conservation</h2>
          <p>Vos données personnelles sont conservées pendant les durées suivantes :</p>
          <ul>
            <li><strong>Données de transaction :</strong> 10 ans conformément aux obligations fiscales du Code Général des Impôts</li>
            <li><strong>Données d'identification :</strong> Durée de la relation commerciale + 10 ans</li>
            <li><strong>Données techniques :</strong> 1 an maximum</li>
            <li><strong>Données de compte utilisateur :</strong> Jusqu'à suppression du compte + 3 ans</li>
          </ul>

          <h2>9. Vos droits</h2>
          <p>Conformément à la législation applicable, vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Droit d'accès :</strong> Obtenir confirmation du traitement de vos données et en recevoir une copie</li>
            <li><strong>Droit de rectification :</strong> Faire corriger vos données inexactes ou incomplètes</li>
            <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données (sous réserve des obligations légales de conservation)</li>
            <li><strong>Droit à la limitation :</strong> Demander la limitation du traitement dans certains cas</li>
            <li><strong>Droit d'opposition :</strong> Vous opposer au traitement pour des motifs légitimes</li>
            <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à l'adresse : <strong>privacy@taxfree.cd</strong>
          </p>

          <h2>10. Sécurité des données</h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre 
            tout accès non autorisé, modification, divulgation ou destruction. Ces mesures comprennent :
          </p>
          <ul>
            <li>Chiffrement des données en transit et au repos</li>
            <li>Contrôles d'accès stricts et authentification à deux facteurs</li>
            <li>Surveillance continue des systèmes</li>
            <li>Formation du personnel à la protection des données</li>
            <li>Audits de sécurité réguliers</li>
          </ul>

          <h2>11. Cookies et technologies similaires</h2>
          <p>
            Notre plateforme utilise des cookies et technologies similaires pour assurer son bon fonctionnement, 
            améliorer votre expérience utilisateur et analyser l'utilisation de nos services. Vous pouvez gérer 
            vos préférences de cookies via les paramètres de votre navigateur.
          </p>

          <h2>12. Modifications de la politique</h2>
          <p>
            Nous nous réservons le droit de modifier cette Politique de Confidentialité à tout moment. 
            Toute modification sera publiée sur cette page avec une date de mise à jour. En cas de modification 
            substantielle, nous vous en informerons par email ou via une notification sur la plateforme.
          </p>

          <h2>13. Contact et réclamations</h2>
          <p>
            Pour toute question concernant cette politique ou le traitement de vos données personnelles, 
            vous pouvez nous contacter :
          </p>
          <p>
            <strong>Email :</strong> privacy@taxfree.cd<br/>
            <strong>Adresse :</strong> Tax Free RDC, Kinshasa, République Démocratique du Congo
          </p>
          <p>
            En cas de litige non résolu, vous pouvez saisir les autorités compétentes de la République Démocratique du Congo.
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
