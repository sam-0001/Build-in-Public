import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../Navbar';

export const StudentLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-grow">
        <Outlet />
      </div>
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Build in Public – Engineers. All rights reserved.</p>
          <p className="mt-2">Made for SPPU Students.</p>
        </div>
      </footer>
    </div>
  );
};