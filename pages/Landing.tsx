import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRANCHES } from '../constants';
import { motion } from 'framer-motion';
import { Code, Cpu, Settings, Home, Wifi, Database, ArrowRight } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'Code': <Code size={32} />,
  'Cpu': <Cpu size={32} />,
  'Settings': <Settings size={32} />,
  'Home': <Home size={32} />,
  'Wifi': <Wifi size={32} />,
  'Database': <Database size={32} />,
};

export const LandingPage: React.FC = () => {
  const { isAuthenticated, setShowAuthModal } = useAuth();
  const navigate = useNavigate();

  const handleBranchClick = (slug: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      navigate(`/branch/${slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200 pt-20 pb-24 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold mb-6">
            For SPPU Students
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Master Your Engineering Exams <br />
            <span className="text-brand-600">Without The Stress</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Exam-oriented courses, precise notes, and video lectures tailored for Pune University curriculum.
          </p>
          <div className="flex justify-center gap-4">
             <button onClick={() => {
                const el = document.getElementById('branches');
                el?.scrollIntoView({ behavior: 'smooth' });
             }} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                View All Branches
             </button>
          </div>
        </motion.div>
      </section>

      {/* Branches Grid */}
      <section id="branches" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-10">
           <h2 className="text-2xl font-bold text-gray-900">Select Your Branch</h2>
           <span className="text-sm text-gray-500">From FE to BE</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BRANCHES.map((branch, index) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              onClick={() => handleBranchClick(branch.slug)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg hover:border-brand-200 transition-all group"
            >
              <div className="h-14 w-14 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                {iconMap[branch.icon]}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{branch.name}</h3>
              <p className="text-gray-500 text-sm mb-4">{branch.description}</p>
              <div className="flex items-center text-brand-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                Explore Content <ArrowRight size={16} className="ml-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* Features Trust Section */}
      <section className="bg-white py-16 border-y border-gray-100">
         <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
               <div className="font-bold text-3xl text-gray-900 mb-2">10k+</div>
               <div className="text-gray-500">Students Enrolled</div>
            </div>
            <div>
               <div className="font-bold text-3xl text-gray-900 mb-2">500+</div>
               <div className="text-gray-500">Hours of Content</div>
            </div>
             <div>
               <div className="font-bold text-3xl text-gray-900 mb-2">SPPU</div>
               <div className="text-gray-500">Curriculum Aligned</div>
            </div>
         </div>
      </section>
    </div>
  );
};