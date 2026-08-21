import type { AvailableSlot } from './types';

export type { AvailableSlot };

export function parseSlots(raw: unknown): AvailableSlot[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const slots: AvailableSlot[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      slots.push({ startTime: item.length >= 5 ? item.slice(0, 5) : item });
      continue;
    }
    if (item && typeof item === 'object' && 'startTime' in item) {
      const startTime = String((item as { startTime: unknown }).startTime ?? '');
      if (!startTime) continue;
      const slot = item as AvailableSlot;
      slots.push({
        ...slot,
        startTime: startTime.length >= 5 ? startTime.slice(0, 5) : startTime,
      });
    }
  }
  return slots;
}

export function slotTimes(slots: AvailableSlot[]): string[] {
  return slots.map((slot) => slot.startTime);
}
