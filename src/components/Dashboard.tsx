/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle,
  LogOut,
  Utensils,
  AlertTriangle,
  Users,
  Bell,
  Clock,
  Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const db = store.getDb();
  const [selectedDays, setSelectedDays] = useState<number>(30);

  // ============================================================================
  // ANALYTICS & MATH CALCULATIONS
  // ============================================================================

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's Transactions
    const todayTxs = db.transactions.filter(t => t.date === todayStr);
    const todayRev = todayTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const todayExp = todayTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);

    // Monthly Transactions
    const currentMonth = todayStr.substring(0, 7); // YYYY-MM
    const monthlyTxs = db.transactions.filter(t => t.date.startsWith(currentMonth));
    const monthlyRev = monthlyTxs.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExp = monthlyTxs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);

    // Occupancy Stats
    const totalRooms = db.rooms.length;
    const occupiedRooms = db.rooms.filter(r => r.status === 'Occupied').length;
    const dirtyRooms = db.rooms.filter(r => r.status === 'Dirty').length;
    const maintRooms = db.rooms.filter(r => r.status === 'Maintenance').length;
    const availableRooms = db.rooms.filter(r => r.status === 'Available').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Today Check-ins & Check-outs
    const todayCheckIns = db.reservations.filter(r => r.checkInDate === todayStr && r.status === 'Confirmed');
    const todayCheckOuts = db.reservations.filter(r => r.checkOutDate === todayStr && r.status === 'Checked In');

    // Restaurant sales today
    const restaurantSalesToday = db.restaurantOrders
      .filter(o => o.createdAt.startsWith(todayStr) && o.status === 'Paid')
      .reduce((sum, o) => sum + o.total, 0);

    // Low stock count
    const lowStockAlerts = db.products.filter(p => p.currentStock <= p.minStockAlert);

    // Active Housekeeping tasks
    const activeHKTasks = db.cleaningTasks.filter(t => t.status !== 'Inspected');

    // Active maintenance requests
    const activeMaintRequests = db.maintenanceRequests.filter(r => r.status !== 'Resolved');

    // Attendance rate
    const totalEmployees = db.employees.filter(e => e.isActive).length;
    const presentCount = db.attendance.filter(a => a.date === todayStr && (a.status === 'Present' || a.status === 'Late')).length;
    const attendanceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

    return {
      todayRev,
      todayExp,
      todayProfit: todayRev - todayExp,
      monthlyRev,
      monthlyExp,
      monthlyProfit: monthlyRev - monthlyExp,
      totalRooms,
      occupiedRooms,
      availableRooms,
      dirtyRooms,
      maintRooms,
      occupancyRate,
      todayCheckIns,
      todayCheckOuts,
      restaurantSalesToday,
      lowStockAlerts,
      activeHKTasks,
      activeMaintRequests,
      attendanceRate,
      totalEmployees
    };
  }, [db]);

  // ============================================================================
  // RECHARTS CHARTS DATA PREPARATION
  // ============================================================================

  // Chart 1: Financial Area (Daily Revenue & Expenses)
  const chartFinancialData = useMemo(() => {
    const dailyMap: { [date: string]: { rev: number; exp: number } } = {};
    
    // Fill last 7 days with zeros
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { rev: 0, exp: 0 };
    }

    // Populate actual transaction data
    db.transactions.forEach(t => {
      if (dailyMap[t.date] !== undefined) {
        if (t.type === 'Income') dailyMap[t.date].rev += t.amount;
        if (t.type === 'Expense') dailyMap[t.date].exp += t.amount;
      }
    });

    return Object.keys(dailyMap).sort().map(date => {
      const label = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      return {
        name: label,
        Revenue: dailyMap[date].rev,
        Expenses: dailyMap[date].exp
      };
    });
  }, [db]);

  // Chart 2: Room Revenue vs Restaurant Revenue Pie Chart
  const chartSalesDistribution = useMemo(() => {
    let roomRevenue = 0;
    let restaurantRevenue = 0;
    let otherRevenue = 0;

    db.transactions.forEach(t => {
      if (t.type === 'Income') {
        if (t.category === 'Room Revenue') {
          roomRevenue += t.amount;
        } else if (t.category === 'Restaurant Revenue') {
          restaurantRevenue += t.amount;
        } else {
          otherRevenue += t.amount;
        }
      }
    });

    return [
      { name: 'Room Reservations', value: roomRevenue || 1 },
      { name: 'Dining & POS', value: restaurantRevenue || 1 },
      { name: 'Ancillary Services', value: otherRevenue || 1 }
    ];
  }, [db]);

  const PIE_COLORS = ['#1B4F72', '#E67E22', '#2ECC71'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-editorial text-gray-800 dark:text-white tracking-tight">Executive Control Centre</h1>
          <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">
            Real-time analytics, central room inventory, financial ledgers, and department operations feed.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-xl border border-gray-150 dark:border-gray-600 self-start md:self-auto">
          <button
            onClick={() => setSelectedDays(7)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              selectedDays === 7 ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setSelectedDays(30)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              selectedDays === 30 ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Revenue */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 text-[#1B4F72] dark:text-blue-300 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Today's Revenue</span>
            <span className="text-2xl font-bold font-mono text-[#1B4F72] dark:text-blue-300">{store.formatMoney(stats.todayRev)}</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Net Profit: <span className={stats.todayProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{store.formatMoney(stats.todayProfit)}</span>
            </span>
          </div>
        </div>

        {/* KPI 2: Occupancy Rate */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-orange-50 dark:bg-orange-900/30 text-[#E67E22] rounded-xl">
            <Percent className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Occupancy Rate</span>
            <span className="text-2xl font-bold font-mono text-[#1B4F72] dark:text-blue-300">{stats.occupancyRate}%</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              {stats.occupiedRooms} / {stats.totalRooms} Rooms Occupied
            </span>
          </div>
        </div>

        {/* KPI 3: Dining POS Sales */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Restaurant Sales</span>
            <span className="text-2xl font-bold font-mono text-[#1B4F72] dark:text-blue-300">{store.formatMoney(stats.restaurantSalesToday)}</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Today's dining closed receipts</span>
          </div>
        </div>

        {/* KPI 4: Staff On Shift */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Staff Attendance</span>
            <span className="text-2xl font-bold font-mono text-[#1B4F72] dark:text-blue-300">{stats.attendanceRate}%</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Active shifts clocked in today
            </span>
          </div>
        </div>
      </div>

      {/* Critical Operational Warnings Banner */}
      {(stats.lowStockAlerts.length > 0 || stats.activeMaintRequests.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.lowStockAlerts.length > 0 && (
            <div className="bg-[#FFF5EB] border border-[#FFE8D1] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-[#FFE8D1] text-[#E67E22] p-2 rounded-xl">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#D35400] tracking-tight">Low Stock Alerts ({stats.lowStockAlerts.length})</h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Items: {stats.lowStockAlerts.slice(0, 2).map(p => `${p.name} (${p.currentStock} remaining)`).join(', ')}
                    {stats.lowStockAlerts.length > 2 && '...'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#E67E22] bg-white px-2 py-1 rounded-lg border border-[#FFE8D1]">Action Required</span>
            </div>
          )}

          {stats.activeMaintRequests.length > 0 && (
            <div className="bg-[#F0F4F8] border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-[#1B4F72] p-2 rounded-xl">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1B4F72] tracking-tight">Maintenance Tickets ({stats.activeMaintRequests.length})</h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Rooms out-of-order or systems failing requiring immediate dispatch.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#1B4F72] bg-white px-2 py-1 rounded-lg border border-blue-100">Dispatched</span>
            </div>
          )}
        </div>
      )}

      {/* Charts Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Financial Ledger Trends (Area) */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold font-editorial text-gray-800 dark:text-white tracking-tight">Financial Performance Ledger</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Comparing daily income and procurement/payroll expenses.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartFinancialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B4F72" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1B4F72" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E67E22" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#E67E22" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                <XAxis dataKey="name" stroke="#A1A1A1" fontSize={10} tickLine={false} />
                <YAxis stroke="#A1A1A1" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Revenue" stroke="#1B4F72" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="Expenses" stroke="#E67E22" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Revenue Distribution (Pie) */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-editorial text-gray-800 dark:text-white tracking-tight">Revenue Stream Distribution</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Analyzing the weight of primary hotel service branches.</p>
          </div>
          <div className="h-44 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartSalesDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartSalesDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest block">Total Income</span>
              <span className="text-base font-bold text-gray-800">${stats.monthlyRev.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {chartSalesDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[11px] font-semibold text-gray-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                  <span>{entry.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-700">
                  ${Math.round(entry.value).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Operational Status Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Front Office Today Checklist */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800 tracking-tight">Desk Traffic Checklist (Today)</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">List of expected check-ins and check-outs scheduled for today.</p>
          </div>

          <div className="space-y-4">
            {/* Check-ins Section */}
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 mb-2">
                <span className="text-xs font-bold text-gray-700 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                  Scheduled Check-ins ({stats.todayCheckIns.length})
                </span>
                <span className="text-[10px] text-gray-400">Arrivals Today</span>
              </div>

              {stats.todayCheckIns.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  No scheduled arrivals registered for today.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {stats.todayCheckIns.map(res => {
                    const guest = db.guests.find(g => g.id === res.guestId);
                    const room = db.rooms.find(r => r.id === res.roomId);
                    return (
                      <div key={res.id} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                        <div className="text-[11px]">
                          <span className="font-bold text-gray-700 block">{guest?.firstName} {guest?.lastName}</span>
                          <span className="text-gray-400">Room {room?.roomNumber} • {res.numberOfGuests} Guests</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          Pending Check-in
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Check-outs Section */}
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 mb-2">
                <span className="text-xs font-bold text-gray-700 flex items-center">
                  <LogOut className="h-4 w-4 mr-1 text-[#E67E22]" />
                  Scheduled Check-outs ({stats.todayCheckOuts.length})
                </span>
                <span className="text-[10px] text-gray-400">Departures Today</span>
              </div>

              {stats.todayCheckOuts.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  No guest departures scheduled for today.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {stats.todayCheckOuts.map(res => {
                    const guest = db.guests.find(g => g.id === res.guestId);
                    const room = db.rooms.find(r => r.id === res.roomId);
                    return (
                      <div key={res.id} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                        <div className="text-[11px]">
                          <span className="font-bold text-gray-700 block">{guest?.firstName} {guest?.lastName}</span>
                          <span className="text-gray-400">Room {room?.roomNumber} • Balance: ${res.totalAmount - res.amountPaid}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#E67E22] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                          Due Departure
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Operations Audit Log / Notifications Feed */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800 tracking-tight">Active Operation Audit Logs</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Immediate digital ledger footprint representing live system transactions.</p>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {db.auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                System is idle. No log records generated yet.
              </div>
            ) : (
              db.auditLogs.slice(0, 6).map(log => (
                <div key={log.id} className="flex items-start justify-between p-2.5 bg-gray-50/70 hover:bg-gray-50 rounded-xl border border-gray-150/70">
                  <div className="flex items-start space-x-2.5">
                    <div className="mt-0.5 p-1.5 bg-white rounded-lg border border-gray-150 shrink-0 text-gray-400">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div className="text-[11px]">
                      <span className="font-semibold text-gray-700 block">{log.action}</span>
                      <p className="text-gray-500 mt-0.5 leading-snug">{log.details}</p>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mt-1">{log.module} • {log.username}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
