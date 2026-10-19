import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { evaluatePosition } from './engine';
export const TASK = 'location-sms-background-v1';
TaskManager.defineTask(TASK, async ({ data, error }) => {
    if (error) {
        console.warn('Location task', error);
        return;
    }
    const locations = (data as { locations?: Location.LocationObject[] })?.locations || [];
    for (const l of locations)
        await evaluatePosition(l.coords.latitude, l.coords.longitude, new Date(l.timestamp));
});
export async function startTracking() {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') throw new Error('Foreground location permission denied');
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') throw new Error('Background location permission denied');
    if (!(await TaskManager.isTaskRegisteredAsync(TASK))) {
        await Location.startLocationUpdatesAsync(TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 60000,
            distanceInterval: 50,
            foregroundService: {
                notificationTitle: '위치 SMS 알림 실행 중',
                notificationBody: '등록된 지역 알람을 확인하고 있습니다.',
            },
            pausesUpdatesAutomatically: false,
        });
    }
}
export async function stopTracking() {
    if (await TaskManager.isTaskRegisteredAsync(TASK))
        await Location.stopLocationUpdatesAsync(TASK);
}
