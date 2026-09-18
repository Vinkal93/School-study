"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export const FlipWords = ({
  words = [],
  duration = 3000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  const safeWords = Array.isArray(words) ? words.filter(Boolean) : [];
  const [currentWord, setCurrentWord] = useState(safeWords[0] || "");
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const startAnimation = useCallback(() => {
    if (safeWords.length === 0) return;
    const currentIndex = safeWords.indexOf(currentWord);
    const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % safeWords.length : 0;
    const word = safeWords[nextIndex];
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord, safeWords]);

  useEffect(() => {
    if (!isAnimating && safeWords.length > 1) {
      const timer = setTimeout(() => {
        startAnimation();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, duration, startAnimation, safeWords.length]);

  if (safeWords.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center overflow-visible align-baseline">
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          setIsAnimating(false);
        }}
      >
        <motion.span
          key={currentWord}
          initial={isAnimating ? { opacity: 0, y: 12 } : false}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: -12,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className={cn(
            "inline-block relative text-left whitespace-nowrap leading-normal",
            className
          )}
        >
          {currentWord}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default FlipWords;
