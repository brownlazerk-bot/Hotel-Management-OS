/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import {
  MenuItem,
  InventoryProduct,
  Reservation,
  CleaningTask,
  MaintenanceRequest,
  PurchaseRequest,
  PurchaseOrder,
  Payroll,
  DailyShiftReport,
  RestaurantOrder,
  OrderStatus,
  CleaningTaskStatus,
  MaintenanceStatus,
  ReservationStatus,
  PurchaseOrderStatus
} from '../types';
import {
  ClipboardList,
  GitPullRequest,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  ArrowUpDown,
  Calculator,
  Percent,
  Search,
  Filter,
  Users,
  Utensils,
  Package,
  Wrench,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  X,
  CreditCard,
  ChefHat
} from 'lucide-react';

interface UnifiedWorkflow {
  id: string;
  originType: 'Reservation' | 'CleaningTask' | 'Maintenance' | 'PurchaseRequest' | 'PurchaseOrder' | 'RestaurantOrder' | 'Payroll' | 'ShiftReport';
  department: string;
  title: string;
  subtitle: string;
  status: string;
  isFinished: boolean;
  createdAt: string;
  priority?: 'Low' | 'Medium' | 'High';
  creator?: string;
  rawObject: any;
}

export default function Workflows() {
  const [db, setDb] = useState(store.getDb());
  const [activeSubTab, setActiveSubTab] = useState<'workflows' | 'profitability'>('workflows');

  // Workflows search/filter states
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Finished'>('All');
  const [workflowSearch, setWorkflowSearch] = useState<string>('');

  // Profitability states
  const [profitSearch, setProfitSearch] = useState<string>('');
  const [profitCategoryFilter, setProfitCategoryFilter] = useState<string>('All');
  const [profitSortKey, setProfitSortKey] = useState<'profit' | 'margin' | 'sold' | 'totalProfit' | 'name'>('sold');
  const [profitSortDesc, setProfitSortDesc] = useState<boolean>(true);

  // Pricing wizard / simulator modal state
  const [selectedSimItem, setSelectedSimItem] = useState<MenuItem | null>(null);
  const [simPriceInput, setSimPriceInput] = useState<string>('');
  const [pricingSuccessMsg, setPricingSuccessMsg] = useState<string>('');

  // Detail Modal State
  const [selectedWorkflowDetail, setSelectedWorkflowDetail] = useState<UnifiedWorkflow | null>(null);

  // Subscribe to changes
  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setDb(store.getDb());
    });
    return () => unsubscribe();
  }, []);

  // Sync state if selectedSimItem changes
  React.useEffect(() => {
    if (selectedSimItem) {
      setSimPriceInput(selectedSimItem.price.toString());
      setPricingSuccessMsg('');
    }
  }, [selectedSimItem]);

  // ============================================================================
  // WORKFLOW MAPPER (PULLING EVERYTHING TOGETHER)
  // ============================================================================
  const unifiedWorkflows = useMemo((): UnifiedWorkflow[] => {
    const list: UnifiedWorkflow[] = [];

    // 1. Guest Reservations (Reception Desk)
    (db.reservations || []).forEach((res: Reservation) => {
      const guest = db.guests?.find(g => g.id === res.guestId);
      const room = db.rooms?.find(r => r.id === res.roomId);
      const isFin = res.status === 'Checked Out' || res.status === 'Cancelled';
      list.push({
        id: res.id,
        originType: 'Reservation',
        department: 'Front Desk Reception',
        title: `Guest Reservation: ${guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown Guest'}`,
        subtitle: `Room ${room ? room.roomNumber : 'Unassigned'} • ${res.checkInDate} to ${res.checkOutDate} (${res.numberOfGuests} Guests)`,
        status: res.status,
        isFinished: isFin,
        createdAt: res.createdAt || res.checkInDate,
        rawObject: res
      });
    });

    // 2. Cleaning Tasks (Housekeeping)
    (db.cleaningTasks || []).forEach((task: CleaningTask) => {
      const room = db.rooms?.find(r => r.id === task.roomId);
      const housekeeper = db.employees?.find(e => e.id === task.housekeeperId);
      const isFin = task.status === 'Inspected';
      list.push({
        id: task.id,
        originType: 'CleaningTask',
        department: 'Housekeeping Department',
        title: `Room Cleaning: Room ${room ? room.roomNumber : 'Unknown'}`,
        subtitle: `Housekeeper: ${housekeeper ? `${housekeeper.firstName} ${housekeeper.lastName}` : 'Unassigned'}`,
        status: task.status,
        isFinished: isFin,
        createdAt: task.assignedAt,
        priority: task.priority,
        rawObject: task
      });
    });

    // 3. Maintenance Requests (Engineering)
    (db.maintenanceRequests || []).forEach((req: MaintenanceRequest) => {
      const room = db.rooms?.find(r => r.id === req.roomId);
      const staff = db.employees?.find(e => e.id === req.assignedTo);
      const isFin = req.status === 'Resolved';
      list.push({
        id: req.id,
        originType: 'Maintenance',
        department: 'Maintenance & Engineering',
        title: `Repair Request: ${req.equipmentName || `Room ${room ? room.roomNumber : 'Facilities'}`}`,
        subtitle: req.description,
        status: req.status,
        isFinished: isFin,
        createdAt: req.createdAt,
        priority: req.priority,
        rawObject: req
      });
    });

    // 4. Procurement Purchase Requests
    (db.purchaseRequests || []).forEach((req: PurchaseRequest) => {
      const prod = db.products?.find(p => p.id === req.productId);
      const user = db.users?.find(u => u.id === req.requestedBy);
      const isFin = req.status === 'Approved' || req.status === 'Rejected';
      list.push({
        id: req.id,
        originType: 'PurchaseRequest',
        department: 'Procurement Department',
        title: `Purchase Request: ${req.quantity} ${prod ? prod.unit : 'units'} of ${prod ? prod.name : 'Unknown Product'}`,
        subtitle: `Est. Cost: ${store.formatMoney(req.estimatedCost)} • Requested by: ${user ? user.name : 'Staff'}`,
        status: req.status,
        isFinished: isFin,
        createdAt: req.createdAt,
        rawObject: req
      });
    });

    // 5. Procurement Purchase Orders
    (db.purchaseOrders || []).forEach((po: PurchaseOrder) => {
      const supplier = db.suppliers?.find(s => s.id === po.supplierId);
      const isFin = po.status === 'Received' || po.status === 'Cancelled';
      const itemsCount = po.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      list.push({
        id: po.id,
        originType: 'PurchaseOrder',
        department: 'Procurement Department',
        title: `Purchase Order to ${supplier ? supplier.name : 'Supplier'}`,
        subtitle: `Items: ${itemsCount} items • Total: ${store.formatMoney(po.totalAmount)} (${po.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'})`,
        status: po.status,
        isFinished: isFin,
        createdAt: po.orderedDate,
        rawObject: po
      });
    });

    // 6. Restaurant Orders (Kitchen & POS)
    (db.restaurantOrders || []).forEach((ord: RestaurantOrder) => {
      const isFin = ord.status === 'Completed' || ord.status === 'Paid' || ord.status === 'Cancelled';
      const itemsList = ord.items?.map(it => `${it.quantity}x ${it.name}`).join(', ') || '';
      list.push({
        id: ord.id,
        originType: 'RestaurantOrder',
        department: 'Food & Dining POS',
        title: `Dining Order #${ord.id.substring(0, 5).toUpperCase()}`,
        subtitle: `Table: ${ord.roomNumber || 'Walk-in'} • Details: ${itemsList} • Total: ${store.formatMoney(ord.total)}`,
        status: ord.status,
        isFinished: isFin,
        createdAt: ord.createdAt,
        rawObject: ord
      });
    });

    // 7. Employee Payroll (HR & Finance)
    (db.payroll || []).forEach((pr: Payroll) => {
      const emp = db.employees?.find(e => e.id === pr.employeeId);
      const isFin = pr.paymentStatus === 'Paid';
      list.push({
        id: pr.id,
        originType: 'Payroll',
        department: 'HR & Finance Department',
        title: `Salary Payroll: ${emp ? `${emp.firstName} ${emp.lastName}` : 'Employee'}`,
        subtitle: `Month: ${pr.month} • Net Salary: ${store.formatMoney(pr.netSalary)}`,
        status: pr.paymentStatus === 'Paid' ? 'Paid' : 'Pending Payment',
        isFinished: isFin,
        createdAt: `${pr.month}-25`, // Approx payroll generation day
        rawObject: pr
      });
    });

    // 8. Cashier Shift Reconciliation Reports (Audit)
    (db.shiftReports || []).forEach((sr: DailyShiftReport) => {
      const isFin = sr.status === 'Approved By CEO';
      list.push({
        id: sr.id,
        originType: 'ShiftReport',
        department: 'Operations Audit',
        title: `Shift Reconciliation: ${sr.cashierName}`,
        subtitle: `Sales Value: ${store.formatMoney(sr.totalSalesValue)} • Discrepancy Found: ${sr.isDiscrepancyFound ? '⚠️ YES' : '✅ NO'}`,
        status: sr.status,
        isFinished: isFin,
        createdAt: sr.startTime,
        rawObject: sr
      });
    });

    // Sort by created date descending
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db]);

  // Filtered workflows list
  const filteredWorkflows = useMemo(() => {
    return unifiedWorkflows.filter(wf => {
      // 1. Department filter
      if (deptFilter !== 'All') {
        if (deptFilter === 'FrontDesk' && wf.originType !== 'Reservation') return false;
        if (deptFilter === 'Housekeeping' && wf.originType !== 'CleaningTask') return false;
        if (deptFilter === 'Maintenance' && wf.originType !== 'Maintenance') return false;
        if (deptFilter === 'Procurement' && wf.originType !== 'PurchaseRequest' && wf.originType !== 'PurchaseOrder') return false;
        if (deptFilter === 'Dining' && wf.originType !== 'RestaurantOrder') return false;
        if (deptFilter === 'HR' && wf.originType !== 'Payroll') return false;
        if (deptFilter === 'Audit' && wf.originType !== 'ShiftReport') return false;
      }

      // 2. Status filter
      if (statusFilter === 'Pending' && wf.isFinished) return false;
      if (statusFilter === 'Finished' && !wf.isFinished) return false;

      // 3. Search query
      if (workflowSearch.trim() !== '') {
        const q = workflowSearch.toLowerCase();
        const matchesSearch =
          wf.title.toLowerCase().includes(q) ||
          wf.subtitle.toLowerCase().includes(q) ||
          wf.department.toLowerCase().includes(q) ||
          wf.status.toLowerCase().includes(q) ||
          wf.id.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [unifiedWorkflows, deptFilter, statusFilter, workflowSearch]);

  // Counts
  const workflowStats = useMemo(() => {
    const total = unifiedWorkflows.length;
    const pending = unifiedWorkflows.filter(w => !w.isFinished).length;
    const finished = unifiedWorkflows.filter(w => w.isFinished).length;
    return { total, pending, finished };
  }, [unifiedWorkflows]);

  // ============================================================================
  // PROFITABILITY CALCULATIONS & MATH DATA
  // ============================================================================

  // Calculate items sold counts from all completed restaurant orders
  const menuItemSalesCounts = useMemo(() => {
    const counts: { [itemId: string]: number } = {};
    (db.restaurantOrders || []).forEach(order => {
      if (order.status === 'Paid' || order.status === 'Completed') {
        (order.items || []).forEach(item => {
          counts[item.menuItemId] = (counts[item.menuItemId] || 0) + item.quantity;
        });
      }
    });
    return counts;
  }, [db.restaurantOrders]);

  // Food and Beverage (F&B) Financial summary calculations
  const fbSummary = useMemo(() => {
    let totalInflow = 0; // Accumulated Selling Price of sold dishes
    let totalOutflow = 0; // Accumulated Purchasing Costs of sold dishes ingredient raw materials

    (db.menuItems || []).forEach(item => {
      const quantitySold = menuItemSalesCounts[item.id] || 0;
      const linkedProduct = item.productId ? db.products?.find(p => p.id === item.productId) : null;
      const unitCost = linkedProduct ? linkedProduct.unitPrice : 0;

      totalInflow += quantitySold * item.price;
      totalOutflow += quantitySold * unitCost;
    });

    // Total actual purchase orders spending for reference
    const totalPOExpense = (db.purchaseOrders || [])
      .filter(po => po.status === 'Received')
      .reduce((sum, po) => sum + po.totalAmount, 0);

    const netProfit = totalInflow - totalOutflow;
    const grossMarginPercent = totalInflow > 0 ? (netProfit / totalInflow) * 100 : 0;

    return {
      totalInflow,
      totalOutflow,
      netProfit,
      grossMarginPercent,
      totalPOExpense
    };
  }, [db.menuItems, db.products, db.purchaseOrders, menuItemSalesCounts]);

  // Full breakdown list for profitability table
  const profitabilityList = useMemo(() => {
    return (db.menuItems || []).map(item => {
      const linkedProduct = item.productId ? db.products?.find(p => p.id === item.productId) : null;
      const unitCost = linkedProduct ? linkedProduct.unitPrice : 0;
      const unitPrice = item.price;
      const unitProfit = unitPrice - unitCost;
      const marginPercent = unitPrice > 0 ? (unitProfit / unitPrice) * 100 : 0;
      const soldQty = menuItemSalesCounts[item.id] || 0;

      const totalRevenue = soldQty * unitPrice;
      const totalCost = soldQty * unitCost;
      const totalProfit = totalRevenue - totalCost;

      return {
        item,
        linkedProduct,
        unitCost,
        unitPrice,
        unitProfit,
        marginPercent,
        soldQty,
        totalRevenue,
        totalCost,
        totalProfit
      };
    });
  }, [db.menuItems, db.products, menuItemSalesCounts]);

  // Filter & Sort Profitability breakdown
  const sortedProfitabilityList = useMemo(() => {
    const filtered = profitabilityList.filter(row => {
      // 1. Category filter
      if (profitCategoryFilter !== 'All' && row.item.category !== profitCategoryFilter) {
        return false;
      }
      // 2. Search query
      if (profitSearch.trim() !== '') {
        const q = profitSearch.toLowerCase();
        const matches =
          row.item.name.toLowerCase().includes(q) ||
          (row.item.description || '').toLowerCase().includes(q) ||
          (row.linkedProduct?.name || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (profitSortKey === 'name') {
        valA = a.item.name;
        valB = b.item.name;
        return profitSortDesc ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
      }

      if (profitSortKey === 'profit') {
        valA = a.unitProfit;
        valB = b.unitProfit;
      } else if (profitSortKey === 'margin') {
        valA = a.marginPercent;
        valB = b.marginPercent;
      } else if (profitSortKey === 'sold') {
        valA = a.soldQty;
        valB = b.soldQty;
      } else if (profitSortKey === 'totalProfit') {
        valA = a.totalProfit;
        valB = b.totalProfit;
      }

      return profitSortDesc ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
    });
  }, [profitabilityList, profitCategoryFilter, profitSearch, profitSortKey, profitSortDesc]);

  // ============================================================================
  // WORKFLOW ACTION HANDLERS
  // ============================================================================
  const handleApprovePurchaseRequest = (reqId: string) => {
    store.updatePurchaseRequestStatus(reqId, 'Approved');
    store.addAuditLog('Approved Purchase Request', 'Workflows', `Request ID "${reqId}" was approved from unified workflows terminal.`);
    store.addNotification('Workflow Approved', `Purchase request ${reqId} has been approved.`, 'approval');
    setDb(store.getDb());
    if (selectedWorkflowDetail && selectedWorkflowDetail.id === reqId) {
      setSelectedWorkflowDetail(prev => prev ? { ...prev, status: 'Approved', isFinished: true } : null);
    }
  };

  const handleRejectPurchaseRequest = (reqId: string) => {
    store.updatePurchaseRequestStatus(reqId, 'Rejected');
    store.addAuditLog('Rejected Purchase Request', 'Workflows', `Request ID "${reqId}" was rejected from unified workflows terminal.`);
    store.addNotification('Workflow Rejected', `Purchase request ${reqId} has been rejected.`, 'approval');
    setDb(store.getDb());
    if (selectedWorkflowDetail && selectedWorkflowDetail.id === reqId) {
      setSelectedWorkflowDetail(prev => prev ? { ...prev, status: 'Rejected', isFinished: true } : null);
    }
  };

  const handleCheckInGuest = (resId: string) => {
    store.performCheckIn(resId);
    store.addAuditLog('Guest Checked In', 'Workflows', `Reservation ID "${resId}" checked in from workflows console.`);
    setDb(store.getDb());
    if (selectedWorkflowDetail && selectedWorkflowDetail.id === resId) {
      setSelectedWorkflowDetail(prev => prev ? { ...prev, status: 'Checked In' } : null);
    }
  };

  const handleResolveMaintenance = (reqId: string) => {
    store.updateMaintenanceStatus(reqId, 'Resolved', 'Resolved via Workflows Dashboard override.');
    store.addAuditLog('Maintenance Resolved', 'Workflows', `Request ID "${reqId}" marked resolved.`);
    setDb(store.getDb());
    if (selectedWorkflowDetail && selectedWorkflowDetail.id === reqId) {
      setSelectedWorkflowDetail(prev => prev ? { ...prev, status: 'Resolved', isFinished: true } : null);
    }
  };

  const handleApproveShiftReport = (reportId: string) => {
    store.updateShiftReportStatus(reportId, 'Approved By CEO', 'Approved from workflows executive terminal');
    store.addAuditLog('Shift Report Approved', 'Workflows', `Shift Reconciliation report "${reportId}" approved by executive.`);
    setDb(store.getDb());
    if (selectedWorkflowDetail && selectedWorkflowDetail.id === reportId) {
      setSelectedWorkflowDetail(prev => prev ? { ...prev, status: 'Approved By CEO', isFinished: true } : null);
    }
  };

  const handlePayPayroll = (payrollId: string) => {
    store.paySalary(payrollId);
    store.addAuditLog('Salary Disbursed', 'Workflows', `Payroll record "${payrollId}" marked as paid.`);
    setDb(store.getDb());
    if (selectedWorkflowDetail && selectedWorkflowDetail.id === payrollId) {
      setSelectedWorkflowDetail(prev => prev ? { ...prev, status: 'Paid', isFinished: true } : null);
    }
  };

  // ============================================================================
  // PRICING SIMULATOR / PRICE UPDATE SAVE
  // ============================================================================
  const handleSavePriceUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimItem) return;

    const newPrice = parseFloat(simPriceInput);
    if (isNaN(newPrice) || newPrice <= 0) {
      setPricingSuccessMsg('❌ Error: Please enter a valid selling price greater than 0');
      return;
    }

    const updated: MenuItem = {
      ...selectedSimItem,
      price: newPrice
    };

    store.saveMenuItem(updated);
    
    // Create Audit log & alert notifications
    store.addAuditLog(
      'POS Price Repriced',
      'Workflows',
      `"${selectedSimItem.name}" selling price recalculated from $${selectedSimItem.price.toFixed(2)} to $${newPrice.toFixed(2)} (Inventory cost-based optimization)`
    );

    store.addNotification(
      'Menu Price Adjusted',
      `"${selectedSimItem.name}" re-priced to $${newPrice.toFixed(2)} based on procurement inflows and outflows analysis.`,
      'approval'
    );

    setPricingSuccessMsg(`✓ successfully saved! "${selectedSimItem.name}" price updated to $${newPrice.toFixed(2)}. This change is live instantly in Cashier POS & Digital Menu boards.`);
    setDb(store.getDb());

    // Auto clear success message
    setTimeout(() => {
      setSelectedSimItem(null);
      setPricingSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-lg border border-indigo-150 dark:border-indigo-900/50 uppercase tracking-wider inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 animate-pulse" /> Operations Switchboard
          </span>
          <h1 className="text-2xl font-bold font-editorial text-gray-800 dark:text-white tracking-tight">Workflows & Profitability Ledger</h1>
          <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">
            Real-time control station mapping active department workloads, purchasing outflows, sale price inflows, and net profit margins.
          </p>
        </div>

        {/* SUBTABS */}
        <div className="flex items-center bg-gray-50 dark:bg-gray-700/60 p-1 rounded-xl border border-gray-150 dark:border-gray-600 font-sans">
          <button
            onClick={() => setActiveSubTab('workflows')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'workflows'
                ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm border border-gray-150 dark:border-gray-500'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            <GitPullRequest className="h-4 w-4 text-[#1B4F72] dark:text-blue-300" /> Department Workflows ({workflowStats.pending})
          </button>
          <button
            onClick={() => setActiveSubTab('profitability')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'profitability'
                ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm border border-gray-150 dark:border-gray-500'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="h-4 w-4 text-[#E67E22]" /> Pricing & Profitability
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeSubTab === 'workflows' ? (
          <>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Active Workflows</span>
                <span className="text-2xl font-bold font-mono text-gray-800 dark:text-white">{workflowStats.pending}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Currently pending actions</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Finished Tasks</span>
                <span className="text-2xl font-bold font-mono text-gray-800 dark:text-white">{workflowStats.finished}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Terminal archived states</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Logged Workflow Tasks</span>
                <span className="text-2xl font-bold font-mono text-gray-800 dark:text-white">{workflowStats.total}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">All-time generated entries</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
                <Percent className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Completion Ratio</span>
                <span className="text-2xl font-bold font-mono text-gray-800 dark:text-white">
                  {workflowStats.total > 0 ? Math.round((workflowStats.finished / workflowStats.total) * 100) : 0}%
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Operational dispatch efficiency</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Dining Revenue (Inflows)</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{store.formatMoney(fbSummary.totalInflow)}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Closed POS ticket cash receipts</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl">
                <TrendingDown className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Ingredient Cost (Outflows)</span>
                <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{store.formatMoney(fbSummary.totalOutflow)}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Weighted raw inventory purchase cost</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Net F&B Profit</span>
                <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{store.formatMoney(fbSummary.netProfit)}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Realized net margins on meals sold</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
                <Percent className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Gross Profit Margin</span>
                <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{fbSummary.grossMarginPercent.toFixed(1)}%</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">F&B markup markup yield</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* TAB SUB-VIEWS */}
      {activeSubTab === 'workflows' ? (
        /* WORKFLOWS MODULE VIEW */
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-6">
          {/* SEARCH, DEPT FILTER, STATUS FILTER */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-150 dark:border-gray-700">
            <div className="relative w-full lg:w-80">
              <input
                type="text"
                placeholder="Search workflow title, dept, ID..."
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:outline-none text-gray-700 dark:text-gray-200"
                value={workflowSearch}
                onChange={(e) => setWorkflowSearch(e.target.value)}
              />
              <Search className="absolute left-2.5 top-2.5 text-gray-400 h-4 w-4" />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center space-x-1.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-150 dark:border-gray-700 text-xs font-semibold">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-500">Dept:</span>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  <option value="FrontDesk">Front Desk Reception</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Maintenance">Maintenance & Engineering</option>
                  <option value="Procurement">Procurement</option>
                  <option value="Dining">Dining POS</option>
                  <option value="HR">HR & Payroll</option>
                  <option value="Audit">Operations Audit</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-150 dark:border-gray-700 text-xs font-semibold">
                <span className="text-gray-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending / In Progress</option>
                  <option value="Finished">Finished / Completed</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setDeptFilter('All');
                  setStatusFilter('All');
                  setWorkflowSearch('');
                }}
                className="px-3 py-1.5 bg-gray-150 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-600 dark:text-gray-200 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-650 cursor-pointer transition flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Reset
              </button>
            </div>
          </div>

          {/* TABLE OF WORKFLOWS */}
          <div className="overflow-x-auto rounded-xl border border-gray-150 dark:border-gray-700">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-900/30 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-150 dark:border-gray-700">
                  <th className="p-3.5 pl-4">Department & Origin</th>
                  <th className="p-3.5">Workflow / Task Description</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned Date / Created</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-xs font-medium">
                {filteredWorkflows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-gray-500 italic">
                      No active or finished department workflows found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredWorkflows.map(wf => {
                    const isFin = wf.isFinished;
                    return (
                      <tr key={`${wf.originType}-${wf.id}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition">
                        {/* Department Badge */}
                        <td className="p-3.5 pl-4">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider w-fit ${
                              wf.originType === 'Reservation' ? 'bg-blue-50 text-blue-700 border-blue-150 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50' :
                              wf.originType === 'CleaningTask' ? 'bg-purple-50 text-purple-700 border-purple-150 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50' :
                              wf.originType === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50' :
                              wf.originType === 'PurchaseRequest' || wf.originType === 'PurchaseOrder' ? 'bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' :
                              wf.originType === 'RestaurantOrder' ? 'bg-teal-50 text-teal-700 border-teal-150 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/50' :
                              wf.originType === 'Payroll' ? 'bg-pink-50 text-pink-700 border-pink-150 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/50' :
                              'bg-slate-50 text-slate-700 border-slate-150 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
                            }`}>
                              {wf.originType === 'Reservation' && <Users className="h-2.5 w-2.5" />}
                              {wf.originType === 'CleaningTask' && <Package className="h-2.5 w-2.5" />}
                              {wf.originType === 'Maintenance' && <Wrench className="h-2.5 w-2.5" />}
                              {wf.originType === 'PurchaseRequest' && <GitPullRequest className="h-2.5 w-2.5" />}
                              {wf.originType === 'PurchaseOrder' && <Package className="h-2.5 w-2.5" />}
                              {wf.originType === 'RestaurantOrder' && <Utensils className="h-2.5 w-2.5" />}
                              {wf.originType === 'Payroll' && <Sparkles className="h-2.5 w-2.5" />}
                              {wf.originType === 'ShiftReport' && <ClipboardList className="h-2.5 w-2.5" />}
                              {wf.department}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">ID: {wf.id.substring(0, 8)}</span>
                          </div>
                        </td>

                        {/* Title & Details */}
                        <td className="p-3.5">
                          <div className="space-y-0.5 max-w-sm lg:max-w-md">
                            <span className="font-bold text-gray-800 dark:text-gray-200 block">{wf.title}</span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-400 font-medium line-clamp-1">{wf.subtitle}</span>
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isFin
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                              : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isFin ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                            {wf.status}
                          </span>
                        </td>

                        {/* Created At Date */}
                        <td className="p-3.5 text-gray-400 dark:text-gray-500 font-mono">
                          {wf.createdAt ? new Date(wf.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </td>

                        {/* Action buttons */}
                        <td className="p-3.5 text-right pr-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setSelectedWorkflowDetail(wf)}
                              className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-600 dark:text-gray-200 text-[10px] font-bold rounded border border-gray-200 dark:border-gray-600 cursor-pointer transition flex items-center gap-1"
                              title="View full object details & auditing"
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </button>

                            {/* Action overrides depending on type */}
                            {wf.originType === 'PurchaseRequest' && wf.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleApprovePurchaseRequest(wf.id)}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 text-[10px] font-bold rounded cursor-pointer transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectPurchaseRequest(wf.id)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 text-[10px] font-bold rounded cursor-pointer transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {wf.originType === 'Reservation' && wf.status === 'Confirmed' && (
                              <button
                                onClick={() => handleCheckInGuest(wf.id)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 text-[10px] font-bold rounded cursor-pointer transition"
                              >
                                Check In
                              </button>
                            )}

                            {wf.originType === 'Maintenance' && wf.status !== 'Resolved' && (
                              <button
                                onClick={() => handleResolveMaintenance(wf.id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 text-[10px] font-bold rounded cursor-pointer transition"
                              >
                                Resolve
                              </button>
                            )}

                            {wf.originType === 'ShiftReport' && wf.status !== 'Approved By CEO' && (
                              <button
                                onClick={() => handleApproveShiftReport(wf.id)}
                                className="px-2.5 py-1 bg-[#1B4F72] hover:bg-[#153E5B] text-white text-[10px] font-bold rounded cursor-pointer transition"
                              >
                                Approve Report
                              </button>
                            )}

                            {wf.originType === 'Payroll' && wf.status === 'Pending Payment' && (
                              <button
                                onClick={() => handlePayPayroll(wf.id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 text-[10px] font-bold rounded cursor-pointer transition flex items-center gap-1"
                              >
                                <CreditCard className="h-3 w-3" /> Disburse
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* PROFITABILITY MODULE VIEW */
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-gray-100 dark:border-gray-700/50 font-sans">
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1.5 uppercase">
                <ChefHat className="h-4 w-4 text-[#1B4F72] dark:text-blue-300" /> Food & Beverage Profitability & Pricing Matrix
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                Analyzing purchase outflow costs of ingredients vs sale inflows at POS. Configure selling prices to hit optimal profit margins.
              </p>
            </div>

            <div className="flex items-center space-x-1.5 bg-gray-50 dark:bg-gray-700 p-1 rounded-xl border border-gray-150 dark:border-gray-600">
              {['All', 'Starter', 'Main', 'Dessert', 'Beverage', 'Alcoholic'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setProfitCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                    profitCategoryFilter === cat
                      ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white border border-gray-150 dark:border-gray-500 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-150 dark:border-gray-700">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search dish or ingredients..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:outline-none text-gray-700 dark:text-gray-200"
                value={profitSearch}
                onChange={(e) => setProfitSearch(e.target.value)}
              />
              <Search className="absolute left-2.5 top-2.5 text-gray-400 h-3.5 w-3.5" />
            </div>

            <div className="flex items-center space-x-3 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              <span>Sort:</span>
              <button
                onClick={() => {
                  if (profitSortKey === 'sold') setProfitSortDesc(!profitSortDesc);
                  else { setProfitSortKey('sold'); setProfitSortDesc(true); }
                }}
                className={`cursor-pointer pb-0.5 border-b-2 ${profitSortKey === 'sold' ? 'text-gray-800 dark:text-white border-[#E67E22]' : 'border-transparent'}`}
              >
                Popularity (Sold)
              </button>
              <button
                onClick={() => {
                  if (profitSortKey === 'margin') setProfitSortDesc(!profitSortDesc);
                  else { setProfitSortKey('margin'); setProfitSortDesc(true); }
                }}
                className={`cursor-pointer pb-0.5 border-b-2 ${profitSortKey === 'margin' ? 'text-gray-800 dark:text-white border-[#E67E22]' : 'border-transparent'}`}
              >
                Profit Margin %
              </button>
              <button
                onClick={() => {
                  if (profitSortKey === 'totalProfit') setProfitSortDesc(!profitSortDesc);
                  else { setProfitSortKey('totalProfit'); setProfitSortDesc(true); }
                }}
                className={`cursor-pointer pb-0.5 border-b-2 ${profitSortKey === 'totalProfit' ? 'text-gray-800 dark:text-white border-[#E67E22]' : 'border-transparent'}`}
              >
                Accumulated Net Profit
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-xl border border-gray-150 dark:border-gray-700">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-900/30 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-150 dark:border-gray-700">
                  <th className="p-3.5 pl-4">Menu Dish & Category</th>
                  <th className="p-3.5">Connected Raw Material (Outflow)</th>
                  <th className="p-3.5">Sale Price (Inflow)</th>
                  <th className="p-3.5">Unit Margin / %</th>
                  <th className="p-3.5">Closed Sales Volume</th>
                  <th className="p-3.5">Accumulated Income / Profit</th>
                  <th className="p-3.5 text-right pr-4">Pricing Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-xs font-medium">
                {sortedProfitabilityList.map(row => {
                  const hasProd = row.linkedProduct !== null;
                  const isMarginGood = row.marginPercent >= 50;
                  const isMarginBad = row.marginPercent < 30;

                  return (
                    <tr key={row.item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition">
                      <td className="p-3.5 pl-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-gray-800 dark:text-gray-100 block">{row.item.name}</span>
                          <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                            row.item.category === 'Starter' ? 'bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50' :
                            row.item.category === 'Main' ? 'bg-blue-50 text-blue-700 border-blue-150 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50' :
                            row.item.category === 'Dessert' ? 'bg-pink-50 text-pink-700 border-pink-150 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/50' :
                            row.item.category === 'Beverage' ? 'bg-teal-50 text-teal-700 border-teal-150 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/50' :
                            'bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50'
                          }`}>
                            {row.item.category}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {hasProd ? (
                          <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
                            <span className="font-bold block">📦 {row.linkedProduct?.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">Cost: {store.formatMoney(row.unitCost)} per {row.linkedProduct?.unit}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic text-[10px] font-semibold">No direct ingredient link</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold font-mono text-gray-800 dark:text-gray-100">
                        {store.formatMoney(row.unitPrice)}
                      </td>

                      <td className="p-3.5">
                        {hasProd ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-700 dark:text-gray-200 block font-mono">{store.formatMoney(row.unitProfit)} profit</span>
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isMarginGood ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' :
                              isMarginBad ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                              'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                              {row.marginPercent.toFixed(1)}% margin
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 font-mono">—</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold font-mono bg-slate-50 dark:bg-gray-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-600">
                          {row.soldQty} Sold
                        </span>
                      </td>

                      <td className="p-3.5">
                        {row.soldQty > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-gray-400 dark:text-gray-500 block font-mono text-[10px]">Rev: {store.formatMoney(row.totalRevenue)}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold block font-mono">Profit: {store.formatMoney(row.totalProfit)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic text-[10px]">No closed sales yet</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <button
                          onClick={() => setSelectedSimItem(row.item)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-150 dark:border-amber-900/50 text-[10px] font-bold rounded cursor-pointer transition flex items-center gap-1 ml-auto"
                        >
                          <Calculator className="h-3.5 w-3.5" /> Adjust & Simulate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: WORKFLOW DETAIL CARD */}
      {selectedWorkflowDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-gray-800 max-w-lg w-full rounded-2xl border border-gray-150 dark:border-gray-700 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-4 bg-slate-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-[#1B4F72] dark:text-blue-300" /> Unified Workflow Record Details
              </span>
              <button
                onClick={() => setSelectedWorkflowDetail(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">{selectedWorkflowDetail.department}</span>
                <h3 className="text-base font-bold text-gray-800 dark:text-white leading-tight">{selectedWorkflowDetail.title}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-400 font-mono mt-1">Universal Task ID: {selectedWorkflowDetail.id}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-700 space-y-2.5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Workflow Type</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{selectedWorkflowDetail.originType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Created / Assigned</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200 font-mono">
                      {new Date(selectedWorkflowDetail.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Current Status</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      selectedWorkflowDetail.isFinished ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      {selectedWorkflowDetail.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Priority Level</span>
                    <span className={`font-bold ${selectedWorkflowDetail.priority === 'High' ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                      {selectedWorkflowDetail.priority || 'Medium'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-150 dark:border-gray-700">
                  <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider mb-0.5">Summary Details</span>
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                    {selectedWorkflowDetail.subtitle}
                  </p>
                </div>
              </div>

              {/* ACTION GATEWAYS IN DETAILS VIEW */}
              <div className="flex flex-col space-y-2 pt-2">
                {!selectedWorkflowDetail.isFinished ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/50 rounded-xl text-xs space-y-3">
                    <span className="font-bold text-blue-800 dark:text-blue-300 block">⚡ Executive Workflow Actions:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorkflowDetail.originType === 'PurchaseRequest' && (
                        <>
                          <button
                            onClick={() => {
                              handleApprovePurchaseRequest(selectedWorkflowDetail.id);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer transition flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve Order Request
                          </button>
                          <button
                            onClick={() => {
                              handleRejectPurchaseRequest(selectedWorkflowDetail.id);
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer transition flex items-center gap-1"
                          >
                            <X className="h-3.5 w-3.5" /> Reject Request
                          </button>
                        </>
                      )}

                      {selectedWorkflowDetail.originType === 'Reservation' && selectedWorkflowDetail.status === 'Confirmed' && (
                        <button
                          onClick={() => {
                            handleCheckInGuest(selectedWorkflowDetail.id);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer transition flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Check In Guest
                        </button>
                      )}

                      {selectedWorkflowDetail.originType === 'Maintenance' && (
                        <button
                          onClick={() => {
                            handleResolveMaintenance(selectedWorkflowDetail.id);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer transition flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Mark Repair Complete
                        </button>
                      )}

                      {selectedWorkflowDetail.originType === 'ShiftReport' && (
                        <button
                          onClick={() => {
                            handleApproveShiftReport(selectedWorkflowDetail.id);
                          }}
                          className="px-3 py-1.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded font-bold cursor-pointer transition flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve Shift Report
                        </button>
                      )}

                      {selectedWorkflowDetail.originType === 'Payroll' && selectedWorkflowDetail.status === 'Pending Payment' && (
                        <button
                          onClick={() => {
                            handlePayPayroll(selectedWorkflowDetail.id);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer transition flex items-center gap-1"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Disburse Salary
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-700 rounded-xl text-xs text-gray-500 italic text-center">
                    ✓ This workflow has reached its terminal, finished state and is archived for auditing.
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-gray-900 border-t border-gray-150 dark:border-gray-700 text-right">
              <button
                onClick={() => setSelectedWorkflowDetail(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-600 cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRICING SIMULATOR & ADJUSMENT WIZARD */}
      {selectedSimItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-gray-800 max-w-lg w-full rounded-2xl border border-gray-150 dark:border-gray-700 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-4 bg-slate-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-[#E67E22]" /> Pricing Simulator & Ingredient Cost Matrix
              </span>
              <button
                onClick={() => setSelectedSimItem(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePriceUpdate}>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded border uppercase tracking-wider">
                    {selectedSimItem.category}
                  </span>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white leading-tight">{selectedSimItem.name}</h3>
                </div>

                {/* CURRENT INFLOW & OUTFLOW SPECS */}
                {(() => {
                  const linkedProd = selectedSimItem.productId ? db.products?.find(p => p.id === selectedSimItem.productId) : null;
                  const unitCost = linkedProd ? linkedProd.unitPrice : 0;
                  const currentPrice = selectedSimItem.price;
                  const currentProfit = currentPrice - unitCost;
                  const currentMargin = currentPrice > 0 ? (currentProfit / currentPrice) * 100 : 0;

                  // Simulated Profit calculation
                  const simPrice = parseFloat(simPriceInput) || 0;
                  const simProfit = simPrice - unitCost;
                  const simMargin = simPrice > 0 ? (simProfit / simPrice) * 100 : 0;
                  const soldQty = menuItemSalesCounts[selectedSimItem.id] || 0;

                  return (
                    <div className="space-y-4">
                      {/* Cost Ingredient Connection Box */}
                      <div className="p-4 bg-slate-50 dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-700 space-y-2 text-xs">
                        <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Ingredient Inflow/Outflow Connections</span>
                        {linkedProd ? (
                          <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-150 dark:border-gray-700">
                            <span className="font-bold text-gray-700 dark:text-gray-200">
                              📦 {linkedProd.name}
                            </span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                              Cost: {store.formatMoney(unitCost)} per {linkedProd.unit}
                            </span>
                          </div>
                        ) : (
                          <p className="text-gray-400 dark:text-gray-500 italic">No direct raw material linked. Operating cost is calculated at $0.00.</p>
                        )}
                      </div>

                      {/* Side-by-side: Current vs Simulated */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-700 space-y-1.5">
                          <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Current Menu Pricing</span>
                          <div className="space-y-0.5">
                            <span className="block text-gray-500">Selling Price: <strong className="text-gray-800 dark:text-white font-mono">{store.formatMoney(currentPrice)}</strong></span>
                            {linkedProd && (
                              <>
                                <span className="block text-gray-500">Unit Profit: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{store.formatMoney(currentProfit)}</strong></span>
                                <span className="block text-gray-500">Gross Margin: <strong className="text-amber-600 dark:text-amber-400 font-mono">{currentMargin.toFixed(1)}%</strong></span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-amber-900/30 space-y-1.5">
                          <span className="text-[#E67E22] block uppercase font-bold text-[9px] tracking-wider">Simulated Pricing</span>
                          <div className="space-y-0.5">
                            <span className="block text-gray-500">Sim Price: <strong className="text-gray-800 dark:text-white font-mono">{store.formatMoney(simPrice)}</strong></span>
                            {linkedProd && (
                              <>
                                <span className="block text-gray-500">Sim Profit: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{store.formatMoney(simProfit)}</strong></span>
                                <span className="block text-gray-500">Sim Margin: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{simMargin.toFixed(1)}%</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selling Price input */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Set New Selling Price (Inflow to POS)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none text-gray-800 dark:text-white font-mono font-bold"
                            value={simPriceInput}
                            onChange={(e) => setSimPriceInput(e.target.value)}
                          />
                          <span className="absolute left-3 top-2 text-gray-400 font-bold">$</span>
                        </div>
                      </div>

                      {/* IMPACT FORECAST */}
                      {soldQty > 0 && (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs">
                          <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest block mb-1">Impact Forecast on Sold Volume</span>
                          <p className="text-gray-600 dark:text-gray-300">
                            Based on past closed cashier receipts of <strong className="font-mono">{soldQty} sold</strong>, this price optimization yields a forecasted total net profit of <strong className="font-mono text-emerald-600 dark:text-emerald-400">{store.formatMoney(soldQty * simProfit)}</strong> (an adjustment of <strong className="font-mono">{(soldQty * (simProfit - currentProfit)) >= 0 ? '+' : ''}{store.formatMoney(soldQty * (simProfit - currentProfit))}</strong> in net inflows).
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {pricingSuccessMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-bold leading-relaxed">
                    {pricingSuccessMsg}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-gray-900 border-t border-gray-150 dark:border-gray-700 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedSimItem(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-600 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-sm flex items-center gap-1"
                >
                  <Check className="h-4 w-4" /> Save New Selling Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
