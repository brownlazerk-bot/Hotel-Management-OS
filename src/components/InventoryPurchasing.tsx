/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { InventoryProduct, Supplier, PurchaseRequest, PurchaseOrder, StockMovementType } from '../types';
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
  FileText
} from 'lucide-react';

export default function InventoryPurchasing() {
  const [activeTab, setActiveTab] = useState<'registry' | 'purchases' | 'suppliers'>('registry');
  const db = store.getDb();

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

  // Product Creation States
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

  // ============================================================================
  // OPERATIONS HANDLERS
  // ============================================================================
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdUnit) return;

    const prod: InventoryProduct = {
      id: `prod_${Date.now()}`,
      name: newProdName,
      category: newProdCat,
      unit: newProdUnit,
      currentStock: 0,
      minStockAlert: newProdMin,
      unitPrice: newProdPrice,
      warehouseLocation: newProdLoc,
      supplierId: newProdSup || undefined
    };

    store.saveInventoryProduct(prod);
    setIsProductModalOpen(false);
    setNewProdName('');
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
                  onClick={() => setIsProductModalOpen(true)}
                  className="px-3 py-1.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl text-xs font-semibold flex items-center cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-1" /> Create Item
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Current Stock</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(p => {
                    const isLow = p.currentStock <= p.minStockAlert;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 font-medium text-gray-700">
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
                        <td className="py-3 px-3 text-right">
                          {isLow ? (
                            <span className="bg-red-50 text-red-700 font-bold border border-red-100 px-2 py-0.5 rounded flex items-center justify-center space-x-1 max-w-[100px] ml-auto">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>LOW</span>
                            </span>
                          ) : (
                            <span className="bg-green-50 text-green-700 font-bold border border-green-100 px-2 py-0.5 rounded inline-block text-center min-w-[70px]">
                              Secure
                            </span>
                          )}
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
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit Cost ($)</label>
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
                  <span>${poQty * poPrice}</span>
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
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {db.purchaseOrders.map(po => {
                const supplier = db.suppliers.find(s => s.id === po.supplierId);
                return (
                  <div key={po.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-150 flex items-start justify-between">
                    <div className="space-y-1.5 text-xs text-gray-600">
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

                    <div className="text-right space-y-3 shrink-0">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">Total amount</span>
                        <strong className="text-base font-bold text-gray-800">${po.totalAmount}</strong>
                      </div>
                      {po.status === 'Ordered' && (
                        <button
                          onClick={() => handleReceiveGoods(po.id)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                        >
                          Receive Cargo
                        </button>
                      )}
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

      {/* MODAL: REGISTER NEW PRODUCT CARD */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#1B4F72] text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">Catalog New Inventory Item</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-white hover:text-gray-200 font-bold text-sm bg-white/10 px-3 py-1 rounded-lg cursor-pointer">✕</button>
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
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estimated Unit Price ($)</label>
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

              <div className="flex items-center justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Register Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
