'use client';

import { useState, useEffect, useRef } from 'react';
import systemMessages from '@/config/system_messages.json';
import { playSystemChime } from '@/src/utils/audio';
import { db } from '@/src/db/db';
import { useRouter } from 'next/navigation';

interface IntroScreenProps {
  level?: number;
  onComplete?: () => void;
  isReplay?: boolean;
}

type OnboardingStep = 'intro' | 'oath' | 'mode' | 'date_confirm';

export default function IntroScreen({ level = 1, onComplete, isReplay = false }: IntroScreenProps) {
  const router = useRouter();
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [selectedMode, setSelectedMode] = useState<'normal' | 'easy'>('normal');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [oathChecked, setOathChecked] = useState(false);

  const introConfig = systemMessages.intro;
  const rawLines = introConfig.lines.map((l) => l.replace('{level}', String(level)));

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter effect
  useEffect(() => {
    if (step !== 'intro') return;

    if (currentLineIndex < rawLines.length) {
      const targetLine = rawLines[currentLineIndex];
      let charIndex = 0;
      playSystemChime();

      const typeChar = () => {
        if (charIndex <= targetLine.length) {
          setDisplayedText((prev) => {
            const next = [...prev];
            next[currentLineIndex] = targetLine.slice(0, charIndex);
            return next;
          });
          charIndex++;
          typingTimeoutRef.current = setTimeout(typeChar, 30);
        } else {
          // Finished current line, pause then start next
          typingTimeoutRef.current = setTimeout(() => {
            setCurrentLineIndex((prev) => prev + 1);
          }, 450);
        }
      };

      typeChar();
    } else {
      setIsTyping(false);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentLineIndex, step]);

  const handleSkip = () => {
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setDisplayedText([...rawLines]);
      setCurrentLineIndex(rawLines.length);
      setIsTyping(false);
      playSystemChime();
    }
  };

  const handleAcceptIntro = () => {
    playSystemChime();
    if (isReplay) {
      if (onComplete) onComplete();
      else router.push('/settings');
    } else {
      setStep('oath');
    }
  };

  const handleOathNext = () => {
    if (!oathChecked) return;
    playSystemChime();
    setStep('mode');
  };

  const handleModeNext = () => {
    playSystemChime();
    setStep('date_confirm');
  };

  const handleFinishOnboarding = async () => {
    playSystemChime();
    await db.settings.put({ key: 'intro_completed', value: true });
    await db.settings.put({ key: 'difficulty_mode', value: selectedMode });
    await db.settings.put({ key: 'start_date', value: startDate });
    await db.settings.put({ key: 'honesty_oath_taken', value: true });

    if (onComplete) {
      onComplete();
    } else {
      router.push('/');
    }
  };

  return (
    <div
      onClick={handleSkip}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-hunter-blue font-mono p-6 select-none cursor-pointer overflow-y-auto"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(0, 212, 255, 0.08) 0%, transparent 70%)'
      }}
    >
      {/* Top Banner */}
      <div className="flex justify-between items-center border-b border-hunter-blue/40 pb-3 text-xs tracking-widest text-hunter-cyan">
        <span>{introConfig.header}</span>
        {isTyping && <span className="animate-pulse text-[10px] text-hunter-gray">[ TAP ANYWHERE TO SKIP ]</span>}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center my-8 max-w-lg mx-auto w-full" onClick={(e) => e.stopPropagation()}>
        {step === 'intro' && (
          <div className="space-y-6">
            {displayedText.map((line, idx) => {
              const isLast = idx === rawLines.length - 1;
              return (
                <div
                  key={idx}
                  className={`transition-all duration-300 ${
                    isLast
                      ? 'text-lg sm:text-xl font-extrabold text-hunter-blue tracking-widest border-t border-b border-hunter-blue/50 py-3 text-center shadow-[0_0_20px_rgba(0,217,255,0.4)]'
                      : 'text-sm sm:text-base leading-relaxed text-hunter-100 text-shadow-blue'
                  }`}
                >
                  {line}
                  {idx === currentLineIndex && isTyping && (
                    <span className="inline-block w-2 h-4 ml-1 bg-hunter-blue animate-pulse align-middle" />
                  )}
                </div>
              );
            })}

            {!isTyping && (
              <div className="pt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleAcceptIntro}
                  className="w-full max-w-xs px-8 py-3 bg-hunter-blue/20 hover:bg-hunter-blue/40 text-hunter-blue hover:text-white border-2 border-hunter-blue rounded font-bold tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(0,217,255,0.4)] active:scale-95"
                >
                  ACCEPT
                </button>
              </div>
            )}
          </div>
        )}

        {/* Onboarding Step 1: Honesty Oath */}
        {step === 'oath' && (
          <div className="space-y-6 border border-hunter-blue/50 bg-hunter-900/90 p-6 rounded shadow-[0_0_20px_rgba(0,217,255,0.3)]">
            <h2 className="text-base text-hunter-cyan font-bold tracking-wider text-center">[ HONESTY OATH ]</h2>
            <div className="text-xs text-hunter-200 leading-relaxed space-y-3">
              <p>
                In the Solo Leveling protocol, there are no teachers, supervisors, or proctors. 
                <span className="text-hunter-blue font-bold"> You are your own monarch.</span>
              </p>
              <p className="border-l-2 border-hunter-blue pl-3 py-1 text-hunter-100 italic">
                &quot;I solemnly swear to record only genuine, distraction-free study blocks. 
                I will not fake timer entries, nor mark incomplete topics as cleared. 
                Self-deception is the poison of every Hunter.&quot;
              </p>
            </div>

            <label className="flex items-center gap-3 pt-2 text-xs text-hunter-blue cursor-pointer">
              <input
                type="checkbox"
                checked={oathChecked}
                onChange={(e) => setOathChecked(e.target.checked)}
                className="w-4 h-4 rounded border-hunter-blue text-hunter-blue focus:ring-0 bg-black cursor-pointer"
              />
              <span>I accept the Honesty Oath.</span>
            </label>

            <button
              disabled={!oathChecked}
              onClick={handleOathNext}
              className={`w-full py-2.5 rounded font-bold tracking-wider uppercase transition-all ${
                oathChecked
                  ? 'bg-hunter-blue/30 hover:bg-hunter-blue/50 border border-hunter-blue text-white shadow-[0_0_15px_rgba(0,217,255,0.4)]'
                  : 'bg-hunter-800 text-hunter-600 border border-hunter-800 cursor-not-allowed'
              }`}
            >
              CONFIRM OATH
            </button>
          </div>
        )}

        {/* Onboarding Step 2: Choose Mode */}
        {step === 'mode' && (
          <div className="space-y-6 border border-hunter-blue/50 bg-hunter-900/90 p-6 rounded shadow-[0_0_20px_rgba(0,217,255,0.3)]">
            <h2 className="text-base text-hunter-cyan font-bold tracking-wider text-center">[ SELECT DIFFICULTY MODE ]</h2>
            <p className="text-xs text-hunter-gray text-center">You can toggle this later in Settings.</p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedMode('normal')}
                className={`w-full text-left p-4 rounded border transition-all ${
                  selectedMode === 'normal'
                    ? 'border-hunter-blue bg-hunter-blue/20 shadow-[0_0_15px_rgba(0,217,255,0.3)] text-hunter-100'
                    : 'border-hunter-800 bg-hunter-950 text-hunter-400 hover:border-hunter-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-hunter-blue">NORMAL MODE</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-hunter-blue/30 rounded text-hunter-cyan">Recommended</span>
                </div>
                <div className="text-xs text-hunter-300">8 study blocks (400 min / 6.7 hrs) + physical workout</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('easy')}
                className={`w-full text-left p-4 rounded border transition-all ${
                  selectedMode === 'easy'
                    ? 'border-hunter-cyan bg-hunter-cyan/20 shadow-[0_0_15px_rgba(0,217,255,0.3)] text-hunter-100'
                    : 'border-hunter-800 bg-hunter-950 text-hunter-400 hover:border-hunter-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-hunter-cyan">EASY MODE</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-hunter-800 rounded text-hunter-gray">Beginner</span>
                </div>
                <div className="text-xs text-hunter-300">6 study blocks (300 min / 5.0 hrs) + physical workout</div>
              </button>
            </div>

            <button
              onClick={handleModeNext}
              className="w-full py-2.5 rounded font-bold tracking-wider uppercase bg-hunter-blue/30 hover:bg-hunter-blue/50 border border-hunter-blue text-white shadow-[0_0_15px_rgba(0,217,255,0.4)]"
            >
              PROCEED
            </button>
          </div>
        )}

        {/* Onboarding Step 3: Confirm Start Date */}
        {step === 'date_confirm' && (
          <div className="space-y-6 border border-hunter-blue/50 bg-hunter-900/90 p-6 rounded shadow-[0_0_20px_rgba(0,217,255,0.3)]">
            <h2 className="text-base text-hunter-cyan font-bold tracking-wider text-center">[ CONFIRM REVISION PROTOCOL ]</h2>
            <div className="space-y-3 text-xs text-hunter-200">
              <div className="flex justify-between border-b border-hunter-800 pb-2">
                <span className="text-hunter-gray">START DATE (DAY 1):</span>
                <span className="font-bold text-hunter-blue">{startDate} (05:00 IST)</span>
              </div>
              <div className="flex justify-between border-b border-hunter-800 pb-2">
                <span className="text-hunter-gray">END DATE (DAY 45):</span>
                <span className="font-bold text-hunter-cyan">2026-12-15</span>
              </div>
              <div className="flex justify-between border-b border-hunter-800 pb-2">
                <span className="text-hunter-gray">DIFFICULTY:</span>
                <span className="font-bold uppercase text-hunter-green">{selectedMode} MODE</span>
              </div>
              <p className="text-[11px] text-hunter-gray pt-2 text-center">
                The System Window will unlock and track your 45-day Class 12 NCERT campaign.
              </p>
            </div>

            <button
              onClick={handleFinishOnboarding}
              className="w-full py-3 rounded font-bold tracking-widest uppercase bg-hunter-blue hover:bg-hunter-cyan text-black shadow-[0_0_25px_rgba(0,217,255,0.5)] transition-all"
            >
              INITIALIZE SYSTEM WINDOW
            </button>
          </div>
        )}
      </div>

      {/* Bottom Status */}
      <div className="text-center text-[10px] text-hunter-gray tracking-wider">
        SOLO LEVELING: CLASS 12 PCB DUNGEON &bull; LOCAL-FIRST PROTOCOL
      </div>
    </div>
  );
}
