'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = '_sid';
const SESSION_TS_KEY = '_sid_ts';
const SESSION_DURATION = 30 * 60 * 1000; // 30 min

function getOrCreateSession(): string {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    const ts = parseInt(localStorage.getItem(SESSION_TS_KEY) || '0', 10);
    const now = Date.now();

    if (stored && now - ts < SESSION_DURATION) {
      localStorage.setItem(SESSION_TS_KEY, String(now));
      return stored;
    }

    const newId = uuidv4();
    localStorage.setItem(SESSION_KEY, newId);
    localStorage.setItem(SESSION_TS_KEY, String(now));
    return newId;
  } catch {
    return uuidv4();
  }
}

function detectFuente(referrer: string): string {
  if (!referrer) return 'directo';
  const ref = referrer.toLowerCase();
  if (['google', 'bing', 'yahoo', 'yandex', 'baidu'].some(b => ref.includes(b))) return 'buscador';
  if (['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'pinterest', 'reddit'].some(r => ref.includes(r))) return 'social';
  return 'referral';
}

function detectDispositivo(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|iphone|android|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
  if (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(ua)) return 'tablet';
  return 'desktop';
}

export default function TrafficTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>('');

  useEffect(() => {
    // No volver a registrar si la ruta no cambió
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    // No trackear rutas de admin
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

    const sessionId = getOrCreateSession();
    const referrer = document.referrer;

    fetch('/api/trafico/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        url: pathname,
        referrer: referrer || null,
        fuente: detectFuente(referrer),
        dispositivo: detectDispositivo(),
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
