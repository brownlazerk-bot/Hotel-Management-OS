/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { Employee, Attendance, Payroll, Account, Transaction, Department } from '../types';
import {
  Users,
  ShieldAlert,
  Plus,
  Clock,
  Briefcase,
  DollarSign,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  FileCheck
} from 'lucide-react';

export default function HRFinance() {
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payroll' | 'ledger'>('employees');
  const db = store.getDb();

  // Employee creation states
  const [empFirst, setEmpFirst] = useState('');
  const [empLast, setEmpLast] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empPos, setEmpPos] = useState('');
  const [empContract, setEmpContract] = useState('Full-Time');
  const [empSalary, setEmpSalary] = useState<number>(3500);

  // Manual Transaction States
  const [txAccount, setTxAccount] = useState('acc_2');
  const [txType, setTxType] = useState<'Income' | 'Expense'>('Income');
  const [txAmount, setTxAmount] = useState<number>(100);
  const [txCategory, setTxCategory] = useState('Room Revenue');
  const [txDesc, setTxDesc] = useState('');

  // Clock In states
  const [clockEmpId, setClockEmpId] = useState('');

  // Payroll target month YYYY-MM
  const [payrollMonth, setPayrollMonth] = useState('2026-07');

  // Department Sub-tab & Form States
  const [hrSubTab, setHrSubTab] = useState<'directory' | 'departments'>('directory');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptManager, setDeptManager] = useState('');

  // ============================================================================
  // OPERATIONS HANDLERS
  // ============================================================================
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFirst || !empLast || !empEmail || !empDept) return;

    const emp: Employee = {
      id: `emp_${Date.now()}`,
      firstName: empFirst,
      lastName: empLast,
      email: empEmail,
      phone: empPhone,
      departmentId: empDept,
      position: empPos,
      contractType: empContract,
      salary: empSalary,
      hireDate: new Date().toISOString().split('T')[0],
      isActive: true,
      performanceScore: 5
    };

    store.saveEmployee(emp);
    setEmpFirst('');
    setEmpLast('');
    setEmpEmail('');
    setEmpPhone('');
    setEmpPos('');
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName) return;

    const dept: Department = {
      id: editingDeptId || `dept_${Date.now()}`,
      name: deptName,
      description: deptDesc,
      managerId: deptManager || undefined
    };

    store.saveDepartment(dept);
    setEditingDeptId(null);
    setDeptName('');
    setDeptDesc('');
    setDeptManager('');
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDeptId(dept.id);
    setDeptName(dept.name);
    setDeptDesc(dept.description);
    setDeptManager(dept.managerId || '');
    setHrSubTab('departments'); // Switch subtab to form automatically
  };

  const handleCancelDeptEdit = () => {
    setEditingDeptId(null);
    setDeptName('');
    setDeptDesc('');
    setDeptManager('');
  };

  const handleClockIn = () => {
    if (!clockEmpId) return;
    const res = store.clockIn(clockEmpId);
    if (!res.success) alert(res.error);
    setClockEmpId('');
  };

  const handleClockOut = (empId: string) => {
    const res = store.clockOut(empId);
    if (!res.success) alert(res.error);
  };

  const handleGeneratePayroll = () => {
    store.generatePayroll(payrollMonth);
  };

  const handlePaySalary = (payrollId: string) => {
    store.paySalary(payrollId);
  };

  const handlePostTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (txAmount <= 0 || !txDesc) return;

    store.addFinanceTransaction(txAccount, txType, txAmount, txCategory, txDesc);
    setTxDesc('');
    setTxAmount(100);
  };

  // ============================================================================
  // PROFIT & LOSS CALCULATIONS
  // ============================================================================
  const plCalculation = useMemo(() => {
    let totalRoomRevenue = 0;
    let totalRestRevenue = 0;
    let totalOtherRevenue = 0;
    let totalPayrollExpense = 0;
    let totalInventoryExpense = 0;
    let totalOtherExpense = 0;

    db.transactions.forEach(t => {
      if (t.type === 'Income') {
        if (t.category === 'Room Revenue') totalRoomRevenue += t.amount;
        else if (t.category === 'Restaurant Revenue') totalRestRevenue += t.amount;
        else totalOtherRevenue += t.amount;
      } else {
        if (t.category === 'Payroll') totalPayrollExpense += t.amount;
        else if (t.category === 'Food Inventory') totalInventoryExpense += t.amount;
        else totalOtherExpense += t.amount;
      }
    });

    const grossRevenue = totalRoomRevenue + totalRestRevenue + totalOtherRevenue;
    const operatingExpenses = totalPayrollExpense + totalInventoryExpense + totalOtherExpense;
    const netProfit = grossRevenue - operatingExpenses;

    return {
      totalRoomRevenue,
      totalRestRevenue,
      totalOtherRevenue,
      totalPayrollExpense,
      totalInventoryExpense,
      totalOtherExpense,
      grossRevenue,
      operatingExpenses,
      netProfit
    };
  }, [db]);

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-[#1B4F72] rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">HR, Payroll & General Ledgers</h1>
            <p className="text-xs text-gray-400">Map staff payroll structures, attendance timesheets, ledger entry receipts, and real-time Profit & Loss sheets.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'employees'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Staff & HR Directory
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Time Attendance
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Payroll Engine
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            General Ledger & P&L
          </button>
        </div>
      </div>

      {/* TAB 1: STAFF DIRECTORY & REGISTRATION */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          {/* Sub Tab Switcher */}
          <div className="flex border-b border-gray-150 pb-px space-x-6">
            <button
              onClick={() => setHrSubTab('directory')}
              className={`pb-3 text-xs font-bold transition duration-150 border-b-2 cursor-pointer ${
                hrSubTab === 'directory'
                  ? 'border-[#1B4F72] text-[#1B4F72]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Staff List & Hire
            </button>
            <button
              onClick={() => setHrSubTab('departments')}
              className={`pb-3 text-xs font-bold transition duration-150 border-b-2 cursor-pointer ${
                hrSubTab === 'departments'
                  ? 'border-[#1B4F72] text-[#1B4F72]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Manage Departments
            </button>
          </div>

          {hrSubTab === 'directory' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Employee Register Form */}
              <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                  <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Register Employee Entry
                </h3>
                <form onSubmit={handleSaveEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Jane"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                        value={empFirst}
                        onChange={(e) => setEmpFirst(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                        value={empLast}
                        onChange={(e) => setEmpLast(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Corporate Email</label>
                    <input
                      type="email"
                      required
                      placeholder="j.doe@grandhorizon.com"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Contact</label>
                    <input
                      type="text"
                      required
                      placeholder="+1 (555) 301-4433"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Department</label>
                      <select
                        required
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                        value={empDept}
                        onChange={(e) => setEmpDept(e.target.value)}
                      >
                        <option value="">-- Choose Dept --</option>
                        {db.departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Role/Position</label>
                      <input
                        type="text"
                        required
                        placeholder="Front Desk Agent"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                        value={empPos}
                        onChange={(e) => setEmpPos(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contract Type</label>
                      <select
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                        value={empContract}
                        onChange={(e) => setEmpContract(e.target.value)}
                      >
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Base Monthly Salary ($)</label>
                      <input
                        type="number"
                        min={1}
                        required
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                        value={empSalary}
                        onChange={(e) => setEmpSalary(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Register Employee
                  </button>
                </form>
              </div>

              {/* Directory Listings */}
              <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Active Staff Directory ({db.employees.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                  {db.employees.map(emp => {
                    const deptObj = db.departments.find(d => d.id === emp.departmentId);
                    return (
                      <div key={emp.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 space-y-2 text-xs relative">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-[#1B4F72] text-white flex items-center justify-center font-bold font-sans">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </div>
                          <div>
                            <strong className="text-gray-800 text-sm block font-bold">{emp.firstName} {emp.lastName}</strong>
                            <span className="text-[10px] text-gray-400 font-semibold">{emp.position} • {deptObj?.name}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-200/50 space-y-1 text-gray-500 font-semibold">
                          <span className="block">Email: <strong className="text-gray-700">{emp.email}</strong></span>
                          <span className="block">Contact: <strong className="text-gray-700">{emp.phone}</strong></span>
                          <span className="block">Type: <strong className="text-gray-700">{emp.contractType}</strong></span>
                          <span className="block">Monthly Base: <strong className="text-gray-700">${emp.salary.toLocaleString()}</strong></span>
                        </div>

                        <div className="absolute top-2 right-2 text-yellow-500 font-bold" title="Performance Score">
                          {'★'.repeat(emp.performanceScore || 5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Department Form */}
              <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                  <Briefcase className="h-4 w-4 mr-1.5 text-[#1B4F72]" /> 
                  {editingDeptId ? 'Edit Department Details' : 'Establish New Department'}
                </h3>
                
                <form onSubmit={handleSaveDepartment} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Department Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Concierge & Butler Services"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800 font-semibold"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Department Description</label>
                    <textarea
                      rows={3}
                      placeholder="Define the primary operational scope..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800 font-semibold"
                      value={deptDesc}
                      onChange={(e) => setDeptDesc(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Department Head / Manager</label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      value={deptManager}
                      onChange={(e) => setDeptManager(e.target.value)}
                    >
                      <option value="">-- Assign Department Head --</option>
                      {db.employees.filter(emp => emp.isActive).map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.position})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      {editingDeptId ? 'Update Department' : 'Establish Department'}
                    </button>
                    {editingDeptId && (
                      <button
                        type="button"
                        onClick={handleCancelDeptEdit}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Department Directory List */}
              <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Departments Registry ({db.departments.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                  {db.departments.map(dept => {
                    const manager = db.employees.find(e => e.id === dept.managerId);
                    const staffCount = db.employees.filter(e => e.departmentId === dept.id).length;
                    
                    return (
                      <div key={dept.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 space-y-3 text-xs relative flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <strong className="text-gray-800 text-sm block font-bold">{dept.name}</strong>
                            <span className="bg-blue-50 text-[#1B4F72] text-[9px] font-bold px-2 py-0.5 rounded border border-blue-100">
                              {staffCount} Staff
                            </span>
                          </div>
                          <p className="text-gray-400 leading-relaxed font-semibold text-[11px]">
                            {dept.description || 'No operational description defined.'}
                          </p>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          <div>
                            Manager: <span className="text-gray-700 font-sans font-semibold normal-case block mt-0.5">
                              {manager ? `${manager.firstName} ${manager.lastName}` : 'Unassigned'}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleEditDepartment(dept)}
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[#1B4F72] font-semibold text-[10px] transition cursor-pointer"
                          >
                            Edit Dept
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TIME ATTENDANCE & SHIFTS */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clock In Terminal */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <Clock className="h-4 w-4 mr-1 text-[#E67E22]" /> Digital Shift Clock
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Employee Profile</label>
                <select
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  value={clockEmpId}
                  onChange={(e) => setClockEmpId(e.target.value)}
                >
                  <option value="">-- Select Staff member --</option>
                  {db.employees.filter(e => e.isActive).map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.position})</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleClockIn}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Register Clock In (Shift start)
              </button>
            </div>
          </div>

          {/* Timesheets List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Today's Timesheets</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Clock In</th>
                    <th className="py-2.5 px-3">Clock Out</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {db.attendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No clock-in records registered today.
                      </td>
                    </tr>
                  ) : (
                    db.attendance.map(att => {
                      const emp = db.employees.find(e => e.id === att.employeeId);
                      return (
                        <tr key={att.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3 font-semibold text-gray-800">{emp?.firstName} {emp?.lastName}</td>
                          <td className="py-3 px-3 text-gray-500 font-mono">{att.date}</td>
                          <td className="py-3 px-3 font-mono font-semibold text-gray-600">{att.clockIn}</td>
                          <td className="py-3 px-3 font-mono font-semibold text-gray-600">{att.clockOut || '--:--:--'}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              att.status === 'Present' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {att.status} {att.lateMinutes > 0 && `(${att.lateMinutes}m Late)`}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {!att.clockOut && (
                              <button
                                onClick={() => handleClockOut(att.employeeId)}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Clock Out
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYROLL ENGINE */}
      {activeTab === 'payroll' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Monthly Payroll registry</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Calculates base pay, allowances, bonuses, and late clock-in deductions dynamically.</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="month"
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
              />
              <button
                onClick={handleGeneratePayroll}
                className="px-4 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl text-xs font-semibold flex items-center cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" /> Generate Payroll Registry
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="py-2.5 px-3">Staff Employee</th>
                  <th className="py-2.5 px-3">Base Pay</th>
                  <th className="py-2.5 px-3">Allowances</th>
                  <th className="py-2.5 px-3">Overtime Bonuses</th>
                  <th className="py-2.5 px-3">Deductions</th>
                  <th className="py-2.5 px-3">Net Salary</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {db.payroll.filter(p => p.month === payrollMonth).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      No payroll lists generated for target month. Click **Generate Payroll Registry** above to calculate.
                    </td>
                  </tr>
                ) : (
                  db.payroll.filter(p => p.month === payrollMonth).map(pay => {
                    const emp = db.employees.find(e => e.id === pay.employeeId);
                    return (
                      <tr key={pay.id} className="hover:bg-gray-50/50 font-mono">
                        <td className="py-4 px-3 font-semibold text-gray-800 font-sans">{emp?.firstName} {emp?.lastName}</td>
                        <td className="py-4 px-3">${pay.baseSalary.toLocaleString()}</td>
                        <td className="py-4 px-3 text-green-600">+${pay.allowances}</td>
                        <td className="py-4 px-3 text-green-600">+${pay.bonuses}</td>
                        <td className="py-4 px-3 text-red-500">-${pay.deductions}</td>
                        <td className="py-4 px-3 font-bold text-gray-800">${pay.netSalary.toLocaleString()}</td>
                        <td className="py-4 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pay.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-orange-50 text-[#E67E22] border border-orange-100'
                          }`}>
                            {pay.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right">
                          {pay.paymentStatus === 'Pending' ? (
                            <button
                              onClick={() => handlePaySalary(pay.id)}
                              className="px-3 py-1.5 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-lg text-[10px] font-semibold cursor-pointer"
                            >
                              Settle Payslip
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400 block font-semibold">{pay.paymentDate}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GENERAL LEDGER & P&L */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          
          {/* Accounts Summary & manual transaction posting */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart of Accounts */}
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Chart of Accounts</h3>
              <div className="space-y-3">
                {db.accounts.map(acc => (
                  <div key={acc.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-150 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-800 text-xs block">{acc.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{acc.type}</span>
                    </div>
                    <strong className="text-base font-bold text-gray-800 font-mono">${acc.balance.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Post manual Ledger transaction */}
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Post Ledger Journal
              </h3>
              <form onSubmit={handlePostTransaction} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account</label>
                    <select
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      value={txAccount}
                      onChange={(e) => setTxAccount(e.target.value)}
                    >
                      {db.accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</label>
                    <select
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      value={txType}
                      onChange={(e) => setTxType(e.target.value as any)}
                    >
                      <option value="Income">Income (+)</option>
                      <option value="Expense">Expense (-)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount ($)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                      value={txAmount}
                      onChange={(e) => setTxAmount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                    <select
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800"
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                    >
                      <option value="Room Revenue">Room Revenue</option>
                      <option value="Restaurant Revenue">Restaurant Revenue</option>
                      <option value="Payroll">Payroll</option>
                      <option value="Food Inventory">Food Inventory</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Repairs">Repairs</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Memo/Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Utility water bill June"
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Post Journal Entry
                </button>
              </form>
            </div>

            {/* Calculated Profit & Loss Sheet */}
            <div className="bg-[#1B4F72] text-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider pb-1.5 border-b border-white/10 mb-4">Profit & Loss Sheet</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-blue-200">
                    <span>Room Revenue:</span>
                    <span>${plCalculation.totalRoomRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-blue-200">
                    <span>Dining Revenue:</span>
                    <span>${plCalculation.totalRestRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-blue-200">
                    <span>Other Revenue:</span>
                    <span>${plCalculation.totalOtherRevenue.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white/10 my-1 pt-1.5 flex justify-between font-bold">
                    <span>Gross Revenues:</span>
                    <span>${plCalculation.grossRevenue.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-orange-200 mt-2">
                    <span>Payroll Payouts:</span>
                    <span>-${plCalculation.totalPayrollExpense.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-orange-200">
                    <span>Procurement Debits:</span>
                    <span>-${plCalculation.totalInventoryExpense.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-orange-200">
                    <span>Operations/Utilities:</span>
                    <span>-${plCalculation.totalOtherExpense.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white/10 my-1 pt-1.5 flex justify-between font-bold">
                    <span>Total Debits:</span>
                    <span>-${plCalculation.operatingExpenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/25 pt-4 mt-4 flex items-center justify-between">
                <span className="text-sm font-bold">Net P&L Balance:</span>
                <strong className={`text-xl font-mono ${plCalculation.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${plCalculation.netProfit.toLocaleString()}
                </strong>
              </div>
            </div>

          </div>

          {/* Ledger transactions list table */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">General Ledger Activity Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Asset Account</th>
                    <th className="py-2.5 px-3 text-right">Debit/Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {db.transactions.map(tx => {
                    const acc = db.accounts.find(a => a.id === tx.accountId);
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 font-mono">
                        <td className="py-3 px-3 text-gray-400 text-[10px]">{tx.date}</td>
                        <td className="py-3 px-3 font-sans text-gray-800 text-xs">{tx.description}</td>
                        <td className="py-3 px-3">
                          <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded text-[10px] font-bold">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-sans">{acc?.name}</td>
                        <td className={`py-3 px-3 text-right font-bold text-sm ${tx.type === 'Income' ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.type === 'Income' ? '+' : '-'}${tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
