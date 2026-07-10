/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HotelOSDatabase,
  HotelOSSettings,
  User,
  Role,
  Department,
  Employee,
  Attendance,
  Payroll,
  Guest,
  RoomType,
  Room,
  Reservation,
  RestaurantTable,
  MenuItem,
  RestaurantOrder,
  InventoryProduct,
  InventoryMovement,
  Supplier,
  PurchaseRequest,
  PurchaseOrder,
  POSSale,
  Account,
  Transaction,
  CleaningTask,
  LaundryItem,
  LostAndFound,
  MaintenanceRequest,
  SystemNotification,
  AuditLog,
  RoomStatus,
  OrderStatus,
  PaymentMethod,
  RoleName,
  Permission,
  DailyShiftReport,
  ConsoleMapping
} from '../types';

// ============================================================================
// INITIAL EMPTY STATE
// ============================================================================

const EMPTY_SETTINGS: HotelOSSettings = {
  profile: {
    name: '',
    logo: '🏨',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
    slogan: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    country: '',
    currency: 'USD',
    timeZone: 'UTC',
    taxNumber: '',
    taxRate: 15
  },
  structure: {
    buildings: [],
    floors: [],
    amenities: ['Wi-Fi', 'Swimming Pool', 'Spa', 'Gym', 'Mini Bar', 'Air Conditioning', 'Room Service']
  },
  theme: 'light',
  language: 'en',
  paymentMethods: ['Cash', 'Card', 'Mobile Money'],
  printerName: 'Default PDF Printer',
  autoBackup: true
};

const DEFAULT_ROLES: Role[] = [
  { id: '1', name: 'Super Admin', description: 'Complete system control and administration.', permissions: ['all'] },
  { id: '2', name: 'CEO', description: 'Strategic view and full reports approval.', permissions: ['view_dashboard', 'view_reports', 'manage_settings'] },
  { id: '3', name: 'Manager', description: 'Overhead management and operational views.', permissions: ['view_dashboard', 'manage_guests', 'manage_rooms', 'manage_restaurant', 'manage_pos', 'manage_inventory', 'manage_purchasing', 'manage_accounting', 'manage_hr', 'manage_attendance', 'manage_payroll', 'manage_housekeeping', 'manage_maintenance', 'view_reports'] },
  { id: '4', name: 'Receptionist', description: 'Guest front desk agent.', permissions: ['view_dashboard', 'manage_guests', 'manage_rooms', 'manage_housekeeping', 'view_reports'] },
  { id: '5', name: 'Accountant', description: 'Financial ledger manager.', permissions: ['view_dashboard', 'manage_accounting', 'manage_payroll', 'manage_purchasing', 'view_reports'] },
  { id: '6', name: 'Cashier', description: 'Point of Sale payment specialist.', permissions: ['view_dashboard', 'manage_pos'] },
  { id: '7', name: 'Waiter', description: 'Restaurant order management.', permissions: ['manage_restaurant'] },
  { id: '8', name: 'Chef', description: 'Kitchen queue operator.', permissions: ['manage_restaurant'] },
  { id: '9', name: 'Housekeeper', description: 'Room cleaning and sanitizing technician.', permissions: ['manage_housekeeping'] },
  { id: '10', name: 'Storekeeper', description: 'Stock room guard.', permissions: ['manage_inventory', 'manage_purchasing'] },
  { id: '11', name: 'Maintenance Staff', description: 'Facility engineering team member.', permissions: ['manage_maintenance'] },
  { id: '12', name: 'Security', description: 'Hotel property security agent.', permissions: ['view_dashboard'] }
];

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc_1', name: 'Operating Cash Drawer', type: 'Asset', balance: 0 },
  { id: 'acc_2', name: 'Main Corporate Bank Account', type: 'Asset', balance: 0 },
  { id: 'acc_3', name: 'Petty Cash Ledger', type: 'Asset', balance: 0 }
];

const INITIAL_STATE: HotelOSDatabase = {
  settings: EMPTY_SETTINGS,
  users: [],
  roles: DEFAULT_ROLES,
  departments: [],
  employees: [],
  attendance: [],
  payroll: [],
  guests: [],
  roomTypes: [],
  rooms: [],
  reservations: [],
  restaurantTables: [],
  menuItems: [],
  restaurantOrders: [],
  products: [],
  inventoryMovements: [],
  suppliers: [],
  purchaseRequests: [],
  purchaseOrders: [],
  sales: [],
  accounts: DEFAULT_ACCOUNTS,
  transactions: [],
  cleaningTasks: [],
  laundryItems: [],
  lostAndFound: [],
  maintenanceRequests: [],
  notifications: [],
  auditLogs: [],
  shiftReports: [],
  isInitialized: false
};

// ============================================================================
// STORE ENGINE CLASS
// ============================================================================

class HotelStore {
  private db: HotelOSDatabase;
  private listeners: Set<() => void> = new Set();
  private activeUser: User | null = null;

  constructor() {
    this.db = this.loadFromStorage();
    
    // Check if session exists in sessionStorage
    const storedUser = sessionStorage.getItem('hotel_os_session');
    if (storedUser) {
      try {
        this.activeUser = JSON.parse(storedUser);
      } catch (e) {
        this.activeUser = null;
      }
    }
  }

  public getDefaultConsoleMappings(): ConsoleMapping[] {
    return [
      { consoleId: 'rooms', consoleName: 'Rooms & Front Desk', departmentId: 'dept_reception' },
      { consoleId: 'pos', consoleName: 'Food & Dining POS', departmentId: 'dept_restaurant' },
      { consoleId: 'inventory', consoleName: 'Inventory & Procurement', departmentId: 'dept_restaurant' },
      { consoleId: 'reports', consoleName: 'Shift Reconciliation', departmentId: 'dept_finance' },
      { consoleId: 'finance', consoleName: 'HR & Ledger', departmentId: 'dept_finance' },
      { consoleId: 'housekeeping', consoleName: 'Housekeeping & Maintenance', departmentId: 'dept_housekeeping' },
      { consoleId: 'settings', consoleName: 'Settings', departmentId: 'dept_reception' }
    ];
  }

