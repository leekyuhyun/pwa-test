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
  const [seconds, setSeconds] = useState<number>(5); // 테스트를 위해 기본 5초로 설정
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

  // 알림 권한 요청 및 구독
  const subscribeToPush = async () => {
    try {
      // 1. 브라우저가 알림을 지원하는지 체크 (아이폰 사파리 탭 방어)
      if (!('Notification' in window)) {
        alert(
          "알림을 지원하지 않는 브라우저입니다. 아이폰이라면 반드시 '홈 화면에 추가' 후 앱으로 실행해주세요!",
        );
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // 2. 환경변수가 제대로 들어왔는지 체크
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          alert(
            '오류: NEXT_PUBLIC_VAPID_PUBLIC_KEY 환경변수가 비어있습니다. Vercel 설정을 확인해주세요.',
          );
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });

        setSubscription(sub);
        alert('알림이 설정되었습니다! ✨');
      } else {
        alert('알림 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`구독 중 에러가 발생했습니다: ${error.message}`);
      } else {
        alert('구독 중 알 수 없는 에러가 발생했습니다.');
      }
      console.error(error);
    }
  };

  // 타이머 시작
  const startTimer = () => {
    if (!subscription) {
      alert('먼저 알림을 구독해주세요!');
      return;
    }

    setIsTimerRunning(true);
    let timeLeft = seconds;

    // 1. 화면 시각용 타이머 (화면이 꺼지면 멈추지만 상관없음)
    const interval = setInterval(() => {
      timeLeft -= 1;
      setSeconds(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
        setIsTimerRunning(false);
      }
    }, 1000);

    // ⭐️ 2. 시작과 동시에 백엔드로 푸시 알림 예약 (실제 알림 역할)
    triggerPush(seconds);
  };

  // 백엔드로 예약 요청 전송
  const triggerPush = async (delaySeconds: number) => {
    try {
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          title: '⏰ 타이머 종료!',
          body: '설정한 시간이 모두 지나갔습니다.',
          delay: delaySeconds, // 대기할 시간을 API로 함께 넘김
        }),
      });
    } catch (error) {
      console.error('API 호출 에러:', error);
    }
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
