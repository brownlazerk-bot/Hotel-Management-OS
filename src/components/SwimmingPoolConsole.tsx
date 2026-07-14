import React, { useState, useMemo, useEffect } from 'react';
import { store } from '../db/store';
import { MenuItem, RestaurantOrder, InventoryProduct, LaundryItem } from '../types';
import {
  Waves,
  Thermometer,
  Droplet,
  Users,
  ShieldAlert,
  ShoppingBag,
  Plus,
  Minus,
  Utensils,
  ClipboardList,
  Check,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Sliders,
  DollarSign,
  Layers,
  HelpCircle
} from 'lucide-react';

export default function SwimmingPoolConsole() {
  const [db, setDb] = useState(store.getDb());
  const activeUser = store.getActiveUser();

  // Subscribe to central state changes
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setDb(store.getDb());
    });
    return () => unsubscribe();
  }, []);

  // 1. Live Pool State Parameters (Saved in localStorage for consistency)
  const [poolTemp, setPoolTemp] = useState<number>(() => {
    const val = localStorage.getItem('pool_temp');
    return val ? parseFloat(val) : 27.2;
  });
  const [poolPh, setPoolPh] = useState<number>(() => {
    const val = localStorage.getItem('pool_ph');
    return val ? parseFloat(val) : 7.4;
  });
  const [poolChlorine, setPoolChlorine] = useState<number>(() => {
    const val = localStorage.getItem('pool_chlorine');
    return val ? parseFloat(val) : 2.2;
  });
  const [activeSwimmers, setActiveSwimmers] = useState<number>(() => {
    const val = localStorage.getItem('pool_swimmers');
    return val ? parseInt(val, 10) : 6;
  });
  const [occupiedLoungers, setOccupiedLoungers] = useState<number>(() => {
    const val = localStorage.getItem('pool_loungers');
    return val ? parseInt(val, 10) : 12;
  });

  // Local Towel/Linen Pool Station Counts (Simulated pool-side shelf status)
  const [cleanTowels, setCleanTowels] = useState<number>(() => {
    const val = localStorage.getItem('pool_clean_towels');
    return val ? parseInt(val, 10) : 34;
  });
  const [dirtyTowels, setDirtyTowels] = useState<number>(() => {
    const val = localStorage.getItem('pool_dirty_towels');
    return val ? parseInt(val, 10) : 8;
  });

  // Save changes to local storage
  useEffect(() => {
    localStorage.setItem('pool_temp', poolTemp.toFixed(1));
    localStorage.setItem('pool_ph', poolPh.toFixed(1));
    localStorage.setItem('pool_chlorine', poolChlorine.toFixed(1));
    localStorage.setItem('pool_swimmers', activeSwimmers.toString());
    localStorage.setItem('pool_loungers', occupiedLoungers.toString());
    localStorage.setItem('pool_clean_towels', cleanTowels.toString());
    localStorage.setItem('pool_dirty_towels', dirtyTowels.toString());
  }, [poolTemp, poolPh, poolChlorine, activeSwimmers, occupiedLoungers, cleanTowels, dirtyTowels]);

  // 2. Stock Connection: Find Towels product in Main Warehouse
  // We'll search for products of category "Linen". If none, we'll create or use a placeholder,
  // but let's make sure we find or provision one.
  const towelProduct = useMemo((): InventoryProduct => {
    const found = db.products.find(p => p.category.toLowerCase() === 'linen' || p.name.toLowerCase().includes('towel'));
    if (found) return found;
    
    // Fallback/Default mock towel stock if db is not fully loaded
    return {
      id: 'prod_towels',
      name: 'Luxury Microfiber Pool Towels',
      category: 'Linen',
      unit: 'pcs',
      currentStock: 120,
      minStockAlert: 20,
      unitPrice: 15
    };
  }, [db.products]);

  // Handle Request Clean Towels from warehouse
  const [towelRequestQty, setTowelRequestQty] = useState<number>(10);
  const [launderingRequestQty, setLaunderingRequestQty] = useState<number>(10);
  const [towelAlertMsg, setTowelAlertMsg] = useState<string>('');

  const handleRequestTowels = () => {
    const realProduct = db.products.find(p => p.id === towelProduct.id);
    const availableWarehouseStock = realProduct ? realProduct.currentStock : towelProduct.currentStock;

    if (availableWarehouseStock < towelRequestQty) {
      setTowelAlertMsg(`Insufficient warehouse stock! Only ${availableWarehouseStock} towels available in Central Store.`);
      setTimeout(() => setTowelAlertMsg(''), 5000);
      return;
    }

    // Deduct stock from central inventory
    store.addInventoryMovement(
      towelProduct.id,
      towelRequestQty,
      'Out',
      `Transferred ${towelRequestQty} towels to Swimming Pool station cabinet`
    );

    // Increase clean towels pool-side
    setCleanTowels(prev => prev + towelRequestQty);
    setTowelAlertMsg(`Successfully pulled ${towelRequestQty} towels from Storehouse inventory!`);
    setTimeout(() => setTowelAlertMsg(''), 5000);
  };

  // Handle Sending Dirty Towels to Laundry
  const handleSendToLaundry = () => {
    if (dirtyTowels < launderingRequestQty) {
      setTowelAlertMsg(`Not enough dirty towels at station to send! Current dirty: ${dirtyTowels}`);
      setTimeout(() => setTowelAlertMsg(''), 5000);
      return;
    }

    // Deduct dirty towels from pool station
    setDirtyTowels(prev => Math.max(0, prev - launderingRequestQty));

    // Register active laundry task in Housekeeping & Laundry database
    const laundryTask: LaundryItem = {
      id: `lnd_pool_${Date.now()}`,
      itemType: 'Towels (Pool Side)',
      quantity: launderingRequestQty,
      status: 'Received',
      cost: 0, // Staff/internal operation
      createdAt: new Date().toISOString()
    };

    store.addLaundryItem(laundryTask);

    // Also add to audit logs & notifications
    store.addNotification(
      'Pool Towels Sent to Laundry',
      `Requested laundry washing for ${launderingRequestQty} pool towels. Task queued in Housekeeping.`,
      'maintenance'
    );
    store.addAuditLog(
      'Pool Laundry Request',
      'Pool Side',
      `Sent ${launderingRequestQty} dirty towels to central laundry department`
    );

    setTowelAlertMsg(`Sent ${launderingRequestQty} dirty towels to Central Laundry. Cleaning task assigned!`);
    setTimeout(() => setTowelAlertMsg(''), 5000);
  };

  // 3. Pool Side Order POS (Prices & Ordering)
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [menuCatFilter, setMenuCatFilter] = useState<string>('All');
  
  // Pool Side Client Details
  const [clientName, setClientName] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [chairNumber, setChairNumber] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  
  // Cart state
  const [cart, setCart] = useState<{ menuItem: MenuItem; qty: number }[]>([]);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string>('');

  const filteredMenuItems = useMemo(() => {
    return db.menuItems.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
      const matchCat = menuCatFilter === 'All' || item.category === menuCatFilter;
      return matchSearch && matchCat;
    });
  }, [db.menuItems, menuSearch, menuCatFilter]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { menuItem: item, qty: 1 }];
    });
  };

  const updateCartQty = (itemId: string, diff: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const newQty = i.qty + diff;
          return newQty <= 0 ? null : { ...i, qty: newQty };
        }
        return i;
      }).filter(Boolean) as { menuItem: MenuItem; qty: number }[];
    });
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, i) => sum + i.menuItem.price * i.qty, 0);
  }, [cart]);

  const cartTax = useMemo(() => {
    return cartSubtotal * (db.settings.profile.taxRate / 100);
  }, [cartSubtotal, db.settings.profile.taxRate]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + cartTax;
  }, [cartSubtotal, cartTax]);

  // Handle Placing Order to Client
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orderId = `ord_pool_${Date.now()}`;
    const orderItems = cart.map(i => ({
      menuItemId: i.menuItem.id,
      name: i.menuItem.name,
      quantity: i.qty,
      price: i.menuItem.price
    }));

    const newOrder: RestaurantOrder = {
      id: orderId,
      orderNumber: `PL-${Date.now().toString().slice(-4)}`,
      orderType: 'Room Service', // Fallback type, pool orders behave as poolside service
      roomNumber: roomNumber || 'Pool Side',
      customerName: clientName || `Pool Guest - Chair ${chairNumber || 'N/A'}`,
      specialInstructions: `[POOL SIDE ORDER] Chair/Cabana: ${chairNumber || 'N/A'}. ${specialNotes || ''}`,
      waiterId: activeUser?.id || 'usr_waiter',
      items: orderItems,
      subtotal: cartSubtotal,
      tax: cartTax,
      discount: 0,
      total: cartTotal,
      status: 'New',
      createdAt: new Date().toISOString()
    };

    // Add order to central restaurant order queue
    store.addRestaurantOrder(newOrder);

    // Simulate dirty towel creation (guests ordering food/beverages at pool use towels!)
    setDirtyTowels(prev => prev + Math.floor(Math.random() * 2) + 1);

    // Clear state
    setCart([]);
    setClientName('');
    setRoomNumber('');
    setChairNumber('');
    setSpecialNotes('');
    setOrderSuccessMsg(`Pool order placed successfully! Sent to Kitchen Display queue with chime notification.`);
    setTimeout(() => setOrderSuccessMsg(''), 6000);
  };

  // 4. Daily, Weekly, Monthly Reports Generation Controls
  const [reportPeriod, setReportPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [isReportSaved, setIsReportSaved] = useState<boolean>(false);

  // Compute stats for pool sales & activity
  const poolSalesStats = useMemo(() => {
    const completedPoolOrders = db.restaurantOrders.filter(o => {
      const isPool = o.specialInstructions?.includes('[POOL SIDE ORDER]') || o.roomNumber === 'Pool Side';
      return isPool && (o.status === 'Paid' || o.status === 'Completed' || o.status === 'Served');
    });

    const totalRevenue = completedPoolOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrdersCount = completedPoolOrders.length;
    const itemsSoldList: { name: string; qty: number; revenue: number }[] = [];

    completedPoolOrders.forEach(o => {
      o.items.forEach(it => {
        const existing = itemsSoldList.find(i => i.name === it.name);
        if (existing) {
          existing.qty += it.quantity;
          existing.revenue += it.price * it.quantity;
        } else {
          itemsSoldList.push({ name: it.name, qty: it.quantity, revenue: it.price * it.quantity });
        }
      });
    });

    return {
      totalRevenue,
      totalOrdersCount,
      itemsSold: itemsSoldList.sort((a, b) => b.qty - a.qty).slice(0, 5)
    };
  }, [db.restaurantOrders]);

  const handleSaveReport = () => {
    setIsReportSaved(true);
    store.addAuditLog(
      'Pool Operational Report Compile',
      'Pool Side',
      `Compiled and saved ${reportPeriod} pool operations summary. Revenue: ${store.formatMoney(poolSalesStats.totalRevenue)}`
    );
    setTimeout(() => setIsReportSaved(false), 4000);
  };

  // Check pH and Chlorine levels for warnings
  const isPhUnsafe = poolPh < 7.2 || poolPh > 7.6;
  const isChlorineUnsafe = poolChlorine < 1.5 || poolChlorine > 3.0;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Pool Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-600 to-cyan-700 text-white p-6 rounded-3xl shadow-md border border-sky-500 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-6 -translate-y-6">
          <Waves className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Waves className="h-6 w-6 text-cyan-200 animate-pulse" />
              <span>Imperial Swimming Pool Operation Console</span>
              <span className="text-[10px] uppercase font-mono tracking-wider bg-sky-400/25 text-cyan-200 px-2 py-0.5 rounded border border-sky-400/30">
                Live Sub-system
              </span>
            </h1>
            <p className="text-xs text-sky-100 mt-1 max-w-2xl">
              Real-time monitoring of water chemistry, pool loungers occupancy, linen towel stock rotation with Central Storehouse, and poolside guest order POS dispatch.
            </p>
          </div>
          <div className="bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/10 text-xs font-semibold self-start md:self-center">
            Operating Currency: <strong className="font-mono">{db.settings.profile.currency}</strong>
          </div>
        </div>
      </div>

      {/* Grid Layout: Controls, Stock, Ordering, Reports */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Column 1: Water Chemistry & Guest Density */}
        <div className="space-y-6">
          
          {/* Water & State Parameters Card */}
          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-sky-600" /> Chemistry & Environment
              </h3>
              <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-bold">Live Status</span>
            </div>

            {/* pH level dial */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5 text-blue-500" /> Water pH Level
                </span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                  isPhUnsafe ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-green-100 text-green-700'
                }`}>
                  {poolPh.toFixed(1)} pH {isPhUnsafe ? '⚠️ Unsafe' : '✓ Safe'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPoolPh(prev => Math.max(6.0, prev - 0.1))}
                  className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-350 ${isPhUnsafe ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${((poolPh - 6.0) / 2.5) * 100}%` }}
                  />
                  <div className="absolute left-[56%] top-0 h-full w-0.5 bg-slate-400" title="Safe pH Center" />
                </div>
                <button 
                  onClick={() => setPoolPh(prev => Math.min(8.5, prev + 0.1))}
                  className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[9px] text-slate-400">Target range: 7.2 to 7.6. Current level: {poolPh < 7.2 ? 'Acidic - raise soda ash' : poolPh > 7.6 ? 'Alkaline - add acid' : 'Nominal balance'}</p>
            </div>

            {/* Chlorine concentration dial */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5 text-emerald-500" /> Chlorine Density
                </span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                  isChlorineUnsafe ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-green-100 text-green-700'
                }`}>
                  {poolChlorine.toFixed(1)} ppm {isChlorineUnsafe ? '⚠️ Unsafe' : '✓ Safe'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPoolChlorine(prev => Math.max(0.5, prev - 0.1))}
                  className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-350 ${isChlorineUnsafe ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${((poolChlorine - 0.5) / 3.5) * 100}%` }}
                  />
                </div>
                <button 
                  onClick={() => setPoolChlorine(prev => Math.min(4.0, prev + 0.1))}
                  className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[9px] text-slate-400">Target range: 1.5 to 3.0 ppm. Current density: {poolChlorine < 1.5 ? 'Low sanitization - request chlorination' : poolChlorine > 3.0 ? 'High concentration - pause chlorinator' : 'Standard sanitization active'}</p>
            </div>

            {/* Pool Temperature control */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-rose-500" /> Heating Temperature
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {poolTemp.toFixed(1)} °C
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPoolTemp(prev => Math.max(20.0, prev - 0.5))}
                  className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-rose-500 transition-all duration-350"
                    style={{ width: `${((poolTemp - 20.0) / 15.0) * 100}%` }}
                  />
                </div>
                <button 
                  onClick={() => setPoolTemp(prev => Math.min(35.0, prev + 0.5))}
                  className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Safe operational alerts banner */}
            {(isPhUnsafe || isChlorineUnsafe) && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start space-x-2 text-[10px] font-bold animate-fadeIn">
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span>WATER CHEMISTRY ALARM TRIGGERED!</span>
                  <p className="font-normal text-[9px] text-rose-600 mt-0.5">Automated dosing pump is injecting corrective solution. Avoid heavy swimming sessions until numbers settle.</p>
                </div>
              </div>
            )}
          </div>

          {/* Guest Density Card */}
          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" /> Pool Side Density
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold font-mono">Live load</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Swimmers in Water</span>
                <strong className="text-xl font-extrabold text-slate-800 block mt-1">{activeSwimmers}</strong>
                <div className="mt-2 flex items-center justify-center space-x-2">
                  <button 
                    onClick={() => setActiveSwimmers(prev => Math.max(0, prev - 1))}
                    className="p-1 bg-white border rounded hover:bg-slate-100"
                  >
                    <Minus className="h-3 w-3 text-slate-600" />
                  </button>
                  <button 
                    onClick={() => setActiveSwimmers(prev => prev + 1)}
                    className="p-1 bg-white border rounded hover:bg-slate-100"
                  >
                    <Plus className="h-3 w-3 text-slate-600" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Loungers Occupied</span>
                <strong className="text-xl font-extrabold text-slate-800 block mt-1">{occupiedLoungers} / 30</strong>
                <div className="mt-2 flex items-center justify-center space-x-2">
                  <button 
                    onClick={() => setOccupiedLoungers(prev => Math.max(0, prev - 1))}
                    className="p-1 bg-white border rounded hover:bg-slate-100"
                  >
                    <Minus className="h-3 w-3 text-slate-600" />
                  </button>
                  <button 
                    onClick={() => setOccupiedLoungers(prev => Math.min(30, prev + 1))}
                    className="p-1 bg-white border rounded hover:bg-slate-100"
                  >
                    <Plus className="h-3 w-3 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Column 2: Towel & Linen Stock rotation */}
        <div className="space-y-6">
          
          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-600" /> Pool Linen Towel Control
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black uppercase">
                Stock Connection
              </span>
            </div>

            {/* Towel cabinet counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Clean Towels Ready</span>
                <strong className={`text-2xl font-black block mt-1 ${cleanTowels < 10 ? 'text-rose-600 animate-pulse' : 'text-emerald-700'}`}>
                  {cleanTowels}
                </strong>
                <span className="text-[9px] text-slate-400">At pool rack shelf</span>
              </div>

              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-2xl text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Dirty Towels Collected</span>
                <strong className="text-2xl font-black text-amber-700 block mt-1">{dirtyTowels}</strong>
                <span className="text-[9px] text-slate-400">Awaiting laundry wash</span>
              </div>
            </div>

            {/* Stock Sync info panel */}
            <div className="p-3.5 bg-slate-50 border border-gray-150 rounded-2xl text-xs space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Warehouse Product:</span>
                <span className="text-indigo-700 uppercase font-mono">{towelProduct.name}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Central Warehouse Stock:</span>
                <span className="font-mono bg-indigo-50 text-[#1B4F72] px-2 py-0.5 rounded font-black">
                  {db.products.find(p => p.id === towelProduct.id)?.currentStock ?? towelProduct.currentStock} {towelProduct.unit}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Towels pulled from inventory decrement central warehouse stock. Sent dirty towels are logged as direct laundry workflows to Housekeeping.
              </p>
            </div>

            {/* Action 1: Pull from warehouse */}
            <div className="space-y-2 pt-2 border-t border-dashed">
              <div className="flex justify-between items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pull clean towels quantity:</label>
                <input 
                  type="number"
                  min={1}
                  className="w-16 px-1.5 py-0.5 border rounded text-xs font-mono font-bold text-right text-slate-800 bg-white focus:outline-none"
                  value={towelRequestQty}
                  onChange={(e) => setTowelRequestQty(Number(e.target.value))}
                />
              </div>
              <button
                onClick={handleRequestTowels}
                className="w-full py-2 bg-[#1B4F72] hover:bg-[#153E5B] text-white text-xs font-black rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Pull Stock to Pool Rack</span>
              </button>
            </div>

            {/* Action 2: Dispatch to laundry */}
            <div className="space-y-2 pt-2 border-t border-dashed">
              <div className="flex justify-between items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Send dirty to laundry qty:</label>
                <input 
                  type="number"
                  min={1}
                  className="w-16 px-1.5 py-0.5 border rounded text-xs font-mono font-bold text-right text-slate-800 bg-white focus:outline-none"
                  value={launderingRequestQty}
                  onChange={(e) => setLaunderingRequestQty(Number(e.target.value))}
                />
              </div>
              <button
                onClick={handleSendToLaundry}
                disabled={dirtyTowels === 0}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Dispatch to Central Laundry</span>
              </button>
            </div>

            {/* Alert / Feedback message */}
            {towelAlertMsg && (
              <div className="p-2.5 bg-sky-50 border border-sky-150 text-sky-700 rounded-xl text-center text-[10px] font-bold animate-fadeIn">
                {towelAlertMsg}
              </div>
            )}
          </div>

        </div>

        {/* Column 3: Daily, Weekly, Monthly Reports Generation Control */}
        <div className="space-y-6">
          
          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-sky-600" /> Pool Side Operational Reports
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Consolidated</span>
            </div>

            {/* Reports Period selector */}
            <div className="grid grid-cols-3 gap-1.5">
              {(['Daily', 'Weekly', 'Monthly'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={`py-1 text-[10px] font-bold rounded-xl border text-center cursor-pointer transition ${
                    reportPeriod === p 
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                      : 'bg-white text-slate-500 border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  {p} Report
                </button>
              ))}
            </div>

            {/* Dynamic Consolidated numbers */}
            <div className="p-4 bg-slate-50/60 rounded-2xl border border-gray-150 space-y-3.5 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Period context:</span>
                <span className="font-bold text-slate-800 bg-sky-100/50 text-sky-800 px-2.5 py-0.5 rounded border border-sky-200">
                  {reportPeriod} Scope
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">F&B Orders Completed:</span>
                <strong className="font-mono text-slate-800">{poolSalesStats.totalOrdersCount} orders</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Total F&B Pool Revenue:</span>
                <strong className="font-mono text-indigo-700 text-sm font-black">{store.formatMoney(poolSalesStats.totalRevenue)}</strong>
              </div>
              <div className="flex justify-between items-center border-t border-dashed pt-2">
                <span className="font-semibold text-slate-500">Towels Used At Station:</span>
                <strong className="font-mono text-slate-800">{cleanTowels + dirtyTowels} items</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Active Pool Guest Density:</span>
                <strong className="font-mono text-slate-800">{activeSwimmers} guests</strong>
              </div>
            </div>

            {/* List of sold pool-side items */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top Pool-Side Items Sold</span>
              <div className="bg-white border rounded-2xl p-3 max-h-36 overflow-y-auto space-y-2">
                {poolSalesStats.itemsSold.length === 0 ? (
                  <p className="text-center py-6 text-[11px] text-slate-400 font-semibold">No sales logged under this scope.</p>
                ) : (
                  poolSalesStats.itemsSold.map((it, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">{it.qty}x {it.name}</span>
                      <span className="font-mono text-slate-400 font-bold">{store.formatMoney(it.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Compile button */}
            <button
              onClick={handleSaveReport}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5 shadow"
            >
              <Check className="h-4 w-4" />
              <span>Compile & Archive Pool Report</span>
            </button>

            {isReportSaved && (
              <div className="p-2 bg-emerald-50 border border-emerald-150 text-emerald-700 rounded-xl text-center text-[10px] font-bold animate-fadeIn">
                ✓ Report generated, certified by Operator, and dispatched to Shift Reconciliation Audit Ledger!
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Column 4: Pool Side Order POS Terminal (Takes full screen width below the indicators) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Utensils className="h-4 w-4 text-sky-600" /> Pool-Side Dining Order Terminal
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Quickly order food and beverages for guests currently resting at the pool side or in luxury cabanas.</p>
          </div>

          <div className="flex space-x-1.5 bg-gray-50 p-1 rounded-xl border border-gray-150 overflow-x-auto max-w-full">
            {['All', 'Beverage', 'Alcoholic', 'Main', 'Starter', 'Dessert'].map(cat => (
              <button
                key={cat}
                onClick={() => setMenuCatFilter(cat)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition whitespace-nowrap ${
                  menuCatFilter === cat ? 'bg-white text-gray-800 border border-gray-150 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search F&B products..."
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs w-48 font-semibold focus:outline-none"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
          />
        </div>

        {/* Double column: Items selection + Cart order form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* F&B Items List */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
            {filteredMenuItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 font-semibold">
                No matching food or beverage items found.
              </div>
            ) : (
              filteredMenuItems.map(item => {
                const product = item.productId ? db.products.find(p => p.id === item.productId) : null;
                const stock = product ? product.currentStock : null;
                const isOos = (stock !== null && stock <= 0) || !item.isAvailable;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isOos) return;
                      addToCart(item);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col justify-between h-24 transition ${
                      isOos 
                        ? 'bg-rose-50/40 border-rose-150 opacity-55 cursor-not-allowed' 
                        : 'bg-slate-50/50 border-gray-150 cursor-pointer hover:bg-sky-50/20 hover:border-sky-200'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <strong className="text-[11px] text-slate-800 block font-bold truncate">{item.name}</strong>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          isOos ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                        }`}>
                          {isOos ? 'OOS' : `${item.category}`}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide font-medium">F&B Catalog</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-black text-slate-800">{store.formatMoney(item.price)}</strong>
                      <span className="text-[8px] text-slate-400 font-mono">
                        {stock !== null ? `Stock: ${stock}` : 'Pantry Supplied'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart & Customer details form */}
          <div className="bg-slate-50/70 p-4 border border-gray-150 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Poolside Order Cart</h4>
            
            {cart.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Cart is empty. Click on F&B items on the left to build order.
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item.menuItem.id} className="flex justify-between items-center text-xs bg-white p-2 rounded-xl border border-gray-100">
                      <div>
                        <span className="font-bold text-slate-800 block leading-tight">{item.menuItem.name}</span>
                        <span className="font-mono text-[9px] text-slate-400 font-semibold">{store.formatMoney(item.menuItem.price)} each</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <button 
                          onClick={() => updateCartQty(item.menuItem.id, -1)}
                          className="p-0.5 bg-slate-100 border rounded hover:bg-slate-200"
                        >
                          <Minus className="h-2.5 w-2.5 text-slate-600" />
                        </button>
                        <strong className="font-mono text-xs">{item.qty}</strong>
                        <button 
                          onClick={() => updateCartQty(item.menuItem.id, 1)}
                          className="p-0.5 bg-slate-100 border rounded hover:bg-slate-200"
                        >
                          <Plus className="h-2.5 w-2.5 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing summary */}
                <div className="text-[11px] font-semibold text-slate-600 space-y-1 bg-white p-3 rounded-xl border">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{store.formatMoney(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT ({db.settings.profile.taxRate}%):</span>
                    <span>{store.formatMoney(cartTax)}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-black text-xs border-t pt-1.5 mt-1.5">
                    <span>Grand Total:</span>
                    <span className="text-indigo-700">{store.formatMoney(cartTotal)}</span>
                  </div>
                </div>

                {/* Form controls */}
                <form onSubmit={handlePlaceOrder} className="space-y-2.5 text-xs text-slate-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Room / Guest ID</label>
                      <input 
                        type="text"
                        placeholder="e.g. Room 201"
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Chair / Cabana</label>
                      <input 
                        type="text"
                        placeholder="e.g. Cabana B-4"
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        value={chairNumber}
                        onChange={(e) => setChairNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Client Name / Label</label>
                    <input 
                      type="text"
                      placeholder="e.g. Dr. Evelyn Chen"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Kitchen / Bar Special Notes</label>
                    <input 
                      type="text"
                      placeholder="e.g. Extra ice, chili on side"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5 shadow"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Dispatch Poolside Order</span>
                  </button>
                </form>
              </div>
            )}

            {orderSuccessMsg && (
              <div className="p-3 bg-green-50 border border-green-250 text-green-700 rounded-xl text-[10px] font-bold leading-normal animate-fadeIn">
                {orderSuccessMsg}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
