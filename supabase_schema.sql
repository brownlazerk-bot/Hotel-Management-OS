-- ============================================================================
-- HOTEL OS - SUPABASE POSTGRESQL DATABASE SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HOTELS (TENANTS)
CREATE TABLE IF NOT EXISTS public.hotels (
  id VARCHAR(255) PRIMARY KEY,
  hotel_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  country VARCHAR(100) DEFAULT 'United States',
  business_registration_number VARCHAR(100),
  logo TEXT DEFAULT '🏨',
  currency VARCHAR(10) DEFAULT 'USD',
  time_zone VARCHAR(50) DEFAULT 'UTC',
  subscription_plan VARCHAR(50) DEFAULT 'Professional',
  address TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (LINKED TO ONE HOTEL)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY, -- References auth.users(id)
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL DEFAULT 'Super Admin',
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(100),
  country VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROLES
CREATE TABLE IF NOT EXISTS public.roles (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) REFERENCES public.hotels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  description TEXT
);

-- 5. DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  manager_id VARCHAR(255),
  budget NUMERIC(12,2) DEFAULT 0.00,
  employee_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  department_id VARCHAR(255) REFERENCES public.departments(id) ON DELETE SET NULL,
  salary NUMERIC(12,2) DEFAULT 0.00,
  email VARCHAR(255),
  phone VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Active',
  hired_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ROOMS
CREATE TABLE IF NOT EXISTS public.rooms (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_number VARCHAR(50) NOT NULL,
  type_id VARCHAR(100),
  floor VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Available',
  price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  amenities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. GUESTS
CREATE TABLE IF NOT EXISTS public.guests (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  passport_id VARCHAR(100),
  nationality VARCHAR(100),
  vip_status VARCHAR(50) DEFAULT 'Standard',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RESERVATIONS
CREATE TABLE IF NOT EXISTS public.reservations (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  guest_id VARCHAR(255) REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id VARCHAR(255) REFERENCES public.rooms(id) ON DELETE SET NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  total_amount NUMERIC(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'Confirmed',
  payment_status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  table_number VARCHAR(50),
  guest_id VARCHAR(255) REFERENCES public.guests(id) ON DELETE SET NULL,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(50),
  current_stock NUMERIC(12,2) DEFAULT 0,
  min_stock_alert NUMERIC(12,2) DEFAULT 0,
  unit_price NUMERIC(12,2) DEFAULT 0.00,
  supplier_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. PURCHASES
CREATE TABLE IF NOT EXISTS public.purchases (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  supplier_id VARCHAR(255) REFERENCES public.suppliers(id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. ACCOUNTING
CREATE TABLE IF NOT EXISTS public.accounting (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(100) NOT NULL,
  balance NUMERIC(12,2) DEFAULT 0.00,
  transactions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. PAYROLL
CREATE TABLE IF NOT EXISTS public.payroll (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  employee_id VARCHAR(255) REFERENCES public.employees(id) ON DELETE CASCADE,
  month VARCHAR(50) NOT NULL,
  basic_salary NUMERIC(12,2) DEFAULT 0.00,
  bonus NUMERIC(12,2) DEFAULT 0.00,
  deductions NUMERIC(12,2) DEFAULT 0.00,
  net_salary NUMERIC(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'Pending',
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  employee_id VARCHAR(255) REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'Present',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id VARCHAR(255) PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Hotel RLS: Users can access their assigned hotel
CREATE POLICY "Users can view their hotel" ON public.hotels
  FOR ALL USING (
    id IN (SELECT hotel_id FROM public.users WHERE users.id = auth.uid())
  );

-- Users RLS: Users can view users in their same hotel
CREATE POLICY "Users view same hotel users" ON public.users
  FOR ALL USING (
    hotel_id IN (SELECT hotel_id FROM public.users WHERE users.id = auth.uid()) OR id = auth.uid()
  );

-- Helper macroeconomic multi-device access policy
CREATE POLICY "Allow multi-device sessions for authentic users" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);
