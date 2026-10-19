export type Area = { latitude: number; longitude: number; radius: number };
export type Rule = {
    id: string;
    name: string;
    enabled: boolean;
    arrival: boolean;
    scheduled: boolean;
    days: number[];
    time: string;
    recipient: string;
    message: string;
    areaA: Area;
    areaB: Area;
    cooldownMinutes: number;
};
export const newRule = (): Rule => ({
    id: makeId(),
    name: '새 설정',
    enabled: false,
    arrival: true,
    scheduled: false,
    days: [0, 1, 2, 3, 4, 5, 6],
    time: '09:00',
    recipient: '',
    message: 'B지역에 도착했습니다.',
    areaA: { latitude: 37.5665, longitude: 126.978, radius: 200 },
    areaB: { latitude: 37.57, longitude: 126.99, radius: 200 },
    cooldownMinutes: 30,
});
export const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
