import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './ui/Modal';
import { useNavigate, useLocation } from 'react-router-dom';
import { BRANCHES, YEARS } from '../constants';
import { CheckCircle2, Loader2, ArrowRight, Lock, Mail } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, login, signupInit, signupVerify } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  
  // OTP Logic
  const [otpInput, setOtpInput] = useState('');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [branch, setBranch] = useState(BRANCHES[0].slug);
  const [year, setYear] = useState(YEARS[0]);
  const [college, setCollege] = useState('');

  const resetForm = () => {
    setStep('form');
    setOtpInput('');
    setLoading(false);
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
  };

  const handleSuccessRedirect = (user: any) => {
    const isAdmin = user.role === 'admin';
    setShowAuthModal(false);
    resetForm();

    if (isAdmin) {
        navigate('/admin');
        return;
    }

    // Check for deep link redirect
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== '/') {
        navigate(from, { replace: true });
    } else {
        navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        if (activeTab === 'login') {
            // --- LOGIN FLOW ---
            const user = await login(email, password);
            handleSuccessRedirect(user);
        } else {
            // --- SIGNUP FLOW START ---
            if (password.length < 6) throw new Error("Password must be at least 6 characters.");
            
            // Call Backend to send OTP via Brevo
            await signupInit({ email, firstName }); 
            setStep('otp');
        }
    } catch (error: any) {
        console.error(error);
        alert(error.message || 'Action failed. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Complete Signup: Send OTP + Data to Backend
      const user = await signupVerify(
          email, 
          otpInput, 
          password, 
          { firstName, lastName, branch, year, college }
      );
      handleSuccessRedirect(user);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Authentication failed. Incorrect OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={showAuthModal}
      onClose={() => { setShowAuthModal(false); resetForm(); }}
      title={step === 'otp' ? 'Verify Email' : (activeTab === 'login' ? 'Welcome Back' : 'Create Account')}
    >
      {step === 'form' ? (
        <>
          {/* Tabs */}
          <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300/50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'signup' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">First Name</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="e.g. Rahul"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Last Name</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="e.g. Deshmukh"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="you@college.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {activeTab === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Branch</label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-gray-900"
                    >
                      {BRANCHES.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Year</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-gray-900"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                   <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">College Name</label>
                   <input
                      required
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                      placeholder="e.g. COEP, PICT, VIIT"
                   />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {activeTab === 'login' ? 'Login' : 'Get Verification Code'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Check Your Email</h4>
            <p className="text-sm text-gray-500 mb-6">
              We've sent a 4-digit verification code to <br/> <span className="font-semibold text-gray-900">{email}</span>
            </p>
            
            <div className="relative">
              <input
                required
                autoFocus
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="0000"
                className="w-full text-center text-3xl tracking-[1em] px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-brand-50/50 focus:border-brand-500 outline-none font-mono text-gray-900 bg-white transition-all"
                maxLength={4}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Create Account'}
          </button>
          <button
             type="button"
             onClick={() => setStep('form')}
             className="text-sm text-gray-500 hover:text-gray-900 font-medium"
          >
            Wrong email? Go Back
          </button>
        </form>
      )}
    </Modal>
  );
};