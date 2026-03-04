/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, RefreshCw, Layers, Trophy, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

// Types
interface Item {
  id: number;
  originalIndex: number;
  words: string[];
  wordsIt: string[];
}

interface HistoryItem {
  item: Item | null;
  score: number | null;
}

// Static list of 110 items provided by the user
const STATIC_ITEMS: string[][] = [
  ["BRANCH", "CINDERELLA", "CREPE", "ISLAND", "TAXI"],
  ["SAIL", "PARMESAN", "SHREK", "POLE", "WESTERN"],
  ["VIKING", "ALARM", "DANCE", "HULK", "DESERT"],
  ["GOAL", "BREAD", "DEVIL", "PRIMARY", "TARZAN"],
  ["SCREW", "RAKE", "COMPUTER", "STARBUCKS", "BALL"],
  ["SERIES", "NEST", "SPICE", "ELEPHANT", "CARNIVAL"],
  ["VENGEANCE", "BOSS", "EMERGENCY", "CROSS", "WALTZ"],
  ["MAFIA", "LARGE", "MISSILE", "MICROSOFT", "SKI"],
  ["GENIUS", "DRACULA", "LION", "SOCK", "FRIDAY"],
  ["COCKTAIL", "MARIO", "CORK", "VIOLIN", "PEACH"],
  ["RAT", "PLIER", "AMAZON", "TOBACCO", "RULER"],
  ["EPIPHANY", "ELASTIC", "PAN", "FLASH", "TUNNEL"],
  ["FOX", "POLICE", "SIMPSON", "LIGHTNING", "NEWSPAPER"],
  ["MOUNTAIN", "PEANUT", "LIGHTBULB", "JEDI", "PIMENTO"],
  ["SOMBRERO", "CLOVER", "BUTTON", "CHEESE", "CHEWBACCA"],
  ["GOKU", "DOCTOR", "STRAWBERRY", "NUCLEAR", "LOTTERY"],
  ["CEMETERY", "CUPID", "UMBRELLA", "LEAP", "ROOT"],
  ["TREASURE", "PILOT", "MICKEY", "SEWER", "GALAXY"],
  ["FABLE", "FACEBOOK", "ACORN", "BONE", "BRIDGE"],
  ["CRANE", "OPERATION", "RAP", "MUSE", "DEFENSE"],
  ["LIGHT", "SOFA", "MOZART", "RING", "PIZZA"],
  ["KNIGHT", "PEACE", "FLOWER", "SWITZERLAND", "CALENDAR"],
  ["SYRUP", "FOREST", "SCALE", "ZEUS", "COCKROACH"],
  ["PIRATE", "VACATION", "ELF", "MAGNET", "FORK"],
  ["JONES", "VOLCANO", "PASSION", "ROOSTER", "ELECTRICITY"],
  ["BAKER", "PERFUME", "FLAME", "ZOMBIE", "JOKER"],
  ["POISON", "STAR", "WOLF", "GARIBALDI", "ANNIVERSARY"],
  ["HAMMER", "CHILE", "TORTELLINI", "EMPEROR", "POPE"],
  ["HOLLYWOOD", "MOSQUITO", "SPEAR", "PURSE", "END"],
  ["BOARD", "FIREMAN", "GLASS", "SUSHI", "GREECE"],
  ["SLIPPER", "LEAF", "COUGAR", "REVOLUTION", "SAHARA"],
  ["GROTTO", "FORD", "CASINO", "CANDY", "FOUNTAIN"],
  ["FLINTSTONE", "ROBOT", "COMEDY", "LANGUAGE", "HAIRDRESSER"],
  ["DINOSAUR", "YELLOW", "MUSHROOM", "PIGEON", "PIKACHU"],
  ["THUNDER", "GARDEN", "PAINTING", "SKYSCRAPER", "TRUCE"],
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
  ["TATTOO", "GERMANY", "APPLE", "SIREN", "BOXING"],
  ["HEART", "MOSCOW", "POOL", "UNICORN", "ORANGE"],
  ["MELON", "ANCHOR", "ISRAEL", "CACTUS", "TENNIS"],
  ["PEPPER", "TRIANGLE", "DOLL", "ITALY", "SCENE"],
  ["POLAR", "MOUSE", "NECKLACE", "FARM", "BELGIUM"],
  ["FRANCE", "MOON", "CAFETERIA", "HANDLE", "TOOL"],
  ["STRING", "AUSTRALIA", "CASTLE", "GUARD", "SHEEP"],
  ["PUPPET", "GAME", "ROME", "SAFE", "PLANE"],
  ["BRAIN", "MASK", "CONCERT", "SPAIN", "SHARK"],
  ["LONELY", "POTATO", "WAVE", "SCHOOL", "LEGO"],
  ["TOKYO", "HEEL", "CHICKEN", "HELICOPTER", "COLONEL"],
  ["TRADITION", "SNAKE", "CUP", "PICASSO", "WATCH"],
  ["CAKE", "HORSE", "MEXICO", "WHITE", "BALD"],
  ["CATERPILLAR", "HUMOR", "CORNER", "ANTARCTICA", "SAUSAGE"],
  ["PLASTIC", "RAY", "CARTON", "PEBBLE", "EVEREST"],
  ["TERMINATOR", "LETTER", "BED", "PARADISE", "EGG"],
  ["NINTENDO", "BET", "SALT", "MANUAL", "FROST"],
  ["HOUSE", "GODFATHER", "WAR", "ROPE", "WINE"],
  ["CLUB", "CHRISTMAS", "FASHION", "STATION", "LAMP"],
  ["RADIO", "PEAR", "GLADIATOR", "SUN", "CEREAL"],
  ["BERRY", "STUDY", "FEAR", "TITANIC", "MACHINE"],
  ["DWARF", "CIRCUS", "ELVIS", "MOWER", "STONE"],
  ["TRAIN", "SHRIMP", "ROOM", "CLEOPATRA", "WINDOW"],
  ["TANGO", "RIPE", "TEMPLE", "SAND", "FRIES"],
  ["GRENADE", "STUFFING", "BRUSH", "PIG", "HUMAN"],
  ["ALCATRAZ", "SMOKE", "HAZELNUT", "DIAMOND", "ROSE"],
  ["GODZILLA", "UNIFORM", "RAIN", "FIRE", "HELMET"],
  ["SHIP", "BOWLING", "CHURCHILL", "RAM", "SPY"],
  ["HALLOWEEN", "AZZURRO", "BABY", "CANTEEN", "PAIR"],
  ["FAILURE", "HISTORY", "BEER", "DISCO", "PRESIDENT"],
  ["MIRROR", "PROM", "BATH", "PIT", "FAIRY"],
  ["LADDER", "ANGEL", "MAD", "HAIR", "MATRIX"],
  ["MUSTACHE", "BUBBLE", "CHAIN", "AL BANO", "COOKIE"],
  ["AVATAR", "MILL", "JUNGLE", "NUN", "FIRECRACKER"],
  ["IRON", "BATMAN", "SONG", "NILE", "CINEMA"],
  ["PUMP", "ALADDIN", "TUBE", "BELT", "BAR"],
  ["MOUTH", "CAROUSEL", "DICE", "GRASS", "FALL"],
  ["DOPING", "GARLIC", "CUBE", "VIOLET", "MILK"],
  ["ICE", "FLUTE", "CHAMPAGNE", "SAFARI", "ALIEN"],
  ["CANE", "MUSKETEER", "THREAD", "TULIP", "IKEA"],
  ["CROISSANT", "GHOST", "STRAW", "NAIL", "POTTER"],
  ["SPARTACUS", "FUR", "TORNADO", "PYRAMID", "ALLIANCE"]
];

