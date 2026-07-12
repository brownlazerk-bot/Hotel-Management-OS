/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  DollarSign,
  TrendingUp,
  User,
  Users,
  Settings,
  Volume2,
  Wifi,
  WifiOff,
  RotateCcw,
  Sliders,
  FileText,
  BadgeAlert
} from 'lucide-react';

// Recipe Ingredient Constants based on user request
const INGREDIENTS_RECIPES: Record<string, Array<{ productId: string; name: string; quantity: number }>> = {
  'chicken brochette': [
    { productId: 'prod_chicken', name: 'Chicken Portion (packs)', quantity: 1.0 },
    { productId: 'prod_onion', name: 'Fresh Onions (pcs)', quantity: 0.5 },
    { productId: 'prod_tomato', name: 'Fresh Tomatoes (pcs)', quantity: 0.5 },
    { productId: 'prod_oil', name: 'Cooking Oil (liters)', quantity: 0.02 } // 20ml
  ],
  'oysters horizon (half dozen)': [
    { productId: 'prod_3', name: 'Fresh Oysters (Batch)', quantity: 0.1 } // 10% of 50pcs batch
  ],
  'wagyu carpaccio': [
    { productId: 'prod_4', name: 'A5 Wagyu Beef Cuts (kg)', quantity: 0.15 } // 150g
  ],
  'pan-seared chilean sea bass': [
    { productId: 'prod_5', name: 'Fresh Chilean Sea Bass (kg)', quantity: 0.25 } // 250g
  ],
  'prime dry-aged filet mignon': [
    { productId: 'prod_6', name: 'Prime Dry-Aged Beef Cuts (kg)', quantity: 0.3 } // 300g
  ],
  'valrhona chocolate dome soufflé': [
    { productId: 'prod_7', name: 'Premium Valrhona Chocolate (kg)', quantity: 0.1 } // 100g
  ]
};

