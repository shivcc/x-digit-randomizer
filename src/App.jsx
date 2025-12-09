import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Skull, Anchor, Coins, X, Info, Volume2, VolumeX, Settings } from 'lucide-react';

// --- AUDIO ENGINE (Web Audio API) ---
// Synthesizes sounds to avoid external dependencies
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playReelStop() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playWin() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = now + (i * 0.1);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.5);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 1.5);
    });
  }
}

const sfx = new SoundFX();

// --- COMPONENTS ---

// The individual scrolling number strip
const Reel = ({ value, isSpinning, delay, onStop }) => {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; 
  const [internalSpinning, setInternalSpinning] = useState(false);
  const [finalValue, setFinalValue] = useState(0);

  useEffect(() => {
    if (isSpinning) {
      setInternalSpinning(true);
      const timer = setTimeout(() => {
        setInternalSpinning(false);
        setFinalValue(value);
        sfx.playReelStop();
        if (onStop) onStop();
      }, 1000 + delay); 

      return () => clearTimeout(timer);
    }
  }, [isSpinning, value, delay, onStop]);

  return (
    <div className="relative flex-shrink-0 w-16 h-24 md:w-24 md:h-36 overflow-hidden bg-[#f4e4bc] border-x-4 border-[#3e2723] shadow-inner rounded-sm">
      <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_10px_20px_rgba(0,0,0,0.5),inset_0_-10px_20px_rgba(0,0,0,0.5)]"></div>
      <div 
        className={`flex flex-col items-center w-full transition-transform duration-700 ease-out ${internalSpinning ? 'animate-blur-spin' : ''}`}
        style={{
          transform: internalSpinning 
            ? 'translateY(0)' 
            : `translateY(-${finalValue * 10}%)` 
        }}
      >
        {numbers.map((n, i) => (
          <div key={i} className="h-24 md:h-36 w-full flex items-center justify-center text-4xl md:text-6xl font-black text-[#2a1a11] font-serif">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [digits, setDigits] = useState([0, 0, 0, 0]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const handleSpin = () => {
    if (isSpinning) return;
    
    sfx.init(); 
    sfx.playClick();
    
    setIsSpinning(true);

    const newDigits = digits.map(() => Math.floor(Math.random() * 10));
    setDigits(newDigits);

    // Re-enable button after longest animation finishes
    // Base 1000ms + max delay (numDigits * 150) + buffer
    const maxDelay = digits.length * 150;
    setTimeout(() => {
      setIsSpinning(false);
      sfx.playWin();
    }, 1000 + maxDelay + 500);
  };

  const toggleSound = () => {
    const newState = sfx.toggle();
    setSoundOn(newState);
  };

  const updateDigitCount = (e) => {
    const count = parseInt(e.target.value, 10);
    if (count < 1 || count > 10) return;
    
    const currentLength = digits.length;
    if (count > currentLength) {
        const added = Array(count - currentLength).fill(0);
        setDigits([...digits, ...added]);
    } else if (count < currentLength) {
        setDigits(digits.slice(0, count));
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#1a120b] font-serif text-[#d4c5a0] overflow-hidden flex flex-col items-center justify-center relative select-none">
      
      {/* Background Texture & Vignette */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5a0' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
           }}>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none"></div>

      {/* Header - Settings Button */}
      <div className="absolute top-0 right-0 p-4 z-20">
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-transform text-[#ffb300]/80"
          aria-label="Settings"
        >
          <Settings size={28} />
        </button>
      </div>

      {/* Main Slot Machine Container */}
      <main className="z-10 flex flex-col items-center justify-center gap-8 w-full h-full px-4 transition-all duration-500">
        
        {/* The Frame - Scalable Width */}
        <div className="relative max-w-[95vw] p-3 md:p-6 bg-[#3e2723] rounded-lg shadow-2xl border-4 border-[#5d4037] transition-[width] duration-300 ease-out">
          {/* Gold Trim */}
          <div className="absolute inset-0 border-2 border-[#ffb300] rounded-lg pointer-events-none opacity-70"></div>
          <div className="absolute -inset-1 border border-[#ffb300] rounded-xl pointer-events-none opacity-40"></div>
          
          {/* Wood Grain Overlay */}
          <div className="absolute inset-0 rounded-lg bg-[linear-gradient(45deg,rgba(0,0,0,0.2)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.2)_75%,transparent_75%,transparent)] bg-[length:4px_4px] opacity-20 pointer-events-none"></div>

          {/* Reels Container */}
          <div className="flex gap-2 md:gap-4 bg-black/50 p-4 rounded border-t-4 border-black/60 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-x-auto min-w-[min-content] scrollbar-hide">
            {digits.map((digit, index) => (
              <Reel 
                key={index} 
                value={digit} 
                isSpinning={isSpinning}
                delay={index * 150} // Staggered delay
              />
            ))}
          </div>

          {/* Decorative Bolts */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#ffb300] shadow-sm"></div>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ffb300] shadow-sm"></div>
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#ffb300] shadow-sm"></div>
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#ffb300] shadow-sm"></div>
        </div>

        {/* The Interaction Area */}
        <div className="flex flex-col items-center gap-6">
          <button 
            onClick={handleSpin}
            disabled={isSpinning}
            className={`
              group relative flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-full
              bg-gradient-to-b from-[#ffb300] to-[#ff6f00]
              shadow-[0_10px_0_#b34e06,0_15px_20px_rgba(0,0,0,0.5)]
              active:shadow-[0_2px_0_#b34e06,0_5px_10px_rgba(0,0,0,0.5)]
              active:translate-y-2
              transition-all duration-100 ease-in-out
              disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-[0_10px_0_#b34e06]
            `}
          >
            {/* Button Inner Ring */}
            <div className="absolute inset-2 border-2 border-[#fff3e0] rounded-full opacity-50 border-dashed animate-[spin_10s_linear_infinite]"></div>
            
            {/* Icon */}
            {isSpinning ? (
              <Anchor className="w-10 h-10 md:w-14 md:h-14 text-[#3e2723] animate-pulse" />
            ) : (
              <span className="text-xl md:text-2xl font-black text-[#3e2723] uppercase tracking-wider drop-shadow-sm">
                SPIN
              </span>
            )}
          </button>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#f4e4bc] text-[#3e2723] p-6 rounded-lg max-w-sm w-full shadow-2xl relative border-4 border-[#3e2723]">
             <button 
               onClick={() => setShowSettings(false)}
               className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded"
             >
               <X size={24} />
             </button>
             
             <h2 className="text-2xl font-bold mb-6 text-center border-b border-[#3e2723]/20 pb-2">SHIP'S LOG</h2>

             <div className="space-y-6">
                {/* Digit Count Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center font-bold">
                        <span>Digits</span>
                        <span className="bg-[#3e2723] text-[#ffb300] px-2 py-0.5 rounded text-sm">{digits.length}</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={digits.length} 
                        onChange={updateDigitCount}
                        className="w-full h-2 bg-[#3e2723]/20 rounded-lg appearance-none cursor-pointer accent-[#3e2723]"
                    />
                    <div className="flex justify-between text-xs opacity-60 font-medium">
                        <span>1</span>
                        <span>10</span>
                    </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between border-t border-[#3e2723]/10 pt-4">
                    <span className="font-bold flex items-center gap-2"><Volume2 size={18}/> Sound</span>
                    <button 
                        onClick={toggleSound}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${soundOn ? 'bg-[#3e2723]' : 'bg-[#3e2723]/30'}`}
                    >
                        <div className={`bg-[#ffb300] w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${soundOn ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between border-t border-[#3e2723]/10 pt-4">
                     <span className="font-bold flex items-center gap-2"><Info size={18}/> Help</span>
                     <button 
                        onClick={() => setShowInfo(true)}
                        className="px-3 py-1 bg-[#3e2723] text-[#ffb300] rounded text-sm font-bold shadow hover:bg-[#5d4037]"
                     >
                        View
                     </button>
                </div>
             </div>
           </div>
        </div>
      )}
      
      {/* Info Modal */}
      {showInfo && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#f4e4bc] text-[#3e2723] p-6 rounded-lg max-w-sm w-full shadow-2xl relative border-4 border-[#3e2723]">
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Anchor size={20} /> How to Install
            </h2>
            <p className="mb-4 text-sm leading-relaxed">
              This app is designed as a Progressive Web App (PWA). 
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm mb-4 font-medium">
              <li><strong>iOS:</strong> Tap 'Share' <span className="inline-block border px-1 rounded text-xs border-black/30">↑</span> then 'Add to Home Screen'.</li>
              <li><strong>Android:</strong> Tap the Menu <span className="inline-block border px-1 rounded text-xs border-black/30">⋮</span> then 'Install App' or 'Add to Home Screen'.</li>
            </ul>
            <div className="mt-6 pt-4 border-t border-[#3e2723]/20 flex justify-center">
                <button onClick={() => setShowInfo(false)} className="text-sm font-bold underline">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes blur-spin {
          0% { transform: translateY(0); filter: blur(0px); }
          10% { filter: blur(2px); }
          50% { transform: translateY(-50%); filter: blur(4px); }
          100% { transform: translateY(-90%); filter: blur(2px); }
        }
        .animate-blur-spin {
          animation: blur-spin 0.2s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}