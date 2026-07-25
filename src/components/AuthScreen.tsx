import React, { useState } from 'react';
import { 
  Building, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Globe, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { 
  loginWithEmail, 
  loginWithGoogle, 
  registerHotelAndOwner, 
  sendPasswordReset, 
  getStartingTabForRole 
} from '../lib/authService';

interface AuthScreenProps {
  onAuthSuccess: (startingPath: string, startingTab: string, subTab?: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regHotelName, setRegHotelName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCountry, setRegCountry] = useState('United States');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const { user } = await loginWithEmail(loginEmail.trim(), loginPassword);
      const starting = getStartingTabForRole(user.role);
      onAuthSuccess(starting.path, starting.tabId, starting.subTab);
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email address or password.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please try again later.';
      } else if (err.message) {
        msg = err.message;
      }
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setLoginError('');
    setGoogleLoading(true);

    try {
      const { user } = await loginWithGoogle();
      const starting = getStartingTabForRole(user.role);
      onAuthSuccess(starting.path, starting.tabId, starting.subTab);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError('Google Sign-In failed: ' + (err.message || 'Popup closed or interrupted.'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    setRegLoading(true);

    try {
      const { user } = await registerHotelAndOwner({
        hotelName: regHotelName.trim(),
        ownerName: regOwnerName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        country: regCountry,
        password: regPassword
      });

      const starting = getStartingTabForRole(user.role);
      onAuthSuccess(starting.path, starting.tabId, starting.subTab);
    } catch (err: any) {
      console.error('Registration error:', err);
      let msg = 'Hotel registration failed.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use a stronger password.';
      } else if (err.message) {
        msg = err.message;
      }
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  // Handle Password Reset Submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSuccess('Password reset link sent! Check your inbox to create a new password.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      let msg = 'Failed to send reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No user account found with this email address.';
      } else if (err.message) {
        msg = err.message;
      }
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-[#E67E22] selection:text-white relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10">
        
        {/* Left Branding Side Banner */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#1B4F72] via-[#153E5B] to-slate-900 p-8 text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800/80">
          <div>
            {/* Logo Badge */}
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 mb-8">
              <div className="p-2 bg-[#E67E22] rounded-xl text-white shadow-lg">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight block text-white">Hotel OS</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block">Cloud Hospitality</span>
              </div>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight leading-tight mb-3">
              Next-Gen Property Operations Management
            </h1>
            
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Complete multi-departmental hotel operating platform — Front Office, POS, Inventory, Housekeeping, Financial Ledger & HR in one unified cloud suite.
            </p>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-start space-x-3 text-xs text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Production Supabase Auth & JWT session persistence.</span>
              </div>
              <div className="flex items-start space-x-3 text-xs text-slate-200">
                <Sparkles className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <span>Automated multi-role access control for all department staff.</span>
              </div>
              <div className="flex items-start space-x-3 text-xs text-slate-200">
                <Globe className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <span>Multi-device synchronization for mobile & desktop terminals.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Hotel OS v5.0 • Enterprise Edition</span>
            <span className="flex items-center text-emerald-400 font-semibold">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping mr-1.5"></span>
              System Online
            </span>
          </div>
        </div>

        {/* Right Authentication Container */}
        <div className="md:col-span-7 p-8 bg-slate-900 flex flex-col justify-center">
          
          {/* Navigation Tabs (Sign In / Register Hotel) */}
          {activeTab !== 'forgot_password' && (
            <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-[#1B4F72] text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Sign In Terminal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setRegError('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-[#E67E22] text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building className="h-3.5 w-3.5" />
                <span>Register Hotel</span>
              </button>
            </div>
          )}

          {/* VIEW 1: LOGIN */}
          {activeTab === 'login' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Welcome Back</h2>
                <p className="text-xs text-slate-400">Sign in with your authorized property credentials or Google account.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. owner@hotel.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('forgot_password');
                        setResetEmail(loginEmail);
                        setResetError('');
                        setResetSuccess('');
                      }}
                      className="text-xs font-semibold text-[#E67E22] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-[#E67E22] focus:ring-[#E67E22]"
                    />
                    <span>Remember Me</span>
                  </label>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading || googleLoading}
                  className="w-full py-3 bg-[#1B4F72] hover:bg-[#153E5B] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-blue-950/50 disabled:opacity-50"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Console</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-slate-900 px-3 text-slate-500 font-bold">Or Continue With</span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loginLoading || googleLoading}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3s.7 5.6 1.9 8l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* VIEW 2: REGISTER HOTEL */}
          {activeTab === 'register' && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white mb-1">Register New Property</h2>
                <p className="text-xs text-slate-400">Set up your hotel workspace and create your Super Admin account.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Hotel / Property Name
                  </label>
                  <div className="relative">
                    <Building className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grand Horizon Luxury Resort"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
                      value={regHotelName}
                      onChange={(e) => setRegHotelName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Owner Full Name
                    </label>
                    <div className="relative">
                      <User className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Connor"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
                        value={regOwnerName}
                        onChange={(e) => setRegOwnerName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="owner@hotel.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="tel"
                        required
                        placeholder="+1 (555) 019-2831"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Country
                    </label>
                    <div className="relative">
                      <Globe className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                      <select
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white focus:outline-none transition cursor-pointer"
                        value={regCountry}
                        onChange={(e) => setRegCountry(e.target.value)}
                      >
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Japan">Japan</option>
                        <option value="United Arab Emirates">United Arab Emirates</option>
                        <option value="Singapore">Singapore</option>
                        <option value="Other">Other Country</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="At least 6 chars"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="Re-enter password"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition font-mono"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {regError && (
                  <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 bg-[#E67E22] hover:bg-[#D35400] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-orange-950/50 disabled:opacity-50 mt-2"
                >
                  {regLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Creating Hotel Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account & Register Hotel</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* VIEW 3: FORGOT PASSWORD */}
          {activeTab === 'forgot_password' && (
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center space-x-2 text-[#E67E22] text-xs font-bold uppercase tracking-wider mb-2">
                  <KeyRound className="h-4 w-4" />
                  <span>Account Recovery</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Reset Password</h2>
                <p className="text-xs text-slate-400">Enter your registered email address and we will send a password reset link.</p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. owner@hotel.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#E67E22] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{resetSuccess}</span>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setResetError('');
                      setResetSuccess('');
                    }}
                    className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    Back to Sign In
                  </button>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 bg-[#E67E22] hover:bg-[#D35400] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-orange-950/50 disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
