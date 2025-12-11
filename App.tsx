import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TileData, GameState } from './types';
import { generateLevel, checkInteractability } from './utils/gameLogic';
import Tile from './components/Tile';
import Dock from './components/Dock';
import { audio } from './services/audioService';
import { FUNNY_MESSAGES, DOCK_CAPACITY, TOOL_NAMES } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [level, setLevel] = useState(1);
  const [boardTiles, setBoardTiles] = useState<TileData[]>([]);
  const [dockTiles, setDockTiles] = useState<TileData[]>([]);
  const [powerUps, setPowerUps] = useState({ undo: 1, remove: 1, shuffle: 1 });
  const [message, setMessage] = useState<string>("");
  const [isShaking, setIsShaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBgmOn, setIsBgmOn] = useState(true);
  const [boardScale, setBoardScale] = useState(1);
  
  // Scoring State
  const [initialTileCount, setInitialTileCount] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Responsive Board Scale
  useEffect(() => {
    const handleResize = () => {
       const headerHeight = 70;
       // Increased footer height reservation to ensure more gap on small screens
       const footerHeight = 220; 
       const safetyMargin = 20;
       // Use standard innerHeight, handled by 100dvh in CSS for container
       const availableHeight = window.innerHeight - headerHeight - footerHeight - safetyMargin;
       const baseBoardHeight = 520; 
       
       const scale = Math.min(1, Math.max(0.55, availableHeight / baseBoardHeight));
       setBoardScale(scale);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Background Music Control
  useEffect(() => {
    // Only play if actively playing (game started)
    if (gameState === 'playing' && !isMuted && isBgmOn) {
       audio.startBGM();
    } else {
       audio.stopBGM();
    }
  }, [gameState, isMuted, isBgmOn]);

  const triggerWinEffect = () => {
    document.body.style.overflow = 'hidden';
  };

  const startGame = (startLevel: number = 1) => {
    // CRITICAL: Initialize Audio Context on FIRST user interaction (Click)
    audio.initialize(); 

    setLevel(startLevel);
    const newTiles = generateLevel(startLevel);
    setBoardTiles(newTiles);
    setInitialTileCount(newTiles.length);
    setDockTiles([]);
    setStartTime(Date.now());
    
    // Give more powerups for level 2
    if (startLevel === 2) {
      setPowerUps({ undo: 1, remove: 1, shuffle: 1 });
    } else {
      setPowerUps({ undo: 0, remove: 0, shuffle: 0 }); // Tutorial is too easy for tools
    }
    
    setGameState('playing');
    setMessage("");
    audio.playClick();
  };

  const handleTileClick = useCallback((tile: TileData) => {
    if (gameState !== 'playing') return;
    
    if (dockTiles.length >= DOCK_CAPACITY) {
      audio.playError();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    audio.playClick();

    setDockTiles(prev => [...prev, tile]);
    setBoardTiles(prev => {
      const remaining = prev.filter(t => t.id !== tile.id);
      return checkInteractability(remaining);
    });

  }, [gameState, dockTiles.length]);

  // Game Loop: Match & Win/Loss Logic
  useEffect(() => {
    if (gameState !== 'playing') return;

    // 1. Check Matches
    const counts: Record<string, number> = {};
    dockTiles.forEach(t => { counts[t.type] = (counts[t.type] || 0) + 1; });
    const matchType = Object.keys(counts).find(type => counts[type] >= 3);
    
    if (matchType) {
      const timer = setTimeout(() => {
        setDockTiles(prev => prev.filter(t => t.type !== matchType));
        audio.playMatch();
      }, 200);
      return () => clearTimeout(timer);
    }

    // 2. Check Loss
    if (dockTiles.length >= DOCK_CAPACITY) {
       const timer = setTimeout(() => {
          // Double check match again inside timeout
          const currentCounts: Record<string, number> = {};
          dockTiles.forEach(t => { currentCounts[t.type] = (currentCounts[t.type] || 0) + 1; });
          if (!Object.values(currentCounts).some(c => c >= 3)) {
            setGameState('lost');
            setEndTime(Date.now());
            setMessage(FUNNY_MESSAGES.loss[Math.floor(Math.random() * FUNNY_MESSAGES.loss.length)]);
            audio.playError();
            audio.stopBGM();
          }
       }, 300);
       return () => clearTimeout(timer);
    }

    // 3. Check Win
    if (boardTiles.length === 0 && dockTiles.length === 0) {
      if (level === 1) {
         setGameState('won'); 
         setEndTime(Date.now());
         setMessage(FUNNY_MESSAGES.level1Win[Math.floor(Math.random() * FUNNY_MESSAGES.level1Win.length)]);
         audio.playWin();
      } else {
         setGameState('won');
         setEndTime(Date.now());
         setMessage(FUNNY_MESSAGES.win[Math.floor(Math.random() * FUNNY_MESSAGES.win.length)]);
         triggerWinEffect();
         audio.playWin();
         audio.stopBGM();
      }
    }
  }, [dockTiles, boardTiles, gameState, level]);


  // --- Power Ups ---
  const handleUndo = () => {
    if (powerUps.undo <= 0 || dockTiles.length === 0) return;
    const lastTile = dockTiles[dockTiles.length - 1];
    setDockTiles(prev => prev.slice(0, -1));
    setBoardTiles(prev => checkInteractability([...prev, lastTile]));
    setPowerUps(p => ({ ...p, undo: p.undo - 1 }));
    audio.playClick();
  };

  const handleShuffle = () => {
    if (powerUps.shuffle <= 0) return;
    setBoardTiles(prev => {
      const types = prev.map(t => t.type);
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      const newBoard = prev.map((t, i) => ({ ...t, type: types[i] }));
      return checkInteractability(newBoard);
    });
    setPowerUps(p => ({ ...p, shuffle: p.shuffle - 1 }));
    audio.playClick();
  };

  const handleRemove = () => {
    if (powerUps.remove <= 0 || dockTiles.length < 3) return;
    const toRemove = dockTiles.slice(0, 3);
    setDockTiles(prev => prev.slice(3));
    
    setBoardTiles(prev => {
       const maxZ = prev.length > 0 ? Math.max(...prev.map(t => t.z)) : 10;
       
       // Calculate position for removed tiles
       // Place them at the bottom of the board area (y=8.0) to appear just above controls
       // Use powerUps.remove count to alternate sides to prevent overlap:
       // 2 charges left (1st use) -> Left side (0.5 start)
       // 1 charge left (2nd use) -> Right side (3.5 start)
       const startX = (powerUps.remove % 2 === 0) ? 0.5 : 3.5;

       const newTiles = toRemove.map((t, i) => ({
         ...t, 
         z: maxZ + 10 + i, // High Z to be on top
         x: startX + i, 
         y: 8.0, // Move to 8.0 to ensure clearance from footer buttons on mobile
         id: t.id + '_returned'
       }));
       
       return checkInteractability([...prev, ...newTiles]);
    });
    
    setPowerUps(p => ({ ...p, remove: p.remove - 1 }));
    audio.playClick();
  };

  const toggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };
  
  const toggleBGM = () => {
      const bgmOn = audio.toggleBGMOnly();
      setIsBgmOn(bgmOn);
  }

  // --- Score Calculation ---
  const getScoreStats = () => {
    const total = initialTileCount || 1;
    const remaining = boardTiles.length + dockTiles.length;
    const cleared = total - remaining;
    const percentage = Math.floor((cleared / total) * 100);
    const timeSpent = Math.floor((endTime - startTime) / 1000);
    
    let rank = "韭菜 (Leek)";
    if (percentage > 20) rank = "小白 (Newbie)";
    if (percentage > 50) rank = "散户 (Trader)";
    if (percentage > 80) rank = "大户 (Whale)";
    if (gameState === 'won') rank = "币圈神话 (Legend)";

    return { percentage, timeSpent, rank };
  };

  const stats = useMemo(() => getScoreStats(), [gameState, endTime]);

  // Use 100dvh for better mobile browser support
  return (
    <div className={`relative w-full flex flex-col items-center overflow-hidden font-sans ${isShaking ? 'animate-shake' : ''}`} style={{ height: '100dvh' }}>
      
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-[#e0f7fa]">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4facfe"/>
                <stop offset="100%" stopColor="#00f2fe"/>
              </linearGradient>
              <linearGradient id="hillGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43e97b"/>
                <stop offset="100%" stopColor="#38f9d7"/>
              </linearGradient>
              <linearGradient id="hillGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a8e063"/>
                <stop offset="100%" stopColor="#56ab2f"/>
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#skyGrad)"/>
            <circle cx="20" cy="15" r="4" fill="white" fillOpacity="0.2"/>
            <circle cx="80" cy="25" r="6" fill="white" fillOpacity="0.15"/>
            <path d="M0,80 Q25,70 50,80 T100,75 V100 H0 Z" fill="url(#hillGrad2)" opacity="0.8"/>
            <path d="M0,90 Q40,85 100,95 V100 H0 Z" fill="url(#hillGrad1)"/>
            <path d="M0,100 L100,100" stroke="white" strokeWidth="0.5" strokeDasharray="1,2" opacity="0.3"/>
          </svg>
          <div className="absolute top-[10%] left-[10%] text-4xl animate-bounce duration-[3000ms] opacity-60 mix-blend-overlay">☁️</div>
          <div className="absolute top-[20%] right-[15%] text-2xl animate-pulse duration-[4000ms] opacity-50 mix-blend-overlay">₿</div>
          <div className="absolute bottom-[20%] left-[5%] text-6xl animate-pulse duration-[5000ms] opacity-20">🐑</div>
      </div>

      {/* Header - Fixed Height */}
      <header className="z-10 w-full h-[70px] px-4 flex justify-between items-center shrink-0">
         <div className="bg-white/90 backdrop-blur rounded-full px-5 py-2 shadow-lg border-2 border-[#38f9d7] flex gap-2 items-center">
             <span className="text-xl">🪙</span>
             <div>
               <h1 className="text-sm font-extrabold text-green-800 leading-none">币了个币</h1>
               <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Level {level}</span>
             </div>
         </div>
         <div className="flex gap-2">
            <button onClick={toggleBGM} className={`w-12 h-12 backdrop-blur rounded-full shadow-lg border-2 border-[#38f9d7] flex items-center justify-center text-xl hover:scale-110 transition active:scale-95 ${isBgmOn ? 'bg-white/90 text-blue-500' : 'bg-gray-200 text-gray-400'}`}>
                 {isBgmOn ? '🎵' : '🚫'}
            </button>
            <button onClick={toggleMute} className={`w-12 h-12 backdrop-blur rounded-full shadow-lg border-2 border-[#38f9d7] flex items-center justify-center text-xl hover:scale-110 transition active:scale-95 ${!isMuted ? 'bg-white/90 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                 {isMuted ? '🔕' : '🔊'}
            </button>
         </div>
      </header>

      {/* Main Game Area - Flexible Height, Shrinkable */}
      <main className="flex-1 w-full min-h-0 relative max-w-lg mx-auto flex flex-col justify-center items-center overflow-visible z-10">
        {gameState === 'playing' && (
          <div 
             className="relative w-full h-[520px] transition-transform origin-center duration-300 ease-out"
             style={{ transform: `scale(${boardScale})` }}
          >
             <div className="relative w-full h-full">
               {boardTiles.map(tile => (
                 <Tile key={tile.id} data={tile} onClick={handleTileClick} />
               ))}
             </div>
          </div>
        )}

        {/* Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-pop">
             <div className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center max-w-[85%] border-[6px] border-[#38f9d7] relative overflow-hidden">
                <div className="absolute top-0 w-full h-6 bg-[#38f9d7]"></div>
                <div className="text-8xl mb-4 animate-bounce drop-shadow-md">🪙</div>
                <h2 className="text-3xl font-black text-gray-800 mb-2">币了个币</h2>
                <div className="bg-gray-100 rounded-lg p-3 mb-6 w-full text-center">
                   <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Mission</p>
                   <p className="text-gray-800 font-medium text-sm">消除所有Token，避免爆仓</p>
                   <p className="text-red-500 text-xs mt-1 font-bold">通关率 ~10%</p>
                </div>
                <button 
                  onClick={() => startGame(1)}
                  className="w-full bg-gradient-to-r from-[#43e97b] to-[#38f9d7] hover:brightness-105 text-white font-black py-4 px-8 rounded-2xl border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition text-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <span>▶</span> 开始挑战
                </button>
             </div>
          </div>
        )}

        {/* Win / Loss / Level Complete */}
        {(gameState === 'lost' || gameState === 'won') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md z-50 animate-pop">
             <div className="bg-white p-6 rounded-[24px] shadow-2xl flex flex-col items-center w-[85%] max-w-sm border-4 border-white relative overflow-visible mt-10">
                 <div className="absolute -top-12 bg-white p-2 rounded-full shadow-lg">
                    <div className="text-6xl">{gameState === 'won' ? '🏆' : '💀'}</div>
                 </div>
                 <div className="mt-10 text-center w-full">
                    <h2 className={`text-3xl font-black mb-1 ${gameState === 'won' ? 'text-yellow-500' : 'text-gray-800'}`}>
                        {gameState === 'won' ? (level === 1 ? 'STAGE CLEAR' : 'YOU WIN!') : 'GAME OVER'}
                    </h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Performance Report</p>
                    <div className="bg-gray-50 rounded-xl p-4 w-full mb-4 border border-gray-100">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                           <span className="text-gray-500 font-bold text-sm">称号 Rank</span>
                           <span className="text-purple-600 font-black text-lg">{stats.rank}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-gray-500 font-bold text-sm">进度 Progress</span>
                           <span className="text-gray-800 font-black font-mono">{stats.percentage}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-gray-500 font-bold text-sm">耗时 Time</span>
                           <span className="text-gray-800 font-black font-mono">{stats.timeSpent}s</span>
                        </div>
                    </div>
                    <p className="text-gray-600 mb-6 font-medium italic text-sm">"{message}"</p>
                    {gameState === 'won' && level === 1 ? (
                        <button 
                        onClick={() => startGame(2)}
                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-xl border-b-4 border-orange-600 active:border-b-0 active:translate-y-1 transition mb-3 shadow-lg"
                        >
                        进入第二关 (Hard)
                        </button>
                    ) : (
                        <div className="flex flex-col gap-2 w-full">
                            <button 
                            onClick={() => startGame(1)}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition shadow-lg"
                            >
                            {gameState === 'won' ? '再玩一次' : '不服，重来'}
                            </button>
                        </div>
                    )}
                 </div>
             </div>
          </div>
        )}
      </main>

      {/* Footer Controls - Fixed Bottom Flow */}
      {gameState === 'playing' && (
        <footer className="w-full flex flex-col items-center pb-8 pt-2 shrink-0 z-30">
             {/* PowerUps */}
             <div className="flex justify-center gap-3 px-2 mb-2">
                <button onClick={handleShuffle} disabled={powerUps.shuffle === 0}
                  className="flex flex-col items-center gap-1 disabled:opacity-50 active:scale-95 transition bg-white/90 p-2 rounded-2xl shadow-xl border-b-4 border-blue-200 min-w-[70px] hover:-translate-y-1"
                >
                  <div className="text-2xl">🔀</div>
                  <span className="text-[10px] font-bold text-blue-600">{TOOL_NAMES.shuffle}</span>
                  <span className="text-xs font-bold text-white bg-blue-400 px-2 rounded-full min-w-[20px]">{powerUps.shuffle}</span>
                </button>
                
                <button onClick={handleUndo} disabled={powerUps.undo === 0}
                  className="flex flex-col items-center gap-1 disabled:opacity-50 active:scale-95 transition bg-white/90 p-2 rounded-2xl shadow-xl border-b-4 border-yellow-200 min-w-[70px] hover:-translate-y-1"
                >
                  <div className="text-2xl">↩️</div>
                  <span className="text-[10px] font-bold text-yellow-600">{TOOL_NAMES.undo}</span>
                  <span className="text-xs font-bold text-white bg-yellow-400 px-2 rounded-full min-w-[20px]">{powerUps.undo}</span>
                </button>

                <button onClick={handleRemove} disabled={powerUps.remove === 0}
                  className="flex flex-col items-center gap-1 disabled:opacity-50 active:scale-95 transition bg-white/90 p-2 rounded-2xl shadow-xl border-b-4 border-purple-200 min-w-[70px] hover:-translate-y-1"
                >
                  <div className="text-2xl">📤</div>
                  <span className="text-[10px] font-bold text-purple-600">{TOOL_NAMES.remove}</span>
                  <span className="text-xs font-bold text-white bg-purple-400 px-2 rounded-full min-w-[20px]">{powerUps.remove}</span>
                </button>
             </div>

             <Dock tiles={dockTiles} />
        </footer>
      )}
    </div>
  );
};

export default App;