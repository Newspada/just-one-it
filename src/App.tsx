/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Item {
  id: number;
  words: string[];
}

// Helper to generate 110 items with 5 words each
const generateItems = (): Item[] => {
  const wordPool = [
    "ocean", "mountain", "forest", "river", "desert", "valley", "island", "canyon", "prairie", "tundra",
    "starlight", "moonlight", "sunshine", "breeze", "thunder", "lightning", "rainbow", "aurora", "comet", "nebula",
    "ancient", "modern", "future", "mystic", "silent", "vibrant", "golden", "silver", "azure", "crimson",
    "journey", "quest", "path", "bridge", "gate", "tower", "castle", "temple", "shrine", "garden",
    "wisdom", "courage", "honor", "peace", "spirit", "dream", "echo", "shadow", "flame", "frost",
    "crystal", "emerald", "sapphire", "ruby", "amber", "pearl", "diamond", "quartz", "onyx", "jade",
    "eagle", "wolf", "lion", "tiger", "bear", "whale", "dolphin", "phoenix", "dragon", "griffin",
    "whisper", "melody", "rhythm", "harmony", "canvas", "sculpture", "poem", "fable", "legend", "myth",
    "compass", "anchor", "lantern", "key", "scroll", "shield", "sword", "crown", "throne", "scepter",
    "nebula", "galaxy", "cosmos", "planet", "orbit", "gravity", "vacuum", "meteor", "eclipse", "zenith"
  ];

  const items: Item[] = [];
  for (let i = 0; i < 110; i++) {
    const words: string[] = [];
    for (let j = 0; j < 5; j++) {
      const randomIndex = Math.floor(Math.random() * wordPool.length);
      words.push(wordPool[randomIndex]);
    }
    items.push({ id: i, words });
  }
  return items;
};

export default function App() {
  const [pool, setPool] = useState<Item[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [history, setHistory] = useState<Item[]>([]);

  // Initialize pool
  const initializePool = useCallback(() => {
    const newItems = generateItems();
    // Shuffle
    const shuffled = [...newItems].sort(() => Math.random() - 0.5);
    setPool(shuffled);
    setRevealedCount(0);
    setCurrentItem(null);
    setHistory([]);
  }, []);

  useEffect(() => {
    initializePool();
  }, [initializePool]);

  const extractItem = () => {
    if (isLocked || pool.length === 0) return;

    // If 50 items revealed, reshuffle everything
    if (revealedCount >= 50) {
      const allItems = generateItems();
      const reshuffled = [...allItems].sort(() => Math.random() - 0.5);
      setPool(reshuffled);
      setRevealedCount(0);
      // After reshuffle, we still want to draw one
      const nextItem = reshuffled[0];
      setCurrentItem(nextItem);
      setPool(reshuffled.slice(1));
      setRevealedCount(1);
      setHistory([nextItem]);
      setIsLocked(true);
      return;
    }

    const nextItem = pool[0];
    const remainingPool = pool.slice(1);

    setCurrentItem(nextItem);
    setPool(remainingPool);
    setRevealedCount(prev => prev + 1);
    setHistory(prev => [nextItem, ...prev].slice(0, 5));
    setIsLocked(true);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 font-sans text-[#1C1E21]">
      {/* Android-style Status Bar Area (Visual only) */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh] relative">
        
        {/* Header */}
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center shadow-md">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Word Pool</h1>
            <p className="text-xs opacity-80">Revealed: {revealedCount} / 50 (Reshuffle at 50)</p>
          </div>
          <button 
            onClick={initializePool}
            className="p-2 hover:bg-emerald-700 rounded-full transition-colors"
            title="Reset Pool"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {currentItem ? (
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -20 }}
                className="w-full aspect-[3/4] bg-white border-2 border-emerald-100 rounded-2xl shadow-xl flex flex-col items-center justify-center p-6 text-center gap-4"
                id="item-card"
              >
                <div className="text-emerald-500 mb-2">
                  <Layers size={32} />
                </div>
                {currentItem.words.map((word, idx) => (
                  <span 
                    key={idx} 
                    className="text-2xl font-bold capitalize text-slate-800 tracking-wide"
                  >
                    {word}
                  </span>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-400 text-center"
              >
                <Layers size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Tap the button to extract</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="p-8 bg-slate-50 border-t border-slate-200 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Safety Lock
            </span>
            <button
              onClick={toggleLock}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner ${
                isLocked ? 'bg-rose-500' : 'bg-slate-300'
              }`}
              id="lock-toggle"
            >
              <span
                className={`flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                  isLocked ? 'translate-x-7' : 'translate-x-1'
                }`}
              >
                {isLocked ? (
                  <Lock size={14} strokeWidth={2.5} className="text-rose-500" />
                ) : (
                  <Unlock size={14} strokeWidth={2.5} className="text-slate-400" />
                )}
              </span>
            </button>
          </div>

          <button
            onClick={extractItem}
            disabled={isLocked}
            id="extract-button"
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isLocked 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isLocked ? <Lock size={20} /> : <RefreshCw size={20} className={pool.length === 0 ? 'animate-spin' : ''} />}
            {revealedCount >= 50 ? 'Reshuffle & Extract' : 'Extract New Item'}
          </button>
        </div>

        {/* History Indicator (Small dots) */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div 
              key={i} 
              className={`h-1 w-1 rounded-full ${i < history.length ? 'bg-emerald-400' : 'bg-slate-200'}`} 
            />
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-slate-400 text-xs text-center max-w-xs">
        Total Pool: 110 Items • Auto-Reshuffle at 50 • Designed for Android View
      </div>
    </div>
  );
}
