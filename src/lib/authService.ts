import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, googleProvider, firestore } from './firebase';
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
 * Register a new Hotel Tenant and Super Admin account in Firebase Auth and Firestore.
 */
export async function registerHotelAndOwner(input: RegisterHotelInput): Promise<{ user: User; tenant: Tenant }> {
  const { hotelName, ownerName, email, phone, country, password } = input;

  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = userCredential.user;

  // 2. Generate Tenant ID and Hotel Code
  const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const hotelCode = hotelName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || `hotel${Date.now().toString().slice(-4)}`;

  const now = new Date().toISOString();

  // 3. Create Tenant Document
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

  // 4. Create Super Admin User Document
  const userDocData: User = {
    id: fbUser.uid,
    tenant_id: tenantId,
    username: email.split('@')[0].toLowerCase(),
    passwordHash: 'FIREBASE_AUTH_MANAGED',
    role: 'Super Admin',
    name: ownerName,
    email: email,
    phoneNumber: phone,
    country: country,
    isActive: true,
    createdAt: now
  };

  // 5. Default Settings
  const defaultSettings: HotelOSSettings = {
    profile: {
      name: hotelName,
      logo: '🏨',
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
      slogan: 'Elevated Hotel Management',
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

  // Write to Firestore
  try {
    await setDoc(doc(firestore, 'tenants', tenantId), tenantDocData);
    await setDoc(doc(firestore, 'users', fbUser.uid), userDocData);
    await setDoc(doc(firestore, 'settings', tenantId), defaultSettings);
  } catch (err) {
    console.warn('Firestore write error (will sync locally):', err);
  }

  // Sync to local store engine
  store.syncRemoteTenantAndUser(tenantDocData, userDocData, defaultSettings);

  return { user: userDocData, tenant: tenantDocData };
}

/**
 * Sign in using Email and Password
 */
export async function loginWithEmail(email: string, password: string): Promise<{ user: User; tenant: Tenant }> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = userCredential.user;

  // Fetch User document from Firestore
  let userDocData: User | null = null;
  let tenantDocData: Tenant | null = null;

  try {
    const userRef = doc(firestore, 'users', fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      userDocData = userSnap.data() as User;
    } else {
      // Query by email fallback
      const q = query(collection(firestore, 'users'), where('email', '==', email.toLowerCase()));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        userDocData = querySnap.docs[0].data() as User;
      }
    }
  } catch (err) {
    console.warn('Error fetching Firestore user:', err);
  }

  // If user not in Firestore, check local store
  if (!userDocData) {
    const localUser = store.getDb().users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.id === fbUser.uid);
    if (localUser) {
      userDocData = localUser;
    }
  }

  if (!userDocData) {
    // If user authenticated with Firebase but has no user doc yet, create Super Admin user
    const tenantId = `tenant_${Date.now()}`;
    tenantDocData = {
      id: tenantId,
      hotelCode: 'myhotel',
      name: 'Hotel OS Property',
      ownerName: fbUser.displayName || email.split('@')[0],
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
      id: fbUser.uid,
      tenant_id: tenantId,
      username: email.split('@')[0].toLowerCase(),
      passwordHash: 'FIREBASE_AUTH_MANAGED',
      role: 'Super Admin',
      name: fbUser.displayName || email.split('@')[0],
      email: email,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(firestore, 'tenants', tenantId), tenantDocData);
      await setDoc(doc(firestore, 'users', fbUser.uid), userDocData);
    } catch (e) {
      console.warn('Error writing fallback user to Firestore:', e);
    }
  }

  // Fetch Tenant
  if (!tenantDocData && userDocData) {
    try {
      const tenantSnap = await getDoc(doc(firestore, 'tenants', userDocData.tenant_id));
      if (tenantSnap.exists()) {
        tenantDocData = tenantSnap.data() as Tenant;
      }
    } catch (err) {
      console.warn('Error fetching tenant:', err);
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

  store.setActiveUserAndTenant(userDocData, tenantDocData);
  return { user: userDocData, tenant: tenantDocData! };
}

/**
 * Sign in using Google OAuth
 */
export async function loginWithGoogle(): Promise<{ user: User; tenant: Tenant; isNewUser: boolean }> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  const email = fbUser.email || `${fbUser.uid}@google.com`;

  let userDocData: User | null = null;
  let tenantDocData: Tenant | null = null;
  let isNewUser = false;

  try {
    const userSnap = await getDoc(doc(firestore, 'users', fbUser.uid));
    if (userSnap.exists()) {
      userDocData = userSnap.data() as User;
    } else {
      // Check query by email
      const q = query(collection(firestore, 'users'), where('email', '==', email.toLowerCase()));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        userDocData = qSnap.docs[0].data() as User;
      }
    }
  } catch (err) {
    console.warn('Google auth firestore query error:', err);
  }

  // If new user via Google, create Hotel and Super Admin account
  if (!userDocData) {
    isNewUser = true;
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const hotelName = `${fbUser.displayName || 'Grand'} Hotel & Resort`;
    const hotelCode = hotelName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || `hotel${Date.now().toString().slice(-4)}`;

    tenantDocData = {
      id: tenantId,
      hotelCode,
      name: hotelName,
      ownerName: fbUser.displayName || 'Hotel Owner',
      businessRegistrationNumber: `REG-${Date.now().toString().slice(-6)}`,
      logo: '🏨',
      currency: 'USD',
      timeZone: 'UTC',
      subscriptionPlan: 'Professional',
      email: email,
      phone: fbUser.phoneNumber || '',
      address: '',
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    userDocData = {
      id: fbUser.uid,
      tenant_id: tenantId,
      username: (email.split('@')[0] || 'google_user').toLowerCase(),
      passwordHash: 'GOOGLE_OAUTH',
      role: 'Super Admin',
      name: fbUser.displayName || 'Hotel Admin',
      email: email,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const defaultSettings: HotelOSSettings = {
      profile: {
        name: hotelName,
        logo: '🏨',
        coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
        slogan: 'Elevated Multi-Tenant Hospitality',
        phone: fbUser.phoneNumber || '',
        email: email,
        website: '',
        address: '',
        country: 'Global',
        currency: 'USD',
        timeZone: 'UTC',
        taxNumber: '',
        taxRate: 15
      },
      structure: {
        buildings: ['Main Building'],
        floors: ['Ground Floor', '1st Floor'],
        amenities: ['Wi-Fi', 'Air Conditioning', 'Room Service']
      },
      theme: 'light',
      language: 'en',
      paymentMethods: ['Cash', 'Card', 'Mobile Money'],
      printerName: 'Default Thermal Printer',
      autoBackup: true
    };

    try {
      await setDoc(doc(firestore, 'tenants', tenantId), tenantDocData);
      await setDoc(doc(firestore, 'users', fbUser.uid), userDocData);
      await setDoc(doc(firestore, 'settings', tenantId), defaultSettings);
    } catch (e) {
      console.warn('Error saving Google new user to Firestore:', e);
    }

    store.syncRemoteTenantAndUser(tenantDocData, userDocData, defaultSettings);
  } else {
    // Fetch tenant document for existing Google user
    try {
      const tenantSnap = await getDoc(doc(firestore, 'tenants', userDocData.tenant_id));
      if (tenantSnap.exists()) {
        tenantDocData = tenantSnap.data() as Tenant;
      }
    } catch (e) {
      console.warn('Error fetching tenant for Google user:', e);
    }

    if (!tenantDocData) {
      tenantDocData = {
        id: userDocData.tenant_id,
        hotelCode: 'myhotel',
        name: 'Hotel Property',
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

  store.setActiveUserAndTenant(userDocData, tenantDocData);
  return { user: userDocData, tenant: tenantDocData!, isNewUser };
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Logout
 */
export async function logoutCurrentSession(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signOut error:', e);
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
