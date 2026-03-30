/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Unlock, RefreshCw, Layers, Trophy, CheckCircle2, XCircle, MinusCircle, Eye, EyeOff, Sparkles, Settings, X, ChevronsRight, Volume2, VolumeX, LogIn, LogOut, User as UserIcon, History, Calendar, Clock, BarChart3, Contact, UserPlus, UserCheck, UserX, Mail, Search, Trash2, Check, Users, Folder, Edit2, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Filter } from 'bad-words';
import { italianProfanities } from './lib/profanity';
import { auth, db, signInWithGoogle, logout, OperationType, handleFirestoreError, isFirebaseConfigured, updateUserDisplayName } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { STATIC_ITEMS } from './data/words_en';
import { STATIC_ITEMS_IT } from './data/words_it';
import { 
  sendFriendRequestByEmail, 
  acceptFriendRequest, 
  declineFriendRequest, 
  removeFriend, 
  subscribeToFriendships,
  Friendship as FriendshipType,
  UserProfile
} from './services/friendshipService';

// Sound Effects
const SOUNDS = {
  DRAW: 'https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3',
  CORRECT: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  SKIPPED: 'https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3',
  WRONG: 'https://assets.mixkit.co/active_storage/sfx/2876/2876-preview.mp3',
  SWIPE: 'https://assets.mixkit.co/active_storage/sfx/1491/1491-preview.mp3',
  WIN_PERFECT: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3',
  WIN_HIGH: 'https://assets.mixkit.co/active_storage/sfx/2011/2011-preview.mp3',
  WIN_MID: 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3',
  WIN_LOW: 'https://assets.mixkit.co/active_storage/sfx/2043/2043-preview.mp3',
};

const GUEST_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
];

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
  selectedWordIndex: number | null;
}

// Static list of 110 items provided by the user
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

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
};

