/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { store } from '../db/store';
import { RestaurantTable, MenuItem, RestaurantOrder, OrderItem, PaymentMethod, OrderStatus, DailyShiftReport, ShiftSaleDetail } from '../types';
import {
  UtensilsCrossed,
  ChefHat,
  MonitorPlay,
  ClipboardList,
  Coffee,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Printer,
  ShieldCheck,
  AlertCircle,
  DollarSign
} from 'lucide-react';

export default function RestaurantPOS() {
  const [activeTab, setActiveTab] = useState<'tables' | 'terminal' | 'kitchen' | 'menu'>('tables');
  const db = store.getDb();

  // Active POS cart building
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('Cash');

  // Menu Search
  const [menuFilterCategory, setMenuFilterCategory] = useState<string>('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');

  // Table Reservation states
  const [newTableName, setNewTableName] = useState('');
  const [newTableCap, setNewTableCap] = useState(4);

  // Menu Item creation states
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState<number>(15);
  const [newMenuCategory, setNewMenuCategory] = useState('Starter');
  const [newMenuDesc, setNewMenuDesc] = useState('');
  const [newMenuProductId, setNewMenuProductId] = useState('');

  // Shift & Cash Drawer States
  const [actualCashInput, setActualCashInput] = useState<string>('200');
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftSuccessMessage, setShiftSuccessMessage] = useState('');
  const [posError, setPosError] = useState('');

  // ============================================================================
  // TERMINAL CART BUILDER METHODS
  // ============================================================================
  const filteredMenuItems = useMemo(() => {
    return db.menuItems.filter(item => {
      const cMatch = menuFilterCategory === 'All' || item.category === menuFilterCategory;
      const sMatch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
      return cMatch && sMatch && item.isAvailable;
    });
  }, [db, menuFilterCategory, menuSearchQuery]);

  const addToCart = (item: MenuItem) => {
    setPosError('');
    if (item.productId) {
      const product = db.products.find(p => p.id === item.productId);
      if (product) {
        const existing = cart.find(it => it.menuItemId === item.id);
        const currentQty = existing ? existing.quantity : 0;
        if (product.currentStock <= currentQty) {
          setPosError(`Cannot add ${item.name}! Out of stock (only ${product.currentStock} units left in Inventory).`);
          return;
        }
      }
    }

    const existing = cart.find(it => it.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(it => it.menuItemId === item.id ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setCart([...cart, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setPosError('');
    setCart(cart.filter(it => it.menuItemId !== itemId));
  };

  const updateCartQty = (itemId: string, qty: number) => {
    setPosError('');
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }

    const item = db.menuItems.find(mi => mi.id === itemId);
    if (item && item.productId) {
      const product = db.products.find(p => p.id === item.productId);
      if (product && product.currentStock < qty) {
        setPosError(`Cannot request ${qty} units of ${item.name}! Only ${product.currentStock} in stock.`);
        return;
      }
    }

    setCart(cart.map(it => it.menuItemId === itemId ? { ...it, quantity: qty } : it));
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  }, [cart]);

  const cartTax = useMemo(() => {
    return Math.round(cartSubtotal * (db.settings.profile.taxRate / 100));
  }, [db, cartSubtotal]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal + cartTax - posDiscount);
  }, [cartSubtotal, cartTax, posDiscount]);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orderId = `ord_${Date.now()}`;
    const order: RestaurantOrder = {
      id: orderId,
      tableId: selectedTableId || undefined,
      waiterId: store.getActiveUser()?.id || 'system_waiter',
      items: cart,
      subtotal: cartSubtotal,
      tax: cartTax,
      discount: posDiscount,
      total: cartTotal,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    store.addRestaurantOrder(order);

    // Clear state
    setCart([]);
    setSelectedTableId('');
    setPosDiscount(0);
    setActiveTab('tables');
  };

  // ============================================================================
  // GENERAL HANDLERS
  // ============================================================================
  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName) return;

    const tbl: RestaurantTable = {
      id: `tbl_${Date.now()}`,
      tableNumber: newTableName,
      capacity: newTableCap,
      status: 'Available'
    };

    store.saveRestaurantTable(tbl);
    setNewTableName('');
    setNewTableCap(4);
  };

  const handleCreateMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName || newMenuPrice <= 0) return;

    const item: MenuItem = {
      id: `m_${Date.now()}`,
      name: newMenuName,
      price: newMenuPrice,
      category: newMenuCategory,
      isAvailable: true,
      description: newMenuDesc,
      productId: newMenuProductId || undefined
    };

    store.saveMenuItem(item);
    setNewMenuName('');
    setNewMenuDesc('');
    setNewMenuPrice(15);
    setNewMenuProductId('');
  };

  const handleUpdateOrderStatus = (id: string, status: OrderStatus) => {
    store.updateOrderStatus(id, status);
  };

  // Shift aggregation helper
  const shiftSales = useMemo(() => {
    const lastReport = db.shiftReports?.[0];
    return db.sales.filter(s => {
      if (!lastReport) return true;
      return new Date(s.createdAt) > new Date(lastReport.endTime);
    });
  }, [db.sales, db.shiftReports]);

  const shiftTotals = useMemo(() => {
    let count = 0;
    let val = 0;
    let cashVal = 0;
    const itemMap: Record<string, { menuItemId: string; name: string; qty: number; expectedDecrement: number }> = {};

    shiftSales.forEach(s => {
      count++;
      val += s.total;
      if (s.paymentMethod === 'Cash') {
        cashVal += s.total;
      }
      s.items.forEach(it => {
        const menuItem = db.menuItems.find(mi => mi.name === it.name);
        const menuItemId = menuItem?.id || `m_${Date.now()}`;
        if (!itemMap[menuItemId]) {
          itemMap[menuItemId] = {
            menuItemId,
            name: it.name,
            qty: 0,
            expectedDecrement: 0
          };
        }
        itemMap[menuItemId].qty += it.quantity;
        if (menuItem?.productId) {
          itemMap[menuItemId].expectedDecrement += it.quantity;
        }
      });
    });

    return {
      count,
      val,
      expectedCash: 200 + cashVal, // starting cash float is $200
      itemsSold: Object.values(itemMap)
    };
  }, [shiftSales, db.menuItems]);

  const handleSubmitShiftReport = (e: React.FormEvent) => {
    e.preventDefault();
    const actualCash = parseFloat(actualCashInput || '0');
    const activeUser = store.getActiveUser();

    const itemsSoldDetail: ShiftSaleDetail[] = shiftTotals.itemsSold.map(it => ({
      menuItemId: it.menuItemId,
      name: it.name,
      quantitySold: it.qty,
      expectedStockDecrement: it.expectedDecrement
    }));

    const report: DailyShiftReport = {
      id: `rep_${Date.now()}`,
      cashierId: activeUser?.id || 'cashier',
      cashierName: activeUser?.name || 'Marcus Brody',
      startTime: db.shiftReports?.[0]?.endTime || new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      totalSalesCount: shiftTotals.count,
      totalSalesValue: shiftTotals.val,
      expectedCash: shiftTotals.expectedCash,
      actualCash,
      itemsSold: itemsSoldDetail,
      status: 'Pending Stock Verification',
      isDiscrepancyFound: Math.abs(actualCash - shiftTotals.expectedCash) > 0.01,
      notes: shiftNotes
    };

    store.addShiftReport(report);
    setShiftSuccessMessage('Daily shift report submitted successfully! Forwarded to Stock department for stock levels verification.');
    setShiftNotes('');
    setActualCashInput('200');
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      setShiftSuccessMessage('');
    }, 6000);
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-[#1B4F72] rounded-xl">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Cascade Food & Dining OS</h1>
            <p className="text-xs text-gray-400">Order placement terminals, interactive table seating plans, and back-of-house Kitchen Queue lists.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Dining Tables Plan
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            POS Terminal Touch
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'kitchen'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Kitchen KDS Board
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Cascade Menu List
          </button>
          <button
            onClick={() => {
              setActiveTab('shift');
              setShiftSuccessMessage('');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition duration-150 border cursor-pointer ${
              activeTab === 'shift'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            Shift & Cash Drawer
          </button>
        </div>
      </div>

      {/* TAB 1: DINING TABLES SEATING PLAN */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Table Seating board */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Live Dining Seating Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {db.restaurantTables.map(tbl => {
                // Find active open order for this table
                const activeOrder = db.restaurantOrders.find(o => o.tableId === tbl.id && o.status !== 'Paid' && o.status !== 'Cancelled');

                return (
                  <div
                    key={tbl.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between h-36 transition hover:shadow-md ${
                      tbl.status === 'Available' ? 'bg-green-50/40 border-green-200 text-green-800' :
                      tbl.status === 'Occupied' ? 'bg-blue-50/40 border-blue-200 text-[#1B4F72]' :
                      'bg-purple-50/40 border-purple-200 text-purple-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <strong className="text-sm font-bold block">{tbl.tableNumber}</strong>
                        <span className="text-[9px] font-mono tracking-wide bg-white border px-1 rounded uppercase">
                          {tbl.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">Seating Capacity: {tbl.capacity} Pax</span>
                    </div>

                    <div className="space-y-2 mt-4 text-[11px]">
                      {activeOrder ? (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-600">Bill Tab: ${activeOrder.total}</span>
                          <span className="inline-block px-1.5 py-0.5 bg-blue-100 rounded text-[9px] font-bold text-blue-700">
                            {activeOrder.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal">No active food tabs</span>
                      )}

                      <div className="flex space-x-1.5 pt-1.5 border-t border-gray-200/50">
                        {activeOrder ? (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(activeOrder.id, 'Paid')}
                              className="w-full text-center py-1 bg-[#1B4F72] text-white font-bold rounded text-[9px] hover:bg-[#153E5B] cursor-pointer"
                            >
                              Settle Check
                            </button>
                            <button
                              onClick={() => {
                                setCart(activeOrder.items);
                                setSelectedTableId(tbl.id);
                                setPosDiscount(activeOrder.discount);
                                setActiveTab('terminal');
                              }}
                              className="w-full text-center py-1 bg-gray-100 text-gray-700 font-bold border border-gray-300 rounded text-[9px] hover:bg-gray-200 cursor-pointer"
                            >
                              Add Items
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTableId(tbl.id);
                              setCart([]);
                              setActiveTab('terminal');
                            }}
                            className="w-full text-center py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-[9px] cursor-pointer"
                          >
                            New Food Tab
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table Configuration Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Deploy Seating Table
            </h3>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Table Label / Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 10 (Sea View Balcony)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Seating Capacity (Persons)</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={newTableCap}
                  onChange={(e) => setNewTableCap(Number(e.target.value))}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Deploy Seating Table
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: TOUCH SCREEN ORDER TERMINAL */}
      {activeTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Menu Catalog Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-xl border border-gray-150">
                {['All', 'Starter', 'Main', 'Dessert', 'Beverage', 'Alcoholic'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setMenuFilterCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                      menuFilterCategory === cat ? 'bg-white text-gray-800 border border-gray-150' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Lookup menu item..."
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs w-48"
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
              />
            </div>

            {/* Menu Grid */}
            {posError && (
              <div className="p-3.5 bg-red-50 border border-red-250 text-red-700 rounded-2xl flex items-center space-x-2 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{posError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredMenuItems.map(item => {
                const product = item.productId ? db.products.find(p => p.id === item.productId) : null;
                const stock = product ? product.currentStock : null;
                const isOutOfStock = stock !== null && stock <= 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isOutOfStock) {
                        setPosError(`"${item.name}" is OUT OF STOCK. Cannot sell this menu item.`);
                        return;
                      }
                      addToCart(item);
                    }}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between h-28 transition group ${
                      isOutOfStock 
                        ? 'bg-red-50/40 border-red-200 opacity-60 cursor-not-allowed'
                        : 'bg-gray-50/50 hover:bg-[#1B4F72]/5 hover:border-[#1B4F72]/30 border-gray-150 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <strong className="text-xs text-gray-800 font-bold block group-hover:text-[#1B4F72] truncate">{item.name}</strong>
                        {stock !== null && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {isOutOfStock ? 'OOS' : `${stock} left`}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium block mt-0.5 uppercase">{item.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold text-gray-800">${item.price}</strong>
                      {stock !== null && (
                        <span className="text-[9px] text-gray-400 font-mono italic">Linked to stock</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Bill Summary Tab */}
          <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-gray-150 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-4">
                <h3 className="text-sm font-bold text-gray-800">Cart Bill Checkout</h3>
                <span className="text-xs font-bold text-[#E67E22]">Table ID: {selectedTableId ? db.restaurantTables.find(t => t.id === selectedTableId)?.tableNumber : 'Walk-In'}</span>
              </div>

              {/* Cart List */}
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  Cart is empty. Select catalog items to build dinner tab.
                </div>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {cart.map(it => (
                    <div key={it.menuItemId} className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-150 text-xs">
                      <div className="max-w-[120px] truncate">
                        <span className="font-semibold text-gray-800 block truncate">{it.name}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">${it.price} each</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQty(it.menuItemId, it.quantity - 1)}
                          className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-semibold w-4 text-center">{it.quantity}</span>
                        <button
                          onClick={() => updateCartQty(it.menuItemId, it.quantity + 1)}
                          className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600 font-bold cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(it.menuItemId)}
                          className="text-red-400 hover:text-red-600 pl-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations and Actions */}
            <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Food Tab Subtotal:</span>
                  <span>${cartSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes ({db.settings.profile.taxRate}%):</span>
                  <span>${cartTax}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Table discount / custom deduction ($)</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                    value={posDiscount}
                    onChange={(e) => setPosDiscount(Number(e.target.value))}
                  />
                </div>
                <div className="border-t border-gray-200 my-2 pt-2 flex justify-between text-sm font-bold text-gray-800">
                  <span>Total Bill Amount:</span>
                  <span>${cartTotal}</span>
                </div>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-2">
                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className="w-full py-2.5 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-xl font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  Confirm Table Bill Tab
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: KITCHEN DISPLAY QUEUE (KDS) */}
      {activeTab === 'kitchen' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Live Kitchen Queue (KDS Monitor)</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {db.restaurantOrders
              .filter(o => o.status !== 'Paid' && o.status !== 'Cancelled')
              .map(order => {
                const table = db.restaurantTables.find(t => t.id === order.tableId);

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col justify-between">
                    {/* Card Header */}
                    <div className="bg-[#1B4F72] text-white p-3.5 flex items-center justify-between">
                      <div>
                        <strong className="text-xs block font-bold">Order ID: {order.id}</strong>
                        <span className="text-[10px] text-blue-100 font-semibold">{table?.tableNumber || 'Walk-In Customer'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        order.status === 'Pending' ? 'bg-red-500 text-white' :
                        order.status === 'In Kitchen' ? 'bg-[#E67E22] text-white' :
                        'bg-green-500 text-white'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Food list items */}
                    <div className="p-4 flex-grow space-y-2 text-xs">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between font-semibold text-gray-700">
                          <span>{it.quantity} x {it.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer operations */}
                    <div className="bg-gray-50 p-3 border-t border-gray-150 flex space-x-1.5">
                      {order.status === 'Pending' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'In Kitchen')}
                          className="w-full text-center py-1.5 bg-[#E67E22] hover:bg-[#D35400] text-white font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Send to Kitchen
                        </button>
                      )}
                      {order.status === 'In Kitchen' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'Ready')}
                          className="w-full text-center py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Mark Ready
                        </button>
                      )}
                      {order.status === 'Ready' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'Served')}
                          className="w-full text-center py-1.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Mark Served
                        </button>
                      )}
                      {order.status === 'Served' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'Paid')}
                          className="w-full text-center py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                        >
                          Bill Check Paid
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 4: DINING MENU EDITOR */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Menu Item Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-[#E67E22]" /> Deploy Menu Item
            </h3>
            <form onSubmit={handleCreateMenuItem} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garlic Butter Lobster"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Menu Category</label>
                <select
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800"
                  value={newMenuCategory}
                  onChange={(e) => setNewMenuCategory(e.target.value)}
                >
                  <option value="Starter">Starter</option>
                  <option value="Main">Main</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Beverage">Beverage</option>
                  <option value="Alcoholic">Alcoholic</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Price ($)</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  value={newMenuPrice}
                  onChange={(e) => setNewMenuPrice(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Menu Description</label>
                <textarea
                  rows={2}
                  placeholder="Note ingredients, flavor profiling, allergen notes..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  value={newMenuDesc}
                  onChange={(e) => setNewMenuDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Link to Inventory Product</label>
                <select
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800"
                  value={newMenuProductId}
                  onChange={(e) => setNewMenuProductId(e.target.value)}
                >
                  <option value="">-- Direct Sale (No linked product) --</option>
                  {db.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.currentStock} {p.unit} in stock)</option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-400 mt-0.5">When sold, the matched inventory item stock levels are automatically decremented.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Deploy Menu Item
              </button>
            </form>
          </div>

          {/* Current Menu Table */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Configured Menu List ({db.menuItems.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    <th className="py-2.5 px-3">Item Detail</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Inventory Link</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {db.menuItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-3">
                        <strong className="text-gray-800 text-xs block">{item.name}</strong>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{item.description || 'No description listed'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-600">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {item.productId ? (
                          <span className="text-[10px] font-mono font-medium text-[#1B4F72] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            Linked: {db.products.find(p => p.id === item.productId)?.name || item.productId}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No Stock Link</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-800 text-sm">${item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SHIFT CLOSURE & RECONCILIATION */}
      {activeTab === 'shift' && (
        <div className="space-y-6">
          {shiftSuccessMessage && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center space-x-2 text-sm font-semibold shadow-sm">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <span>{shiftSuccessMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Shift Summary Calculator */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-md font-bold text-gray-800">Active Register Shift Status</h2>
                    <p className="text-xs text-gray-400">Review total sales and expected cash before closing the register.</p>
                  </div>
                  <span className="bg-blue-50 text-[#1B4F72] font-bold text-xs px-3 py-1 rounded-full border border-blue-100">
                    Active Session
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Shift Ticket Sales</span>
                    <strong className="text-2xl font-mono block text-gray-800 mt-1">{shiftTotals.count} Orders</strong>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Shift Revenue</span>
                    <strong className="text-2xl font-mono block text-gray-800 mt-1">${shiftTotals.val.toFixed(2)}</strong>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Expected Cash Drawer</span>
                    <strong className="text-2xl font-mono block text-green-700 mt-1">${shiftTotals.expectedCash.toFixed(2)}</strong>
                    <span className="text-[9px] text-gray-400 font-medium block mt-0.5">(Includes $200 Starting Float)</span>
                  </div>
                </div>

                {/* Items sold detailed list */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Breakdown of Sales Since Last Closure</h3>
                  {shiftTotals.itemsSold.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      No sales recorded in the active shift session.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50">
                            <th className="py-2 px-3">Menu Item Sold</th>
                            <th className="py-2 px-3 text-center">Quantity Sold</th>
                            <th className="py-2 px-3">Linked Inventory Stock Decrement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {shiftTotals.itemsSold.map(it => (
                            <tr key={it.menuItemId} className="hover:bg-gray-50/30">
                              <td className="py-2.5 px-3 font-semibold text-gray-800">{it.name}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-700">{it.qty}</td>
                              <td className="py-2.5 px-3 font-medium text-gray-500">
                                {it.expectedDecrement > 0 ? (
                                  <span className="text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                    -{it.expectedDecrement} units in Stock
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-[11px]">No inventory link</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Close Shift form panel */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm h-fit space-y-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center border-b border-gray-100 pb-2">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" /> Settle & Close Shift
              </h3>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
                <strong>Attention Cashier:</strong> Settle all dining room bills and count your drawer cash accurately. Discrepancies are flagged and forwarded to managers.
              </div>

              <form onSubmit={handleSubmitShiftReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Cashier Name</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 focus:outline-none"
                    value={store.getActiveUser()?.name || 'Marcus Brody'}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Actual Drawer Cash Counted ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-800 focus:outline-none"
                    placeholder="Enter total cash counted"
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-1 text-[10px]">
                    <span className="text-gray-400">Expected Cash: ${shiftTotals.expectedCash.toFixed(2)}</span>
                    {parseFloat(actualCashInput || '0') !== shiftTotals.expectedCash && (
                      <span className={`font-bold ${
                        parseFloat(actualCashInput || '0') > shiftTotals.expectedCash ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        Discrepancy: ${(parseFloat(actualCashInput || '0') - shiftTotals.expectedCash).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Handover Notes / Discrepancy Reason</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Returned $5 change to customer. Drawer is balanced, ready for handover to Chloe."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={shiftTotals.count === 0}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Submit Handover Shift Report
                </button>
              </form>
            </div>

          </div>

          {/* Past Shift Reports feed */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Handover Shift Reports Registry ({db.shiftReports.length})</h3>
            {db.shiftReports.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                No shift reports submitted yet. Use the drawer closure above to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-2.5 px-3">Report ID / Cashier</th>
                      <th className="py-2.5 px-3">Shift Window</th>
                      <th className="py-2.5 px-3 text-right">Expected Cash</th>
                      <th className="py-2.5 px-3 text-right">Actual Counted</th>
                      <th className="py-2.5 px-3 text-center">Status / Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {db.shiftReports.map(rep => (
                      <tr key={rep.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3">
                          <strong className="text-gray-800 text-xs block">ID: {rep.id}</strong>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">By: {rep.cashierName}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-gray-500">
                          {new Date(rep.startTime).toLocaleTimeString()} - {new Date(rep.endTime).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-800 font-semibold">${rep.expectedCash.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-gray-800 font-semibold">${rep.actualCash.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-[9px] font-bold tracking-wider uppercase border ${
                            rep.status === 'Pending Stock Verification' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            rep.status === 'Pending Manager Approval' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            rep.status === 'Pending CEO Approval' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {rep.status}
                          </span>
                          {rep.isDiscrepancyFound && (
                            <span className="block text-[8px] font-bold text-red-500 mt-0.5">⚠️ Cash Discrepancy Found</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
