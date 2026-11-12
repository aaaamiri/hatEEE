import { useState, useEffect, useCallback, useRef } from 'react';

// Game items with their emoji, name, and target temperature range
const ITEMS = [
  { emoji: '🍕', name: 'Pizza', targetMin: 60, targetMax: 80, maxTemp: 150, heatRate: 2.5, coolRate: 0.8 },
  { emoji: '🥩', name: 'Steak', targetMin: 55, targetMax: 70, maxTemp: 140, heatRate: 2.0, coolRate: 1.0 },
  { emoji: '☕', name: 'Coffee', targetMin: 65, targetMax: 85, maxTemp: 120, heatRate: 3.0, coolRate: 1.2 },
  { emoji: '🍞', name: 'Bread', targetMin: 45, targetMax: 65, maxTemp: 130, heatRate: 1.8, coolRate: 0.6 },
  { emoji: '🥚', name: 'Egg', targetMin: 50, targetMax: 65, maxTemp: 110, heatRate: 2.2, coolRate: 0.9 },
  { emoji: '🌮', name: 'Taco', targetMin: 55, targetMax: 75, maxTemp: 140, heatRate: 2.3, coolRate: 0.7 },
  { emoji: '🍫', name: 'Chocolate', targetMin: 35, targetMax: 50, maxTemp: 100, heatRate: 1.5, coolRate: 1.5 },
  { emoji: '🧀', name: 'Cheese', targetMin: 40, targetMax: 60, maxTemp: 120, heatRate: 1.7, coolRate: 0.8 },
  { emoji: '🍗', name: 'Chicken', targetMin: 70, targetMax: 85, maxTemp: 160, heatRate: 1.5, coolRate: 0.5 },
  { emoji: '🥞', name: 'Pancake', targetMin: 50, targetMax: 70, maxTemp: 130, heatRate: 2.8, coolRate: 0.7 },
];

