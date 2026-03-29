import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DevModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const DevModal: React.FC<DevModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm w-full space-y-4"
          >
            <p className="text-white text-sm">{message}</p>
            <div className="flex gap-2 justify-end">
              {onCancel && (
                <button onClick={onCancel} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold">Cancel</button>
              )}
              <button onClick={onConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Confirm</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
