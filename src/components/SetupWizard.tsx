/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { store } from '../db/store';
import { HotelOSSettings, User } from '../types';
import { Sparkles, Building, Key, Shield, ArrowRight, ArrowLeft } from 'lucide-react';

interface SetupWizardProps {
  onSetupComplete: () => void;
}

export default function SetupWizard({ onSetupComplete }: SetupWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [seedLoading, setSeedLoading] = useState<boolean>(false);

  // Profile State
  const [profileName, setProfileName] = useState('The Grand Hotel');
  const [slogan, setSlogan] = useState('Elevated Hospitality');
  const [phone, setPhone] = useState('+1 (555) 123-4567');
  const [email, setEmail] = useState('info@thegrandhotel.com');
  const [website, setWebsite] = useState('www.thegrandhotel.com');
  const [address, setAddress] = useState('100 Luxury Avenue');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');
  const [taxNumber, setTaxNumber] = useState('TX-100-200');
  const [taxRate, setTaxRate] = useState<number>(15);

  // Structure State
  const [buildingsInput, setBuildingsInput] = useState('Main Wing, Resort Pavilion');
  const [floorsInput, setFloorsInput] = useState('Ground Floor, 1st Floor, 2nd Floor, Penthouse');

  // Admin User State
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [adminName, setAdminName] = useState('Super Admin');
  const [adminEmail, setAdminEmail] = useState('admin@thegrandhotel.com');

  const handleSeedSandbox = () => {
    setSeedLoading(true);
    setTimeout(() => {
      store.seedSandbox();
      setSeedLoading(false);
      onSetupComplete();
    }, 800);
  };

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleCompleteSetup();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCompleteSetup = () => {
    const buildings = buildingsInput.split(',').map(b => b.trim()).filter(b => b.length > 0);
    const floors = floorsInput.split(',').map(f => f.trim()).filter(f => f.length > 0);

    const settings: HotelOSSettings = {
      profile: {
        name: profileName,
        logo: '🏨',
        coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
        slogan,
        phone,
        email,
        website,
        address,
        country,
        currency,
        timeZone: 'UTC',
        taxNumber,
        taxRate
      },
      structure: {
        buildings,
        floors,
        amenities: ['Wi-Fi', 'Swimming Pool', 'Spa', 'Gym', 'Mini Bar', 'Air Conditioning', 'Room Service']
      },
      theme: 'light',
      language: 'en',
      paymentMethods: ['Cash', 'Card', 'Mobile Money'],
      printerName: 'Default Printer',
      autoBackup: true
    };

    const adminUser: User = {
      id: 'usr_admin',
      username: adminUsername,
      passwordHash: adminPassword,
      role: 'Super Admin',
      name: adminName,
      email: adminEmail,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    store.initializeSystem(settings, adminUser);
    onSetupComplete();
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-4">
      {/* Container Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-gray-150 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Welcome Panel */}
        <div className="md:w-1/3 bg-[#1B4F72] text-white p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-xl mb-6">
              <Building className="h-8 w-8 text-[#E67E22]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Hotel OS</h1>
            <p className="text-sm text-gray-200 mt-2">
              The complete enterprise management operating system for professional hospitality operations.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Fast Sandbox Evaluation</h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Want to review the fully completed, connected platform with pre-loaded luxury resort simulator data instantly?
            </p>
            <button
              onClick={handleSeedSandbox}
              disabled={seedLoading}
              className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 bg-[#E67E22] hover:bg-[#D35400] text-white font-medium rounded-lg text-xs transition duration-200 shadow-md shadow-[#E67E22]/10 active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {seedLoading ? 'Generating Sandbox...' : 'Seed Sandbox Simulator'}
            </button>
          </div>
        </div>

        {/* Right Form Wizard Panel */}
        <div className="md:w-2/3 p-8 flex flex-col justify-between">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Setup Wizard • Step {step} of 3
              </span>
              <div className="flex space-x-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                      s <= step ? 'bg-[#1B4F72]' : 'bg-gray-150'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mt-2">
              {step === 1 && 'Configure Hotel Profile'}
              {step === 2 && 'Define Hotel Structures'}
              {step === 3 && 'Create Super Admin Account'}
            </h2>
          </div>

          {/* Steps Content */}
          <div className="flex-grow py-2">
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Hotel Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Slogan</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Website</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Physical Address</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
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
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tax Number (VAT/GST)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Buildings (Comma Separated)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                    value={buildingsInput}
                    onChange={(e) => setBuildingsInput(e.target.value)}
                  />
                  <span className="text-xs text-gray-400 mt-1 block">
                    Define distinct wings or building structures on your property.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Floors (Comma Separated)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                    value={floorsInput}
                    onChange={(e) => setFloorsInput(e.target.value)}
                  />
                  <span className="text-xs text-gray-400 mt-1 block">
                    Map individual floor levels.
                  </span>
                </div>

                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start space-x-3">
                  <Key className="h-5 w-5 text-[#1B4F72] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-[#1B4F72]">Automated System Seeding</h4>
                    <p className="text-[11px] text-gray-500 leading-normal mt-1">
                      Standard room categories (Standard Room, Deluxe suite, Executive Lounge suite, Royal Penthouse)
                      along with essential departments and roles are generated and loaded automatically in this wizard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Admin Full Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Admin Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Super Admin Username</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800 font-mono"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Super Admin Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-gray-800 font-mono"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Use these credentials on the main login screen to log into the Super Admin console.
                  </span>
                </div>

                <div className="bg-[#FFF5EB] rounded-xl p-4 border border-[#FFE8D1] flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-[#E67E22] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-[#D35400]">Super Admin Privileges</h4>
                    <p className="text-[11px] text-gray-500 leading-normal mt-1">
                      You will have uninhibited, absolute global read-write permissions, access to all financial records, audit trail explorers, and database backup protocols. Keep your credentials safe.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-150">
            {step > 1 ? (
              <button
                onClick={handlePrevStep}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-800 transition duration-150 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNextStep}
              className="inline-flex items-center justify-center px-5 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white font-medium rounded-lg text-sm transition duration-150 active:scale-[0.98] cursor-pointer"
            >
              {step === 3 ? 'Complete Setup' : 'Continue'}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
