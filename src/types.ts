/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// SYSTEM DEFINITIONS & ENUMS
// ============================================================================

export type RoleName =
  | 'Super Admin'
  | 'CEO'
  | 'Manager'
  | 'Receptionist'
  | 'Accountant'
  | 'Cashier'
  | 'Waiter'
  | 'Chef'
  | 'Housekeeper'
  | 'Storekeeper'
  | 'Maintenance Staff'
  | 'Security';

export type Permission =
  | 'all'
  | 'view_dashboard'
  | 'manage_guests'
  | 'manage_rooms'
  | 'manage_restaurant'
  | 'manage_pos'
  | 'manage_inventory'
  | 'manage_purchasing'
  | 'manage_accounting'
  | 'manage_hr'
  | 'manage_attendance'
  | 'manage_payroll'
  | 'manage_housekeeping'
  | 'manage_maintenance'
  | 'view_reports'
  | 'manage_settings';

export type RoomStatus =
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Dirty'
  | 'Cleaning'
  | 'Maintenance';

export type ReservationStatus =
  | 'Confirmed'
  | 'Checked In'
  | 'Checked Out'
  | 'Cancelled';

export type OrderStatus =
  | 'New'
  | 'Pending Kitchen'
  | 'Preparing'
  | 'Ready'
  | 'Served'
  | 'Completed'
  | 'Pending'
  | 'In Kitchen'
  | 'Paid'
  | 'Cancelled';

export type PaymentMethod =
  | 'Cash'
  | 'Card'
  | 'Mobile Money';

export type StockMovementType = 'In' | 'Out';

export type PurchaseOrderStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Ordered'
  | 'Received'
  | 'Cancelled';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export type CleaningTaskStatus =
  | 'Pending'
  | 'In Progress'
  | 'Completed'
  | 'Inspected';

export type MaintenanceStatus =
  | 'Pending'
  | 'In Progress'
  | 'Resolved'
  | 'On Hold';

// ============================================================================
// DATABASE TABLE ENTITIES
// ============================================================================

export interface Role {
  id: string;
  name: RoleName;
  description: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Stored plaintext for local mock sandbox auth
  role: RoleName;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  employeeId?: string; // Optional link to employee profile in HR directory
}

export interface Department {
  id: string;
  name: string;
  managerId?: string; // Links to Employee ID
  description: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: string;
  position: string;
  contractType: string; // 'Full-Time', 'Part-Time', 'Contract'
  salary: number; // Base monthly salary
  hireDate: string;
  isActive: boolean;
  performanceScore?: number; // 1-5 scale
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // HH:MM:SS or ISO
  clockOut?: string;
  status: 'Present' | 'Late' | 'Absent' | 'On Leave';
  overtimeMinutes: number;
  lateMinutes: number;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  baseSalary: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  paymentStatus: 'Pending' | 'Paid';
  paymentDate?: string;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idDocumentType: string; // Passport, National ID, Driving License
  idDocumentNumber: string;
  address: string;
  country: string;
  notes?: string;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  capacity: number; // Max persons
  amenities: string[];
}

export interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  building: string;
  floor: string;
  status: RoomStatus;
  currentReservationId?: string;
}

export interface Reservation {
  id: string;
  guestId: string;
  roomId: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  numberOfGuests: number;
  totalAmount: number;
  amountPaid: number;
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
}

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  capacity: number;
  status: 'Available' | 'Occupied' | 'Reserved';
}

