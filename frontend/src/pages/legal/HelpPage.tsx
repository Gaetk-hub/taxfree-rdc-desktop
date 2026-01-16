import { Link } from 'react-router-dom';
import {
  QuestionMarkCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeftIcon className="w-4 h-4" />
            Retour
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <QuestionMarkCircleIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Centre d'aide</h1>
              <p className="text-gray-500">Système Tax Free RDC</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bienvenue sur le Centre d'aide Tax Free RDC</h2>
          <p className="text-gray-600 leading-relaxed">
            Le système Tax Free RDC permet aux voyageurs non-résidents de bénéficier du remboursement de la TVA 
            sur leurs achats effectués en République Démocratique du Congo, conformément aux dispositions du 
            <strong> Code Général des Impôts</strong> et aux réglementations de la <strong>Direction Générale des Impôts (DGI)</strong> 
            et de la <strong>Direction Générale des Douanes et Accises (DGDA)</strong>.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          {/* Pour les voyageurs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Pour les voyageurs</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Qui peut bénéficier du Tax Free ?</h4>
                <p className="text-gray-600 text-sm">
                  Tout voyageur non-résident de la RDC, de nationalité étrangère ou congolaise résidant à l'étranger, 
                  peut bénéficier du remboursement de la TVA sur ses achats. Le voyageur doit présenter un passeport 
                  valide et un titre de séjour prouvant sa résidence hors de la RDC.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Quel est le montant minimum d'achat ?</h4>
                <p className="text-gray-600 text-sm">
                  Le montant minimum d'achat éligible au Tax Free est fixé conformément aux seuils définis par la DGI. 
                  Ce montant peut varier selon les catégories de produits et les réglementations en vigueur.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Comment obtenir mon remboursement ?</h4>
                <p className="text-gray-600 text-sm">
                  1. Effectuez vos achats chez un commerçant agréé Tax Free<br/>
                  2. Demandez un bordereau Tax Free au moment de l'achat<br/>
                  3. Présentez vos achats et le bordereau à la douane avant votre départ<br/>
                  4. Après validation douanière, recevez votre remboursement selon le mode choisi
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Quels produits sont éligibles ?</h4>
                <p className="text-gray-600 text-sm">
                  Les biens de consommation courante achetés pour un usage personnel sont généralement éligibles. 
                  Sont exclus : les services, les produits alimentaires périssables, les carburants, les véhicules, 
                  et tout bien destiné à un usage commercial ou professionnel.
                </p>
              </div>
            </div>
          </div>

          {/* Pour les commerçants */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ClipboardDocumentListIcon className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Pour les commerçants</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Comment devenir commerçant agréé Tax Free ?</h4>
                <p className="text-gray-600 text-sm">
                  Pour devenir commerçant agréé, vous devez être enregistré auprès de la DGI, disposer d'un NIF 
                  (Numéro d'Identification Fiscale) valide, et soumettre une demande d'agrément via notre plateforme. 
                  Votre dossier sera examiné par nos services et la DGI.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Comment émettre un bordereau Tax Free ?</h4>
                <p className="text-gray-600 text-sm">
                  Connectez-vous à votre espace commerçant, créez une nouvelle vente en renseignant les informations 
                  du voyageur et les détails des produits achetés. Le système génère automatiquement le bordereau 
                  avec un QR code unique pour la validation douanière.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Quelles sont mes obligations ?</h4>
                <p className="text-gray-600 text-sm">
                  En tant que commerçant agréé, vous devez : vérifier l'identité et l'éligibilité du voyageur, 
                  émettre des bordereaux conformes, conserver les justificatifs pendant 5 ans conformément au 
                  Code Général des Impôts, et déclarer vos opérations Tax Free dans vos déclarations fiscales.
                </p>
              </div>
            </div>
          </div>

          {/* Remboursements */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <BanknotesIcon className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">Remboursements</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Modes de remboursement disponibles</h4>
                <p className="text-gray-600 text-sm">
                  • <strong>Espèces</strong> : Au guichet de l'aéroport après validation douanière<br/>
                  • <strong>Virement bancaire</strong> : Sur votre compte bancaire international (délai 5-10 jours ouvrables)<br/>
                  • <strong>Mobile Money</strong> : Sur votre numéro de téléphone enregistré (disponible pour certains opérateurs)
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Délais de remboursement</h4>
                <p className="text-gray-600 text-sm">
                  Les remboursements en espèces sont immédiats après validation. Les virements bancaires sont 
                  traités sous 5 à 10 jours ouvrables. Les remboursements Mobile Money sont généralement 
                  effectués sous 24 à 48 heures.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Frais de service</h4>
                <p className="text-gray-600 text-sm">
                  Des frais de service peuvent s'appliquer selon le mode de remboursement choisi. Ces frais 
                  sont clairement indiqués sur le bordereau Tax Free avant la finalisation de la transaction.
                </p>
              </div>
            </div>
          </div>

          {/* Validation douanière */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Validation douanière</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Où faire valider mon bordereau ?</h4>
                <p className="text-gray-600 text-sm">
                  La validation s'effectue aux points de sortie du territoire congolais agréés par la DGDA : 
                  aéroports internationaux (N'Djili à Kinshasa, Luano à Lubumbashi, Goma), postes frontières 
                  terrestres et ports autorisés.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Documents à présenter</h4>
                <p className="text-gray-600 text-sm">
                  • Passeport valide avec visa de sortie<br/>
                  • Bordereau Tax Free original<br/>
                  • Factures d'achat originales<br/>
                  • Les marchandises achetées (pour contrôle éventuel)
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Délai de validité</h4>
                <p className="text-gray-600 text-sm">
                  Le bordereau Tax Free doit être validé dans un délai de 90 jours à compter de la date d'achat. 
                  Passé ce délai, le bordereau expire et le remboursement ne peut plus être effectué.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 mt-8 text-white">
          <h3 className="text-lg font-semibold mb-4">Besoin d'assistance ?</h3>
          <p className="text-primary-100 mb-6">
            Notre équipe est disponible pour répondre à vos questions du lundi au vendredi, de 8h00 à 17h00 (heure de Kinshasa).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <PhoneIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-primary-200">Téléphone</p>
                <p className="font-medium">+243 XXX XXX XXX</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <EnvelopeIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-primary-200">Email</p>
                <p className="font-medium">support@taxfree.cd</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <MapPinIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-primary-200">Adresse</p>
                <p className="font-medium">Kinshasa, RDC</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>© {new Date().getFullYear()} Tax Free RDC - Tous droits réservés</p>
          <p className="mt-1">
            Opéré sous l'autorité de la Direction Générale des Impôts (DGI) et de la Direction Générale des Douanes et Accises (DGDA)
          </p>
        </div>
      </div>
    </div>
  );
}
