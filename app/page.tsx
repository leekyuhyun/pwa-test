'use client';

import { useState, useEffect } from 'react';

// VAPID 공개키 변환 유틸리티
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function Home() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [seconds, setSeconds] = useState<number>(10);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    // 마운트 시 권한 확인 및 Service Worker 등록
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      setSubscription(sub);
      alert('알림이 설정되었습니다!');
    } else {
      alert('알림 권한을 허용해주세요.');
    }
  };

  const startTimer = () => {
    if (!subscription) {
      alert('먼저 알림을 구독해주세요!');
      return;
    }

    setIsTimerRunning(true);
    let timeLeft = seconds;

    const interval = setInterval(() => {
      timeLeft -= 1;
      setSeconds(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
        setIsTimerRunning(false);
        triggerPush();
      }
    }, 1000);
  };

  const triggerPush = async () => {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        title: '⏰ 타이머 종료!',
        body: '설정한 시간이 모두 지나갔습니다.',
      }),
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-black">
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold">PWA 알람 시계</h1>

        {!subscription ? (
          <button
            onClick={subscribeToPush}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            알림 권한 켜기
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-green-500 font-semibold">알림 수신 대기 중 ✨</p>

            <div className="text-6xl font-mono mb-4">
              {Math.floor(seconds / 60)
                .toString()
                .padStart(2, '0')}
              :{(seconds % 60).toString().padStart(2, '0')}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                className="border border-gray-300 rounded px-2 py-1 w-20 text-center"
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                disabled={isTimerRunning}
              />
              <span className="self-center">초</span>
            </div>

            <button
              onClick={startTimer}
              disabled={isTimerRunning}
              className="w-full bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 disabled:bg-gray-400 transition"
            >
              {isTimerRunning ? '타이머 동작 중...' : '타이머 시작'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
