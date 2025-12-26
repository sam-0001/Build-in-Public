import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCircle, LogOut, BookOpen } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-brand-600 p-1.5 rounded-lg group-hover:bg-brand-700 transition-colors">
              <BookOpen className="text-white" size={24} />
            </div>
            <div className="flex flex-col">
               <span className="font-bold text-gray-900 leading-tight">Build in Public</span>
               <span className="text-xs text-brand-600 font-medium tracking-wide">ENGINEERS</span>
            </div>
          </Link>

          <div className="flex items-center gap-6">
            <Link 
              to="/about-us" 
              className="text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors"
            >
              About Us
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors">
                  <UserCircle size={20} />
                  <span className="hidden sm:inline">{user?.firstName}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-full transition-all shadow-sm hover:shadow-md"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};