export interface MenuItem {
  id: string;
  name: string;
  category: string; // Starter, Main, Dessert, Beverage, Alcoholic
  price: number;
  isAvailable: boolean;
  description?: string;
  productId?: string; // Links menu item to an inventory product
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface RestaurantOrder {
  id: string;
  orderNumber?: string;
  kotNumber?: string;
  orderType?: 'Dine In' | 'Take Away' | 'Room Service';
  roomNumber?: string;
  customerName?: string;
  guestCount?: number;
  specialInstructions?: string;
  kotPrinted?: boolean;
  receiptPrinted?: boolean;
  printCount?: number;
  tableId?: string;
  waiterId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  category: string; // Food, Beverage, Linen, Amenities, Cleaning, Office
  unit: string; // pcs, kg, liters, boxes
  currentStock: number;
  minStockAlert: number;
  unitPrice: number;
  warehouseLocation?: string;
  supplierId?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  quantity: number;
  type: StockMovementType;
  referenceId?: string; // PO ID or Sales ID
  notes?: string;
  userId: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
}

export interface PurchaseRequest {
  id: string;
  requestedBy: string; // User ID
  productId: string;
  quantity: number;
  estimatedCost: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  paymentStatus: 'Unpaid' | 'Paid';
  orderedDate: string;
  receivedDate?: string;
  createdBy: string;
}

export interface POSSale {
  id: string;
  cashierId: string;
  items: {
    productId?: string;
    menuItemId?: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string; // Operating Cash, Main Bank, Card Receivables, Petty Cash
  type: 'Asset' | 'Liability' | 'Equity';
  balance: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'Income' | 'Expense' | 'Transfer';
  amount: number;
  category: string; // Room Revenue, Restaurant Revenue, Payroll, Laundry Supplies, Food Inventory, Utilities, Repairs
  description: string;
  referenceId?: string; // BookingId, OrderId, POId, PayrollId
  date: string;
  createdAt: string;
}

export interface CleaningTask {
  id: string;
  roomId: string;
  housekeeperId: string;
  status: CleaningTaskStatus;
  priority: TaskPriority;
  assignedAt: string;
  completedAt?: string;
  inspectedBy?: string;
}

export interface LaundryItem {
  id: string;
  guestId?: string;
  roomId?: string;
  itemType: string; // Towels, Bedding, Shirts, Suits
  quantity: number;
  status: 'Received' | 'In Progress' | 'Completed' | 'Delivered';
  cost: number;
  createdAt: string;
}

export interface LostAndFound {
  id: string;
  description: string;
  foundLocation: string; // Room 201, Lobby, etc.
  foundDate: string;
  status: 'Reported' | 'Claimed' | 'Disposed';
  claimedByGuestId?: string;
  notes?: string;
}

export interface MaintenanceRequest {
  id: string;
  roomId?: string;
  equipmentName?: string;
  description: string;
  priority: TaskPriority;
  status: MaintenanceStatus;
  requestedBy: string; // User ID or Room Service
  assignedTo?: string; // Maintenance Staff ID
  createdAt: string;
  resolvedAt?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'checkin' | 'checkout' | 'payment' | 'low_stock' | 'maintenance' | 'approval';
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  module: string;
  details: string;
  createdAt: string;
}

// ============================================================================
// SYSTEM GLOBAL SETTINGS & PROFILE
// ============================================================================

export interface HotelProfile {
  name: string;
  logo: string;
  coverImage: string;
  slogan: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  country: string;
  currency: string;
  timeZone: string;
  taxNumber: string;
  taxRate: number; // e.g. 15 for 15% VAT
}

export interface HotelStructureConfig {
  buildings: string[];
  floors: string[];
  amenities: string[];
}

export interface HotelOSSettings {
  profile: HotelProfile;
  structure: HotelStructureConfig;
  theme: 'light' | 'dark';
  language: 'en' | 'es' | 'fr' | 'de';
  paymentMethods: string[];
  printerName: string;
  autoBackup: boolean;
}

export interface ShiftSaleDetail {
  menuItemId: string;
  name: string;
  quantitySold: number;
  expectedStockDecrement: number;
}

export interface DailyShiftReport {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime: string;
  totalSalesCount: number;
  totalSalesValue: number;
  expectedCash: number;
  actualCash: number;
  itemsSold: ShiftSaleDetail[];
  status: 'Pending Stock Verification' | 'Pending Manager Approval' | 'Pending CEO Approval' | 'Approved By CEO';
  stockVerifiedBy?: string;
  stockVerifiedAt?: string;
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  ceoApprovedBy?: string;
  ceoApprovedAt?: string;
  isDiscrepancyFound: boolean;
  notes?: string;
  notes_stock?: string;
  notes_manager?: string;
  notes_ceo?: string;
}

export interface HotelOSDatabase {
  settings: HotelOSSettings;
  users: User[];
  roles: Role[];
  departments: Department[];
  employees: Employee[];
  attendance: Attendance[];
  payroll: Payroll[];
  guests: Guest[];
  roomTypes: RoomType[];
  rooms: Room[];
  reservations: Reservation[];
  restaurantTables: RestaurantTable[];
  menuItems: MenuItem[];
  restaurantOrders: RestaurantOrder[];
  products: InventoryProduct[];
  inventoryMovements: InventoryMovement[];
  suppliers: Supplier[];
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  sales: POSSale[];
  accounts: Account[];
  transactions: Transaction[];
  cleaningTasks: CleaningTask[];
  laundryItems: LaundryItem[];
  lostAndFound: LostAndFound[];
  maintenanceRequests: MaintenanceRequest[];
  notifications: SystemNotification[];
  auditLogs: AuditLog[];
  shiftReports: DailyShiftReport[];
  consoleMappings?: ConsoleMapping[];
  isInitialized: boolean;
  isIsolatedClient?: boolean;
}

export interface ConsoleMapping {
  consoleId: string;
  consoleName: string;
  departmentId: string;
}

