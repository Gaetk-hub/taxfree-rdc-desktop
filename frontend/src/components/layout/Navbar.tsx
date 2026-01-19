import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { notificationsApi } from '../../services/api';
import useNotificationSound from '../../hooks/useNotificationSound';
import {
  MagnifyingGlassIcon,
  Bars3Icon,
  PlusIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  DocumentPlusIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  QrCodeIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface NavbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
}

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

export default function Navbar({ onMenuClick, onLogout }: NavbarProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [profileImageError, setProfileImageError] = useState(false);

  // Reset image error when profile_photo changes
  useEffect(() => {
    setProfileImageError(false);
  }, [user?.profile_photo]);

  // Fetch notifications from backend
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ page_size: 10 }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const notifications: Notification[] = notificationsData?.data?.results || notificationsData?.data || [];
  const unreadCount = unreadCountData?.data?.count || 0;

  // Play sound when new notifications arrive
  useNotificationSound(unreadCount);

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
    return `Il y a ${diffDays}j`;
  };

  const handleNotificationClick = (notif: Notification) => {
    // Mark as read
    if (!notif.is_read) {
      markAsReadMutation.mutate(notif.id);
    }
    // Navigate to action URL
    if (notif.action_url) {
      setShowNotifications(false);
      navigate(notif.action_url);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'REGISTRATION_NEW':
        return <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />;
      case 'REGISTRATION_APPROVED':
        return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
      case 'REGISTRATION_REJECTED':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'DOCUMENT_REQUESTED':
        return <InformationCircleIcon className="w-5 h-5 text-orange-500" />;
      case 'DOCUMENT_SUBMITTED':
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  // Dynamic quick actions based on role
  const getQuickActions = () => {
    const role = user?.role;
    
    // Super Admin / Auditor
    if (role === 'ADMIN' || role === 'AUDITOR') {
      return [
        { icon: BuildingStorefrontIcon, label: 'Nouveau commerçant', href: '/admin/merchants', color: 'text-emerald-600 bg-emerald-50' },
        { icon: UserPlusIcon, label: 'Nouvel utilisateur', href: '/admin/users', color: 'text-blue-600 bg-blue-50' },
        { icon: ChartBarIcon, label: 'Voir rapports', href: '/admin/reports', color: 'text-purple-600 bg-purple-50' },
      ];
    }
    
    // Merchant
    if (role === 'MERCHANT') {
      return [
        { icon: DocumentPlusIcon, label: 'Nouveau bordereau', href: '/merchant/forms', color: 'text-blue-600 bg-blue-50' },
        { icon: UserPlusIcon, label: 'Inviter utilisateur', href: '/merchant/settings/users', color: 'text-emerald-600 bg-emerald-50' },
        { icon: ChartBarIcon, label: 'Mes rapports', href: '/merchant/settings/reports', color: 'text-purple-600 bg-purple-50' },
      ];
    }
    
    // Merchant Employee
    if (role === 'MERCHANT_EMPLOYEE') {
      return [
        { icon: DocumentPlusIcon, label: 'Nouveau bordereau', href: '/merchant/forms', color: 'text-blue-600 bg-blue-50' },
      ];
    }
    
    // Customs Agent
    if (role === 'CUSTOMS_AGENT') {
      return [
        { icon: QrCodeIcon, label: 'Scanner QR', href: '/customs/scan', color: 'text-blue-600 bg-blue-50' },
        { icon: BanknotesIcon, label: 'Remboursements', href: '/customs/refunds', color: 'text-emerald-600 bg-emerald-50' },
        { icon: ChartBarIcon, label: 'Mes rapports', href: '/customs/reports', color: 'text-purple-600 bg-purple-50' },
      ];
    }
    
    // Operator
    if (role === 'OPERATOR') {
      return [
        { icon: BanknotesIcon, label: 'File remboursements', href: '/operator/refunds', color: 'text-blue-600 bg-blue-50' },
      ];
    }
    
    return [];
  };

  // Dynamic settings URL based on role
  const getSettingsUrl = () => {
    const role = user?.role;
    if (role === 'ADMIN' || role === 'AUDITOR') return '/admin/settings';
    if (role === 'MERCHANT') return '/merchant/settings/outlets';
    if (role === 'CUSTOMS_AGENT' || role === 'OPERATOR') return '/customs/settings';
    return '/profile';
  };

  // Dynamic profile URL based on role
  const getProfileUrl = () => {
    const role = user?.role;
    if (role === 'ADMIN' || role === 'AUDITOR') return '/admin/profile';
    if (role === 'MERCHANT' || role === 'MERCHANT_EMPLOYEE') return '/merchant/profile';
    if (role === 'CUSTOMS_AGENT' || role === 'OPERATOR') return '/customs/profile';
    return '/profile';
  };

  const quickActions = getQuickActions();

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side - Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bars3Icon className="w-5 h-5 text-gray-600" />
        </button>

        {/* Center - Search bar */}
        <div className="flex-1 max-w-xl mx-4 lg:mx-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher bordereaux, commerçants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
                setShowQuickActions(false);
              }}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <BellIcon className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsReadMutation.mutate()}
                      className="text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <BellIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Aucune notification</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notif.notification_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                            <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notif.created_at)}</p>
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-3 border-t border-gray-100 text-center">
                  <Link 
                    to={
                      user?.role === 'ADMIN' || user?.role === 'AUDITOR'
                        ? '/admin/notifications' 
                        : user?.role === 'CUSTOMS_AGENT' || user?.role === 'OPERATOR'
                          ? '/customs/notifications'
                          : '/merchant/notifications'
                    } 
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Voir toutes les notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
                setShowQuickActions(false);
              }}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center ring-2 ring-white shadow-sm overflow-hidden">
                {user?.profile_photo && !profileImageError ? (
                  <img 
                    src={user.profile_photo} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <span className="text-white text-sm font-medium">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                )}
              </div>
              <span className="hidden lg:block text-sm font-medium text-gray-700">
                {(user?.role === 'MERCHANT' || user?.role === 'MERCHANT_EMPLOYEE') && user?.merchant_name 
                  ? user.merchant_name 
                  : user?.first_name}
              </span>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">
                    {(user?.role === 'MERCHANT' || user?.role === 'MERCHANT_EMPLOYEE') && user?.merchant_name 
                      ? user.merchant_name 
                      : `${user?.first_name} ${user?.last_name}`}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {user?.role === 'ADMIN' ? 'Administrateur' : user?.role}
                  </span>
                </div>
                <div className="py-1">
                  <Link 
                    to={getProfileUrl()} 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <UserCircleIcon className="w-5 h-5 text-gray-400" />
                    Mon profil
                  </Link>
                  {/* Hide settings for employees - they don't have admin access */}
                  {user?.role !== 'MERCHANT_EMPLOYEE' && (
                    <Link 
                      to={getSettingsUrl()} 
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
                      Paramètres
                    </Link>
                  )}
                </div>
                <div className="border-t border-gray-100 py-1">
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Button */}
          <div className="relative" ref={actionsRef}>
            <button 
              onClick={() => {
                setShowQuickActions(!showQuickActions);
                setShowProfileMenu(false);
                setShowNotifications(false);
              }}
              className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-105"
            >
              <PlusIcon className={`w-5 h-5 transition-transform ${showQuickActions ? 'rotate-45' : ''}`} />
            </button>

            {/* Quick Actions Dropdown */}
            {showQuickActions && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Actions rapides</h3>
                </div>
                <div className="py-1">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setShowQuickActions(false);
                        navigate(action.href);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center`}>
                        <action.icon className="w-4 h-4" />
                      </div>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
