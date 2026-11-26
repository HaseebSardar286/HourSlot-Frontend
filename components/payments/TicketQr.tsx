'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** QR of a short text: a booking code for the counter, or payment details to scan. */
export default function TicketQr({ code, size = 168, alt }: { code: string; size?: number; alt?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(code, { margin: 1, width: size * 2, color: { dark: '#0f1b33', light: '#ffffff' } })
      .then((url) => { if (alive) setSrc(url); })
      .catch(() => { if (alive) setSrc(null); });
    return () => { alive = false; };
  }, [code, size]);
  // eslint-disable-next-line @next/next/no-img-element -- generated data URL
  return src ? <img src={src} alt={alt ?? `Booking code ${code}`} width={size} height={size} /> : <div style={{ width: size, height: size }} />;
}
