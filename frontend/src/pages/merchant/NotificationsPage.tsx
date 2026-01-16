import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  FunnelIcon,
  CheckIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

const NotificationTypeLabels: Record<string, string> = {
  REGISTRATION_APPROVED: 'Inscription approuvée',
  REGISTRATION_REJECTED: 'Inscription rejetée',
  DOCUMENT_REQUESTED: 'Documents demandés',
  NEW_CHAT_MESSAGE: 'Nouveau message',
  TICKET_MESSAGE: 'Réponse ticket',
  TICKET_ASSIGNED: 'Ticket assigné',
  GENERAL: 'Général',
};

export default function MerchantNotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', filter, typeFilter, currentPage],
    queryFn: () => notificationsApi.list({
      page: currentPage,
      page_size: 5,
      is_read: filter === 'all' ? undefined : filter === 'read',
      notification_type: typeFilter || undefined,
    }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const notifications: Notification[] = data?.data?.results || data?.data || [];
  const totalCount = data?.data?.count || notifications.length;
  const totalPages = Math.ceil(totalCount / 5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return formatDate(dateString);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'REGISTRATION_APPROVED':
        return <CheckCircleIcon className="w-6 h-6 text-emerald-500" />;
      case 'REGISTRATION_REJECTED':
        return <ExclamationCircleIcon className="w-6 h-6 text-red-500" />;
      case 'DOCUMENT_REQUESTED':
        return <InformationCircleIcon className="w-6 h-6 text-orange-500" />;
      case 'NEW_CHAT_MESSAGE':
        return <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-500" />;
      case 'TICKET_MESSAGE':
      case 'TICKET_ASSIGNED':
        return <TicketIcon className="w-6 h-6 text-purple-500" />;
      default:
        return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markAsReadMutation.mutate(notif.id);
    }
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toutes vos notifications
          </p>
        </div>
        <button
          onClick={() => markAllAsReadMutation.mutate()}
          disabled={markAllAsReadMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          <CheckIcon className="w-4 h-4" />
          Tout marquer comme lu
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Filtrer :</span>
          </div>
          
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => { setFilter('unread'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Non lues
            </button>
            <button
              onClick={() => { setFilter('read'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'read' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Lues
            </button>
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tous les types</option>
            <option value="NEW_CHAT_MESSAGE">Messages chat</option>
            <option value="TICKET_MESSAGE">Réponses tickets</option>
            <option value="DOCUMENT_REQUESTED">Documents demandés</option>
            <option value="REGISTRATION_APPROVED">Inscription approuvée</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune notification</p>
            <p className="text-sm text-gray-400">Les nouvelles notifications apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notif.is_read ? 'bg-primary-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    {getNotificationIcon(notif.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-sm font-medium ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">{formatTimeAgo(notif.created_at)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {NotificationTypeLabels[notif.notification_type] || notif.notification_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notif.is_read && (
                          <div className="w-2.5 h-2.5 bg-primary-500 rounded-full"></div>
                        )}
                        {!notif.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notif.id);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Marquer comme lu"
                          >
                            <CheckIcon className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {totalCount} notification{totalCount > 1 ? 's' : ''}
              {totalPages > 1 && ` • Page ${currentPage} sur ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </FadeIn>
  );
}
