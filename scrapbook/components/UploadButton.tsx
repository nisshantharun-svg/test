"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";

interface UploadButtonProps {
  onClick: () => void;
}

export function UploadButton({ onClick }: UploadButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Add a photo"
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.3 }}
      whileHover={{ scale: 1.08, rotate: 6 }}
      whileTap={{ scale: 0.92, rotate: 0 }}
      className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gold text-[#fffdf8] shadow-[0_10px_24px_-6px_rgba(51,64,77,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose sm:bottom-8 sm:right-8"
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </motion.button>
  );
}