export default function App() {
  const [pool, setPool] = useState<Item[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isAwaitingScore, setIsAwaitingScore] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({ total: 0, correct: 0, skipped: 0, errors: 0 });
  const [language, setLanguage] = useState<'en' | 'it'>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'it') ? saved : 'it';
  });
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [autoHighlight, setAutoHighlight] = useState<boolean>(() => {
    const saved = localStorage.getItem('autoHighlight');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [autoLock, setAutoLock] = useState<boolean>(() => {
    const saved = localStorage.getItem('autoLock');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayersList, setShowPlayersList] = useState(false);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('volume');
    return saved !== null ? JSON.parse(saved) : 0.5;
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const hasSavedSession = useRef(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Friendship state
  const [showFriends, setShowFriends] = useState(false);
  const [friendships, setFriendships] = useState<FriendshipType[]>([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [guests, setGuests] = useState<{uid: string, displayName: string, photoURL: string}[]>([]);
  const [friendshipsLoaded, setFriendshipsLoaded] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [friendshipToRemove, setFriendshipToRemove] = useState<FriendshipType | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [editingGuestUid, setEditingGuestUid] = useState<string | null>(null);
  const [editingGuestName, setEditingGuestName] = useState('');
  const [guestNameError, setGuestNameError] = useState<string | null>(null);

  const handleSaveGuestName = (uid: string) => {
    if (!editingGuestName.trim()) {
      setEditingGuestUid(null);
      setGuestNameError(null);
      return;
    }

    // Profanity filter
    const filter = new Filter();
    filter.addWords(...italianProfanities);

    if (filter.isProfane(editingGuestName)) {
      setGuestNameError('Name contains offensive language');
      return;
    }

    setGuestNameError(null);
    setGuests(prev => prev.map(g => g.uid === uid ? { ...g, displayName: editingGuestName.trim() } : g));
    setEditingGuestUid(null);
  };

  // Auth listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Friendship listener
  useEffect(() => {
    if (!user) {
      setFriendships([]);
      setFriendshipsLoaded(true);
      return;
    }
    setFriendshipsLoaded(false);
    const unsubscribe = subscribeToFriendships(user.uid, (updatedFriendships) => {
      setFriendships(updatedFriendships);
      setFriendshipsLoaded(true);
    });
    return () => unsubscribe();
  }, [user]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('language', language);
    localStorage.setItem('autoHighlight', JSON.stringify(autoHighlight));
    localStorage.setItem('autoLock', JSON.stringify(autoLock));
    localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
    localStorage.setItem('volume', JSON.stringify(volume));
    localStorage.setItem('darkMode', JSON.stringify(darkMode));

    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [language, autoHighlight, autoLock, soundEnabled, volume, darkMode]);

  // Save game session to Firestore when game ends
  useEffect(() => {
    if (showSummary && auth.currentUser && summaryData.total !== null && !hasSavedSession.current) {
      const path = 'gameSessions';
      const duration = 1800 - timeLeft;
      hasSavedSession.current = true;
      addDoc(collection(db, path), {
        userId: auth.currentUser.uid,
        participants: [...selectedParticipants].sort((a, b) => {
          const aIsFriend = friendships.some(f => f.friendProfile?.uid === a && f.status === 'accepted');
          const bIsFriend = friendships.some(f => f.friendProfile?.uid === b && f.status === 'accepted');
          if (aIsFriend && !bIsFriend) return -1;
          if (!aIsFriend && bIsFriend) return 1;
          return 0;
        }),
        guestInfo: guests.filter(g => selectedParticipants.includes(g.uid)),
        score: summaryData.total,
        correct: summaryData.correct,
        skipped: summaryData.skipped,
        errors: summaryData.errors,
        duration: duration,
        history: history, // Save the full history of cards
        timestamp: serverTimestamp()
      }).catch(error => {
        hasSavedSession.current = false;
        handleFirestoreError(error, OperationType.CREATE, path);
      });
    }
    
    if (!showSummary) {
      hasSavedSession.current = false;
    }
  }, [showSummary, auth.currentUser, summaryData, timeLeft, history, selectedParticipants]);

  const fetchHistory = async () => {
    if (!auth.currentUser) return;
    setShowHistory(true);
    setLoadingSessions(true);
    setHistoryError(null);
    const path = 'gameSessions';
    try {
      const q1 = query(
        collection(db, path),
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const q2 = query(
        collection(db, path),
        where('participants', 'array-contains', auth.currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const fetchedSessions = [
        ...snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];

      const uniqueSessions = Array.from(new Map(fetchedSessions.map(item => [item.id, item])).values())
        .sort((a: any, b: any) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tB - tA;
        });

      setSessions(uniqueSessions);
    } catch (error: any) {
      console.error('History fetch error:', error);
      setHistoryError(error.message || 'Failed to load history');
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      setLoadingSessions(false);
    }
  };

  const playSound = useCallback((url: string) => {
    if (!soundEnabled) return;
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.log('Audio play blocked:', e));
  }, [soundEnabled, volume]);

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
    setSelectedWordIndex(null);
    setSelectedParticipants([]);
    setGuests([]);
    setTimeLeft(30 * 60);
    setIsTimerActive(false);
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    initializePool();
  }, [initializePool]);

  const handleAddGuest = () => {
    if (selectedParticipants.length >= 6) return;
    setShowAvatarPicker(true);
  };

  const confirmAddGuest = (avatarUrl: string) => {
    const guestId = `guest-${Date.now()}`;
    const newGuest = {
      uid: guestId,
      displayName: `Guest ${guests.length + 1}`,
      photoURL: avatarUrl
    };
    setGuests(prev => [...prev, newGuest]);
    setSelectedParticipants(prev => [...prev, guestId]);
    setShowAvatarPicker(false);
  };

  const extractItem = () => {
    if (isLocked || pool.length === 0 || isAwaitingScore) return;

    let nextItem: Item;
    let remainingPool: Item[];

    // If 110 items revealed, reset and reshuffle pool
    if (revealedCount >= STATIC_ITEMS.length) {
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

    const newItem: HistoryItem = { 
      item: nextItem, 
      score: null, 
      selectedWordIndex: autoHighlight ? Math.floor(Math.random() * 5) : null 
    };
    setCurrentItem(nextItem);
    setHistory(prev => [newItem, ...prev]);
    setViewingIndex(0);
    if (autoLock) {
      setIsLocked(true);
    }
    setIsAwaitingScore(true);
    setSelectedWordIndex(newItem.selectedWordIndex);
    setIsTimerActive(true);
    playSound(SOUNDS.DRAW);
  };

  const handleScore = (score: number) => {
    let actualScore = score;
    let isPenalty = false;

    if (score === 1) playSound(SOUNDS.CORRECT);
    else if (score === 0) playSound(SOUNDS.SKIPPED);
    else if (score === -1) {
      playSound(SOUNDS.WRONG);
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
        const penaltyEntry: HistoryItem = { item: null, score: 0, selectedWordIndex: null };
        newHistory = [penaltyEntry, ...newHistory];
      }

      // Check if history is full (at least 13 items) and all are scored
      if (newHistory.length >= 13 && newHistory.every(h => h.score !== null)) {
        const correct = newHistory.filter(h => h.score === 1).length;
        const skipped = newHistory.filter(h => h.score === 0 && h.item !== null).length;
        const errors = newHistory.filter(h => h.score === -1).length;
        
        setSummaryData({ total: nextTotal, correct, skipped, errors });
        setShowSummary(true);
        
        // Fireworks based on score
        if (nextTotal >= 4) {
          const isPerfect = nextTotal === 13;
          const isHigh = nextTotal >= 11;
          const isMid = nextTotal >= 7;

          if (isPerfect) playSound(SOUNDS.WIN_PERFECT);
          else if (isHigh) playSound(SOUNDS.WIN_HIGH);
          else if (isMid) playSound(SOUNDS.WIN_MID);
          else playSound(SOUNDS.WIN_LOW);
          
          const duration = isPerfect ? 7 * 1000 : isHigh ? 5 * 1000 : isMid ? 3 * 1000 : 1.5 * 1000;
          const multiplier = isPerfect ? 150 : isHigh ? 100 : isMid ? 50 : 20;
          const shapes = (isPerfect ? ['star', 'circle'] : ['circle', 'square']) as any[];
          
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100, shapes };

          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = multiplier * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
          }, 250);
        }
      }

      return newHistory;
    });

    setIsAwaitingScore(false);
  };

  const handleSaveName = async () => {
    if (!newDisplayName.trim() || !user) return;
    
    // Profanity filter
    const filter = new Filter();
    filter.addWords(...italianProfanities);

    if (filter.isProfane(newDisplayName)) {
      setNameError('Name contains offensive language');
      return;
    }

    setNameError(null);
    setIsUpdatingName(true);
    try {
      await updateUserDisplayName(newDisplayName.trim());
      setIsEditingName(false);
      // Force refresh user state to show new name
      if (auth.currentUser) {
        setUser({ ...auth.currentUser } as User);
      }
    } catch (error) {
      console.error("Failed to update name:", error);
      setNameError('Error updating name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const closeFriends = () => {
    setShowFriends(false);
    setFriendEmail('');
    setFriendError(null);
    setFriendSuccess(null);
  };

  const closeSummary = () => {
    setShowSummary(false);
    setHistory([]);
    setTotalScore(0);
    setCurrentItem(null);
    setIsLocked(false);
    setTimeLeft(30 * 60);
    setIsTimerActive(false);
  };

  // PWA Back button handling: push state when a modal opens
  const prevModals = useRef({
    showSummary, showSettings, showHistory, showSessionDetail, showFriends, showAvatarPicker
  });

  useEffect(() => {
    const current = {
      showSummary, showSettings, showHistory, showSessionDetail, showFriends, showAvatarPicker
    };

    const opened = (Object.keys(current) as Array<keyof typeof current>).some(key => current[key] && !prevModals.current[key]);
    
    if (opened) {
      window.history.pushState({ isModal: true }, '');
    }

    prevModals.current = current;
  }, [showSummary, showSettings, showHistory, showSessionDetail, showFriends, showAvatarPicker]);

  // Handle back button (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (showAvatarPicker) setShowAvatarPicker(false);
      else if (friendshipToRemove) setFriendshipToRemove(null);
      else if (showSessionDetail) {
        setShowSessionDetail(false);
        setSelectedSession(null);
      }
      else if (showDescription) setShowDescription(false);
      else if (showSummary) closeSummary();
      else if (showHistory) {
        setShowHistory(false);
        setSelectedSession(null);
      }
      else if (showFriends) closeFriends();
      else if (showSettings) setShowSettings(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSummary, showSettings, showHistory, showSessionDetail, showFriends, showAvatarPicker, closeSummary]);

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold && viewingIndex < history.length - 1) {
      // Swipe Right -> Go to older cards
      setViewingIndex(prev => prev + 1);
      playSound(SOUNDS.SWIPE);
    } else if (info.offset.x < -swipeThreshold && viewingIndex > 0) {
      // Swipe Left -> Go to newer cards
      setViewingIndex(prev => prev - 1);
      playSound(SOUNDS.SWIPE);
    }
  };

  const handleWordSelect = (idx: number) => {
    // Only allow changing the word for the current card (viewingIndex 0)
    if (viewingIndex !== 0) return;
    
    const newIndex = selectedWordIndex === idx ? null : idx;
    setSelectedWordIndex(newIndex);
    
    // Update history for the current card
    setHistory(prev => {
      const newHistory = [...prev];
      if (newHistory.length > 0) {
        newHistory[0] = { ...newHistory[0], selectedWordIndex: newIndex };
      }
      return newHistory;
    });
  };

  const handleIconTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowDescription(true);
      playSound(SOUNDS.SWIPE);
    }, 600);
  };

  const handleIconTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleIconDoubleClick = () => {
    setShowDescription(true);
    playSound(SOUNDS.SWIPE);
  };

  const summaryTheme = summaryData.total >= 11 
    ? { bg: 'bg-yellow-500 dark:bg-yellow-600/80', text: 'text-yellow-600 dark:text-yellow-400', btn: 'bg-yellow-500 dark:bg-yellow-600', hover: 'hover:bg-yellow-600 dark:hover:bg-yellow-700' }
    : summaryData.total >= 7
    ? { bg: 'bg-emerald-600 dark:bg-emerald-900/80', text: 'text-emerald-600 dark:text-emerald-400', btn: 'bg-emerald-500 dark:bg-emerald-600', hover: 'hover:bg-emerald-600 dark:hover:bg-emerald-700' }
    : summaryData.total >= 4
    ? { bg: 'bg-amber-500 dark:bg-amber-900/80', text: 'text-amber-600 dark:text-amber-400', btn: 'bg-amber-500 dark:bg-amber-600', hover: 'hover:bg-amber-600 dark:hover:bg-amber-700' }
    : { bg: 'bg-rose-600 dark:bg-rose-900/80', text: 'text-rose-600 dark:text-rose-400', btn: 'bg-rose-500 dark:bg-rose-600', hover: 'hover:bg-rose-600 dark:hover:bg-rose-700' };

  return (
    <div className="h-svh bg-[#F0F2F5] dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-[#1C1E21] dark:text-slate-100 overflow-hidden fixed inset-0 transition-colors duration-500">
      {!isFirebaseConfigured && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 px-4 z-[100] font-bold text-sm flex items-center justify-center gap-2">
          <Settings size={16} className="animate-spin" />
          <span>Firebase not configured. Please set the required secrets in Settings.</span>
        </div>
      )}
      {/* Players List Modal */}
      <AnimatePresence>
        {showPlayersList && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlayersList(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[70vh] transition-colors duration-500"
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedSession ? (
                  <>
                    {/* Organizer of the past session */}
                    {(() => {
                      const isMe = selectedSession.userId === user?.uid;
                      const profile = isMe ? user : friendships.find(f => f.friendProfile?.uid === selectedSession.userId)?.friendProfile;
                      
                      return (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                          {profile?.photoURL ? (
                            <img src={profile.photoURL} alt={profile.displayName || 'Organizer'} className="w-10 h-10 rounded-full border-2 border-emerald-500" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-emerald-500">
                              <UserIcon size={20} className="text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{profile?.displayName || 'Organizer'}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Organizer</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Other participants of the past session */}
                    {(selectedSession.participants || []).filter((uid: string) => uid !== selectedSession.userId).map((uid: string) => {
                      const friend = friendships.find(f => f.friendProfile?.uid === uid)?.friendProfile;
                      const guest = selectedSession.guestInfo?.find((g: any) => g.uid === uid);
                      const profile = friend || guest;
                      
                      return (
                        <div key={uid} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {profile?.photoURL ? (
                            <img src={profile.photoURL} alt={profile.displayName || 'Player'} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <UserIcon size={20} className="text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{profile?.displayName || 'Unknown Player'}</p>
                            <p className="text-xs text-slate-400 font-medium">{guest ? 'Guest' : 'Friend'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {/* Me (Current Setup) */}
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                      <img src={user?.photoURL || ''} alt="Me" className="w-10 h-10 rounded-full border-2 border-emerald-500" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{user?.displayName}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Organizer</p>
                      </div>
                    </div>

                    {/* Selected Friends & Guests (Current Setup) */}
                    {selectedParticipants.map(uid => {
                      const friend = friendships.find(f => f.friendProfile?.uid === uid)?.friendProfile;
                      const guest = guests.find(g => g.uid === uid);
                      const profile = friend || guest;
                      
                      return (
                        <div key={uid} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {profile?.photoURL ? (
                            <img src={profile.photoURL} alt={profile.displayName} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <UserIcon size={20} className="text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            {editingGuestUid === uid ? (
                              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editingGuestName}
                                    onChange={(e) => {
                                      setEditingGuestName(e.target.value);
                                      if (guestNameError) setGuestNameError(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveGuestName(uid);
                                      } else if (e.key === 'Escape') {
                                        setEditingGuestUid(null);
                                        setGuestNameError(null);
                                      }
                                    }}
                                    className={`flex-1 bg-white dark:bg-slate-900 border rounded-lg px-2 py-1 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none ${guestNameError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'}`}
                                  />
                                  <button
                                    onClick={() => handleSaveGuestName(uid)}
                                    disabled={!editingGuestName.trim()}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all disabled:opacity-50"
                                    title="Save"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingGuestUid(null);
                                      setGuestNameError(null);
                                    }}
                                    className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                {guestNameError && (
                                  <span className="text-[10px] text-rose-500 font-medium px-1">{guestNameError}</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group/name">
                                <p className="font-bold text-slate-800 dark:text-slate-100">{profile?.displayName || 'Unknown Player'}</p>
                                {guest && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingGuestUid(uid);
                                      setEditingGuestName(profile?.displayName || '');
                                      setGuestNameError(null);
                                    }}
                                    className="p-1 text-slate-400 hover:text-emerald-500 opacity-0 group-hover/name:opacity-100 transition-all"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-slate-400 font-medium">{guest ? 'Guest' : 'Friend'}</p>
                          </div>
                        </div>
                      );
                    })}

                    {selectedParticipants.length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-slate-400 text-sm">No other players selected yet.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowPlayersList(false)}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Description Modal */}
      <AnimatePresence>
        {showDescription && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowDescription(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 transition-colors duration-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Sparkles size={24} />
                  <h2 className="text-xl font-bold">About</h2>
                </div>
                <button onClick={() => setShowDescription(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X size={24} />
                </button>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                A collaborative word-guessing game where players draw from a pool of 110 bilingual cards. Challenge friends, track session history, and aim for a perfect score with immersive sound effects and real-time stats.
              </p>
              <button
                onClick={() => setShowDescription(false)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-100"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {showSessionDetail && selectedSession && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-500"
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedSession.history ? (
                  [...selectedSession.history].reverse().filter(h => h.item).map((h: any, idx: number) => {
                    const isCorrect = h.score === 1;
                    const isSkipped = h.score === 0;
                    const isMistake = h.score === -1;

                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors duration-500 ${
                          isCorrect ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' :
                          isSkipped ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' :
                          'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-slate-400 leading-none">#{h.item.originalIndex}</span>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                            isCorrect ? 'bg-emerald-500' :
                            isSkipped ? 'bg-slate-400' :
                            'bg-rose-500'
                          }`}>
                            {isCorrect ? <CheckCircle2 size={18} /> :
                             isSkipped ? <MinusCircle size={18} /> :
                             <XCircle size={18} />}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {(language === 'it' ? h.item.wordsIt : h.item.words).map((word: string, wIdx: number) => (
                              <span 
                                key={wIdx}
                                className={`text-sm px-2 py-1 rounded-lg font-bold transition-colors duration-200 ${
                                  h.selectedWordIndex === wIdx 
                                    ? 'bg-slate-800 dark:bg-emerald-500 text-white shadow-sm' 
                                    : 'bg-white/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-700/50'
                                }`}
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium">No detailed history for this game.</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 transition-colors duration-500">
                {(() => {
                  const displayParticipants = Array.from(new Set([selectedSession.userId, ...(selectedSession.participants || [])]))
                    .filter(uid => uid !== user?.uid)
                    .sort((a, b) => {
                      const aIsFriend = friendships.some(f => f.friendProfile?.uid === a && f.status === 'accepted');
                      const bIsFriend = friendships.some(f => f.friendProfile?.uid === b && f.status === 'accepted');
                      if (aIsFriend && !bIsFriend) return -1;
                      if (!aIsFriend && bIsFriend) return 1;
                      return 0;
                    });
                  
                  if (displayParticipants.length === 0) return null;

                  return (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="col-start-3 flex justify-end">
                        <button 
                          onClick={() => setShowPlayersList(true)}
                          className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-500 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95"
                        >
                          <span className="text-[9px] font-black text-slate-400 uppercase mr-0.5">With</span>
                          <div className="flex -space-x-2">
                            {displayParticipants.map((uid: string, pIdx: number) => {
                              const friend = friendships.find(f => f.friendProfile?.uid === uid);
                              const guest = selectedSession.guestInfo?.find((g: any) => g.uid === uid);
                              const profile = friend?.friendProfile || guest;
                              const isOrganizer = uid === selectedSession.userId;
                              return (
                                <div 
                                  key={pIdx} 
                                  className={`w-6 h-6 rounded-full border-2 ${isOrganizer ? 'border-emerald-500' : 'border-white dark:border-slate-800'} bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shadow-sm transition-colors duration-500`} 
                                  title={`${profile?.displayName || 'Friend'}${isOrganizer ? ' (Organizer)' : ''}`}
                                >
                                  {profile?.photoURL ? (
                                    <img src={profile.photoURL} alt={profile.displayName || 'Friend'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <UserIcon size={12} className="text-slate-400" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center transition-colors duration-500">
                    <span className="text-[10px] font-black text-emerald-500 uppercase block">Correct</span>
                    <span className="text-lg font-black text-slate-700 dark:text-slate-200">{selectedSession.correct}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center transition-colors duration-500">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Skipped</span>
                    <span className="text-lg font-black text-slate-700 dark:text-slate-200">{selectedSession.skipped}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center transition-colors duration-500">
                    <span className="text-[10px] font-black text-rose-500 uppercase block">Mistakes</span>
                    <span className="text-lg font-black text-slate-700 dark:text-slate-200">{selectedSession.errors}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSessionDetail(false);
                    setSelectedSession(null);
                  }}
                  className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-2xl font-bold transition-all active:scale-95"
                >
                  Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Friends Modal */}
      <AnimatePresence>
        {showFriends && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeFriends}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-500"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Friends List */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    {friendships.filter(f => f.status === 'accepted').length > 0 ? (
                      friendships.filter(f => f.status === 'accepted').map(f => (
                        <div key={f.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm transition-colors duration-500">
                          <div className="flex items-center gap-3">
                            <img 
                              src={f.friendProfile?.photoURL || ''} 
                              alt={f.friendProfile?.displayName || 'User'} 
                              className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{f.friendProfile?.displayName}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">{f.friendProfile?.email}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setFriendshipToRemove(f)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Remove Friend"
                          >
                            <UserX size={20} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 transition-colors duration-500">
                        <Search size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                        <p className="text-slate-400 dark:text-slate-500 text-sm">No friends yet. Add some!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Incoming Requests */}
                {friendships.some(f => f.toUid === user?.uid && f.status === 'pending') && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Incoming Requests</h3>
                    <div className="space-y-2">
                      {friendships.filter(f => f.toUid === user?.uid && f.status === 'pending').map(f => (
                        <div key={f.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl transition-colors duration-500">
                          <div className="flex items-center gap-3">
                            <img 
                              src={f.friendProfile?.photoURL || ''} 
                              alt={f.friendProfile?.displayName || 'User'} 
                              className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{f.friendProfile?.displayName}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">{f.friendProfile?.email}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => acceptFriendRequest(f.id)}
                              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl transition-all"
                              title="Accept"
                            >
                              <UserCheck size={20} />
                            </button>
                            <button 
                              onClick={() => declineFriendRequest(f.id)}
                              className="p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl transition-all"
                              title="Decline"
                            >
                              <UserX size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outgoing Requests */}
                {friendships.some(f => f.fromUid === user?.uid && f.status === 'pending') && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Sent Requests</h3>
                    <div className="space-y-2">
                      {friendships.filter(f => f.fromUid === user?.uid && f.status === 'pending').map(f => (
                        <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl transition-colors duration-500">
                          <div className="flex items-center gap-3">
                            <img 
                              src={f.friendProfile?.photoURL || ''} 
                              alt={f.friendProfile?.displayName || 'User'} 
                              className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{f.friendProfile?.displayName}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">{f.friendProfile?.email}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFriend(f.id)}
                            className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                            title="Cancel Request"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Friend Section */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        placeholder="Invite a friend"
                        value={friendEmail}
                        onChange={(e) => {
                          setFriendEmail(e.target.value);
                          if (friendError) setFriendError(null);
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all text-sm dark:text-slate-100"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        if (!friendEmail) return;
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(friendEmail)) {
                          setFriendError('Invalid email format');
                          return;
                        }
                        setFriendActionLoading(true);
                        setFriendError(null);
                        setFriendSuccess(null);
                        try {
                          await sendFriendRequestByEmail(friendEmail);
                          setFriendSuccess('Request sent!');
                          setFriendEmail('');
                        } catch (err: any) {
                          setFriendError(err.message);
                        } finally {
                          setFriendActionLoading(false);
                        }
                      }}
                      disabled={friendActionLoading || !friendEmail}
                      className="px-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {friendActionLoading ? <RefreshCw size={20} className="animate-spin" /> : <UserPlus size={20} />}
                    </button>
                  </div>
                  {friendError && <p className="text-xs text-rose-500 font-medium px-1">{friendError}</p>}
                  {friendSuccess && <p className="text-xs text-emerald-500 font-medium px-1">{friendSuccess}</p>}
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={closeFriends}
                  className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-2xl font-bold transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] transition-colors duration-500"
            >
              <div className="flex-1 overflow-y-auto p-4 pt-6 space-y-3">
                {loadingSessions ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <RefreshCw className="animate-spin text-emerald-500" size={32} />
                    <p className="text-slate-400 dark:text-slate-500 font-medium">Loading history...</p>
                  </div>
                ) : historyError ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                    <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center">
                      <XCircle size={32} className="text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-slate-800 dark:text-slate-100 font-bold">Error loading history</h3>
                      <p className="text-slate-400 text-sm px-8">{historyError}</p>
                    </div>
                    <button 
                      onClick={() => fetchHistory()}
                      className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all"
                    >
                      Retry
                    </button>
                  </div>
                ) : sessions.length > 0 ? (
                  sessions.map((session) => {
                    const date = session.timestamp instanceof Timestamp 
                      ? session.timestamp.toDate() 
                      : new Date(session.timestamp?.seconds * 1000 || Date.now());
                    
                    const isParticipant = session.userId !== user?.uid;
                    const theme = session.score >= 11 
                      ? { bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900/40', text: 'text-yellow-600 dark:text-yellow-400', accent: 'bg-yellow-500' }
                      : session.score >= 7
                      ? { bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' }
                      : session.score >= 4
                      ? { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40', text: 'text-amber-600 dark:text-amber-400', accent: 'bg-amber-500' }
                      : { bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40', text: 'text-rose-600 dark:text-rose-400', accent: 'bg-rose-500' };

                    return (
                      <button 
                        key={session.id}
                        onClick={() => {
                          setSelectedSession(session);
                          setShowSessionDetail(true);
                        }}
                        className={`w-full text-left p-3 rounded-2xl border ${theme.bg} ${isParticipant ? '!border-emerald-500 !border-2' : ''} flex items-center gap-3 shadow-sm hover:scale-[1.02] active:scale-95 transition-all`}
                      >
                        {/* Left: Time Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                            <Calendar size={12} />
                            <span className="text-xs font-bold truncate">
                              {getRelativeTime(date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Clock size={14} />
                            <span className="text-sm font-black">
                              {session.duration !== undefined ? (
                                (() => {
                                  const m = Math.floor(session.duration / 60);
                                  const s = session.duration % 60;
                                  if (m === 0 && s === 0) return '0s';
                                  const parts = [];
                                  if (m > 0) parts.push(`${m}m`);
                                  if (s > 0) parts.push(`${s}s`);
                                  return parts.join(' ');
                                })()
                              ) : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Stats */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-white/50 dark:border-slate-700/50 transition-colors duration-500">
                          <div className="flex flex-col items-center min-w-[32px]">
                            <span className="text-[9px] font-black text-emerald-500 uppercase leading-none mb-0.5">C</span>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 leading-none">{session.correct}</span>
                          </div>
                          <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
                          <div className="flex flex-col items-center min-w-[32px]">
                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">S</span>
                            <span className="text-lg font-black text-slate-600 dark:text-slate-300 leading-none">{session.skipped}</span>
                          </div>
                          <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
                          <div className="flex flex-col items-center min-w-[32px]">
                            <span className="text-[9px] font-black text-rose-400 uppercase leading-none mb-0.5">E</span>
                            <span className="text-lg font-black text-rose-600 dark:text-rose-400 leading-none">{session.errors}</span>
                          </div>
                        </div>

                        {/* Right: Score */}
                        <div className={`w-12 h-12 rounded-xl ${theme.accent} flex flex-col items-center justify-center text-white shadow-md flex-shrink-0`}>
                          <span className="text-[8px] font-bold uppercase opacity-80 leading-none mb-0.5">Score</span>
                          <span className="text-xl font-black leading-none">{session.score}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <History size={32} className="text-slate-200 dark:text-slate-700" />
                    </div>
                    <h3 className="text-slate-800 dark:text-slate-100 font-bold">No history yet</h3>
                    <p className="text-slate-400 text-sm px-8">Complete your first game to see your history here.</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setSelectedSession(null);
                  }}
                  className="w-full py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-2xl font-bold transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transition-colors duration-500"
            >
              <div className="p-6 space-y-6">
                {/* Auth Section */}
                {user ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 flex-1">
                      <img 
                        src={user.photoURL || ''} 
                        alt={user.displayName || 'User'} 
                        className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col flex-1">
                        {isEditingName ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newDisplayName}
                                onChange={(e) => {
                                  setNewDisplayName(e.target.value);
                                  setNameError(null);
                                }}
                                className={`w-full px-2 py-1 text-sm font-bold bg-white dark:bg-slate-900 border rounded-lg focus:outline-none ${nameError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'}`}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveName();
                                  if (e.key === 'Escape') {
                                    setIsEditingName(false);
                                    setNameError(null);
                                  }
                                }}
                              />
                              <button
                                onClick={handleSaveName}
                                disabled={isUpdatingName || !newDisplayName.trim()}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all disabled:opacity-50"
                              >
                                {isUpdatingName ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                              </button>
                              <button
                                onClick={() => {
                                  setIsEditingName(false);
                                  setNameError(null);
                                }}
                                disabled={isUpdatingName}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            {nameError && (
                              <span className="text-[10px] text-rose-500 font-medium px-1">{nameError}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{user.displayName}</span>
                            <button
                              onClick={() => {
                                setNewDisplayName(user.displayName || '');
                                setIsEditingName(true);
                              }}
                              className="p-1 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                              title="Edit Name"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{user.email}</span>
                      </div>
                    </div>
                    {!isEditingName && (
                      <button 
                        onClick={() => {
                          logout();
                          setShowSettings(false);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all ml-2"
                        title="Logout"
                      >
                        <LogOut size={20} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      signInWithGoogle();
                      setShowSettings(false);
                    }}
                    className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="font-bold">Login with Google</span>
                  </button>
                )}

                {/* Language Settings */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Language</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setLanguage('it')}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${language === 'it' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 grayscale'}`}
                    >
                      <span className="text-3xl">🇮🇹</span>
                      <span className="font-bold">Italiano</span>
                    </button>
                    <button 
                      onClick={() => setLanguage('en')}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${language === 'en' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 grayscale'}`}
                    >
                      <span className="text-3xl">🇬🇧</span>
                      <span className="font-bold">English</span>
                    </button>
                  </div>
                </div>

                {/* Appearance Settings */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Appearance</h3>
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${darkMode ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                      </div>
                      <span className="font-bold">{darkMode ? 'Night Mode' : 'Day Mode'}</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'left-5' : 'left-1'}`} />
                    </div>
                  </button>
                </div>

                {/* Gameplay Settings */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Gameplay</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setAutoHighlight(!autoHighlight)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${autoHighlight ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 grayscale'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${autoHighlight ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <Sparkles size={18} />
                        </div>
                        <span className="font-bold">Auto-Highlight</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${autoHighlight ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoHighlight ? 'left-5' : 'left-1'}`} />
                      </div>
                    </button>

                    <button 
                      onClick={() => setAutoLock(!autoLock)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${autoLock ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 grayscale'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${autoLock ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <Lock size={18} />
                        </div>
                        <span className="font-bold">Auto-Lock</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${autoLock ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoLock ? 'left-5' : 'left-1'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sound Settings */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Audio</h3>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors duration-500">
                    <button 
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`p-3 rounded-xl transition-all active:scale-90 ${soundEnabled ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                      title={soundEnabled ? "Mute" : "Unmute"}
                    >
                      {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <div className="flex-1 flex items-center gap-3">
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={volume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setVolume(val);
                          if (!soundEnabled && val > 0) setSoundEnabled(true);
                        }}
                        onMouseUp={() => playSound(SOUNDS.CORRECT)}
                        onTouchEnd={() => playSound(SOUNDS.CORRECT)}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #10b981 0%, #10b981 ${volume * 100}%, ${darkMode ? '#334155' : '#e2e8f0'} ${volume * 100}%, ${darkMode ? '#334155' : '#e2e8f0'} 100%)`
                        }}
                      />
                      <span 
                        onClick={() => playSound(SOUNDS.CORRECT)}
                        className="text-xs font-bold text-slate-500 dark:text-slate-400 min-w-[32px] text-right cursor-pointer transition-colors"
                        title="Click to test volume"
                      >
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Layers size={16} />
                      <span className="text-sm font-bold">Total Revealed Cards</span>
                    </div>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">{revealedCount} / {STATIC_ITEMS.length}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Friend Confirmation Modal */}
      <AnimatePresence>
        {friendshipToRemove && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-6 transition-colors duration-500"
            >
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
                  <UserX size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Remove Friend?</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Are you sure you want to remove <strong>{friendshipToRemove.friendProfile?.displayName}</strong> from your friends?
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setFriendshipToRemove(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeFriend(friendshipToRemove.id);
                    setFriendshipToRemove(null);
                  }}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-rose-200 dark:shadow-none"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Avatar Picker Modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-6 transition-colors duration-500"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Choose Avatar</h2>
                <button onClick={() => setShowAvatarPicker(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {GUEST_AVATARS.map((avatar, idx) => {
                  const isTaken = (user?.photoURL === avatar) || guests.some(g => g.photoURL === avatar);
                  return (
                    <button
                      key={idx}
                      disabled={isTaken}
                      onClick={() => confirmAddGuest(avatar)}
                      className={`relative group transition-all ${isTaken ? 'opacity-20 cursor-not-allowed' : 'active:scale-90'}`}
                    >
                      <img 
                        src={avatar} 
                        alt={`Avatar ${idx}`} 
                        className={`w-full aspect-square rounded-full border-2 transition-all ${isTaken ? 'border-transparent' : 'border-transparent group-hover:border-emerald-500'}`}
                        referrerPolicy="no-referrer"
                      />
                      {isTaken && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500">
                          <X size={16} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transition-colors duration-500"
            >
              <div className={`${summaryTheme.bg} p-8 text-white text-center transition-colors duration-500`}>
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
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors duration-500">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Total Score</span>
                  <span className={`text-3xl font-black ${summaryTheme.text}`}>{summaryData.total}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 transition-colors duration-500">
                    <CheckCircle2 className="text-emerald-500 mb-1" size={20} />
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{summaryData.correct}</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-500/80">Correct</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-500">
                    <MinusCircle className="text-slate-400 dark:text-slate-500 mb-1" size={20} />
                    <span className="text-xl font-black text-slate-600 dark:text-slate-300">{summaryData.skipped}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-500/80">Skipped</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 transition-colors duration-500">
                    <XCircle className="text-rose-500 mb-1" size={20} />
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400">{summaryData.errors}</span>
                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-500/80">Mistakes</span>
                  </div>
                </div>

                <button
                  onClick={closeSummary}
                  className={`w-full py-4 ${summaryTheme.btn} ${summaryTheme.hover} text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all`}
                >
                  Restart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Android-style Status Bar Area (Visual only) */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[95%] max-h-[850px] relative transition-colors duration-500">
        
        {/* Header */}
        <div className={`${timeLeft <= 0 ? 'bg-rose-600 dark:bg-rose-900' : 'bg-emerald-600 dark:bg-emerald-900'} p-4 text-white flex justify-between items-center shadow-md relative h-20 transition-colors duration-500 border-b border-white/10`}>
          {/* Left: Timer */}
          <div className="flex flex-col items-center z-10 min-w-[60px]">
            <span className="text-[10px] uppercase font-bold opacity-70 leading-none mb-0.5 tracking-wider">Time</span>
            <div className={`text-2xl font-bold ${timeLeft <= 60 && timeLeft > 0 ? 'animate-pulse text-rose-200' : ''}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Center: Large Score */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-0">
            <span className="text-[10px] uppercase font-bold opacity-70 leading-none mb-0.5 tracking-wider">Score</span>
            <div className="text-3xl font-black tracking-tighter leading-none">
              {totalScore}
            </div>
            <p className="text-[10px] font-bold opacity-80 dark:opacity-100 dark:text-emerald-200 mt-1">Remaining: {Math.max(0, 13 - history.length)}</p>
          </div>

          {/* Right: Settings and Counter */}
          <div className="flex flex-col items-end z-10">
            <div className="flex items-center gap-2">
              {user && (
                <>
                  <button 
                    onClick={() => setShowFriends(true)}
                    className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-white relative"
                    title="Friends"
                  >
                    <Contact size={20} />
                    {friendships.some(f => f.toUid === user?.uid && f.status === 'pending') && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-emerald-600" />
                    )}
                  </button>
                  <button 
                    onClick={() => fetchHistory()}
                    className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-white"
                    title="History"
                  >
                    <Trophy size={20} />
                  </button>
                </>
              )}
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                title="Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/60 transition-colors duration-500">
          <div className="flex-1 w-full flex items-center justify-center p-2">
            <AnimatePresence mode="wait">
            {authLoading || !friendshipsLoaded ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <RefreshCw className="animate-spin text-emerald-500" size={48} />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Loading app...</p>
              </motion.div>
            ) : history.length > 0 ? (
              <motion.div
                key={history[viewingIndex]?.item?.id || `penalty-${viewingIndex}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                className={`w-full max-w-md min-h-[350px] border-2 rounded-2xl shadow-xl flex flex-col items-center justify-center p-6 text-center gap-2 sm:gap-3 transition-all duration-300 cursor-grab active:cursor-grabbing relative m-1 ${
                  isBlurred ? 'blur-md select-none' : ''
                } ${
                  viewingIndex === 0 
                    ? 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900/50' 
                    : history[viewingIndex].item === null
                      ? 'bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-900/50'
                      : history[viewingIndex].score === 1
                        ? 'bg-emerald-50/80 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50'
                        : history[viewingIndex].score === -1
                          ? 'bg-rose-50/80 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50'
                          : 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700'
                }`}
                id="item-card"
              >
                {history[viewingIndex]?.item ? (
                  <>
                    <div className={`mb-1 flex items-center gap-2 ${
                      viewingIndex === 0 || history[viewingIndex].score === 1
                        ? 'text-emerald-500'
                        : history[viewingIndex].score === -1
                          ? 'text-rose-500'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      <Layers size={28} />
                      <span className="text-base font-bold opacity-40">#{history[viewingIndex].item?.originalIndex}</span>
                    </div>
                    {history[viewingIndex].item?.words.map((word, idx) => {
                      const isSelected = viewingIndex === 0 
                        ? selectedWordIndex === idx 
                        : history[viewingIndex].selectedWordIndex === idx;
                        
                      return (
                        <button 
                          key={idx} 
                          onClick={() => handleWordSelect(idx)}
                          className={`flex flex-col items-center leading-tight transition-all duration-200 focus:outline-none ${
                            isSelected ? 'scale-120' : 'scale-100 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <span className={`${isSelected ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'} font-bold capitalize text-slate-800 dark:text-slate-100 tracking-wide transition-all`}>
                            {language === 'it' ? history[viewingIndex].item?.wordsIt[idx] : history[viewingIndex].item?.words[idx]}
                          </span>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-rose-500 dark:text-rose-400">
                    <XCircle size={64} className="mb-4 opacity-20" />
                    <p className="text-xl font-black uppercase">Penalty Card</p>
                    <p className="text-sm opacity-60 dark:opacity-80">This card was added due to a mistake</p>
                  </div>
                )}

                {viewingIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingIndex(0);
                      playSound(SOUNDS.SWIPE);
                    }}
                    className={`absolute bottom-0 right-0 w-14 h-14 flex items-center justify-center rounded-tl-2xl rounded-br-2xl active:scale-95 transition-all z-10 ${
                      history[viewingIndex].item === null || history[viewingIndex].score === -1
                        ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                        : history[viewingIndex].score === 1
                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'
                    }`}
                    title="Back to Current"
                  >
                    <ChevronsRight size={24} />
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
              >
                <div className="text-slate-400 dark:text-slate-500 text-center mb-8">
                  <div
                    className="cursor-help select-none inline-block"
                    onDoubleClick={handleIconDoubleClick}
                    onMouseDown={handleIconTouchStart}
                    onMouseUp={handleIconTouchEnd}
                    onMouseLeave={handleIconTouchEnd}
                    onTouchStart={handleIconTouchStart}
                    onTouchEnd={handleIconTouchEnd}
                  >
                    <Layers size={64} className="mx-auto mb-4 opacity-20" />
                  </div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Tap the button to start a new game</p>
                </div>

                {user && (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 transition-colors duration-500">
                    <div 
                      className="flex items-center justify-between cursor-pointer group"
                      onClick={() => setShowPlayersList(true)}
                    >
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">Participants</h3>
                      <button 
                        className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors active:scale-95"
                      >
                        {selectedParticipants.length + 1} / 7
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {/* Current User (Always selected) */}
                      <div className="flex flex-col items-center gap-1 transition-all scale-105">
                        <div className="relative p-0.5 rounded-full border-2 border-emerald-500 transition-all">
                          <img 
                            src={user.photoURL || ''} 
                            alt={user.displayName || 'Me'} 
                            className="w-12 h-12 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                            <Check size={10} strokeWidth={4} />
                          </div>
                        </div>
                      </div>

                      {friendships.filter(f => f.status === 'accepted').map(f => {
                        const isSelected = selectedParticipants.includes(f.friendProfile?.uid || '');
                        return (
                          <button
                            key={f.id}
                            onClick={() => {
                              const uid = f.friendProfile?.uid;
                              if (!uid) return;
                              if (isSelected) {
                                setSelectedParticipants(prev => prev.filter(id => id !== uid));
                              } else if (selectedParticipants.length < 6) {
                                setSelectedParticipants(prev => [...prev, uid]);
                              }
                            }}
                            className={`flex flex-col items-center gap-1 transition-all ${isSelected ? 'scale-105' : 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0'}`}
                          >
                            <div className={`relative p-0.5 rounded-full border-2 transition-all ${isSelected ? 'border-emerald-500' : 'border-transparent'}`}>
                              <img 
                                src={f.friendProfile?.photoURL || ''} 
                                alt={f.friendProfile?.displayName || 'User'} 
                                className="w-12 h-12 rounded-full"
                                referrerPolicy="no-referrer"
                              />
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                  <Check size={10} strokeWidth={4} />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {guests.map(g => {
                        const isSelected = selectedParticipants.includes(g.uid);
                        return (
                          <button
                            key={g.uid}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedParticipants(prev => prev.filter(id => id !== g.uid));
                                setGuests(prev => prev.filter(guest => guest.uid !== g.uid));
                              } else if (selectedParticipants.length < 6) {
                                setSelectedParticipants(prev => [...prev, g.uid]);
                              }
                            }}
                            className={`flex flex-col items-center gap-1 transition-all ${isSelected ? 'scale-105' : 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0'}`}
                          >
                            <div className={`relative p-0.5 rounded-full border-2 transition-all ${isSelected ? 'border-emerald-500' : 'border-transparent'}`}>
                              <img 
                                src={g.photoURL} 
                                alt={g.displayName} 
                                className="w-12 h-12 rounded-full"
                                referrerPolicy="no-referrer"
                              />
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                  <Check size={10} strokeWidth={4} />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {selectedParticipants.length < 6 && (
                        <button
                          onClick={handleAddGuest}
                          className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-all"
                          title="Add Guest"
                        >
                          <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                            <UserPlus size={20} />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="pt-4 px-8 pb-14 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-6 transition-colors duration-500">
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={() => setIsBlurred(!isBlurred)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner ${
                isBlurred ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              id="blur-toggle"
              title={isBlurred ? "Show content" : "Hide content"}
            >
              <span
                className={`flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                  isBlurred ? 'translate-x-7' : 'translate-x-1'
                }`}
              >
                {isBlurred ? (
                  <EyeOff size={14} strokeWidth={2.5} className="text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Eye size={14} strokeWidth={2.5} className="text-slate-400 dark:text-slate-500" />
                )}
              </span>
            </button>

            <button
              onClick={toggleLock}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner ${
                isLocked ? 'bg-rose-500 dark:bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              id="lock-toggle"
              title={isLocked ? "Unlock controls" : "Lock controls"}
            >
              <span
                className={`flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                  isLocked ? 'translate-x-7' : 'translate-x-1'
                }`}
              >
                {isLocked ? (
                  <Lock size={14} strokeWidth={2.5} className="text-rose-500 dark:text-rose-400" />
                ) : (
                  <Unlock size={14} strokeWidth={2.5} className="text-slate-400 dark:text-slate-500" />
                )}
              </span>
            </button>
          </div>

          {isAwaitingScore ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => handleScore(1)}
                disabled={isLocked || viewingIndex !== 0 || selectedWordIndex === null}
                className={`flex-1 py-2 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center ${
                  (isLocked || viewingIndex !== 0 || selectedWordIndex === null)
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                    : 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700'
                }`}
              >
                <span className="text-[10px] uppercase opacity-80 mb-1 tracking-wider">Correct</span>
                <span className="text-xl">+1</span>
              </button>
              <button
                onClick={() => handleScore(0)}
                disabled={isLocked || viewingIndex !== 0 || selectedWordIndex === null}
                className={`flex-1 py-2 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center ${
                  (isLocked || viewingIndex !== 0 || selectedWordIndex === null)
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                    : 'bg-slate-400 dark:bg-slate-700 text-white hover:bg-slate-500 dark:hover:bg-slate-600'
                }`}
              >
                <span className="text-[10px] uppercase opacity-80 mb-1 tracking-wider">Skipped</span>
                <span className="text-xl">0</span>
              </button>
              <button
                onClick={() => handleScore(-1)}
                disabled={isLocked || viewingIndex !== 0 || selectedWordIndex === null}
                className={`flex-1 py-2 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center ${
                  (isLocked || viewingIndex !== 0 || selectedWordIndex === null)
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                    : 'bg-rose-500 dark:bg-rose-600 text-white hover:bg-rose-600 dark:hover:bg-rose-700'
                }`}
              >
                <span className="text-[10px] uppercase opacity-80 mb-1 tracking-wider">Wrong</span>
                <span className="text-xl">0</span>
              </button>
            </div>
          ) : (
            <button
              onClick={extractItem}
              disabled={isLocked || viewingIndex !== 0}
              id="extract-button"
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                (isLocked || viewingIndex !== 0)
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                  : 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700 dark:shadow-none'
              }`}
            >
              {isLocked ? <Lock size={20} /> : <RefreshCw size={20} className={pool.length === 0 ? 'animate-spin' : ''} />}
              Draw
            </button>
          )}
        </div>

        {/* History Indicator (Small dots) */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 px-4 h-4 items-center">
          {Array.from({ length: 13 }).map((_, i) => {
            // Fill from left to right: oldest on left, newest on right
            // history[0] is newest, history[history.length-1] is oldest
            // We show the last 13 items
            const histIndex = Math.min(history.length - 1, 12) - i;
            const histItem = histIndex >= 0 ? history[histIndex] : null;
            
            let dotColor = 'bg-slate-200/50 dark:bg-slate-700/50';
            let isCurrent = false;
            let isViewing = false;

            if (histItem) {
              // The newest item (current) is always at index 0 in our history state
              isCurrent = histIndex === 0;
              isViewing = viewingIndex === histIndex;
              
              if (histItem.score === 1) dotColor = 'bg-emerald-500';
              else if (histItem.score === -1) dotColor = 'bg-rose-500';
              else if (histItem.item === null) dotColor = 'bg-black dark:bg-white';
              else if (histItem.score === 0) dotColor = 'bg-slate-400 dark:bg-slate-500';
              else dotColor = 'bg-emerald-200 dark:bg-emerald-800'; // Waiting for score
            }

            return (
              <motion.div 
                key={i} 
                animate={isViewing ? {
                  scale: [1, 1.8, 1],
                  opacity: [1, 0.7, 1],
                } : {
                  scale: isCurrent ? 1.2 : 1,
                  opacity: isCurrent ? 0.6 : 1,
                }}
                transition={isViewing ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}}
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${dotColor}`} 
              />
            );
          })}
        </div>
      </div>

    </div>
  );
}
