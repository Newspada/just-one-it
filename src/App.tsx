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
  originalIndex: number;
  words: string[];
}

// Static list of 110 items provided by the user
const STATIC_ITEMS: string[][] = [
  ["BRANCH", "CINDERELLA", "CREPE", "ISLAND", "TAXI"],
  ["SAIL", "CHEDDAR", "SHREK", "POLE", "WESTERN"],
  ["VIKING", "ALARM", "DANCE", "HULK", "DESERT"],
  ["GOAL", "BREAD", "DEVIL", "PRIMARY", "TARZAN"],
  ["SCREW", "RAKE", "COMPUTER", "STARBUCKS", "BALL"],
  ["SERIES", "NEST", "SPICE", "ELEPHANT", "CARNIVAL"],
  ["VENGEANCE", "BOSS", "EMERGENCY", "CROSS", "WALTZ"],
  ["MAFIA", "LARGE", "MISSILE", "MICROSOFT", "SKI"],
  ["GENIUS", "DRACULA", "LION", "SOCK", "FRIDAY"],
  ["COCKTAIL", "MARIO", "CORK", "VIOLIN", "PEACH"],
  ["RAT", "PLIER", "AMAZON", "TOBACCO", "RULER"],
  ["HANUKKAH", "ELASTIC", "PAN", "FLASH", "TUNNEL"],
  ["FOX", "POLICE", "SIMPSON", "LIGHTNING", "NEWSPAPER"],
  ["MOUNTAIN", "PEANUT", "LIGHTBULB", "JEDI", "PIMENTO"],
  ["SOMBRERO", "CLOVER", "BUTTON", "CHEESE", "CHEWBACCA"],
  ["WIDOWMAKER", "DOCTOR", "STRAWBERRY", "NUCLEAR", "LOTTERY"],
  ["CEMETERY", "CUPID", "UMBRELLA", "LEAP", "ROOT"],
  ["TREASURE", "PILOT", "MICKEY", "SEWER", "GALAXY"],
  ["MYTH", "FACEBOOK", "ACORN", "BONE", "BRIDGE"],
  ["CRANE", "OPERATION", "RAP", "MUSE", "DEFENSE"],
  ["LIGHT", "SOFA", "MOZART", "RING", "PIZZA"],
  ["KNIGHT", "PEACE", "FLOWER", "SWITZERLAND", "CALENDAR"],
  ["SYRUP", "FOREST", "SCALE", "ZEUS", "COCKROACH"],
  ["PIRATE", "VACATION", "ELF", "MAGNET", "FORK"],
  ["BUFFY", "VOLCANO", "PASSION", "ROOSTER", "ELECTRICITY"],
  ["BAKER", "PERFUME", "FLAME", "ZOMBIE", "JOKER"],
  ["POISON", "STAR", "WOLF", "JONES", "ANNIVERSARY"],
  ["HAMMER", "CHILE", "GUMBO", "EMPEROR", "POPE"],
  ["HOLLYWOOD", "MOSQUITO", "SPEAR", "PURSE", "END"],
  ["BOARD", "FIREMAN", "GLASS", "BURRITO", "GREECE"],
  ["SLIPPER", "LEAF", "COUGAR", "REVOLUTION", "SAHARA"],
  ["GROTTO", "FORD", "CASINO", "CANDY", "FOUNTAIN"],
  ["FLINTSTONE", "ROBOT", "COMEDY", "LANGUAGE", "HAIRDRESSER"],
  ["DINOSAUR", "YELLOW", "MUSHROOM", "PIGEON", "PIKACHU"],
  ["THUNDER", "GARDEN", "PAINTING", "SHACK", "TRUCE"],
  ["MUMMY", "BATTERY", "FAIR", "KARATE", "PARROT"],
  ["OLYMPICS", "CLIMB", "LAWYER", "TOLKIEN", "RIVER"],
  ["CARPET", "PONY", "CROWN", "NEW", "TARANTINO"],
  ["BARBIE", "CHOCOLATE", "SNOW", "TIE", "WIND"],
  ["THOUGHT", "FRANKENSTEIN", "SHELF", "ACCENT", "SHOWER"],
  ["STEW", "CANADA", "ZOO", "PIPE", "BOOK"],
  ["TOWEL", "VENUS", "OCTOPUS", "CYCLE", "OPERA"],
  ["LADYBUG", "MUSTARD", "SHERLOCK", "BOTTLE", "VIRUS"],
  ["MUSIC", "THROAT", "AMERICA", "COFFEE", "FEVER"],
  ["GOOGLE", "BOW", "MARS", "GOLF", "TICKET"],
  ["REGISTER", "PLAYSTATION", "BLOND", "IRIS", "LIMB"],
  ["OPRAH", "NINJA", "COMFORTER", "HUNTER", "VEGETABLE"],
  ["OVEN", "SOCKET", "EASTER", "HOSE", "RAIL"],
  ["BUTTERFLY", "POWDER", "PORCELAIN", "MARKET", "COCOON"],
  ["BARBECUE", "PANDA", "DREAM", "MARRIAGE", "BELLYBUTTON"],
  ["CAVITY", "SLEEVE", "GREMLINS", "POKER", "PIE"],
  ["SUGAR", "THEATER", "SHOVEL", "DUNE", "PREGNANT"],
  ["CAT", "PALACE", "ELECTION", "HONEY", "RAMBO"],
  ["REGGAE", "MANURE", "LAKE", "MONKEY", "LIGHTHOUSE"],
  ["NEIGHBORHOOD", "ROCK", "TIGER", "NEEDLE", "SOAP"],
  ["PRISON", "HOLE", "PUNK", "EVENING", "MAP"],
  ["NUMBER", "DECATHLON", "RUM", "METAL", "TUNA"],
  ["KING", "BALLET", "BAND", "ALCOHOL", "LAVA"],
  ["CANVAS", "VAMPIRE", "MONOPOLY", "CARTOON", "HOTEL"],
  ["DARWIN", "TOMATO", "PARACHUTE", "CANNON", "BINOCULARS"],
  ["MIRAGE", "RAMSES", "BONFIRE", "CROSSROADS", "PRINCESS"],
  ["GUILLOTINE", "MAGICIAN", "HOCKEY", "BANANA", "FITZGERALD"],
  ["CAESAR", "NOODLE", "HAT", "DENTIST", "WHEAT"],
  ["SHELL", "SHAKESPEARE", "GIANT", "FOAM", "CAVE"],
  ["KNIFE", "PILLOW", "ARMSTRONG", "SWORD", "FLIGHT"],
  ["EXPLOSION", "PENGUIN", "CELL", "GANDHI", "OASIS"],
  ["CROCODILE", "JEWELRY", "SUBWAY", "GLASSES", "STING"],
  ["JACKSON", "CIGARETTE", "BRACELET", "WEATHER", "TOWER"],
  ["TATTOO", "SPIELBERG", "APPLE", "SIREN", "BOXING"],
  ["HEART", "MOSCOW", "POOL", "UNICORN", "ORANGE"],
  ["MELON", "ANCHOR", "ISRAEL", "CACTUS", "TENNIS"],
  ["PEPPER", "TRIANGLE", "DOLL", "ITALY", "SCENE"],
  ["POLAR", "MOUSE", "NECKLACE", "FARM", "BELGIUM"],
  ["FRANCE", "MOON", "CAFETERIA", "HANDLE", "TOOL"],
  ["STRING", "AUSTRALIA", "CASTLE", "GUARD", "SHEEP"],
  ["PUPPET", "GAME", "VEGAS", "SAFE", "PLANE"],
  ["BRAIN", "MASK", "CONCERT", "TROY", "SHARK"],
  ["LONELY", "POTATO", "WAVE", "SCHOOL", "LEGO"],
  ["TOKYO", "HEEL", "CHICKEN", "HELICOPTER", "COLONEL"],
  ["TRADITION", "SNAKE", "CUP", "PICASSO", "WATCH"],
  ["CAKE", "STALLION", "MEXICO", "WHITE", "BALD"],
  ["CATERPILLAR", "HUMOR", "CORNER", "ANTARCTICA", "SAUSAGE"],
  ["PLASTIC", "RAY", "CARTON", "PEBBLE", "EVEREST"],
  ["TERMINATOR", "LETTER", "DRAG", "PARADISE", "EGG"],
  ["NINTENDO", "BET", "SALT", "MANUAL", "FROST"],
  ["HOUSE", "GODFATHER", "WAR", "ROPE", "WINE"],
  ["CLUB", "CHRISTMAS", "FASHION", "STATION", "LAMP"],
  ["RADIO", "PEAR", "GLADIATOR", "SUN", "CEREAL"],
  ["BERRY", "STUDY", "GOTHIC", "TITANIC", "MACHINE"],
  ["DWARF", "CIRCUS", "ELVIS", "MOWER", "STONE"],
  ["TRAIN", "SHRIMP", "ROOM", "CLEOPATRA", "WINDOW"],
  ["TANGO", "RIPE", "TEMPLE", "SAND", "FRIES"],
  ["GRENADE", "STUFFING", "BRUSH", "PIG", "HUMAN"],
  ["ALCATRAZ", "SMOKE", "HAZELNUT", "DIAMOND", "ROSE"],
  ["GODZILLA", "UNIFORM", "RAIN", "FIRE", "HELMET"],
  ["SHIP", "BOWLING", "CHURCHILL", "RAM", "SPY"],
  ["HALLOWEEN", "CHIP", "BABY", "CANTEEN", "PAIR"],
  ["FAILURE", "HISTORY", "BEER", "DISCO", "PRESIDENT"],
  ["MIRROR", "PROM", "BATH", "PIT", "FAIRY"],
  ["LADDER", "ANGEL", "MAD", "HAIR", "MATRIX"],
  ["MUSTACHE", "BUBBLE", "CHAIN", "STARK", "COOKIE"],
  ["AVATAR", "MILL", "JUNGLE", "NUN", "FIRECRACKER"],
  ["IRON", "BATMAN", "SONG", "NILE", "CINEMA"],
  ["PUMP", "ALADDIN", "TUBE", "BELT", "BAR"],
  ["MOUTH", "CAROUSEL", "PSYCHO", "GRASS", "FALL"],
  ["DOPING", "GARLIC", "CUBE", "ROCKY", "MILK"],
  ["ICE", "FLUTE", "CHAMPAGNE", "SAFARI", "ALIEN"],
  ["CANE", "MUSKETEER", "THREAD", "TULIP", "IKEA"],
  ["CROISSANT", "GHOST", "STRAW", "NAIL", "POTTER"],
  ["SPARTACUS", "FUR", "TORNADO", "PYRAMID", "ALLIANCE"]
];