export default function RestaurantPOS() {
  const db = store.getDb();
  
  // Tabs & Simulation Roles
  const [activeTab, setActiveTab] = useState<'tables' | 'terminal' | 'kitchen' | 'reports' | 'shift' | 'menu'>('tables');
  const [simulatedRole, setSimulatedRole] = useState<'Cashier' | 'Kitchen' | 'Restaurant Manager' | 'Admin'>('Admin');
  
  // Menu Item Creator/Editor States
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuItemName, setMenuItemName] = useState('');
  const [menuItemCategory, setMenuItemCategory] = useState('Main');
  const [menuItemPrice, setMenuItemPrice] = useState<string>('');
  const [menuItemDescription, setMenuItemDescription] = useState('');
  const [menuItemAvailable, setMenuItemAvailable] = useState(true);
  const [menuItemProductId, setMenuItemProductId] = useState('');
  const [menuSuccessMessage, setMenuSuccessMessage] = useState('');
  const [menuErrorMessage, setMenuErrorMessage] = useState('');
  
  // Offline & Sync States
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<RestaurantOrder[]>([]);

  // Sound Notification settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Real-time alerts/notifications banner state for Cashier
  const [cashierAlerts, setCashierAlerts] = useState<Array<{ id: string; message: string; timestamp: string }>>([]);

  // Printer Spooler & Hardware Emulation config
  const [printerJobs, setPrinterJobs] = useState<Array<{
    id: string;
    type: 'KOT' | 'Customer Receipt';
    title: string;
    content: string;
    timestamp: string;
    printerType: string;
    status: 'Printed' | 'Spooling';
    isReprint: boolean;
  }>>([]);
  const [showPrinterSpooler, setShowPrinterSpooler] = useState(true);
  const [printToast, setPrintToast] = useState<string | null>(null);
  const [printerConfig, setPrinterConfig] = useState<'USB' | 'Network' | 'WiFi' | 'Bluetooth' | 'QZ Tray' | 'PrintNode' | 'Epson ePOS'>('Network');
  const [printCountMap, setPrintCountMap] = useState<Record<string, number>>({});

  // Cashier POS Form States
  const [orderType, setOrderType] = useState<'Dine In' | 'Take Away' | 'Room Service'>('Dine In');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  
  // Cart Builder state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('Cash');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  // Menu Category Filter & Search
  const [menuFilterCategory, setMenuFilterCategory] = useState<string>('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  
  // Create table state
  const [newTableName, setNewTableName] = useState('');
  const [newTableCap, setNewTableCap] = useState(4);

  // Cash register Shift states
  const [actualCashInput, setActualCashInput] = useState<string>('200');
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftSuccessMessage, setShiftSuccessMessage] = useState('');
  const [posError, setPosError] = useState('');

  // Audio Alerts Synthesizer using Web Audio API
  const playAlertSound = (type: 'new_order' | 'ready') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'new_order') {
        // High double-ding sound
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc1.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.45);
      } else {
        // Tri-tone melodious chime
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.65);
      }
    } catch (err) {
      console.warn('Simulated chime failed to play due to audio block constraints', err);
    }
  };

  // Helper: Checks if item is a beverage/drink
  const isDrinkItem = (menuItemId: string): boolean => {
    const menuItem = db.menuItems.find(m => m.id === menuItemId);
    if (!menuItem) {
      if (menuItemId.startsWith('stock_')) {
        const actualId = menuItemId.replace('stock_', '');
        const prod = db.products.find(p => p.id === actualId);
        if (prod) {
          const cat = prod.category.toLowerCase();
          return cat.includes('beverage') || cat.includes('alcoholic') || cat.includes('drink');
        }
      }
      return false;
    }
    const cat = menuItem.category.toLowerCase();
    return cat.includes('beverage') || cat.includes('alcoholic') || cat.includes('drink');
  };

  // Check permissions based on simulated role
  const checkPermission = (action: 'Create' | 'Edit' | 'PrintReceipt' | 'KitchenAction' | 'ManageReports' | 'CancelOrder'): boolean => {
    if (simulatedRole === 'Admin') return true;
    if (simulatedRole === 'Restaurant Manager') {
      return ['PrintReceipt', 'KitchenAction', 'ManageReports', 'CancelOrder'].includes(action);
    }
    if (simulatedRole === 'Kitchen') {
      return ['KitchenAction'].includes(action);
    }
    if (simulatedRole === 'Cashier') {
      return ['Create', 'Edit', 'PrintReceipt'].includes(action);
    }
    return false;
  };

  // Generate Unique Order Numbers
  const generateUniqueOrderNumber = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const prefix = `ORD-${dateStr}-`;
    // Filter active orders from store matching prefix to avoid duplicate sequences
    const matchedCount = db.restaurantOrders.filter(o => o.orderNumber?.startsWith(prefix)).length;
    const offlineCount = offlineQueue.filter(o => o.orderNumber?.startsWith(prefix)).length;
    const nextSerial = String(matchedCount + offlineCount + 1).padStart(4, '0');
    
    return `${prefix}${nextSerial}`;
  };

  // Generate Unique KOT Numbers
  const generateUniqueKotNumber = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const prefix = `KOT-${dateStr}-`;
    const matchedCount = db.restaurantOrders.filter(o => o.kotNumber?.startsWith(prefix)).length;
    const offlineCount = offlineQueue.filter(o => o.kotNumber?.startsWith(prefix)).length;
    const nextSerial = String(matchedCount + offlineCount + 1).padStart(4, '0');
    
    return `${prefix}${nextSerial}`;
  };

  // Build high-fidelity Kitchen Order Ticket (KOT) text - PRICES ABSOLUTELY HIDDEN
  const generateKOTContent = (order: RestaurantOrder, isReprint: boolean = false): string => {
    const tableLabel = order.tableId ? (db.restaurantTables.find(t => t.id === order.tableId)?.tableNumber || 'Table Option') : 'N/A';
    const activeUserName = store.getActiveUser()?.name || 'Marcus Brody (Cashier)';
    const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
    const timeStr = new Date(order.createdAt).toLocaleTimeString();

    // Filter items to food items ONLY (previous requested Separated Beverage Workflow)
    const foodItems = order.items.filter(it => !isDrinkItem(it.menuItemId));

    let txt = `========================================\n`;
    txt += `     CASCADE RESTAURANT KITCHEN TICKET   \n`;
    if (isReprint) {
      txt += `      *** REPRINT / DUPLICATE COPY ***   \n`;
    }
    txt += `========================================\n`;
    txt += `HOTEL NAME:  ${db.settings.profile.name}\n`;
    txt += `KOT NO:      ${order.kotNumber || 'KOT-NEW'}\n`;
    txt += `ORDER NO:    ${order.orderNumber || order.id}\n`;
    txt += `DATE:        ${dateStr}       TIME: ${timeStr}\n`;
    txt += `ORDER TYPE:  ${order.orderType || 'Dine In'}\n`;
    if (order.orderType === 'Dine In') {
      txt += `TABLE NO:    ${tableLabel}\n`;
    } else if (order.orderType === 'Room Service') {
      txt += `ROOM NO:     ${order.roomNumber || 'N/A'}\n`;
    }
    txt += `GUEST COUNT: ${order.guestCount || 1} Pax\n`;
    txt += `CASHIER:     ${activeUserName}\n`;
    txt += `----------------------------------------\n`;
    txt += `QTY   FOOD ITEM NAME / DETAILS\n`;
    txt += `----------------------------------------\n`;
    
    if (foodItems.length === 0) {
      txt += `[ NO KITCHEN FOOD ITEMS ORDERED ]\n`;
      txt += `(Beverages are served directly at bar)\n`;
    } else {
      foodItems.forEach(it => {
        txt += `${String(it.quantity).padEnd(5)}${it.name}\n`;
      });
    }
    
    txt += `----------------------------------------\n`;
    if (order.specialInstructions) {
      txt += `SPECIAL INSTRUCTIONS:\n`;
      txt += `* ${order.specialInstructions}\n`;
      txt += `----------------------------------------\n`;
    }
    txt += `* DISPATCHED VIA ${printerConfig} PORT *\n`;
    txt += `========================================\n`;
    return txt;
  };

  // Build Customer Payment Receipt with prices, VAT, discounts
  const generateCustomerReceiptContent = (order: RestaurantOrder, isReprint: boolean = false): string => {
    const tableLabel = order.tableId ? (db.restaurantTables.find(t => t.id === order.tableId)?.tableNumber || 'Table Option') : 'N/A';
    const activeUserName = store.getActiveUser()?.name || 'Marcus Brody (Cashier)';
    const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
    const timeStr = new Date(order.createdAt).toLocaleTimeString();

    let txt = `========================================\n`;
    txt += `      THE GRAND HORIZON RESORT & SPA     \n`;
    txt += `  TIN: ${db.settings.profile.taxNumber || 'TX-984-110A'}\n`;
    txt += `  Address: ${db.settings.profile.address}\n`;
    txt += `  Phone: ${db.settings.profile.phone}\n`;
    if (isReprint) {
      txt += `      *** REPRINT / DUPLICATE COPY ***   \n`;
    }
    txt += `========================================\n`;
    txt += `         CUSTOMER PAYMENT RECEIPT        \n`;
    txt += `========================================\n`;
    txt += `RECEIPT NO:  REC-${order.id.replace('ord_', '')}\n`;
    txt += `ORDER NO:    ${order.orderNumber || order.id}\n`;
    txt += `DATE:        ${dateStr}       TIME: ${timeStr}\n`;
    txt += `CASHIER:     ${activeUserName}\n`;
    txt += `ORDER TYPE:  ${order.orderType || 'Dine In'}\n`;
    if (order.orderType === 'Dine In') {
      txt += `TABLE:       ${tableLabel}\n`;
    } else if (order.orderType === 'Room Service') {
      txt += `ROOM SERVICE Room #${order.roomNumber || 'N/A'}\n`;
    }
    txt += `GUEST COUNT: ${order.guestCount || 1} Guests\n`;
    txt += `----------------------------------------\n`;
    txt += `QTY   ITEM NAME            PRICE     SUB\n`;
    txt += `----------------------------------------\n`;

    order.items.forEach(it => {
      const lineSub = (it.price * it.quantity).toFixed(2);
      const nameCol = it.name.substring(0, 18).padEnd(19);
      txt += `${String(it.quantity).padEnd(4)} ${nameCol} $${it.price.toFixed(2).padEnd(7)} $${lineSub}\n`;
    });

    txt += `----------------------------------------\n`;
    txt += `SUBTOTAL:                    $${order.subtotal.toFixed(2)}\n`;
    if (order.discount > 0) {
      txt += `DISCOUNT:                   -$${order.discount.toFixed(2)}\n`;
    }
    txt += `VAT (${db.settings.profile.taxRate}%):                     $${order.tax.toFixed(2)}\n`;
    txt += `----------------------------------------\n`;
    txt += `TOTAL AMOUNT DUE:            $${order.total.toFixed(2)}\n`;
    txt += `----------------------------------------\n`;
    txt += `PAYMENT METHOD:              ${order.paymentMethod || 'Cash'}\n`;
    txt += `========================================\n`;
    txt += `       Thank you! Please visit again!   \n`;
    txt += `========================================\n`;
    return txt;
  };

  // Dispatch simulated ticket to Spooler with auto-print alerts
  const dispatchPrintToSpooler = (order: RestaurantOrder, type: 'KOT' | 'Customer Receipt', isReprint: boolean = false) => {
    // Keep track of printing duplicates
    const key = `${order.id}_${type}`;
    const nextPrintCount = (printCountMap[key] || 0) + 1;
    setPrintCountMap(prev => ({ ...prev, [key]: nextPrintCount }));
    const printAsReprint = isReprint || nextPrintCount > 1;

    const content = type === 'KOT' 
      ? generateKOTContent(order, printAsReprint)
      : generateCustomerReceiptContent(order, printAsReprint);

    const title = printAsReprint 
      ? `🚨 DUPLICATE REPRINT - ${type} for ${order.orderNumber}`
      : `🖨️ Thermal Ticket Spooled - ${type} for ${order.orderNumber}`;

    const newJob = {
      id: `print_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      title,
      content,
      timestamp: new Date().toLocaleTimeString(),
      printerType: printerConfig,
      status: 'Printed' as const,
      isReprint: printAsReprint
    };

    setPrinterJobs(prev => [newJob, ...prev]);
    setPrintToast(`${type} printed on simulated ${printerConfig} printer.`);
    
    setTimeout(() => {
      setPrintToast(null);
    }, 4000);
  };

  // Settle ingredient stocks based on recipe multipliers (Step 9)
  const deductInventoryIngredients = (order: RestaurantOrder) => {
    order.items.forEach(it => {
      const lowerName = it.name.toLowerCase();
      const recipe = INGREDIENTS_RECIPES[lowerName];
      
      if (recipe) {
        recipe.forEach(ing => {
          const deductionQty = ing.quantity * it.quantity;
          store.addInventoryMovement(
            ing.productId,
            deductionQty,
            'Out',
            `POS POS_Complete recipe use: ${order.orderNumber}`
          );
        });
      } else {
        // Fallback: If no custom recipe ingredients mapped, deduct linked product on menu item direct
        const menuItem = db.menuItems.find(mi => mi.id === it.menuItemId);
        if (menuItem?.productId) {
          store.addInventoryMovement(
            menuItem.productId,
            it.quantity,
            'Out',
            `POS POS_Complete direct link: ${order.orderNumber}`
          );
        } else if (it.menuItemId.startsWith('stock_')) {
          const actualProductId = it.menuItemId.replace('stock_', '');
          store.addInventoryMovement(
            actualProductId,
            it.quantity,
            'Out',
            `POS POS_Complete direct stock sale: ${order.orderNumber}`
          );
        }
      }
    });
    
    // Add audit logs
    store.addAuditLog(
      'Recipe Stock Deduct',
      'Inventory',
      `Auto-deducted raw ingredients recipes for order ${order.orderNumber}`
    );
  };

  // Placing/Creating Order Handler (Cashier POS)
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setPosError('');

    if (cart.length === 0) {
      setPosError('Select at least one food or beverage item to build order.');
      return;
    }

    if (!checkPermission('Create')) {
      setPosError(`Simulated Role "${simulatedRole}" does not have privileges to create orders! Switch to Cashier or Admin.`);
      return;
    }

    // Validation for order type specific details
    if (orderType === 'Dine In' && !selectedTableId) {
      setPosError('Table Number is required for Dine In service.');
      return;
    }
    if (orderType === 'Room Service' && !roomNumber.trim()) {
      setPosError('Room Number is required for Room Service delivery.');
      return;
    }

    const uniqueOrdNum = generateUniqueOrderNumber();
    const uniqueKotNum = generateUniqueKotNumber();
    const activeUserObj = store.getActiveUser();

    // Create order object
    const newOrder: RestaurantOrder = {
      id: editingOrderId || `ord_${Date.now()}`,
      orderNumber: uniqueOrdNum,
      kotNumber: uniqueKotNum,
      orderType,
      tableId: orderType === 'Dine In' ? selectedTableId : undefined,
      roomNumber: orderType === 'Room Service' ? roomNumber : undefined,
      customerName: customerName.trim() || undefined,
      guestCount,
      specialInstructions: specialInstructions.trim() || undefined,
      waiterId: activeUserObj?.id || 'usr_cashier',
      items: cart,
      subtotal: cartSubtotal,
      tax: cartTax,
      discount: posDiscount,
      total: cartTotal,
      status: 'New', // Start status flow
      paymentMethod: posPaymentMethod,
      createdAt: new Date().toISOString()
    };

    if (isOffline) {
      // Offline mode: queue order locally
      setOfflineQueue(prev => [...prev, newOrder]);
      setCart([]);
      setSelectedTableId('');
      setRoomNumber('');
      setCustomerName('');
      setGuestCount(1);
      setSpecialInstructions('');
      setEditingOrderId(null);
      setPosDiscount(0);
      
      // Auto generate simulated printed spooled tickets in offline queue too!
      dispatchPrintToSpooler(newOrder, 'KOT');
      playAlertSound('new_order');
      
      store.addAuditLog('Offline POS Order Queued', 'Restaurant', `Offline queued order ${newOrder.orderNumber}`);
      return;
    }

    // Online Mode: save order to central database
    if (editingOrderId) {
      // Find old index and overwrite
      const index = db.restaurantOrders.findIndex(o => o.id === editingOrderId);
      if (index !== -1) {
        db.restaurantOrders[index] = {
          ...db.restaurantOrders[index],
          orderType: newOrder.orderType,
          tableId: newOrder.tableId,
          roomNumber: newOrder.roomNumber,
          customerName: newOrder.customerName,
          guestCount: newOrder.guestCount,
          specialInstructions: newOrder.specialInstructions,
          items: newOrder.items,
          subtotal: newOrder.subtotal,
          tax: newOrder.tax,
          discount: newOrder.discount,
          total: newOrder.total
        };
        store.addAuditLog('Edit POS Order', 'Restaurant', `Cashier modified order ${newOrder.orderNumber} before prep`);
      }
    } else {
      store.addRestaurantOrder(newOrder);
    }

    // Trigger printing and kitchen queue triggers immediately (Auto Steps)
    // 1. Generate Kitchen Order Ticket (KOT) and spool print
    const containsFood = newOrder.items.some(it => !isDrinkItem(it.menuItemId));
    if (containsFood) {
      dispatchPrintToSpooler(newOrder, 'KOT');
    }

    // 2. Play Audio synthesised alert chime for Kitchen Team
    playAlertSound('new_order');

    // 3. Log Audit Track
    store.addAuditLog(
      'KOT Sent to Printer',
      'Restaurant',
      `Auto KOT ${newOrder.kotNumber} dispatched to kitchen over ${printerConfig}`
    );

    // Clear state
    setCart([]);
    setSelectedTableId('');
    setRoomNumber('');
    setCustomerName('');
    setGuestCount(1);
    setSpecialInstructions('');
    setEditingOrderId(null);
    setPosDiscount(0);

    // Toast and switch to seating
    setPrintToast(`Success: ${newOrder.orderNumber} sent to Kitchen Display System!`);
    setActiveTab('tables');
  };

  // Sync Offline Queue back to central database
  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    
    offlineQueue.forEach(ord => {
      store.addRestaurantOrder(ord);
      const containsFood = ord.items.some(it => !isDrinkItem(it.menuItemId));
      if (containsFood) {
        dispatchPrintToSpooler(ord, 'KOT');
      }
    });

    store.addAuditLog(
      'Offline Queue Sync',
      'Restaurant',
      `Synchronized ${offlineQueue.length} offline orders to central ledger server`
    );

    playAlertSound('new_order');
    setPrintToast(`Successfully synchronized ${offlineQueue.length} offline orders!`);
    setOfflineQueue([]);
  };

  // Edit Order Before Preparation logic
  const loadOrderForEditing = (order: RestaurantOrder) => {
    if (!checkPermission('Edit')) {
      setPosError('No permission to edit orders. Switch role to Cashier or Admin.');
      return;
    }
    if (!['New', 'Pending Kitchen'].includes(order.status)) {
      setPosError(`Cannot edit order! Kitchen has already moved status to "${order.status}".`);
      return;
    }

    setEditingOrderId(order.id);
    setOrderType(order.orderType || 'Dine In');
    setSelectedTableId(order.tableId || '');
    setRoomNumber(order.roomNumber || '');
    setCustomerName(order.customerName || '');
    setGuestCount(order.guestCount || 1);
    setSpecialInstructions(order.specialInstructions || '');
    setCart(order.items);
    setPosDiscount(order.discount);
    
    setActiveTab('terminal');
    setPrintToast(`Loaded ${order.orderNumber} in edit mode.`);
  };

  // Status flow handler in KDS
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    if (!checkPermission('KitchenAction') && status !== 'Completed') {
      alert('Simulated role does not have Kitchen update permissions.');
      return;
    }

    const orderIndex = db.restaurantOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;
    
    const order = db.restaurantOrders[orderIndex];
    const oldStatus = order.status;
    
    // Update status in central store
    store.updateOrderStatus(orderId, status);

    // Sound triggers
    if (status === 'Ready') {
      playAlertSound('ready');
      // Dispatch alert to Cashier
      const newAlert = {
        id: `alert_${Date.now()}`,
        message: `Order #${order.orderNumber || order.id} is Ready!`,
        timestamp: new Date().toLocaleTimeString()
      };
      setCashierAlerts(prev => [newAlert, ...prev]);
    }

    // Settle stock and print Customer Receipt on Completion (Step 6/7/8/9)
    if (status === 'Completed') {
      deductInventoryIngredients(order);
      dispatchPrintToSpooler(order, 'Customer Receipt');
      
      // Post finalized POS sale to ledger
      const posSaleDetail: ShiftSaleDetail[] = order.items.map(it => ({
        menuItemId: it.menuItemId,
        name: it.name,
        quantitySold: it.quantity,
        expectedStockDecrement: it.quantity
      }));
      
      const saleRecord = {
        id: `sale_${Date.now()}`,
        cashierId: store.getActiveUser()?.id || 'usr_cashier',
        items: order.items.map(it => ({
          menuItemId: it.menuItemId,
          name: it.name,
          quantity: it.quantity,
          price: it.price
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        paymentMethod: order.paymentMethod || 'Cash',
        createdAt: new Date().toISOString()
      };
      db.sales.push(saleRecord);
      store.addAuditLog('POS Sale Complete', 'POS', `Completed billing receipt ${order.orderNumber} for $${order.total}`);
    }

    setPrintToast(`Status updated: ${order.orderNumber || order.id} is now ${status}`);
  };

  // Cancel Order handler (Manager or Admin)
  const handleCancelOrder = (orderId: string) => {
    if (!checkPermission('CancelOrder')) {
      setPosError('Cancellation denied! Restaurant Manager or Admin privileges required.');
      return;
    }
    
    const order = db.restaurantOrders.find(o => o.id === orderId);
    if (!order) return;

    store.updateOrderStatus(orderId, 'Cancelled');
    
    // Release table
    if (order.tableId) {
      const tbl = db.restaurantTables.find(t => t.id === order.tableId);
      if (tbl) tbl.status = 'Available';
    }

    store.addAuditLog('Cancel POS Order', 'Restaurant', `Manager cancelled order ${order.orderNumber}`);
    setPrintToast(`Cancelled order ${order.orderNumber} successfully.`);
  };

  // Aggregated Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  }, [cart]);

  const cartTax = useMemo(() => {
    return Math.round(cartSubtotal * (db.settings.profile.taxRate / 100) * 100) / 100;
  }, [db, cartSubtotal]);

  const cartTotal = useMemo(() => {
    return Math.max(0, Math.round((cartSubtotal + cartTax - posDiscount) * 100) / 100);
  }, [cartSubtotal, cartTax, posDiscount]);

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setPosError('');
    const existing = cart.find(it => it.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(it => it.menuItemId === item.id ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setCart([...cart, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(it => it.menuItemId !== itemId));
  };

  const updateCartQty = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(it => it.menuItemId === itemId ? { ...it, quantity: qty } : it));
  };

  // Table Addition Plan helper
  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    const tbl: RestaurantTable = {
      id: `tbl_${Date.now()}`,
      tableNumber: newTableName.trim(),
      capacity: newTableCap,
      status: 'Available'
    };

    store.saveRestaurantTable(tbl);
    setNewTableName('');
    setNewTableCap(4);
    setPrintToast(`Deploied table ${tbl.tableNumber}`);
  };

  // Menu item catalog management helpers
  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuItemName.trim()) {
      setMenuErrorMessage('Menu item name is required.');
      return;
    }
    const priceNum = parseFloat(menuItemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setMenuErrorMessage('Price must be a valid non-negative number.');
      return;
    }

    const item: MenuItem = {
      id: editingMenuItem ? editingMenuItem.id : `m_${Date.now()}`,
      name: menuItemName.trim(),
      category: menuItemCategory,
      price: priceNum,
      isAvailable: menuItemAvailable,
      description: menuItemDescription.trim() || undefined,
      productId: menuItemProductId || undefined,
    };

    store.saveMenuItem(item);
    
    // Clear form
    setEditingMenuItem(null);
    setMenuItemName('');
    setMenuItemCategory('Main');
    setMenuItemPrice('');
    setMenuItemDescription('');
    setMenuItemAvailable(true);
    setMenuItemProductId('');
    setMenuErrorMessage('');
    setMenuSuccessMessage(editingMenuItem ? 'Menu item updated successfully!' : 'Menu item created successfully!');
    setPrintToast(editingMenuItem ? `Updated menu item: ${item.name}` : `Created menu item: ${item.name}`);
    setTimeout(() => setMenuSuccessMessage(''), 4000);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuItemName(item.name);
    setMenuItemCategory(item.category);
    setMenuItemPrice(String(item.price));
    setMenuItemDescription(item.description || '');
    setMenuItemAvailable(item.isAvailable);
    setMenuItemProductId(item.productId || '');
    setMenuErrorMessage('');
  };

  const handleDeleteMenuItem = (id: string) => {
    const item = db.menuItems.find(m => m.id === id);
    if (item && confirm(`Are you sure you want to delete "${item.name}" from the menu catalog?`)) {
      store.deleteMenuItem(id);
      setMenuSuccessMessage('Menu item deleted successfully!');
      setPrintToast(`Deleted menu item: ${item.name}`);
      setTimeout(() => setMenuSuccessMessage(''), 4000);
    }
  };

  // Shift Management submit
  const shiftTotals = useMemo(() => {
    const shiftSales = db.sales;
    let count = 0;
    let val = 0;
    let cashVal = 0;
    const itemMap: Record<string, { name: string; qty: number }> = {};

    shiftSales.forEach(s => {
      count++;
      val += s.total;
      if (s.paymentMethod === 'Cash') {
        cashVal += s.total;
      }
      s.items.forEach(it => {
        if (!itemMap[it.name]) {
          itemMap[it.name] = { name: it.name, qty: 0 };
        }
        itemMap[it.name].qty += it.quantity;
      });
    });

    return {
      count,
      val,
      expectedCash: 200 + cashVal,
      itemsSold: Object.values(itemMap)
    };
  }, [db.sales]);

  const handleSubmitShiftReport = (e: React.FormEvent) => {
    e.preventDefault();
    const actualCash = parseFloat(actualCashInput || '0');
    const activeUser = store.getActiveUser();

    const report: DailyShiftReport = {
      id: `rep_${Date.now()}`,
      cashierId: activeUser?.id || 'usr_cashier',
      cashierName: activeUser?.name || 'Marcus Brody',
      startTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      totalSalesCount: shiftTotals.count,
      totalSalesValue: shiftTotals.val,
      expectedCash: shiftTotals.expectedCash,
      actualCash,
      itemsSold: [],
      status: 'Pending Stock Verification',
      isDiscrepancyFound: Math.abs(actualCash - shiftTotals.expectedCash) > 0.01,
      notes: shiftNotes
    };

    store.addShiftReport(report);
    setShiftSuccessMessage('Daily shift report registered and forwarded to operations.');
    setShiftNotes('');
    setActualCashInput('200');
    
    setTimeout(() => {
      setShiftSuccessMessage('');
    }, 5000);
  };

  // Dynamic menu catalog filters
  const filteredMenuItems = useMemo(() => {
    const list = [...db.menuItems];
    
    // Auto-integrate Storekeeper items that are not explicitly in menuItems
    db.products.forEach(product => {
      const isLinked = db.menuItems.some(item => item.productId === product.id);
      if (!isLinked) {
        if (product.category === 'Food' || product.category === 'Beverage') {
          list.push({
            id: `stock_${product.id}`,
            name: product.name,
            category: product.category === 'Food' ? 'Main' : 'Beverage',
            price: product.unitPrice || 10,
            isAvailable: true,
            description: `Storekeeper Stock Product: ${product.name}`,
            productId: product.id
          });
        }
      }
    });

    return list.filter(item => {
      const cMatch = menuFilterCategory === 'All' || item.category === menuFilterCategory;
      const sMatch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
      return cMatch && sMatch && item.isAvailable;
    });
  }, [db.menuItems, db.products, menuFilterCategory, menuSearchQuery]);

  // Dynamic stock catalog filters
  const filteredStockProducts = useMemo(() => {
    return db.products.filter(product => {
      const sMatch = product.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
      return sMatch;
    });
  }, [db.products, menuSearchQuery]);

  // Dynamically calculate reports on Reports Tab (Step 10)
  const reportStats = useMemo(() => {
    const completedOrders = db.restaurantOrders.filter(o => o.status === 'Completed' || o.status === 'Paid');
    const revenue = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const vat = completedOrders.reduce((sum, o) => sum + o.tax, 0);
    const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
    
    // Inventory ingredients usage and recipe multipliers calculation
    const ingredientsUsage: Record<string, { name: string; qty: number; unit: string }> = {
      'Chicken Portion': { name: 'Chicken Portion', qty: 0, unit: 'packs' },
      'Onions': { name: 'Fresh Onions', qty: 0, unit: 'pcs' },
      'Tomatoes': { name: 'Fresh Tomatoes', qty: 0, unit: 'pcs' },
      'Cooking Oil': { name: 'Cooking Oil', qty: 0, unit: 'liters' }
    };

    const itemSalesQty: Record<string, { name: string; count: number; revenue: number }> = {};

    completedOrders.forEach(ord => {
      ord.items.forEach(it => {
        const lowerName = it.name.toLowerCase();
        
        // Recipe ingredient stock additions
        const recipe = INGREDIENTS_RECIPES[lowerName];
        if (recipe) {
          recipe.forEach(ing => {
            const label = ing.name.replace(/\(.*\)/, '').trim();
            if (ingredientsUsage[label]) {
              ingredientsUsage[label].qty += ing.quantity * it.quantity;
            } else {
              ingredientsUsage[label] = { name: label, qty: ing.quantity * it.quantity, unit: 'units' };
            }
          });
        }

        if (!itemSalesQty[it.name]) {
          itemSalesQty[it.name] = { name: it.name, count: 0, revenue: 0 };
        }
        itemSalesQty[it.name].count += it.quantity;
        itemSalesQty[it.name].revenue += it.price * it.quantity;
      });
    });

    // Top Selling calculation sorted descending
    const topSellers = Object.values(itemSalesQty).sort((a, b) => b.count - a.count).slice(0, 5);

    // Profit calculation: Estimate food raw material cost as 35% of revenue
    const estimatedCOGS = Math.round(revenue * 0.35 * 100) / 100;
    const netProfit = Math.max(0, Math.round((revenue - estimatedCOGS) * 100) / 100);

    // Group sales by cashier waiterId
    const cashierBreakdown: Record<string, { name: string; sales: number; count: number }> = {};
    completedOrders.forEach(o => {
      const name = o.waiterId === 'usr_cashier' ? 'Marcus Brody' : (db.users.find(u => u.id === o.waiterId)?.name || o.waiterId);
      if (!cashierBreakdown[name]) {
        cashierBreakdown[name] = { name, sales: 0, count: 0 };
      }
      cashierBreakdown[name].sales += o.total;
      cashierBreakdown[name].count += 1;
    });

    return {
      revenue,
      vat,
      totalSales,
      cogs: estimatedCOGS,
      netProfit,
      ingredientsUsed: Object.values(ingredientsUsage).filter(i => i.qty > 0),
      topSellers,
      cashierSales: Object.values(cashierBreakdown)
    };
  }, [db.restaurantOrders, db.users]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Permissions Simulator & Mode Switchers */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-5 rounded-2xl shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 bg-amber-500 text-slate-950 rounded-2xl shadow-inner font-black">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              Cascade Food & Dining POS
              <span className="text-[10px] uppercase font-mono tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                Resort Enterprise v4.2
              </span>
            </h1>
            <p className="text-xs text-slate-400">Integrated Thermal Spooling, Live KDS Queue Columns, Recipe Ingredient Stock and Shift Accounting.</p>
          </div>
        </div>

        {/* Simulator controls */}
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Offline Mode Switch */}
          <button
            onClick={() => {
              setIsOffline(!isOffline);
              setPrintToast(isOffline ? 'Connected to Hotel Central POS Database.' : 'POS offline mode enabled. Orders will buffer.');
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition ${
              isOffline 
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' 
                : 'bg-green-500/10 text-green-400 border-green-500/20'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span>Offline Buffering ({offlineQueue.length})</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span>Cloud Online Sync</span>
              </>
            )}
          </button>

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs cursor-pointer transition ${
              soundEnabled ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'Web Audio chime ON' : 'Audio chime MUTED'}
          >
            <Volume2 className="h-4 w-4" />
          </button>

          {/* Role selector dropdown */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 px-2 py-1">
            <Sliders className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            <select
              value={simulatedRole}
              onChange={(e) => {
                setSimulatedRole(e.target.value as any);
                setPrintToast(`Switched terminal view context to: ${e.target.value}`);
              }}
              className="bg-transparent text-white font-semibold text-xs border-none outline-none focus:ring-0 cursor-pointer text-slate-200"
            >
              <option value="Admin">Simulate Role: Admin</option>
              <option value="Cashier">Simulate Role: Cashier</option>
              <option value="Kitchen">Simulate Role: Kitchen Staff</option>
              <option value="Restaurant Manager">Simulate Role: Restaurant Manager</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cashier Alerts Banner (Step 5) */}
      {cashierAlerts.length > 0 && simulatedRole !== 'Kitchen' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 animate-fadeIn shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
              <BadgeAlert className="h-4 w-4 text-amber-600 animate-bounce" /> Active Food Ready Alerts ({cashierAlerts.length})
            </h4>
            <button 
              onClick={() => setCashierAlerts([])}
              className="text-[10px] text-amber-700 hover:underline font-bold cursor-pointer"
            >
              Acknowledge All
            </button>
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto">
            {cashierAlerts.map(alert => (
              <div key={alert.id} className="flex justify-between items-center text-xs text-slate-700 bg-white border border-amber-100 p-2 rounded-xl">
                <span>{alert.message}</span>
                <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POS Tabbed Navigation */}
      <div className="bg-white p-2.5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex space-x-1.5">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 border cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'tables'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>Tables seating plan</span>
          </button>

          <button
            onClick={() => {
              setEditingOrderId(null);
              setActiveTab('terminal');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 border cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'terminal'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Cashier POS Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('kitchen')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 border cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'kitchen'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            <ChefHat className="h-3.5 w-3.5" />
            <span>Kitchen Display Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 border cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'reports'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Reports & Recipes</span>
          </button>

          <button
            onClick={() => setActiveTab('shift')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 border cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'shift'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Shift & Cashier reconciliation</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 border cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'menu'
                ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-sm'
                : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Menu Catalog Manager</span>
          </button>
        </div>

        {/* Offline sync banner if offline items exist */}
        {isOffline && offlineQueue.length > 0 && (
          <button
            onClick={syncOfflineQueue}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl border border-amber-400 flex items-center space-x-1 cursor-pointer animate-pulse"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Sync Buffer ({offlineQueue.length}) to Server</span>
          </button>
        )}
      </div>

      {/* Main Container Grid with Printer Spooler Split Screen */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Dynamic Center Work Area */}
        <div className="xl:col-span-3 space-y-6">

          {/* TAB 1: DINING TABLES SEATING PLAN */}
          {activeTab === 'tables' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">Dining Room Layout Map</h3>
                  <span className="text-xs text-gray-400">Review open tables and settle customer checks.</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {db.restaurantTables.map(tbl => {
                    const activeOrder = db.restaurantOrders.find(o => o.tableId === tbl.id && !['Completed', 'Cancelled'].includes(o.status));

                    return (
                      <div
                        key={tbl.id}
                        className={`p-4 rounded-2xl border flex flex-col justify-between h-40 transition hover:shadow-md ${
                          tbl.status === 'Available' ? 'bg-green-50/40 border-green-200 text-green-800' :
                          tbl.status === 'Occupied' ? 'bg-blue-50/40 border-blue-200 text-[#1B4F72]' :
                          'bg-purple-50/40 border-purple-200 text-purple-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <strong className="text-sm font-bold block">{tbl.tableNumber}</strong>
                            <span className="text-[9px] font-mono tracking-wide bg-white border px-1.5 py-0.5 rounded uppercase font-bold text-slate-600">
                              {tbl.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-1 block">Seating Capacity: {tbl.capacity} Pax</span>
                        </div>

                        <div className="space-y-2 mt-4 text-[11px]">
                          {activeOrder ? (
                            <div className="flex items-center justify-between bg-white/70 p-1.5 rounded-lg border">
                              <span className="font-semibold text-gray-600">Bill: ${activeOrder.total}</span>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                activeOrder.status === 'Ready' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {activeOrder.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-normal">No active guest bills</span>
                          )}

                          <div className="flex space-x-1.5 pt-1.5 border-t border-gray-200/50">
                            {activeOrder ? (
                              <>
                                <button
                                  onClick={() => handleUpdateOrderStatus(activeOrder.id, 'Completed')}
                                  disabled={!checkPermission('PrintReceipt')}
                                  className="w-full text-center py-1 bg-[#1B4F72] text-white font-bold rounded text-[9px] hover:bg-[#153E5B] cursor-pointer disabled:opacity-50"
                                  title="Serve food and print final customer receipt"
                                >
                                  Complete & Bill
                                </button>
                                <button
                                  onClick={() => {
                                    setCart(activeOrder.items);
                                    setSelectedTableId(tbl.id);
                                    setOrderType('Dine In');
                                    setEditingOrderId(activeOrder.id);
                                    setPosDiscount(activeOrder.discount);
                                    setActiveTab('terminal');
                                  }}
                                  className="w-full text-center py-1 bg-gray-100 text-gray-700 font-bold border border-gray-300 rounded text-[9px] hover:bg-gray-200 cursor-pointer"
                                >
                                  Edit Items
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedTableId(tbl.id);
                                  setOrderType('Dine In');
                                  setCart([]);
                                  setEditingOrderId(null);
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

              {/* Sidebar table addition */}
              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm h-fit">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Menu and catalog filters */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-gray-100">
                  <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-xl border border-gray-150 overflow-x-auto max-w-full">
                    {['All', 'Starter', 'Main', 'Dessert', 'Beverage', 'Alcoholic', 'Stock Items'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setMenuFilterCategory(cat)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition whitespace-nowrap ${
                          menuFilterCategory === cat ? 'bg-white text-gray-800 border border-gray-150 shadow-sm' : 'text-gray-400 hover:text-gray-600'
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

                {posError && (
                  <div className="p-3.5 bg-red-50 border border-red-250 text-red-700 rounded-2xl flex items-center space-x-2 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <span>{posError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {menuFilterCategory === 'Stock Items' ? (
                    filteredStockProducts.map(product => {
                      const stock = product.currentStock;
                      const isOutOfStock = stock <= 0;

                      return (
                        <div
                          key={product.id}
                          onClick={() => {
                            if (isOutOfStock) {
                              setPosError(`"${product.name}" stock is exhausted!`);
                              return;
                            }
                            addToCart({
                              id: `stock_${product.id}`,
                              name: product.name,
                              price: product.unitPrice
                            });
                          }}
                          className={`p-3.5 rounded-2xl border flex flex-col justify-between h-28 transition group ${
                            isOutOfStock 
                              ? 'bg-red-50/40 border-red-200 opacity-60 cursor-not-allowed'
                              : 'bg-gray-50/50 hover:bg-[#1B4F72]/5 hover:border-[#1B4F72]/30 border-gray-150 cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <strong className="text-xs text-slate-800 font-bold block group-hover:text-[#1B4F72] truncate">{product.name}</strong>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {isOutOfStock ? 'OOS' : `${stock} ${product.unit}`}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium block mt-0.5 uppercase">Stock - {product.category}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <strong className="text-xs font-bold text-slate-800">${product.unitPrice}</strong>
                            <span className="text-[8px] bg-blue-50 text-[#1B4F72] border px-1 rounded font-bold">Direct Stock</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    filteredMenuItems.map(item => {
                      const product = item.productId ? db.products.find(p => p.id === item.productId) : null;
                      const stock = product ? product.currentStock : null;
                      const isOutOfStock = stock !== null && stock <= 0;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isOutOfStock) {
                              setPosError(`"${item.name}" ingredient stock is exhausted!`);
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
                              <strong className="text-xs text-slate-800 font-bold block group-hover:text-[#1B4F72] truncate">{item.name}</strong>
                              {stock !== null && (
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                  isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {isOutOfStock ? 'OOS' : `${stock} left`}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium block mt-0.5 uppercase">{item.category}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <strong className="text-xs font-bold text-slate-800">${item.price}</strong>
                            {INGREDIENTS_RECIPES[item.name.toLowerCase()] ? (
                              <span className="text-[8px] bg-amber-50 text-amber-700 border px-1 rounded">Recipe</span>
                            ) : item.id.startsWith('stock_') ? (
                              <span className="text-[8px] bg-blue-50 text-[#1B4F72] border px-1 rounded">Stock Product</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Cashier Order placing side panel (Steps 1 to 5) */}
              <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-gray-150 flex flex-col justify-between h-fit space-y-4">
                <div>
                  <div className="pb-3 border-b border-gray-200 mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">
                        {editingOrderId ? '✏️ Edit Customer Order' : '📝 Create Customer Order'}
                      </h3>
                      <p className="text-[10px] text-slate-400">Complete service type and guest instructions.</p>
                    </div>
                    {editingOrderId && (
                      <button
                        type="button"
                        onClick={() => {
                          setCart([]);
                          setSelectedTableId('');
                          setRoomNumber('');
                          setCustomerName('');
                          setGuestCount(1);
                          setSpecialInstructions('');
                          setEditingOrderId(null);
                          setPosDiscount(0);
                          setPrintToast('Switched back to Create Order mode.');
                        }}
                        className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1 rounded-lg transition"
                      >
                        Reset / New
                      </button>
                    )}
                  </div>

                  {/* Order Type Select */}
                  <div className="space-y-3.5">
                    {/* Quick Active Order Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Choose Existing Order to Edit</label>
                      <select
                        value={editingOrderId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setCart([]);
                            setSelectedTableId('');
                            setRoomNumber('');
                            setCustomerName('');
                            setGuestCount(1);
                            setSpecialInstructions('');
                            setEditingOrderId(null);
                            setPosDiscount(0);
                          } else {
                            const found = db.restaurantOrders.find(o => o.id === val);
                            if (found) {
                              loadOrderForEditing(found);
                            }
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#1B4F72] font-semibold"
                      >
                        <option value="">-- Start New / Create New Order --</option>
                        {db.restaurantOrders
                          .filter(o => o.status !== 'Completed' && o.status !== 'Paid' && o.status !== 'Cancelled')
                          .map(o => (
                            <option key={o.id} value={o.id}>
                              {o.orderNumber || o.id.slice(-4)} - {o.customerName || 'Walk-in'} (${o.total.toFixed(2)}) [{o.status}]
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Type</label>
                      <div className="grid grid-cols-3 gap-1 bg-gray-200/50 p-1 rounded-xl">
                        {(['Dine In', 'Take Away', 'Room Service'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setOrderType(type)}
                            className={`py-1 text-[10px] font-bold rounded-lg transition ${
                              orderType === type ? 'bg-[#1B4F72] text-white shadow' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table Select / Room Number Input */}
                    {orderType === 'Dine In' && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Seated Table</label>
                        <select
                          required
                          value={selectedTableId}
                          onChange={(e) => setSelectedTableId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                        >
                          <option value="">-- Choose Table --</option>
                          {db.restaurantTables.map(t => (
                            <option key={t.id} value={t.id}>{t.tableNumber} ({t.status})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {orderType === 'Room Service' && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 501 (Penthouse)"
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-slate-800 focus:outline-none font-bold"
                          value={roomNumber}
                          onChange={(e) => setRoomNumber(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Optional details */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Name</label>
                        <input
                          type="text"
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-slate-800"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Guests Count</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-slate-800"
                          value={guestCount}
                          onChange={(e) => setGuestCount(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Special Instructions (KOT)</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Extra spicy, sauce on side, allergies..."
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Display Cart Items list */}
                  <div className="mt-4 border-t border-gray-200 pt-3 space-y-2">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Items list ({cart.length})</span>
                    {cart.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic py-3 text-center">No items added yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {cart.map(it => (
                          <div key={it.menuItemId} className="flex justify-between items-center text-xs bg-white border p-1.5 rounded-xl shadow-sm">
                            <span className="font-semibold text-slate-700 truncate max-w-[120px]">{it.name}</span>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button 
                                type="button"
                                onClick={() => updateCartQty(it.menuItemId, it.quantity - 1)}
                                className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-700 font-bold"
                              >
                                -
                              </button>
                              <span className="font-bold font-mono">{it.quantity}</span>
                              <button 
                                type="button"
                                onClick={() => updateCartQty(it.menuItemId, it.quantity + 1)}
                                className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-700 font-bold"
                              >
                                +
                              </button>
                              <button 
                                type="button"
                                onClick={() => removeFromCart(it.menuItemId)}
                                className="text-red-500 font-bold ml-1 hover:text-red-700"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotals & Payment and Place Order Button */}
                <div className="border-t border-gray-250 pt-3 space-y-3">
                  <div className="text-xs space-y-1 text-slate-600 font-semibold">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    {cartSubtotal > 0 && (
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Discount ($):</span>
                        <input
                          type="number"
                          min={0}
                          className="w-16 text-right px-1.5 py-0.5 bg-white border rounded text-xs text-slate-800 font-mono font-bold"
                          value={posDiscount}
                          onChange={(e) => setPosDiscount(Number(e.target.value))}
                        />
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>VAT ({db.settings.profile.taxRate}%):</span>
                      <span>${cartTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-black text-sm border-t border-dashed pt-1.5">
                      <span>Total:</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Cash', 'Card', 'Mobile Money'] as const).map(pm => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPosPaymentMethod(pm)}
                          className={`py-1 text-[9px] font-bold rounded-lg border text-center ${
                            posPaymentMethod === pm 
                              ? 'bg-slate-900 text-white border-slate-900 shadow' 
                              : 'bg-white text-slate-500 border-gray-200'
                          }`}
                        >
                          {pm}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handlePlaceOrder}>
                    <button
                      type="submit"
                      disabled={cart.length === 0}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center gap-1.5 shadow"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{editingOrderId ? 'Update Order & Dispatch' : 'Create Order & Dispatch'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KITCHEN DISPLAY QUEUE (KDS) */}
          {activeTab === 'kitchen' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Live Kitchen Display System (KDS)</h3>
                  <p className="text-xs text-slate-400">Order Status Flow: New → Pending Kitchen → Preparing → Ready → Served → Completed</p>
                </div>
                <div className="flex space-x-2">
                  <span className="text-xs font-bold text-slate-500">Filters: </span>
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-full">
                    Auto-Refreshed
                  </span>
                </div>
              </div>

              {/* Grid Column Categories matching standard flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                
                {/* 1. NEW Column */}
                <div className="space-y-3.5">
                  <div className="bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-sm">
                    <span>1. NEW / UNASSIGNED</span>
                    <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                      {db.restaurantOrders.filter(o => o.status === 'New' || o.status === 'Pending').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {db.restaurantOrders.filter(o => o.status === 'New' || o.status === 'Pending').map(order => (
                      <KDSOrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={handleUpdateOrderStatus} 
                        onCancel={handleCancelOrder}
                        onReprintKOT={(ord) => dispatchPrintToSpooler(ord, 'KOT')}
                        onReprintReceipt={(ord) => dispatchPrintToSpooler(ord, 'Customer Receipt')}
                        onEdit={loadOrderForEditing}
                        role={simulatedRole}
                        db={db}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. PENDING KITCHEN Column */}
                <div className="space-y-3.5">
                  <div className="bg-sky-100 border border-sky-200 text-sky-800 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-sm">
                    <span>2. PENDING KITCHEN</span>
                    <span className="bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded text-[10px]">
                      {db.restaurantOrders.filter(o => o.status === 'Pending Kitchen' || o.status === 'In Kitchen').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {db.restaurantOrders.filter(o => o.status === 'Pending Kitchen' || o.status === 'In Kitchen').map(order => (
                      <KDSOrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={handleUpdateOrderStatus} 
                        onCancel={handleCancelOrder}
                        onReprintKOT={(ord) => dispatchPrintToSpooler(ord, 'KOT')}
                        onReprintReceipt={(ord) => dispatchPrintToSpooler(ord, 'Customer Receipt')}
                        onEdit={loadOrderForEditing}
                        role={simulatedRole}
                        db={db}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. PREPARING Column */}
                <div className="space-y-3.5">
                  <div className="bg-indigo-100 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-sm">
                    <span>3. PREPARING (LINE)</span>
                    <span className="bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded text-[10px]">
                      {db.restaurantOrders.filter(o => o.status === 'Preparing').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {db.restaurantOrders.filter(o => o.status === 'Preparing').map(order => (
                      <KDSOrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={handleUpdateOrderStatus} 
                        onCancel={handleCancelOrder}
                        onReprintKOT={(ord) => dispatchPrintToSpooler(ord, 'KOT')}
                        onReprintReceipt={(ord) => dispatchPrintToSpooler(ord, 'Customer Receipt')}
                        onEdit={loadOrderForEditing}
                        role={simulatedRole}
                        db={db}
                      />
                    ))}
                  </div>
                </div>

                {/* 4. READY Column */}
                <div className="space-y-3.5">
                  <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-sm">
                    <span>4. FOOD READY 🔔</span>
                    <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded text-[10px]">
                      {db.restaurantOrders.filter(o => o.status === 'Ready').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {db.restaurantOrders.filter(o => o.status === 'Ready').map(order => (
                      <KDSOrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={handleUpdateOrderStatus} 
                        onCancel={handleCancelOrder}
                        onReprintKOT={(ord) => dispatchPrintToSpooler(ord, 'KOT')}
                        onReprintReceipt={(ord) => dispatchPrintToSpooler(ord, 'Customer Receipt')}
                        onEdit={loadOrderForEditing}
                        role={simulatedRole}
                        db={db}
                      />
                    ))}
                  </div>
                </div>

                {/* 5. SERVED & CLOSED Column */}
                <div className="space-y-3.5">
                  <div className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-sm">
                    <span>5. SERVED / COMPLETE</span>
                    <span className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                      {db.restaurantOrders.filter(o => o.status === 'Served' || o.status === 'Completed' || o.status === 'Paid').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {db.restaurantOrders.filter(o => o.status === 'Served' || o.status === 'Completed' || o.status === 'Paid').map(order => (
                      <KDSOrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={handleUpdateOrderStatus} 
                        onCancel={handleCancelOrder}
                        onReprintKOT={(ord) => dispatchPrintToSpooler(ord, 'KOT')}
                        onReprintReceipt={(ord) => dispatchPrintToSpooler(ord, 'Customer Receipt')}
                        onEdit={loadOrderForEditing}
                        role={simulatedRole}
                        db={db}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: REPORTS & ANALYTICS SUB-DASHBOARD (Step 10) */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Dynamic Restaurant Reports Dashboard</h3>
                  <p className="text-xs text-slate-400">Aggregated automatically based on kitchen status completions and recipes.</p>
                </div>
              </div>

              {/* Financial cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4.5 rounded-2xl border shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Revenue</span>
                  <span className="text-xl font-mono font-black text-slate-900 block mt-1">${reportStats.revenue.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Includes Completed food orders</span>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VAT Collected ({db.settings.profile.taxRate}%)</span>
                  <span className="text-xl font-mono font-black text-slate-900 block mt-1">${reportStats.vat.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Settle checks tax collection ledger</span>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Recipe Cost</span>
                  <span className="text-xl font-mono font-black text-orange-600 block mt-1">${reportStats.cogs.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">COGS ingredient base estimated</span>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Net POS Profit</span>
                  <span className="text-xl font-mono font-black text-emerald-600 block mt-1">${reportStats.netProfit.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Direct culinary ledger margins</span>
                </div>
              </div>

              {/* Visual tables block */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Inventory usage log (recipe-based decreases) */}
                <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
                    🌾 Auto Recipe Ingredient Usage Logs
                  </h4>
                  {reportStats.ingredientsUsed.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">Complete guest orders to trigger recipe deductions.</p>
                  ) : (
                    <div className="space-y-3">
                      {reportStats.ingredientsUsed.map(ing => {
                        const originalProduct = db.products.find(p => p.name.includes(ing.name) || p.id === ing.name);
                        const currentStock = originalProduct ? originalProduct.currentStock : 'N/A';
                        
                        return (
                          <div key={ing.name} className="flex justify-between items-center text-xs p-2 bg-slate-50 border rounded-xl">
                            <div>
                              <span className="font-semibold text-slate-800">{ing.name}</span>
                              <span className="block text-[10px] text-slate-400">Inventory Status: {currentStock} {ing.unit} left</span>
                            </div>
                            <span className="font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                              -{ing.qty.toFixed(2)} {ing.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Top Selling Items visual tracker */}
                <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
                    🏆 Top Selling Menu Items
                  </h4>
                  {reportStats.topSellers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">No POS sales logged.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {reportStats.topSellers.map(seller => (
                        <div key={seller.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>{seller.name}</span>
                            <span>{seller.count} sold (${seller.revenue.toFixed(2)})</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, (seller.count / 15) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Cashier/waiter sales distribution */}
                <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4 lg:col-span-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
                    👥 Waiter & Cashier Sales Log
                  </h4>
                  {reportStats.cashierSales.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">No cashier stats generated.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {reportStats.cashierSales.map(cs => (
                        <div key={cs.name} className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold block">Cashier Employee</span>
                          <span className="font-bold text-xs text-slate-800 block mt-0.5">{cs.name}</span>
                          <div className="flex justify-between items-center mt-2 border-t pt-1.5 text-[11px]">
                            <span className="text-slate-500">{cs.count} Tickets Completed</span>
                            <span className="font-bold text-[#1B4F72]">${cs.sales.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                
                {/* Active Register Shift Status */}
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
                  </div>
                </div>

                {/* Settle shift close form */}
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm h-fit space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center border-b border-gray-100 pb-2">
                    <DollarSign className="h-4 w-4 mr-1 text-green-600" /> Close Cash Drawer
                  </h3>
                  
                  <form onSubmit={handleSubmitShiftReport} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Counted Drawer Cash ($)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-800 focus:outline-none"
                        value={actualCashInput}
                        onChange={(e) => setActualCashInput(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Shift Handover Notes</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                        value={shiftNotes}
                        onChange={(e) => setShiftNotes(e.target.value)}
                        placeholder="Register handover details..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      Settle Cash Register
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MENU CATALOG MANAGER */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {menuSuccessMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center space-x-2 text-sm font-semibold shadow-sm">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <span>{menuSuccessMessage}</span>
                </div>
              )}

              {menuErrorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center space-x-2 text-sm font-semibold shadow-sm">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <span>{menuErrorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                
                {/* Menu Catalog List Table */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h2 className="text-md font-bold text-gray-800">Restaurant Menu Catalog</h2>
                        <p className="text-xs text-gray-400">Total {db.menuItems.length} active dishes and beverage products catalogued.</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            <th className="py-2.5">Item Name</th>
                            <th className="py-2.5">Category</th>
                            <th className="py-2.5">Price</th>
                            <th className="py-2.5">Availability</th>
                            <th className="py-2.5">Linked Stock Item</th>
                            <th className="py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {db.menuItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-3 font-semibold text-slate-800">
                                <div>{item.name}</div>
                                {item.description && (
                                  <div className="text-[10px] text-slate-400 font-normal mt-0.5 max-w-xs truncate">{item.description}</div>
                                )}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                  item.category === 'Starter' ? 'bg-indigo-50 text-indigo-700 border-indigo-150' :
                                  item.category === 'Main' ? 'bg-blue-50 text-blue-700 border-blue-150' :
                                  item.category === 'Dessert' ? 'bg-pink-50 text-pink-700 border-pink-150' :
                                  item.category === 'Beverage' ? 'bg-teal-50 text-teal-700 border-teal-150' :
                                  'bg-amber-50 text-amber-700 border-amber-150'
                                }`}>
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-3 font-mono font-bold text-slate-900">${item.price.toFixed(2)}</td>
                              <td className="py-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${item.isAvailable ? 'text-green-600' : 'text-slate-400'}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${item.isAvailable ? 'bg-green-600' : 'bg-slate-300'}`} />
                                  {item.isAvailable ? 'Available' : 'Unavailable'}
                                </span>
                              </td>
                              <td className="py-3 text-slate-500 text-[11px]">
                                {item.productId ? (
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                    {db.products.find(p => p.id === item.productId)?.name || item.productId}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 italic">None</span>
                                )}
                              </td>
                              <td className="py-3 text-right space-x-2">
                                <button
                                  onClick={() => handleEditMenuItem(item)}
                                  className="text-[11px] font-bold text-[#1B4F72] hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(item.id)}
                                  className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Create / Edit Menu Item Form */}
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm h-fit space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center border-b border-gray-100 pb-2">
                    <ClipboardList className="h-4 w-4 mr-1.5 text-blue-600" /> 
                    {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </h3>
                  
                  <form onSubmit={handleSaveMenuItem} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lobster Thermidor"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none"
                        value={menuItemName}
                        onChange={(e) => setMenuItemName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                        <select
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none"
                          value={menuItemCategory}
                          onChange={(e) => setMenuItemCategory(e.target.value)}
                        >
                          <option value="Starter">Starter</option>
                          <option value="Main">Main</option>
                          <option value="Dessert">Dessert</option>
                          <option value="Beverage">Beverage</option>
                          <option value="Alcoholic">Alcoholic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Price ($)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none"
                          value={menuItemPrice}
                          onChange={(e) => setMenuItemPrice(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description (Optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Brief description of the dish/beverage..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-800"
                        value={menuItemDescription}
                        onChange={(e) => setMenuItemDescription(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Link to Warehouse Inventory Stock Item (Optional)</label>
                      <select
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none"
                        value={menuItemProductId}
                        onChange={(e) => setMenuItemProductId(e.target.value)}
                      >
                        <option value="">-- No link (Raw or Untracked) --</option>
                        {db.products.map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} ({prod.category})
                          </option>
                        ))}
                      </select>
                      <span className="block text-[9px] text-slate-400 mt-1 italic">
                        Links sales of this item to trigger automated inventory stock decreases on fulfillment.
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id="menuItemAvailable"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        checked={menuItemAvailable}
                        onChange={(e) => setMenuItemAvailable(e.target.checked)}
                      />
                      <label htmlFor="menuItemAvailable" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        Mark as Available for Order
                      </label>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white rounded-xl font-bold text-xs transition cursor-pointer"
                      >
                        {editingMenuItem ? 'Update Item' : 'Add to Catalog'}
                      </button>
                      
                      {editingMenuItem && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMenuItem(null);
                            setMenuItemName('');
                            setMenuItemCategory('Main');
                            setMenuItemPrice('');
                            setMenuItemDescription('');
                            setMenuItemAvailable(true);
                            setMenuItemProductId('');
                            setMenuErrorMessage('');
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* TAB 6: RIGHT SPLIT SCREEN INTERACTIVE THERMAL PRINTER SPOOLER */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between h-fit">
            
            {/* Header / Configurator */}
            <div className="space-y-3 pb-3.5 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Printer className="h-4 w-4 text-green-400 animate-pulse" />
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Thermal 80mm Printer Spooler</h3>
                </div>
                <span className="px-1.5 py-0.5 bg-green-950 text-green-400 border border-green-800 rounded font-mono text-[8px] font-bold">ONLINE</span>
              </div>

              {/* Hardware Connection emulator */}
              <div className="space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="block text-[8px] uppercase font-bold text-slate-500 tracking-wider">Active Output Protocol</span>
                <select
                  value={printerConfig}
                  onChange={(e) => {
                    setPrinterConfig(e.target.value as any);
                    setPrintToast(`Switched printer output protocol to: ${e.target.value}`);
                  }}
                  className="w-full bg-transparent text-[11px] font-bold text-amber-400 border-none outline-none focus:ring-0 cursor-pointer"
                >
                  <option value="Network">Network Ethernet Printer (Port 9100)</option>
                  <option value="USB">Direct USB Spooler Interface</option>
                  <option value="WiFi">802.11 WiFi Thermal Connection</option>
                  <option value="Bluetooth">Bluetooth v5.0 Thermal (POS-80)</option>
                  <option value="QZ Tray">QZ Tray Automated Background API</option>
                  <option value="PrintNode">PrintNode Cloud Print API</option>
                  <option value="Epson ePOS">Epson ePOS XML Gateway</option>
                </select>
                <span className="block text-[8px] text-slate-400 italic">No browser print dialog required. Auto print enabled.</span>
              </div>
            </div>

            {/* Print Logs Spool Feed List */}
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {printerJobs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono italic">
                  [Printer Feed Idle - No tickets spooled in active session]
                </div>
              ) : (
                printerJobs.map(job => (
                  <div key={job.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2 animate-fadeIn relative">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold font-mono tracking-wide ${job.isReprint ? 'text-red-400' : 'text-green-400'}`}>
                        {job.isReprint ? '⚠️ REPRINT / COPY' : job.type}
                      </span>
                      <span className="text-slate-500 text-[9px] font-mono">{job.timestamp}</span>
                    </div>
                    
                    {/* Simulated 80mm thermal roll view */}
                    <div className="relative">
                      <pre className="text-[9px] leading-tight text-yellow-100/90 whitespace-pre overflow-x-auto bg-[#1a1f2c] p-3 rounded-lg border border-slate-800 font-mono">
                        {job.content}
                      </pre>
                      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none rounded-b-lg" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {printerJobs.length > 0 && (
              <button
                onClick={() => setPrinterJobs([])}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-[10px] cursor-pointer text-center font-sans mt-2"
              >
                Clear Simulated Paper Feed
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Dynamic Floating Toast */}
      {printToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex items-start space-x-3 animate-slideIn">
          <div className="p-2 bg-green-600 rounded-lg text-white shrink-0">
            <Printer className="h-4 w-4 animate-pulse" />
          </div>
          <div className="flex-grow">
            <span className="text-[9px] uppercase font-bold text-green-400 tracking-wider block">Spooler Output Notification</span>
            <span className="text-xs font-semibold text-slate-200">{printToast}</span>
          </div>
          <button 
            onClick={() => setPrintToast(null)}
            className="text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}

// Subcomponent: Live Kitchen Ticket Card
interface KDSOrderCardProps {
  key?: string;
  order: RestaurantOrder;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onCancel: (orderId: string) => void;
  onReprintKOT: (order: RestaurantOrder) => void;
  onReprintReceipt: (order: RestaurantOrder) => void;
  onEdit: (order: RestaurantOrder) => void;
  role: 'Cashier' | 'Kitchen' | 'Restaurant Manager' | 'Admin';
  db: any;
}

function KDSOrderCard({ order, onUpdateStatus, onCancel, onReprintKOT, onReprintReceipt, onEdit, role, db }: KDSOrderCardProps) {
  const tableLabel = order.tableId ? (db.restaurantTables.find((t: any) => t.id === order.tableId)?.tableNumber || 'Table Option') : 'Walk-In';
  const foodItems = order.items.filter(it => {
    const menuItem = db.menuItems.find((mi: any) => mi.id === it.menuItemId);
    if (!menuItem) return true;
    const cat = menuItem.category.toLowerCase();
    return !(cat.includes('beverage') || cat.includes('alcoholic') || cat.includes('drink'));
  });

  const isKitchen = ['Kitchen', 'Admin'].includes(role);
  const isManager = ['Restaurant Manager', 'Admin'].includes(role);
  const isCashier = ['Cashier', 'Admin'].includes(role);

  return (
    <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-sm space-y-3 hover:shadow-md transition">
      
      {/* Header meta */}
      <div className="flex items-start justify-between gap-1 border-b pb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-800">{order.orderNumber}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">KOT: {order.kotNumber || 'N/A'}</span>
          <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block bg-slate-50 px-1 rounded inline-block">
            {order.orderType === 'Dine In' ? `Table: ${tableLabel}` :
             order.orderType === 'Room Service' ? `Room: ${order.roomNumber}` : 'Take Away'}
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-400 shrink-0">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>

      {/* Items list */}
      <div className="space-y-1">
        {foodItems.length === 0 ? (
          <span className="text-[10px] text-slate-400 italic block">Drinks only - Served directly</span>
        ) : (
          foodItems.map((it, idx) => (
            <div key={idx} className="flex justify-between items-start text-xs text-slate-700">
              <span className="font-semibold">{it.name}</span>
              <span className="font-bold font-mono text-slate-600 bg-slate-100 px-1.5 rounded">x{it.quantity}</span>
            </div>
          ))
        )}
      </div>

      {order.specialInstructions && (
        <div className="bg-amber-50 p-2 rounded-xl text-[10px] text-amber-800 border border-amber-100 font-medium">
          <strong>Note:</strong> {order.specialInstructions}
        </div>
      )}

      {/* Control Buttons with Role Filtering */}
      <div className="pt-2 border-t space-y-1.5">
        
        {/* Cashier Editing Section */}
        {['New', 'Pending Kitchen'].includes(order.status) && isCashier && (
          <button
            onClick={() => onEdit(order)}
            className="w-full text-center py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
          >
            Edit Order Items
          </button>
        )}

        {/* State Machine Transition Actions */}
        {order.status === 'New' && isKitchen && (
          <button
            onClick={() => onUpdateStatus(order.id, 'Pending Kitchen')}
            className="w-full text-center py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[10px]"
          >
            Accept KOT Order
          </button>
        )}

        {['Pending Kitchen', 'Pending', 'In Kitchen'].includes(order.status) && isKitchen && (
          <button
            onClick={() => onUpdateStatus(order.id, 'Preparing')}
            className="w-full text-center py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px]"
          >
            Start Preparing 🍳
          </button>
        )}

        {order.status === 'Preparing' && isKitchen && (
          <button
            onClick={() => onUpdateStatus(order.id, 'Ready')}
            className="w-full text-center py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] animate-pulse"
          >
            Set Ready to Serve 🔔
          </button>
        )}

        {order.status === 'Ready' && isCashier && (
          <button
            onClick={() => onUpdateStatus(order.id, 'Served')}
            className="w-full text-center py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px]"
          >
            Deliver to Customer
          </button>
        )}

        {order.status === 'Served' && isCashier && (
          <button
            onClick={() => onUpdateStatus(order.id, 'Completed')}
            className="w-full text-center py-1 bg-[#1B4F72] hover:bg-[#153E5B] text-white font-bold rounded-lg text-[10px]"
          >
            Complete Order & Receipt ✅
          </button>
        )}

        {/* Reprinting triggers */}
        <div className="grid grid-cols-2 gap-1">
          {isKitchen && (
            <button
              onClick={() => onReprintKOT(order)}
              className="py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border rounded text-[9px] font-semibold"
              title="Reprint KOT Ticket"
            >
              Reprint KOT
            </button>
          )}

          {isManager && (
            <button
              onClick={() => onReprintReceipt(order)}
              className="py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border rounded text-[9px] font-semibold col-span-1"
              title="Reprint final customer payment receipt"
            >
              Reprint Receipt
            </button>
          )}
        </div>

        {/* Manager Cancel Action */}
        {order.status !== 'Completed' && order.status !== 'Cancelled' && isManager && (
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
                onCancel(order.id);
              }
            }}
            className="w-full text-center py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[9px]"
          >
            Cancel Order
          </button>
        )}
      </div>

    </div>
  );
}
