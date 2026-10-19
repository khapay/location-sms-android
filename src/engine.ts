import { NativeModules, Platform } from 'react-native';
import type { Rule, Area } from './types';
import { listRules, getState, setState, logEvent } from './db';
import * as Location from 'expo-location';
const sms = NativeModules.LocationSms;
const meters = (lat: number, lon: number, a: Area) => {
    const R = 6371000,
        dLat = ((a.latitude - lat) * Math.PI) / 180,
        dLon = ((a.longitude - lon) * Math.PI) / 180;
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
            Math.cos((a.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const region = (lat: number, lon: number, r: Rule) => {
    const da = meters(lat, lon, r.areaA),
        db = meters(lat, lon, r.areaB);
    if (db <= r.areaB.radius) return 'B';
    if (da <= r.areaA.radius) return 'A';
    return 'OUT';
};
const dayIndex = (d: Date) => (d.getDay() + 6) % 7;
async function send(r: Rule, kind: string, now: Date) {
    const key = `sent:${r.id}:${kind}`;
    const last = Number(getState(key) || 0);
    if (now.getTime() - last < r.cooldownMinutes * 60000) return;
    // Mark before sending to avoid duplicate SMS on concurrent callbacks. A failed send remains logged.
    setState(key, String(now.getTime()));
    try {
        if (Platform.OS !== 'android' || !sms)
            throw new Error('Android native SMS module unavailable');
        await sms.send(r.recipient, r.message);
        logEvent(r.id, kind, 'sent');
    } catch (e) {
        logEvent(r.id, kind, `failed: ${String(e)}`);
    }
}
export async function evaluatePosition(lat: number, lon: number, now = new Date()) {
    for (const r of listRules().filter((x) => x.enabled)) {
        const current = region(lat, lon, r),
            key = `region:${r.id}`,
            prev = getState(key);
        // OUT is recorded too: only a previously observed A followed directly by B counts.
        if (current !== prev) {
            setState(key, current);
            if (r.arrival && prev === 'A' && current === 'B' && r.days.includes(dayIndex(now)))
                await send(r, 'arrival', now);
        }
        if (r.scheduled && current === 'B' && r.days.includes(dayIndex(now))) {
            const [h, m] = r.time.split(':').map(Number);
            const target = new Date(now);
            target.setHours(h, m, 0, 0);
            const today = `schedule:${r.id}:${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            // A location callback arriving within 10 minutes after scheduled time triggers at most once/day.
            if (
                now.getTime() >= target.getTime() &&
                now.getTime() - target.getTime() <= 600000 &&
                !getState(today)
            ) {
                setState(today, '1');
                await send(r, 'scheduled', now);
            }
        }
    }
}
export async function evaluateLatest() {
    const loc = await Location.getLastKnownPositionAsync({ maxAge: 120000 });
    if (loc) await evaluatePosition(loc.coords.latitude, loc.coords.longitude);
}
