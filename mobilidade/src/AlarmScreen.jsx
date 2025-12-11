"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function AlarmScreen({ onDismiss }) {
  const [audioReady, setAudioReady] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const audio = new Audio(
      "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=="
    );
    setAudioReady(true);

    const playRadarSound = async () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const audioContext = new AudioContext();

        // Resume context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          await audioContext.resume().catch(() => { });
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        // Silently fail if blocked to avoid clearing up console for user
      }
    };

    playRadarSound();
  }, []);

  // Ensure AudioContext is closed when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleDismiss = () => {
    setClosing(true);
    setTimeout(() => onDismiss(), 900);
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: 0.9 }}
    >
      <div className="w-full h-full flex flex-col items-center justify-center space-y-12">
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-white text-9xl font-light tracking-tight">
            05:00
          </div>
          <div className="text-gray-400 text-lg mt-4">Alarme</div>
        </motion.div>

        <div className="relative w-48 h-48 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-gray-600"
              style={{
                width: 120 + i * 50,
                height: 120 + i * 50,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 2,
                delay: i * 0.2,
                repeat: Infinity,
              }}
            />
          ))}
        </div>

        <motion.button
          onClick={handleDismiss}
          className="mt-16 px-12 py-5 bg-red-600 text-white rounded-full text-2xl font-semibold hover:bg-red-700 transition"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Parar
        </motion.button>
      </div>
    </motion.div>
  );
}
