import React, { useMemo } from 'react';
import { Users, DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';
import { MOCK_COURSES, MOCK_NOTES } from '../constants';

export const AdminPanel: React.FC = () => {
  
  // Logic to simulate dynamic stats based on our mock data
  const stats = useMemo(() => {
    // Simulate sales: Each course sold 120 times, Each note sold 250 times
    const courseRevenue = MOCK_COURSES.reduce((acc, c) => acc + (c.price * 120), 0);
    const noteRevenue = MOCK_NOTES.reduce((acc, n) => acc + (n.price * 250), 0);
    const totalRevenue = courseRevenue + noteRevenue;
    
    // Simulate users
    const baseUsers = 1234;
    const newSignups = 45; 

    return {
      users: baseUsers + newSignups,
      revenue: totalRevenue,
      activeCourses: MOCK_COURSES.length,
      activeNotes: MOCK_NOTES.length
    };
  }, []);

  // Simple mock data for the graph (Last 7 months)
  const graphData = [45, 60, 55, 70, 65, 80, 95]; // Percentages relative to max
  const maxVal = Math.max(...graphData);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your LMS performance</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-brand-200 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Users</p>
            <h3 className="text-3xl font-bold text-gray-900">{stats.users.toLocaleString()}</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 mt-2 bg-green-50 px-2 py-1 rounded-full">
              <TrendingUp size={12} /> +12% this month
            </span>
          </div>
          <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users size={28} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-brand-200 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
            <h3 className="text-3xl font-bold text-gray-900">₹{(stats.revenue / 100000).toFixed(2)}L</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 mt-2 bg-green-50 px-2 py-1 rounded-full">
              <ArrowUpRight size={12} /> +8.4% growth
            </span>
          </div>
          <div className="h-14 w-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign size={28} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
          {/* Decorative Circle */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          
          <div>
            <p className="text-sm font-medium text-slate-300 mb-1">Content Library</p>
            <div className="flex items-baseline gap-2">
               <h3 className="text-3xl font-bold">{stats.activeCourses + stats.activeNotes}</h3>
               <span className="text-sm text-slate-400">Items</span>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
             <div className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm text-xs">
                {stats.activeCourses} Courses
             </div>
             <div className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm text-xs">
                {stats.activeNotes} Note Bundles
             </div>
          </div>
        </div>
      </div>

      {/* Info Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-lg font-bold text-gray-900">Revenue Trends</h2>
               <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-1 focus:outline-none">
                  <option>Last 6 Months</option>
                  <option>Last Year</option>
               </select>
            </div>
            
            {/* Custom CSS Bar Chart */}
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-6">
               {graphData.map((value, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                     <div className="relative w-full max-w-[40px] bg-gray-100 rounded-t-lg h-full overflow-hidden">
                        <div 
                           className="absolute bottom-0 left-0 right-0 bg-brand-500 group-hover:bg-brand-600 transition-all duration-500 rounded-t-lg"
                           style={{ height: `${value}%` }}
                        ></div>
                        {/* Tooltipish value */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded transition-opacity pointer-events-none whitespace-nowrap">
                           ₹{(value * 1500).toLocaleString()}
                        </div>
                     </div>
                     <span className="text-xs text-gray-400 font-medium">
                        {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'][idx]}
                     </span>
                  </div>
               ))}
            </div>
         </div>

         {/* Recent Activity / Mini List */}
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Sales</h2>
            <div className="space-y-6">
               {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                        ST
                     </div>
                     <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Student #{2000+i}</p>
                        <p className="text-xs text-gray-500">Purchased Data Structures</p>
                     </div>
                     <div className="text-sm font-bold text-gray-900">
                        +₹499
                     </div>
                  </div>
               ))}
               <button className="w-full py-2 text-sm text-brand-600 font-medium hover:bg-brand-50 rounded-lg transition-colors">
                  View All Transactions
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};