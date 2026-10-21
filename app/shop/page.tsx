'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { currentGameDay } from '@/src/engine/time';
import { playSystemChime } from '@/src/utils/audio';
import gameRules from '@/config/game_rules.json';
import Toast from '@/src/components/Toast';

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
      setToastMessage('[ SYSTEM WARNING ] Insufficient Mana (MP) to purchase key.');
      return;
    }

    const maxMins = gameRules.shop.daily_screen_cap_minutes;
    const currentMins = Math.floor(screenTimeUnlockedSecs / 60);

    if (currentMins + keyConfig.minutes > maxMins) {
      setToastMessage(`[ SYSTEM LIMIT ] Daily screen time cap is ${maxMins} minutes. Cannot exceed.`);
      return;
    }

    playSystemChime();
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

    // Start active timer
    const unlockDurationMs = keyConfig.minutes * 60 * 1000;
    const endTime = Date.now() + unlockDurationMs;
    localStorage.setItem('active_screen_unlock_end', String(endTime));
    setActiveUnlockEndTime(endTime);

    setToastMessage(`[ KEY UNLOCKED ] ${keyConfig.minutes} minutes granted. Enjoy your monarch respite.`);
    await loadData();
  };

  const handleActivateRestToken = async () => {
    if (restTokens <= 0) {
      setToastMessage('[ SYSTEM WARNING ] No Rest Day Tokens remaining.');
      return;
    }
    if (restUsedToday) {
      setToastMessage('[ SYSTEM ] Rest Token is already active for today.');
      return;
    }

    playSystemChime();
    const remaining = restTokens - 1;
    await db.settings.put({ key: 'rest_tokens_remaining', value: remaining });
    await db.settings.put({ key: `rest_day_${today}`, value: true });

    setRestTokens(remaining);
    setRestUsedToday(true);
    setToastMessage('[ REST PROTOCOL ACTIVE ] Today is shielded from all missed-quest penalties.');
  };

  const handleLogSleep = async () => {
    if (sleepLoggedToday) return;
    playSystemChime();
    const nowIso = new Date().toISOString();

    await db.settings.put({ key: `sleep_logged_${today}`, value: true });
    setSleepLoggedToday(true);

    if (sleepHours >= 7) {
      await db.xp_ledger.add({
        date: today,
        amount: gameRules.quests.sleep_7h.xp, // 20 XP
        source: 'quest',
        reason: `Optimal Sleep Recovery (${sleepHours}h sleep logged)`,
        created_at: nowIso
      });
      setToastMessage(`[ RECOVERY CONFIRMED ] +${gameRules.quests.sleep_7h.xp} XP and +VIT awarded!`);
    } else {
      setToastMessage(`[ REST LOGGED ] ${sleepHours} hours recorded.`);
    }
    await loadData();
  };

  const handleEmergencyBypass = async () => {
    playSystemChime();
    const nowIso = new Date().toISOString();
    await db.xp_ledger.add({
      date: today,
      amount: gameRules.penalties.bypass.xp, // -100 XP
      source: 'bypass_penalty',
      reason: 'Emergency Lockout Bypass Penalty',
      created_at: nowIso
    });
    await db.settings.put({ key: 'emergency_lockout_active', value: false });
    setEmergencyLockout(false);
    setToastMessage('[ SYSTEM BYPASS ] Lockout bypassed. -100 XP penalty applied.');
    await loadData();
  };

  const remainingSeconds = activeUnlockEndTime ? Math.max(0, Math.floor((activeUnlockEndTime - Date.now()) / 1000)) : 0;
  const remMinutes = Math.floor(remainingSeconds / 60);
  const remSecs = remainingSeconds % 60;

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-hunter-blue/40 pb-3 mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-hunter-blue tracking-wider text-shadow-blue">
            [ MONARCH&apos;S SHOP ]
          </h1>
          <p className="text-[10px] text-hunter-gray">MANA VAULT &bull; SCREEN TIME EXCHANGES</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-hunter-gray block">MANA POOL</span>
          <span className="text-base font-bold text-hunter-cyan">{totalMP} MP</span>
        </div>
      </div>

      {/* Emergency Lockout Banner */}
      {emergencyLockout && (
        <div className="border-2 border-red-500 bg-red-950/80 p-4 rounded-lg mb-4 text-center space-y-2">
          <div className="text-xs font-bold text-red-400 tracking-wider animate-pulse">
            [ 🚨 EMERGENCY DUNGEON LOCKOUT ACTIVE ]
          </div>
          <p className="text-[11px] text-red-200">
            You missed 2 days within 7 days. Quests are locked until the next Boss Raid is cleared.
          </p>
          <button
            onClick={handleEmergencyBypass}
            className="px-3 py-1.5 bg-red-600/40 hover:bg-red-600/60 border border-red-400 text-white rounded text-xs font-bold tracking-wider uppercase transition-all"
          >
            EMERGENCY BYPASS (-100 XP)
          </button>
        </div>
      )}

      {/* Active Screen Time Countdown */}
      {activeUnlockEndTime && (
        <div className="border border-hunter-green/50 bg-green-950/40 p-4 rounded-lg mb-4 text-center shadow-[0_0_20px_rgba(0,255,136,0.25)]">
          <div className="text-xs text-hunter-green font-bold tracking-wider mb-1">
            [ ACTIVE SCREEN TIME KEY ]
          </div>
          <div className="text-3xl font-black text-hunter-green tracking-tight my-1">
            {String(remMinutes).padStart(2, '0')}:{String(remSecs).padStart(2, '0')}
          </div>
          <p className="text-[10px] text-hunter-gray">
            Enjoy guilt-free leisure. The timer will automatically lock when depleted.
          </p>
        </div>
      )}

      {/* Key Exchange Cards */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-hunter-blue">[ SCREEN TIME KEYS ]</span>
          <span className="text-[10px] text-hunter-cyan">
            CAP: {Math.floor(screenTimeUnlockedSecs / 60)} / {gameRules.shop.daily_screen_cap_minutes} MIN TODAY
          </span>
        </div>

        <div className="space-y-2.5">
          {gameRules.shop.keys.map((k) => (
            <div
              key={k.id}
              className="p-3 bg-hunter-950 rounded border border-hunter-800 flex items-center justify-between hover:border-hunter-blue/50 transition-all text-xs"
            >
              <div>
                <div className="font-bold text-hunter-100 flex items-center gap-1.5">
                  <span>🔑</span>
                  <span className="uppercase">{k.id} KEY</span>
                  <span className="text-hunter-cyan font-normal">({k.minutes} Minutes)</span>
                </div>
                <div className="text-[10px] text-hunter-gray mt-0.5">
                  Cost: <span className="text-hunter-blue font-bold">{k.cost} MP</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => purchaseKey(k)}
                disabled={totalMP < k.cost}
                className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wider uppercase transition-all ${
                  totalMP >= k.cost
                    ? 'bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue hover:text-white shadow-[0_0_10px_rgba(0,217,255,0.3)]'
                    : 'bg-hunter-900 text-hunter-600 border border-hunter-800 cursor-not-allowed'
                }`}
              >
                UNLOCK
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rest Day Tokens */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-hunter-cyan">[ REST DAY TOKENS ]</span>
          <span className="text-xs font-bold text-hunter-blue">{restTokens} / 3 REMAINING</span>
        </div>
        <p className="text-[10px] text-hunter-gray mb-3 leading-relaxed">
          Activating a token shields your day from missed-quest penalties and preserves your streak intact.
        </p>

        <button
          onClick={handleActivateRestToken}
          disabled={restTokens <= 0 || restUsedToday}
          className={`w-full py-2.5 rounded font-bold tracking-wider uppercase text-xs transition-all ${
            restUsedToday
              ? 'bg-green-950/40 border border-hunter-green text-hunter-green cursor-default'
              : restTokens > 0
              ? 'bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue shadow-[0_0_12px_rgba(0,217,255,0.3)]'
              : 'bg-hunter-900 text-hunter-600 border border-hunter-800 cursor-not-allowed'
          }`}
        >
          {restUsedToday ? '✅ REST SHIELD ACTIVE TODAY' : `ACTIVATE REST TOKEN (${restTokens} LEFT)`}
        </button>
      </div>

      {/* Sleep Logger (>= 7h Bonus) */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4">
        <div className="text-xs font-bold text-hunter-green mb-2">[ SLEEP & RECOVERY LOG ]</div>
        <p className="text-[10px] text-hunter-gray mb-3">
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
            className="flex-1 accent-hunter-green cursor-pointer"
          />
          <span className="text-xs font-bold text-hunter-green w-12 text-right">
            {sleepHours} hrs
          </span>
        </div>

        <button
          onClick={handleLogSleep}
          disabled={sleepLoggedToday}
          className={`w-full py-2 rounded text-xs font-bold tracking-wider uppercase transition-all ${
            sleepLoggedToday
              ? 'bg-green-950/40 border border-hunter-green text-hunter-green cursor-default'
              : 'bg-green-600/20 hover:bg-green-600/30 border border-green-500 text-green-300'
          }`}
        >
          {sleepLoggedToday ? '✅ SLEEP LOGGED TODAY' : 'RECORD SLEEP RECOVERY'}
        </button>
      </div>
    </div>
  );
}
