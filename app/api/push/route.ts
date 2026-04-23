import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(req: Request) {
  try {
    // VAPID 키 세팅 (API 호출 시마다 세팅)
    webpush.setVapidDetails(
      'mailto:test@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    // 프론트에서 보내는 정보(구독 정보, 제목, 내용, ⭐️대기 시간)를 받음
    const { subscription, title, body, delay } = await req.json();

    // ⭐️ 서버에서 딜레이(delay) 시간만큼 대기
    if (delay && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    }

    // 대기 시간이 끝나면 푸시 알림 발송
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push Error:', error);
    return NextResponse.json({ error: 'Push 발송 실패' }, { status: 500 });
  }
}
