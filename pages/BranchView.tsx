import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BRANCHES, YEARS } from '../constants';
import { ContentType, Course, ExamNote } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PlayCircle, FileText, Check, Lock, ChevronRight, Loader2, BookOpen } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const BranchView: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { updateUserPurchases, user, isAuthenticated, setShowAuthModal, token, apiUrl } = useAuth();
  const { courses, notes } = useData();
  
  const [selectedYear, setSelectedYear] = useState<string>(user?.year || YEARS[0]);
  const [activeTab, setActiveTab] = useState<ContentType>('courses');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const branch = BRANCHES.find(b => b.slug === branchId);

  if (!branch) return <div className="p-10 text-center">Branch not found</div>;

  const filteredCourses = courses.filter(c => c.branchSlug === branchId && c.year === selectedYear);
  const filteredNotes = notes.filter(n => n.branchSlug === branchId && n.year === selectedYear);

  const handlePurchase = async (type: 'course' | 'note', item: Course | ExamNote) => {
    if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
    }

    setProcessingId(item.id);

    try {
        const orderRes = await fetch(`${apiUrl}/payment/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ itemId: item.id, type, amount: item.price })
        });
        
        const orderData = await orderRes.json();
        if(!orderRes.ok) throw new Error(orderData.message);

        let razorpayKey = 'test_key'; 
        try {
             if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_RAZORPAY_KEY_ID) {
                 razorpayKey = (import.meta as any).env.VITE_RAZORPAY_KEY_ID;
             }
        } catch(e) {}

        const options = {
            key: razorpayKey,
            amount: orderData.amount,
            currency: "INR",
            name: "Build in Public Engineers",
            description: `Purchase ${item.title}`,
            order_id: orderData.id,
            handler: async function (response: any) {
                try {
                    const verifyRes = await fetch(`${apiUrl}/payment/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            itemId: item.id,
                            type
                        })
                    });
                    
                    if(verifyRes.ok) {
                        await updateUserPurchases(type, item.id);
                        alert("Payment Successful!");
                    } else {
                        alert("Payment verification failed.");
                    }
                } catch(e) {
                    console.error(e);
                    alert("Network error.");
                } finally {
                    setProcessingId(null);
                }
            },
            prefill: {
                name: user?.firstName + " " + user?.lastName,
                email: user?.email,
            },
            theme: { color: "#0284c7" }
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.open();

    } catch (error: any) {
        console.error(error);
        alert(error.message || "Failed to initiate payment");
        setProcessingId(null);
    }
  };

  const isPurchased = (type: 'course' | 'note', id: string) => {
      if (!user) return false;
      return type === 'course' 
        ? user.purchasedCourseIds.includes(id)
        : user.purchasedNoteIds.includes(id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 pt-8 pb-4 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <div>
                <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-800 mb-1 flex items-center">
                   Home <ChevronRight size={14} className="mx-1" /> {branch.name}
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{branch.name}</h1>
               </div>
               
               <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
                 {YEARS.map((y) => (
                    <button
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                            selectedYear === y ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {y} Engineering
                    </button>
                 ))}
               </div>
           </div>

          <div className="flex border-b border-gray-200">
             <button
               onClick={() => setActiveTab('courses')}
               className={`flex-1 md:flex-none md:w-48 pb-3 text-center text-sm font-medium border-b-2 transition-colors ${
                 activeTab === 'courses' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
               }`}
             >
                Video Courses
             </button>
             <button
               onClick={() => setActiveTab('notes')}
               className={`flex-1 md:flex-none md:w-48 pb-3 text-center text-sm font-medium border-b-2 transition-colors ${
                 activeTab === 'notes' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
               }`}
             >
                Exam Notes
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
           <motion.div
             key={selectedYear + activeTab}
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             transition={{ duration: 0.2 }}
           >
             {activeTab === 'courses' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            No courses available for {selectedYear} yet.
                        </div>
                    )}
                    {filteredCourses.map(course => {
                        const purchased = isPurchased('course', course.id);
                        return (
                        <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
                            <div className="relative aspect-video bg-gray-200">
                                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                                {purchased && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                        <Check size={12} /> Owned
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">{course.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                    <span className="flex items-center gap-1"><PlayCircle size={14} /> {course.videoCount} Videos</span>
                                    <span className="flex items-center gap-1"><FileText size={14} /> {course.pdfCount} PDFs</span>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="text-xl font-bold text-gray-900">₹{course.price}</div>
                                    <button 
                                        onClick={() => purchased ? navigate(`/player/${course.id}`) : handlePurchase('course', course)}
                                        disabled={processingId === course.id}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                            purchased 
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            : 'bg-brand-600 text-white hover:bg-brand-700'
                                        }`}
                                    >
                                        {processingId === course.id ? (
                                            <><Loader2 className="animate-spin" size={16} /> Processing</>
                                        ) : (
                                            purchased ? 'View Content' : 'Buy Now'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNotes.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            No notes available for {selectedYear} yet.
                        </div>
                    )}
                    {filteredNotes.map(note => {
                        const purchased = isPurchased('note', note.id);
                        return (
                        <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                             {/* Decorative Background Icon */}
                            <BookOpen className="absolute -right-6 -bottom-6 text-gray-50 opacity-50 transition-transform group-hover:scale-110" size={120} />
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-orange-50 text-orange-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                                        {note.subject}
                                    </span>
                                    {purchased ? (
                                        <span className="text-green-600"><Check size={20} /></span>
                                    ) : (
                                        <span className="text-gray-400"><Lock size={18} /></span>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{note.title}</h3>
                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{note.description}</p>
                                <div className="inline-block bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 mb-4">
                                    Coverage: {note.coverage}
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div className="text-xl font-bold text-gray-900">{purchased ? 'Unlocked' : `₹${note.price}`}</div>
                                     <button 
                                        onClick={() => navigate(`/notes/${note.id}`)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                            purchased 
                                            ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                                            : 'bg-gray-900 text-white hover:bg-gray-800'
                                        }`}
                                    >
                                        {purchased ? 'Open Bundle' : 'View Details'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
             )}
           </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};