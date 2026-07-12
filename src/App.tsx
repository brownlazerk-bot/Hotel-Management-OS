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
  ClipboardList
} from 'lucide-react';

export default function App() {
  const [db, setDb] = useState(store.getDb());
  const [activeUser, setActiveUser] = useState(store.getActiveUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const profiles = store.getSavedProfiles();

  // Login Form States
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

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
  if (!activeUser) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] dark:bg-gray-900 flex flex-col items-center justify-center p-4 transition-colors duration-150">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-150 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row">
          
          {/* Welcome Left bar */}
          <div className="md:w-5/12 bg-[#1B4F72] text-white p-8 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center justify-center p-3.5 bg-white/10 rounded-2xl mb-6">
                <Building className="h-8 w-8 text-[#E67E22]" />
              </div>
              <h1 className="text-3xl font-bold font-editorial tracking-tight">{db.settings.profile.name || 'Hotel OS'}</h1>
              <p className="text-[10px] text-blue-100 mt-2 font-semibold tracking-widest uppercase">
                {db.settings.profile.slogan || 'Complete Property Operations Management Center'}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-xs text-blue-200">
              <p>Certified Secure Terminal • Version 4.0</p>
              <p className="mt-1">All ledger connections and checkout transactions are locally journaled.</p>
            </div>
          </div>

          {/* Form / Direct access */}
          <div className="md:w-7/12 p-8 flex flex-col justify-center">
            <div>
              {isForgotPassword ? (
                <div>
                  <h2 className="text-2xl font-bold font-editorial text-gray-800 dark:text-white mb-1">Reset Admin Password</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-300">Enter emergency credentials to reset the Super Admin password.</p>

                  <form onSubmit={handlePasswordResetSubmit} className="space-y-4 mt-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reset Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. yuskar"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono font-bold"
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
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono font-bold"
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
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono"
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
                        className="flex-1 py-2 bg-gray-150 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition cursor-pointer text-center border border-gray-250 dark:border-gray-600"
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
                  <h2 className="text-2xl font-bold font-editorial text-gray-800 dark:text-white mb-1">Staff Secure Terminal</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-300">Enter secure operator credentials to authorize your console session.</p>

                  <form onSubmit={handleLoginSubmit} className="space-y-4 mt-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. admin, receptionist"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono"
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
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono"
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                      />
                    </div>

                    {loginError && (
                      <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/20 dark:text-red-400 p-2 rounded border border-red-100 dark:border-red-900/50">{loginError}</p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Authorize Connection</span>
                    </button>
                  </form>
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
                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700 space-y-4">
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
                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none transition"
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
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1.5">
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

        </div>
      </div>
    );
  }

  // Active view component
  const CurrentView = tabs.find(t => t.id === activeTab)?.component || Dashboard;

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
          <CurrentView />
        </main>

      </div>

    </div>
  );
}
