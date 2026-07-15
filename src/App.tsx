/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { store } from './db/store';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import FrontOffice from './components/FrontOffice';
import RoomManagement from './components/RoomManagement';
import RestaurantPOS from './components/RestaurantPOS';
import InventoryPurchasing from './components/InventoryPurchasing';
import HRFinance from './components/HRFinance';
import HousekeepingMaintenance from './components/HousekeepingMaintenance';
import SettingsComponent from './components/Settings';
import ShiftReporting from './components/ShiftReporting';
import Workflows from './components/Workflows';
import SwimmingPoolConsole from './components/SwimmingPoolConsole';
import PrinterStation from './components/PrinterStation';
import { useRouter } from './utils/router';

import {
  Building,
  LayoutDashboard,
  Users,
  Grid,
  UtensilsCrossed,
  Package,
  Sparkles,
  Settings,
  Bell,
  LogOut,
  Moon,
  Sun,
  Shield,
  Menu,
  X,
  Lock,
  RefreshCw,
  ClipboardList,
  GitPullRequest,
  Waves,
  Printer,
  Search,
  Plus,
  Key,
  Check,
  Trash2
} from 'lucide-react';

export default function App() {
  const [db, setDb] = useState(store.getDb());
  const [activeUser, setActiveUser] = useState(store.getActiveUser());
  
  const { currentPath, routeConfig, navigate } = useRouter();

  const getTabPath = (tabId: string) => {
    switch (tabId) {
      case 'dashboard': return '/dashboard';
      case 'front_office': return '/front-office';
      case 'rooms': return '/rooms';
      case 'dining': return '/restaurant';
      case 'inventory': return '/inventory';
      case 'finance': return '/accounting';
      case 'operations': return '/housekeeping';
      case 'reports': return '/reports';
      case 'settings': return '/settings';
      case 'workflows': return '/workflows';
      case 'pool': return '/pool';
      case 'printing': return '/printer-settings';
      default: return '/dashboard';
    }
  };

  const activeTab = routeConfig.tabId;
  const setActiveTab = (tabId: string) => {
    navigate(getTabPath(tabId));
  };

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const profiles = store.getSavedProfiles();

  // Login Form States
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Operator Self-Registration States
  const [loginTab, setLoginTab] = useState<'login' | 'register'>('login');
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Receptionist');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Created Accounts Tracker search query
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Subscribe to central state changes
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setDb(store.getDb());
      setActiveUser(store.getActiveUser());
    });
    return () => unsubscribe();
  }, []);

  // Update light/dark document theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Authorization routing redirects
  useEffect(() => {
    if (db.isInitialized) {
      if (!activeUser && currentPath !== '/login') {
        navigate('/login');
      } else if (activeUser && (currentPath === '/login' || currentPath === '/')) {
        navigate('/dashboard');
      }
    }
  }, [activeUser, currentPath, db.isInitialized, navigate]);

  // ============================================================================
  // PERMISSION GATES (RBAC)
  // ============================================================================
  const tabs = [
    {
      id: 'dashboard',
      label: 'Executive Analytics',
      icon: LayoutDashboard,
      component: Dashboard,
      permission: 'view_dashboard'
    },
    {
      id: 'front_office',
      label: 'Front Desk Office',
      icon: Users,
      component: FrontOffice,
      permission: 'manage_guests'
    },
    {
      id: 'rooms',
      label: 'Room Inventory',
      icon: Grid,
      component: RoomManagement,
      permission: 'manage_rooms'
    },
    {
      id: 'dining',
      label: 'Food & Dining POS',
      icon: UtensilsCrossed,
      component: RestaurantPOS,
      permission: 'manage_restaurant'
    },
    {
      id: 'inventory',
      label: 'Procure & Stock',
      icon: Package,
      component: InventoryPurchasing,
      permission: 'manage_inventory'
    },
    {
      id: 'reports',
      label: 'Shift Reconciliation',
      icon: ClipboardList,
      component: ShiftReporting,
      permission: 'view_dashboard'
    },
    {
      id: 'workflows',
      label: 'Operations Workflows',
      icon: GitPullRequest,
      component: Workflows,
      permission: 'view_dashboard'
    },
    {
      id: 'pool',
      label: 'Swimming Pool Ops',
      icon: Waves,
      component: SwimmingPoolConsole,
      permission: 'view_dashboard'
    },
    {
      id: 'finance',
      label: 'HR & Ledger',
      icon: Sparkles,
      component: HRFinance,
      permission: 'manage_accounting'
    },
    {
      id: 'operations',
      label: 'Operations & Repair',
      icon: Building,
      component: HousekeepingMaintenance,
      permission: 'manage_housekeeping'
    },
    {
      id: 'printing',
      label: 'Thermal Print Station',
      icon: Printer,
      component: PrinterStation,
      permission: 'manage_settings'
    },
    {
      id: 'settings',
      label: 'Global Settings',
      icon: Settings,
      component: SettingsComponent,
      permission: 'manage_settings'
    }
  ];

  const allowedTabs = tabs.filter(tab => {
    if (!activeUser) return false;
    if (activeUser.role === 'Super Admin') return true;
    if (tab.id === 'dining') {
      return store.hasPermission('manage_restaurant') || store.hasPermission('manage_pos');
    }
    return store.hasPermission(tab.permission as any);
  });

  // Ensure active tab is allowed, otherwise fall back
  useEffect(() => {
    if (activeUser && allowedTabs.length > 0) {
      const isAllowed = allowedTabs.some(t => t.id === activeTab);
      if (!isAllowed) {
        setActiveTab(allowedTabs[0].id);
      }
    }
  }, [activeUser, activeTab, allowedTabs]);

  // ============================================================================
  // OPERATIONS
  // ============================================================================
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser || !loginPass) return;

    const res = store.login(loginUser, loginPass);
    if (res.success) {
      setLoginError('');
      setLoginUser('');
      setLoginPass('');
    } else {
      setLoginError(res.error || 'Login failed');
    }
  };

  const handleRegisterStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regUsername || !regPassword || !regRole) {
      setRegError('All fields are required.');
      setRegSuccess('');
      return;
    }

    const cleanedUsername = regUsername.trim().toLowerCase();
    const usernameExists = db.users.some(u => u.username.toLowerCase() === cleanedUsername);
    if (usernameExists) {
      setRegError('Username already exists in this hotel.');
      setRegSuccess('');
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: regName.trim(),
      username: cleanedUsername,
      passwordHash: regPassword, // plaintext in this local sandbox simulation
      role: regRole as any,
      email: regEmail.trim() || `${cleanedUsername}@hotel.com`,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    store.saveUser(newUser);
    setRegSuccess(`Account for "${newUser.name}" as ${newUser.role} successfully registered! Autologging in...`);
    setRegError('');

    // Reset registration form
    setRegName('');
    setRegUsername('');
    setRegEmail('');
    setRegPassword('');

    // Auto login
    setTimeout(() => {
      store.login(newUser.username, newUser.passwordHash);
      setRegSuccess('');
    }, 1200);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !resetCode || !newAdminPassword) {
      setResetError('All fields are required.');
      setResetSuccess('');
      return;
    }

    if (resetUsername.trim().toLowerCase() !== 'yuskar' || resetCode.trim() !== 'yuskar123') {
      setResetError('Invalid reset username or reset code.');
      setResetSuccess('');
      return;
    }

    const success = store.resetAdminPassword(newAdminPassword);
    if (success) {
      setResetSuccess('Success! Admin password has been successfully reset. You can now use your new password.');
      setResetError('');
      setResetUsername('');
      setResetCode('');
      setNewAdminPassword('');
    } else {
      setResetError('Failed to locate Admin account to reset password.');
      setResetSuccess('');
    }
  };

  const handleQuickLogin = (username: string) => {
    // Standard password across sandbox simulation is username123 or just common password
    // Looking up user's stored password
    const targetUser = db.users.find(u => u.username === username);
    if (targetUser) {
      const res = store.login(username, targetUser.passwordHash);
      if (res.success) {
        setLoginError('');
      }
    }
  };

  const handleLogout = () => {
    store.logout();
    setActiveTab('dashboard');
  };

  const handleClearNotifications = () => {
    store.clearNotifications();
  };

  // ============================================================================
  // RENDERING
  // ============================================================================

  // Scenario 1: Initial Setup Wizard Block
  if (!db.isInitialized) {
    return <SetupWizard onSetupComplete={() => setDb(store.getDb())} />;
  }

  // Scenario 2: Login Gate
  if (!activeUser || currentPath === '/login') {
    // Search filter for operator accounts directory
    const filteredUsersForLogin = db.users.filter((u: any) =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    // Dynamic role badges styling
    const getRoleBadgeStyle = (role: string) => {
      switch (role) {
        case 'Super Admin':
          return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50';
        case 'Manager':
          return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
        case 'Receptionist':
          return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50';
        case 'Accountant':
          return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
        case 'Cashier':
          return 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50';
        case 'Waiter':
          return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
        case 'Manual Operator':
          return 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50';
        default:
          return 'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-850 dark:text-gray-400 dark:border-gray-700';
      }
    };

    const getRoleEmoji = (role: string) => {
      switch (role) {
        case 'Super Admin': return '👑';
        case 'CEO': return '📈';
        case 'Manager': return '💼';
        case 'Receptionist': return '🛎️';
        case 'Accountant': return '💵';
        case 'Cashier': return '🛒';
        case 'Waiter': return '🍽️';
        case 'Chef': return '🍳';
        case 'Housekeeper': return '🧹';
        case 'Storekeeper': return '📦';
        case 'Maintenance Staff': return '🔧';
        case 'Security': return '🛡️';
        case 'Manual Operator': return '🕹️';
        default: return '👤';
      }
    };

    return (
      <div className="min-h-screen bg-[#F4F6F9] dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-150">
        <div className="w-full max-w-6xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-150 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row">
          
          {/* Welcome Left Bar - Brand Profile */}
          <div className="md:w-3/12 bg-[#1B4F72] text-white p-6 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-6">
                <Building className="h-7 w-7 text-[#E67E22]" />
              </div>
              <h1 className="text-2xl font-black font-sans tracking-tight">{db.settings.profile.name || 'Hotel OS'}</h1>
              <p className="text-[9px] text-[#E67E22] mt-1.5 font-bold tracking-widest uppercase">
                {db.settings.profile.slogan || 'Complete Property Operations Management Center'}
              </p>
              
              <div className="h-0.5 w-8 bg-orange-500 mt-4 rounded-full"></div>

              <div className="mt-6 space-y-3.5 text-xs text-blue-100/90 leading-relaxed">
                <p>Welcome to your property dashboard. Each role-based account unlocks distinct administrative panels:</p>
                <ul className="space-y-1 text-[11px] list-disc list-inside text-blue-200">
                  <li><strong className="text-white font-medium">Admin:</strong> HR, accounting, system settings.</li>
                  <li><strong className="text-white font-medium">Reception:</strong> Check-ins, reservations.</li>
                  <li><strong className="text-white font-medium">Waiter/Cashier:</strong> Food POS orders.</li>
                  <li><strong className="text-white font-medium">Housekeeping:</strong> Room inspection.</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 text-[10px] text-blue-200/80 space-y-1">
              <p className="font-semibold text-emerald-400 flex items-center">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-1"></span>
                Secure Cloud-Vetted Node
              </p>
              <p>Property Ledger • Version 4.0</p>
            </div>
          </div>

          {/* Center Column - Login & Registration Form */}
          <div className="md:w-5/12 p-8 flex flex-col justify-between border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div>
              {isForgotPassword ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Reset Admin Password</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-400">Enter emergency credentials to reset the Super Admin password.</p>

                  <form onSubmit={handlePasswordResetSubmit} className="space-y-4 mt-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reset Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. yuskar"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono font-bold"
                        value={resetUsername}
                        onChange={(e) => setResetUsername(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reset Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. yuskar123"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono font-bold"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">New Admin Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                      />
                    </div>

                    {resetError && (
                      <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/20 dark:text-red-400 p-2 rounded border border-red-100 dark:border-red-900/50">{resetError}</p>
                    )}

                    {resetSuccess && (
                      <p className="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 p-2 rounded border border-emerald-100 dark:border-emerald-900/50">{resetSuccess}</p>
                    )}

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setResetUsername('');
                          setResetCode('');
                          setNewAdminPassword('');
                          setResetSuccess('');
                          setResetError('');
                        }}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition cursor-pointer text-center border border-gray-250 dark:border-gray-600"
                      >
                        Back to Login
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[#E67E22] hover:bg-[#D35400] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
                      >
                        <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
                        <span>Reset Password</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div>
                  {/* Dynamic Tabs: Sign In / Self-Register */}
                  <div className="flex border-b border-gray-150 dark:border-gray-800 mb-6 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginTab('login');
                        setRegError('');
                        setRegSuccess('');
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer border-none ${loginTab === 'login' ? 'bg-[#1B4F72] text-white shadow-xs' : 'bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Sign-In Terminal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginTab('register');
                        setLoginError('');
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer border-none ${loginTab === 'register' ? 'bg-[#E67E22] text-white shadow-xs' : 'bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Self-Register Staff</span>
                    </button>
                  </div>

                  {loginTab === 'login' ? (
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Staff Secure Terminal</h2>
                      <p className="text-[11px] text-gray-400 dark:text-gray-400">Enter secure operator credentials to authorize your session.</p>

                      <form onSubmit={handleLoginSubmit} className="space-y-4 mt-6">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Username</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. admin, receptionist"
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono"
                            value={loginUser}
                            onChange={(e) => setLoginUser(e.target.value)}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password</label>
                            <button
                              type="button"
                              onClick={() => {
                                setIsForgotPassword(true);
                                setResetSuccess('');
                                setResetError('');
                              }}
                              className="text-[10px] font-bold text-[#E67E22] hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono"
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                          />
                        </div>

                        {loginError && (
                          <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/20 dark:text-red-400 p-2 rounded border border-red-100 dark:border-red-900/50">{loginError}</p>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 border-none"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Authorize Connection</span>
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Self-Register Account</h2>
                      <p className="text-[11px] text-gray-400 dark:text-gray-400">Instantly create a staff account to explore role-specific dashboards.</p>

                      <form onSubmit={handleRegisterStaffSubmit} className="space-y-3.5 mt-5">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Operator Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Sarah Connor"
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none text-gray-800 dark:text-white"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Username</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. sarah"
                              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none text-gray-800 dark:text-white font-mono"
                              value={regUsername}
                              onChange={(e) => setRegUsername(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Operator Role</label>
                            <select
                              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none text-gray-800 dark:text-white cursor-pointer"
                              value={regRole}
                              onChange={(e) => setRegRole(e.target.value)}
                            >
                              <option value="Super Admin">Super Admin (All access)</option>
                              <option value="Manager">Manager</option>
                              <option value="Receptionist">Receptionist</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Cashier">Cashier</option>
                              <option value="Waiter">Waiter</option>
                              <option value="Housekeeper">Housekeeper</option>
                              <option value="Maintenance Staff">Maintenance Staff</option>
                              <option value="Manual Operator">Manual Operator</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address (Optional)</label>
                          <input
                            type="email"
                            placeholder="e.g. s.connor@resort.com"
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none text-gray-800 dark:text-white"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                          <input
                            type="password"
                            required
                            placeholder="Type a password"
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none text-gray-800 dark:text-white font-mono"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                          />
                        </div>

                        {regError && (
                          <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/20 dark:text-red-400 p-2 rounded border border-red-100 dark:border-red-900/50">{regError}</p>
                        )}

                        {regSuccess && (
                          <p className="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 p-2 rounded border border-emerald-100 dark:border-emerald-900/50 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            <span>{regSuccess}</span>
                          </p>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2 bg-[#E67E22] hover:bg-[#D35400] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 border-none"
                        >
                          <Plus className="h-3.5 w-3.5 text-white" />
                          <span>Register Operator Account</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {db.isIsolatedClient && (
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center space-x-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  <Shield className="h-3 w-3 text-emerald-500" />
                  <span>Secure Private Client Node • {db.settings?.profile?.name || 'Isolated Console'}</span>
                </div>
              )}

              {/* Business Profile Selection & Creation */}
              {!db.isIsolatedClient && (
                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                      Business Profile Management
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block"></span>
                      <span>Active: {db.settings.profile.name}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Select Existing Business dropdown */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Switch to Existing</label>
                      <select
                        value={profiles.find(p => p.active)?.id || ''}
                        onChange={(e) => {
                          const targetId = e.target.value;
                          if (targetId) {
                            const res = store.switchBusiness(targetId);
                            if (res.success) {
                              setLoginError('');
                              setLoginUser('');
                              setLoginPass('');
                            }
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none transition"
                      >
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>
                            🏨 {p.name} {p.active ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Register New Business button */}
                    <div className="flex flex-col justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Do you want to launch the Setup Wizard to register and configure a brand new business/hotel? Your current business data remains safely saved and you can switch back at any time.')) {
                            store.prepareAddNewBusiness();
                          }
                        }}
                        className="w-full px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 font-bold rounded-lg text-xs cursor-pointer transition text-center flex items-center justify-center space-x-1"
                      >
                        <Building className="h-3.5 w-3.5" />
                        <span>+ Register New Business</span>
                      </button>
                    </div>
                  </div>

                  {/* Show list of registered business profiles for quick access if multiple */}
                  {profiles.length > 1 && (
                    <div className="bg-gray-50 dark:bg-gray-950 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1.5">
                      <span className="block text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Quick Switch Between Saved Businesses:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profiles.map(p => (
                          <div key={p.id} className="inline-flex items-center bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-150 dark:border-gray-700 text-[10px] font-semibold shadow-xs space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                store.switchBusiness(p.id);
                              }}
                              className={`hover:text-blue-500 transition cursor-pointer truncate max-w-[130px] ${p.active ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-600 dark:text-gray-300'}`}
                              title={`Switch to ${p.name}`}
                            >
                              🏨 {p.name}
                            </button>
                            {!p.active && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to completely delete the business profile "${p.name}"? This will delete all its local records!`)) {
                                    store.deleteBusiness(p.id);
                                  }
                                }}
                                className="text-red-400 hover:text-red-600 font-black px-0.5 ml-1 transition cursor-pointer"
                                title="Delete profile"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Registered Staff Accounts Directory & Tracker */}
          <div className="md:w-4/12 bg-gray-50/50 dark:bg-gray-950/40 p-6 flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-gray-800 dark:text-white mb-1">
                  <Users className="h-5 w-5 text-[#1B4F72]" />
                  <h3 className="text-sm font-bold tracking-tight">Active Accounts Directory</h3>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-400">
                  Track accounts created inside this hotel. Switch or click to log in with different role access.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative mb-3.5">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff, usernames, roles..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none text-gray-800 dark:text-white"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
              </div>

              {/* Accounts List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[280px] md:max-h-[380px] pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {filteredUsersForLogin.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
                    No matching staff accounts found
                  </div>
                ) : (
                  filteredUsersForLogin.map((u: any) => (
                    <div
                      key={u.id}
                      className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-150 dark:border-gray-750/80 shadow-2xs hover:shadow-sm transition-all duration-150 flex flex-col space-y-2 justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="text-lg shrink-0" role="img" aria-label="avatar">
                            {getRoleEmoji(u.role)}
                          </span>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-gray-800 dark:text-white truncate">
                              {u.name}
                            </span>
                            <span className="block text-[10px] text-gray-400 dark:text-gray-400 truncate">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-100 dark:border-gray-750">
                        <div className="font-mono text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                          <span className="font-sans font-semibold text-gray-400">🔑 Pass:</span>
                          <span className="bg-gray-100 dark:bg-gray-750 px-1 rounded font-bold text-gray-600 dark:text-gray-300">
                            {u.passwordHash}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to permanently delete the registered staff account "${u.name}" (@${u.username})?`)) {
                                const res = store.deleteUser(u.id);
                                if (!res.success) {
                                  alert(res.error);
                                }
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition cursor-pointer border-none bg-transparent flex items-center justify-center"
                            title="Delete registered account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              const res = store.login(u.username, u.passwordHash);
                              if (res.success) {
                                setLoginError('');
                                setLoginUser('');
                                setLoginPass('');
                              }
                            }}
                            className="px-2.5 py-1 bg-[#1B4F72] hover:bg-[#E67E22] text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center space-x-1 shadow-sm border-none"
                          >
                            <span>⚡ 1-Click Login</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-[9px] text-center text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-150 dark:border-gray-850">
              Accounts list is kept secure locally. Profiles are synced to active tabs.
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Active view component
  const CurrentViewComponent = (tabs.find(t => t.id === activeTab)?.component || Dashboard) as any;
  const CurrentView = <CurrentViewComponent initialTab={routeConfig.subTab} />;

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-gray-950 flex flex-col font-sans text-gray-800 dark:text-gray-100 transition-colors duration-150">
      
      {/* HEADER BAR */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <button
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="p-2 bg-[#E67E22] text-white rounded-xl">
            <Building className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold font-editorial block leading-tight text-[#1B4F72] dark:text-white tracking-tight">{db.settings.profile.name}</span>
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">{db.settings.profile.slogan}</span>
          </div>
        </div>

        {/* Right Actions controls */}
        <div className="flex items-center space-x-4">
          
          {/* Theme control */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-300 rounded-xl cursor-pointer"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-300 rounded-xl cursor-pointer relative"
              title="Operational alerts"
            >
              <Bell className="h-4.5 w-4.5" />
              {db.notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-2xl overflow-hidden z-50">
                <div className="p-3.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-150 dark:border-gray-600 flex items-center justify-between">
                  <strong className="text-xs text-gray-800 dark:text-white">Operations Notifications ({db.notifications.length})</strong>
                  <button
                    onClick={handleClearNotifications}
                    className="text-[10px] font-bold text-[#E67E22] hover:text-[#D35400] cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {db.notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">All facilities are operating cleanly.</div>
                  ) : (
                    db.notifications.map(n => (
                      <div key={n.id} className="p-3 text-xs flex flex-col space-y-0.5">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{n.message}</span>
                        <span className="text-[9px] text-gray-400 font-mono">{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile with simple role badge */}
          <div className="flex items-center space-x-2.5 border-l border-gray-150 dark:border-gray-800 pl-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-gray-800 dark:text-white block">{activeUser.name}</span>
              <span className="text-[10px] text-gray-400 font-bold block uppercase">{activeUser.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-xl cursor-pointer"
              title="Secure Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>

        </div>

      </header>

      {/* WORKSPACE AREA */}
      <div className="flex-grow flex relative">
        
        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-[#1B4F72] dark:bg-gray-950 border-r border-[#153E5B] dark:border-gray-800 p-4 flex flex-col justify-between hidden md:flex shrink-0 text-white/80 h-[calc(100vh-70px)] sticky top-[70px]">
          <div className="overflow-y-auto flex-grow space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-3 block mb-4">Operations Console</span>
            
            <nav className="space-y-1">
              {allowedTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-white/10 text-white shadow-sm border-r-4 border-[#E67E22] rounded-r-none'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-[#E67E22]" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar bottom business switching panel */}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3 shrink-0">
            {!db.isIsolatedClient && (
              <>
                <div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest pl-1 block mb-1.5">Switch Business / Hotel</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {profiles.map(p => (
                      <div key={p.id} className="group flex items-center justify-between rounded-lg px-2 py-1 text-xs transition bg-white/5 hover:bg-white/10">
                        <button
                          type="button"
                          disabled={p.active}
                          onClick={() => {
                            if (confirm(`Switch console environment to "${p.name}"?`)) {
                              store.switchBusiness(p.id);
                            }
                          }}
                          className={`truncate text-left flex-grow font-semibold flex items-center space-x-1.5 transition ${p.active ? 'text-white font-bold' : 'text-white/60 hover:text-white cursor-pointer'}`}
                          title={p.name}
                        >
                          <span className="text-xs">🏨</span>
                          <span className="truncate">{p.name}</span>
                        </button>
                        {p.active ? (
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to completely delete business "${p.name}"?`)) {
                                store.deleteBusiness(p.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs font-black px-1 cursor-pointer"
                            title="Delete profile"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Transition to the Setup Wizard to register a new business or hotel? Your current records are saved.')) {
                        store.prepareAddNewBusiness();
                      }
                    }}
                    className="w-full py-1.5 bg-[#E67E22] hover:bg-[#D35400] text-white font-bold rounded-lg text-[10px] transition cursor-pointer text-center block"
                  >
                    + Add Other Business
                  </button>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-1.5 bg-red-600/25 hover:bg-red-600/40 text-red-200 border border-red-500/30 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout Terminal</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE SIDEBAR MODAL OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex">
            <div className="w-64 bg-white dark:bg-gray-900 h-full p-5 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-bold text-gray-800 dark:text-white font-editorial">Hotel OS Menu</span>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {allowedTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold ${
                          activeTab === tab.id
                            ? 'bg-[#1B4F72] text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs space-y-4">
                {!db.isIsolatedClient && (
                  <>
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Switch Business / Hotel</span>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {profiles.map(p => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 text-xs font-semibold">
                            <button
                              type="button"
                              disabled={p.active}
                              onClick={() => {
                                if (confirm(`Switch console to "${p.name}"?`)) {
                                  store.switchBusiness(p.id);
                                  setMobileMenuOpen(false);
                                }
                              }}
                              className={`truncate text-left flex-grow transition ${
                                p.active
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : 'text-gray-600 dark:text-gray-300'
                              }`}
                            >
                              🏨 {p.name}
                            </button>
                            {p.active ? (
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Completely delete business "${p.name}"?`)) {
                                    store.deleteBusiness(p.id);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-black px-1"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Create and register another business or hotel? Current data is saved.')) {
                            store.prepareAddNewBusiness();
                            setMobileMenuOpen(false);
                          }
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        <span>+ Add Other Business</span>
                      </button>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition cursor-pointer border border-red-200 dark:border-red-900/30"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout Terminal</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span>Logged in: <strong className="text-gray-800 dark:text-white">{activeUser.name}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN MODULE STAGE */}
        <main className="flex-grow p-6 overflow-y-auto max-h-[calc(100vh-70px)]">
          {CurrentView}
        </main>

      </div>

    </div>
  );
}
