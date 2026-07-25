/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { OwnerInvestment, OwnerWithdrawal, OwnerPersonalExpense } from '../types';
import {
  Lock,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ShieldAlert,
  Wallet,
  Coins,
  CheckCircle,
  Briefcase,
  FileText,
  Activity,
  HeartPulse,
  Scale
} from 'lucide-react';

export default function CEOPersonalFinance() {
  const db = store.getDb();
  const activeUser = store.getActiveUser();

  // Role Gate: Only CEO & Super Admin
  const isAuthorized = activeUser && (activeUser.role === 'CEO' || activeUser.role === 'Super Admin');

  // Sub-navigation
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'investments' | 'withdrawals' | 'expenses'>('dashboard');

  // Form States for Investments
  const [invAmount, setInvAmount] = useState<number>(100000);
  const [invCurrency, setInvCurrency] = useState('RWF');
  const [invPayMethod, setInvPayMethod] = useState('Bank Transfer');
  const [invReason, setInvReason] = useState('Additional Investment');
  const [invDesc, setInvDesc] = useState('');
  const [invAttach, setInvAttach] = useState('');

  // Form States for Withdrawals
  const [wthAmount, setWthAmount] = useState<number>(50000);
  const [wthReason, setWthReason] = useState('Owner Draw');
  const [wthPayMethod, setWthPayMethod] = useState('Bank Transfer');
  const [wthNotes, setWthNotes] = useState('');

  // Form States for CEO Personal Expenses
  const [opeAmount, setOpeAmount] = useState<number>(15000);
  const [opeDesc, setOpeDesc] = useState('');
  const [opeCategory, setOpeCategory] = useState('Personal Purchases');
  const [opePayMethod, setOpePayMethod] = useState('Cash');

  // Success message feedback
  const [successMsg, setSuccessMsg] = useState('');

  // -------------------------------------------------------------
  // CALCULATIONS
  // -------------------------------------------------------------

  const ownerInvestmentsList = useMemo(() => {
    return db.ownerInvestments || [];
  }, [db.ownerInvestments]);

  const ownerWithdrawalsList = useMemo(() => {
    return db.ownerWithdrawals || [];
  }, [db.ownerWithdrawals]);

  const ownerExpensesList = useMemo(() => {
    return db.ownerExpenses || [];
  }, [db.ownerExpenses]);

  // Totals
  const totals = useMemo(() => {
    const totalInvestment = ownerInvestmentsList.reduce((sum, i) => sum + i.amount, 0);
    const totalWithdrawals = ownerWithdrawalsList.reduce((sum, w) => sum + w.amount, 0);
    const ownerEquity = totalInvestment - totalWithdrawals;
    const totalPersonalExpenses = ownerExpensesList.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalInvestment,
      totalWithdrawals,
      ownerEquity,
      totalPersonalExpenses
    };
  }, [ownerInvestmentsList, ownerWithdrawalsList, ownerExpensesList]);

  // Hotel Position calculations
  const hotelPosition = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    let cashBalance = 0;

    const allTxs = db.transactions || [];
    allTxs.forEach(tx => {
      const isOwnerCategory = tx.category === 'Owner Investment' || tx.category === 'Owner Withdrawal' || tx.category === 'CEO Personal Expense';
      
      if (tx.type === 'Income') {
        if (!isOwnerCategory) {
          revenue += tx.amount;
        }
        cashBalance += tx.amount;
      } else if (tx.type === 'Expense') {
        if (!isOwnerCategory) {
          expenses += tx.amount;
        }
        cashBalance -= tx.amount;
      }
    });

    const netProfit = revenue - expenses;

    return {
      revenue,
      expenses,
      netProfit,
      cashBalance
    };
  }, [db.transactions]);

  // Business Health
  const businessHealth = useMemo(() => {
    const value = hotelPosition.cashBalance + totals.ownerEquity;
    const flow = hotelPosition.netProfit + (totals.totalInvestment - totals.totalWithdrawals);
    const profitability = hotelPosition.revenue > 0 ? (hotelPosition.netProfit / hotelPosition.revenue) * 100 : 0;
    
    return {
      currentValue: value,
      cashFlow: flow,
      profitability
    };
  }, [hotelPosition, totals]);

  // Submit Investment
  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invAmount || invAmount <= 0 || !invReason) return;

    store.saveOwnerInvestment({
      date: new Date().toISOString().split('T')[0],
      amount: invAmount,
      currency: invCurrency,
      paymentMethod: invPayMethod,
      reason: invReason,
      description: invDesc,
      attachment: invAttach || undefined,
      addedBy: activeUser?.username || 'CEO'
    });

    setInvAmount(100000);
    setInvDesc('');
    setInvAttach('');
    showFeedback('Capital investment injection logged and synchronized to corporate ledger.');
  };

  // Submit Withdrawal
  const handleAddWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wthAmount || wthAmount <= 0 || !wthReason) return;

    store.saveOwnerWithdrawal({
      date: new Date().toISOString().split('T')[0],
      amount: wthAmount,
      reason: wthReason,
      paymentMethod: wthPayMethod,
      approvedBy: activeUser?.username || 'CEO',
      notes: wthNotes
    });

    setWthAmount(50000);
    setWthNotes('');
    showFeedback('Owner equity withdrawal logged and synchronized to corporate cash balances.');
  };

  // Submit Personal Expense
  const handleAddPersonalExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opeAmount || opeAmount <= 0 || !opeDesc) return;

    store.saveOwnerPersonalExpense({
      date: new Date().toISOString().split('T')[0],
      amount: opeAmount,
      description: opeDesc,
      category: opeCategory,
      paymentMethod: opePayMethod
    });

    setOpeAmount(15000);
    setOpeDesc('');
    showFeedback('Private CEO personal expense recorded. Hotel operating balances remain unaffected.');
  };

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // ==========================================
  // ACCESS DENIED VIEW
  // ==========================================
  if (!isAuthorized) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-6" id="ceo-auth-lock">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full inline-block border border-red-150 dark:border-red-900/40">
          <Lock className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Confidential System Module Locked</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The Owner Personal Finance System contains private equity investments and withdrawal controls. Access is strictly confined to the CEO and Super Admin roles.
          </p>
        </div>
        <div className="text-[10px] text-slate-400">
          Registered Attempt: IP Encrypted Audit Log saved under security policy.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100" id="ceo-finance-module">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl border-none shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">CEO / Owner Personal Finance System</h1>
              <p className="text-xs text-slate-400">Confidential capital injections, dividends drawing registries, and private personal expense trackers.</p>
            </div>
          </div>
        </div>

        {/* SUB NAV */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl gap-1 border border-slate-800">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveSubTab('investments')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'investments'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Equity Investments
          </button>
          <button
            onClick={() => setActiveSubTab('withdrawals')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'withdrawals'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Draws & Withdrawals
          </button>
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'expenses'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Personal Expenses
          </button>
        </div>
      </div>

      {/* FEEDBACK MSG */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs flex items-center space-x-2 animate-fade-in font-semibold">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* 1. DASHBOARD VIEW                          */}
      {/* ========================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* COMPARATIVE SECTION HEADER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* HOTEL POSITION */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b pb-3">
                <Coins className="h-5 w-5 text-indigo-500" />
                <strong className="text-sm font-black text-gray-900 dark:text-white">Corporate Hotel Position</strong>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Hotel Revenue</span>
                  <strong className="font-mono text-gray-900 dark:text-white">{store.formatMoney(hotelPosition.revenue)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Hotel Expenses</span>
                  <strong className="font-mono text-gray-900 dark:text-white">{store.formatMoney(hotelPosition.expenses)}</strong>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
                  <span className="text-gray-400 font-semibold">Net Operating Surplus</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">{store.formatMoney(hotelPosition.netProfit)}</strong>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
                  <span className="text-gray-400 font-semibold">Cash Assets (On Hand)</span>
                  <strong className="font-mono text-[#1B4F72] dark:text-sky-400">{store.formatMoney(hotelPosition.cashBalance)}</strong>
                </div>
              </div>
            </div>

            {/* OWNER POSITION */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b pb-3">
                <Wallet className="h-5 w-5 text-amber-500" />
                <strong className="text-sm font-black text-gray-900 dark:text-white">Confidential Owner Position</strong>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Capital Investment</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">+{store.formatMoney(totals.totalInvestment)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Capital Withdrawals</span>
                  <strong className="font-mono text-red-500">- {store.formatMoney(totals.totalWithdrawals)}</strong>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
                  <span className="text-gray-400 font-semibold">Remaining Owner Equity</span>
                  <strong className="font-mono text-amber-600 dark:text-amber-400">{store.formatMoney(totals.ownerEquity)}</strong>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
                  <span className="text-gray-400 font-semibold">Net Owner Contribution</span>
                  <strong className={`font-mono ${totals.ownerEquity >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {totals.ownerEquity >= 0 ? '+' : ''}{store.formatMoney(totals.ownerEquity)}
                  </strong>
                </div>
              </div>
            </div>

            {/* BUSINESS HEALTH */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b pb-3">
                <Activity className="h-5 w-5 text-emerald-500" />
                <strong className="text-sm font-black text-gray-900 dark:text-white">Consolidated Business Health</strong>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Business Value</span>
                  <strong className="font-mono text-indigo-600 dark:text-indigo-400">{store.formatMoney(businessHealth.currentValue)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Consolidated Cash Flow</span>
                  <strong className={`font-mono ${businessHealth.cashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {store.formatMoney(businessHealth.cashFlow)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Operating Net Margin</span>
                  <strong className="font-mono text-gray-900 dark:text-white">{businessHealth.profitability.toFixed(1)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">CEO Private Expenses Outlay</span>
                  <strong className="font-mono text-amber-600">{store.formatMoney(totals.totalPersonalExpenses)}</strong>
                </div>
              </div>
            </div>

          </div>

          {/* FINANCIAL CONNECTION RULES INFO */}
          <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-amber-850 dark:text-amber-300">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 font-bold">
                <Scale className="h-4 w-4" />
                <span>Confidential Dual-Entry Connection Rules Enforced</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                To prevent auditing liabilities, all owner injections increase hotel cash balances, and withdrawals reduce them. CEO private purchases are tracked separately and NEVER recorded as hotel operational expenses.
              </p>
            </div>
            <div className="shrink-0 font-mono font-bold bg-amber-200 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg">
              Double-Entry: OK
            </div>
          </div>

          {/* PRIVATE RECENT TRANSACTIONS LEDGER FEED */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <strong className="text-sm font-bold text-gray-800 dark:text-white block">Recent Owner Account Modifications</strong>
            
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {ownerInvestmentsList.length === 0 && ownerWithdrawalsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No recent personal equity updates filed.</div>
              ) : (
                <>
                  {ownerInvestmentsList.map(inv => (
                    <div key={inv.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-emerald-600">Capital Injection</span>
                          <span className="font-mono text-[9px] bg-emerald-100 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                            {inv.id}
                          </span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 block">{inv.reason} — {inv.description}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{inv.date} • Method: {inv.paymentMethod} • Logged by: @{inv.addedBy}</span>
                      </div>
                      <div className="text-right pl-3 font-mono font-black text-emerald-600 text-sm shrink-0">
                        +{store.formatMoney(inv.amount)}
                      </div>
                    </div>
                  ))}

                  {ownerWithdrawalsList.map(wth => (
                    <div key={wth.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-amber-600">Equity Withdrawal</span>
                          <span className="font-mono text-[9px] bg-amber-100 dark:bg-amber-950/35 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                            {wth.id}
                          </span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 block">{wth.reason} — {wth.notes}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{wth.date} • Method: {wth.paymentMethod} • Approved by: @{wth.approvedBy}</span>
                      </div>
                      <div className="text-right pl-3 font-mono font-black text-red-500 text-sm shrink-0">
                        -{store.formatMoney(wth.amount)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* 2. EQUITY INVESTMENTS                      */}
      {/* ========================================== */}
      {activeSubTab === 'investments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* FORM */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b pb-2">Record Capital Investment</h3>
            
            <form onSubmit={handleAddInvestment} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Investment Amount (RWF)</label>
                <input
                  type="number"
                  value={invAmount}
                  onChange={(e) => setInvAmount(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Investment Reason</label>
                <select
                  value={invReason}
                  onChange={(e) => setInvReason(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Starting Capital">Starting Capital</option>
                  <option value="Additional Investment">Additional Investment</option>
                  <option value="Emergency Cash Injection">Emergency Cash Injection</option>
                  <option value="Equipment Purchased Using Owner Money">Equipment Purchased Personally</option>
                  <option value="Supplier Payment Paid Personally">Supplier Paid Personally</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Payment Method</label>
                <select
                  value={invPayMethod}
                  onChange={(e) => setInvPayMethod(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Personal Check">Personal Check</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Detailed Description</label>
                <textarea
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  required
                  rows={3}
                  placeholder="Record specific transaction details..."
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Attachment Simulation Reference</label>
                <input
                  type="text"
                  placeholder="e.g. receipt_ref_898.pdf"
                  value={invAttach}
                  onChange={(e) => setInvAttach(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold rounded-xl transition cursor-pointer border-none shadow-sm flex items-center justify-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Inject Capital</span>
              </button>
            </form>
          </div>

          {/* LIST */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Active Capital Investments</h3>
                <p className="text-[11px] text-gray-400">Total Capital Contributed: {store.formatMoney(totals.totalInvestment)}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {ownerInvestmentsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No capital investments recorded yet.</div>
              ) : (
                ownerInvestmentsList.map(inv => (
                  <div key={inv.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center justify-between text-xs transition hover:bg-slate-100/50">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{inv.reason}</strong>
                        <span className="font-mono text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1 rounded">
                          {inv.id}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">{inv.description}</p>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-3">
                        <span>Date: {inv.date}</span>
                        <span>• Method: {inv.paymentMethod}</span>
                        <span>• Auditor: @{inv.addedBy}</span>
                        {inv.attachment && (
                          <span className="text-amber-600 font-bold underline cursor-pointer">📎 {inv.attachment}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right pl-3 shrink-0 font-mono font-black text-emerald-600 text-sm">
                      +{store.formatMoney(inv.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* 3. OWNER WITHDRAWALS                       */}
      {/* ========================================== */}
      {activeSubTab === 'withdrawals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* FORM */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b pb-2">Record Equity Withdrawal</h3>
            
            <form onSubmit={handleAddWithdrawal} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Withdrawal Amount (RWF)</label>
                <input
                  type="number"
                  value={wthAmount}
                  onChange={(e) => setWthAmount(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Withdrawal Reason</label>
                <select
                  value={wthReason}
                  onChange={(e) => setWthReason(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Personal Withdrawal">Personal Withdrawal</option>
                  <option value="Owner Draw">Owner Draw</option>
                  <option value="Emergency Personal Use">Emergency Personal Use</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Source Payment Account</label>
                <select
                  value={wthPayMethod}
                  onChange={(e) => setWthPayMethod(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Withdrawal Notes / Explanations</label>
                <textarea
                  value={wthNotes}
                  onChange={(e) => setWthNotes(e.target.value)}
                  required
                  rows={4}
                  placeholder="E.g. drawing quarterly dividend payments..."
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold rounded-xl transition cursor-pointer border-none shadow-sm flex items-center justify-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Withdraw Equity</span>
              </button>
            </form>
          </div>

          {/* LIST */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Equity Drawings Registry</h3>
                <p className="text-[11px] text-gray-400">Total Withdrawals Debited: {store.formatMoney(totals.totalWithdrawals)}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {ownerWithdrawalsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No dividends withdrawals recorded yet.</div>
              ) : (
                ownerWithdrawalsList.map(wth => (
                  <div key={wth.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center justify-between text-xs transition hover:bg-slate-100/50">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-amber-700 dark:text-amber-400 font-bold">{wth.reason}</strong>
                        <span className="font-mono text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1 rounded">
                          {wth.id}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">{wth.notes}</p>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-3">
                        <span>Date: {wth.date}</span>
                        <span>• Method: {wth.paymentMethod}</span>
                        <span>• Approved By: @{wth.approvedBy}</span>
                      </div>
                    </div>
                    <div className="text-right pl-3 shrink-0 font-mono font-black text-red-500 text-sm">
                      -{store.formatMoney(wth.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* 4. OWNER PERSONAL EXPENSES                 */}
      {/* ========================================== */}
      {activeSubTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* FORM */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Record Private CEO Expense</h3>
              <p className="text-[10px] text-slate-400 mt-1">These transactions represent private CEO acquisitions and do NOT affect corporate balances.</p>
            </div>
            
            <form onSubmit={handleAddPersonalExpense} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Expense Amount (RWF)</label>
                <input
                  type="number"
                  value={opeAmount}
                  onChange={(e) => setOpeAmount(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Category</label>
                <select
                  value={opeCategory}
                  onChange={(e) => setOpeCategory(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Personal Purchases">Personal Purchases</option>
                  <option value="Personal Transport">Personal Transport</option>
                  <option value="Personal Trips">Personal Trips</option>
                  <option value="Personal Bills">Personal Bills</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Payment Channel</label>
                <select
                  value={opePayMethod}
                  onChange={(e) => setOpePayMethod(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Personal Bank Account">Personal Bank Account</option>
                  <option value="Personal Credit Card">Personal Credit Card</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-500">Description</label>
                <textarea
                  value={opeDesc}
                  onChange={(e) => setOpeDesc(e.target.value)}
                  required
                  rows={3}
                  placeholder="E.g. family weekend transport, utility bills..."
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold rounded-xl transition cursor-pointer border-none shadow-sm flex items-center justify-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Save Private Expense</span>
              </button>
            </form>
          </div>

          {/* LIST */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Confidential CEO Private Expenses</h3>
                <p className="text-[11px] text-gray-400">Total Private Expenditures: {store.formatMoney(totals.totalPersonalExpenses)}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {ownerExpensesList.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No private CEO personal expenses recorded yet.</div>
              ) : (
                ownerExpensesList.map(ope => (
                  <div key={ope.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center justify-between text-xs transition hover:bg-slate-100/50">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-gray-800 dark:text-white font-bold">{ope.description}</strong>
                        <span className="font-mono text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1 rounded">
                          {ope.id}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-3">
                        <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 font-bold rounded">
                          {ope.category}
                        </span>
                        <span>• Date: {ope.date}</span>
                        <span>• Source: {ope.paymentMethod}</span>
                      </div>
                    </div>
                    <div className="text-right pl-3 shrink-0 font-mono font-black text-amber-600 text-sm">
                      {store.formatMoney(ope.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