  private loadFromStorage(): HotelOSDatabase {
    try {
      const stored = localStorage.getItem('hotel_os_database');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...INITIAL_STATE,
          ...parsed,
          shiftReports: parsed.shiftReports || [],
          consoleMappings: parsed.consoleMappings || this.getDefaultConsoleMappings()
        };
      }
    } catch (e) {
      console.error('Failed to load database from localStorage, initializing fresh', e);
    }
    return { 
      ...INITIAL_STATE,
      consoleMappings: this.getDefaultConsoleMappings()
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('hotel_os_database', JSON.stringify(this.db));
      this.notify();
    } catch (e) {
      console.error('Failed to save database to localStorage', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  // ============================================================================
  // AUTHENTICATION & SESSIONS
  // ============================================================================

  public login(username: string, passwordPlain: string): { success: boolean; error?: string } {
    const user = this.db.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.isActive
    );
    if (!user) {
      return { success: false, error: 'User not found or is inactive' };
    }
    if (user.passwordHash !== passwordPlain) {
      return { success: false, error: 'Invalid password' };
    }

    this.activeUser = user;
    sessionStorage.setItem('hotel_os_session', JSON.stringify(user));
    this.addAuditLog('User Login', 'Authentication', `User ${user.username} logged in successfully`);
    this.notify();
    return { success: true };
  }

  public logout(): void {
    if (this.activeUser) {
      this.addAuditLog('User Logout', 'Authentication', `User ${this.activeUser.username} logged out`);
    }
    this.activeUser = null;
    sessionStorage.removeItem('hotel_os_session');
    this.notify();
  }

  public getActiveUser(): User | null {
    return this.activeUser;
  }

  public hasPermission(perm: Permission): boolean {
    if (!this.activeUser) return false;
    if (this.activeUser.role === 'Super Admin') return true;
    
    const roleObj = this.db.roles.find(r => r.name === this.activeUser?.role);
    if (!roleObj) return false;
    
    return roleObj.permissions.includes('all') || roleObj.permissions.includes(perm);
  }

  // ============================================================================
  // DATABASE EXPORT, RESET, & SEED
  // ============================================================================

  public getDb(): HotelOSDatabase {
    return this.db;
  }

  public resetDatabase(): void {
    this.db = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.activeUser = null;
    sessionStorage.removeItem('hotel_os_session');
    localStorage.removeItem('hotel_os_database');
    this.notify();
  }

  public restoreDatabase(restored: HotelOSDatabase): void {
    this.db = restored;
    this.saveToStorage();
    this.addAuditLog('Database Restore', 'Settings', 'Database was fully restored from a backup file');
  }

  // ============================================================================
  // DATABASE WRITES & TRANSACTIONS
  // ============================================================================

  public addAuditLog(action: string, module: string, details: string): void {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: this.activeUser?.id || 'system',
      username: this.activeUser?.username || 'System Engine',
      action,
      module,
      details,
      createdAt: new Date().toISOString()
    };
    this.db.auditLogs.unshift(log); // newest first
    // Limit to 500 audit logs to save localstorage space
    if (this.db.auditLogs.length > 500) {
      this.db.auditLogs.pop();
    }
    this.saveToStorage();
  }

  public addNotification(title: string, message: string, type: SystemNotification['type']): void {
    const notif: SystemNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.db.notifications.unshift(notif);
    this.saveToStorage();
  }

  public markNotificationRead(id: string): void {
    this.db.notifications = this.db.notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.saveToStorage();
  }

  public markAllNotificationsRead(): void {
    this.db.notifications = this.db.notifications.map(n => ({ ...n, isRead: true }));
    this.saveToStorage();
  }

  public updateSettings(settings: HotelOSSettings): void {
    this.db.settings = settings;
    this.saveToStorage();
    this.addAuditLog('Update Settings', 'Settings', 'Hotel global settings were updated');
  }

  public clearNotifications(): void {
    this.db.notifications = [];
    this.saveToStorage();
  }

  // INITIAL SETUP WIZARD WRITE
  public initializeSystem(settings: HotelOSSettings, superAdminUser: User): void {
    this.db.settings = { ...settings, autoBackup: true };
    
    // Add Super Admin User
    const existingAdminIndex = this.db.users.findIndex(u => u.role === 'Super Admin');
    if (existingAdminIndex !== -1) {
      this.db.users[existingAdminIndex] = superAdminUser;
    } else {
      this.db.users.push(superAdminUser);
    }
    
    this.db.isInitialized = true;
    this.saveToStorage();
    
    // Auto-login newly created Super Admin
    this.activeUser = superAdminUser;
    sessionStorage.setItem('hotel_os_session', JSON.stringify(superAdminUser));
    
    this.addAuditLog('System Initialized', 'Settings', `Hotel OS initialized. Super admin ${superAdminUser.username} created.`);
    this.addNotification('System Setup Complete', 'Welcome to your Hotel OS. System is fully loaded and operational.', 'approval');
  }

  // ============================================================================
  // DATA MANAGEMENT METHODS (CRUD with Relational Rules)
  // ============================================================================

  // ROOM TYPES
  public saveRoomType(type: RoomType): void {
    const index = this.db.roomTypes.findIndex(rt => rt.id === type.id);
    if (index !== -1) {
      this.db.roomTypes[index] = type;
      this.addAuditLog('Update Room Type', 'Rooms', `Updated room type ${type.name}`);
    } else {
      this.db.roomTypes.push(type);
      this.addAuditLog('Add Room Type', 'Rooms', `Created room type ${type.name}`);
    }
    this.saveToStorage();
  }

  public deleteRoomType(id: string): { success: boolean; error?: string } {
    const linkedRooms = this.db.rooms.filter(r => r.roomTypeId === id);
    if (linkedRooms.length > 0) {
      return { success: false, error: `Cannot delete room type because it is linked to ${linkedRooms.length} rooms` };
    }
    this.db.roomTypes = this.db.roomTypes.filter(rt => rt.id !== id);
    this.addAuditLog('Delete Room Type', 'Rooms', `Deleted room type ${id}`);
    this.saveToStorage();
    return { success: true };
  }

  // ROOMS
  public saveRoom(room: Room): void {
    const index = this.db.rooms.findIndex(r => r.id === room.id);
    if (index !== -1) {
      const oldRoom = this.db.rooms[index];
      this.db.rooms[index] = room;
      this.addAuditLog('Update Room', 'Rooms', `Updated room ${room.roomNumber} (Status changed from ${oldRoom.status} to ${room.status})`);
    } else {
      this.db.rooms.push(room);
      this.addAuditLog('Add Room', 'Rooms', `Created room ${room.roomNumber}`);
    }
    this.saveToStorage();
  }

  public deleteRoom(id: string): { success: boolean; error?: string } {
    const linkedReservations = this.db.reservations.filter(r => r.roomId === id && r.status !== 'Checked Out' && r.status !== 'Cancelled');
    if (linkedReservations.length > 0) {
      return { success: false, error: 'Cannot delete room with active reservations' };
    }
    this.db.rooms = this.db.rooms.filter(r => r.id !== id);
    this.addAuditLog('Delete Room', 'Rooms', `Deleted room ${id}`);
    this.saveToStorage();
    return { success: true };
  }

  // STAFF & DEPARTMENTS
  public saveConsoleMapping(mapping: ConsoleMapping): void {
    if (!this.db.consoleMappings) {
      this.db.consoleMappings = this.getDefaultConsoleMappings();
    }
    const index = this.db.consoleMappings.findIndex(m => m.consoleId === mapping.consoleId);
    if (index !== -1) {
      this.db.consoleMappings[index] = mapping;
    } else {
      this.db.consoleMappings.push(mapping);
    }
    this.addAuditLog('Update Console Mapping', 'Settings', `Mapped console ${mapping.consoleName} to department ${mapping.departmentId}`);
    this.saveToStorage();
  }

  public saveDepartment(dept: Department): void {
    const index = this.db.departments.findIndex(d => d.id === dept.id);
    if (index !== -1) {
      this.db.departments[index] = dept;
      this.addAuditLog('Update Department', 'HR', `Updated department ${dept.name}`);
    } else {
      this.db.departments.push(dept);
      this.addAuditLog('Add Department', 'HR', `Created department ${dept.name}`);
    }
    this.saveToStorage();
  }

  public saveEmployee(emp: Employee): void {
    const index = this.db.employees.findIndex(e => e.id === emp.id);
    if (index !== -1) {
      this.db.employees[index] = emp;
      this.addAuditLog('Update Employee', 'HR', `Updated employee ${emp.firstName} ${emp.lastName}`);
    } else {
      this.db.employees.push(emp);
      this.addAuditLog('Add Employee', 'HR', `Registered employee ${emp.firstName} ${emp.lastName}`);
    }
    this.saveToStorage();
  }

  public saveUser(user: User): void {
    const index = this.db.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      this.db.users[index] = user;
      this.addAuditLog('Update User', 'Settings', `Updated user ${user.username}`);
    } else {
      this.db.users.push(user);
      this.addAuditLog('Add User', 'Settings', `Created user ${user.username}`);
    }
    this.saveToStorage();
  }

  // GUESTS
  public saveGuest(guest: Guest): void {
    const index = this.db.guests.findIndex(g => g.id === guest.id);
    if (index !== -1) {
      this.db.guests[index] = guest;
      this.addAuditLog('Update Guest', 'Front Office', `Updated guest profile ${guest.firstName} ${guest.lastName}`);
    } else {
      this.db.guests.push(guest);
      this.addAuditLog('Add Guest', 'Front Office', `Created guest profile ${guest.firstName} ${guest.lastName}`);
    }
    this.saveToStorage();
  }

  // RESERVATIONS & BOOKINGS (Connected checkout/checkin)
  public saveReservation(res: Reservation): void {
    const index = this.db.reservations.findIndex(r => r.id === res.id);
    const room = this.db.rooms.find(r => r.id === res.roomId);
    
    if (index !== -1) {
      const oldRes = this.db.reservations[index];
      this.db.reservations[index] = res;
      this.addAuditLog('Update Reservation', 'Front Office', `Updated reservation for Guest ${res.guestId} in Room ${room?.roomNumber}`);

      // Handle Reservation status effects
      if (res.status === 'Checked In' && oldRes.status !== 'Checked In') {
        this.performCheckIn(res.id);
      } else if (res.status === 'Checked Out' && oldRes.status !== 'Checked Out') {
        this.performCheckOut(res.id, 'Cash'); // Default checkout method, handled below
      }
    } else {
      this.db.reservations.push(res);
      this.addAuditLog('Add Reservation', 'Front Office', `Created reservation in Room ${room?.roomNumber}`);
      
      // Auto-set room to reserved if checkin date is today
      const todayStr = new Date().toISOString().split('T')[0];
      if (res.checkInDate === todayStr && room && room.status === 'Available') {
        room.status = 'Reserved';
        room.currentReservationId = res.id;
      }
    }
    this.saveToStorage();
  }

  public performCheckIn(resId: string): void {
    const res = this.db.reservations.find(r => r.id === resId);
    if (!res) return;

    res.status = 'Checked In';
    const room = this.db.rooms.find(r => r.id === res.roomId);
    if (room) {
      room.status = 'Occupied';
      room.currentReservationId = res.id;
    }

    this.addAuditLog('Guest Check-In', 'Front Office', `Guest ${res.guestId} checked into room ${room?.roomNumber}`);
    this.addNotification('Guest Checked In', `Room ${room?.roomNumber} is now occupied by guest.`, 'checkin');
    this.saveToStorage();
  }

  public performCheckOut(resId: string, paymentMethod: PaymentMethod): void {
    const res = this.db.reservations.find(r => r.id === resId);
    if (!res) return;

    res.status = 'Checked Out';
    
    // Calculate pending payment
    const remainingToPay = res.totalAmount - res.amountPaid;
    if (remainingToPay > 0) {
      res.amountPaid = res.totalAmount; // Pay full balance on checkout
      
      // Record cashflow transaction
      this.addFinanceTransaction(
        'acc_2', // Main corporate account
        'Income',
        remainingToPay,
        'Room Revenue',
        `Remaining balance checkout settlement for Reservation ${resId}`,
        resId
      );
    }

    const room = this.db.rooms.find(r => r.id === res.roomId);
    if (room) {
      room.status = 'Dirty'; // Room needs cleaning after check-out
      room.currentReservationId = undefined;
      
      // Automatically assign housekeeping task
      this.createHousekeepingTask(room.id, 'High');
    }

    this.addAuditLog('Guest Check-Out', 'Front Office', `Guest ${res.guestId} checked out of room ${room?.roomNumber}`);
    this.addNotification('Guest Checked Out', `Room ${room?.roomNumber} is now vacant & marked Dirty. Housekeeping notified.`, 'checkout');
    this.saveToStorage();
  }

  public performRoomTransfer(resId: string, newRoomId: string): { success: boolean; error?: string } {
    const res = this.db.reservations.find(r => r.id === resId);
    if (!res) return { success: false, error: 'Reservation not found' };

    const oldRoom = this.db.rooms.find(r => r.id === res.roomId);
    const newRoom = this.db.rooms.find(r => r.id === newRoomId);

    if (!newRoom || newRoom.status !== 'Available') {
      return { success: false, error: 'Selected room is not available' };
    }

    // Release old room
    if (oldRoom) {
      oldRoom.status = 'Dirty';
      oldRoom.currentReservationId = undefined;
      this.createHousekeepingTask(oldRoom.id, 'Medium');
    }

    // Assign new room
    res.roomId = newRoomId;
    newRoom.status = 'Occupied';
    newRoom.currentReservationId = resId;

    this.addAuditLog('Room Transfer', 'Front Office', `Transferred Reservation ${resId} from Room ${oldRoom?.roomNumber} to ${newRoom.roomNumber}`);
    this.addNotification('Room Transfer', `Reservation transferred to Room ${newRoom.roomNumber}. Old room marked Dirty.`, 'maintenance');
    this.saveToStorage();
    return { success: true };
  }

  // ============================================================================
  // RESTAURANT & POS
  // ============================================================================

  public saveMenuItem(item: MenuItem): void {
    const index = this.db.menuItems.findIndex(m => m.id === item.id);
    if (index !== -1) {
      this.db.menuItems[index] = item;
    } else {
      this.db.menuItems.push(item);
    }
    this.saveToStorage();
  }

  public saveRestaurantTable(table: RestaurantTable): void {
    const index = this.db.restaurantTables.findIndex(t => t.id === table.id);
    if (index !== -1) {
      this.db.restaurantTables[index] = table;
    } else {
      this.db.restaurantTables.push(table);
    }
    this.saveToStorage();
  }

  public addRestaurantOrder(order: RestaurantOrder): void {
    this.db.restaurantOrders.push(order);
    
    // Set table status
    if (order.tableId) {
      const table = this.db.restaurantTables.find(t => t.id === order.tableId);
      if (table && order.status !== 'Paid' && order.status !== 'Cancelled') {
        table.status = 'Occupied';
      }
    }

    this.addAuditLog('Create Restaurant Order', 'Restaurant', `Created Order ${order.id} for Total: $${order.total}`);
    this.addNotification('New Kitchen Order', `Order ${order.id} sent to the Kitchen queue.`, 'booking');
    this.saveToStorage();
  }

  public updateOrderStatus(orderId: string, status: OrderStatus): void {
    const order = this.db.restaurantOrders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;
    order.status = status;

    if (status === 'Paid') {
      // Release table
      if (order.tableId) {
        const table = this.db.restaurantTables.find(t => t.id === order.tableId);
        if (table) table.status = 'Available';
      }
      
      // Register income transaction
      this.addFinanceTransaction(
        'acc_1', // Cashier cash drawer
        'Income',
        order.total,
        'Restaurant Revenue',
        `Restaurant Sales Order ID: ${orderId}`,
        orderId
      );

      // Relational: Deduct inventory stock if products are connected to menu items
      order.items.forEach(it => {
        const menuItem = this.db.menuItems.find(mi => mi.id === it.menuItemId);
        if (menuItem?.productId) {
          this.addInventoryMovement(menuItem.productId, it.quantity, 'Out', `POS Order Settle (Order ${orderId})`);
        }
      });

      // Create POS Sale record
      const sale: POSSale = {
        id: `sale_${Date.now()}`,
        cashierId: this.activeUser?.id || 'cashier',
        items: order.items.map(it => ({
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
      this.db.sales.push(sale);
      this.addNotification('Restaurant Order Paid', `Order ${orderId} has been closed and paid.`, 'payment');
    }

    this.addAuditLog('Update Order Status', 'Restaurant', `Order ${orderId} status changed from ${oldStatus} to ${status}`);
    this.saveToStorage();
  }

  // DIRECT POS SALE (Walk-in storefront or quick gift shop / cafe checkouts)
  public addPOSSale(sale: POSSale): void {
    this.db.sales.push(sale);

    // Record financials
    this.addFinanceTransaction(
      'acc_1', // Operating cash drawer
      'Income',
      sale.total,
      'Restaurant Revenue', // Or giftshop, generic POS sales
      `Store POS Direct checkout ${sale.id}`,
      sale.id
    );

    // Relational: Deduct inventory stock if products are connected
    sale.items.forEach(item => {
      if (item.productId) {
        this.addInventoryMovement(item.productId, item.quantity, 'Out', `POS Sale ${sale.id}`);
      }
    });

    this.addAuditLog('POS Sale Complete', 'POS', `Completed POS sale ${sale.id} for $${sale.total}`);
    this.saveToStorage();
  }

  // ============================================================================
  // INVENTORY & PURCHASING
  // ============================================================================

  public saveInventoryProduct(prod: InventoryProduct): void {
    const index = this.db.products.findIndex(p => p.id === prod.id);
    if (index !== -1) {
      this.db.products[index] = prod;
    } else {
      this.db.products.push(prod);
    }
    this.saveToStorage();
  }

  public addInventoryMovement(prodId: string, qty: number, type: 'In' | 'Out', notes?: string): void {
    const prod = this.db.products.find(p => p.id === prodId);
    if (!prod) return;

    if (type === 'In') {
      prod.currentStock += qty;
    } else {
      prod.currentStock = Math.max(0, prod.currentStock - qty);
      
      // Check low stock alert
      if (prod.currentStock <= prod.minStockAlert) {
        this.addNotification(
          'Low Stock Warning',
          `Product "${prod.name}" has reached low stock: ${prod.currentStock} ${prod.unit} remaining.`,
          'low_stock'
        );
      }
    }

    const movement: InventoryMovement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: prodId,
      quantity: qty,
      type,
      notes,
      userId: this.activeUser?.id || 'system',
      createdAt: new Date().toISOString()
    };
    
    this.db.inventoryMovements.unshift(movement);
    this.addAuditLog('Inventory Adjust', 'Inventory', `Adjusted ${prod.name} (${type}): ${qty} units. Current stock: ${prod.currentStock}`);
    this.saveToStorage();
  }

  public saveSupplier(sup: Supplier): void {
    const index = this.db.suppliers.findIndex(s => s.id === sup.id);
    if (index !== -1) {
      this.db.suppliers[index] = sup;
    } else {
      this.db.suppliers.push(sup);
    }
    this.saveToStorage();
  }

  public addPurchaseRequest(req: PurchaseRequest): void {
    this.db.purchaseRequests.push(req);
    this.addAuditLog('Create Purchase Request', 'Purchasing', `Request created for item ID ${req.productId}`);
    this.addNotification('New Purchase Request', `Approval required for purchase request of ${req.quantity} units.`, 'approval');
    this.saveToStorage();
  }

  public updatePurchaseRequestStatus(reqId: string, status: 'Approved' | 'Rejected'): void {
    const req = this.db.purchaseRequests.find(r => r.id === reqId);
    if (!req) return;

    req.status = status;
    this.addAuditLog('Purchase Request Reviewed', 'Purchasing', `Purchase Request ${reqId} was ${status}`);
    this.saveToStorage();
  }

  public addPurchaseOrder(po: PurchaseOrder): void {
    this.db.purchaseOrders.push(po);
    this.addAuditLog('Create Purchase Order', 'Purchasing', `Created Purchase Order ${po.id} to Supplier ${po.supplierId}`);
    this.saveToStorage();
  }

  public receivePurchaseOrder(poId: string): void {
    const po = this.db.purchaseOrders.find(p => p.id === poId);
    if (!po || po.status === 'Received') return;

    po.status = 'Received';
    po.receivedDate = new Date().toISOString().split('T')[0];

    // Auto-update stock & warehouse records
    po.items.forEach(item => {
      this.addInventoryMovement(
        item.productId,
        item.quantity,
        'In',
        `Received via Purchase Order ${poId}`
      );
    });

    // Handle financial accounting side (unpaid or paid)
    if (po.paymentStatus === 'Paid') {
      this.addFinanceTransaction(
        'acc_2', // Paid from corporate bank account
        'Expense',
        po.totalAmount,
        'Food Inventory', // or general operational expense
        `Payment settlement for PO ${poId}`,
        poId
      );
    }

    this.addAuditLog('Receive Purchase Order', 'Purchasing', `Inventory stocked from Purchase Order ${poId}`);
    this.addNotification('Purchase Goods Received', `Purchase order ${poId} processed. Stock updated.`, 'low_stock');
    this.saveToStorage();
  }

  // ============================================================================
  // HOUSEKEEPING, LAUNDRY, LOST & FOUND
  // ============================================================================

  public createHousekeepingTask(roomId: string, priority: 'Low' | 'Medium' | 'High'): void {
    // Find an active housekeeper if any to assign, or leave unassigned
    const housekeepers = this.db.employees.filter(e => e.departmentId === 'dept_housekeeping' && e.isActive);
    const hkId = housekeepers[Math.floor(Math.random() * housekeepers.length)]?.id || 'hk_unassigned';

    const task: CleaningTask = {
      id: `hk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      roomId,
      housekeeperId: hkId,
      status: 'Pending',
      priority,
      assignedAt: new Date().toISOString()
    };

    this.db.cleaningTasks.push(task);
    this.saveToStorage();
  }

  public updateCleaningTaskStatus(taskId: string, status: CleaningTask['status'], housekeeperId?: string): void {
    const task = this.db.cleaningTasks.find(t => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    task.status = status;
    if (housekeeperId) task.housekeeperId = housekeeperId;

    const room = this.db.rooms.find(r => r.id === task.roomId);

    if (status === 'In Progress') {
      if (room) room.status = 'Cleaning';
    } else if (status === 'Completed') {
      task.completedAt = new Date().toISOString();
      if (room) room.status = 'Cleaning'; // Waiting for supervisor inspection
    } else if (status === 'Inspected') {
      task.inspectedBy = this.activeUser?.name || 'Supervisor';
      if (room) room.status = 'Available'; // Back to clean available status
      this.addNotification('Room Sanitized & Ready', `Room ${room?.roomNumber} passed inspection and is now Available.`, 'maintenance');
    }

    this.addAuditLog('Update Cleaning Task', 'Housekeeping', `Task ${taskId} for Room ${room?.roomNumber} set to ${status}`);
    this.saveToStorage();
  }

  public addLaundryItem(laundry: LaundryItem): void {
    this.db.laundryItems.push(laundry);
    this.addAuditLog('Add Laundry Log', 'Housekeeping', `Logged laundry service of ${laundry.itemType}`);
    this.saveToStorage();
  }

  public updateLaundryStatus(id: string, status: LaundryItem['status']): void {
    const laundry = this.db.laundryItems.find(l => l.id === id);
    if (!laundry) return;

    laundry.status = status;
    if (status === 'Completed' && laundry.cost > 0) {
      // Record revenue if charged
      this.addFinanceTransaction(
        'acc_1',
        'Income',
        laundry.cost,
        'Room Revenue', // or ancillary revenue
        `Laundry service charges for Room ID ${laundry.roomId || 'guest'}`,
        laundry.id
      );
    }
    this.saveToStorage();
  }

  public saveLostAndFound(item: LostAndFound): void {
    const index = this.db.lostAndFound.findIndex(l => l.id === item.id);
    if (index !== -1) {
      this.db.lostAndFound[index] = item;
    } else {
      this.db.lostAndFound.push(item);
    }
    this.saveToStorage();
  }

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  public addMaintenanceRequest(req: MaintenanceRequest): void {
    this.db.maintenanceRequests.push(req);
    
    // Put room out of order if priority is High
    if (req.roomId && req.priority === 'High') {
      const room = this.db.rooms.find(r => r.id === req.roomId);
      if (room) {
        room.status = 'Maintenance';
      }
    }

    this.addAuditLog('Maintenance Request', 'Maintenance', `Reported issue: ${req.description}`);
    this.addNotification('Maintenance Alert', `New repair order opened: ${req.description}`, 'maintenance');
    this.saveToStorage();
  }

  public updateMaintenanceStatus(reqId: string, status: MaintenanceRequest['status'], note?: string): void {
    const req = this.db.maintenanceRequests.find(r => r.id === reqId);
    if (!req) return;

    req.status = status;
    if (status === 'Resolved') {
      req.resolvedAt = new Date().toISOString();
      
      // Restore room status
      if (req.roomId) {
        const room = this.db.rooms.find(r => r.id === req.roomId);
        if (room && room.status === 'Maintenance') {
          room.status = 'Dirty'; // Needs cleaning before opening back up
          this.createHousekeepingTask(room.id, 'Medium');
        }
      }
      this.addNotification('Maintenance Complete', `Issue resolved: ${req.description}. Room cleared for Housekeeping.`, 'maintenance');
    }

    this.addAuditLog('Update Maintenance', 'Maintenance', `Repair Request ${reqId} set to ${status}`);
    this.saveToStorage();
  }

  // ============================================================================
  // FINANCIAL LEDGER & ACCOUNTS
  // ============================================================================

  public addFinanceTransaction(
    accountId: string,
    type: 'Income' | 'Expense' | 'Transfer',
    amount: number,
    category: string,
    description: string,
    referenceId?: string
  ): void {
    const acc = this.db.accounts.find(a => a.id === accountId);
    if (!acc) return;

    if (type === 'Income') {
      acc.balance += amount;
    } else if (type === 'Expense') {
      acc.balance -= amount;
    }

    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      accountId,
      type,
      amount,
      category,
      description,
      referenceId,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    this.db.transactions.unshift(tx);
    this.addAuditLog('Ledger Entry', 'Accounting', `Recorded ${type} of $${amount} to ${acc.name} (${category})`);
    this.saveToStorage();
  }

  // ============================================================================
  // HR ATTENDANCE & PAYROLL
  // ============================================================================

  public clockIn(empId: string): { success: boolean; error?: string } {
    const emp = this.db.employees.find(e => e.id === empId);
    if (!emp || !emp.isActive) return { success: false, error: 'Employee not active' };

    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.db.attendance.find(a => a.employeeId === empId && a.date === todayStr);
    if (existing) return { success: false, error: 'Already clocked in today' };

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    // Check if late (let's say official start is 09:00)
    const officialStart = '09:00:00';
    let lateMin = 0;
    const [h, m] = timeNow.split(':').map(Number);
    const currentMin = h * 60 + m;
    const startMin = 9 * 60;
    if (currentMin > startMin) {
      lateMin = currentMin - startMin;
    }

    const att: Attendance = {
      id: `att_${Date.now()}`,
      employeeId: empId,
      date: todayStr,
      clockIn: timeNow,
      status: lateMin > 15 ? 'Late' : 'Present',
      lateMinutes: lateMin,
      overtimeMinutes: 0
    };

    this.db.attendance.push(att);
    this.addAuditLog('Clock In', 'Attendance', `${emp.firstName} clocked in at ${timeNow}`);
    this.saveToStorage();
    return { success: true };
  }

  public clockOut(empId: string): { success: boolean; error?: string } {
    const todayStr = new Date().toISOString().split('T')[0];
    const att = this.db.attendance.find(a => a.employeeId === empId && a.date === todayStr && !a.clockOut);
    if (!att) return { success: false, error: 'No active clock-in record found for today' };

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });
    att.clockOut = timeNow;

    // Overtime calculation (Let's say official end is 17:00, standard shift is 8 hrs)
    const [h, m] = timeNow.split(':').map(Number);
    const endMin = h * 60 + m;
    const officialEndMin = 17 * 60;
    if (endMin > officialEndMin) {
      att.overtimeMinutes = endMin - officialEndMin;
    }

    const emp = this.db.employees.find(e => e.id === empId);
    this.addAuditLog('Clock Out', 'Attendance', `${emp?.firstName} clocked out at ${timeNow}`);
    this.saveToStorage();
    return { success: true };
  }

  public generatePayroll(month: string): void {
    // Generate salary entries for all active employees for target month 'YYYY-MM'
    this.db.employees.filter(e => e.isActive).forEach(emp => {
      const existing = this.db.payroll.find(p => p.employeeId === emp.id && p.month === month);
      if (existing) return; // Already generated

      // Check attendance records to calculate deductions or overtime bonuses
      const atts = this.db.attendance.filter(a => a.employeeId === emp.id && a.date.startsWith(month));
      const hoursLate = atts.reduce((sum, a) => sum + a.lateMinutes, 0) / 60;
      const hoursOvertime = atts.reduce((sum, a) => sum + a.overtimeMinutes, 0) / 60;

      const bonus = Math.round(hoursOvertime * 25); // $25/hr overtime bonus
      const deduction = Math.round(hoursLate * 15); // $15/hr penalty

      const salary: Payroll = {
        id: `pr_${month}_${emp.id}`,
        employeeId: emp.id,
        month,
        baseSalary: emp.salary,
        allowances: 150, // Standard health allowance
        bonuses: bonus,
        deductions: deduction,
        netSalary: emp.salary + 150 + bonus - deduction,
        paymentStatus: 'Pending'
      };

      this.db.payroll.push(salary);
    });

    this.addAuditLog('Generate Payroll', 'Payroll', `Generated payroll registry logs for month ${month}`);
    this.saveToStorage();
  }

  public paySalary(payrollId: string): void {
    const pay = this.db.payroll.find(p => p.id === payrollId);
    if (!pay || pay.paymentStatus === 'Paid') return;

    pay.paymentStatus = 'Paid';
    pay.paymentDate = new Date().toISOString().split('T')[0];

    // Ledger transaction
    this.addFinanceTransaction(
      'acc_2', // Paid from corporate account
      'Expense',
      pay.netSalary,
      'Payroll',
      `Salary payout for employee ID ${pay.employeeId} - Month: ${pay.month}`,
      pay.id
    );

    const emp = this.db.employees.find(e => e.id === pay.employeeId);
    this.addAuditLog('Pay Salary', 'Payroll', `Paid salary of $${pay.netSalary} to ${emp?.firstName} ${emp?.lastName}`);
    this.saveToStorage();
  }

  // ============================================================================
  // DAILY SHIFT REPORTS & RECONCILIATION
  // ============================================================================

  public addShiftReport(report: DailyShiftReport): void {
    this.db.shiftReports.unshift(report);
    this.addAuditLog('Shift Report Submitted', 'POS', `Cashier ${report.cashierName} closed shift. Expected: $${report.expectedCash}, Actual: $${report.actualCash}`);
    this.addNotification('Shift Report Submitted', `Daily shift report submitted by ${report.cashierName} for verification.`, 'approval');
    this.saveToStorage();
  }

  public updateShiftReportStatus(
    reportId: string, 
    status: DailyShiftReport['status'], 
    notes?: string
  ): void {
    const report = this.db.shiftReports.find(r => r.id === reportId);
    if (!report) return;

    const oldStatus = report.status;
    report.status = status;
    if (notes !== undefined) report.notes = notes;

    const currentUser = this.getActiveUser();

    if (status === 'Pending Manager Approval') {
      report.stockVerifiedBy = currentUser?.name || 'Stock Officer';
      report.stockVerifiedAt = new Date().toISOString();
      this.addAuditLog('Shift Report Verified', 'Inventory', `Stock dept verified report ${reportId} and forwarded to Manager`);
      this.addNotification('Shift Report Verified', `Report ${reportId} passed stock verification, sent to Manager.`, 'approval');
    } else if (status === 'Pending CEO Approval') {
      report.managerApprovedBy = currentUser?.name || 'Operations Manager';
      report.managerApprovedAt = new Date().toISOString();
      this.addAuditLog('Shift Report Manager Approved', 'Settings', `Manager approved report ${reportId} and forwarded to CEO`);
      this.addNotification('Shift Report Manager Approved', `Report ${reportId} approved by Manager, sent to CEO.`, 'approval');
    } else if (status === 'Approved By CEO') {
      report.ceoApprovedBy = currentUser?.name || 'CEO';
      report.ceoApprovedAt = new Date().toISOString();
      this.addAuditLog('Shift Report CEO Approved', 'Settings', `CEO approved and finalized shift report ${reportId}`);
      this.addNotification('Shift Report Finalized', `CEO approved shift report ${reportId} successfully.`, 'approval');
    }

    this.saveToStorage();
  }

  // ============================================================================
  // SEEDER: SANDBOX REVOLVING SIMULATOR
  // ============================================================================

  public seedSandbox(): void {
    this.resetDatabase();

    // 1. Hotel Profile
    const settings: HotelOSSettings = {
      profile: {
        name: 'The Grand Horizon Resort & Spa',
        logo: '✨',
        coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
        slogan: 'Luxurious Sanctuary & Coastal Harmony',
        phone: '+1 (555) 246-8000',
        email: 'reservations@grandhorizon.com',
        website: 'www.grandhorizon.com',
        address: '77 Ocean Vista Blvd, Sunset Cliffs',
        country: 'United States',
        currency: 'USD',
        timeZone: 'EST',
        taxNumber: 'TX-984-110A',
        taxRate: 15
      },
      structure: {
        buildings: ['Main Horizon Lodge', 'Ocean Breeze Pavilion', 'Cliffside Sanctuary'],
        floors: ['G - Ground Floor', '1st Floor', '2nd Floor', 'Penthouse Crest'],
        amenities: ['Wi-Fi', 'Infinity Pool', 'Wellness Spa', 'Oceanview Gym', 'Chef Table Restaurant', '24/7 Butler Service', 'Valet Parking']
      },
      theme: 'light',
      language: 'en',
      paymentMethods: ['Cash', 'Card', 'Mobile Money'],
      printerName: 'Front Desk Thermal Network Printer',
      autoBackup: true
    };

    // 2. Roles already exist. Let's seed users with secure simple passwords
    const users: User[] = [
      { id: 'usr_admin', username: 'admin', passwordHash: 'admin123', role: 'Super Admin', name: 'Jonathan Pierce', email: 'j.pierce@grandhorizon.com', isActive: true, createdAt: new Date().toISOString() },
      { id: 'usr_ceo', username: 'ceo', passwordHash: 'ceo123', role: 'CEO', name: 'Alena Voronova', email: 'a.voronova@grandhorizon.com', isActive: true, createdAt: new Date().toISOString() },
      { id: 'usr_manager', username: 'manager', passwordHash: 'manager123', role: 'Manager', name: 'Devon Carter', email: 'd.carter@grandhorizon.com', isActive: true, createdAt: new Date().toISOString() },
      { id: 'usr_recep', username: 'recep', passwordHash: 'recep123', role: 'Receptionist', name: 'Chloe Sterling', email: 'c.sterling@grandhorizon.com', isActive: true, createdAt: new Date().toISOString() },
      { id: 'usr_cashier', username: 'cashier', passwordHash: 'cash123', role: 'Cashier', name: 'Marcus Brody', email: 'm.brody@grandhorizon.com', isActive: true, createdAt: new Date().toISOString() },
      { id: 'usr_waiter', username: 'waiter', passwordHash: 'wait123', role: 'Waiter', name: 'Tariq Mendez', email: 't.mendez@grandhorizon.com', isActive: true, createdAt: new Date().toISOString() },
      { id: 'usr_hk', username: 'hk', passwordHash: 'hk123', role: 'Housekeeper', name: 'Maria Santos', email: 'm.santos@grandhorizon.com', isActive: true, createdAt: new Date().toISOString() }
    ];

    // 3. Departments
    const departments: Department[] = [
      { id: 'dept_reception', name: 'Front Desk & Reception', description: 'Guest service interface and guest relationship managers.' },
      { id: 'dept_restaurant', name: 'Cascade Restaurant & Dining', description: 'Fine culinary experience, bar, and kitchen teams.' },
      { id: 'dept_housekeeping', name: 'Housekeeping & Laundry', description: 'Sanitary maintenance, visual perfection, and linens.' },
      { id: 'dept_finance', name: 'Accounting & Finance', description: 'Corporate auditing, tax preparation, ledger entries.' },
      { id: 'dept_hr', name: 'Human Resources', description: 'Recruitment, employee compliance, benefits, and payroll.' },
      { id: 'dept_maintenance', name: 'Engineering & Maintenance', description: 'Building assets repairs, systems control, and groundskeeping.' }
    ];

    // 4. Employees
    const employees: Employee[] = [
      { id: 'emp_1', firstName: 'Jonathan', lastName: 'Pierce', email: 'j.pierce@grandhorizon.com', phone: '+1 (555) 123-4567', departmentId: 'dept_finance', position: 'Super Admin Architect', contractType: 'Full-Time', salary: 9500, hireDate: '2024-01-10', isActive: true, performanceScore: 5 },
      { id: 'emp_2', firstName: 'Chloe', lastName: 'Sterling', email: 'c.sterling@grandhorizon.com', phone: '+1 (555) 765-4321', departmentId: 'dept_reception', position: 'Senior Front Desk Agent', contractType: 'Full-Time', salary: 4200, hireDate: '2024-06-15', isActive: true, performanceScore: 4 },
      { id: 'emp_3', firstName: 'Tariq', lastName: 'Mendez', email: 't.mendez@grandhorizon.com', phone: '+1 (555) 890-1234', departmentId: 'dept_restaurant', position: 'Sommelier & Host', contractType: 'Part-Time', salary: 2800, hireDate: '2025-02-01', isActive: true, performanceScore: 5 },
      { id: 'emp_4', firstName: 'Maria', lastName: 'Santos', email: 'm.santos@grandhorizon.com', phone: '+1 (555) 345-6789', departmentId: 'dept_housekeeping', position: 'Floor Captain', contractType: 'Full-Time', salary: 3400, hireDate: '2023-03-22', isActive: true, performanceScore: 4 },
      { id: 'emp_5', firstName: 'Sven', lastName: 'Lindqvist', email: 's.lindqvist@grandhorizon.com', phone: '+1 (555) 456-7890', departmentId: 'dept_maintenance', position: 'Chief Maintenance Engineer', contractType: 'Full-Time', salary: 5800, hireDate: '2022-11-01', isActive: true, performanceScore: 5 }
    ];

    // 5. Room Types
    const roomTypes: RoomType[] = [
      { id: 'rt_standard', name: 'Deluxe Courtyard King', description: 'Spacious room with king bed overlooking our Zen gardens.', basePrice: 240, capacity: 2, amenities: ['Wi-Fi', 'Mini Bar', 'Air Conditioning'] },
      { id: 'rt_executive', name: 'Executive Oceanfront Suite', description: 'Overhanging balcony with full beachfront sunrise panoramas.', basePrice: 480, capacity: 3, amenities: ['Wi-Fi', 'Mini Bar', 'Air Conditioning', 'Infinity Pool', '24/7 Butler Service'] },
      { id: 'rt_family', name: 'Horizon Dual Room Suite', description: 'Perfect family escape with private hot-tub patio and connected rooms.', basePrice: 650, capacity: 5, amenities: ['Wi-Fi', 'Air Conditioning', 'Wellness Spa', 'Room Service'] },
      { id: 'rt_penthouse', name: 'Crest Imperial Penthouse', description: 'Ultramodern split-level top crest apartment with rooftop deck.', basePrice: 1800, capacity: 6, amenities: ['Wi-Fi', 'Infinity Pool', 'Wellness Spa', 'Oceanview Gym', '24/7 Butler Service', 'Valet Parking'] }
    ];

    // 6. Rooms
    const rooms: Room[] = [
      // Main lodge
      { id: 'rm_101', roomNumber: '101', roomTypeId: 'rt_standard', building: 'Main Horizon Lodge', floor: 'G - Ground Floor', status: 'Available' },
      { id: 'rm_102', roomNumber: '102', roomTypeId: 'rt_standard', building: 'Main Horizon Lodge', floor: 'G - Ground Floor', status: 'Occupied' },
      { id: 'rm_201', roomNumber: '201', roomTypeId: 'rt_executive', building: 'Main Horizon Lodge', floor: '1st Floor', status: 'Occupied' },
      { id: 'rm_202', roomNumber: '202', roomTypeId: 'rt_executive', building: 'Main Horizon Lodge', floor: '1st Floor', status: 'Reserved' },
      { id: 'rm_203', roomNumber: '203', roomTypeId: 'rt_family', building: 'Main Horizon Lodge', floor: '1st Floor', status: 'Dirty' },
      // Ocean pavilion
      { id: 'rm_301', roomNumber: '301', roomTypeId: 'rt_executive', building: 'Ocean Breeze Pavilion', floor: '2nd Floor', status: 'Available' },
      { id: 'rm_302', roomNumber: '302', roomTypeId: 'rt_family', building: 'Ocean Breeze Pavilion', floor: '2nd Floor', status: 'Maintenance' },
      // Penthouse
      { id: 'rm_501', roomNumber: '501', roomTypeId: 'rt_penthouse', building: 'Cliffside Sanctuary', floor: 'Penthouse Crest', status: 'Occupied' }
    ];

    // 7. Guests
    const guests: Guest[] = [
      { id: 'gst_1', firstName: 'Isabella', lastName: 'Rossellini', email: 'i.rossellini@couture.it', phone: '+39 02 884732', idDocumentType: 'Passport', idDocumentNumber: 'ITA-948210-C', address: 'Via della Spiga 12', country: 'Italy', notes: 'VIP Guest. Prefers fresh jasmine scent in room.' },
      { id: 'gst_2', firstName: 'Alexander', lastName: 'Wright', email: 'wright.a@techventures.co', phone: '+1 (415) 330-9421', idDocumentType: 'Driving License', idDocumentNumber: 'CA-DL-83492', address: '404 Mission Blvd, San Francisco', country: 'United States', notes: 'Late check-out request common.' },
      { id: 'gst_3', firstName: 'Dr. Evelyn', lastName: 'Chen', email: 'e.chen@harvard.edu', phone: '+1 (617) 495-1000', idDocumentType: 'National ID', idDocumentNumber: 'MA-900-3491', address: '82 Kirkland St, Cambridge', country: 'United States' }
    ];

    // 8. Reservations
    const reservations: Reservation[] = [
      // Checked out historical
      {
        id: 'res_past_1',
        guestId: 'gst_2',
        roomId: 'rm_101',
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-05',
        numberOfGuests: 2,
        totalAmount: 960,
        amountPaid: 960,
        status: 'Checked Out',
        createdAt: '2026-06-20T10:00:00Z'
      },
      // Active Checked In (Occupying Room 102)
      {
        id: 'res_act_1',
        guestId: 'gst_3',
        roomId: 'rm_102',
        checkInDate: '2026-07-06',
        checkOutDate: '2026-07-12',
        numberOfGuests: 1,
        totalAmount: 1440,
        amountPaid: 500, // Partial downpayment
        status: 'Checked In',
        createdAt: '2026-06-25T14:30:00Z'
      },
      // Active Checked In VIP (Occupying Room 501 Penthouse)
      {
        id: 'res_act_2',
        guestId: 'gst_1',
        roomId: 'rm_501',
        checkInDate: '2026-07-08',
        checkOutDate: '2026-07-15',
        numberOfGuests: 3,
        totalAmount: 12600,
        amountPaid: 12600, // Fully paid
        status: 'Checked In',
        createdAt: '2026-07-01T09:15:00Z'
      },
      // Upcoming Booking (Reserved Room 202)
      {
        id: 'res_up_1',
        guestId: 'gst_2',
        roomId: 'rm_202',
        checkInDate: '2026-07-10',
        checkOutDate: '2026-07-14',
        numberOfGuests: 2,
        totalAmount: 1920,
        amountPaid: 0,
        status: 'Confirmed',
        createdAt: '2026-07-05T16:00:00Z'
      }
    ];

    // Link rooms back to reservations
    rooms.find(r => r.id === 'rm_102')!.currentReservationId = 'res_act_1';
    rooms.find(r => r.id === 'rm_501')!.currentReservationId = 'res_act_2';
    rooms.find(r => r.id === 'rm_202')!.currentReservationId = 'res_up_1';

    // 9. Restaurant Tables
    const restaurantTables: RestaurantTable[] = [
      { id: 'tbl_1', tableNumber: 'Table 1 (Poolside)', capacity: 2, status: 'Available' },
      { id: 'tbl_2', tableNumber: 'Table 2 (Poolside)', capacity: 2, status: 'Available' },
      { id: 'tbl_3', tableNumber: 'Table 3 (Indoors)', capacity: 4, status: 'Occupied' },
      { id: 'tbl_4', tableNumber: 'Table 4 (Indoors)', capacity: 4, status: 'Available' },
      { id: 'tbl_5', tableNumber: 'Table 5 (Sea View)', capacity: 6, status: 'Occupied' },
      { id: 'tbl_6', tableNumber: 'Table 6 (VIP)', capacity: 8, status: 'Reserved' }
    ];

    // 10. Menu Items
    const menuItems: MenuItem[] = [
      { id: 'm_1', name: 'Oysters Horizon (Half Dozen)', category: 'Starter', price: 28, isAvailable: true, description: 'Freshly shucked with passion fruit shallot mignonette.', productId: 'prod_3' },
      { id: 'm_2', name: 'Wagyu Carpaccio', category: 'Starter', price: 32, isAvailable: true, description: 'Truffle aioli, baby rocket, shaved reggiano.', productId: 'prod_4' },
      { id: 'm_3', name: 'Pan-Seared Chilean Sea Bass', category: 'Main', price: 54, isAvailable: true, description: 'Saffron cream, butter-braised asparagus, dill oil.', productId: 'prod_5' },
      { id: 'm_4', name: 'Prime Dry-Aged Filet Mignon', category: 'Main', price: 68, isAvailable: true, description: 'Chanterelle mushroom reduction, potato mille-feuille.', productId: 'prod_6' },
      { id: 'm_5', name: 'Valrhona Chocolate Dome soufflé', category: 'Dessert', price: 18, isAvailable: true, description: 'Salted caramel, house bourbon vanilla bean gelato.', productId: 'prod_7' },
      { id: 'm_6', name: 'Horizon Sunset Mojito', category: 'Beverage', price: 16, isAvailable: true, description: 'Fresh mint, dark rum, blood orange infusion.', productId: 'prod_8' },
      { id: 'm_7', name: 'Chateau Margaux 2018 (Glass)', category: 'Alcoholic', price: 45, isAvailable: true, description: 'Silky, complex notes of dark berries and smoke.', productId: 'prod_9' }
    ];

    // 11. Restaurant Orders
    const restaurantOrders: RestaurantOrder[] = [
      {
        id: 'ord_1',
        tableId: 'tbl_3',
        waiterId: 'emp_3',
        items: [
          { menuItemId: 'm_1', name: 'Oysters Horizon (Half Dozen)', quantity: 1, price: 28 },
          { menuItemId: 'm_3', name: 'Pan-Seared Chilean Sea Bass', quantity: 2, price: 54 },
          { menuItemId: 'm_6', name: 'Horizon Sunset Mojito', quantity: 2, price: 16 }
        ],
        subtotal: 168,
        tax: 25.2,
        discount: 10,
        total: 183.2,
        status: 'In Kitchen',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ord_2',
        tableId: 'tbl_5',
        waiterId: 'emp_3',
        items: [
          { menuItemId: 'm_2', name: 'Wagyu Carpaccio', quantity: 2, price: 32 },
          { menuItemId: 'm_4', name: 'Prime Dry-Aged Filet Mignon', quantity: 3, price: 68 },
          { menuItemId: 'm_7', name: 'Chateau Margaux 2018 (Glass)', quantity: 4, price: 45 }
        ],
        subtotal: 448,
        tax: 67.2,
        discount: 0,
        total: 515.2,
        status: 'Served',
        createdAt: new Date().toISOString()
      }
    ];

    // 12. Suppliers
    const suppliers: Supplier[] = [
      { id: 'sup_1', name: 'Oceanic Seafood Wholesalers', contactName: 'Frankie Vance', email: 'f.vance@oceanicseafood.com', phone: '+1 (555) 301-4455', address: 'Pier 12, Harbour Way' },
      { id: 'sup_2', name: 'Zen Linen & Spa Outfitters', contactName: 'Gisele Dupont', email: 'info@zenlinen.com', phone: '+1 (555) 890-3322', address: '12 Textiles Dr, Industrial Park' }
    ];

    // 13. Products
    const products: InventoryProduct[] = [
      { id: 'prod_1', name: 'Scented Spa Massage Oils (1L)', category: 'Amenities', unit: 'liters', currentStock: 12, minStockAlert: 5, unitPrice: 45, warehouseLocation: 'Aisles B-2', supplierId: 'sup_2' },
      { id: 'prod_2', name: 'Premium Egypt Linen Pillowcases', category: 'Linen', unit: 'pcs', currentStock: 150, minStockAlert: 40, unitPrice: 12, warehouseLocation: 'Shelves D-1', supplierId: 'sup_2' },
      { id: 'prod_3', name: 'Fresh Oysters (Batch 50pcs)', category: 'Food', unit: 'boxes', currentStock: 8, minStockAlert: 3, unitPrice: 110, warehouseLocation: 'Walk-In Chiller', supplierId: 'sup_1' },
      { id: 'prod_4', name: 'A5 Wagyu Beef Cuts (kg)', category: 'Food', unit: 'kg', currentStock: 25, minStockAlert: 5, unitPrice: 85, warehouseLocation: 'Walk-In Freezer', supplierId: 'sup_1' },
      { id: 'prod_5', name: 'Fresh Chilean Sea Bass (kg)', category: 'Food', unit: 'kg', currentStock: 18, minStockAlert: 4, unitPrice: 60, warehouseLocation: 'Walk-In Chiller', supplierId: 'sup_1' },
      { id: 'prod_6', name: 'Prime Dry-Aged Beef Cuts (kg)', category: 'Food', unit: 'kg', currentStock: 30, minStockAlert: 6, unitPrice: 70, warehouseLocation: 'Walk-In Freezer', supplierId: 'sup_1' },
      { id: 'prod_7', name: 'Premium Valrhona Chocolate (kg)', category: 'Food', unit: 'kg', currentStock: 10, minStockAlert: 2, unitPrice: 40, warehouseLocation: 'Pantry Shelf C', supplierId: 'sup_1' },
      { id: 'prod_8', name: 'Horizon Sunset Mojito Ingredients (Box)', category: 'Beverage', unit: 'pcs', currentStock: 40, minStockAlert: 10, unitPrice: 15, warehouseLocation: 'Bar Cabinets', supplierId: 'sup_1' },
      { id: 'prod_9', name: 'Chateau Margaux 2018 Bottles', category: 'Beverage', unit: 'pcs', currentStock: 15, minStockAlert: 3, unitPrice: 150, warehouseLocation: 'Wine Cellar Cabinet 2', supplierId: 'sup_1' }
    ];

    // 14. Accounts seed initial balances
    const accounts: Account[] = [
      { id: 'acc_1', name: 'Operating Cash Drawer', type: 'Asset', balance: 1450 },
      { id: 'acc_2', name: 'Main Corporate Bank Account', type: 'Asset', balance: 148500 },
      { id: 'acc_3', name: 'Petty Cash Ledger', type: 'Asset', balance: 450 }
    ];

    // 15. Financial Transactions History
    const transactions: Transaction[] = [
      { id: 'tx_init', accountId: 'acc_2', type: 'Income', amount: 150000, category: 'Room Revenue', description: 'Initial Capital reserves injection from Board of Directors', date: '2026-06-01', createdAt: '2026-06-01T08:00:00Z' },
      { id: 'tx_rec_1', accountId: 'acc_2', type: 'Income', amount: 960, category: 'Room Revenue', description: 'Checkout Settlement for Reservation res_past_1', date: '2026-07-05', referenceId: 'res_past_1', createdAt: '2026-07-05T11:00:00Z' },
      { id: 'tx_rec_2', accountId: 'acc_2', type: 'Income', amount: 500, category: 'Room Revenue', description: 'Partial Downpayment for Reservation res_act_1', date: '2026-07-06', referenceId: 'res_act_1', createdAt: '2026-07-06T14:30:00Z' },
      { id: 'tx_rec_3', accountId: 'acc_2', type: 'Income', amount: 12600, category: 'Room Revenue', description: 'Full prepay VIP Booking for Reservation res_act_2', date: '2026-07-08', referenceId: 'res_act_2', createdAt: '2026-07-08T09:15:00Z' },
      { id: 'tx_pur_1', accountId: 'acc_2', type: 'Expense', amount: 1500, category: 'Food Inventory', description: 'Procurement of spa supply materials Zen Linen PO-980', date: '2026-07-02', createdAt: '2026-07-02T16:00:00Z' }
    ];

    // 15. Cleaning Tasks
    const cleaningTasks: CleaningTask[] = [
      { id: 'hk_task_1', roomId: 'rm_203', housekeeperId: 'emp_4', status: 'In Progress', priority: 'High', assignedAt: new Date().toISOString() }
    ];

    // 16. Lost and Found
    const lostAndFound: LostAndFound[] = [
      { id: 'lf_1', description: 'Gold Piaget Altiplano watch with black leather strap.', foundLocation: 'Room 101 side dresser drawer', foundDate: '2026-07-05', status: 'Reported', notes: 'Contacted guest Alexander Wright. He is arriving to claim it on his next visit.' }
    ];

    // 17. Maintenance Requests
    const maintenanceRequests: MaintenanceRequest[] = [
      { id: 'maint_1', roomId: 'rm_302', description: 'Thermostat fails to cool down past 24°C. Air duct whistling.', priority: 'Medium', status: 'In Progress', requestedBy: 'usr_recep', assignedTo: 'emp_5', createdAt: '2026-07-08T11:00:00Z' }
    ];

    // 18. Move Inventory Movements
    const inventoryMovements: InventoryMovement[] = [
      { id: 'mov_init_1', productId: 'prod_1', quantity: 20, type: 'In', notes: 'Initial batch purchase', userId: 'usr_admin', createdAt: '2026-07-01T08:00:00Z' },
      { id: 'mov_init_2', productId: 'prod_1', quantity: 8, type: 'Out', notes: 'Allocated to Spa treatment room 1-4', userId: 'usr_admin', createdAt: '2026-07-04T12:00:00Z' }
    ];

    // 19. Initial system notifications
    const notifications: SystemNotification[] = [
      { id: 'notif_1', title: 'Low Stock Alert', message: 'Product "Fresh Oysters" has reached low stock: 2 boxes remaining.', type: 'low_stock', isRead: false, createdAt: new Date().toISOString() },
      { id: 'notif_2', title: 'VIP Checked-In', message: 'Guest Isabella Rossellini has checked into Room 501 Crest Imperial Penthouse.', type: 'checkin', isRead: false, createdAt: new Date().toISOString() }
    ];

    this.db = {
      settings,
      users,
      roles: DEFAULT_ROLES,
      departments,
      employees,
      attendance: [],
      payroll: [],
      guests,
      roomTypes,
      rooms,
      reservations,
      restaurantTables,
      menuItems,
      restaurantOrders,
      products,
      inventoryMovements,
      suppliers,
      purchaseRequests: [],
      purchaseOrders: [],
      sales: [],
      accounts,
      transactions,
      cleaningTasks,
      laundryItems: [],
      lostAndFound,
      maintenanceRequests,
      notifications,
      auditLogs: [],
      shiftReports: [],
      isInitialized: true
    };

    // Auto-login Super Admin
    this.activeUser = users[0];
    sessionStorage.setItem('hotel_os_session', JSON.stringify(users[0]));

    this.addAuditLog('Sandbox Seeded', 'Settings', 'Database was loaded with high-fidelity resort sandbox simulation data');
    this.saveToStorage();
  }
}

export const store = new HotelStore();
