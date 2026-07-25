/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { store } from './db/store';
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
import HotelBusinessFinance from './components/HotelBusinessFinance';
import CEOPersonalFinance from './components/CEOPersonalFinance';
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
  Moon,
  Sun,
  Menu,
  X,
  ClipboardList,
  GitPullRequest,
  Waves,
  Printer,
  Coins,
  Wallet,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [db, setDb] = useState(store.getDb());
  const activeUser = store.getActiveUser();
  
  const { routeConfig, navigate } = useRouter();

  const getTabPath = (tabId: string) => {
    switch (tabId) {
      case 'dashboard': return '/dashboard';
      case 'front_office': return '/front-office';
      case 'rooms': return '/rooms';
      case 'dining': return '/restaurant';
      case 'inventory': return '/inventory';
      case 'finance': return '/accounting';
      case 'hotel_finance': return '/hotel-finance';
      case 'ceo_finance': return '/ceo-finance';
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

  // Subscribe to central store
  useEffect(() => {
    const unsubscribeStore = store.subscribe(() => {
      setDb(store.getDb());
    });
    return () => {
      unsubscribeStore();
    };
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
  // ALL MODULE TABS AVAILABLE IN SHARED WORKSPACE
  // ============================================================================
  const tabs = [
    {
      id: 'dashboard',
      label: 'Executive Analytics',
      icon: LayoutDashboard,
      component: Dashboard
    },
    {
      id: 'front_office',
      label: 'Front Desk Office',
      icon: Users,
      component: FrontOffice
    },
    {
      id: 'rooms',
      label: 'Room Inventory',
      icon: Grid,
      component: RoomManagement
    },
    {
      id: 'dining',
      label: 'Food & Dining POS',
      icon: UtensilsCrossed,
      component: RestaurantPOS
    },
    {
      id: 'inventory',
      label: 'Procure & Stock',
      icon: Package,
      component: InventoryPurchasing
    },
    {
      id: 'reports',
      label: 'Shift Reconciliation',
      icon: ClipboardList,
      component: ShiftReporting
    },
    {
      id: 'workflows',
      label: 'Operations Workflows',
      icon: GitPullRequest,
      component: Workflows
    },
    {
      id: 'pool',
      label: 'Swimming Pool Ops',
      icon: Waves,
      component: SwimmingPoolConsole
    },
    {
      id: 'finance',
      label: 'HR & Ledger',
      icon: Sparkles,
      component: HRFinance
    },
    {
      id: 'hotel_finance',
      label: 'Hotel Business Finance',
      icon: Coins,
      component: HotelBusinessFinance
    },
    {
      id: 'ceo_finance',
      label: 'CEO Personal Finance',
      icon: Wallet,
      component: CEOPersonalFinance
    },
    {
      id: 'operations',
      label: 'Operations & Repair',
      icon: Building,
      component: HousekeepingMaintenance
    },
    {
      id: 'printing',
      label: 'Thermal Print Station',
      icon: Printer,
      component: PrinterStation
    },
    {
      id: 'settings',
      label: 'Global Settings',
      icon: Settings,
      component: SettingsComponent
    }
  ];

  const allowedTabs = tabs;

  const handleClearNotifications = () => {
    store.clearNotifications();
  };

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

          {/* System Workspace Status */}
          <div className="flex items-center space-x-2.5 border-l border-gray-150 dark:border-gray-800 pl-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-gray-800 dark:text-white block">{activeUser.name}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase flex items-center justify-end space-x-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Shared Workspace Active</span>
              </span>
            </div>
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

          {/* Sidebar bottom property status panel */}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2 shrink-0">
            <div className="bg-white/5 rounded-lg p-2.5 text-xs text-white/70 space-y-1">
              <div className="font-bold text-white flex items-center space-x-1.5">
                <span className="text-emerald-400">●</span>
                <span>Sky View Resort Live ERP</span>
              </div>
              <div className="text-[10px] text-white/50">
                Single Shared Database Connection
              </div>
            </div>
          </div>
        </aside>

        {/* MOBILE SIDEBAR MODAL OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex">
            <div className="w-64 bg-white dark:bg-gray-900 h-full p-5 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-bold text-gray-800 dark:text-white font-editorial">Sky View Resort</span>
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

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs space-y-2">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-xs text-gray-600 dark:text-gray-300">
                  <div className="font-bold text-gray-800 dark:text-white flex items-center space-x-1.5">
                    <span className="text-emerald-500">●</span>
                    <span>Sky View Resort ERP</span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Live Shared Database Active
                  </div>
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
