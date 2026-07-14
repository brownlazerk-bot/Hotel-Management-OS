import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { DailyShiftReport, ConsoleMapping } from '../types';
import { 
  launchPrintPreview,
  getDailyReportHTML,
  getWeeklyReportHTML,
  getMonthlyReportHTML,
  getAnnualReportHTML,
  getInventoryReportHTML,
  getSalesReportHTML,
  getAuditReportHTML,
  getProfitLossStatementHTML,
  getBalanceSheetHTML,
  getCashFlowStatementHTML
} from '../utils/printService';
import {
  ClipboardList,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  BookOpen,
  DollarSign,
  Package,
  HelpCircle,
  Briefcase,
  Users,
  Utensils,
  Warehouse,
  Sliders,
  Wrench,
  Shield,
  Edit3,
  Printer,
  Save,
  Home,
  Plus,
  Star,
  Activity,
  Eye,
  Settings
} from 'lucide-react';

export default function ShiftReporting() {
  const db = store.getDb();
  const activeUser = store.getActiveUser();

  // Active module tab
  const [activeConsoleTab, setActiveConsoleTab] = useState<'audit' | 'management' | 'business_reports'>('audit');

  // Business operations reporting states
  const [reportFrequency, setReportFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportDateRange, setReportDateRange] = useState<string>('current'); // 'current' | 'previous'
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Selected report for detail pane
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Console management editing state
  const [editingConsoleId, setEditingConsoleId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Selected department ID for live portal dashboard simulation
  const [activePortalDeptId, setActivePortalDeptId] = useState<string>('dept_reception');

  // Interactive physical stock verification counts input
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});

  const reports = db.shiftReports || [];

  // Default to first report if none selected
  const activeReport = useMemo(() => {
    if (selectedReportId) {
      return reports.find(r => r.id === selectedReportId);
    }
    return reports[0] || null;
  }, [selectedReportId, reports]);

  const handleUpdateStatus = (reportId: string, status: DailyShiftReport['status']) => {
    store.updateShiftReportStatus(reportId, status, actionNotes || undefined);
    setActionNotes('');
    setSuccessMsg(`Report successfully updated to "${status}" and forwarded to the next department.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleReconcileStock = (productId: string, actualCountStr: string, name: string) => {
    const actualCount = parseInt(actualCountStr, 10);
    if (isNaN(actualCount)) {
      alert('Please enter a valid physical count integer first.');
      return;
    }
    
    if (confirm(`Auto-adjust warehouse inventory of "${name}" to match the physical count of ${actualCount} units? This will register an inventory correction movement.`)) {
      store.reconcileProductStock(productId, actualCount, `Audit correction for ${name} during shift reconciliation`);
      setSuccessMsg(`Inventory stock for "${name}" has been successfully updated to match physical count (${actualCount}).`);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const handleSaveMapping = (consoleId: string, consoleName: string) => {
    if (!selectedDeptId) return;
    store.saveConsoleMapping({
      consoleId,
      consoleName,
      departmentId: selectedDeptId
    });
    setEditingConsoleId(null);
    setSelectedDeptId('');
    setSuccessMsg(`Console "${consoleName}" is now controlled by the selected department.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Helper to determine active step index for visual stepper
  const getStepIndex = (status: DailyShiftReport['status']) => {
    switch (status) {
      case 'Pending Stock Verification': return 1;
      case 'Pending Manager Approval': return 2;
      case 'Pending CEO Approval': return 3;
      case 'Approved By CEO': return 4;
      default: return 1;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-150 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-[#1B4F72]" /> Operations & Shift Reconciliation Console
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Audit daily cash drawers, cross-reference POS item quantities with physical stock decrements, and route reports from floor Cashiers through Stock Verification, Manager Approval, to final CEO sign-off.
          </p>
        </div>
        
        {/* Quick Simulator Role Switching Prompt */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-150 text-[11px] space-y-1.5 w-full md:w-auto shrink-0">
          <strong className="text-gray-700 block uppercase font-bold tracking-wider">Simulation Sandbox Roles</strong>
          <p className="text-gray-400">Current User: <strong className="text-[#1B4F72]">{activeUser?.name} ({activeUser?.role})</strong></p>
          <div className="text-[9px] text-gray-400 leading-tight">
            Switch users using the <strong className="text-gray-600">Quick Bypass Badges</strong> on the Login screen to approve.
          </div>
        </div>
      </div>


      {/* Sub Tab Switcher */}
      <div className="flex border-b border-gray-150 pb-px space-x-6">
        <button
          onClick={() => setActiveConsoleTab('audit')}
          className={`pb-3 text-xs font-bold transition duration-150 border-b-2 cursor-pointer flex items-center space-x-1.5 ${
            activeConsoleTab === 'audit'
              ? 'border-[#1B4F72] text-[#1B4F72]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Shift Reconciliation Audit</span>
        </button>
        <button
          onClick={() => setActiveConsoleTab('management')}
          className={`pb-3 text-xs font-bold transition duration-150 border-b-2 cursor-pointer flex items-center space-x-1.5 ${
            activeConsoleTab === 'management'
              ? 'border-[#1B4F72] text-[#1B4F72]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Console Control & Department Portals</span>
        </button>
        <button
          onClick={() => setActiveConsoleTab('business_reports')}
          className={`pb-3 text-xs font-bold transition duration-150 border-b-2 cursor-pointer flex items-center space-x-1.5 ${
            activeConsoleTab === 'business_reports'
              ? 'border-[#1B4F72] text-[#1B4F72]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span>Executive Business & Operations Reports</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center space-x-2 text-sm font-semibold shadow-sm">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: SHIFT RECONCILIATION AUDIT */}
      {activeConsoleTab === 'audit' && (
        reports.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-150 shadow-sm max-w-3xl mx-auto space-y-4">
            <HelpCircle className="h-12 w-12 text-gray-300 mx-auto" />
            <h2 className="text-md font-bold text-gray-800">No Shift Reports Submitted Yet</h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              To start the audit flow, first go to the <strong className="text-gray-700">Food & Dining POS</strong> module, click the <strong className="text-gray-700">Shift & Cash Drawer</strong> tab, and submit a cashier shift handover report.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT: Shift Reports List Sidebar */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reports Registry ({reports.length})</h2>
                
                <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                  {reports.map(rep => {
                    const isSelected = activeReport?.id === rep.id;
                    const step = getStepIndex(rep.status);
                    
                    return (
                      <div
                        key={rep.id}
                        onClick={() => setSelectedReportId(rep.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                          isSelected 
                            ? 'bg-blue-50/50 border-[#1B4F72] shadow-sm' 
                            : 'bg-gray-50/50 border-gray-150 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-xs text-gray-800 block">ID: {rep.id}</strong>
                            <span className="text-[10px] text-gray-400 font-bold block uppercase mt-0.5">By: {rep.cashierName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            rep.status === 'Pending Stock Verification' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            rep.status === 'Pending Manager Approval' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            rep.status === 'Pending CEO Approval' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {rep.status === 'Pending Stock Verification' ? 'Stock Verif.' :
                             rep.status === 'Pending Manager Approval' ? 'Manager Rev.' :
                             rep.status === 'Pending CEO Approval' ? 'CEO Sign-off' : 'Approved'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-100 text-[10px]">
                          <div>
                            <span className="text-gray-400 block uppercase font-medium">Drawer Actual</span>
                            <strong className="text-gray-700 font-mono font-bold">${rep.actualCash.toFixed(2)}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400 block uppercase font-medium">Discrepancy</span>
                            <strong className={`font-mono font-bold ${rep.isDiscrepancyFound ? 'text-red-600' : 'text-green-600'}`}>
                              {(rep.actualCash - rep.expectedCash).toFixed(2)}
                            </strong>
                          </div>
                        </div>

                        {/* Micro Stepper Gauge */}
                        <div className="mt-3 flex items-center space-x-1">
                          {[1, 2, 3, 4].map(idx => (
                            <div 
                              key={idx} 
                              className={`h-1.5 rounded-full flex-1 transition-colors ${
                                idx < step ? 'bg-green-500' :
                                idx === step ? 'bg-[#1B4F72]' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: Shift Report Audit & Interactive Sign-off Panel */}
            {activeReport && (
              <div className="lg:col-span-7 space-y-6">
                
                {/* Core Audit Information */}
                <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6">
                  
                  {/* Header detail */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-100 gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 block uppercase">RECONCILIATION DOSSIER</span>
                      <h2 className="text-md font-bold text-gray-800">Shift Report: {activeReport.id}</h2>
                      <p className="text-[11px] text-gray-400 font-medium">
                        Shift window: {new Date(activeReport.startTime).toLocaleString()} - {new Date(activeReport.endTime).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      activeReport.status === 'Pending Stock Verification' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                      activeReport.status === 'Pending Manager Approval' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      activeReport.status === 'Pending CEO Approval' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {activeReport.status}
                    </span>
                  </div>

                  {/* VISUAL REPORT WORKFLOW STEPPER */}
                  <div className="py-2">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Operations Verification Status</h3>
                    <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-1">
                      
                      {/* Step 1: Floor Cashier */}
                      <div className="flex items-center sm:flex-col sm:text-center flex-1 z-10">
                        <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center shrink-0 border border-green-200">
                          ✓
                        </div>
                        <div className="ml-3 sm:ml-0 sm:mt-2">
                          <strong className="text-[11px] text-gray-800 block font-bold leading-none">1. Cashier Handover</strong>
                          <span className="text-[9px] text-gray-400 block mt-0.5">Submitted by {activeReport.cashierName}</span>
                        </div>
                      </div>

                      <div className="hidden sm:block h-0.5 bg-gray-200 flex-1 mx-2" />

                      {/* Step 2: Stock Dept */}
                      <div className="flex items-center sm:flex-col sm:text-center flex-1 z-10">
                        <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                          getStepIndex(activeReport.status) >= 2 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {getStepIndex(activeReport.status) >= 2 ? '✓' : '2'}
                        </div>
                        <div className="ml-3 sm:ml-0 sm:mt-2">
                          <strong className="text-[11px] text-gray-800 block font-bold leading-none">2. Stock Verification</strong>
                          <span className="text-[9px] text-gray-400 block mt-0.5">
                            {activeReport.stockVerifiedBy ? `Verified by ${activeReport.stockVerifiedBy}` : 'Pending review'}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block h-0.5 bg-gray-200 flex-1 mx-2" />

                      {/* Step 3: Operations Manager */}
                      <div className="flex items-center sm:flex-col sm:text-center flex-1 z-10">
                        <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                          getStepIndex(activeReport.status) >= 3 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : getStepIndex(activeReport.status) === 2
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}>
                          {getStepIndex(activeReport.status) >= 3 ? '✓' : '3'}
                        </div>
                        <div className="ml-3 sm:ml-0 sm:mt-2">
                          <strong className="text-[11px] text-gray-800 block font-bold leading-none">3. Manager Review</strong>
                          <span className="text-[9px] text-gray-400 block mt-0.5">
                            {activeReport.managerApprovedBy ? `Approved by ${activeReport.managerApprovedBy}` : 'Awaiting review'}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block h-0.5 bg-gray-200 flex-1 mx-2" />

                      {/* Step 4: CEO Sign-off */}
                      <div className="flex items-center sm:flex-col sm:text-center flex-1 z-10">
                        <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                          activeReport.status === 'Approved By CEO' 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : activeReport.status === 'Pending CEO Approval'
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}>
                          {activeReport.status === 'Approved By CEO' ? '✓' : '4'}
                        </div>
                        <div className="ml-3 sm:ml-0 sm:mt-2">
                          <strong className="text-[11px] text-gray-800 block font-bold leading-none">4. CEO Authorization</strong>
                          <span className="text-[9px] text-gray-400 block mt-0.5">
                            {activeReport.ceoApprovedBy ? `Signed by ${activeReport.ceoApprovedBy}` : 'Final signature'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Cash Drawer Reconciliation Grid */}
                  <div className="space-y-3.5 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Drawer Financial Settlement</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Total Shift Revenue</span>
                        <strong className="text-lg font-mono block text-gray-800 mt-1">${activeReport.totalSalesValue.toFixed(2)}</strong>
                        <span className="text-[9px] text-gray-400 block">From {activeReport.totalSalesCount} order slips</span>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Expected Cash Balance</span>
                        <strong className="text-lg font-mono block text-gray-800 mt-1">${activeReport.expectedCash.toFixed(2)}</strong>
                        <span className="text-[9px] text-gray-400 block">Starting float + cash sales</span>
                      </div>

                      <div className={`p-4 rounded-2xl border ${
                        activeReport.isDiscrepancyFound ? 'bg-red-50/50 border-red-200' : 'bg-green-50/50 border-green-200'
                      }`}>
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Actual Cash Counted</span>
                        <strong className={`text-lg font-mono block mt-1 ${
                          activeReport.isDiscrepancyFound ? 'text-red-700' : 'text-green-700'
                        }`}>
                          ${activeReport.actualCash.toFixed(2)}
                        </strong>
                        <span className={`text-[10px] font-bold block ${
                          activeReport.isDiscrepancyFound ? 'text-red-600 animate-pulse' : 'text-green-600'
                        }`}>
                          {activeReport.isDiscrepancyFound 
                            ? `⚠️ Discrepancy of ${(activeReport.actualCash - activeReport.expectedCash).toFixed(2)}`
                            : '✓ Cash drawer balanced'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Stock Levels Auditing */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center">
                        <Package className="h-4 w-4 mr-1 text-[#1B4F72]" /> Inventory Stock Audit Trail
                      </h3>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded border border-gray-150">
                        POS vs Stock Levels
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-150">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase bg-gray-50/60">
                            <th className="py-2.5 px-3">Menu Item Sold</th>
                            <th className="py-2.5 px-3 text-center">Qty Sold</th>
                            <th className="py-2.5 px-3">Matched Stock Product</th>
                            <th className="py-2.5 px-3 text-right">Warehouse Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                          {activeReport.itemsSold.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-gray-400 text-xs italic">
                                No item details provided for this shift report.
                              </td>
                            </tr>
                          ) : (
                            activeReport.itemsSold.map((it, idx) => {
                              const menuItem = db.menuItems.find(mi => mi.id === it.menuItemId);
                              const product = menuItem?.productId ? db.products.find(p => p.id === menuItem.productId) : null;
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-50/30">
                                  <td className="py-2.5 px-3 font-semibold text-gray-800">{it.name}</td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-700">{it.quantitySold}</td>
                                  <td className="py-2.5 px-3">
                                    {product ? (
                                      <span className="text-[#1B4F72] text-[10.5px] font-medium block">
                                        {product.name}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 italic">No inventory link</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {product ? (
                                      <span className={`font-mono font-bold ${
                                        product.currentStock <= product.minStockAlert ? 'text-amber-600' : 'text-gray-700'
                                      }`}>
                                        {product.currentStock} {product.unit} left
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Live Physical Stock Matcher & Discrepancy Link */}
                    <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center">
                          <CheckCircle className="h-3.5 w-3.5 mr-1 text-[#1B4F72]" /> Stock Sold vs Remaining Matcher
                        </h4>
                        <span className="text-[10px] font-bold text-[#1B4F72] bg-white px-2 py-0.5 rounded border border-blue-150">
                          Verification Helper Tool
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Check physical stock levels in real-time. Input counted values to verify if they match system ledger expectations (Theoretical Stock after the Shift Sales).
                      </p>

                      <div className="space-y-2">
                        {activeReport.itemsSold.filter(it => {
                          const menuItem = db.menuItems.find(mi => mi.id === it.menuItemId);
                          return menuItem?.productId;
                        }).length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic">No inventory products linked to this shift's sold items.</p>
                        ) : (
                          activeReport.itemsSold.map((it, idx) => {
                            const menuItem = db.menuItems.find(mi => mi.id === it.menuItemId);
                            const product = menuItem?.productId ? db.products.find(p => p.id === menuItem.productId) : null;
                            if (!product) return null;

                            const expectedRemaining = product.currentStock;
                            const physicalCountInput = physicalCounts[product.id] || '';
                            const physicalCountNum = parseInt(physicalCountInput, 10);
                            const hasInput = physicalCountInput !== '';
                            const isMatch = hasInput && !isNaN(physicalCountNum) && physicalCountNum === expectedRemaining;
                            const discrepancy = hasInput && !isNaN(physicalCountNum) ? physicalCountNum - expectedRemaining : 0;

                            return (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-gray-150 text-xs space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-bold text-gray-800 text-[11px] block">{product.name}</span>
                                    <span className="text-[10px] text-gray-400 block font-mono">ID: {product.id} | Category: {product.category}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-gray-400 text-[10px] block font-semibold">Shift Qty Sold</span>
                                    <span className="font-mono font-bold text-[#1B4F72] text-[11px] bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100">{it.quantitySold} {product.unit}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                                  <div>
                                    <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Expected Balance</span>
                                    <span className="font-mono font-bold text-gray-700 text-xs block mt-1">{expectedRemaining} {product.unit} left</span>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">Physical Checked</label>
                                    <div className="flex items-center space-x-1 mt-0.5">
                                      <input
                                        type="number"
                                        placeholder="Count"
                                        className="w-16 px-1.5 py-1 text-xs border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold text-gray-800"
                                        value={physicalCountInput}
                                        onChange={(e) => setPhysicalCounts(prev => ({ ...prev, [product.id]: e.target.value }))}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setPhysicalCounts(prev => ({ ...prev, [product.id]: expectedRemaining.toString() }))}
                                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[9px] font-bold rounded-lg cursor-pointer transition"
                                        title="Autofill with expected balance"
                                      >
                                        Match
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Status & Action</span>
                                    {!hasInput ? (
                                      <span className="text-[10px] text-amber-600 font-bold flex items-center mt-1">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1 animate-ping" />
                                        Pending count...
                                      </span>
                                    ) : isMatch ? (
                                      <span className="text-[10px] text-emerald-600 font-bold flex items-center mt-1">
                                        ✓ Matches perfectly!
                                      </span>
                                    ) : (
                                      <div className="space-y-1 mt-0.5">
                                        <span className="text-[10px] text-red-600 font-bold block">
                                          ⚠️ Mismatch ({discrepancy > 0 ? `+${discrepancy}` : discrepancy} {product.unit})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleReconcileStock(product.id, physicalCountInput, product.name)}
                                          className="text-[9px] bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center"
                                        >
                                          Sync Stock Level
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Handover & Approver Notes Log */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Commentary & Verification Log</h3>
                    
                    <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-150 text-xs leading-relaxed">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Cashier Remarks ({activeReport.cashierName}):</span>
                        <p className="text-gray-700 italic mt-0.5">"{activeReport.notes || 'No notes left by cashier.'}"</p>
                      </div>
                      {activeReport.notes_stock && (
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Stock Department Verification ({activeReport.stockVerifiedBy}):</span>
                          <p className="text-gray-700 italic mt-0.5">"{activeReport.notes_stock}"</p>
                        </div>
                      )}
                      {activeReport.notes_manager && (
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Manager Comments ({activeReport.managerApprovedBy}):</span>
                          <p className="text-gray-700 italic mt-0.5">"{activeReport.notes_manager}"</p>
                        </div>
                      )}
                      {activeReport.notes_ceo && (
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">CEO Sign-off Comments ({activeReport.ceoApprovedBy}):</span>
                          <p className="text-gray-700 italic mt-0.5">"{activeReport.notes_ceo}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* INTERACTIVE WORKFLOW SIGN-OFF ACTIONS BLOCK */}
                <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center">
                    <ShieldCheck className="h-4.5 w-4.5 mr-1 text-[#1B4F72]" /> Review & Authorize Next Action
                  </h3>

                  {/* Scenario 1: Pending Stock Verification */}
                  {activeReport.status === 'Pending Stock Verification' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">
                        As the <strong className="text-gray-700">Stock Manager / Warehouse Officer</strong>, verify that the physical quantities sold during this shift align perfectly with the theoretical inventory reductions logged in the Procurement Ledger.
                      </p>
                      
                      {/* Role Checker Badge */}
                      {activeUser?.role !== 'Storekeeper' && activeUser?.role !== 'Super Admin' && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                          ⚠️ <strong>Insufficient Clearance:</strong> You are currently logged in as <strong className="text-amber-900">{activeUser?.name} ({activeUser?.role})</strong>. Switch to the Storekeeper/Stock Manager or Super Admin using the login Quick Badges to authorize this step.
                        </div>
                      )}

                      <div className="space-y-3">
                        <textarea
                          rows={2.5}
                          placeholder="Add stock verification comments, e.g. Physical inventory counted. Oyster batches verified to match the 8 sales. Stock levels are correct, forwarding."
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#1B4F72] text-gray-800"
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                        />
                        
                        <button
                          onClick={() => handleUpdateStatus(activeReport.id, 'Pending Manager Approval')}
                          disabled={activeUser?.role !== 'Storekeeper' && activeUser?.role !== 'Super Admin'}
                          className="px-4 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                        >
                          <span>Verify Stock & Forward to Manager</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scenario 2: Pending Manager Approval */}
                  {activeReport.status === 'Pending Manager Approval' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">
                        As the <strong className="text-gray-700">General Manager</strong>, review the cashier actual cash vs expected calculations, discrepancy logs, and the Stock Department's verification comments before passing this record to the CEO for final corporate sign-off.
                      </p>
                      
                      {/* Role Checker Badge */}
                      {activeUser?.role !== 'Manager' && activeUser?.role !== 'Super Admin' && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                          ⚠️ <strong>Insufficient Clearance:</strong> You are currently logged in as <strong className="text-amber-900">{activeUser?.name} ({activeUser?.role})</strong>. Switch to the General Manager / Hotel Manager (e.g. <strong>Devon Carter</strong>) or Super Admin using the login Quick Badges to authorize this step.
                        </div>
                      )}

                      <div className="space-y-3">
                        <textarea
                          rows={2.5}
                          placeholder={`Add management comments, e.g. Reviewed shift discrepancy. Reason verified. Approved for CEO final sign-off.`}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#1B4F72] text-gray-800"
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                        />
                        
                        <button
                          onClick={() => {
                            // save comments in custom field or just pass notes to store status update
                            handleUpdateStatus(activeReport.id, 'Pending CEO Approval');
                          }}
                          disabled={activeUser?.role !== 'Manager' && activeUser?.role !== 'Super Admin'}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                        >
                          <span>GM Approve & Send to CEO</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scenario 3: Pending CEO Approval */}
                  {activeReport.status === 'Pending CEO Approval' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">
                        As the <strong className="text-gray-700">CEO / Super Admin</strong>, inspect the entire corporate audit trail. Your authorization executes the ledger closure, solidifies the sales income, and locks this record from future modification.
                      </p>
                      
                      {/* Role Checker Badge */}
                      {activeUser?.role !== 'Super Admin' && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                          ⚠️ <strong>CEO Level Clearance Required:</strong> Only the CEO / Super Admin (e.g. <strong>Marcus Brody</strong>) can authorize this final financial sign-off. Switch using the login Quick Badges to complete.
                        </div>
                      )}

                      <div className="space-y-3">
                        <textarea
                          rows={2.5}
                          placeholder="Add executive sign-off comments, e.g. Final audit completed. Financial statements approved and shift closed."
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#1B4F72] text-gray-800"
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                        />
                        
                        <button
                          onClick={() => handleUpdateStatus(activeReport.id, 'Approved By CEO')}
                          disabled={activeUser?.role !== 'Super Admin'}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                        >
                          <span>CEO Corporate Sign-Off</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scenario 4: Approved By CEO */}
                  {activeReport.status === 'Approved By CEO' && (
                    <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                        <strong className="text-sm">Shift Report Fully Audited and Closed</strong>
                      </div>
                      <p className="text-xs">
                        This report has received final executive sign-off and is locked. The sales revenue has been safely committed to the Operating Cash Ledger, and inventory deductions are archived.
                      </p>
                      <div className="text-[10px] text-green-700 font-mono mt-1 space-y-1">
                        <p>✓ Cashier: {activeReport.cashierName}</p>
                        <p>✓ Stock Auditor: {activeReport.stockVerifiedBy || 'System Verified'}</p>
                        <p>✓ Operations Manager: {activeReport.managerApprovedBy || 'Samantha Carter'}</p>
                        <p>✓ Signed off by CEO: {activeReport.ceoApprovedBy || 'Marcus Brody'}</p>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}

        </div>
      )
    )}

      {/* TAB 2: CONSOLE CONTROL & DEPARTMENT PORTALS */}
      {activeConsoleTab === 'management' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT: Console Mappings Control */}
          <div className="xl:col-span-5 bg-white p-5 rounded-2xl border border-gray-150 shadow-sm h-fit space-y-4">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Console Authority Mappings</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Edit which department and manager controls each system console.</p>
              </div>
              <Shield className="h-4.5 w-4.5 text-[#1B4F72]" />
            </div>

            <div className="space-y-3">
              {[
                { id: 'rooms', name: 'Rooms & Front Desk', icon: Home, desc: 'Guest booking, check-in, check-out, and room inventory management.' },
                { id: 'pos', name: 'Food & Dining POS', icon: Utensils, desc: 'Point-of-Sale restaurant billing, tables status, kitchen order queues.' },
                { id: 'inventory', name: 'Inventory & Procurement', icon: Warehouse, desc: 'Raw material stock, supplier catalogs, low stock alerts.' },
                { id: 'reports', name: 'Shift Reconciliation', icon: ClipboardList, desc: 'Auditing daily cash handovers and physical-stock match verification.' },
                { id: 'finance', name: 'HR & Ledger', icon: DollarSign, desc: 'Double-entry finance book, corporate payroll, employee database.' },
                { id: 'housekeeping', name: 'Housekeeping & Maintenance', icon: Wrench, desc: 'Room cleaning assignments, active room maintenance tickets.' },
                { id: 'settings', name: 'Settings & Administration', icon: Sliders, desc: 'Hotel global parameters, role permissions, backup and restore.' }
              ].map(consoleItem => {
                const mappings = db.consoleMappings || store.getDefaultConsoleMappings();
                const mapping = mappings.find(m => m.consoleId === consoleItem.id);
                const deptObj = db.departments.find(d => d.id === (mapping?.departmentId || ''));
                const managerObj = db.employees.find(e => e.id === (deptObj?.managerId || ''));
                const IconComponent = consoleItem.icon;
                const isEditing = editingConsoleId === consoleItem.id;

                return (
                  <div key={consoleItem.id} className="p-3 bg-gray-50/50 hover:bg-gray-50 rounded-xl border border-gray-150 space-y-3 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 bg-[#1B4F72]/5 text-[#1B4F72] rounded-lg">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-800">{consoleItem.name}</h4>
                          <p className="text-[9px] text-gray-400 font-semibold leading-relaxed max-w-[220px]">{consoleItem.desc}</p>
                        </div>
                      </div>

                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingConsoleId(consoleItem.id);
                            setSelectedDeptId(mapping?.departmentId || '');
                          }}
                          className="p-1 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-gray-400 hover:text-[#1B4F72] transition cursor-pointer"
                          title="Edit Authority Mapping"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Controlling Department</label>
                          <select
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                          >
                            <option value="">-- Choose Department --</option>
                            {db.departments.map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingConsoleId(null)}
                            className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveMapping(consoleItem.id, consoleItem.name)}
                            className="px-2.5 py-1 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center space-x-1"
                          >
                            <Save className="h-3 w-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-gray-200/50 flex justify-between items-center text-[10px] text-gray-500 font-semibold">
                        <div>
                          <span className="text-gray-400 font-medium">Controls:</span>
                          <span className="text-gray-700 block font-bold">{deptObj?.name || 'Unmapped Department'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 font-medium">Dept. Head:</span>
                          <span className="text-gray-700 block font-bold">
                            {managerObj ? `${managerObj.firstName} ${managerObj.lastName}` : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Departmental Dashboard Simulator / Portal */}
          <div className="xl:col-span-7 bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-5">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Department Dashboard Simulator</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Select a department to preview its dedicated real-time operations console.</p>
              </div>
              <Activity className="h-4.5 w-4.5 text-blue-600" />
            </div>

            {/* Department Quick Buttons Selector */}
            <div className="flex flex-wrap gap-2 pb-2">
              {db.departments.map(d => {
                const isSelected = activePortalDeptId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setActivePortalDeptId(d.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {d.name.split(' ')[0]} {d.name.split(' ')[1] || ''}
                  </button>
                );
              })}
            </div>

            {/* Active Portal Info Card */}
            {(() => {
              const selectedDept = db.departments.find(d => d.id === activePortalDeptId);
              const manager = db.employees.find(e => e.id === selectedDept?.managerId);
              
              // Internal helper to render the selected department dashboard
              const renderDepartmentPortal = () => {
                switch (activePortalDeptId) {
                  case 'dept_reception': {
                    const availableCount = db.rooms.filter(r => r.status === 'Available').length;
                    const occupiedCount = db.rooms.filter(r => r.status === 'Occupied').length;
                    const dirtyCount = db.rooms.filter(r => r.status === 'Dirty').length;
                    const maintCount = db.rooms.filter(r => r.status === 'Maintenance').length;
                    const activeRes = db.reservations.filter(r => r.status === 'Checked In');
                    
                    return (
                      <div className="space-y-5 text-xs font-semibold">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                            <span className="block text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Available Rooms</span>
                            <strong className="text-xl text-blue-800 font-mono">{availableCount}</strong>
                          </div>
                          <div className="p-3 bg-green-50/50 rounded-xl border border-green-100 text-center">
                            <span className="block text-[9px] font-bold text-green-400 uppercase tracking-wider mb-1">Occupied Rooms</span>
                            <strong className="text-xl text-green-800 font-mono">{occupiedCount}</strong>
                          </div>
                          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                            <span className="block text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-1">Dirty / Cleaning</span>
                            <strong className="text-xl text-amber-800 font-mono">{dirtyCount}</strong>
                          </div>
                          <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 text-center">
                            <span className="block text-[9px] font-bold text-red-400 uppercase tracking-wider mb-1">Maintenance</span>
                            <strong className="text-xl text-red-800 font-mono">{maintCount}</strong>
                          </div>
                        </div>

                        <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-150 space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                            <h4 className="text-xs font-bold text-gray-700 flex items-center">
                              <Users className="h-4 w-4 mr-1.5 text-blue-600" /> Active Stays & Check-ins ({activeRes.length})
                            </h4>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Rooms Front Office</span>
                          </div>
                          
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {activeRes.map(res => {
                              const guest = db.guests.find(g => g.id === res.guestId);
                              const room = db.rooms.find(r => r.id === res.roomId);
                              return (
                                <div key={res.id} className="p-2.5 bg-white rounded-lg border border-gray-200/60 flex justify-between items-center">
                                  <div>
                                    <strong className="text-gray-800 block">Room {room?.roomNumber || 'N/A'} • {guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown Guest'}</strong>
                                    <span className="text-[10px] text-gray-400 font-semibold">Checks out: {res.checkOutDate}</span>
                                  </div>
                                  <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded border border-green-100">In-house</span>
                                </div>
                              );
                            })}
                            {activeRes.length === 0 && (
                              <p className="text-center text-xs text-gray-400 py-4">No active checked-in guests.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  case 'dept_restaurant': {
                    const activeTablesCount = db.restaurantTables.filter(t => t.status === 'Occupied' || t.status === 'Reserved').length;
                    const pendingOrders = db.restaurantOrders.filter(o => o.status === 'Pending' || o.status === 'In Kitchen' || o.status === 'Served');
                    const posRevenue = db.restaurantOrders.filter(o => o.status === 'Served' || o.status === 'Paid').reduce((sum, o) => sum + o.total, 0);
                    
                    return (
                      <div className="space-y-5 text-xs font-semibold">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100 text-center">
                            <span className="block text-[9px] font-bold text-orange-400 uppercase tracking-wider mb-1">Active Tables</span>
                            <strong className="text-xl text-orange-800 font-mono">{activeTablesCount} / {db.restaurantTables.length}</strong>
                          </div>
                          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                            <span className="block text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Kitchen Queue</span>
                            <strong className="text-xl text-blue-800 font-mono">{pendingOrders.length}</strong>
                          </div>
                          <div className="p-3 bg-green-50/50 rounded-xl border border-green-100 text-center">
                            <span className="block text-[9px] font-bold text-green-400 uppercase tracking-wider mb-1">POS Sales</span>
                            <strong className="text-xl text-green-800 font-mono">${posRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                          </div>
                        </div>

                        <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-150 space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                            <h4 className="text-xs font-bold text-gray-700 flex items-center">
                              <Utensils className="h-4 w-4 mr-1.5 text-orange-600" /> Kitchen Queue & Dining Orders
                            </h4>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">F&B Department</span>
                          </div>
                          
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {pendingOrders.map(ord => {
                              const tbl = db.restaurantTables.find(t => t.id === ord.tableId);
                              return (
                                <div key={ord.id} className="p-2.5 bg-white rounded-lg border border-gray-200/60 flex justify-between items-center">
                                  <div>
                                    <strong className="text-gray-800 block">{tbl?.tableNumber || 'Takeaway'} • Order #{ord.id.slice(-4).toUpperCase()}</strong>
                                    <span className="text-[10px] text-gray-400 font-semibold">{ord.items.length} items • ${ord.total.toFixed(2)}</span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                    ord.status === 'In Kitchen' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                    ord.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                    'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}>
                                    {ord.status}
                                  </span>
                                </div>
                              );
                            })}
                            {pendingOrders.length === 0 && (
                              <p className="text-center text-xs text-gray-400 py-4">No active dining orders in the kitchen.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  case 'dept_housekeeping': {
                    const dirtyRoomsCount = db.rooms.filter(r => r.status === 'Dirty').length;
                    const activeTasks = db.cleaningTasks || [];
                    const pendingTasks = activeTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress');
                    const lostFoundCount = db.lostAndFound ? db.lostAndFound.length : 0;
                    
                    return (
                      <div className="space-y-5 text-xs font-semibold">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-center">
                            <span className="block text-[9px] font-bold text-rose-400 uppercase tracking-wider mb-1">Dirty Rooms Left</span>
                            <strong className="text-xl text-rose-800 font-mono">{dirtyRoomsCount}</strong>
                          </div>
                          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-center">
                            <span className="block text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-1">Active Cleanings</span>
                            <strong className="text-xl text-purple-800 font-mono">{pendingTasks.length}</strong>
                          </div>
                          <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 text-center">
                            <span className="block text-[9px] font-bold text-teal-400 uppercase tracking-wider mb-1">Lost & Found Log</span>
                            <strong className="text-xl text-teal-800 font-mono">{lostFoundCount}</strong>
                          </div>
                        </div>

                        <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-150 space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                            <h4 className="text-xs font-bold text-gray-700 flex items-center">
                              <Wrench className="h-4 w-4 mr-1.5 text-purple-600" /> Room Cleaning Roster
                            </h4>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Housekeeping & Laundry</span>
                          </div>
                          
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {activeTasks.map(task => {
                              const room = db.rooms.find(r => r.id === task.roomId);
                              const hk = db.employees.find(e => e.id === task.housekeeperId);
                              return (
                                <div key={task.id} className="p-2.5 bg-white rounded-lg border border-gray-200/60 flex justify-between items-center">
                                  <div>
                                    <strong className="text-gray-800 block">Room {room?.roomNumber || 'N/A'} • {hk ? `${hk.firstName} ${hk.lastName}` : 'Unassigned'}</strong>
                                    <span className="text-[10px] text-gray-400 font-semibold">Priority: <strong className={task.priority === 'High' ? 'text-red-500' : 'text-gray-500'}>{task.priority}</strong></span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                    task.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                                    task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                  }`}>
                                    {task.status}
                                  </span>
                                </div>
                              );
                            })}
                            {activeTasks.length === 0 && (
                              <p className="text-center text-xs text-gray-400 py-4">No active cleaning tasks assigned.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  case 'dept_finance': {
                    const cashBal = db.accounts.find(a => a.id === 'acc_1')?.balance || 0;
                    const bankBal = db.accounts.find(a => a.id === 'acc_2')?.balance || 0;
                    const recentTx = db.transactions ? db.transactions.slice(0, 5) : [];
                    const totalRevenues = db.transactions ? db.transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0) : 0;
                    
                    return (
                      <div className="space-y-5 text-xs font-semibold">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
                            <span className="block text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Corporate Bank</span>
                            <strong className="text-sm text-emerald-800 font-mono block truncate">${bankBal.toLocaleString()}</strong>
                          </div>
                          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                            <span className="block text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Cash Drawer</span>
                            <strong className="text-sm text-blue-800 font-mono block truncate">${cashBal.toLocaleString()}</strong>
                          </div>
                          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                            <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Revenues</span>
                            <strong className="text-sm text-indigo-800 font-mono block truncate">${totalRevenues.toLocaleString()}</strong>
                          </div>
                        </div>

                        <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-150 space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                            <h4 className="text-xs font-bold text-gray-700 flex items-center">
                              <DollarSign className="h-4 w-4 mr-1.5 text-emerald-600" /> Recent Financial Ledger Entries
                            </h4>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Accounting & Treasury</span>
                          </div>
                          
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {recentTx.map(tx => (
                              <div key={tx.id} className="p-2.5 bg-white rounded-lg border border-gray-200/60 flex justify-between items-center">
                                <div>
                                  <strong className="text-gray-800 block truncate max-w-[200px]">{tx.description}</strong>
                                  <span className="text-[10px] text-gray-400 font-semibold">{tx.category} • {tx.date}</span>
                                </div>
                                <span className={`text-[10px] font-mono font-bold ${
                                  tx.type === 'Income' ? 'text-emerald-600' : 'text-red-500'
                                }`}>
                                  {tx.type === 'Income' ? '+' : '-'}${tx.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                            {recentTx.length === 0 && (
                              <p className="text-center text-xs text-gray-400 py-4">No recent financial transactions logged.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  case 'dept_hr': {
                    const staffCount = db.employees.length;
                    const totalBasePayroll = db.employees.reduce((sum, e) => sum + e.salary, 0);
                    const presentCount = db.attendance ? db.attendance.filter(a => a.status === 'Present' || a.status === 'Late').length : 0;
                    
                    return (
                      <div className="space-y-5 text-xs font-semibold">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 text-center">
                            <span className="block text-[9px] font-bold text-sky-400 uppercase tracking-wider mb-1">Hired Staff</span>
                            <strong className="text-xl text-sky-800 font-mono">{staffCount} Employees</strong>
                          </div>
                          <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 text-center">
                            <span className="block text-[9px] font-bold text-teal-400 uppercase tracking-wider mb-1">Base Payroll</span>
                            <strong className="text-sm text-teal-800 font-mono block truncate">${totalBasePayroll.toLocaleString()}</strong>
                          </div>
                          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                            <span className="block text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-1">Clocked-In Today</span>
                            <strong className="text-xl text-amber-800 font-mono">{presentCount} Active</strong>
                          </div>
                        </div>

                        <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-150 space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                            <h4 className="text-xs font-bold text-gray-700 flex items-center">
                              <Users className="h-4 w-4 mr-1.5 text-sky-600" /> Active Staff Registry Roster
                            </h4>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Human Resources & Payroll</span>
                          </div>
                          
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {db.employees.map(emp => {
                              const deptObj = db.departments.find(d => d.id === emp.departmentId);
                              return (
                                <div key={emp.id} className="p-2.5 bg-white rounded-lg border border-gray-200/60 flex justify-between items-center">
                                  <div>
                                    <strong className="text-gray-800 block">{emp.firstName} {emp.lastName}</strong>
                                    <span className="text-[10px] text-gray-400 font-semibold">{emp.position} • {deptObj?.name}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-amber-500 font-bold text-[10px]">
                                    {'★'.repeat(emp.performanceScore || 5)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  case 'dept_maintenance': {
                    const unresolvedReqs = db.maintenanceRequests ? db.maintenanceRequests.filter(r => r.status !== 'Resolved') : [];
                    const highPriorityCount = unresolvedReqs.filter(r => r.priority === 'High').length;
                    
                    return (
                      <div className="space-y-5 text-xs font-semibold">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100 text-center">
                            <span className="block text-[9px] font-bold text-[#D35400] uppercase tracking-wider mb-1">Open Tickets</span>
                            <strong className="text-xl text-[#D35400] font-mono">{unresolvedReqs.length}</strong>
                          </div>
                          <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 text-center">
                            <span className="block text-[9px] font-bold text-red-400 uppercase tracking-wider mb-1">Critical Issues</span>
                            <strong className="text-xl text-red-800 font-mono">{highPriorityCount}</strong>
                          </div>
                          <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 text-center">
                            <span className="block text-[9px] font-bold text-teal-400 uppercase tracking-wider mb-1">System Health</span>
                            <strong className="text-xl text-teal-800 font-mono">98.5% OK</strong>
                          </div>
                        </div>

                        <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-150 space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                            <h4 className="text-xs font-bold text-gray-700 flex items-center">
                              <Wrench className="h-4 w-4 mr-1.5 text-orange-600" /> Pending Maintenance & Repairs
                            </h4>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Facility Engineering</span>
                          </div>
                          
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {unresolvedReqs.map(req => {
                              const room = db.rooms.find(r => r.id === req.roomId);
                              return (
                                <div key={req.id} className="p-2.5 bg-white rounded-lg border border-gray-200/60 flex justify-between items-center">
                                  <div>
                                    <strong className="text-gray-800 block truncate max-w-[220px]">Room {room?.roomNumber || 'Facilities'} • {req.description}</strong>
                                    <span className="text-[10px] text-gray-400 font-semibold">Priority: <strong className={req.priority === 'High' ? 'text-red-500' : 'text-gray-500'}>{req.priority}</strong></span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                    req.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                  }`}>
                                    {req.status}
                                  </span>
                                </div>
                              );
                            })}
                            {unresolvedReqs.length === 0 && (
                              <p className="text-center text-xs text-gray-400 py-4">All facility assets are currently fully functional.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  default: {
                    return <p className="text-center text-xs text-gray-400 py-6">No portal defined for this department.</p>;
                  }
                }
              };
              
              return (
                <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[9px] font-bold text-[#1B4F72] uppercase tracking-wider">Live Workspace Telemetry</h4>
                      <h3 className="text-sm font-bold text-gray-800 mt-0.5">{selectedDept?.name}</h3>
                      <p className="text-[11px] text-gray-400 font-semibold leading-relaxed mt-1">{selectedDept?.description}</p>
                    </div>
                    {manager && (
                      <div className="flex items-center space-x-2 text-right">
                        <div className="hidden sm:block">
                          <strong className="text-xs text-gray-800 block">{manager.firstName} {manager.lastName}</strong>
                          <span className="text-[10px] text-gray-400 font-semibold">{manager.position}</span>
                        </div>
                        <div className="w-8.5 h-8.5 rounded-full bg-[#1B4F72] text-white flex items-center justify-center font-bold text-xs">
                          {manager.firstName[0]}{manager.lastName[0]}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200/60">
                    {renderDepartmentPortal()}
                  </div>
                </div>
              );
            })()}

          </div>

        </div>
      )}

      {/* TAB 3: EXECUTIVE BUSINESS & OPERATIONS REPORTS */}
      {activeConsoleTab === 'business_reports' && (() => {
        // Dynamic time-window helper
        const isWithinRange = (dateStr: string) => {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - d.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (reportFrequency === 'daily') {
            if (reportDateRange === 'current') return diffDays <= 1;
            return diffDays > 1 && diffDays <= 2;
          } else if (reportFrequency === 'weekly') {
            if (reportDateRange === 'current') return diffDays <= 7;
            return diffDays > 7 && diffDays <= 14;
          } else { // monthly
            if (reportDateRange === 'current') return diffDays <= 30;
            return diffDays > 30 && diffDays <= 60;
          }
        };

        // 1. FINANCIAL FLOWS
        // POS Cash Inflows
        const filteredPOSOrders = (db.restaurantOrders || []).filter(o => 
          (o.status === 'Paid' || o.status === 'Completed' || o.status === 'Served') && isWithinRange(o.createdAt)
        );
        const totalPOSInflows = filteredPOSOrders.reduce((sum, o) => sum + o.total, 0);

        // Procurement PO Outflows
        const filteredPOs = (db.purchaseOrders || []).filter(po => 
          po.status === 'Received' && isWithinRange(po.receivedDate || po.orderedDate)
        );
        const totalPOCost = filteredPOs.reduce((sum, po) => sum + po.totalAmount, 0);

        // COGS (Theoretical Ingredient Depletion Value)
        let totalCOGS = 0;
        let totalDishesSold = 0;
        filteredPOSOrders.forEach(o => {
          (o.items || []).forEach(it => {
            totalDishesSold += it.quantity;
            const mItem = db.menuItems?.find(mi => mi.id === it.menuItemId);
            if (mItem && mItem.productId) {
              const prod = db.products?.find(p => p.id === mItem.productId);
              if (prod) {
                totalCOGS += it.quantity * prod.unitPrice;
              }
            }
          });
        });

        // Spoilage, Wastage & Expiry Outflows
        const filteredMovements = (db.inventoryMovements || []).filter(mov => 
          mov.type === 'Out' && 
          !mov.notes?.includes('POS Order') && 
          !mov.notes?.includes('POS Sale') && 
          isWithinRange(mov.createdAt || new Date().toISOString())
        );
        const totalWastageCost = filteredMovements.reduce((sum, mov) => {
          const prod = db.products?.find(p => p.id === mov.productId);
          const cost = prod ? prod.unitPrice : 1;
          return sum + (mov.quantity * cost);
        }, 0);

        // Swimming Pool Linen Laundry Processing Costs ($1.50 flat processing charge per towel)
        const filteredLaundry = (db.laundryItems || []).filter(l => isWithinRange(l.createdAt));
        const totalLinenTowelQty = filteredLaundry.reduce((sum, l) => sum + l.quantity, 0);
        const totalLaundryCost = totalLinenTowelQty * 1.50;

        // Executive Net Operational Profit Margin
        const totalOperationalCosts = totalCOGS + totalPOCost + totalWastageCost + totalLaundryCost;
        const netOperationalProfit = totalPOSInflows - totalOperationalCosts;
        const profitMarginPercent = totalPOSInflows > 0 ? (netOperationalProfit / totalPOSInflows) * 100 : 0;

        // 2. KITCHEN CONSUMPTION TELEMETRY
        const foodOrdersCount = filteredPOSOrders.filter(o => 
          o.items?.some(it => {
            const mItem = db.menuItems?.find(mi => mi.id === it.menuItemId);
            return mItem?.category !== 'Beverage' && mItem?.category !== 'Alcoholic';
          })
        ).length;
        const beverageOrdersCount = filteredPOSOrders.length - foodOrdersCount;
        const outOfStockDishes = (db.menuItems || []).filter(m => m.isAvailable === false).length;

        // 3. SWIMMING POOL OPERATIONS TELEMETRY
        let poolPh = 7.4;
        let poolChlorine = 2.2;
        let poolTemp = 27.2;
        let cleanTowels = 34;
        let dirtyTowels = 8;
        try {
          const phVal = localStorage.getItem('pool_ph');
          const clVal = localStorage.getItem('pool_chlorine');
          const tempVal = localStorage.getItem('pool_temp');
          const cleanT = localStorage.getItem('pool_clean_towels');
          const dirtyT = localStorage.getItem('pool_dirty_towels');
          if (phVal) poolPh = parseFloat(phVal);
          if (clVal) poolChlorine = parseFloat(clVal);
          if (tempVal) poolTemp = parseFloat(tempVal);
          if (cleanT) cleanTowels = parseInt(cleanT, 10);
          if (dirtyT) dirtyTowels = parseInt(dirtyT, 10);
        } catch (e) {}

        const chemicalHealth = (poolPh >= 7.2 && poolPh <= 7.6 && poolChlorine >= 1.0 && poolChlorine <= 3.0) 
          ? '🟢 Normal & Balanced' 
          : '🚨 Chemistry Alert!';

        // 4. HOUSEKEEPING & ROOMS TELEMETRY
        const currentTasks = (db.cleaningTasks || []).filter(t => isWithinRange(t.assignedAt));
        const completedTasks = currentTasks.filter(t => t.status === 'Inspected' || t.status === 'Completed');
        const cleaningCompletionRate = currentTasks.length > 0 
          ? Math.round((completedTasks.length / currentTasks.length) * 100) 
          : 100;

        // 5. PROCUREMENT & STOREHOUSE
        const lowStockProducts = (db.products || []).filter(p => p.currentStock <= p.minStockAlert).length;
        const totalStorehouseValue = (db.products || []).reduce((sum, p) => sum + (p.currentStock * p.unitPrice), 0);

        return (
          <div className="space-y-6">
            {/* Control Panel Filter bar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Report Frequency:</span>
                <div className="inline-flex rounded-xl p-1 bg-gray-50 border border-gray-150">
                  <button
                    onClick={() => setReportFrequency('daily')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition ${
                      reportFrequency === 'daily' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Daily Report
                  </button>
                  <button
                    onClick={() => setReportFrequency('weekly')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition ${
                      reportFrequency === 'weekly' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Weekly Performance
                  </button>
                  <button
                    onClick={() => setReportFrequency('monthly')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition ${
                      reportFrequency === 'monthly' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Monthly Review
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                <div className="flex items-center space-x-1.5 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                  <span className="text-gray-400">Time-Window:</span>
                  <select
                    value={reportDateRange}
                    onChange={(e) => setReportDateRange(e.target.value)}
                    className="bg-transparent text-gray-800 focus:outline-none cursor-pointer"
                  >
                    <option value="current">Current Period ({reportFrequency === 'daily' ? 'Today' : reportFrequency === 'weekly' ? 'This Week' : 'This Month'})</option>
                    <option value="previous">Previous Comparison Period</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm transition flex items-center gap-1.5"
                >
                  📄 Export & Print PDF
                </button>
              </div>
            </div>

            {/* FINANCIAL HEALTH GRID SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Gross POS Sales Inflows</span>
                <span className="text-2xl font-bold font-mono text-emerald-600">{store.formatMoney(totalPOSInflows)}</span>
                <p className="text-[10px] text-gray-400 mt-1">{filteredPOSOrders.length} completed transactions</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Operating Outflows</span>
                <span className="text-2xl font-bold font-mono text-rose-600">{store.formatMoney(totalOperationalCosts)}</span>
                <p className="text-[10px] text-gray-400 mt-1">Raw COGS + POs + Waste + Linen</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Net Executive Profit Yield</span>
                <span className={`text-2xl font-bold font-mono ${netOperationalProfit >= 0 ? 'text-[#1B4F72]' : 'text-red-600'}`}>
                  {store.formatMoney(netOperationalProfit)}
                </span>
                <p className="text-[10px] text-gray-400 mt-1">Operational Gross Margin subtraction</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Gross Markup Yield</span>
                <span className={`text-2xl font-bold font-mono ${profitMarginPercent >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                  {profitMarginPercent.toFixed(1)}%
                </span>
                <p className="text-[10px] text-gray-400 mt-1">Efficiency ratio on sales markup</p>
              </div>
            </div>

            {/* INTERACTIVE MULTI-MODULE BREAKDOWN CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* KITCHEN & BEVERAGE PRODUCTION */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-gray-150 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">🧑‍🍳 Kitchen & Bar Consumption Audit</h3>
                  <span className="text-[10px] font-bold bg-[#1B4F72] text-white px-2 py-0.5 rounded-full">Dining POS Link</span>
                </div>
                <div className="p-4 space-y-3.5 text-xs font-medium text-slate-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                      <span className="text-[10px] text-gray-400 block uppercase">Dining Tickets Paid</span>
                      <strong className="text-sm font-bold text-slate-800">{filteredPOSOrders.length} orders</strong>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                      <span className="text-[10px] text-gray-400 block uppercase">Total Dishes Prepared</span>
                      <strong className="text-sm font-bold text-slate-800">{totalDishesSold} plates</strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Kitchen prepared orders (Food items):</span>
                      <span className="font-bold text-slate-800">{foodOrdersCount} tickets</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Bar dispensed orders (Beverage items):</span>
                      <span className="font-bold text-slate-800">{beverageOrdersCount} tickets</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Theoretical ingredient cost of sales (COGS):</span>
                      <span className="font-bold text-rose-600">{store.formatMoney(totalCOGS)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chef out of stock locked menu dishes:</span>
                      <span className={`font-bold ${outOfStockDishes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{outOfStockDishes} items</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SWIMMING POOL OPERATIONS */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-gray-150 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">🏊 Swimming Pool & Linen Consumption</h3>
                  <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">Linen & Stock Link</span>
                </div>
                <div className="p-4 space-y-3.5 text-xs font-medium text-slate-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                      <span className="text-[10px] text-gray-400 block uppercase">Clean Towels on Shelf</span>
                      <strong className="text-sm font-bold text-indigo-700">{cleanTowels} units</strong>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                      <span className="text-[10px] text-gray-400 block uppercase">Dirty Towels at Station</span>
                      <strong className="text-sm font-bold text-rose-700">{dirtyTowels} units</strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Water Chemistry health safety standard:</span>
                      <span className="font-bold text-slate-800">{chemicalHealth}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Tested levels (Live pH / Chlorine):</span>
                      <span className="font-mono font-bold text-slate-800">pH: {poolPh} • Cl: {poolChlorine} ppm</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Towels sent to central laundry in period:</span>
                      <span className="font-bold text-slate-800">{totalLinenTowelQty} towels washed</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Washing processing costs ({store.formatMoney(1.50)} per towel):</span>
                      <span className="font-bold text-rose-600">{store.formatMoney(totalLaundryCost)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HOUSEKEEPING & ROOMS */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-gray-150 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">🧹 Housekeeping & Facility Operations</h3>
                  <span className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full">Rooms Link</span>
                </div>
                <div className="p-4 space-y-3.5 text-xs font-medium text-slate-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                      <span className="text-[10px] text-gray-400 block uppercase">Clean Tasks Tracked</span>
                      <strong className="text-sm font-bold text-slate-800">{currentTasks.length} tasks</strong>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                      <span className="text-[10px] text-gray-400 block uppercase">Washing Completion Rate</span>
                      <strong className="text-sm font-bold text-purple-700">{cleaningCompletionRate}%</strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Inspected & clean rooms dispatched:</span>
                      <span className="font-bold text-slate-800">{completedTasks.length} rooms</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Maintenance and engineering unresolved tickets:</span>
                      <span className={`font-bold ${(db.maintenanceRequests || []).filter(r => r.status !== 'Resolved').length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {(db.maintenanceRequests || []).filter(r => r.status !== 'Resolved').length} tickets
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average laundry items processed:</span>
                      <span className="font-bold text-slate-800">{(db.laundryItems || []).length} loads</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PROCUREMENT & STOREHOUSE STOCK */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-gray-150 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">📦 Central Storehouse Stock & Procurement</h3>
                  <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">Inventory Link</span>
                </div>
                <div className="p-4 space-y-3.5 text-xs font-medium text-slate-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                      <span className="text-[10px] text-gray-400 block uppercase">Received POs Value</span>
                      <strong className="text-sm font-bold text-emerald-600">{store.formatMoney(totalPOCost)}</strong>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                      <span className="text-[10px] text-gray-400 block uppercase">Warehouse Stock Valuation</span>
                      <strong className="text-sm font-bold text-slate-800">{store.formatMoney(totalStorehouseValue)}</strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>New purchase orders processed:</span>
                      <span className="font-bold text-slate-800">{filteredPOs.length} PO entries</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Products below safety minimum alerts:</span>
                      <span className={`font-bold ${lowStockProducts > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>{lowStockProducts} products</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-gray-100">
                      <span>Total logged spoilage/wastage losses in period:</span>
                      <span className="font-bold text-rose-600">{store.formatMoney(totalWastageCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Central inventory active products in index:</span>
                      <span className="font-bold text-slate-800">{(db.products || []).length} lines</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* PRINTABLE REPORT PREVIEW POPUP MODAL */}
            {showPrintModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                  
                  {/* Print Header */}
                  <div className="border-b border-dashed border-gray-200 pb-4 text-center">
                    <h2 className="text-xs font-bold text-[#1B4F72] uppercase tracking-widest">OFFICIAL REPORT SUMMARY</h2>
                    <h1 className="text-xl font-bold text-slate-900 mt-1 capitalize">{reportFrequency} Business Performance & Operations Audit</h1>
                    <p className="text-[11px] text-gray-400 mt-1">Generated on: {new Date().toLocaleString()} • Authorized for: CEO Executive Executive Committee</p>
                  </div>

                  {/* Printable Details */}
                  <div className="space-y-4 text-xs font-semibold text-slate-700">
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-150 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Period Inflows (POS sales)</span>
                        <strong className="text-md text-emerald-600 font-bold">{store.formatMoney(totalPOSInflows)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Period Outflows (COGS + PO + Waste + Linen)</span>
                        <strong className="text-md text-rose-600 font-bold">{store.formatMoney(totalOperationalCosts)}</strong>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-gray-200/50 flex justify-between">
                        <span>Net Operating Profit / Loss:</span>
                        <span className={`font-bold font-mono text-sm ${netOperationalProfit >= 0 ? 'text-[#1B4F72]' : 'text-red-600'}`}>
                          {store.formatMoney(netOperationalProfit)} ({profitMarginPercent.toFixed(1)}% Yield)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-gray-150">Module Performance Summary</h3>
                      
                      <div className="flex justify-between pb-1">
                        <span>F&B Dining (Sold Qty / COGS Value):</span>
                        <span className="text-slate-800">{totalDishesSold} plates sold • {store.formatMoney(totalCOGS)} COGS</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span>Pool Chemistry & Water Standard:</span>
                        <span className="text-slate-800">{chemicalHealth} (pH: {poolPh} • Chlorine: {poolChlorine})</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span>Housekeeping & Cleaning completion:</span>
                        <span className="text-slate-800">{completedTasks.length} rooms cleaned ({cleaningCompletionRate}%)</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span>Linen Laundry processing:</span>
                        <span className="text-slate-800">{totalLinenTowelQty} towels washed • {store.formatMoney(totalLaundryCost)} processing cost</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span>Wastage/Spoilage events loss:</span>
                        <span className="text-rose-600">{store.formatMoney(totalWastageCost)} spoilage depletion</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[11px] text-amber-800 font-medium">
                      ⚠️ Confidential: This report contains strategic audit data and is intended solely for internal executive oversight. Sharing or exporting without CFO authorization is prohibited.
                    </div>
                  </div>

                  {/* Executive Report Print Matrix */}
                  <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Professional Report Type to Print</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const kp = { revenue: totalPOSInflows, costs: totalOperationalCosts, netProfit: netOperationalProfit, plates: totalDishesSold, cogs: totalCOGS, roomsCleaned: completedTasks.length, chemicalStatus: chemicalHealth, towelsWashed: totalLinenTowelQty };
                          const html = reportFrequency === 'daily' ? getDailyReportHTML(kp) : reportFrequency === 'weekly' ? getWeeklyReportHTML(kp) : getMonthlyReportHTML(kp);
                          launchPrintPreview(reportFrequency === 'daily' ? 'Daily Report' : reportFrequency === 'weekly' ? 'Weekly Report' : 'Monthly Report', `${reportFrequency.toUpperCase()} Operating Digest`, html);
                          setShowPrintModal(false);
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold text-left cursor-pointer flex items-center justify-between transition"
                      >
                        <span>📊 Current Period ({reportFrequency})</span>
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          const kp = { revenue: totalPOSInflows, costs: totalOperationalCosts, netProfit: netOperationalProfit, plates: totalDishesSold, cogs: totalCOGS, roomsCleaned: completedTasks.length, chemicalStatus: chemicalHealth, towelsWashed: totalLinenTowelQty };
                          const html = getAnnualReportHTML(kp);
                          launchPrintPreview('Annual Report', 'Annual Performance Digest', html);
                          setShowPrintModal(false);
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-left cursor-pointer flex items-center justify-between transition"
                      >
                        <span>📈 Annual Summary</span>
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          const kp = { revenue: totalPOSInflows, cogs: totalCOGS, payroll: totalOperationalCosts * 0.4, purchases: totalPOCost, wastage: totalWastageCost, laundry: totalLaundryCost };
                          const html = getProfitLossStatementHTML(kp);
                          launchPrintPreview('Profit & Loss Statement', 'Corporate Profit & Loss Statement', html);
                          setShowPrintModal(false);
                        }}
                        className="px-3 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl text-xs font-bold text-left cursor-pointer flex items-center justify-between transition"
                      >
                        <span>🧾 Profit & Loss (P&L)</span>
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          const assetsVal = totalPOSInflows + totalStorehouseValue;
                          const liabilitiesVal = totalPOCost + totalLaundryCost + totalWastageCost;
                          const equityVal = assetsVal - liabilitiesVal;
                          const html = getBalanceSheetHTML(assetsVal, liabilitiesVal, equityVal);
                          launchPrintPreview('Balance Sheet', 'Corporate Balance Sheet', html);
                          setShowPrintModal(false);
                        }}
                        className="px-3 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl text-xs font-bold text-left cursor-pointer flex items-center justify-between transition"
                      >
                        <span>🏛️ Balance Sheet</span>
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          const html = getCashFlowStatementHTML(netOperationalProfit);
                          launchPrintPreview('Cash Flow Statement', 'Corporate Cash Flow Statement', html);
                          setShowPrintModal(false);
                        }}
                        className="px-3 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl text-xs font-bold text-left cursor-pointer flex items-center justify-between transition"
                      >
                        <span>💸 Cash Flow Statement</span>
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          const html = getInventoryReportHTML(db.products);
                          launchPrintPreview('Inventory Report', 'Master Stock & Inventory Report', html);
                          setShowPrintModal(false);
                        }}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-left cursor-pointer flex items-center justify-between transition"
                      >
                        <span>📦 Inventory & Stock Report</span>
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          const activeSales = db.restaurantOrders.filter(o => o.status === 'Completed' || o.status === 'Paid');
                          const html = getSalesReportHTML(activeSales, totalPOSInflows);
                          launchPrintPreview('Sales Report', 'Restaurant & POS Sales Report', html);
                          setShowPrintModal(false);
                        }}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-left cursor-pointer flex items-center justify-between transition"
                      >
                        <span>🍕 POS Sales & Dishes Report</span>
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          const html = getAuditReportHTML(db.auditLogs || []);
                          launchPrintPreview('Audit Report', 'Security & General System Audit Trail', html);
                          setShowPrintModal(false);
                        }}
                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold text-left cursor-pointer flex items-center justify-between transition"
                      >
                        <span>🔐 Security & System Audit Trail</span>
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Print footer buttons */}
                  <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => setShowPrintModal(false)}
                      className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition"
                    >
                      Close Window
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        );
      })()}

    </div>
  );
}
