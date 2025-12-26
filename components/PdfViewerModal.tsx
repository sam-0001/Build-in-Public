import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, AlertTriangle } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ isOpen, onClose, pdfUrl, title }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 z-50 backdrop-blur-md"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-6 pointer-events-none"
          >
            <div className="bg-zinc-900 rounded-none md:rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] pointer-events-auto flex flex-col overflow-hidden border border-zinc-800">
              
              {/* Header */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 bg-zinc-900 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 p-2 rounded-lg text-white">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white line-clamp-1">{title}</h3>
                    </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* PDF Container */}
              <div className="flex-1 bg-zinc-900 relative group flex justify-center items-center" onContextMenu={(e) => e.preventDefault()}>
                {/* Overlay to block direct right-click/save context menu on top of iframe */}
                <div className="absolute inset-0 pointer-events-none z-0" />
                
                {pdfUrl ? (
                    <iframe 
                        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-full border-0"
                        title={title}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                        <AlertTriangle size={32} className="mb-2 text-zinc-600" />
                        <p className="text-sm">Loading document...</p>
                    </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};