import React, { useState, useMemo, useEffect } from 'react';
import { store } from '../db/store';
import { InventoryProduct, RestaurantOrder, OrderItem, Room } from '../types';
import { ShoppingCart, Search, Plus, Minus, Trash2, ShieldAlert } from 'lucide-react';

interface ServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoomNumber?: string;
  targetReservationId?: string;
}

export default function ServiceOrderModal({
  isOpen,
  onClose,
  targetRoomNumber = '',
  targetReservationId = ''
}: ServiceOrderModalProps) {
  const db = store.getDb();
  
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(targetRoomNumber);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Cart state: map of productId -> quantity
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Synchronize internal state with props when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setSelectedRoomNumber(targetRoomNumber);
      setCart({});
      setSpecialInstructions('');
      setSearchQuery('');
      setSelectedCategory('All');
    }
  }, [isOpen, targetRoomNumber]);

  // Get active rooms (either pre-filled or from db)
  const activeRooms = useMemo(() => {
    return db.rooms.filter(r => r.status === 'Occupied' || r.status === 'Available');
  }, [db.rooms]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(db.products.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [db.products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return db.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [db.products, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleAddToCart = (product: InventoryProduct) => {
    if (product.currentStock <= 0) {
      alert(`Product "${product.name}" is out of stock!`);
      return;
    }
    setCart(prev => {
      const currentQty = prev[product.id] || 0;
      if (currentQty >= product.currentStock) {
        alert(`Cannot add more. Only ${product.currentStock} ${product.unit} available in inventory.`);
        return prev;
      }
      return { ...prev, [product.id]: currentQty + 1 };
    });
  };

  const handleUpdateQty = (productId: string, diff: number, maxStock: number) => {
    setCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = currentQty + diff;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      if (newQty > maxStock) {
        alert(`Cannot add more. Only ${maxStock} available in inventory.`);
        return prev;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Calculations
  const cartItems = Object.entries(cart).map(([productId, val]) => {
    const product = db.products.find(p => p.id === productId)!;
    return { product, qty: Number(val) };
  });

  const subtotal = cartItems.reduce((acc, { product, qty }) => acc + (product.unitPrice * qty), 0);
  const taxRate = Number(db.settings?.profile?.taxRate ?? 15);
  const tax = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + tax;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomNumber) {
      alert('Please specify a Room Number for this service order.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Your order cart is empty.');
      return;
    }

    // Verify stock availability once more
    for (const { product, qty } of cartItems) {
      if (product.currentStock < qty) {
        alert(`Insufficient stock for "${product.name}". Required: ${qty}, Available: ${product.currentStock}`);
        return;
      }
    }

    // Find reservation to charge to, if any
    let activeRes = db.reservations.find(r => r.id === targetReservationId);
    if (!activeRes) {
      // Find by room
      const room = db.rooms.find(r => r.roomNumber === selectedRoomNumber);
      if (room && room.currentReservationId) {
        activeRes = db.reservations.find(r => r.id === room.currentReservationId);
      }
    }

    const orderItems: OrderItem[] = cartItems.map(({ product, qty }) => ({
      menuItemId: product.id,
      name: product.name,
      quantity: qty,
      price: product.unitPrice
    }));

    // Generate POS order
    const newOrder: RestaurantOrder = {
      id: `ord_${Date.now()}`,
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      kotNumber: `KOT-${Math.floor(100 + Math.random() * 900)}`,
      orderType: 'Room Service',
      roomNumber: selectedRoomNumber,
      customerName: activeRes ? `${db.guests.find(g => g.id === activeRes?.guestId)?.firstName || ''} ${db.guests.find(g => g.id === activeRes?.guestId)?.lastName || ''}`.trim() : 'Walk-In Guest',
      guestCount: 1,
      specialInstructions: specialInstructions || 'Created from Front Desk/Room Console',
      waiterId: store.getActiveUser()?.id || 'usr_reception',
      items: orderItems,
      subtotal,
      tax,
      discount: 0,
      total,
      status: 'New',
      paymentMethod: 'Cash',
      createdAt: new Date().toISOString()
    };

    // Save order
    store.addRestaurantOrder(newOrder);

    // Deduct stock and log movements
    cartItems.forEach(({ product, qty }) => {
      store.addInventoryMovement(
        product.id,
        qty,
        'Out',
        `Client Service Order ${newOrder.orderNumber} for Room ${selectedRoomNumber}`
      );
    });

    // If an active reservation is linked, charge it automatically to their check-out ledger!
    if (activeRes) {
      activeRes.totalAmount += total;
      store.addAuditLog(
        'Charge Service to Room',
        'Front Office',
        `Charged service order ${newOrder.orderNumber} ($${total}) to Room ${selectedRoomNumber} reservation folio.`
      );
      store.addNotification(
        'Room Charge Added',
        `Service order charges ($${total}) linked directly to Room ${selectedRoomNumber} folio balance.`,
        'checkout'
      );
    }

    alert(`Service Order ${newOrder.orderNumber} placed successfully! Stock levels updated and charges logged.`);
    onClose();
    setCart({});
    setSpecialInstructions('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="bg-[#1B4F72] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-white/10 rounded-xl text-amber-400">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Client Service & Room Order Builder</h3>
              <p className="text-[10px] text-blue-100 font-medium">Select real inventory products to create an active delivery / room service order.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 font-bold text-sm cursor-pointer">✕</button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-150 dark:divide-gray-800">
          
          {/* Left Side: Product Picker */}
          <div className="w-full md:w-3/5 p-6 overflow-y-auto space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[450px] overflow-y-auto pr-1">
              {filteredProducts.map(p => {
                const inCartQty = cart[p.id] || 0;
                const isOutOfStock = p.currentStock <= 0;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border transition flex flex-col justify-between ${
                      isOutOfStock ? 'border-red-100 bg-red-50/10' : 'border-gray-150 hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <strong className="text-gray-800 dark:text-gray-200 text-xs font-bold block leading-tight">{p.name}</strong>
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-[#1B4F72] px-2 py-0.5 rounded-md font-bold shrink-0">
                          {p.category}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2.5 text-[10px] text-gray-500 font-medium">
                        <span>Price: <strong className="text-gray-700 dark:text-gray-300 font-mono">{store.formatMoney(p.unitPrice)}</strong></span>
                        <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${isOutOfStock ? 'text-red-500 bg-red-50' : 'text-gray-600'}`}>
                          Stock: {p.currentStock} {p.unit}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      {inCartQty > 0 ? (
                        <div className="flex items-center space-x-1.5 bg-white dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(p.id, -1, p.currentStock)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 font-mono text-xs font-black">{inCartQty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(p.id, 1, p.currentStock)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(p)}
                          className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition ${
                            isOutOfStock
                              ? 'bg-red-50 text-red-400 cursor-not-allowed border border-red-100'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 cursor-pointer shadow-xs'
                          }`}
                        >
                          Add to Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Order Summary & Placement Form */}
          <form onSubmit={handleSubmitOrder} className="w-full md:w-2/5 p-6 bg-slate-50 dark:bg-gray-900/10 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2">Order Parameters</h4>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room Association</label>
                <select
                  required
                  value={selectedRoomNumber}
                  onChange={(e) => setSelectedRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                >
                  <option value="">-- Select Target Room --</option>
                  {db.rooms.map(r => (
                    <option key={r.id} value={r.roomNumber}>
                      Room {r.roomNumber} ({r.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Special Instructions / Requests</label>
                <textarea
                  placeholder="e.g. Ice bucket needed, deliver with clean towels, late room-drop requested..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl text-xs h-16 resize-none"
                />
              </div>

              {/* Cart List */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items Ledger ({cartItems.length})</label>
                {cartItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-950">
                    No items selected yet. Choose products from the catalog.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {cartItems.map(({ product, qty }) => (
                      <div key={product.id} className="flex justify-between items-center p-2.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-150 dark:border-gray-800 text-xs">
                        <div>
                          <strong className="text-gray-800 dark:text-gray-200 font-bold block">{product.name}</strong>
                          <span className="text-[10px] text-gray-400 font-mono">{qty} {product.unit} @ {store.formatMoney(product.unitPrice)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <strong className="text-gray-700 dark:text-gray-300 font-mono">{store.formatMoney(product.unitPrice * qty)}</strong>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(product.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Calculations & Submit */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3.5 bg-white dark:bg-gray-950 p-4 rounded-2xl shadow-xs">
              <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">{store.formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%):</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">{store.formatMoney(tax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold text-sm text-[#1B4F72] dark:text-blue-400">
                  <span>Total Amount Billed:</span>
                  <span className="font-mono">{store.formatMoney(total)}</span>
                </div>
              </div>

              {selectedRoomNumber && db.rooms.find(r => r.roomNumber === selectedRoomNumber)?.status === 'Occupied' && (
                <div className="flex items-center space-x-1.5 bg-green-50 dark:bg-green-950/20 p-2.5 rounded-lg border border-green-100 dark:border-green-900/50 text-[10px] text-green-700 dark:text-green-400">
                  <span className="shrink-0">💡</span>
                  <span>Charges will be automatically linked to the guest's folio ledger at checkout.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 bg-gray-150 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cartItems.length === 0}
                  className={`py-2.5 rounded-xl font-bold text-xs transition text-center shadow-md ${
                    cartItems.length > 0
                      ? 'bg-[#1B4F72] hover:bg-[#153E5B] text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  Confirm & Place Order
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
