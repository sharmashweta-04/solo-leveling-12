'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { currentGameDay } from '@/src/engine/time';
import { sfx } from '@/src/utils/systemAudio';
import gameRules from '@/config/game_rules.json';
import Toast from '@/src/components/Toast';
import HudFrame from '@/src/components/hud/HudFrame';

export default function ShopPage() {
  const [totalMP, setTotalMP] = useState(0);
  const [screenTimeUnlockedSecs, setScreenTimeUnlockedSecs] = useState(0);
  const [activeUnlockEndTime, setActiveUnlockEndTime] = useState<number | null>(null);
  const [restTokens, setRestTokens] = useState(3);
  const [restUsedToday, setRestUsedToday] = useState(false);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepLoggedToday, setSleepLoggedToday] = useState(false);
  const [emergencyLockout, setEmergencyLockout] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const today = currentGameDay();

  const loadData = async () => {
    // 1. MP Ledger sum
    const mpEntries = await db.mp_ledger.toArray();
    const sumMP = mpEntries.reduce((acc, curr) => acc + curr.amount, 0);
    setTotalMP(Math.max(0, sumMP));

    // 2. Rest tokens
    const tokens = await db.settings.get('rest_tokens_remaining');
    setRestTokens(Number(tokens?.value ?? 3));

    const restToday = await db.settings.get(`rest_day_${today}`);
    setRestUsedToday(Boolean(restToday?.value));

    // 3. Sleep log
    const sleepSetting = await db.settings.get(`sleep_logged_${today}`);
    setSleepLoggedToday(Boolean(sleepSetting?.value));

    // 4. Emergency Lockout
    const lockout = await db.settings.get('emergency_lockout_active');
    setEmergencyLockout(Boolean(lockout?.value));

    // 5. Screen time unlock status
    const savedEndTime = localStorage.getItem('active_screen_unlock_end');
    if (savedEndTime) {
      const end = Number(savedEndTime);
      if (end > Date.now()) {
        setActiveUnlockEndTime(end);
      } else {
        localStorage.removeItem('active_screen_unlock_end');
        setActiveUnlockEndTime(null);
      }
    }

    const savedSeconds = localStorage.getItem(`screen_unlocked_today_${today}`);
    setScreenTimeUnlockedSecs(Number(savedSeconds || 0));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      const savedEndTime = localStorage.getItem('active_screen_unlock_end');
      if (savedEndTime && Number(savedEndTime) <= Date.now()) {
        localStorage.removeItem('active_screen_unlock_end');
        setActiveUnlockEndTime(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const purchaseKey = async (keyConfig: { id: string; cost: number; minutes: number }) => {
    if (totalMP < keyConfig.cost) {
      sfx.penalty();
      setToastMessage('[ SYSTEM WARNING ] Insufficient Mana (MP) to purchase key.');
      return;
    }

    const maxMins = gameRules.shop.daily_screen_cap_minutes;
    const currentMins = Math.floor(screenTimeUnlockedSecs / 60);

    if (currentMins + keyConfig.minutes > maxMins) {
      sfx.penalty();
      setToastMessage(`[ SYSTEM LIMIT ] Daily screen time cap is ${maxMins} minutes. Cannot exceed.`);
      return;
    }

    sfx.quest();
    const nowIso = new Date().toISOString();

    // Deduct MP from ledger
    await db.mp_ledger.add({
      date: today,
      amount: -keyConfig.cost,
      source: 'shop_key',
      description: `Purchased ${keyConfig.id.toUpperCase()} Key (${keyConfig.minutes} min screen time)`,
      created_at: nowIso
    });

    const newUnlockedSecs = screenTimeUnlockedSecs + keyConfig.minutes * 60;
    setScreenTimeUnlockedSecs(newUnlockedSecs);
    localStorage.setItem(`screen_unlocked_today_${today}`, String(newUnlockedSecs));

    // Set active timer end
    const newEndTime = Date.now() + keyConfig.minutes * 60 * 1000;
    setActiveUnlockEndTime(newEndTime);
    localStorage.setItem('active_screen_unlock_end', String(newEndTime));

    setTotalMP((prev) => prev - keyConfig.cost);
    setToastMessage(`[ SYSTEM ACCESS GRANTED ] ${keyConfig.id.toUpperCase()} Key activated! ${keyConfig.minutes} min unlocked.`);
  };

  const handleActivateRestToken = async () => {
    if (restTokens <= 0 || restUsedToday) return;

    sfx.quest();
    const newCount = restTokens - 1;
    await db.settings.put({ key: 'rest_tokens_remaining', value: newCount });
    await db.settings.put({ key: `rest_day_${today}`, value: true });

    setRestTokens(newCount);
    setRestUsedToday(true);
    setToastMessage('[ SYSTEM SHIELD ] Rest Day Shield activated. Streak protected from penalty.');
  };

  const handleLogSleep = async () => {
    if (sleepLoggedToday) return;

    sfx.quest();
    await db.settings.put({ key: `sleep_logged_${today}`, value: true });
    await db.settings.put({ key: `sleep_hours_${today}`, value: sleepHours });

    if (sleepHours >= 7) {
      await db.xp_ledger.add({
        date: today,
        amount: 20,
        source: 'quest',
        reason: 'Optimal Sleep Recovery (>= 7 hours)',
        created_at: new Date().toISOString()
      });
      setToastMessage('[ RECOVERY CLEAR ] Logged optimal sleep. +20 XP awarded!');
    } else {
      setToastMessage('[ SYSTEM ] Sleep recovery logged.');
    }
    setSleepLoggedToday(true);
  };

  const handleEmergencyBypass = async () => {
    sfx.penalty();
    await db.xp_ledger.add({
      date: today,
      amount: -100,
      source: 'bypass_penalty',
      reason: 'Emergency Lockout Bypass Penalty',
      created_at: new Date().toISOString()
    });
    await db.settings.put({ key: 'emergency_lockout_active', value: false });
    setEmergencyLockout(false);
    setToastMessage('[ SYSTEM OVERRIDE ] Emergency Lockout lifted. Penalty of -100 XP deducted.');
  };

  const remSeconds = activeUnlockEndTime ? Math.max(0, Math.floor((activeUnlockEndTime - Date.now()) / 1000)) : 0;
  const remMinutes = Math.floor(remSeconds / 60);
  const remSecs = remSeconds % 60;

  return (
    <div className="select-none space-y-5">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header */}
      <header className="flex justify-between items-end border-b border-[#5cc8ff]/30 pb-3 pt-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-cinzel)] text-[#dff3ff] tracking-wider text-shadow-blue">
            MONARCH&apos;S SHOP
          </h1>
          <p className="text-[15px] font-semibold text-[#8ab4d8] tracking-wide mt-0.5">MANA VAULT &bull; SCREEN TIME EXCHANGES</p>
        </div>
        <div className="text-right">
          <span className="text-[13px] font-bold text-[#8ab4d8] block uppercase">MANA POOL</span>
          <span className="text-lg font-bold font-[family-name:var(--font-cinzel)] text-[#5cc8ff] text-shadow-blue">{totalMP} MP</span>
        </div>
      </header>

      {/* Emergency Lockout Banner */}
      {emergencyLockout && (
        <HudFrame title="EMERGENCY LOCKOUT" icon="🚨" delay={0}>
          <div className="text-center space-y-2">
            <p className="text-[15px] text-red-200">
              You missed 2 days within 7 days. Quests are locked until the next Boss Raid is cleared.
            </p>
            <div className="pt-2">
              <button
                onClick={handleEmergencyBypass}
                className="hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest text-red-300 border-red-500/50 hover:bg-red-950/40"
              >
                EMERGENCY BYPASS (-100 XP)
              </button>
            </div>
          </div>
        </HudFrame>
      )}

      {/* Active Screen Time Countdown */}
      {activeUnlockEndTime && (
        <HudFrame title="ACTIVE SCREEN TIME KEY" icon="⏳" delay={40}>
          <div className="text-center">
            <div className="text-4xl font-bold font-[family-name:var(--font-cinzel)] text-[#34d399] tracking-wider my-2 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]">
              {String(remMinutes).padStart(2, '0')}:{String(remSecs).padStart(2, '0')}
            </div>
            <p className="text-[15px] text-[#8ab4d8] font-semibold">
              Enjoy guilt-free leisure. The timer will automatically lock when depleted.
            </p>
          </div>
        </HudFrame>
      )}

      {/* Key Exchange Cards */}
      <HudFrame title="SCREEN TIME KEYS" icon="🔑" delay={80}>
        <div className="flex justify-between items-center mb-3 px-1 text-[15px] font-semibold text-[#8ab4d8]">
          <span>MANA EXCHANGE</span>
          <span className="font-[family-name:var(--font-cinzel)] font-bold text-[#5cc8ff]">
            CAP: {Math.floor(screenTimeUnlockedSecs / 60)} / {gameRules.shop.daily_screen_cap_minutes} MIN TODAY
          </span>
        </div>

        <ul className="hud2-goals">
          {gameRules.shop.keys.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                onClick={() => purchaseKey(k)}
                disabled={totalMP < k.cost}
                className={`hud2-row justify-between ${totalMP < k.cost ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#5cc8ff]'}`}
              >
                <div className="flex-1 text-left">
                  <span className="font-bold uppercase tracking-wider text-[#dff3ff]">{k.id} KEY</span>
                  <span className="text-[#8ab4d8] text-sm ml-2">({k.minutes} min)</span>
                </div>
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-[#5cc8ff] text-base">
                  [{k.cost} MP]
                </div>
              </button>
            </li>
          ))}
        </ul>
      </HudFrame>

      {/* Rest Day Tokens */}
      <HudFrame title="REST DAY TOKENS" icon="🛡️" delay={140}>
        <div className="flex justify-between items-center mb-2 px-1 text-[15px] font-semibold text-[#8ab4d8]">
          <span>SHIELD VAULT</span>
          <span className="font-[family-name:var(--font-cinzel)] font-bold text-[#5cc8ff]">{restTokens} / 3 REMAINING</span>
        </div>
        <p className="text-[15px] text-[#8ab4d8] mb-3 leading-relaxed px-1">
          Activating a token shields your day from missed-quest penalties and preserves your streak intact.
        </p>

        <button
          onClick={handleActivateRestToken}
          disabled={restTokens <= 0 || restUsedToday}
          className={`hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest ${
            restUsedToday
              ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300 cursor-default'
              : restTokens > 0
              ? 'border-[#5cc8ff] text-[#dff3ff] hover:bg-[#5cc8ff]/20'
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          {restUsedToday ? 'REST SHIELD ACTIVE TODAY ✓' : `ACTIVATE REST TOKEN (${restTokens} LEFT)`}
        </button>
      </HudFrame>

      {/* Sleep Logger (>= 7h Bonus) */}
      <HudFrame title="SLEEP RECOVERY LOG" icon="💤" delay={200}>
        <p className="text-[15px] text-[#8ab4d8] mb-3 px-1 leading-relaxed">
          Log ≥ 7 hours of sleep to claim +20 XP and Vitality (VIT) stat growth.
        </p>

        <div className="hud2-row justify-between mb-3">
          <input
            type="range"
            min={4}
            max={10}
            step={0.5}
            value={sleepHours}
            disabled={sleepLoggedToday}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="flex-1 accent-[#5cc8ff] cursor-pointer h-6 mr-3"
          />
          <span className="font-[family-name:var(--font-cinzel)] font-bold text-lg text-[#34d399] w-16 text-right">
            {sleepHours}h
          </span>
        </div>

        <button
          onClick={handleLogSleep}
          disabled={sleepLoggedToday}
          className={`hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest ${
            sleepLoggedToday
              ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300 cursor-default'
              : 'border-[#5cc8ff] text-[#dff3ff] hover:bg-[#5cc8ff]/20'
          }`}
        >
          {sleepLoggedToday ? 'SLEEP LOGGED TODAY ✓' : 'RECORD SLEEP RECOVERY'}
        </button>
      </HudFrame>
    </div>
  );
}
