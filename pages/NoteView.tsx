import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Lock, FileText, ArrowLeft, Loader2, Check, CheckCircle2 } from 'lucide-react';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { ExamNote } from '../types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const NoteView: React.FC = () => {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const { user, isAuthenticated, setShowAuthModal, token, apiUrl, updateUserPurchases } = useAuth();
    const { notes } = useData();
    const [note, setNote] = useState<ExamNote | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // PDF State
    const [isPdfOpen, setIsPdfOpen] = useState(false);
    const [securePdfUrl, setSecurePdfUrl] = useState('');
    const [pdfTitle, setPdfTitle] = useState('');

    useEffect(() => {
        // Fetch specific note details to get fresh file URLs if needed
        const fetchNote = async () => {
            try {
                const res = await fetch(`${apiUrl}/notes/${noteId}`);
                if (res.ok) {
                    const data = await res.json();
                    setNote(data);
                } else {
                    // Fallback to local context if API fails or note not found
                    const localNote = notes.find(n => n.id === noteId);
                    setNote(localNote || null);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNote();
    }, [noteId, apiUrl, notes]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>;
    if (!note) return <div className="min-h-screen flex items-center justify-center">Note not found.</div>;

    const isPurchased = user?.purchasedNoteIds.includes(note.id);

    const handlePurchase = async () => {
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }

        setProcessing(true);
        try {
            const orderRes = await fetch(`${apiUrl}/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ itemId: note.id, type: 'note', amount: note.price })
            });
            const orderData = await orderRes.json();
            
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
                description: `Purchase ${note.title}`,
                order_id: orderData.id,
                handler: async function (response: any) {
                    const verifyRes = await fetch(`${apiUrl}/payment/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            itemId: note.id,
                            type: 'note'
                        })
                    });
                    if(verifyRes.ok) {
                        await updateUserPurchases('note', note.id);
                        alert("Purchase Successful!");
                        // Force refresh note to get signed URLs if they weren't public
                        window.location.reload(); 
                    }
                },
                theme: { color: "#0284c7" }
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch(e) { console.error(e); alert("Payment failed"); }
        finally { setProcessing(false); }
    };

    const openFile = async (url: string, title: string) => {
        if (!isPurchased) return;
        setPdfTitle(title);
        // If url is already signed from backend (it should be), use it.
        // Otherwise sign it.
        if (url.includes('X-Amz-Signature') || url.startsWith('http')) {
             setSecurePdfUrl(url);
        } else {
             const res = await fetch(`${apiUrl}/media/sign?key=${encodeURIComponent(url)}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
             });
             const data = await res.json();
             setSecurePdfUrl(data.url);
        }
        setIsPdfOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="max-w-4xl mx-auto px-4">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
                    <ArrowLeft size={20} /> Back
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                                    {note.subject}
                                </span>
                                <h1 className="text-3xl font-bold mb-2">{note.title}</h1>
                                <p className="text-white/80">{note.description}</p>
                            </div>
                            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                                <div className="text-3xl font-bold">₹{note.price}</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Included Files</h2>
                            <span className="text-sm text-gray-500">{note.files?.length || 1} Document(s)</span>
                        </div>

                        <div className="space-y-3">
                            {/* Compatibility for legacy single file */}
                            {(!note.files || note.files.length === 0) && note.fileUrl && (
                                <div 
                                    onClick={() => openFile(note.fileUrl!, note.title)}
                                    className={`flex items-center p-4 rounded-xl border transition-all ${isPurchased ? 'border-gray-200 hover:border-brand-500 cursor-pointer hover:shadow-md' : 'border-gray-200 opacity-75'}`}
                                >
                                    <div className="bg-orange-100 p-3 rounded-lg text-orange-600 mr-4">
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">Complete Notes Bundle</h3>
                                        <p className="text-xs text-gray-500">PDF Document</p>
                                    </div>
                                    {!isPurchased && <Lock size={20} className="text-gray-400" />}
                                </div>
                            )}

                            {/* New Multi-file list */}
                            {note.files?.map((file, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => openFile(file.url, file.title)}
                                    className={`flex items-center p-4 rounded-xl border transition-all ${isPurchased ? 'border-gray-200 hover:border-brand-500 cursor-pointer hover:shadow-md' : 'border-gray-200 opacity-75'}`}
                                >
                                    <div className="bg-orange-100 p-3 rounded-lg text-orange-600 mr-4">
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{file.title}</h3>
                                        <p className="text-xs text-gray-500">PDF Document</p>
                                    </div>
                                    {!isPurchased && <Lock size={20} className="text-gray-400" />}
                                </div>
                            ))}
                        </div>

                        {!isPurchased && (
                            <div className="mt-8 border-t border-gray-100 pt-6">
                                <button 
                                    onClick={handlePurchase}
                                    disabled={processing}
                                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {processing ? <Loader2 className="animate-spin" /> : `Unlock Full Bundle for ₹${note.price}`}
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-3">Secure payment via Razorpay. Instant access.</p>
                            </div>
                        )}
                         
                         {isPurchased && (
                            <div className="mt-8 bg-green-50 text-green-700 p-4 rounded-xl flex items-center justify-center gap-2 font-medium">
                                <CheckCircle2 size={20} /> You own this bundle. Click files above to view.
                            </div>
                         )}
                    </div>
                </div>
            </div>

            <PdfViewerModal 
                isOpen={isPdfOpen} 
                onClose={() => setIsPdfOpen(false)} 
                pdfUrl={securePdfUrl}
                title={pdfTitle}
            />
        </div>
    );
};