type GameState = 'menu' | 'playing' | 'success' | 'failed' | 'gameover';

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [temperature, setTemperature] = useState(20);
  const [isHeating, setIsHeating] = useState(false);
  const [currentItem, setCurrentItem] = useState(ITEMS[0]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [totalLevels, setTotalLevels] = useState(5);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [message, setMessage] = useState('');
  const particleId = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Get a random item for the current level
  const getRandomItem = useCallback(() => {
    const available = ITEMS.filter((_, i) => i < Math.min(ITEMS.length, 3 + level));
    return available[Math.floor(Math.random() * available.length)];
  }, [level]);

  // Start a new game
  const startGame = () => {
    setScore(0);
    setLevel(1);
    setCombo(0);
    const item = getRandomItem();
    setCurrentItem(item);
    setTemperature(20);
    setTimeLeft(Math.max(5, 12 - level));
    setGameState('playing');
    setMessage('');
  };

  // Start next level
  const nextLevel = () => {
    const newLevel = level + 1;
    setLevel(newLevel);
    const item = getRandomItem();
    setCurrentItem(item);
    setTemperature(20);
    setTimeLeft(Math.max(5, 12 - newLevel));
    setGameState('playing');
    setMessage('');
  };

  // Handle heating
  const startHeating = () => {
    if (gameState === 'playing') {
      setIsHeating(true);
    }
  };

  const stopHeating = () => {
    setIsHeating(false);
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setTemperature(prev => {
        let newTemp = prev;
        if (isHeating) {
          newTemp += currentItem.heatRate * delta * 60;
        } else {
          newTemp -= currentItem.coolRate * delta * 60;
        }
        newTemp = Math.max(15, Math.min(currentItem.maxTemp, newTemp));
        return newTemp;
      });

      setTimeLeft(prev => {
        const newTime = prev - delta;
        if (newTime <= 0) return 0;
        return newTime;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = 0;
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, isHeating, currentItem]);

  // Check win/lose conditions
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeLeft <= 0) {
      // Time's up - check if in target range
      if (temperature >= currentItem.targetMin && temperature <= currentItem.targetMax) {
        handleSuccess();
      } else {
        handleFailure('Time\'s up! Temperature was wrong!');
      }
      return;
    }

    if (temperature >= currentItem.maxTemp) {
      handleFailure('OVERHEATED! 💥');
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 500);
    }
  }, [temperature, timeLeft, gameState]);

  const handleSuccess = () => {
    const accuracy = 1 - Math.abs(temperature - (currentItem.targetMin + currentItem.targetMax) / 2) / ((currentItem.targetMax - currentItem.targetMin) / 2);
    const basePoints = Math.round(100 * accuracy);
    const timeBonus = Math.round(timeLeft * 10);
    const comboBonus = combo * 25;
    const points = basePoints + timeBonus + comboBonus;

    setScore(prev => {
      const newScore = prev + points;
      if (newScore > highScore) setHighScore(newScore);
      return newScore;
    });
    setCombo(prev => prev + 1);
    setGameState('success');
    setMessage(`+${points} points! (${basePoints} base + ${timeBonus} time + ${comboBonus} combo)`);
  };

  const handleFailure = (reason: string) => {
    setCombo(0);
    setGameState('failed');
    setMessage(reason);
  };

  // Confirm result / move to next level or game over
  const confirmResult = () => {
    if (gameState === 'success') {
      if (level >= totalLevels) {
        setGameState('gameover');
      } else {
        nextLevel();
      }
    } else if (gameState === 'failed') {
      setGameState('gameover');
    }
  };

  // Spawn fire particles
  useEffect(() => {
    if (!isHeating || gameState !== 'playing') return;

    const interval = setInterval(() => {
      const newParticle: Particle = {
        id: particleId.current++,
        x: 40 + Math.random() * 20,
        y: 60 + Math.random() * 10,
        emoji: ['🔥', '✨', '💫', '🔥', '🔥'][Math.floor(Math.random() * 5)],
      };
      setParticles(prev => [...prev.slice(-15), newParticle]);
    }, 150);

    return () => clearInterval(interval);
  }, [isHeating, gameState]);

  // Remove old particles
  useEffect(() => {
    if (particles.length === 0) return;
    const timeout = setTimeout(() => {
      setParticles(prev => prev.slice(1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [particles]);

  // Get temperature color
  const getTempColor = () => {
    const pct = temperature / currentItem.maxTemp;
    if (pct < 0.3) return 'from-blue-400 to-blue-600';
    if (pct < 0.5) return 'from-yellow-400 to-yellow-600';
    if (pct < 0.7) return 'from-orange-400 to-orange-600';
    if (pct < 0.85) return 'from-red-400 to-red-600';
    return 'from-red-600 to-red-900';
  };

  const isInTarget = temperature >= currentItem.targetMin && temperature <= currentItem.targetMax;
  const isOverheating = temperature > currentItem.targetMax * 0.85;
  const tempPercent = (temperature / currentItem.maxTemp) * 100;
  const targetMinPercent = (currentItem.targetMin / currentItem.maxTemp) * 100;
  const targetMaxPercent = (currentItem.targetMax / currentItem.maxTemp) * 100;

  // MENU SCREEN
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-4">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-fire">🔥</div>
          <h1 className="text-5xl md:text-7xl font-black mb-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            HEAT IT UP!
          </h1>
          <p className="text-xl text-gray-300 mb-8">Heat things to the perfect temperature!</p>

          <div className="bg-gray-800/80 rounded-2xl p-6 mb-8 max-w-md mx-auto border border-orange-500/30">
            <h2 className="text-xl font-bold text-orange-400 mb-3">How to Play:</h2>
            <div className="text-left space-y-2 text-gray-300">
              <p>🎯 Heat items to the <span className="text-green-400 font-bold">green zone</span></p>
              <p>👆 <span className="text-yellow-400 font-bold">HOLD</span> the heat button to increase temp</p>
              <p>⏱️ Do it before time runs out!</p>
              <p>💥 Don't overheat or you'll burn it!</p>
              <p>🔥 Build combos for bonus points!</p>
            </div>
          </div>

          {highScore > 0 && (
            <p className="text-yellow-400 mb-4 text-lg">🏆 High Score: {highScore}</p>
          )}

          <button
            onClick={startGame}
            className="px-12 py-5 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl text-2xl font-black hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-orange-500/50 animate-pulse-glow"
          >
            🔥 START HEATING 🔥
          </button>
        </div>
      </div>
    );
  }

  // GAME OVER SCREEN
  if (gameState === 'gameover') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-4">
        <div className="text-center">
          <div className="text-7xl mb-4">
            {score > 500 ? '🏆' : score > 200 ? '⭐' : '🎮'}
          </div>
          <h1 className="text-5xl font-black mb-4 text-orange-400">GAME OVER!</h1>
          <div className="bg-gray-800/80 rounded-2xl p-6 mb-6 border border-orange-500/30">
            <p className="text-3xl font-bold text-white mb-2">Score: <span className="text-yellow-400">{score}</span></p>
            <p className="text-lg text-gray-300">Level Reached: {level}</p>
            {score >= highScore && score > 0 && (
              <p className="text-green-400 font-bold mt-2 text-xl">🎉 NEW HIGH SCORE! 🎉</p>
            )}
          </div>
          <button
            onClick={() => setGameState('menu')}
            className="px-10 py-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl text-xl font-black hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-orange-500/50"
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  // SUCCESS / FAILURE SCREEN
  if (gameState === 'success' || gameState === 'failed') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-b ${gameState === 'success' ? 'from-green-900 via-gray-800 to-black' : 'from-red-900 via-gray-800 to-black'} text-white p-4`}>
        <div className={`text-center ${gameState === 'success' ? 'animate-success' : 'animate-shake'}`}>
          <div className="text-7xl mb-4">
            {gameState === 'success' ? '✅' : '💥'}
          </div>
          <h1 className={`text-4xl font-black mb-4 ${gameState === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {gameState === 'success' ? 'PERFECT!' : 'BURNED!'}
          </h1>
          <div className="bg-gray-800/80 rounded-2xl p-6 mb-6 border border-gray-600">
            <p className="text-2xl mb-2">{currentItem.emoji} {currentItem.name}</p>
            <p className="text-xl text-gray-300">Final Temp: <span className="text-orange-400 font-bold">{Math.round(temperature)}°</span></p>
            <p className="text-sm text-gray-400">Target: {currentItem.targetMin}° - {currentItem.targetMax}°</p>
            {message && <p className="text-yellow-400 mt-3 font-bold">{message}</p>}
            {combo > 0 && gameState === 'success' && (
              <p className="text-orange-400 mt-2">🔥 Combo x{combo}!</p>
            )}
          </div>
          <button
            onClick={confirmResult}
            className={`px-10 py-4 rounded-2xl text-xl font-black hover:scale-105 active:scale-95 transition-transform shadow-lg ${
              gameState === 'success'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/50'
                : 'bg-gradient-to-r from-orange-500 to-red-600 shadow-orange-500/50'
            }`}
          >
            {gameState === 'success' ? (level >= totalLevels ? '🏆 SEE RESULTS' : '➡️ NEXT LEVEL') : '📊 SEE RESULTS'}
          </button>
        </div>
      </div>
    );
  }

  // PLAYING SCREEN
  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-4 select-none ${shakeScreen ? 'animate-shake' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-bold text-lg">⭐ {score}</span>
          {combo > 0 && <span className="text-orange-400 font-bold">🔥 x{combo}</span>}
        </div>
        <div className="text-center">
          <span className="text-gray-400 text-sm">Level</span>
          <span className="text-white font-bold ml-2">{level}/{totalLevels}</span>
        </div>
        <div className={`font-bold text-lg ${timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
          ⏱️ {timeLeft.toFixed(1)}s
        </div>
      </div>

      {/* Item Display */}
      <div className="text-center mb-4">
        <div className={`text-6xl mb-2 ${isHeating ? 'animate-fire' : ''}`}>
          {currentItem.emoji}
        </div>
        <p className="text-xl font-bold text-gray-200">{currentItem.name}</p>
        <p className="text-sm text-green-400">
          Target: {currentItem.targetMin}° - {currentItem.targetMax}°
        </p>
      </div>

      {/* Temperature Gauge */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="relative bg-gray-700 rounded-full h-16 overflow-hidden border-2 border-gray-600">
          {/* Target zone indicator */}
          <div
            className="absolute top-0 h-full bg-green-500/30 border-l-2 border-r-2 border-green-400"
            style={{ left: `${targetMinPercent}%`, width: `${targetMaxPercent - targetMinPercent}%` }}
          />

          {/* Temperature fill */}
          <div
            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getTempColor()} transition-all duration-75 rounded-full`}
            style={{ width: `${tempPercent}%` }}
          />

          {/* Temperature text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-white drop-shadow-lg">
              {Math.round(temperature)}°
            </span>
          </div>

          {/* Danger zone marker */}
          <div
            className="absolute top-0 h-full w-1 bg-red-400"
            style={{ left: `${currentItem.maxTemp * 0.85 / currentItem.maxTemp * 100}%` }}
          />
        </div>

        {/* Temperature scale */}
        <div className="flex justify-between mt-1 text-xs text-gray-500 px-1">
          <span>15°</span>
          <span className="text-green-400">✓ Target</span>
          <span className="text-red-400">⚠ Danger</span>
          <span>{currentItem.maxTemp}°</span>
        </div>

        {/* Status message */}
        <div className="text-center mt-4 h-8">
          {isInTarget && (
            <p className="text-green-400 font-bold text-lg animate-success">✅ In the zone! Release to lock in!</p>
          )}
          {isOverheating && !isInTarget && (
            <p className="text-red-400 font-bold text-lg animate-pulse">⚠️ TOO HOT! Let it cool!</p>
          )}
          {temperature < currentItem.targetMin && !isHeating && (
            <p className="text-blue-400 font-bold">🧊 Too cold! Heat it up!</p>
          )}
          {isHeating && temperature < currentItem.targetMin && (
            <p className="text-orange-400 font-bold">🔥 Heating up...</p>
          )}
        </div>
      </div>

      {/* Fire particles */}
      <div className="relative h-20 overflow-hidden">
        {particles.map(p => (
          <span
            key={p.id}
            className="absolute animate-float-up text-2xl"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Heat Button */}
      <div className="flex justify-center pb-4">
        <button
          onMouseDown={startHeating}
          onMouseUp={stopHeating}
          onMouseLeave={stopHeating}
          onTouchStart={(e) => { e.preventDefault(); startHeating(); }}
          onTouchEnd={stopHeating}
          className={`w-48 h-48 rounded-full font-black text-2xl transition-all duration-100 border-4 ${
            isHeating
              ? 'bg-gradient-to-b from-red-500 to-orange-600 border-yellow-400 scale-95 shadow-2xl shadow-orange-500/80'
              : 'bg-gradient-to-b from-orange-500 to-red-700 border-orange-400 hover:scale-105 shadow-xl shadow-orange-500/40'
          } active:scale-90`}
        >
          <div className="flex flex-col items-center">
            <span className="text-4xl mb-1">{isHeating ? '🔥🔥🔥' : '🔥'}</span>
            <span className="text-white">{isHeating ? 'HEATING!' : 'HOLD TO HEAT'}</span>
          </div>
        </button>
      </div>

      {/* Background heat effect */}
      {isHeating && (
        <div className="fixed inset-0 pointer-events-none bg-gradient-to-t from-orange-500/10 to-transparent" />
      )}
    </div>
  );
}
