/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { store } from '../db/store';
import { HotelOSSettings } from '../types';
import { navigate } from '../utils/router';
import {
  Settings,
  Plus,
  Trash2,
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  ClipboardList
} from 'lucide-react';

export default function SettingsComponent({ initialTab }: { initialTab?: 'profile' | 'structure' | 'audit' | 'reset' } = {}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'structure' | 'audit' | 'reset'>(initialTab || 'profile');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const db = store.getDb();
  const [profiles, setProfiles] = useState(store.getSavedProfiles());

  // Profile States
  const [name, setName] = useState(db.settings.profile.name);
  const [slogan, setSlogan] = useState(db.settings.profile.slogan);
  const [phone, setPhone] = useState(db.settings.profile.phone);
  const [email, setEmail] = useState(db.settings.profile.email);
  const [website, setWebsite] = useState(db.settings.profile.website);
  const [address, setAddress] = useState(db.settings.profile.address);
  const [taxRate, setTaxRate] = useState<number>(db.settings.profile.taxRate);
  const [currency, setCurrency] = useState(db.settings.profile.currency);

  // Structure inputs
  const [newBuilding, setNewBuilding] = useState('');
  const [newFloor, setNewFloor] = useState('');

  // ============================================================================
  // OPERATIONS HANDLERS
  // ============================================================================
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: HotelOSSettings = {
      ...db.settings,
      profile: {
        ...db.settings.profile,
        name,
        slogan,
        phone,
        email,
        website,
        address,
        taxRate,
        currency
      }
    };

    store.updateSettings(updatedSettings);
    alert('Hotel Profile updated successfully!');
  };

  const handleAddBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuilding) return;

    const bList = [...db.settings.structure.buildings];
    if (!bList.includes(newBuilding)) {
      bList.push(newBuilding);
      const updated: HotelOSSettings = {
        ...db.settings,
        structure: {
          ...db.settings.structure,
          buildings: bList
        }
      };
      store.updateSettings(updated);
      setNewBuilding('');
    }
  };

  const handleRemoveBuilding = (b: string) => {
    const updated: HotelOSSettings = {
      ...db.settings,
      structure: {
        ...db.settings.structure,
        buildings: db.settings.structure.buildings.filter(x => x !== b)
      }
    };
    store.updateSettings(updated);
  };

  const handleAddFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloor) return;

    const fList = [...db.settings.structure.floors];
    if (!fList.includes(newFloor)) {
      fList.push(newFloor);
      const updated: HotelOSSettings = {
        ...db.settings,
        structure: {
          ...db.settings.structure,
          floors: fList
        }
      };
      store.updateSettings(updated);
      setNewFloor('');
    }
  };

  const handleRemoveFloor = (f: string) => {
    const updated: HotelOSSettings = {
      ...db.settings,
      structure: {
        ...db.settings.structure,
        floors: db.settings.structure.floors.filter(x => x !== f)
      }
    };
    store.updateSettings(updated);
  };

  const handleSystemReset = () => {
    if (confirm('Are you absolutely sure you want to purge the local database state? This cannot be undone.')) {
      localStorage.removeItem('hotel_os_db');
      window.location.reload();
    }
  };

  const handleReSeedSandbox = () => {
    if (confirm('Re-seeding will clear current changes and pre-load simulated resort data. Proceed?')) {
      store.seedSandbox();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-[#1B4F72] dark:text-blue-300 rounded-xl">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-editorial text-gray-800 dark:text-white">Global Administration Settings</h1>
            <p className="text-xs text-gray-400 dark:text-gray-300">Configure core profile policies, structural configurations, re-seed sandboxes, and inspect audit logs.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/settings')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-150 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Hotel Profile Settings
          </button>
          <button
            onClick={() => navigate('/system-settings')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'structure'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-150 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Structural Layouts
          </button>
          <button
            onClick={() => navigate('/audit')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-150 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Tamper-Proof Audit logs
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'reset'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-150 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            System & Recovery
          </button>
        </div>
      </div>

      {/* TAB 1: HOTEL PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm">
          <h3 className="text-sm font-bold font-editorial text-gray-800 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700 mb-6">Modify Hotel Parameters</h3>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hotel Corporate Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Corporate Slogan</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Contact</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Corporate Website</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Physical Location Address</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Base Currency</label>
                <select
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="RWF">RWF (FRw)</option>
                  <option value="KES">KES (KSh)</option>
                  <option value="UGX">UGX (USh)</option>
                  <option value="TZS">TZS (TSh)</option>
                  <option value="ZAR">ZAR (R)</option>
                  <option value="NGN">NGN (₦)</option>
                  <option value="GHS">GHS (GH₵)</option>
                  <option value="ETB">ETB (Br)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="CHF">CHF (CHF)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CNY">CNY (¥)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="AED">AED (AED)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Government Tax Rate Policy (%)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs flex items-center transition cursor-pointer"
            >
              <Save className="h-4 w-4 mr-1.5" /> Save Profile Configurations
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: STRUCTURAL LAYOUTS */}
      {activeTab === 'structure' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Building wings control */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-editorial text-gray-800 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700">Configure Buildings / Wings</h3>
            <form onSubmit={handleAddBuilding} className="flex space-x-2">
              <input
                type="text"
                required
                placeholder="e.g. West Wing Annex"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-white focus:outline-none"
                value={newBuilding}
                onChange={(e) => setNewBuilding(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
              >
                Add Wing
              </button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {db.settings.structure.buildings.map(b => (
                <div key={b} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-lg border border-gray-150 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <span>{b}</span>
                  <button onClick={() => handleRemoveBuilding(b)} className="text-red-400 hover:text-red-600 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Floor level control */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-editorial text-gray-800 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700">Configure Floor Levels</h3>
            <form onSubmit={handleAddFloor} className="flex space-x-2">
              <input
                type="text"
                required
                placeholder="e.g. 5th Floor"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-white focus:outline-none"
                value={newFloor}
                onChange={(e) => setNewFloor(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
              >
                Add Floor
              </button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {db.settings.structure.floors.map(f => (
                <div key={f} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-lg border border-gray-150 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <span>{f}</span>
                  <button onClick={() => handleRemoveFloor(f)} className="text-red-400 hover:text-red-600 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: TAMPER-PROOF AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
            <h3 className="text-sm font-bold font-editorial text-gray-800 dark:text-white">Master Operations Chronicles</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-300 mt-0.5">Continuous system audit logs chronicling every staff action, check-in, checkout, dining POS purchase, and general ledger journal posting.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-150 dark:border-gray-700 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-700/50">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor / Employee ID</th>
                  <th className="py-2.5 px-3">Operational Module</th>
                  <th className="py-2.5 px-3">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-medium text-gray-600 dark:text-gray-300">
                {db.auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-3 font-mono text-[10px] text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-3 font-semibold text-gray-800 dark:text-white">{log.userId}</td>
                    <td className="py-3 px-3">
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2.5 py-0.5 rounded text-[10px] font-bold">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-200 text-xs">{log.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RESET & SYSTEM */}
      {activeTab === 'reset' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-6">
          <h3 className="text-sm font-bold font-editorial text-gray-800 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700">Database & Recovery Operations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 rounded-2xl space-y-3">
              <strong className="text-red-700 dark:text-red-400 text-sm block font-editorial">Factory Reset Database</strong>
              <p className="text-xs text-gray-500 dark:text-gray-300 leading-normal">
                This operation clears all current tables, transactions, employee rosters, and invoices in local storage, returning the system to the initial Super Admin Wizard.
              </p>
              <button
                onClick={handleSystemReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" /> Purge Local DB
              </button>
            </div>

            <div className="p-5 border border-[#FFE8D1] dark:border-orange-950/50 bg-orange-50/10 dark:bg-orange-950/10 rounded-2xl space-y-3">
              <strong className="text-gray-800 dark:text-gray-200 text-sm block font-editorial">Re-seed Simulated Resort</strong>
              <p className="text-xs text-gray-500 dark:text-gray-300 leading-normal">
                Overwrites current settings to seed the simulated Grand Horizon Resort data model (rooms, guests, dining items, historical ledger lines, staff contracts) for seamless immediate evaluation.
              </p>
              <button
                onClick={handleReSeedSandbox}
                className="px-4 py-2 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-xl text-xs font-bold transition flex items-center cursor-pointer"
              >
                <Sparkles className="h-4 w-4 mr-1.5" /> Re-Seed Sandbox Simulator
              </button>
            </div>
          </div>

          {/* Delete Saved Business Profiles Forever */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              <h4 className="text-sm font-bold font-editorial">Delete Registered Businesses Forever</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Permanently delete other registered business/hotel profiles from this device's local storage. This action is irreversible and deletes all associated rooms, orders, settings, and ledger history for that profile.
            </p>

            {profiles.length <= 1 ? (
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-150 dark:border-gray-700 text-center text-xs text-gray-400 dark:text-gray-400 font-semibold">
                No other business profiles registered on this device.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profiles.map(p => (
                  <div 
                    key={p.id} 
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                      p.active 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30' 
                        : 'bg-white dark:bg-gray-850/20 border-gray-250 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-900/40'
                    }`}
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-gray-800 dark:text-white truncate">{p.name}</span>
                        {p.active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">ID: {p.id}</span>
                    </div>

                    {!p.active ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`⚠️ CRITICAL ACTION: Are you absolutely certain you want to permanently delete the business profile "${p.name}"? All room states, reservation ledgers, POS orders, and configuration profiles for this business will be DELETED FOREVER. This cannot be undone!`)) {
                            store.deleteBusiness(p.id);
                            setProfiles(store.getSavedProfiles());
                            alert(`Business profile "${p.name}" has been deleted forever.`);
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-lg text-[10px] cursor-pointer transition flex items-center space-x-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete Forever</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 italic pr-1">
                        Cannot Delete Active
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
