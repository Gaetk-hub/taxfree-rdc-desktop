import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api, { chatApi, disputesApi } from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  ChartBarIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  XMarkIcon,
  QrCodeIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  TagIcon,
  UserGroupIcon,
  MapPinIcon,
  LockClosedIcon,
  DocumentChartBarIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  GlobeAltIcon,
  ClipboardDocumentCheckIcon,
  WifiIcon,
  DocumentMagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  AcademicCapIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

interface MenuItem {
  name: string;
  href?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: number;
  isNew?: boolean;
  children?: MenuItem[];
  requiresShift?: boolean;
}

interface MenuSection {
  title: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  collapsible?: boolean;
  items: MenuItem[];
}

// Helper to get dashboard URL based on role
const getDashboardUrl = (role: string): string => {
  switch (role) {
    case 'ADMIN':
    case 'AUDITOR':
      return '/admin/dashboard';
    case 'MERCHANT':
      return '/merchant/dashboard';
    case 'CUSTOMS_AGENT':
    case 'OPERATOR':
      return '/customs/dashboard';
    case 'CLIENT':
      return '/client/dashboard';
    default:
      return '/admin/dashboard';
  }
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const userRole = user?.role || '';
  
  // Get granular permissions for ADMIN/AUDITOR
  const { hasModuleAccess, isSuperAdmin, hasGranularPermissions } = usePermissions();
  
  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [profileImageError, setProfileImageError] = useState(false);

  // Reset image error when profile_photo changes
  useEffect(() => {
    setProfileImageError(false);
  }, [user?.profile_photo]);

  // Auto-expand section based on current URL
  useEffect(() => {
    const path = location.pathname;
    const sectionsToExpand: string[] = [];
    
    // Admin sections
    if (path.startsWith('/admin/merchants') || path.startsWith('/admin/users') || 
        path.startsWith('/admin/forms') || path.startsWith('/admin/refunds')) {
      sectionsToExpand.push('gestion');
    }
    if (path.startsWith('/admin/borders') || path.startsWith('/admin/agents')) {
      sectionsToExpand.push('douane');
    }
    if (path.startsWith('/admin/rules') || path.startsWith('/admin/categories') || 
        path.startsWith('/admin/permissions') || path.startsWith('/admin/settings')) {
      sectionsToExpand.push('configuration');
    }
    if (path.startsWith('/admin/audit') || path.startsWith('/admin/reports')) {
      sectionsToExpand.push('supervision');
    }
    
    // Merchant sections
    if (path.startsWith('/merchant/settings')) {
      sectionsToExpand.push('administration');
    }
    
    // Customs sections
    if (path.startsWith('/customs/scan') || path.startsWith('/customs/refunds') || path.startsWith('/customs/offline')) {
      sectionsToExpand.push('validations');
    }
    
    if (sectionsToExpand.length > 0) {
      setExpandedSections(prev => [...new Set([...prev, ...sectionsToExpand])]);
    }
  }, [location.pathname]);

  // Check if customs agent has an active shift
  const { data: shiftData } = useQuery({
    queryKey: ['agent-shift-sidebar'],
    queryFn: async () => {
      const response = await api.get('/customs/agent/shift/');
      return response.data;
    },
    enabled: userRole === 'CUSTOMS_AGENT',
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const hasActiveShift = shiftData?.has_active_shift ?? false;

  // Fetch support counters for badges
  const { data: chatUnreadData } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: async () => {
      const response = await chatApi.getUnreadCount();
      return response.data;
    },
    enabled: ['ADMIN', 'OPERATOR', 'AUDITOR', 'MERCHANT', 'MERCHANT_EMPLOYEE', 'CUSTOMS_AGENT'].includes(userRole),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: ticketStatsData } = useQuery({
    queryKey: ['ticket-stats-sidebar'],
    queryFn: async () => {
      const response = await disputesApi.stats();
      return response.data;
    },
    enabled: ['ADMIN', 'OPERATOR', 'AUDITOR'].includes(userRole),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const chatUnreadCount = chatUnreadData?.unread_count ?? 0;
  const unassignedTickets = ticketStatsData?.unassigned ?? 0;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Check if any item in section is active
  const isSectionActive = (items: MenuItem[]): boolean => {
    return items.some(item => {
      if (item.href && isActive(item.href)) return true;
      if (item.children) return isSectionActive(item.children);
      return false;
    });
  };

  // Helper to check if user can see a menu item based on module permission
  const canAccessModule = (module: string): boolean => {
    // Super admin sees everything
    if (isSuperAdmin) return true;
    // If user has granular permissions, check specific module
    if (hasGranularPermissions) {
      return hasModuleAccess(module);
    }
    // Non-granular users (shouldn't happen for ADMIN/AUDITOR) - show all
    return true;
  };

  // Menu structure based on role - REORGANIZED
  const getMenuItems = (): { mainSections: MenuSection[] } => {

    // ========== SUPER ADMIN / AUDITOR ==========
    if (userRole === 'ADMIN' || userRole === 'AUDITOR') {
      // Build menu items based on permissions
      const gestionItems: MenuItem[] = [];
      if (canAccessModule('MERCHANTS')) gestionItems.push({ name: 'Commerçants', href: '/admin/merchants', icon: BuildingStorefrontIcon });
      if (canAccessModule('USERS')) gestionItems.push({ name: 'Utilisateurs', href: '/admin/users', icon: UsersIcon });
      if (canAccessModule('FORMS')) gestionItems.push({ name: 'Bordereaux', href: '/admin/forms', icon: ClipboardDocumentListIcon });
      if (canAccessModule('REFUNDS')) gestionItems.push({ name: 'Remboursements', href: '/admin/refunds', icon: BanknotesIcon });

      const douaneItems: MenuItem[] = [];
      if (canAccessModule('BORDERS')) douaneItems.push({ name: 'Points de sortie', href: '/admin/borders', icon: MapPinIcon });
      if (canAccessModule('AGENTS')) douaneItems.push({ name: 'Agents', href: '/admin/agents', icon: UserGroupIcon });

      const configItems: MenuItem[] = [];
      if (canAccessModule('RULES')) configItems.push({ name: 'Règles TVA', href: '/admin/rules', icon: ShieldCheckIcon });
      if (canAccessModule('CATEGORIES')) configItems.push({ name: 'Catégories', href: '/admin/categories', icon: TagIcon });
      if (canAccessModule('CATEGORIES')) configItems.push({ name: 'Devises', href: '/admin/currencies', icon: BanknotesIcon });
      if (canAccessModule('PERMISSIONS')) configItems.push({ name: 'Permissions', href: '/admin/permissions', icon: ShieldCheckIcon });
      if (canAccessModule('SETTINGS')) configItems.push({ name: 'Paramètres', href: '/admin/settings', icon: AdjustmentsHorizontalIcon });

      const supervisionItems: MenuItem[] = [];
      if (canAccessModule('AUDIT')) supervisionItems.push({ name: 'Journal d\'audit', href: '/admin/audit', icon: ClipboardDocumentCheckIcon });
      if (canAccessModule('REPORTS')) supervisionItems.push({ name: 'Rapports', href: '/admin/reports', icon: ChartBarIcon });

      // Build sections (only include non-empty sections)
      const mainSections: MenuSection[] = [];
      
      // Dashboard is always visible
      if (canAccessModule('DASHBOARD')) {
        mainSections.push({
          title: '',
          items: [
            { name: 'Tableau de bord', href: getDashboardUrl(userRole), icon: Squares2X2Icon },
          ]
        });
      }

      if (gestionItems.length > 0) {
        mainSections.push({
          title: 'Gestion',
          icon: ClipboardDocumentListIcon,
          collapsible: true,
          items: gestionItems
        });
      }

      if (douaneItems.length > 0) {
        mainSections.push({
          title: 'Douane',
          icon: GlobeAltIcon,
          collapsible: true,
          items: douaneItems
        });
      }

      if (configItems.length > 0) {
        mainSections.push({
          title: 'Configuration',
          icon: Cog6ToothIcon,
          collapsible: true,
          items: configItems
        });
      }

      if (supervisionItems.length > 0) {
        mainSections.push({
          title: 'Supervision',
          icon: DocumentMagnifyingGlassIcon,
          collapsible: true,
          items: supervisionItems
        });
      }

      // Support section - only show items user has permission for
      const supportItems: MenuItem[] = [];
      if (canAccessModule('SUPPORT_CHAT')) {
        supportItems.push({ name: 'Chat support', href: '/admin/support/chat', icon: ChatBubbleLeftRightIcon, badge: chatUnreadCount > 0 ? chatUnreadCount : undefined });
      }
      if (canAccessModule('SUPPORT_TICKETS')) {
        supportItems.push({ name: 'Tickets', href: '/admin/support/tickets', icon: TicketIcon, badge: unassignedTickets > 0 ? unassignedTickets : undefined });
      }
      // Formation is always visible for admin/auditor
      supportItems.push({ name: 'Formation', href: '/admin/training', icon: AcademicCapIcon });
      
      if (supportItems.length > 0) {
        mainSections.push({
          title: 'Support',
          icon: LifebuoyIcon,
          collapsible: true,
          items: supportItems
        });
      }

      return { mainSections };
    }

    // ========== MERCHANT (Admin commerçant) ==========
    if (userRole === 'MERCHANT') {
      return {
        mainSections: [
          {
            title: '',
            items: [
              { name: 'Tableau de bord', href: getDashboardUrl(userRole), icon: Squares2X2Icon },
            ]
          },
          {
            title: 'Tax Free',
            icon: ClipboardDocumentListIcon,
            collapsible: true,
            items: [
              { name: 'Mes bordereaux', href: '/merchant/forms', icon: ClipboardDocumentListIcon },
            ]
          },
          {
            title: 'Administration',
            icon: Cog6ToothIcon,
            collapsible: true,
            items: [
              { name: 'Points de vente', href: '/merchant/settings/outlets', icon: BuildingStorefrontIcon },
              { name: 'Utilisateurs', href: '/merchant/settings/users', icon: UsersIcon },
              { name: 'Voyageurs', href: '/merchant/settings/travelers', icon: UserGroupIcon },
              { name: 'Rapports', href: '/merchant/settings/reports', icon: ChartBarIcon },
            ]
          },
          {
            title: 'Support',
            icon: LifebuoyIcon,
            collapsible: true,
            items: [
              { name: 'Contacter le support', href: '/merchant/support', icon: ChatBubbleLeftRightIcon, badge: chatUnreadCount > 0 ? chatUnreadCount : undefined },
              { name: 'Mes tickets', href: '/merchant/tickets', icon: TicketIcon },
              { name: 'Formation', href: '/merchant/training', icon: AcademicCapIcon },
            ]
          },
        ]
      };
    }

    // ========== MERCHANT EMPLOYEE ==========
    if (userRole === 'MERCHANT_EMPLOYEE') {
      return {
        mainSections: [
          {
            title: '',
            items: [
              { name: 'Tableau de bord', href: '/merchant/dashboard', icon: Squares2X2Icon },
            ]
          },
          {
            title: 'Tax Free',
            items: [
              { name: 'Mes bordereaux', href: '/merchant/forms', icon: ClipboardDocumentListIcon },
            ]
          },
          {
            title: 'Support',
            icon: LifebuoyIcon,
            collapsible: true,
            items: [
              { name: 'Contacter le support', href: '/merchant/support', icon: ChatBubbleLeftRightIcon, badge: chatUnreadCount > 0 ? chatUnreadCount : undefined },
              { name: 'Formation', href: '/merchant/training', icon: AcademicCapIcon },
            ]
          },
        ]
      };
    }

    // ========== CUSTOMS AGENT ==========
    if (userRole === 'CUSTOMS_AGENT') {
      return {
        mainSections: [
          {
            title: '',
            items: [
              { name: 'Tableau de bord', href: getDashboardUrl(userRole), icon: Squares2X2Icon },
            ]
          },
          {
            title: 'Validations',
            icon: ClipboardDocumentCheckIcon,
            collapsible: true,
            items: [
              { name: 'Scanner QR', href: '/customs/scan', icon: QrCodeIcon, requiresShift: true },
              { name: 'Remboursements', href: '/customs/refunds', icon: BanknotesIcon, requiresShift: true },
              { name: 'Mode hors-ligne', href: '/customs/offline', icon: WifiIcon, requiresShift: true },
            ]
          },
          {
            title: 'Analyses',
            icon: ChartBarIcon,
            collapsible: true,
            items: [
              { name: 'Mes rapports', href: '/customs/reports', icon: DocumentChartBarIcon },
            ]
          },
          {
            title: 'Support',
            icon: LifebuoyIcon,
            collapsible: true,
            items: [
              { name: 'Contacter le support', href: '/customs/support', icon: ChatBubbleLeftRightIcon, badge: chatUnreadCount > 0 ? chatUnreadCount : undefined },
              { name: 'Mes tickets', href: '/customs/tickets', icon: TicketIcon },
              { name: 'Formation', href: '/customs/training', icon: AcademicCapIcon },
            ]
          },
        ]
      };
    }

    // ========== OPERATOR ==========
    // Operators share the same dashboard as customs agents with same menu structure
    if (userRole === 'OPERATOR') {
      return {
        mainSections: [
          {
            title: '',
            items: [
              { name: 'Tableau de bord', href: getDashboardUrl(userRole), icon: Squares2X2Icon },
            ]
          },
          {
            title: 'Validations',
            icon: ClipboardDocumentCheckIcon,
            collapsible: true,
            items: [
              { name: 'Scanner QR', href: '/customs/scan', icon: QrCodeIcon },
              { name: 'Remboursements', href: '/customs/refunds', icon: BanknotesIcon },
              { name: 'Mode hors-ligne', href: '/customs/offline', icon: WifiIcon },
            ]
          },
          {
            title: 'Analyses',
            icon: ChartBarIcon,
            collapsible: true,
            items: [
              { name: 'Mes rapports', href: '/customs/reports', icon: DocumentChartBarIcon },
            ]
          },
          {
            title: 'Support',
            icon: LifebuoyIcon,
            collapsible: true,
            items: [
              { name: 'Contacter le support', href: '/customs/support', icon: ChatBubbleLeftRightIcon, badge: chatUnreadCount > 0 ? chatUnreadCount : undefined },
              { name: 'Mes tickets', href: '/customs/tickets', icon: TicketIcon },
              { name: 'Formation', href: '/customs/training', icon: AcademicCapIcon },
            ]
          },
        ]
      };
    }

    // ========== CLIENT ==========
    return {
      mainSections: [
        {
          title: '',
          items: [
            { name: 'Tableau de bord', href: getDashboardUrl(userRole), icon: Squares2X2Icon },
          ]
        },
      ]
    };
  };

  const { mainSections } = getMenuItems();

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.name.toLowerCase());
    const active = item.href ? isActive(item.href) : false;
    
    // Check if any child is active (for parent highlighting)
    const hasActiveChild = hasChildren && item.children!.some(child => child.href && isActive(child.href));

    // Check if item requires shift and shift is not active
    const isDisabled = item.requiresShift && !hasActiveShift;

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSection(item.name.toLowerCase())}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
              hasActiveChild 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              {item.icon && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  hasActiveChild ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
              )}
              <span className="font-medium">{item.name}</span>
            </div>
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-10 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Disabled item (requires shift but no active shift)
    if (isDisabled) {
      return (
        <div
          key={item.name}
          className="flex items-center justify-between px-3 py-2 text-sm rounded-lg text-gray-400 cursor-not-allowed"
          title="Démarrez votre service pour accéder à cette fonctionnalité"
        >
          <div className="flex items-center gap-2">
            {item.icon && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400">
                <item.icon className="w-4 h-4" />
              </div>
            )}
            {!item.icon && depth > 0 && <div className="w-4" />}
            <span>{item.name}</span>
          </div>
          <LockClosedIcon className="w-4 h-4 text-gray-400" />
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href || '#'}
        onClick={onClose}
        className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
          active
            ? 'bg-blue-50 text-blue-600'
            : item.isNew
            ? 'text-blue-500 hover:bg-blue-50'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-2">
          {item.icon && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              <item.icon className="w-4 h-4" />
            </div>
          )}
          {!item.icon && depth > 0 && <div className="w-4" />}
          <span>{item.name}</span>
        </div>
        {item.badge && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
            <img 
              src="https://flagcdn.com/w80/cd.png" 
              alt="DRC Flag"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-900">Tax Free RDC</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded">
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {mainSections.map((section, sectionIndex) => {
          const sectionKey = section.title.toLowerCase();
          const isExpanded = expandedSections.includes(sectionKey);
          const sectionActive = isSectionActive(section.items);
          
          return (
            <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-4' : ''}>
              {section.title ? (
                section.collapsible ? (
                  // Collapsible section header with chevron
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                      sectionActive 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {section.icon && (
                        <section.icon className={`w-5 h-5 ${sectionActive ? 'text-primary-600' : 'text-gray-400'}`} />
                      )}
                      <span className="text-sm font-semibold">{section.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ) : (
                  // Non-collapsible section header
                  <div className="flex items-center gap-2 px-3 mb-2">
                    {section.icon && (
                      <section.icon className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {section.title}
                    </span>
                  </div>
                )
              ) : null}
              
              {/* Section items - show if not collapsible or if expanded */}
              {(!section.collapsible || isExpanded) && (
                <div className={`space-y-0.5 ${section.collapsible ? 'ml-2 pl-4 border-l-2 border-gray-100' : ''}`}>
                  {section.items.map(item => renderMenuItem(item))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section - User info */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-medium shadow-sm overflow-hidden">
            {user?.profile_photo && !profileImageError ? (
              <img 
                src={user.profile_photo} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={() => setProfileImageError(true)}
              />
            ) : (
              <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:block">
        <div className="h-full bg-white border-r border-gray-100">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