const STATIC_ITEMS_IT: string[][] = [
  ["RAMO", "CENERENTOLA", "CREPE", "ISOLA", "TAXI"],
  ["VELA", "PARMIGIANO", "SHREK", "PALE", "WESTERN"],
  ["VICHINGO", "ALLARME", "DANZA", "HULK", "DESERTO"],
  ["OBIETTIVO", "PANE", "DIAVOLO", "PRIMARIA", "TARZAN"],
  ["VITE", "RASTRELLO", "COMPUTER", "STARBUCKS", "PALLA"],
  ["SERIE", "NIDO", "SPEZIE", "ELEFANTE", "CARNEVALE"],
  ["VENDETTA", "BOSS", "EMERGENZA", "CROCE", "VALZER"],
  ["MAFIA", "GROSSO", "MISSILE", "MICROSOFT", "SCI"],
  ["GENIO", "DRACULA", "LEONE", "CALZINO", "VENERDÌ"],
  ["COCKTAIL", "MARIO", "TAPPO", "VIOLINO", "PESCA"],
  ["TOPO", "PINZA", "AMAZZONIA", "TABACCO", "RIGHELLO"],
  ["EPIFANIA", "ELASTICO", "PADELLA", "FLASH", "TUNNEL"],
  ["VOLPE", "POLIZIA", "SIMPSON", "FULMINE", "GIORNALE"],
  ["MONTAGNA", "ARACHIDI", "LAMPADINA", "JEDI", "PEPERONCINO"],
  ["SOMBRERO", "TRIFOGLIO", "BOTTONE", "FORMAGGIO", "CHEWBACCA"],
  ["GOKU", "DOTTORE", "FRAGOLA", "NUCLEARE", "LOTTERIA"],
  ["CIMITERO", "CUPIDO", "OMBRELLO", "SALTO", "RADICE"],
  ["TESORO", "PILOTA", "TOPOLINO", "FOGNA", "GALASSIA"],
  ["FIABA", "FACEBOOK", "GHIANDA", "OSSO", "PONTE"],
  ["GRU", "OPERAZIONE", "RAP", "MUSA", "DIFESA"],
  ["LUCE", "DIVANO", "MOZART", "ANELLO", "PIZZA"],
  ["CAVALIERE", "PACE", "FIORE", "SVIZZERA", "CALENDARIO"],
  ["SCIROPPO", "FORESTA", "BILANCIA", "ZEUS", "SCARAFAGGIO"],
  ["PIRATA", "VACANZA", "ELFO", "CALAMITA", "FORCHETTA"],
  ["BENIGNI", "VULCANO", "PASSIONE", "GALLO", "ELETTRICITÀ"],
  ["FORNAIO", "PROFUMO", "FIAMMA", "ZOMBIE", "JOKER"],
  ["VELENO", "STELLA", "LUPO", "GARIBALDI", "ANNIVERSARIO"],
  ["MARTELLO", "PEPERONCINO", "TORTELLINI", "IMPERATORE", "PAPA"],
  ["HOLLYWOOD", "ZANZARA", "LANCIA", "BORSA", "FINE"],
  ["TAVOLO", "POMPIERE", "BICCHIERE", "SUSHI", "GRECIA"],
  ["SCARPA", "FOGLIA", "GIAGUARO", "RIVOLUZIONE", "SAHARA"],
  ["GROTTA", "FIAT", "CASINÒ", "CARAMELLA", "FONTANA"],
  ["FLINTSTONE", "ROBOT", "COMMEDIA", "LINGUA", "PARRUCCHIERE"],
  ["DINOSAURO", "GIALLO", "FUNGO", "PICCIONE", "PIKACHU"],
  ["TUONO", "GIARDINO", "DIPINTO", "GRATTACIELO", "TREGUA"],
  ["MUMMIA", "BATTERIA", "FIERA", "KARATE", "PAPPAGALLO"],
  ["OLIMPIADI", "ARRAMPICATA", "AVVOCATO", "DANTE ALIGHIERI", "FIUME"],
  ["TAPPETO", "PONY", "CORONA", "NUOVO", "TARANTINO"],
  ["BARBIE", "CIOCCOLATO", "NEVE", "CRAVATTA", "VENTO"],
  ["PENSIERO", "FRANKENSTEIN", "MENSOLA", "ACCESSORIO", "DOCCIA"],
  ["STUFATO", "CANADA", "ZOO", "TUBO", "LIBRO"],
  ["ASCIUGAMANO", "VENERE", "POLPO", "BICICLETTA", "OPERA"],
  ["COCCINELLA", "SENAPE", "SHERLOCK", "BOTTIGLIA", "VIRUS"],
  ["MUSICA", "GOLA", "AMERICA", "CAFFÈ", "FEBBRE"],
  ["GOOGLE", "FIOCCO", "MARTE", "GOLF", "BIGLIETTO"],
  ["REGISTRATORE", "PLAYSTATION", "BIONDA", "IRIS", "ARTO"],
  ["GERRY SCOTTI", "NINJA", "TRAPUNTA", "CACCIATORE", "VERDURA"],
  ["FORNO", "SPINA", "PASQUA", "TUBO", "FERROVIA"],
  ["FARFALLA", "CIPRIA", "PORCELLANA", "MERCATO", "BOZZOLO"],
  ["BARBECUE", "PANDA", "SOGNO", "MATRIMONIO", "OMBELICO"],
  ["CARIE", "MANICA", "GREMLINS", "POKER", "TORTA"],
  ["ZUCCHERO", "TEATRO", "PALA", "DUNA", "INCINTA"],
  ["GATTO", "PALAZZO", "ELEZIONI", "MIELE", "DON MATTEO"],
  ["REGGAE", "LETAME", "LAGO", "SCIMMIA", "FARO"],
  ["QUARTIERE", "ROCK", "TIGRE", "AGO", "SAPONE"],
  ["PRIGIONE", "BUCO", "MARANZA", "SERA", "MAPPA"],
  ["NUMERO", "DECATHLON", "LIQUORE", "METALLO", "TONNO"],
  ["RE", "BALLETTO", "BAND", "ALCOL", "LAVA"],
  ["TELA", "VAMPIRO", "MONOPOLY", "FUMETTO", "HOTEL"],
  ["DARWIN", "POMODORO", "PARACADUTE", "CANNONE", "BINOCOLO"],
  ["MIRAGGIO", "RAMSES", "FALÒ", "INCROCIO", "PRINCIPESSA"],
  ["GHIGLIOTTINA", "MAGO", "HOCKEY", "BANANA", "MARCO"],
  ["GIULIO CESARE", "SPAGHETTI", "CAPPELLO", "DENTISTA", "GRANO"],
  ["CONCHIGLIE", "SHAKESPEARE", "GIGANTE", "SCHIUMA", "GROTTA"],
  ["COLTELLO", "CUSCINO", "MANGO", "SPADA", "VOLO"],
  ["ESPLOSIONE", "PINGUINO", "CELLULA", "GANDHI", "OASI"],
  ["COCCODRILLO", "GIOIELLO", "METROPOLITANA", "OCCHIALI", "LUCA"],
  ["MINA", "SIGARETTA", "BRACCIALETTO", "METEO", "TORRE"],
  ["TATUAGGIO", "GERMANIA", "MELA", "SIRENA", "BOXE"],
  ["CUORE", "MOSCA", "PISCINA", "UNICORNO", "ARANCIA"],
  ["MELONE", "ANCORA", "ISRAELE", "CACTUS", "TENNIS"],
  ["PEPERONE", "TRIANGOLO", "BAMBOLA", "ITALIA", "SCENA"],
  ["POLARE", "TOPO", "COLLANA", "FATTORIA", "BELGIO"],
  ["FRANCIA", "LUNA", "CAFFETTERIA", "MANICO", "ATTREZZO"],
  ["CORDA", "AUSTRALIA", "CASTELLO", "GUARDIA", "PECORA"],
  ["MARIONETTA", "GIOCO", "ROMA", "CASSAFORTE", "AEREO"],
  ["CERVELLO", "MASCHERA", "CONCERTO", "SPAGNA", "SQUALO"],
  ["SOLO", "PATATA", "ONDA", "SCUOLA", "LEGO"],
  ["TOKYO", "TACCO", "POLLO", "ELICOTTERO", "COLONNELLO"],
  ["TRADIZIONE", "SERPENTE", "TAZZA", "PICASSO", "OROLOGIO"],
  ["TORTA", "CAVALLO", "MESSICO", "BIANCO", "CALVO"],
  ["BRUCO", "UMORISMO", "ANGOLO", "ANTARTIDE", "SALSICCIA"],
  ["PLASTICA", "RAGGIO", "CARTONE", "CIOTTOLO", "EVEREST"],
  ["TERMINATOR", "LETTERA", "LETTO", "PARADISO", "UOVO"],
  ["NINTENDO", "SCOMMESSA", "SALE", "MANUALE", "FREDDO"],
  ["CASA", "PADRINO", "GUERRA", "CORDA", "VINO"],
  ["CLUB", "NATALE", "MODA", "STAZIONE", "LAMPADA"],
  ["RADIO", "PERA", "GLADIATORE", "SOLE", "CEREALI"],
  ["BACCA", "STUDIO", "PAURA", "TITANIC", "MACCHINA"],
  ["NANO", "CIRCO", "ELVIS", "TAGLIAERBA", "PIETRA"],
  ["TRENO", "GAMBERO", "STANZA", "CLEOPATRA", "FINESTRA"],
  ["TANGO", "MATURO", "TEMPIO", "SABBIA", "PATATINE"],
  ["GRANATA", "RIPIENO", "SPAZZOLA", "MAIALE", "UMANO"],
  ["ALCATRAZ", "FUMO", "NOCCIOLA", "DIAMANTE", "ROSA"],
  ["GODZILLA", "UNIFORME", "PIOGGIA", "FUOCO", "CASCO"],
  ["NAVE", "BOWLING", "CHURCHILL", "MONTONE", "SPIA"],
  ["HALLOWEEN", "AZZURRO", "BAMBINO", "BORRACCIA", "COPPIA"],
  ["FALLIMENTO", "STORIA", "BIRRA", "DISCOTECA", "PRESIDENTE"],
  ["SPECCHIO", "CAPODANNO", "BAGNO", "FOSSO", "FATA"],
  ["SCALA", "ANGELO", "PAZZO", "CAPELLI", "MATRIX"],
  ["BAFFI", "BOLLA", "CATENA", "AL BANO", "BISCOTTO"],
  ["AVATAR", "MULINO", "GIUNGLA", "SUORA", "PETARDO"],
  ["FERRO", "BATMAN", "CANZONE", "NILO", "CINEMA"],
  ["POMPA", "ALADDIN", "TUBO", "CINTURA", "BAR"],
  ["BOCCA", "GIOSTRA", "DADO", "ERBA", "CADUTA"],
  ["DOPING", "AGLIO", "CUBETTO", "VIOLA", "LATTE"],
  ["GHIACCIO", "FLAUTO", "CHAMPAGNE", "SAFARI", "ALIENO"],
  ["BASTONE", "MOSCHETTIERE", "FILO", "TULIPANO", "IKEA"],
  ["CROISSANT", "FANTASMA", "PAGLIA", "CHIODO", "POTTER"],
  ["ALESSANDRO", "PELLICCIA", "TORNADO", "PIRAMIDE", "ALLEANZA"]
];

