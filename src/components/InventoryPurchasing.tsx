/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { InventoryProduct, Supplier, PurchaseRequest, PurchaseOrder, StockMovementType, MenuItem } from '../types';
import { launchPrintPreview, getPurchaseOrderHTML, getGoodsReceivedNoteHTML, getInventorySelectedReportHTML, getProcurementSelectedReportHTML } from '../utils/printService';
import {
  Package,
  Plus,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  AlertTriangle,
  History,
  CheckCircle,
  FileText,
  ChefHat,
  UtensilsCrossed,
  ShoppingBag,
  Printer
} from 'lucide-react';

export default function InventoryPurchasing() {
  const [activeTab, setActiveTab] = useState<'registry' | 'purchases' | 'suppliers' | 'menu_availability'>('registry');
  const db = store.getDb();

  // Menu Search / Filtering states
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuCatFilter, setMenuCatFilter] = useState('All');
  const [menuSuccessMsg, setMenuSuccessMsg] = useState('');

  // Dialog states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Filter products
  const [prodCategoryFilter, setProdCategoryFilter] = useState('All');
  const [prodSearchQuery, setProdSearchQuery] = useState('');

  // Stock Movement logger states
  const [selectedProdId, setSelectedProdId] = useState('');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<StockMovementType>('In');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Product Creation / Edit States
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Food');
  const [newProdUnit, setNewProdUnit] = useState('pcs');
  const [newProdMin, setNewProdMin] = useState<number>(5);
  const [newProdPrice, setNewProdPrice] = useState<number>(10);
  const [newProdLoc, setNewProdLoc] = useState('Aisle A');
  const [newProdSup, setNewProdSup] = useState('');

  // Supplier Creation States
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddr, setNewSupAddr] = useState('');

  // PO Creation States
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poQty, setPoQty] = useState<number>(10);
  const [poPrice, setPoPrice] = useState<number>(10);

  // Selected items for reports
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedPurchaseOrderIds, setSelectedPurchaseOrderIds] = useState<string[]>([]);

  // ============================================================================
  // CALCULATIONS & FILTERS
  // ============================================================================
  const filteredProducts = useMemo(() => {
    return db.products.filter(p => {
      const cMatch = prodCategoryFilter === 'All' || p.category === prodCategoryFilter;
      const sMatch = p.name.toLowerCase().includes(prodSearchQuery.toLowerCase());
      return cMatch && sMatch;
    });
  }, [db, prodCategoryFilter, prodSearchQuery]);

  const filteredMenuItems = useMemo(() => {
    return (db.menuItems || []).filter(item => {
      const categoryMatch = menuCatFilter === 'All' || item.category === menuCatFilter;
      const searchMatch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
                          (item.description || '').toLowerCase().includes(menuSearchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [db.menuItems, menuCatFilter, menuSearchQuery]);

  const handleToggleMenuItemStock = (item: MenuItem) => {
    const isCurrentlyAvail = item.isAvailable !== false;
    const updated = { ...item, isAvailable: !isCurrentlyAvail };
    store.saveMenuItem(updated);
    
    // Add central audit log & notification
    store.addAuditLog('Menu Stock Toggle', 'Inventory', `"${item.name}" availability toggled to ${updated.isAvailable ? 'Available' : 'Out of Stock'}`);
    store.addNotification(
      'Stock Availability Changed',
      `"${item.name}" has been marked as ${updated.isAvailable ? 'AVAILABLE ✅' : 'OUT OF STOCK ❌'} by Inventory Dept.`,
      'low_stock'
    );
    
    setMenuSuccessMsg(`"${item.name}" has been successfully set to ${updated.isAvailable ? 'AVAILABLE' : 'OUT OF STOCK'}!`);
    setTimeout(() => setMenuSuccessMsg(''), 5000);
  };

  // ============================================================================
  // OPERATIONS HANDLERS
  // ============================================================================
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdUnit) return;

    const prod: InventoryProduct = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: newProdName,
      category: newProdCat,
      unit: newProdUnit,
      currentStock: editingProduct ? editingProduct.currentStock : 0,
      minStockAlert: newProdMin,
      unitPrice: newProdPrice,
      warehouseLocation: newProdLoc,
      supplierId: newProdSup || undefined
    };

    store.saveInventoryProduct(prod);
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setNewProdName('');
    setNewProdCat('Food');
    setNewProdUnit('pcs');
    setNewProdMin(5);
    setNewProdPrice(10);
    setNewProdLoc('Aisle A');
    setNewProdSup('');
  };

  const handleEditProduct = (prod: InventoryProduct) => {
    setEditingProduct(prod);
    setNewProdName(prod.name);
    setNewProdCat(prod.category);
    setNewProdUnit(prod.unit);
    setNewProdMin(prod.minStockAlert);
    setNewProdPrice(prod.unitPrice);
    setNewProdLoc(prod.warehouseLocation || '');
    setNewProdSup(prod.supplierId || '');
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    const prod = db.products.find(p => p.id === id);
    if (prod && confirm(`Are you sure you want to delete "${prod.name}" from the product registry?`)) {
      store.deleteInventoryProduct(id);
    }
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId || adjustQty <= 0) return;

    store.addInventoryMovement(selectedProdId, adjustQty, adjustType, adjustNotes);
    
    // Clear
    setSelectedProdId('');
    setAdjustQty(1);
    setAdjustNotes('');
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName || !newSupContact) return;

    const sup: Supplier = {
      id: `sup_${Date.now()}`,
      name: newSupName,
      contactName: newSupContact,
      email: newSupEmail,
      phone: newSupPhone,
      address: newSupAddr
    };

    store.saveSupplier(sup);
    setIsSupplierModalOpen(false);
    setNewSupName('');
    setNewSupContact('');
  };

  const handleCreatePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || !poProductId || poQty <= 0) return;

    const prod = db.products.find(p => p.id === poProductId);
    if (!prod) return;

    const poId = `po_${Date.now()}`;
    const total = poQty * poPrice;

    const po: PurchaseOrder = {
      id: poId,
      supplierId: poSupplierId,
      items: [{
        productId: poProductId,
        name: prod.name,
        quantity: poQty,
        unitPrice: poPrice
      }],
      totalAmount: total,
      status: 'Ordered', // Automatically skip draft to make sandbox testing immediate
      paymentStatus: 'Paid',
      orderedDate: new Date().toISOString().split('T')[0],
      createdBy: store.getActiveUser()?.id || 'system'
    };

    store.addPurchaseOrder(po);

    // Clear Form
    setPoSupplierId('');
    setPoProductId('');
    setPoQty(10);
    setPoPrice(10);
  };

  const handleReceiveGoods = (poId: string) => {
    store.receivePurchaseOrder(poId);
  };

  const handleToggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const handleSelectAllFilteredProducts = (filteredProds: InventoryProduct[]) => {
    const allFilteredIds = filteredProds.map(p => p.id);
    const areAllSelected = allFilteredIds.every(id => selectedProductIds.includes(id));
    if (areAllSelected) {
      setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedProductIds(prev => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const handlePrintStockReport = () => {
    const selectedProducts = db.products.filter(p => selectedProductIds.includes(p.id));
    if (selectedProducts.length === 0) {
      alert("Please select at least one product to print.");
      return;
    }
    const html = getInventorySelectedReportHTML(selectedProducts);
    launchPrintPreview('Inventory Report', `Selected Stock Level Report - ${selectedProducts.length} items`, html);
  };

  const handleTogglePOSelection = (poId: string) => {
    setSelectedPurchaseOrderIds(prev => 
      prev.includes(poId) 
        ? prev.filter(id => id !== poId) 
        : [...prev, poId]
    );
  };

  const handleSelectAllPOs = (pos: PurchaseOrder[]) => {
    const allPoIds = pos.map(p => p.id);
    const areAllSelected = allPoIds.every(id => selectedPurchaseOrderIds.includes(id));
    if (areAllSelected) {
      setSelectedPurchaseOrderIds(prev => prev.filter(id => !allPoIds.includes(id)));
    } else {
      setSelectedPurchaseOrderIds(prev => {
        const union = new Set([...prev, ...allPoIds]);
        return Array.from(union);
      });
    }
  };

  const handlePrintProcurementReport = () => {
    const selectedOrders = db.purchaseOrders.filter(o => selectedPurchaseOrderIds.includes(o.id));
    if (selectedOrders.length === 0) {
      alert("Please select at least one purchase order to print.");
      return;
    }
    const html = getProcurementSelectedReportHTML(selectedOrders);
    launchPrintPreview('Inventory Report', `Selected Procurement Report - ${selectedOrders.length} orders`, html);
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-[#1B4F72] rounded-xl">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Inventory & Procurement</h1>
            <p className="text-xs text-gray-400">Manage property goods, spa inventories, dining supplies, purchase order approvals, and check-in receipts.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Product Registry & Stock
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Certified Suppliers
          </button>
          <button
            onClick={() => setActiveTab('menu_availability')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'menu_availability'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Restaurant Menu Stock & Availability
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCT REGISTRY & ADJUST STOCK */}
      {activeTab === 'registry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Products List Panel */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl border border-gray-150">
                {['All', 'Amenities', 'Linen', 'Food', 'Beverage', 'Cleaning'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setProdCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                      prodCategoryFilter === cat ? 'bg-white text-gray-800 border border-gray-150 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Lookup item name..."
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  value={prodSearchQuery}
                  onChange={(e) => setProdSearchQuery(e.target.value)}
                />
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setNewProdName('');
                    setNewProdCat('Food');
                    setNewProdUnit('pcs');
                    setNewProdMin(5);
                    setNewProdPrice(10);
                    setNewProdLoc('Aisle A');
                    setNewProdSup('');
                    setIsProductModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl text-xs font-semibold flex items-center cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-1" /> Create Item
                </button>
              </div>
            </div>

            {/* Printable Stock Report Builder */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-gray-150 text-xs">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-[#1B4F72] rounded-lg">
                  <Printer className="h-4 w-4" />
                </span>
                <div>
                  <strong className="text-gray-700 block">Stock Report Builder</strong>
                  <span className="text-[10px] text-gray-400 font-medium">Select specific items from the list below, then compile into a formatted print report.</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllFilteredProducts(filteredProducts)}
                  className="px-2.5 py-1.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id)) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintStockReport}
                  disabled={selectedProductIds.length === 0}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm ${
                    selectedProductIds.length > 0
                      ? 'bg-[#1B4F72] hover:bg-[#153E5B] text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" /> Print Selected ({selectedProductIds.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                        checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                        onChange={() => handleSelectAllFilteredProducts(filteredProducts)}
                      />
                    </th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Current Stock</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(p => {
                    const isLow = p.currentStock <= p.minStockAlert;
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50/50 font-medium text-gray-700 ${isSelected ? 'bg-blue-50/20' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                            checked={isSelected}
                            onChange={() => handleToggleProductSelection(p.id)}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <strong className="text-gray-800 text-xs block">{p.name}</strong>
                          <span className="text-[10px] text-gray-400 font-mono">ID: {p.id} • Unit: {p.unit}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded text-[10px] font-bold">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-500">{p.warehouseLocation || 'Aisle A'}</td>
                        <td className="py-3 px-3">
                          <strong className="text-sm font-mono">{p.currentStock}</strong> <span className="text-gray-400 text-[10px] font-bold">/ Min {p.minStockAlert}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isLow ? (
                            <span className="bg-red-50 text-red-700 font-bold border border-red-100 px-2 py-0.5 rounded inline-flex items-center justify-center space-x-1 min-w-[70px]">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>LOW</span>
                            </span>
                          ) : (
                            <span className="bg-green-50 text-green-700 font-bold border border-green-100 px-2 py-0.5 rounded inline-block text-center min-w-[70px]">
                              Secure
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditProduct(p)}
                            className="text-[11px] font-bold text-[#1B4F72] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stock Movement Logger Panel */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                <History className="h-4 w-4 mr-1 text-[#E67E22]" /> Adjust stock ledger
              </h3>
              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Catalog Item</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={selectedProdId}
                    onChange={(e) => setSelectedProdId(e.target.value)}
                  >
                    <option value="">-- Choose Item --</option>
                    {db.products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.currentStock} in stock)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Adjustment Type</label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value as any)}
                    >
                      <option value="In">Stock In (+)</option>
                      <option value="Out">Stock Out (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Adjustment Notes / Audit Trace</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Broken package, spa allocate"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Adjust Stock Count
                </button>
              </form>
            </div>

            {/* Recent Movements ledger list */}
            <div className="space-y-3 pt-4 border-t border-gray-150">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Live Inventory Log Feed</h4>
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {db.inventoryMovements.slice(0, 4).map(mov => {
                  const prodObj = db.products.find(p => p.id === mov.productId);
                  return (
                    <div key={mov.id} className="flex items-center justify-between text-[11px] bg-gray-50 p-2 rounded-xl border border-gray-150">
                      <div>
                        <strong className="text-gray-700 block">{prodObj?.name}</strong>
                        <span className="text-gray-400">{mov.notes || 'Manual stock check'}</span>
                      </div>
                      <span className={`inline-flex items-center font-bold font-mono px-2 py-0.5 rounded ${
                        mov.type === 'In' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {mov.type === 'In' ? '+' : '-'}{mov.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS QUEUE */}
      {activeTab === 'purchases' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Purchase order form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Draft Procurement order
            </h3>
            <form onSubmit={handleCreatePurchaseOrder} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Supplier</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                >
                  <option value="">-- Choose Supplier --</option>
                  {db.suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contactName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Product</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={poProductId}
                  onChange={(e) => setPoProductId(e.target.value)}
                >
                  <option value="">-- Choose Product --</option>
                  {db.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.currentStock} {p.unit} in stock)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Order Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                    value={poQty}
                    onChange={(e) => setPoQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit Cost ({store.getCurrencySymbol()})</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                    value={poPrice}
                    onChange={(e) => setPoPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="bg-yellow-50/50 p-4 border border-yellow-100 rounded-xl text-[11px] text-gray-500">
                <div className="flex justify-between font-bold text-gray-700">
                  <span>Total Order Payout:</span>
                  <span>{store.formatMoney(poQty * poPrice)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Send Procurement Order
              </button>
            </form>
          </div>

          {/* Active purchases lists */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Live Procurement Orders ({db.purchaseOrders.length})</h3>
            
            {/* Printable Procurement Report Builder */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-gray-150 text-xs">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-[#1B4F72] rounded-lg">
                  <Printer className="h-4 w-4" />
                </span>
                <div>
                  <strong className="text-gray-700 block">Procurement Report Builder</strong>
                  <span className="text-[10px] text-gray-400 font-medium">Select specific orders from the queue below to compile a printable procurement statement.</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllPOs(db.purchaseOrders)}
                  className="px-2.5 py-1.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {db.purchaseOrders.length > 0 && db.purchaseOrders.every(po => selectedPurchaseOrderIds.includes(po.id)) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintProcurementReport}
                  disabled={selectedPurchaseOrderIds.length === 0}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm ${
                    selectedPurchaseOrderIds.length > 0
                      ? 'bg-[#1B4F72] hover:bg-[#153E5B] text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" /> Print Selected ({selectedPurchaseOrderIds.length})
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {db.purchaseOrders.map(po => {
                const supplier = db.suppliers.find(s => s.id === po.supplierId);
                const isSelected = selectedPurchaseOrderIds.includes(po.id);
                return (
                  <div key={po.id} className={`p-4 rounded-2xl border flex items-start justify-between transition ${isSelected ? 'bg-blue-50/20 border-blue-200 ring-1 ring-blue-200' : 'bg-gray-50/50 border-gray-150'}`}>
                    <div className="flex items-start space-x-3 text-xs text-gray-600">
                      <div className="pt-1.5 shrink-0">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                          checked={isSelected}
                          onChange={() => handleTogglePOSelection(po.id)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <strong className="text-[#1B4F72] font-mono text-sm">{po.id}</strong>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            po.status === 'Received' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-orange-50 text-[#E67E22] border border-orange-100'
                          }`}>
                            {po.status}
                          </span>
                        </div>
                        <p className="font-bold text-gray-800">Supplier: {supplier?.name}</p>
                      <div className="text-[11px] space-y-1 bg-white p-2.5 rounded-lg border border-gray-150">
                        {po.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between font-medium">
                            <span>{it.quantity} x {it.name}</span>
                            <span className="text-gray-400">${it.unitPrice} each</span>
                          </div>
                        ))}
                      </div>
                      <span className="block font-mono text-[10px] text-gray-400">Date Ordered: {po.orderedDate}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-3 shrink-0 flex flex-col items-end">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">Total amount</span>
                        <strong className="text-base font-bold text-gray-800">${po.totalAmount}</strong>
                      </div>
                      
                      <div className="flex flex-col gap-1 w-28">
                        <button
                          type="button"
                          onClick={() => {
                            const html = getPurchaseOrderHTML(po, supplier);
                            launchPrintPreview('Purchase Order', `Purchase Order - ${po.id}`, html);
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1B4F72] border border-blue-200 rounded-lg font-bold text-[9px] cursor-pointer inline-flex items-center justify-center gap-1 w-full"
                        >
                          <Printer className="h-3 w-3" /> Print PO
                        </button>
                        {po.status === 'Received' ? (
                          <button
                            type="button"
                            onClick={() => {
                              const html = getGoodsReceivedNoteHTML(po, supplier);
                              launchPrintPreview('Goods Received Note', `Goods Received Note - ${po.id}`, html);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[9px] cursor-pointer inline-flex items-center justify-center gap-1 w-full"
                          >
                            <Printer className="h-3 w-3" /> Print GRN
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReceiveGoods(po.id)}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[9px] cursor-pointer w-full text-center"
                          >
                            Receive Cargo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CERTIFIED SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Supplier create form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Certify Property Supplier
            </h3>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Company Corporate Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zen Linen Wholesalers"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lead Contact Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                  value={newSupContact}
                  onChange={(e) => setNewSupContact(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                    value={newSupEmail}
                    onChange={(e) => setNewSupEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Corporate Address</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={newSupAddr}
                  onChange={(e) => setNewSupAddr(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Certify Supplier
              </button>
            </form>
          </div>

          {/* Suppliers table catalog */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Certified Partners ({db.suppliers.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {db.suppliers.map(s => (
                <div key={s.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-50 text-[#1B4F72] rounded-lg border border-blue-100">
                      <Truck className="h-4 w-4" />
                    </div>
                    <strong className="text-gray-800 text-sm block">{s.name}</strong>
                  </div>
                  <div className="space-y-1 text-gray-500 font-semibold pl-1">
                    <span className="block">Contact Representative: <strong className="text-gray-700">{s.contactName}</strong></span>
                    <span className="block">Email: <strong className="text-gray-700">{s.email}</strong></span>
                    <span className="block">Phone: <strong className="text-gray-700">{s.phone}</strong></span>
                    <span className="block">Address: <strong className="text-gray-700">{s.address || 'N/A'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MENU ITEM AVAILABILITY */}
      {activeTab === 'menu_availability' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-gray-100 font-sans">
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 uppercase">
                <ChefHat className="h-4 w-4 text-[#1B4F72]" /> Restaurant Menu Stock & Availability Switchboard
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Toggle dish availability and active stock status. Changes are reflected instantly in the Cashier POS Terminal and Kitchen Display System (KDS).
              </p>
            </div>
            
            <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl border border-gray-150">
              {['All', 'Starter', 'Main', 'Dessert', 'Beverage', 'Alcoholic'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMenuCatFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                    menuCatFilter === cat ? 'bg-white text-gray-800 border border-gray-150 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-gray-150">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search menu item or description..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
              />
              <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{db.menuItems.filter(item => item.isAvailable !== false).length} Active Available Items</span>
              <span className="text-slate-300">|</span>
              <span>{db.menuItems.filter(item => item.isAvailable === false).length} Out of Stock</span>
            </div>
          </div>

          {menuSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-xs font-bold animate-fadeIn">
              ✓ {menuSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
            {filteredMenuItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 font-semibold italic">
                No menu items found matching the selected filters.
              </div>
            ) : (
              filteredMenuItems.map(item => {
                const isAvail = item.isAvailable !== false;
                const linkedProduct = item.productId ? db.products.find(p => p.id === item.productId) : null;
                const currentStock = linkedProduct ? linkedProduct.currentStock : null;
                const isPhysicalLow = linkedProduct && linkedProduct.currentStock <= linkedProduct.minStockAlert;

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-2xl border transition duration-150 flex flex-col justify-between space-y-4 ${
                      isAvail 
                        ? 'border-gray-150 bg-white hover:border-blue-200 shadow-sm' 
                        : 'border-rose-150 bg-rose-50/10'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            item.category === 'Starter' ? 'bg-indigo-50 text-indigo-700 border-indigo-150' :
                            item.category === 'Main' ? 'bg-blue-50 text-blue-700 border-blue-150' :
                            item.category === 'Dessert' ? 'bg-pink-50 text-pink-700 border-pink-150' :
                            item.category === 'Beverage' ? 'bg-teal-50 text-teal-700 border-teal-150' :
                            'bg-amber-50 text-amber-700 border-amber-150'
                          }`}>
                            {item.category}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-gray-800 text-sm">{store.formatMoney(item.price)}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-800">{item.name}</h4>
                        {item.description && (
                          <p className="text-[10px] text-gray-400 font-medium line-clamp-2 mt-0.5" title={item.description}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Product Inventory Connection */}
                      <div className="bg-slate-50/60 p-2.5 rounded-xl border border-gray-100 text-[10px] space-y-1">
                        <span className="text-gray-400 block font-semibold uppercase tracking-wider">Inventory Connection</span>
                        {linkedProduct ? (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-bold truncate max-w-[120px]" title={linkedProduct.name}>
                              📦 {linkedProduct.name}
                            </span>
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9px] ${
                              currentStock !== null && currentStock <= 0
                                ? 'bg-red-55 text-red-700 border border-red-100'
                                : isPhysicalLow
                                ? 'bg-amber-55 text-amber-700 border border-amber-100'
                                : 'bg-green-55 text-green-700 border border-green-100'
                            }`}>
                              Stock: {currentStock} {linkedProduct.unit}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic block font-semibold">No linked physical raw-material item</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center space-x-1.5">
                        <span className={`h-2 w-2 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-[11px] font-bold text-gray-700">
                          {isAvail ? 'Available / In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleToggleMenuItemStock(item)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-wider transition duration-150 cursor-pointer ${
                          isAvail
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-150'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-150'
                        }`}
                      >
                        {isAvail ? 'Mark Out of Stock' : 'Mark Available'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: REGISTER/EDIT PRODUCT CARD */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#1B4F72] text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingProduct ? 'Edit Catalogued Inventory Item' : 'Catalog New Inventory Item'}
              </h3>
              <button 
                onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                }} 
                className="text-white hover:text-gray-200 font-bold text-sm bg-white/10 px-3 py-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Spa Candles"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                  >
                    <option value="Amenities">Amenities</option>
                    <option value="Linen">Linen</option>
                    <option value="Food">Food</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Cleaning">Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="pcs, boxes, kg, liters"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                    value={newProdMin}
                    onChange={(e) => setNewProdMin(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estimated Unit Price ({store.getCurrencySymbol()})</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Warehouse Bin / Shelf Location</label>
                <input
                  type="text"
                  placeholder="e.g. Chiller A, Aisle 3 Shelf 2"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={newProdLoc}
                  onChange={(e) => setNewProdLoc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preferred Supplier</label>
                <select
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={newProdSup}
                  onChange={(e) => setNewProdSup(e.target.value)}
                >
                  <option value="">-- Choose Supplier (Optional) --</option>
                  {(db.suppliers || []).map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  {editingProduct ? 'Save Product Details' : 'Register Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
