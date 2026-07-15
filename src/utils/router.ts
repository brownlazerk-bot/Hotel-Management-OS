import { useState, useEffect } from 'react';

export interface RouteConfig {
  path: string;
  tabId: string;
  subTab?: string;
  requiresAuth?: boolean;
}

export const ROUTES: RouteConfig[] = [
  { path: '/', tabId: 'dashboard', requiresAuth: true },
  { path: '/login', tabId: 'login', requiresAuth: false },
  { path: '/dashboard', tabId: 'dashboard', requiresAuth: true },
  { path: '/ceo-dashboard', tabId: 'dashboard', requiresAuth: true },
  
  // Front Office
  { path: '/front-office', tabId: 'front_office', subTab: 'bookings', requiresAuth: true },
  { path: '/reservations', tabId: 'front_office', subTab: 'bookings', requiresAuth: true },
  { path: '/check-in', tabId: 'front_office', subTab: 'bookings', requiresAuth: true },
  { path: '/check-out', tabId: 'front_office', subTab: 'bookings', requiresAuth: true },
  { path: '/guests', tabId: 'front_office', subTab: 'guests', requiresAuth: true },
  { path: '/customers', tabId: 'front_office', subTab: 'guests', requiresAuth: true },
  
  // Rooms
  { path: '/rooms', tabId: 'rooms', subTab: 'board', requiresAuth: true },
  { path: '/room-types', tabId: 'rooms', subTab: 'types', requiresAuth: true },
  
  // Housekeeping & Maintenance (Operations)
  { path: '/housekeeping', tabId: 'operations', subTab: 'housekeeping', requiresAuth: true },
  { path: '/maintenance', tabId: 'operations', subTab: 'maintenance', requiresAuth: true },
  
  // Restaurant
  { path: '/restaurant', tabId: 'dining', subTab: 'tables', requiresAuth: true },
  { path: '/bar', tabId: 'dining', subTab: 'terminal', requiresAuth: true },
  { path: '/kitchen', tabId: 'dining', subTab: 'kitchen', requiresAuth: true },
  { path: '/kitchen-display', tabId: 'dining', subTab: 'kitchen', requiresAuth: true },
  { path: '/menu', tabId: 'dining', subTab: 'menu', requiresAuth: true },
  { path: '/table-management', tabId: 'dining', subTab: 'tables', requiresAuth: true },
  { path: '/pos', tabId: 'dining', subTab: 'terminal', requiresAuth: true },
  
  // Inventory
  { path: '/inventory', tabId: 'inventory', subTab: 'registry', requiresAuth: true },
  { path: '/stock', tabId: 'inventory', subTab: 'registry', requiresAuth: true },
  { path: '/stock-adjustments', tabId: 'inventory', subTab: 'registry', requiresAuth: true },
  { path: '/warehouse', tabId: 'inventory', subTab: 'registry', requiresAuth: true },
  { path: '/suppliers', tabId: 'inventory', subTab: 'suppliers', requiresAuth: true },
  { path: '/vendors', tabId: 'inventory', subTab: 'suppliers', requiresAuth: true },
  { path: '/purchases', tabId: 'inventory', subTab: 'purchases', requiresAuth: true },
  { path: '/goods-received', tabId: 'inventory', subTab: 'purchases', requiresAuth: true },
  
  // Finance & HR (Accounting & Employees)
  { path: '/accounting', tabId: 'finance', subTab: 'ledger', requiresAuth: true },
  { path: '/expenses', tabId: 'finance', subTab: 'ledger', requiresAuth: true },
  { path: '/income', tabId: 'finance', subTab: 'ledger', requiresAuth: true },
  { path: '/payments', tabId: 'finance', subTab: 'ledger', requiresAuth: true },
  { path: '/payroll', tabId: 'finance', subTab: 'payroll', requiresAuth: true },
  { path: '/taxes', tabId: 'finance', subTab: 'ledger', requiresAuth: true },
  { path: '/employees', tabId: 'finance', subTab: 'employees', requiresAuth: true },
  { path: '/attendance', tabId: 'finance', subTab: 'attendance', requiresAuth: true },
  { path: '/departments', tabId: 'finance', subTab: 'employees', requiresAuth: true },
  { path: '/roles', tabId: 'finance', subTab: 'users', requiresAuth: true },
  { path: '/companies', tabId: 'finance', subTab: 'employees', requiresAuth: true },
  
  // Reports
  { path: '/reports', tabId: 'reports', requiresAuth: true },
  { path: '/sales-reports', tabId: 'reports', requiresAuth: true },
  { path: '/inventory-reports', tabId: 'inventory', subTab: 'registry', requiresAuth: true },
  { path: '/financial-reports', tabId: 'finance', subTab: 'ledger', requiresAuth: true },
  { path: '/occupancy-reports', tabId: 'dashboard', requiresAuth: true },
  { path: '/audit', tabId: 'settings', subTab: 'audit', requiresAuth: true },
  { path: '/super-admin', tabId: 'settings', subTab: 'audit', requiresAuth: true },
  { path: '/admin', tabId: 'settings', subTab: 'profile', requiresAuth: true },
  
  // Notifications
  { path: '/notifications', tabId: 'dashboard', requiresAuth: true },
  
  // Settings
  { path: '/settings', tabId: 'settings', subTab: 'profile', requiresAuth: true },
  { path: '/profile', tabId: 'settings', subTab: 'profile', requiresAuth: true },
  { path: '/security', tabId: 'settings', subTab: 'profile', requiresAuth: true },
  { path: '/printer-settings', tabId: 'printing', requiresAuth: true },
  { path: '/system-settings', tabId: 'settings', subTab: 'structure', requiresAuth: true },
  
  // Other existing sidebar tabs
  { path: '/workflows', tabId: 'workflows', requiresAuth: true },
  { path: '/pool', tabId: 'pool', requiresAuth: true }
];

export function getRouteConfig(path: string): RouteConfig {
  const cleanPath = path.toLowerCase().split('?')[0].split('#')[0];
  // Match exact path
  const matched = ROUTES.find(r => r.path.toLowerCase() === cleanPath);
  if (matched) return matched;
  
  // Fallback to dashboard
  return { path: '/dashboard', tabId: 'dashboard', requiresAuth: true };
}

// Global list of route listeners to update all router hooks simultaneously
const listeners = new Set<() => void>();

export function navigate(path: string) {
  window.history.pushState(null, '', path);
  listeners.forEach(l => l());
}

export function useRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setLoading(true);
      setError(null);
      
      const timer = setTimeout(() => {
        setCurrentPath(window.location.pathname);
        setLoading(false);
      }, 150);
      
      return () => clearTimeout(timer);
    };

    listeners.add(handleUpdate);
    window.addEventListener('popstate', handleUpdate);

    return () => {
      listeners.delete(handleUpdate);
      window.removeEventListener('popstate', handleUpdate);
    };
  }, []);

  const routeConfig = getRouteConfig(currentPath);

  return {
    currentPath,
    routeConfig,
    loading,
    error,
    navigate
  };
}
