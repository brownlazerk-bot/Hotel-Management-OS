import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { DailyShiftReport } from '../types';
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
  HelpCircle
} from 'lucide-react';

export default function ShiftReporting() {
  const db = store.getDb();
  const activeUser = store.getActiveUser();

  // Selected report for detail pane
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

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

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center space-x-2 text-sm font-semibold shadow-sm">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {reports.length === 0 ? (
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
                          {activeReport.stockVerifiedBy ? `Verified by ${activeReport.stockVerifiedBy}` : 'Pending validation'}
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:block h-0.5 bg-gray-200 flex-1 mx-2" />

                    {/* Step 3: Manager Review */}
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
                </div>

                {/* Handover & Approver Notes Log */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Commentary & Verification Log</h3>
                  
                  <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-150 text-xs leading-relaxed">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Cashier Remarks ({activeReport.cashierName}):</span>
                      <p className="text-gray-700 italic mt-0.5">"{activeReport.notes || 'No notes left by cashier.'}"</p>
                    </div>
                    {activeReport.notes_manager && (
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Manager Comments ({activeReport.managerApprovedBy}):</span>
                        <p className="text-gray-700 italic mt-0.5">"{activeReport.notes_manager}"</p>
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
                        placeholder="Add management comments, e.g. Reviewed shift discrepancy of -$5. Reason verified (change mistake). Approved for CEO final sign-off."
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
      )}

    </div>
  );
}
