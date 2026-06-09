import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalContainerProps {
 children: React.ReactNode;
 onClose: () => void;
 className?: string;
 title?: string;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({ children, onClose, className = '', title }) => {
 return (
 <div className="absolute inset-0 flex items-center justify-center p-4">
 {/* Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
 />

 {/* Modal Content */}
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 onClick={(e) => e.stopPropagation()}
 className={`relative w-full max-w-lg bg-[#0D0D0F] border border-silver-DEFAULT/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ${className}`}
 style={{
 boxShadow: 'inset 0 0 20px rgba(212, 175, 55, 0.1), 0 20px 50px rgba(0, 0, 0, 0.5)'
 }}
 >
 {/* Header */}
 <div className="flex items-center justify-between p-4 border-b border-silver-DEFAULT/10 bg-black/20">
 <h3 className="text-silver-bright font-quantico font-black uppercase tracking-widest text-xs">
 {title || 'Oracle'}
 </h3>
 <button
 onClick={onClose}
 className="p-1 hover:bg-glacier-DEFAULT/10 rounded-full transition-colors text-silver-bright/60 hover:text-glacier-bright"
 >
 <X size={18} />
 </button>
 </div>

 {/* Body */}
 <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
 {children}
 </div>
 </motion.div>
 </div>
 );
};
