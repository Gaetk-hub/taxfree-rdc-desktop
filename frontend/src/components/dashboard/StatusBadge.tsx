interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  // Form statuses
  DRAFT: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-700' },
  ISSUED: { label: 'Émis', bg: 'bg-blue-100', text: 'text-blue-700' },
  VALIDATED: { label: 'Validé', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  REFUNDED: { label: 'Remboursé', bg: 'bg-green-100', text: 'text-green-700' },
  CANCELLED: { label: 'Annulé', bg: 'bg-red-100', text: 'text-red-700' },
  EXPIRED: { label: 'Expiré', bg: 'bg-orange-100', text: 'text-orange-700' },
  REFUSED: { label: 'Refusé', bg: 'bg-red-100', text: 'text-red-700' },
  
  // Registration statuses
  PENDING: { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700' },
  APPROVED: { label: 'Approuvé', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  REJECTED: { label: 'Rejeté', bg: 'bg-red-100', text: 'text-red-700' },
  
  // Merchant statuses
  SUBMITTED: { label: 'Soumis', bg: 'bg-blue-100', text: 'text-blue-700' },
  SUSPENDED: { label: 'Suspendu', bg: 'bg-orange-100', text: 'text-orange-700' },
  ACTIVE: { label: 'Actif', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  INACTIVE: { label: 'Inactif', bg: 'bg-gray-100', text: 'text-gray-700' },
  
  // Refund statuses
  PROCESSING: { label: 'En cours', bg: 'bg-blue-100', text: 'text-blue-700' },
  COMPLETED: { label: 'Terminé', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  FAILED: { label: 'Échoué', bg: 'bg-red-100', text: 'text-red-700' },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || { 
    label: status, 
    bg: 'bg-gray-100', 
    text: 'text-gray-700' 
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
}
