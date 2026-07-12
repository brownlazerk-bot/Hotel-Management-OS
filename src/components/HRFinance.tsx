/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { Employee, Attendance, Payroll, Account, Transaction, Department, User, Role, RoleName, Permission } from '../types';
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
  FileCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Edit,
  Shield,
  Key,
  Lock
} from 'lucide-react';

export default function HRFinance() {
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payroll' | 'ledger' | 'users'>('employees');
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

  // User creation / edit states
  const [usrId, setUsrId] = useState('');
  const [usrUsername, setUsrUsername] = useState('');
  const [usrPassword, setUsrPassword] = useState('');
  const [usrName, setUsrName] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrRole, setUsrRole] = useState<RoleName>('Receptionist');
  const [usrActive, setUsrActive] = useState(true);
  const [usrEmpId, setUsrEmpId] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Selected Role for Permissions Editor
  const [selectedRoleName, setSelectedRoleName] = useState<RoleName>('Receptionist');

  // ============================================================================
  // OPERATIONS HANDLERS
  // ============================================================================
  const handleCreateAccountFromEmployee = (emp: Employee) => {
    setActiveTab('users');
    setUsrEmpId(emp.id);
    setUsrName(`${emp.firstName} ${emp.lastName}`);
    setUsrEmail(emp.email);
    
    // Suggest a clean username
    const suggestedUsername = (emp.firstName[0] + emp.lastName).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    setUsrUsername(suggestedUsername);
    setUsrPassword('pass_' + Math.random().toString(36).substring(2, 6)); // Auto suggested password
    
    // Auto map position
    const pos = emp.position.toLowerCase();
    let autoRole: RoleName = 'Receptionist';
    if (pos.includes('admin') || pos.includes('system')) autoRole = 'Super Admin';
    else if (pos.includes('ceo') || pos.includes('executive')) autoRole = 'CEO';
    else if (pos.includes('manager') || pos.includes('director')) autoRole = 'Manager';
    else if (pos.includes('reception') || pos.includes('front desk') || pos.includes('desk')) autoRole = 'Receptionist';
    else if (pos.includes('accountant') || pos.includes('finance') || pos.includes('billing')) autoRole = 'Accountant';
    else if (pos.includes('cashier') || pos.includes('pos')) autoRole = 'Cashier';
    else if (pos.includes('waiter') || pos.includes('server') || pos.includes('steward')) autoRole = 'Waiter';
    else if (pos.includes('chef') || pos.includes('cook') || pos.includes('kitchen')) autoRole = 'Chef';
    else if (pos.includes('housekeep') || pos.includes('cleaner') || pos.includes('laundry')) autoRole = 'Housekeeper';
    else if (pos.includes('store') || pos.includes('keeper') || pos.includes('inventory')) autoRole = 'Storekeeper';
    else if (pos.includes('maintenance') || pos.includes('engineer') || pos.includes('plumber') || pos.includes('electrician')) autoRole = 'Maintenance Staff';
    else if (pos.includes('security') || pos.includes('guard')) autoRole = 'Security';
    
    setUsrRole(autoRole);
    setUsrActive(true);
    setIsEditingUser(false);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usrUsername || !usrName || !usrEmail) return;

    // Check if username is already taken by another user
    const usernameExists = db.users.some(u => u.username.toLowerCase() === usrUsername.toLowerCase() && u.id !== usrId);
    if (usernameExists) {
      alert('Username is already in use by another operator.');
      return;
    }

    const newUser: User = {
      id: usrId || `user_${Date.now()}`,
      username: usrUsername.trim(),
      passwordHash: usrPassword || 'password123', // Default password if empty
      role: usrRole,
      name: usrName.trim(),
      email: usrEmail.trim(),
      isActive: usrActive,
      employeeId: usrEmpId || undefined,
      createdAt: usrId ? (db.users.find(u => u.id === usrId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    store.saveUser(newUser);
    
    // Clear form
    setUsrId('');
    setUsrUsername('');
    setUsrPassword('');
    setUsrName('');
    setUsrEmail('');
    setUsrRole('Receptionist');
    setUsrActive(true);
    setUsrEmpId('');
    setIsEditingUser(false);
  };

  const handleEditUser = (user: User) => {
    setUsrId(user.id);
    setUsrUsername(user.username);
    setUsrPassword(user.passwordHash);
    setUsrName(user.name);
    setUsrEmail(user.email);
    setUsrRole(user.role);
    setUsrActive(user.isActive);
    setUsrEmpId(user.employeeId || '');
    setIsEditingUser(true);
  };

  const handleCancelUserEdit = () => {
    setUsrId('');
    setUsrUsername('');
    setUsrPassword('');
    setUsrName('');
    setUsrEmail('');
    setUsrRole('Receptionist');
    setUsrActive(true);
    setUsrEmpId('');
    setIsEditingUser(false);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user account permanently?')) {
      const res = store.deleteUser(userId);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  const handleUnlinkUser = (user: User) => {
    if (confirm(`Are you sure you want to unlink operator account @${user.username} from this employee profile?`)) {
      const updatedUser = { ...user };
      delete updatedUser.employeeId;
      store.saveUser(updatedUser);
    }
  };

  const handleGoToAndEditUser = (user: User) => {
    setActiveTab('users');
    handleEditUser(user);
  };

  const handleToggleUserActive = (user: User) => {
    const updatedUser = { ...user, isActive: !user.isActive };
    store.saveUser(updatedUser);
  };

  const handleToggleRolePermission = (role: Role, permissionId: Permission) => {
    let updatedPermissions = [...role.permissions];
    if (updatedPermissions.includes('all')) {
      // If 'all', split it into other permissions to edit individually
      updatedPermissions = ['view_dashboard', 'manage_guests', 'manage_rooms', 'manage_restaurant', 'manage_pos', 'manage_inventory', 'manage_accounting', 'manage_housekeeping', 'manage_settings'];
    }

    if (updatedPermissions.includes(permissionId)) {
      updatedPermissions = updatedPermissions.filter(p => p !== permissionId);
    } else {
      updatedPermissions.push(permissionId);
    }

    store.saveRole({
      ...role,
      permissions: updatedPermissions
    });
  };

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
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Console & Account Users
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
                    const linkedUser = db.users.find(u => u.employeeId === emp.id || u.email.toLowerCase() === emp.email.toLowerCase());
                    return (
                      <div key={emp.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 space-y-2 text-xs relative flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-[#1B4F72] text-white flex items-center justify-center font-bold font-sans">
                              {emp.firstName[0]}{emp.lastName[0]}
                            </div>
                            <div>
                              <strong className="text-gray-800 text-sm block font-bold">{emp.firstName} {emp.lastName}</strong>
                              <span className="text-[10px] text-gray-400 font-semibold">{emp.position} • {deptObj?.name}</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-gray-200/50 space-y-1 text-gray-500 font-semibold mt-2">
                            <span className="block">Email: <strong className="text-gray-700">{emp.email}</strong></span>
                            <span className="block">Contact: <strong className="text-gray-700">{emp.phone}</strong></span>
                            <span className="block">Type: <strong className="text-gray-700">{emp.contractType}</strong></span>
                            <span className="block">Monthly Base: <strong className="text-gray-700">${emp.salary.toLocaleString()}</strong></span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200/50 flex flex-wrap items-center justify-between gap-1.5 mt-1.5">
                          {linkedUser ? (
                            <div className="flex items-center space-x-1.5 w-full justify-between">
                              <span className="inline-flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                <UserCheck className="h-3 w-3" />
                                <span>Console: @{linkedUser.username}</span>
                              </span>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleGoToAndEditUser(linkedUser)}
                                  className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-[9px] font-bold transition cursor-pointer"
                                  title="Edit login credentials and settings"
                                >
                                  View Account
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkUser(linkedUser)}
                                  className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-250 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded text-[9px] font-bold transition cursor-pointer"
                                  title="Unlink from this employee profile"
                                >
                                  Unlink
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 w-full">
                              <button
                                type="button"
                                onClick={() => handleCreateAccountFromEmployee(emp)}
                                className="px-2 py-1 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold transition duration-150 inline-flex items-center space-x-1 cursor-pointer"
                              >
                                <Lock className="h-3 w-3" />
                                <span>+ Create Account</span>
                              </button>

                              {/* Dropdown to select existing operator account instead of creating a terminal user */}
                              {db.users.filter(u => !u.employeeId).length > 0 && (
                                <select
                                  className="px-2 py-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300 rounded cursor-pointer transition max-w-[130px] focus:outline-none"
                                  value=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      const targetUser = db.users.find(u => u.id === val);
                                      if (targetUser) {
                                        store.saveUser({
                                          ...targetUser,
                                          employeeId: emp.id
                                        });
                                        alert(`Linked employee ${emp.firstName} ${emp.lastName} to operator @${targetUser.username} successfully!`);
                                      }
                                    }
                                  }}
                                >
                                  <option value="">🔗 Link Existing</option>
                                  {db.users.filter(u => !u.employeeId).map(u => (
                                    <option key={u.id} value={u.id}>
                                      @{u.username} ({u.role})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}
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

      {/* TAB 5: CONSOLE & ACCOUNT USERS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* User Create/Edit Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                {isEditingUser ? (
                  <>
                    <Edit className="h-4 w-4 mr-1.5 text-blue-600" /> Modify Operator Account
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1.5 text-green-600" /> Create Operator Account
                  </>
                )}
              </h3>
              
              <form onSubmit={handleSaveUser} className="space-y-4">
                {/* Select Employee Link */}
                <div className="bg-amber-50/30 dark:bg-amber-950/5 p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                      Link to HR Employee Profile
                    </label>
                    <span className="text-[9px] font-bold text-amber-700/80 bg-amber-100/50 px-1.5 py-0.2 rounded">
                      Staff Directory Option
                    </span>
                  </div>
                  <select
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 border border-amber-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-850 dark:text-gray-200 cursor-pointer focus:outline-none transition"
                    value={usrEmpId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      setUsrEmpId(empId);
                      if (empId) {
                        const emp = db.employees.find(x => x.id === empId);
                        if (emp) {
                          setUsrName(`${emp.firstName} ${emp.lastName}`);
                          setUsrEmail(emp.email);
                          
                          // Suggest a clean username
                          const suggestedUsername = (emp.firstName[0] + emp.lastName).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                          if (!isEditingUser) {
                            setUsrUsername(suggestedUsername);
                            setUsrPassword('pass_' + Math.random().toString(36).substring(2, 6));
                          }

                          // Auto select close system role
                          const pos = emp.position.toLowerCase();
                          let autoRole: RoleName = 'Receptionist';
                          if (pos.includes('admin') || pos.includes('system')) autoRole = 'Super Admin';
                          else if (pos.includes('ceo') || pos.includes('executive')) autoRole = 'CEO';
                          else if (pos.includes('manager') || pos.includes('director')) autoRole = 'Manager';
                          else if (pos.includes('reception') || pos.includes('front desk') || pos.includes('desk')) autoRole = 'Receptionist';
                          else if (pos.includes('accountant') || pos.includes('finance') || pos.includes('billing')) autoRole = 'Accountant';
                          else if (pos.includes('cashier') || pos.includes('pos')) autoRole = 'Cashier';
                          else if (pos.includes('waiter') || pos.includes('server') || pos.includes('steward')) autoRole = 'Waiter';
                          else if (pos.includes('chef') || pos.includes('cook') || pos.includes('kitchen')) autoRole = 'Chef';
                          else if (pos.includes('housekeep') || pos.includes('cleaner') || pos.includes('laundry')) autoRole = 'Housekeeper';
                          else if (pos.includes('store') || pos.includes('keeper') || pos.includes('inventory')) autoRole = 'Storekeeper';
                          else if (pos.includes('maintenance') || pos.includes('engineer') || pos.includes('plumber') || pos.includes('electrician')) autoRole = 'Maintenance Staff';
                          else if (pos.includes('security') || pos.includes('guard')) autoRole = 'Security';
                          
                          setUsrRole(autoRole);
                        }
                      } else {
                        if (!isEditingUser) {
                          setUsrName('');
                          setUsrEmail('');
                          setUsrUsername('');
                          setUsrPassword('');
                        }
                      }
                    }}
                  >
                    <option value="">-- Manual Operator Account (No HR Link) --</option>
                    {db.employees.map(emp => {
                      const alreadyLinked = db.users.some(u => u.employeeId === emp.id && u.id !== usrId);
                      return (
                        <option key={emp.id} value={emp.id}>
                          👤 {emp.firstName} {emp.lastName} ({emp.position}) {alreadyLinked ? '⚠️ [Already Linked]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Operator Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800 font-semibold"
                    value={usrName}
                    onChange={(e) => setUsrName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    placeholder="j.doe@grandhorizon.com"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                    value={usrEmail}
                    onChange={(e) => setUsrEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Console Username</label>
                    <input
                      type="text"
                      required
                      placeholder="jdoe"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none font-mono"
                      value={usrUsername}
                      onChange={(e) => setUsrUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Secure Password</label>
                    <input
                      type="text"
                      placeholder={isEditingUser ? "Keep existing or type new" : "e.g. password123"}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none font-mono"
                      value={usrPassword}
                      onChange={(e) => setUsrPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Operator System Role</label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      value={usrRole}
                      onChange={(e) => setUsrRole(e.target.value as any)}
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="CEO">CEO</option>
                      <option value="Manager">Manager</option>
                      <option value="Receptionist">Receptionist (Front Desk)</option>
                      <option value="Accountant">Accountant (Ledgers)</option>
                      <option value="Cashier">Cashier (Store POS)</option>
                      <option value="Waiter">Waiter (Restaurant Orders)</option>
                      <option value="Chef">Chef (Kitchen Queue)</option>
                      <option value="Housekeeper">Housekeeper</option>
                      <option value="Storekeeper">Storekeeper</option>
                      <option value="Maintenance Staff">Maintenance Staff</option>
                      <option value="Security">Security Agent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account State</label>
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="user_active_toggle"
                        className="rounded border-gray-300 text-[#1B4F72] focus:ring-[#1B4F72] h-4 w-4 animate-none"
                        checked={usrActive}
                        onChange={(e) => setUsrActive(e.target.checked)}
                      />
                      <label htmlFor="user_active_toggle" className="text-xs text-gray-600 font-semibold cursor-pointer">
                        Active Access
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    {isEditingUser ? 'Update Operator' : 'Register Operator'}
                  </button>
                  {isEditingUser && (
                    <button
                      type="button"
                      onClick={handleCancelUserEdit}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Operator Accounts Directory */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-b-gray-100">Registered Operators Directory ({db.users.length})</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-2.5 px-3">Operator Name</th>
                      <th className="py-2.5 px-3">Credentials</th>
                      <th className="py-2.5 px-3">System Role</th>
                      <th className="py-2.5 px-3">Accessible Consoles</th>
                      <th className="py-2.5 px-3">State</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {db.users.map(usr => {
                      const roleObj = db.roles.find(r => r.name === usr.role);
                      const hasAll = roleObj?.permissions.includes('all') || usr.role === 'Super Admin';
                      
                      return (
                        <tr key={usr.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3">
                            <strong className="text-gray-800 text-xs block font-bold">{usr.name}</strong>
                            <span className="text-[10px] text-gray-400 block font-normal">{usr.email}</span>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <span className="block text-gray-600 text-[11px]">User: <strong className="text-gray-800">{usr.username}</strong></span>
                            <span className="block text-[10px] text-gray-400">Pass: {usr.passwordHash}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="bg-blue-50 text-[#1B4F72] text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100 block w-fit">
                              {usr.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-[200px]">
                            {hasAll ? (
                              <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded font-bold">
                                All Consoles (Full Access)
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-h-[48px] overflow-y-auto">
                                {roleObj?.permissions.map(perm => {
                                  let label = '';
                                  if (perm === 'view_dashboard') label = 'Exec';
                                  else if (perm === 'manage_guests') label = 'Front';
                                  else if (perm === 'manage_rooms') label = 'Rooms';
                                  else if (perm === 'manage_restaurant') label = 'POS';
                                  else if (perm === 'manage_inventory') label = 'Stock';
                                  else if (perm === 'manage_accounting') label = 'HR/Ledger';
                                  else if (perm === 'manage_housekeeping') label = 'Ops';
                                  else if (perm === 'manage_settings') label = 'Settings';
                                  
                                  if (!label) return null;
                                  return (
                                    <span key={perm} className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.2 rounded font-semibold border border-gray-200">
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => handleToggleUserActive(usr)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                usr.isActive 
                                  ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' 
                                  : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                              }`}
                            >
                              {usr.isActive ? 'Active' : 'Suspended'}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleEditUser(usr)}
                                className="p-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-500 hover:text-blue-600 transition cursor-pointer"
                                title="Edit Credentials"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(usr.id)}
                                className="p-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-500 hover:text-red-600 transition cursor-pointer"
                                title="Delete Operator"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Role-Based Console Access Configurator */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Role-Based Console Access Control (RBAC)</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Toggle which console buttons and modules are authorized and visible for each employee role.</p>
              </div>

              {/* Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Configure Role:</span>
                <select
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
                  value={selectedRoleName}
                  onChange={(e) => setSelectedRoleName(e.target.value as any)}
                >
                  {db.roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Config Board */}
            {(() => {
              const currentRoleObj = db.roles.find(r => r.name === selectedRoleName);
              if (!currentRoleObj) return null;
              
              const isSuperAdmin = selectedRoleName === 'Super Admin';
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-150 space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center">
                      <Shield className="h-4 w-4 mr-1.5 text-[#1B4F72]" /> System Role Description
                    </h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      {currentRoleObj.description}
                    </p>
                    <div className="pt-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Database State Name</span>
                      <code className="text-[11px] font-mono px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-700">
                        {currentRoleObj.name}
                      </code>
                    </div>

                    {isSuperAdmin && (
                      <div className="p-3 bg-purple-50 border border-purple-150 rounded-xl text-xs text-purple-700 font-semibold flex items-start space-x-2 mt-4">
                        <Lock className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>The **Super Admin** role has inherent wildcard root permission ('all') bypass. Its permissions cannot be modified.</span>
                      </div>
                    )}
                  </div>

                  {/* Permissions Checklist */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Authorized Consoles & Modules</h4>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {[
                        { id: 'view_dashboard', label: 'Executive Analytics & Shift Reconciliation', description: 'Dashboard view & shift reporting access.' },
                        { id: 'manage_guests', label: 'Front Desk Office', description: 'Guests profiles, bookings, and check-ins.' },
                        { id: 'manage_rooms', label: 'Room Inventory', description: 'Configuring room statuses and pricing.' },
                        { id: 'manage_restaurant', label: 'Food & Dining POS (Waiter Dashboard)', description: 'Restaurant order pads, waiter workload monitor, and kitchen lists.' },
                        { id: 'manage_pos', label: 'Restaurant Cashier POS Terminal', description: 'Point of Sale billing, terminal ordering, and payment checkout.' },
                        { id: 'manage_inventory', label: 'Procure & Stock', description: 'Store inventories and supplier request grids.' },
                        { id: 'manage_accounting', label: 'HR, Payroll & General Ledgers', description: 'Staff directory, timesheets, payroll payslips, and transaction posting.' },
                        { id: 'manage_housekeeping', label: 'Operations & Repairs', description: 'Cleaning assignments, laundry lists, and repairs requests.' },
                        { id: 'manage_settings', label: 'Global Settings & Backups', description: 'Configure building infrastructure structure, theme, or printer profiles.' }
                      ].map(permItem => {
                        const isGranted = isSuperAdmin || currentRoleObj.permissions.includes('all') || currentRoleObj.permissions.includes(permItem.id as any);
                        
                        return (
                          <div 
                            key={permItem.id} 
                            className={`p-3 rounded-xl border transition flex items-start justify-between ${
                              isGranted 
                                ? 'bg-green-50/40 border-green-200 text-gray-800' 
                                : 'bg-gray-50/30 border-gray-150 text-gray-400'
                            }`}
                          >
                            <div className="space-y-0.5 pr-4">
                              <strong className={`text-xs block font-bold ${isGranted ? 'text-gray-800' : 'text-gray-400'}`}>
                                {permItem.label}
                              </strong>
                              <p className="text-[10px] text-gray-400 font-medium">
                                {permItem.description}
                              </p>
                            </div>
                            
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4 mt-0.5 cursor-pointer"
                              checked={isGranted}
                              disabled={isSuperAdmin}
                              onChange={() => handleToggleRolePermission(currentRoleObj, permItem.id as Permission)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
