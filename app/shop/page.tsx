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
    <div className="font-mono pb-24 max-w-md mx-auto select-none space-y-4">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-cyan-500/30 pb-3 mb-2">
        <div>
          <h1 className="text-base font-extrabold text-cyan-400 tracking-wider text-shadow-blue">
            [ MONARCH&apos;S SHOP ]
          </h1>
          <p className="text-xs text-slate-400">MANA VAULT &bull; SCREEN TIME EXCHANGES</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block">MANA POOL</span>
          <span className="text-sm font-bold text-cyan-300">{totalMP} MP</span>
        </div>
      </div>

      {/* Emergency Lockout Banner */}
      {emergencyLockout && (
        <HudFrame title="EMERGENCY LOCKOUT" icon="🚨" delay={0}>
          <div className="text-center space-y-2">
            <p className="text-xs text-red-200">
              You missed 2 days within 7 days. Quests are locked until the next Boss Raid is cleared.
            </p>
            <button
              onClick={handleEmergencyBypass}
              className="min-h-[44px] px-3.5 py-1.5 bg-red-600/40 hover:bg-red-600/60 border border-red-400 text-white rounded text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center mx-auto"
            >
              EMERGENCY BYPASS (-100 XP)
            </button>
          </div>
        </HudFrame>
      )}

      {/* Active Screen Time Countdown */}
      {activeUnlockEndTime && (
        <HudFrame title="ACTIVE SCREEN TIME KEY" icon="⏳" delay={40}>
          <div className="text-center">
            <div className="text-3xl font-black text-emerald-400 tracking-tight my-1">
              {String(remMinutes).padStart(2, '0')}:{String(remSecs).padStart(2, '0')}
            </div>
            <p className="text-xs text-slate-400">
              Enjoy guilt-free leisure. The timer will automatically lock when depleted.
            </p>
          </div>
        </HudFrame>
      )}

      {/* Key Exchange Cards */}
      <HudFrame title="SCREEN TIME KEYS" icon="🔑" delay={80}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-slate-300">MANA EXCHANGE</span>
          <span className="text-xs text-cyan-300 font-bold">
            CAP: {Math.floor(screenTimeUnlockedSecs / 60)} / {gameRules.shop.daily_screen_cap_minutes} MIN TODAY
          </span>
        </div>

        <div className="space-y-2.5">
          {gameRules.shop.keys.map((k) => (
            <div
              key={k.id}
              className="p-3 bg-slate-950/70 rounded border border-slate-800 flex items-center justify-between hover:border-cyan-500/50 transition-all text-xs"
            >
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="uppercase">{k.id} KEY</span>
                  <span className="text-cyan-400 font-normal">({k.minutes} Minutes)</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Cost: <span className="text-cyan-300 font-bold">{k.cost} MP</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => purchaseKey(k)}
                disabled={totalMP < k.cost}
                className={`min-h-[44px] px-3.5 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center ${
                  totalMP >= k.cost
                    ? 'bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                    : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
              >
                UNLOCK
              </button>
            </div>
          ))}
        </div>
      </HudFrame>

      {/* Rest Day Tokens */}
      <HudFrame title="REST DAY TOKENS" icon="🛡️" delay={160}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-300">SHIELD VAULT</span>
          <span className="text-xs font-bold text-cyan-400">{restTokens} / 3 REMAINING</span>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Activating a token shields your day from missed-quest penalties and preserves your streak intact.
        </p>

        <button
          onClick={handleActivateRestToken}
          disabled={restTokens <= 0 || restUsedToday}
          className={`min-h-[44px] w-full py-2.5 rounded font-bold tracking-wider uppercase text-xs transition-all flex items-center justify-center ${
            restUsedToday
              ? 'bg-emerald-950/40 border border-emerald-400 text-emerald-300 cursor-default'
              : restTokens > 0
              ? 'bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,255,255,0.3)]'
              : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
          }`}
        >
          {restUsedToday ? '✅ REST SHIELD ACTIVE TODAY' : `ACTIVATE REST TOKEN (${restTokens} LEFT)`}
        </button>
      </HudFrame>

      {/* Sleep Logger (>= 7h Bonus) */}
      <HudFrame title="SLEEP & RECOVERY LOG" icon="💤" delay={240}>
        <p className="text-xs text-slate-400 mb-3">
          Log ≥ 7 hours of sleep to claim +20 XP and Vitality (VIT) stat growth.
        </p>

        <div className="flex items-center gap-3 mb-3">
          <input
            type="range"
            min={4}
            max={10}
            step={0.5}
            value={sleepHours}
            disabled={sleepLoggedToday}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="flex-1 accent-emerald-400 cursor-pointer h-6"
          />
          <span className="text-xs font-bold text-emerald-400 w-14 text-right">
            {sleepHours} hrs
          </span>
        </div>

        <button
          onClick={handleLogSleep}
          disabled={sleepLoggedToday}
          className={`min-h-[44px] w-full py-2 rounded text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center ${
            sleepLoggedToday
              ? 'bg-emerald-950/40 border border-emerald-400 text-emerald-300 cursor-default'
              : 'bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500 text-emerald-300'
          }`}
        >
          {sleepLoggedToday ? '✅ SLEEP LOGGED TODAY' : 'RECORD SLEEP RECOVERY'}
        </button>
      </HudFrame>
    </div>
  );
}