// Helper to generate 110 items from the static list and shuffle them
const generateItems = (): Item[] => {
  const itemsWithOriginalIndex = STATIC_ITEMS.map((words, index) => ({
    originalIndex: index + 1,
    words
  }));
  const shuffled = [...itemsWithOriginalIndex].sort(() => Math.random() - 0.5);
  return shuffled.map((item, id) => ({ 
    id, 
    originalIndex: item.originalIndex, 
    words: item.words 
  }));
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
    setPool(newItems);
    setRevealedCount(0);
    setCurrentItem(null);
    setHistory([]);
  }, []);

  useEffect(() => {
    initializePool();
  }, [initializePool]);

  const extractItem = () => {
    if (isLocked || pool.length === 0) return;

    // If 50 items revealed, reset and reshuffle pool
    if (revealedCount >= 50) {
      const allItems = generateItems();
      setPool(allItems);
      setRevealedCount(0);
      // After reset, we still want to draw one
      const nextItem = allItems[0];
      setCurrentItem(nextItem);
      setPool(allItems.slice(1));
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
    setHistory(prev => [nextItem, ...prev].slice(0, 13));
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
                <div className="text-emerald-500 mb-2 flex items-center gap-2">
                  <Layers size={32} />
                  <span className="text-lg font-bold opacity-40">#{currentItem.originalIndex}</span>
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
          {Array.from({ length: 13 }).map((_, i) => (
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