// Helper to generate 110 items from the static list and shuffle them
const generateItems = (): Item[] => {
  const itemsWithOriginalIndex = STATIC_ITEMS.map((words, index) => ({
    originalIndex: index + 1,
    words,
    wordsIt: STATIC_ITEMS_IT[index]
  }));
  const shuffled = [...itemsWithOriginalIndex].sort(() => Math.random() - 0.5);
  return shuffled.map((item, id) => ({ 
    id, 
    originalIndex: item.originalIndex, 
    words: item.words,
    wordsIt: item.wordsIt
  }));
};

export default function App() {
  const [pool, setPool] = useState<Item[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isAwaitingScore, setIsAwaitingScore] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({ total: 0, correct: 0, skipped: 0, errors: 0 });
  const [showEn, setShowEn] = useState(false);
  const [showIt, setShowIt] = useState(true);

  // Initialize pool
  const initializePool = useCallback(() => {
    const newItems = generateItems();
    setPool(newItems);
    setRevealedCount(0);
    setCurrentItem(null);
    setHistory([]);
    setTotalScore(0);
    setIsAwaitingScore(false);
    setShowSummary(false);
  }, []);

  useEffect(() => {
    initializePool();
  }, [initializePool]);

  const extractItem = () => {
    if (isLocked || pool.length === 0 || isAwaitingScore) return;

    let nextItem: Item;
    let remainingPool: Item[];

    // If 65 items revealed, reset and reshuffle pool
    if (revealedCount >= 65) {
      const allItems = generateItems();
      nextItem = allItems[0];
      remainingPool = allItems.slice(1);
      setPool(remainingPool);
      setRevealedCount(1);
    } else {
      nextItem = pool[0];
      remainingPool = pool.slice(1);
      setPool(remainingPool);
      setRevealedCount(prev => prev + 1);
    }

    setCurrentItem(nextItem);
    setHistory(prev => [{ item: nextItem, score: null }, ...prev]);
    setIsLocked(true);
    setIsAwaitingScore(true);
  };

  const handleScore = (score: number) => {
    let actualScore = score;
    let isPenalty = false;

    if (score === -1) {
      actualScore = 0;
      isPenalty = true;
    }

    const nextTotal = Math.max(0, totalScore + actualScore);
    setTotalScore(nextTotal);
    
    setHistory(prev => {
      let newHistory = [...prev];
      if (newHistory.length > 0) {
        // Store the original score to distinguish between skipped (0) and error (-1)
        newHistory[0] = { ...newHistory[0], score: score === -1 ? -1 : actualScore };
      }

      if (isPenalty) {
        // Add a penalty card (null item)
        const penaltyEntry: HistoryItem = { item: null, score: 0 };
        newHistory = [penaltyEntry, ...newHistory];
      }

      // Check if history is full (at least 13 items) and all are scored
      if (newHistory.length >= 13 && newHistory.every(h => h.score !== null)) {
        const correct = newHistory.filter(h => h.score === 1).length;
        const skipped = newHistory.filter(h => h.score === 0 && h.item !== null).length;
        const errors = newHistory.filter(h => h.score === -1).length;
        
        setSummaryData({ total: nextTotal, correct, skipped, errors });
        setShowSummary(true);
        
        // Fireworks!
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }

      return newHistory;
    });

    setIsAwaitingScore(false);
  };

  const closeSummary = () => {
    setShowSummary(false);
    setHistory([]);
    setTotalScore(0);
    setCurrentItem(null);
    setIsLocked(false);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 font-sans text-[#1C1E21]">
      {/* Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-emerald-600 p-8 text-white text-center">
                <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <Trophy size={32} />
                </div>
                <h2 className="text-2xl font-bold">End of the game!</h2>
                <p className="opacity-80 px-4">
                  {summaryData.total === 13 && "Perfect score! Can you do it again?"}
                  {summaryData.total === 12 && "Incredible! Your friends must be impressed!"}
                  {summaryData.total === 11 && "Awesome! That’s a score worth celebrating!"}
                  {(summaryData.total === 9 || summaryData.total === 10) && "Wow, not bad at all!"}
                  {(summaryData.total === 7 || summaryData.total === 8) && "You’re in the average. Can you do better?"}
                  {(summaryData.total >= 4 && summaryData.total <= 6) && "That’s a good start. Try again!"}
                  {(summaryData.total >= 0 && summaryData.total <= 3) && "Try again, and again, and again."}
                </p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Total Score</span>
                  <span className="text-3xl font-black text-emerald-600">{summaryData.total}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 mb-1" size={20} />
                    <span className="text-xl font-black text-emerald-600">{summaryData.correct}</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Corrette</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <MinusCircle className="text-slate-400 mb-1" size={20} />
                    <span className="text-xl font-black text-slate-600">{summaryData.skipped}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Saltate</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <XCircle className="text-rose-500 mb-1" size={20} />
                    <span className="text-xl font-black text-rose-600">{summaryData.errors}</span>
                    <span className="text-[10px] uppercase font-bold text-rose-700">Errori</span>
                  </div>
                </div>

                <button
                  onClick={closeSummary}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-600 active:scale-95 transition-all"
                >
                  Restart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Android-style Status Bar Area (Visual only) */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[850px] relative">
        
        {/* Header */}
        <div className="bg-emerald-600 p-4 text-white flex justify-between items-center shadow-md relative h-20">
          {/* Left: Title and Counter */}
          <div className="flex flex-col z-10">
            <h1 className="text-2xl font-bold tracking-tight">Just One</h1>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] opacity-80">Revealed: {revealedCount} / 65</p>
              <button 
                onClick={initializePool}
                disabled={isLocked}
                className={`p-1 rounded-full transition-colors ${
                  isLocked 
                    ? 'opacity-40 cursor-not-allowed' 
                    : 'hover:bg-emerald-700'
                }`}
                title="Reset Pool"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Center: Large Score */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-0">
            <span className="text-[10px] uppercase font-bold opacity-60 leading-none mb-0.5">Score</span>
            <div className="text-3xl font-black tracking-tighter">
              {totalScore}
            </div>
          </div>

          {/* Right: Language Toggle */}
          <div className="flex bg-white/10 p-1 rounded-xl z-10">
            <button 
              onClick={() => {
                if (showIt && !showEn) return;
                setShowIt(!showIt);
              }}
              className={`px-3 py-1 rounded-lg text-lg transition-all ${showIt ? 'bg-white shadow-sm' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
              title="Italiano"
            >
              🇮🇹
            </button>
            <button 
              onClick={() => {
                if (showEn && !showIt) return;
                setShowEn(!showEn);
              }}
              className={`px-3 py-1 rounded-lg text-lg transition-all ${showEn ? 'bg-white shadow-sm' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
              title="English"
            >
              🇬🇧
            </button>
          </div>
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
                className="w-full min-h-[420px] bg-white border-2 border-emerald-100 rounded-2xl shadow-xl flex flex-col items-center justify-center p-4 text-center gap-2 sm:gap-3"
                id="item-card"
              >
                <div className="text-emerald-500 mb-1 flex items-center gap-2">
                  <Layers size={28} />
                  <span className="text-base font-bold opacity-40">#{currentItem.originalIndex}</span>
                </div>
                {currentItem.words.map((word, idx) => (
                  <div key={idx} className="flex flex-col items-center leading-tight">
                    {showIt && (
                      <span className="text-2xl sm:text-3xl font-bold capitalize text-slate-800 tracking-wide">
                        {currentItem.wordsIt[idx]}
                      </span>
                    )}
                    {showEn && (
                      <span className={`${showIt ? 'text-xs sm:text-sm font-semibold text-slate-400' : 'text-2xl sm:text-3xl font-bold text-slate-800'} capitalize tracking-wide`}>
                        {word}
                      </span>
                    )}
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-400 text-center"
              >
                <Layers size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Tap the button to start a new game</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="pt-4 px-8 pb-8 bg-slate-50 border-t border-slate-200 flex flex-col gap-4">
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

          {isAwaitingScore ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => handleScore(1)}
                disabled={isLocked}
                className={`flex-1 py-2 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center ${
                  isLocked 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                <span className="text-[10px] uppercase opacity-80 mb-1">Corretto</span>
                <span className="text-xl">+1</span>
              </button>
              <button
                onClick={() => handleScore(0)}
                disabled={isLocked}
                className={`flex-1 py-2 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center ${
                  isLocked 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-400 text-white hover:bg-slate-500'
                }`}
              >
                <span className="text-[10px] uppercase opacity-80 mb-1">Non risponde</span>
                <span className="text-xl">0</span>
              </button>
              <button
                onClick={() => handleScore(-1)}
                disabled={isLocked}
                className={`flex-1 py-2 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center ${
                  isLocked 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                <span className="text-[10px] uppercase opacity-80 mb-1">Errato</span>
                <span className="text-xl">0</span>
              </button>
            </div>
          ) : (
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
              {revealedCount >= 65 ? 'Reshuffle & Draw' : 'Draw'}
            </button>
          )}
        </div>

        {/* History Indicator (Small dots) */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {Array.from({ length: 13 }).map((_, i) => {
            // Fill from left to right: oldest on left, newest on right
            // history[0] is newest, history[history.length-1] is oldest
            // We show the last 13 items
            const histIndex = Math.min(history.length - 1, 12) - i;
            const histItem = histIndex >= 0 ? history[histIndex] : null;
            
            let dotColor = 'bg-slate-200';
            let isCurrent = false;

            if (histItem) {
              // The newest item (current) is always at index 0 in our history state
              isCurrent = histIndex === 0;
              
              if (histItem.score === 1) dotColor = 'bg-emerald-500';
              else if (histItem.score === -1) dotColor = 'bg-rose-500';
              else if (histItem.item === null) dotColor = 'bg-slate-400';
              else if (histItem.score === 0) dotColor = 'bg-slate-400';
              else dotColor = 'bg-emerald-200'; // Waiting for score
            }
            return (
              <div 
                key={i} 
                className={`h-1 w-1 rounded-full transition-all duration-300 ${dotColor} ${isCurrent ? 'animate-pulse scale-150' : ''}`} 
              />
            );
          })}
        </div>
      </div>

    </div>
  );
}
