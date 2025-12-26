import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext'; 
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './pages/Landing';
import { BranchView } from './pages/BranchView';
import { Dashboard } from './pages/Dashboard';
import { CoursePlayer } from './pages/CoursePlayer';
import { NoteView } from './pages/NoteView';
import { BuildInPublicEngineers } from './pages/BuildInPublicEngineers';
import { AboutUs } from './pages/AboutUs';
import { AdminPanel } from './pages/Admin';
import { AdminCourses } from './pages/admin/AdminCourses';
import { AdminNotes } from './pages/admin/AdminNotes';
import { AdminMedia } from './pages/admin/AdminMedia';

// Layouts & Guards
import { StudentLayout } from './components/layouts/StudentLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import { RoleGuard } from './components/guards/RoleGuard';

const AppContent = () => {
    return (
        <>
          <Routes>
            {/* Public & Student Routes (Shared Layout) */}
            <Route element={<StudentLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/branch/:branchId" element={<BranchView />} />
              
              {/* Deep Link to Notes Bundle */}
              <Route path="/notes/:noteId" element={<NoteView />} />
              
              {/* SEO Page */}
              <Route path="/build-in-public-engineers" element={<BuildInPublicEngineers />} />

              {/* Protected Student Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <RoleGuard allowedRoles={['student']}>
                    <Dashboard />
                  </RoleGuard>
                } 
              />
            </Route>

            {/* Standalone Player Route */}
             <Route 
                path="/player/:courseId" 
                element={
                  <RoleGuard allowedRoles={['student', 'admin']}>
                    <CoursePlayer />
                  </RoleGuard>
                } 
              />

            {/* Protected Admin Routes */}
            <Route 
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminLayout />
                </RoleGuard>
              }
            >
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/notes" element={<AdminNotes />} />
              <Route path="/admin/media" element={<AdminMedia />} />
              <Route path="/admin/users" element={<div className="p-10">User Management (Coming Soon)</div>} />
              <Route path="/admin/settings" element={<div className="p-10">System Settings (Coming Soon)</div>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          <AuthModal />
        </>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
            <AppContent />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;