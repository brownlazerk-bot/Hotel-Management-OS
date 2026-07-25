/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { Transaction, Account } from '../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Search,
  Filter,
  FileText,
  PieChart as PieIcon,
  Check,
  AlertTriangle,
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  Percent,
  Download,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function HotelBusinessFinance() {
  const db = store.getDb();
  const activeUser = store.getActiveUser();

  // Navigation Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'cashbook' | 'reports' | 'analytics'>('dashboard');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterPayMethod, setFilterPayMethod] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterYear, setFilterYear] = useState('2026');
  const [filterMonth, setFilterMonth] = useState('All');

  // Selected Report State
  const [selectedReport, setSelectedReport] = useState<
    | 'p_and_l'
    | 'income_stmt'
    | 'cash_flow'
    | 'balance_sheet'
    | 'general_ledger'
    | 'trial_balance'
    | 'expense_rpt'
    | 'revenue_rpt'
    | 'dept_rpt'
    | 'tax_rpt'
  >('p_and_l');

  // -------------------------------------------------------------
  // DATA CALCULATIONS & PROCESSING
  // -------------------------------------------------------------

  // Filter out CEO personal transactions and separate from standard operations if needed
  // Note: Owner investments/withdrawals are listed in Cashbook, but treated specifically in reports/dashboards
  const allTransactions = useMemo(() => {
    return db.transactions || [];
  }, [db.transactions]);

  // Compute standard Cashbook with dynamic running balance
  // Since transactions are unshifted (newest first) in db, we must reverse to calculate running balance, then reverse back
  const cashbookEntries = useMemo(() => {
    const reversed = [...allTransactions].reverse();
    let currentBalance = 0;
    
    return reversed.map(tx => {
      if (tx.type === 'Income') {
        currentBalance += tx.amount;
      } else if (tx.type === 'Expense') {
        currentBalance -= tx.amount;
      }
      return {
        ...tx,
        runningBalance: currentBalance
      };
    }).reverse();
  }, [allTransactions]);

  // Apply filters to cashbook
  const filteredCashbook = useMemo(() => {
    return cashbookEntries.filter(tx => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear().toString();
      const txMonthNum = (txDate.getMonth() + 1).toString().padStart(2, '0'); // "01", "02" etc.
      
      const matchesSearch =
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.referenceId && tx.referenceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = filterDept === 'All' || tx.department === filterDept;
      const matchesPayMethod = filterPayMethod === 'All' || tx.paymentMethod === filterPayMethod;
      const matchesCategory = filterCategory === 'All' || tx.category === filterCategory;
      const matchesYear = filterYear === 'All' || txYear === filterYear;
      const matchesMonth = filterMonth === 'All' || txMonthNum === filterMonth;

      return matchesSearch && matchesDept && matchesPayMethod && matchesCategory && matchesYear && matchesMonth;
    });
  }, [cashbookEntries, searchQuery, filterDept, filterPayMethod, filterCategory, filterYear, filterMonth]);

  // Distinct Categories for filter
  const distinctCategories = useMemo(() => {
    const cats = new Set<string>();
    allTransactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [allTransactions]);

  // Distinct Departments
  const distinctDepartments = ['Rooms', 'Food & Beverage', 'Human Resources', 'Maintenance', 'Operations', 'Administrative', 'CEO'];

  // Check role limits
  const userRole = activeUser?.role || 'Guest';
  const isManager = userRole === 'Manager';

  // Core Financial Aggregates
  const aggregates = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    let cashBalance = 0;
    let bankBalance = 0;
    let momoBalance = 0;

    // Exclude Owner Investments and Withdrawals from OPERATIONAL Net Profit
    // but include them in Cash Balances
    allTransactions.forEach(tx => {
      const isOwnerCategory = tx.category === 'Owner Investment' || tx.category === 'Owner Withdrawal' || tx.category === 'CEO Personal Expense';
      
      if (tx.type === 'Income') {
        if (!isOwnerCategory) {
          revenue += tx.amount;
        }
        
        // Asset calculations
        if (tx.paymentMethod === 'Cash') cashBalance += tx.amount;
        else if (tx.paymentMethod === 'Mobile Money') momoBalance += tx.amount;
        else bankBalance += tx.amount;
      } else if (tx.type === 'Expense') {
        if (!isOwnerCategory) {
          expenses += tx.amount;
        }

        // Asset calculations
        if (tx.paymentMethod === 'Cash') cashBalance -= tx.amount;
        else if (tx.paymentMethod === 'Mobile Money') momoBalance -= tx.amount;
        else bankBalance -= tx.amount;
      }
    });

    const grossProfit = revenue - allTransactions
      .filter(tx => tx.type === 'Expense' && tx.category === 'Food Inventory')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const netProfit = revenue - expenses;

    // Accounts Receivable: Pending Bookings / Active Checkins that haven't cleared
    const accountsReceivable = (db.reservations || [])
      .filter(r => r.status === 'Checked In')
      .reduce((sum, r) => sum + (r.totalAmount - r.amountPaid), 0);

    // Accounts Payable: Unpaid Purchase Orders
    const accountsPayable = (db.purchaseOrders || [])
      .filter(po => po.paymentStatus === 'Unpaid')
      .reduce((sum, po) => sum + po.totalAmount, 0);

    return {
      revenue,
      expenses,
      grossProfit,
      netProfit,
      cashBalance,
      bankBalance,
      momoBalance,
      accountsReceivable,
      accountsPayable
    };
  }, [allTransactions, db.reservations, db.purchaseOrders]);

  // Trend data by Date (last 30 days)
  const trendData = useMemo(() => {
    const dailyDataMap: { [date: string]: { date: string; Revenue: number; Expenses: number; Profit: number } } = {};
    
    // Seed last 10 days
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyDataMap[dateStr] = { date: dateStr.slice(-5), Revenue: 0, Expenses: 0, Profit: 0 };
    }

    allTransactions.forEach(tx => {
      const isOwnerCategory = tx.category === 'Owner Investment' || tx.category === 'Owner Withdrawal' || tx.category === 'CEO Personal Expense';
      if (isOwnerCategory) return;

      const dateStr = tx.date;
      const formattedDate = dateStr.slice(-5); // "MM-DD"
      
      if (!dailyDataMap[dateStr]) {
        dailyDataMap[dateStr] = { date: formattedDate, Revenue: 0, Expenses: 0, Profit: 0 };
      }

      if (tx.type === 'Income') {
        dailyDataMap[dateStr].Revenue += tx.amount;
      } else {
        dailyDataMap[dateStr].Expenses += tx.amount;
      }
      dailyDataMap[dateStr].Profit = dailyDataMap[dateStr].Revenue - dailyDataMap[dateStr].Expenses;
    });

    return Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  }, [allTransactions]);

  // Department Performance data
  const departmentData = useMemo(() => {
    const deptMap: { [dept: string]: { name: string; Revenue: number; Expenses: number } } = {};
    
    distinctDepartments.forEach(d => {
      deptMap[d] = { name: d, Revenue: 0, Expenses: 0 };
    });

    allTransactions.forEach(tx => {
      const dept = tx.department || 'Administrative';
      if (!deptMap[dept]) {
        deptMap[dept] = { name: dept, Revenue: 0, Expenses: 0 };
      }
      if (tx.type === 'Income') {
        deptMap[dept].Revenue += tx.amount;
      } else {
        deptMap[dept].Expenses += tx.amount;
      }
    });

    return Object.values(deptMap);
  }, [allTransactions]);

  // Expenses Breakdown by Category (Pie Chart)
  const expenseCategoryData = useMemo(() => {
    const catMap: { [cat: string]: number } = {};
    allTransactions.forEach(tx => {
      if (tx.type === 'Expense' && tx.category !== 'Owner Withdrawal') {
        catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
      }
    });

    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [allTransactions]);

  const COLORS = ['#1B4F72', '#2E86C1', '#F39C12', '#E67E22', '#27AE60', '#8E44AD', '#C0392B', '#16A085', '#7F8C8D'];

  // -------------------------------------------------------------
  // REPORTS GENERATOR METRIC CALCULATORS
  // -------------------------------------------------------------

  const reportView = useMemo(() => {
    // Collect report lines
    const operationalIncomeTxs = allTransactions.filter(t => t.type === 'Income' && t.category !== 'Owner Investment');
    const operationalExpenseTxs = allTransactions.filter(t => t.type === 'Expense' && t.category !== 'Owner Withdrawal');

    const roomRev = operationalIncomeTxs.filter(t => t.category === 'Room Revenue').reduce((s, t) => s + t.amount, 0);
    const restRev = operationalIncomeTxs.filter(t => t.category === 'Restaurant Revenue').reduce((s, t) => s + t.amount, 0);
    const laundryRev = operationalIncomeTxs.filter(t => t.description.toLowerCase().includes('laundry')).reduce((s, t) => s + t.amount, 0);
    const poolRev = operationalIncomeTxs.filter(t => t.description.toLowerCase().includes('pool')).reduce((s, t) => s + t.amount, 0);
    const otherRev = operationalIncomeTxs.reduce((s, t) => s + t.amount, 0) - roomRev - restRev;

    const payrollExp = operationalExpenseTxs.filter(t => t.category === 'Payroll').reduce((s, t) => s + t.amount, 0);
    const invExp = operationalExpenseTxs.filter(t => t.category === 'Food Inventory').reduce((s, t) => s + t.amount, 0);
    const utilExp = operationalExpenseTxs.filter(t => t.category === 'Utilities').reduce((s, t) => s + t.amount, 0);
    const repairExp = operationalExpenseTxs.filter(t => t.category === 'Repairs').reduce((s, t) => s + t.amount, 0);
    const otherExp = operationalExpenseTxs.reduce((s, t) => s + t.amount, 0) - payrollExp - invExp - utilExp - repairExp;

    const netTax = (roomRev + restRev + otherRev) * 0.18; // 18% standard VAT simulation

    return {
      roomRev,
      restRev,
      laundryRev,
      poolRev,
      otherRev,
      payrollExp,
      invExp,
      utilExp,
      repairExp,
      otherExp,
      netTax
    };
  }, [allTransactions]);

  // -------------------------------------------------------------
  // EXPENSE ANALYTICS PANEL CALCULATORS
  // -------------------------------------------------------------

  const expenseAnalytics = useMemo(() => {
    const expenseTxs = allTransactions.filter(t => t.type === 'Expense' && t.category !== 'Owner Withdrawal');
    const totalExpVal = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

    // Unnecessary expenses
    const unnecessaryList = expenseTxs.filter(t => t.isUnnecessary);
    const unnecessaryTotal = unnecessaryList.reduce((sum, t) => sum + t.amount, 0);

    // Repeated expenses
    const descCount: { [desc: string]: { count: number; total: number; txs: Transaction[] } } = {};
    expenseTxs.forEach(t => {
      const key = `${t.category}::${t.description.trim()}`;
      if (!descCount[key]) {
        descCount[key] = { count: 0, total: 0, txs: [] };
      }
      descCount[key].count++;
      descCount[key].total += t.amount;
      descCount[key].txs.push(t);
    });

    const repeatedList = Object.entries(descCount)
      .filter(([_, data]) => data.count > 1)
      .map(([key, data]) => {
        const [category, description] = key.split('::');
        return {
          category,
          description,
          count: data.count,
          total: data.total,
          txs: data.txs
        };
      })
      .sort((a, b) => b.total - a.total);

    // Employee related expenses (Payroll + Employee Benefits/Allowances)
    const employeeExpenses = expenseTxs
      .filter(t => t.category === 'Payroll' || t.description.toLowerCase().includes('salary') || t.description.toLowerCase().includes('benefit'))
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpVal,
      unnecessaryList,
      unnecessaryTotal,
      repeatedList,
      employeeExpenses
    };
  }, [allTransactions]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100" id="hotel-finance-module">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Hotel Business Finance System</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Real-time consolidated corporate balance sheets, ledger audits, and cashbooks.</p>
            </div>
          </div>
        </div>

        {/* SUB NAVIGATION TAB SWITCHERS */}
        <div className="flex flex-wrap items-center bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-150 dark:border-gray-800 gap-1">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-[#1B4F72] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveSubTab('cashbook')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'cashbook'
                ? 'bg-[#1B4F72] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Hotel Cashbook
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-[#1B4F72] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Financial Reports
          </button>
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'analytics'
                ? 'bg-[#1B4F72] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Expense Analytics
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. DASHBOARD VIEW                          */}
      {/* ========================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* STATS ROW 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Revenue</span>
                <strong className="text-xl font-black text-gray-900 dark:text-white">{store.formatMoney(aggregates.revenue)}</strong>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Expenses</span>
                <strong className="text-xl font-black text-gray-900 dark:text-white">{store.formatMoney(aggregates.expenses)}</strong>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl text-red-600 dark:text-red-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Gross Profit</span>
                <strong className="text-xl font-black text-emerald-700 dark:text-emerald-400">{store.formatMoney(aggregates.grossProfit)}</strong>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Percent className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Net Operating Profit</span>
                <strong className="text-xl font-black text-teal-600 dark:text-teal-400">{store.formatMoney(aggregates.netProfit)}</strong>
              </div>
              <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-xl text-teal-600 dark:text-teal-400">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* ASSETS & LIABILITIES BALANCE BLOCK */}
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-gray-150 dark:border-gray-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cash Available (Drawer)</span>
              <strong className="text-base font-bold text-slate-800 dark:text-slate-100">{store.formatMoney(aggregates.cashBalance)}</strong>
              <div className="text-[10px] text-slate-400 mt-1">Operating Petty Drawer Balance</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Corporate Bank Balance</span>
              <strong className="text-base font-bold text-slate-800 dark:text-slate-100">{store.formatMoney(aggregates.bankBalance)}</strong>
              <div className="text-[10px] text-slate-400 mt-1">Main Corporate Escrow</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mobile Money Balance</span>
              <strong className="text-base font-bold text-slate-800 dark:text-slate-100">{store.formatMoney(aggregates.momoBalance)}</strong>
              <div className="text-[10px] text-slate-400 mt-1">Merchant Mobile Money Line</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Accounts Receivable</span>
              <strong className="text-base font-bold text-amber-600 dark:text-amber-400">{store.formatMoney(aggregates.accountsReceivable)}</strong>
              <div className="text-[10px] text-amber-500 mt-1">Pending guest checkout invoices</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Accounts Payable</span>
              <strong className="text-base font-bold text-red-600 dark:text-red-400">{store.formatMoney(aggregates.accountsPayable)}</strong>
              <div className="text-[10px] text-red-500 mt-1">Unpaid Purchase Orders</div>
            </div>
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. REVENUE VS EXPENSES VS PROFIT TREND */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
              <strong className="text-sm font-bold text-gray-800 dark:text-white block">Corporate Financial Trends (Last 10 Days)</strong>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E86C1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2E86C1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#27AE60" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#27AE60" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E8E8" />
                    <XAxis dataKey="date" stroke="#95A5A6" fontSize={10} tickLine={false} />
                    <YAxis stroke="#95A5A6" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Revenue" stroke="#2E86C1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Profit" stroke="#27AE60" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. DEPARTMENT PERFORMANCE */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
              <strong className="text-sm font-bold text-gray-800 dark:text-white block">Corporate Financial Performance by Department</strong>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E8E8" />
                    <XAxis dataKey="name" stroke="#95A5A6" fontSize={9} tickLine={false} />
                    <YAxis stroke="#95A5A6" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Revenue" fill="#1B4F72" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#E67E22" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. EXPENSES BY CATEGORY */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
              <strong className="text-sm font-bold text-gray-800 dark:text-white block">Operational Expenses Allocation</strong>
              <div className="h-80 flex items-center justify-center">
                {expenseCategoryData.length === 0 ? (
                  <span className="text-xs text-gray-400">No operational expenses recorded yet.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {expenseCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => store.formatMoney(value as number)} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 4. PERFORMANCE HIGHLIGHTS */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <strong className="text-sm font-bold text-gray-800 dark:text-white block mb-4">Executive Financial Insights</strong>
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900 flex items-start space-x-3">
                    <Check className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <strong className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Strong Revenue Conversion</strong>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Operating profit margin is holding at <strong className="font-mono">{aggregates.revenue > 0 ? ((aggregates.netProfit / aggregates.revenue) * 100).toFixed(1) : 0}%</strong>. This signals healthy conversion of bookings and POS into bottom-line capital.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900 flex items-start space-x-3">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <strong className="text-xs font-bold text-amber-800 dark:text-amber-300">Outstanding Receivables</strong>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Currently, <strong className="font-mono">{store.formatMoney(aggregates.accountsReceivable)}</strong> in pending room guest invoices is active. Fast-track front desk reconciliations on checkout.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-start space-x-3">
                    <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5" />
                    <div>
                      <strong className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Treasury Portfolio Allocation</strong>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                        Liquid cash reserves are split: <strong className="font-mono">{((aggregates.cashBalance / (aggregates.cashBalance + aggregates.bankBalance || 1)) * 100).toFixed(0)}%</strong> in local Drawer, and <strong className="font-mono">{((aggregates.bankBalance / (aggregates.cashBalance + aggregates.bankBalance || 1)) * 100).toFixed(0)}%</strong> securely deposited in the Main bank account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 text-right mt-4 italic">
                Corporate Ledger updated: {new Date().toLocaleString()}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. CASHBOOK VIEW                           */}
      {/* ========================================== */}
      {activeSubTab === 'cashbook' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-6">
          
          {/* SEARCH & FILTERS CONTROLS */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Hotel Business Cashbook</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Chronological list of all financial inflows and outflows with a dynamic running balance.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cashbook..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 w-full sm:w-60 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1 focus:ring-[#1B4F72] focus:outline-none"
                />
              </div>

              {/* Department */}
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1 focus:ring-[#1B4F72] focus:outline-none"
              >
                <option value="All">All Departments</option>
                {distinctDepartments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* Payment Method */}
              <select
                value={filterPayMethod}
                onChange={(e) => setFilterPayMethod(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1 focus:ring-[#1B4F72] focus:outline-none"
              >
                <option value="All">All Pay Methods</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Card">Card</option>
              </select>

              {/* Category */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1 focus:ring-[#1B4F72] focus:outline-none"
              >
                <option value="All">All Categories</option>
                {distinctCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Clear */}
              {(searchQuery || filterDept !== 'All' || filterPayMethod !== 'All' || filterCategory !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterDept('All');
                    setFilterPayMethod('All');
                    setFilterCategory('All');
                  }}
                  className="px-3 py-1.5 bg-gray-150 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* CASHBOOK TABLE */}
          <div className="overflow-x-auto border border-gray-150 dark:border-gray-700 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-700 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-3">Date</th>
                  <th className="p-3">Ref ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Income</th>
                  <th className="p-3 text-right">Expense</th>
                  <th className="p-3 text-right">Running Balance</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Dept</th>
                  <th className="p-3">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                {filteredCashbook.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">
                      No matching financial cashbook transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredCashbook.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                        tx.category === 'Owner Investment' ? 'bg-emerald-50/20 dark:bg-emerald-950/10' :
                        tx.category === 'Owner Withdrawal' ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-[11px] whitespace-nowrap">{tx.date}</td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                          {tx.id.replace('tx_', '')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold">{tx.category}</span>
                      </td>
                      <td className="p-3 max-w-xs truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {tx.type === 'Income' ? store.formatMoney(tx.amount) : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-red-500 dark:text-red-400 font-mono">
                        {tx.type === 'Expense' ? store.formatMoney(tx.amount) : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900 dark:text-white font-mono">
                        {store.formatMoney(tx.runningBalance || 0)}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium">
                          {tx.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold">
                          {tx.department || 'General'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 font-medium whitespace-nowrap">@{tx.createdBy || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. FINANCIAL REPORTS GENERATOR             */}
      {/* ========================================== */}
      {activeSubTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* REPORTS NAVIGATION PANEL */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-2">
            <strong className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-3">Hotel Statements</strong>
            {[
              { id: 'p_and_l', label: 'Profit & Loss Statement' },
              { id: 'income_stmt', label: 'Income Statement' },
              { id: 'cash_flow', label: 'Cash Flow Statement' },
              { id: 'balance_sheet', label: 'Balance Sheet' },
              { id: 'general_ledger', label: 'General Ledger' },
              { id: 'trial_balance', label: 'Trial Balance' },
              { id: 'expense_rpt', label: 'Expense Report' },
              { id: 'revenue_rpt', label: 'Revenue Report' },
              { id: 'dept_rpt', label: 'Department Financials' },
              { id: 'tax_rpt', label: 'Tax Reconciliation Report' },
            ].map(stmt => (
              <button
                key={stmt.id}
                onClick={() => setSelectedReport(stmt.id as any)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                  selectedReport === stmt.id
                    ? 'bg-[#1B4F72] text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <span>{stmt.label}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            ))}
          </div>

          {/* REPORT VIEWER CANVAS */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-700 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {selectedReport === 'p_and_l' && 'Profit & Loss Statement'}
                  {selectedReport === 'income_stmt' && 'Corporate Income Statement'}
                  {selectedReport === 'cash_flow' && 'Cash Flow Statement (Direct Method)'}
                  {selectedReport === 'balance_sheet' && 'Consolidated Corporate Balance Sheet'}
                  {selectedReport === 'general_ledger' && 'General Ledger Trial Summary'}
                  {selectedReport === 'trial_balance' && 'Trial Balance Audit Sheet'}
                  {selectedReport === 'expense_rpt' && 'Detailed Operational Expense Audit'}
                  {selectedReport === 'revenue_rpt' && 'Corporate Revenue Stream Breakdown'}
                  {selectedReport === 'dept_rpt' && 'Department Performance Reconciliation'}
                  {selectedReport === 'tax_rpt' && 'Corporate Tax Filing Reconciliation'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 font-mono">
                  Reporting Period: FY 2026 / 01-Jan-2026 to 31-Dec-2026
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-[#1B4F72] hover:bg-[#E67E22] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export PDF</span>
              </button>
            </div>

            {/* STATEMENT TABLES */}
            <div className="space-y-4">
              
              {/* 1. PROFIT & LOSS */}
              {selectedReport === 'p_and_l' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 font-bold bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                    <span>Revenue Streams</span>
                    <span className="text-right">Value (RWF)</span>
                  </div>
                  <div className="pl-4 space-y-2">
                    <div className="grid grid-cols-2">
                      <span>Room Reservations Revenue</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.roomRev)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Food, Beverage & Restaurant POS</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.restRev)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Ancillary Laundry & Amenities Services</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.laundryRev)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Swimming Pool Admission Fees</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.poolRev)}</span>
                    </div>
                    <div className="grid grid-cols-2 font-semibold text-gray-900 dark:text-white border-t border-gray-150 dark:border-gray-700 pt-1">
                      <span>Total Gross Revenue</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.revenue)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 font-bold bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mt-4">
                    <span>Operating Expenses</span>
                    <span className="text-right">Value (RWF)</span>
                  </div>
                  <div className="pl-4 space-y-2">
                    <div className="grid grid-cols-2">
                      <span>Hotel Staff Payroll (Gross Salaries)</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.payrollExp)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Inventory Restocking & Procurement Costs</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.invExp)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Utilities Charges (Electricity, Water, WiFi)</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.utilExp)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Repairs, Housekeeping & Maintenance</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.repairExp)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Other Operating Charges (Marketing, Fuel)</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.otherExp)}</span>
                    </div>
                    <div className="grid grid-cols-2 font-semibold text-gray-900 dark:text-white border-t border-gray-150 dark:border-gray-700 pt-1">
                      <span>Total Operating Expenses</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.expenses)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 font-bold bg-[#1B4F72] text-white p-3.5 rounded-xl border-none mt-6">
                    <span className="uppercase tracking-wider">Net Operating Surplus (Profit)</span>
                    <span className="text-right font-mono text-base">{store.formatMoney(aggregates.netProfit)}</span>
                  </div>
                </div>
              )}

              {/* 2. INCOME STATEMENT */}
              {selectedReport === 'income_stmt' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 font-bold border-b pb-1">
                      <span>Gross Room Bookings Inflow</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.roomRev)}</span>
                    </div>
                    <div className="grid grid-cols-2 border-b pb-1">
                      <span>Less: Refunds / Walkouts / Cancellations</span>
                      <span className="text-right font-mono">—</span>
                    </div>
                    <div className="grid grid-cols-2 font-bold border-b pb-1">
                      <span>Net Rooms Inflow</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.roomRev)}</span>
                    </div>
                    <div className="grid grid-cols-2 font-bold border-b pb-1">
                      <span>Net Food & Beverage Inflow</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.restRev)}</span>
                    </div>
                    <div className="grid grid-cols-2 font-bold border-b pb-1">
                      <span>Total Combined Net Revenue</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.revenue)}</span>
                    </div>
                    <div className="grid grid-cols-2 border-b pb-1 text-red-500 font-semibold">
                      <span>Less: Operational Cost of Sales (COGS)</span>
                      <span className="text-right font-mono">- {store.formatMoney(reportView.invExp)}</span>
                    </div>
                    <div className="grid grid-cols-2 font-bold text-gray-900 dark:text-white bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg">
                      <span>Gross Profit Margin</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.grossProfit)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. CASH FLOW */}
              {selectedReport === 'cash_flow' && (
                <div className="space-y-4 text-xs">
                  <strong className="text-gray-800 dark:text-white block font-bold border-b pb-1">Cash Flows from Operating Activities</strong>
                  <div className="space-y-2 pl-4">
                    <div className="grid grid-cols-2">
                      <span>Cash Received from Room Rent & Bookings</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.roomRev)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Cash Received from Dining/Bar POS Outlets</span>
                      <span className="text-right font-mono">{store.formatMoney(reportView.restRev)}</span>
                    </div>
                    <div className="grid grid-cols-2 text-red-500">
                      <span>Cash Paid to Hotel Suppliers & Inventory Vendors</span>
                      <span className="text-right font-mono">- {store.formatMoney(reportView.invExp)}</span>
                    </div>
                    <div className="grid grid-cols-2 text-red-500">
                      <span>Cash Paid to Employees (Payroll payouts)</span>
                      <span className="text-right font-mono">- {store.formatMoney(reportView.payrollExp)}</span>
                    </div>
                    <div className="grid grid-cols-2 text-red-500">
                      <span>Cash Paid for Operations & Overheads (WiFi, Utilities)</span>
                      <span className="text-right font-mono">- {store.formatMoney(reportView.utilExp + reportView.repairExp + reportView.otherExp)}</span>
                    </div>
                    <div className="grid grid-cols-2 font-bold border-t pt-1 text-teal-600 dark:text-teal-400">
                      <span>Net Cash Provided by Operating Activities</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.netProfit)}</span>
                    </div>
                  </div>

                  <strong className="text-gray-800 dark:text-white block font-bold border-b pb-1 mt-6">Cash Flows from Financing Activities</strong>
                  <div className="space-y-2 pl-4">
                    <div className="grid grid-cols-2 text-emerald-600">
                      <span>CEO Owner Cash Equity Injections</span>
                      <span className="text-right font-mono">
                        + {store.formatMoney((db.ownerInvestments || []).reduce((sum, i) => sum + i.amount, 0))}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 text-amber-600">
                      <span>CEO Owner Equity Withdrawals</span>
                      <span className="text-right font-mono">
                        - {store.formatMoney((db.ownerWithdrawals || []).reduce((sum, w) => sum + w.amount, 0))}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 font-bold border-t pt-1">
                      <span>Net Cash Inflow from Capital Financing</span>
                      <span className="text-right font-mono">
                        {store.formatMoney(
                          (db.ownerInvestments || []).reduce((sum, i) => sum + i.amount, 0) -
                          (db.ownerWithdrawals || []).reduce((sum, w) => sum + w.amount, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. BALANCE SHEET */}
              {selectedReport === 'balance_sheet' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 font-bold bg-slate-50 dark:bg-slate-900 p-2 rounded">
                    <span>Assets (Current)</span>
                    <span className="text-right">Value (RWF)</span>
                  </div>
                  <div className="pl-4 space-y-1.5">
                    <div className="grid grid-cols-2">
                      <span>Operating Cash Drawer Reserves (acc_1)</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.cashBalance)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Corporate Bank Account Escrow (acc_2)</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.bankBalance)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Corporate Mobile Money Line Balance</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.momoBalance)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Trade Accounts Receivable (Unsettled Bookings)</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.accountsReceivable)}</span>
                    </div>
                    <div className="grid grid-cols-2 font-bold border-t pt-1">
                      <span>Total Current Assets</span>
                      <span className="text-right font-mono">
                        {store.formatMoney(aggregates.cashBalance + aggregates.bankBalance + aggregates.momoBalance + aggregates.accountsReceivable)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 font-bold bg-slate-50 dark:bg-slate-900 p-2 rounded mt-4">
                    <span>Liabilities & Equity</span>
                    <span className="text-right">Value (RWF)</span>
                  </div>
                  <div className="pl-4 space-y-1.5">
                    <div className="grid grid-cols-2 text-red-500">
                      <span>Accounts Payable (Unpaid Purchase Orders)</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.accountsPayable)}</span>
                    </div>
                    <div className="grid grid-cols-2 text-emerald-600">
                      <span>CEO Owner Paid-In Equity Capital</span>
                      <span className="text-right font-mono">
                        {store.formatMoney(
                          ((db.ownerInvestments || []).reduce((sum, i) => sum + i.amount, 0)) -
                          ((db.ownerWithdrawals || []).reduce((sum, w) => sum + w.amount, 0))
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span>Retained Corporate Reserves</span>
                      <span className="text-right font-mono">{store.formatMoney(aggregates.netProfit)}</span>
                    </div>
                    <div className="grid grid-cols-2 font-bold border-t pt-1">
                      <span>Total Combined Equity & Liabilities</span>
                      <span className="text-right font-mono">
                        {store.formatMoney(
                          aggregates.accountsPayable +
                          ((db.ownerInvestments || []).reduce((sum, i) => sum + i.amount, 0) -
                          (db.ownerWithdrawals || []).reduce((sum, w) => sum + w.amount, 0)) +
                          aggregates.netProfit
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* FALLBACK INFO FOR GENERAL AUDITS */}
              {['general_ledger', 'trial_balance', 'expense_rpt', 'revenue_rpt', 'dept_rpt', 'tax_rpt'].includes(selectedReport) && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-2 border border-gray-150 dark:border-gray-800">
                    <span className="font-bold text-gray-800 dark:text-white block">Audit Summary Detail</span>
                    <p className="text-gray-600 dark:text-gray-400">
                      This ledger is fully calculated. Below is the direct summation of accounting codes from all active modules.
                    </p>
                  </div>

                  <div className="border border-gray-150 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-3 font-bold bg-gray-50 dark:bg-gray-900 p-3 text-[10px] tracking-wider uppercase text-gray-400">
                      <span>Account Code / Category</span>
                      <span className="text-right">Debit (RWF)</span>
                      <span className="text-right">Credit (RWF)</span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      <div className="grid grid-cols-3 p-3">
                        <span className="font-semibold">Rooms Revenue Outlets</span>
                        <span className="text-right font-mono text-emerald-600">+ {store.formatMoney(reportView.roomRev)}</span>
                        <span className="text-right font-mono text-slate-400">—</span>
                      </div>
                      <div className="grid grid-cols-3 p-3">
                        <span className="font-semibold">F&B Outlet POS Receipts</span>
                        <span className="text-right font-mono text-emerald-600">+ {store.formatMoney(reportView.restRev)}</span>
                        <span className="text-right font-mono text-slate-400">—</span>
                      </div>
                      <div className="grid grid-cols-3 p-3">
                        <span className="font-semibold">Staff Payroll Ledger (101-PR)</span>
                        <span className="text-right font-mono text-slate-400">—</span>
                        <span className="text-right font-mono text-red-500">- {store.formatMoney(reportView.payrollExp)}</span>
                      </div>
                      <div className="grid grid-cols-3 p-3">
                        <span className="font-semibold">Inventory Acquisitions (203-INV)</span>
                        <span className="text-right font-mono text-slate-400">—</span>
                        <span className="text-right font-mono text-red-500">- {store.formatMoney(reportView.invExp)}</span>
                      </div>
                      {selectedReport === 'tax_rpt' && (
                        <div className="grid grid-cols-3 p-3">
                          <span className="font-semibold">VAT Standard Assessment (18% Flat)</span>
                          <span className="text-right font-mono text-slate-400">—</span>
                          <span className="text-right font-mono text-amber-500">- {store.formatMoney(reportView.netTax)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. EXPENSE ANALYTICS VIEW                  */}
      {/* ========================================== */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* TOP ANALYTICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Unnecessary Expenses</span>
              <strong className="text-xl font-black text-amber-600 dark:text-amber-400">{store.formatMoney(expenseAnalytics.unnecessaryTotal)}</strong>
              <p className="text-[10px] text-gray-500">Expenses flagged as avoidable or low priority</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Employee-Related Costs</span>
              <strong className="text-xl font-black text-indigo-600 dark:text-indigo-400">{store.formatMoney(expenseAnalytics.employeeExpenses)}</strong>
              <p className="text-[10px] text-gray-500">Consolidated staff salaries and benefits</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Repeat Outlays Count</span>
              <strong className="text-xl font-black text-red-500">{expenseAnalytics.repeatedList.length} Categories</strong>
              <p className="text-[10px] text-gray-500">Identical items purchased repeatedly</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* UNNECESSARY OR REPETITIVE OUTLAYS AUDITOR */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
              <div>
                <strong className="text-sm font-bold text-gray-800 dark:text-white block">Unnecessary Expense Flagging Auditor</strong>
                <p className="text-xs text-gray-400 mt-0.5">Toggle and flag high-growth expenses to compile strategic cost reductions.</p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {allTransactions.filter(t => t.type === 'Expense' && t.category !== 'Owner Withdrawal').length === 0 ? (
                  <span className="text-xs text-gray-400 block text-center py-6">No expenses available to audit.</span>
                ) : (
                  allTransactions.filter(t => t.type === 'Expense' && t.category !== 'Owner Withdrawal').map(tx => (
                    <div
                      key={tx.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        tx.isUnnecessary
                          ? 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/40'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-150 dark:border-gray-850'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{tx.description}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-250 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded">
                            {tx.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block mt-1">{tx.date} • @{tx.createdBy}</span>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0 pl-2">
                        <strong className="text-xs font-bold text-gray-950 dark:text-white font-mono">{store.formatMoney(tx.amount)}</strong>
                        <button
                          onClick={() => {
                            store.toggleExpenseUnnecessary(tx.id);
                          }}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center space-x-1 ${
                            tx.isUnnecessary
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>{tx.isUnnecessary ? 'Unnecessary' : 'Flag Unneeded'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* REPEATED OUTLAYS TRACKER */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-4">
              <div>
                <strong className="text-sm font-bold text-gray-800 dark:text-white block">Repeated Identical Outlays Summary</strong>
                <p className="text-xs text-gray-400 mt-0.5">Automated detection of duplicate transactions with identical descriptions.</p>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {expenseAnalytics.repeatedList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    No repeated identical purchase outlays detected. Cost control is performing cleanly.
                  </div>
                ) : (
                  expenseAnalytics.repeatedList.map((rep, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">{rep.description}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                          Category: {rep.category} • Occurs <strong className="text-red-500 font-black">{rep.count}x</strong>
                        </span>
                      </div>
                      <div className="text-right space-y-0.5 pl-2 shrink-0">
                        <strong className="text-xs font-bold text-red-500 font-mono block">{store.formatMoney(rep.total)}</strong>
                        <span className="text-[9px] text-slate-400 font-mono block">Accumulated Cost</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
