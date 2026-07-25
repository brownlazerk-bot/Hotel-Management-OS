import { supabase, isSupabaseConfigured } from './supabase';
import { store, User, Tenant, HotelOSSettings } from '../db/store';

export interface RegisterHotelInput {
  hotelName: string;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}

/**
 * Helper to test if an error is due to unconfigured/missing Supabase API keys
 */
function isUnconfiguredKeyError(err: any): boolean {
  if (!err) return false;
  const str = JSON.stringify(err).toLowerCase();
  const msg = (err.message || '').toLowerCase();
  return (
    str.includes('no api key found') ||
    str.includes('apikey') ||
    msg.includes('no api key found') ||
    msg.includes('apikey') ||
    msg.includes('invalid api key') ||
    msg.includes('failed to fetch')
  );
}

/**
 * Register a new Hotel Tenant and Super Admin account in Supabase Auth & PostgreSQL.
 */
export async function registerHotelAndOwner(input: RegisterHotelInput): Promise<{ user: User; tenant: Tenant }> {
  const { hotelName, ownerName, email, phone, country, password } = input;

  let userId = `usr_${Date.now()}`;
  let suUserCreated = false;

  // 1. Try Supabase Auth signUp if configured
  if (isSupabaseConfigured) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: ownerName,
            hotel_name: hotelName,
            phone: phone,
            country: country
          }
        }
      });

      if (authError) {
        if (isUnconfiguredKeyError(authError)) {
          console.warn('Supabase key unconfigured, proceeding with local database engine registration.');
        } else if (authError.message?.toLowerCase().includes('already registered') || authError.message?.toLowerCase().includes('email')) {
          throw new Error('An account with this email address already exists. Please sign in instead.');
        } else if (authError.message?.toLowerCase().includes('weak')) {
          throw new Error('Password is too weak. Please use a stronger password.');
        } else {
          throw new Error(authError.message || 'Registration failed.');
        }
      } else if (authData.user) {
        userId = authData.user.id;
        suUserCreated = true;
      }
    } catch (err: any) {
      if (!isUnconfiguredKeyError(err) && !err.message?.includes('local database engine')) {
        throw err;
      }
    }
  }

  // 2. Generate Tenant ID and Hotel Code
  const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const hotelCode = hotelName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || `hotel${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  // 3. Create Tenant Record
  const tenantDocData: Tenant = {
    id: tenantId,
    hotelCode: hotelCode,
    name: hotelName,
    ownerName: ownerName,
    country: country,
    businessRegistrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    logo: '🏨',
    currency: 'USD',
    timeZone: 'UTC',
    subscriptionPlan: 'Professional',
    email: email,
    phone: phone,
    address: `${country}`,
    status: 'Active',
    createdAt: now
  };

  // 4. Create Super Admin User Record linked to Hotel
  const userDocData: User = {
    id: userId,
    tenant_id: tenantId,
    username: email.split('@')[0].toLowerCase(),
    passwordHash: 'SUPABASE_JWT_MANAGED',
    role: 'Super Admin',
    name: ownerName,
    email: email,
    phoneNumber: phone,
    country: country,
    isActive: true,
    createdAt: now
  };

  // 5. Default Hotel Settings
  const defaultSettings: HotelOSSettings = {
    profile: {
      name: hotelName,
      logo: '🏨',
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
      slogan: 'Elevated Hospitality Operating System',
      phone: phone,
      email: email,
      website: '',
      address: country,
      country: country || 'Global',
      currency: 'USD',
      timeZone: 'UTC',
      taxNumber: '',
      taxRate: 15
    },
    structure: {
      buildings: ['Main Building'],
      floors: ['Ground Floor', '1st Floor', '2nd Floor'],
      amenities: ['Wi-Fi', 'Air Conditioning', 'Room Service', 'Housekeeping']
    },
    theme: 'light',
    language: 'en',
    paymentMethods: ['Cash', 'Card', 'Mobile Money'],
    printerName: 'Default Printer',
    autoBackup: true
  };

  // 6. Write to Supabase PostgreSQL Tables if active & configured
  if (isSupabaseConfigured && suUserCreated) {
    try {
      await supabase.from('hotels').insert({
        id: tenantId,
        hotel_code: hotelCode,
        name: hotelName,
        owner_name: ownerName,
        country: country,
        business_registration_number: tenantDocData.businessRegistrationNumber,
        logo: tenantDocData.logo,
        currency: tenantDocData.currency,
        time_zone: tenantDocData.timeZone,
        subscription_plan: tenantDocData.subscriptionPlan,
        email: email,
        phone: phone,
        address: country,
        status: 'Active',
        created_at: now
      });

      await supabase.from('users').insert({
        id: userId,
        hotel_id: tenantId,
        username: userDocData.username,
        role: 'Super Admin',
        name: ownerName,
        email: email,
        phone_number: phone,
        country: country,
        is_active: true,
        created_at: now
      });
    } catch (err) {
      console.warn('Supabase DB write warning (will sync local engine):', err);
    }
  }

  // 7. Sync to local store engine & set active session
  store.syncRemoteTenantAndUser(tenantDocData, userDocData, defaultSettings);
  store.setActiveUserAndTenant(userDocData, tenantDocData);

  return { user: userDocData, tenant: tenantDocData };
}

/**
 * Sign in using Email and Password via Supabase Auth
 */
export async function loginWithEmail(email: string, password: string): Promise<{ user: User; tenant: Tenant }> {
  let suUser: any = null;

  // 1. Try Supabase Auth if configured
  if (isSupabaseConfigured) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        if (isUnconfiguredKeyError(authError)) {
          console.warn('Supabase key unconfigured, falling back to local authentication engine.');
        } else if (authError.message?.toLowerCase().includes('invalid') || authError.message?.toLowerCase().includes('credentials')) {
          throw new Error('Invalid email address or password.');
        } else {
          throw new Error(authError.message || 'Authentication failed.');
        }
      } else if (authData.user) {
        suUser = authData.user;
      }
    } catch (err: any) {
      if (!isUnconfiguredKeyError(err) && !err.message?.includes('local authentication engine')) {
        throw err;
      }
    }
  }

  const userId = suUser?.id || `usr_${Date.now()}`;
  let userDocData: User | null = null;
  let tenantDocData: Tenant | null = null;

  // 2. Fetch user record from Supabase DB if user is authenticated via Supabase
  if (suUser && isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userData) {
        userDocData = {
          id: userData.id,
          tenant_id: userData.hotel_id,
          username: userData.username || email.split('@')[0],
          passwordHash: 'SUPABASE_JWT_MANAGED',
          role: userData.role || 'Super Admin',
          name: userData.name || email.split('@')[0],
          email: userData.email || email,
          phoneNumber: userData.phone_number,
          country: userData.country,
          isActive: userData.is_active ?? true,
          createdAt: userData.created_at || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('Error fetching Supabase user record:', err);
    }
  }

  // 3. Fallback to local store lookup if user record not found or in local mode
  if (!userDocData) {
    const localUser = store.getDb().users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.id === userId);
    if (localUser) {
      userDocData = localUser;
    }
  }

  // 4. Auto-provision user & tenant if authenticating for the first time
  if (!userDocData) {
    const tenantId = `tenant_${Date.now()}`;
    tenantDocData = {
      id: tenantId,
      hotelCode: 'myhotel',
      name: 'Hotel OS Property',
      ownerName: suUser?.user_metadata?.full_name || email.split('@')[0],
      businessRegistrationNumber: 'REG-DEFAULT',
      logo: '🏨',
      currency: 'USD',
      timeZone: 'UTC',
      subscriptionPlan: 'Standard',
      email: email,
      phone: '',
      address: '',
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    userDocData = {
      id: userId,
      tenant_id: tenantId,
      username: email.split('@')[0].toLowerCase(),
      passwordHash: 'SUPABASE_JWT_MANAGED',
      role: 'Super Admin',
      name: suUser?.user_metadata?.full_name || email.split('@')[0],
      email: email,
      isActive: true,
      createdAt: new Date().toISOString()
    };
  }

  // 5. Fetch or resolve Tenant
  if (!tenantDocData && userDocData) {
    if (isSupabaseConfigured) {
      try {
        const { data: hotelData } = await supabase
          .from('hotels')
          .select('*')
          .eq('id', userDocData.tenant_id)
          .single();

        if (hotelData) {
          tenantDocData = {
            id: hotelData.id,
            hotelCode: hotelData.hotel_code,
            name: hotelData.name,
            ownerName: hotelData.owner_name,
            country: hotelData.country,
            businessRegistrationNumber: hotelData.business_registration_number || 'REG-DEFAULT',
            logo: hotelData.logo || '🏨',
            currency: hotelData.currency || 'USD',
            timeZone: hotelData.time_zone || 'UTC',
            subscriptionPlan: hotelData.subscription_plan || 'Standard',
            email: hotelData.email,
            phone: hotelData.phone,
            address: hotelData.address,
            status: hotelData.status || 'Active',
            createdAt: hotelData.created_at || new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('Error fetching Supabase hotel:', err);
      }
    }

    if (!tenantDocData) {
      const localTenant = store.getDb().tenants.find(t => t.id === userDocData?.tenant_id);
      if (localTenant) {
        tenantDocData = localTenant;
      } else {
        tenantDocData = {
          id: userDocData.tenant_id,
          hotelCode: 'myhotel',
          name: 'Hotel OS Property',
          ownerName: userDocData.name,
          businessRegistrationNumber: 'REG-DEFAULT',
          logo: '🏨',
          currency: 'USD',
          timeZone: 'UTC',
          subscriptionPlan: 'Standard',
          email: userDocData.email,
          phone: '',
          address: '',
          status: 'Active',
          createdAt: new Date().toISOString()
        };
      }
    }
  }

  store.setActiveUserAndTenant(userDocData, tenantDocData!);
  return { user: userDocData, tenant: tenantDocData! };
}

/**
 * Sign in using Google OAuth via Supabase Auth
 */
export async function loginWithGoogle(): Promise<{ user: User; tenant: Tenant; isNewUser: boolean }> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error && !isUnconfiguredKeyError(error)) {
        throw new Error('Google Sign-In failed: ' + error.message);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const suUser = sessionData.session?.user;

      if (suUser) {
        const email = suUser.email || `${suUser.id}@google.com`;
        let userDocData: User | null = null;
        let tenantDocData: Tenant | null = null;

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', suUser.id)
          .single();

        if (userData) {
          userDocData = {
            id: userData.id,
            tenant_id: userData.hotel_id,
            username: userData.username,
            passwordHash: 'SUPABASE_OAUTH',
            role: userData.role,
            name: userData.name,
            email: userData.email,
            isActive: userData.is_active,
            createdAt: userData.created_at
          };

          const { data: hotelData } = await supabase
            .from('hotels')
            .select('*')
            .eq('id', userDocData.tenant_id)
            .single();

          if (hotelData) {
            tenantDocData = {
              id: hotelData.id,
              hotelCode: hotelData.hotel_code,
              name: hotelData.name,
              ownerName: hotelData.owner_name,
              businessRegistrationNumber: hotelData.business_registration_number || 'REG-DEFAULT',
              logo: hotelData.logo || '🏨',
              currency: hotelData.currency || 'USD',
              timeZone: hotelData.time_zone || 'UTC',
              subscriptionPlan: hotelData.subscription_plan || 'Standard',
              email: hotelData.email,
              phone: hotelData.phone,
              address: hotelData.address,
              status: hotelData.status || 'Active',
              createdAt: hotelData.created_at || new Date().toISOString()
            };
          }
        }

        if (userDocData && tenantDocData) {
          store.setActiveUserAndTenant(userDocData, tenantDocData);
          return { user: userDocData, tenant: tenantDocData, isNewUser: false };
        }
      }
    } catch (err: any) {
      if (!isUnconfiguredKeyError(err)) {
        throw err;
      }
    }
  }

  // Fallback for Google login in local mode
  const tenantId = `tenant_${Date.now()}`;
  const googleTenant: Tenant = {
    id: tenantId,
    hotelCode: 'grandhotel',
    name: 'Grand Hotel & Resort',
    ownerName: 'Google Administrator',
    businessRegistrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    logo: '🏨',
    currency: 'USD',
    timeZone: 'UTC',
    subscriptionPlan: 'Professional',
    email: 'admin@grandhotel.com',
    phone: '+1 555-0199',
    address: 'United States',
    status: 'Active',
    createdAt: new Date().toISOString()
  };

  const googleUser: User = {
    id: `usr_google_${Date.now()}`,
    tenant_id: tenantId,
    username: 'google_admin',
    passwordHash: 'SUPABASE_OAUTH',
    role: 'Super Admin',
    name: 'Google Administrator',
    email: 'admin@grandhotel.com',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  store.setActiveUserAndTenant(googleUser, googleTenant);
  return { user: googleUser, tenant: googleTenant, isNewUser: true };
}

/**
 * Send password reset email via Supabase Auth
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });

      if (error && !isUnconfiguredKeyError(error)) {
        throw new Error(error.message || 'Failed to send password reset email.');
      }
    } catch (err: any) {
      if (!isUnconfiguredKeyError(err)) {
        throw err;
      }
    }
  }
}

/**
 * Logout of current Supabase Auth session
 */
export async function logoutCurrentSession(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
  }
  store.logout();
}

/**
 * Map user role to starting tab/route
 */
export function getStartingTabForRole(role: string): { tabId: string; subTab?: string; path: string } {
  const normalized = (role || '').toLowerCase();

  if (normalized.includes('admin') || normalized.includes('ceo') || normalized.includes('owner') || normalized.includes('manager')) {
    return { tabId: 'dashboard', path: '/dashboard' };
  }
  if (normalized.includes('reception') || normalized.includes('front desk')) {
    return { tabId: 'front_office', subTab: 'bookings', path: '/front-office' };
  }
  if (normalized.includes('cashier')) {
    return { tabId: 'dining', subTab: 'terminal', path: '/pos' };
  }
  if (normalized.includes('waiter') || normalized.includes('server')) {
    return { tabId: 'dining', subTab: 'tables', path: '/restaurant' };
  }
  if (normalized.includes('kitchen') || normalized.includes('chef')) {
    return { tabId: 'dining', subTab: 'kitchen', path: '/kitchen' };
  }
  if (normalized.includes('housekeep') || normalized.includes('clean')) {
    return { tabId: 'operations', subTab: 'housekeeping', path: '/housekeeping' };
  }
  if (normalized.includes('hr') || normalized.includes('human resource')) {
    return { tabId: 'finance', subTab: 'employees', path: '/employees' };
  }
  if (normalized.includes('accountant') || normalized.includes('finance') || normalized.includes('auditor')) {
    return { tabId: 'finance', subTab: 'ledger', path: '/accounting' };
  }
  if (normalized.includes('store') || normalized.includes('inventory') || normalized.includes('warehouse')) {
    return { tabId: 'inventory', subTab: 'registry', path: '/inventory' };
  }

  return { tabId: 'dashboard', path: '/dashboard' };
}
