import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import { listRules, saveRule, deleteRule, recentEvents } from './db';
import { newRule, makeId, Rule, Area } from './types';
import { startTracking, stopTracking } from './tasks';
const days = ['월', '화', '수', '목', '금', '토', '일'];
const line = {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginVertical: 4,
} as const;
export default function App() {
    const [rules, setRules] = useState<Rule[]>([]),
        [draft, setDraft] = useState<Rule | null>(null),
        [events, setEvents] = useState<ReturnType<typeof recentEvents>>([]);
    const refresh = () => {
        setRules(listRules());
        setEvents(recentEvents());
    };
    useEffect(() => {
        refresh();
    }, []);
    const change = (patch: Partial<Rule>) => setDraft((x) => (x ? { ...x, ...patch } : null));
    const field = (
        label: string,
        value: string,
        onChange: (s: string) => void,
        keyboardType: 'default' | 'numeric' | 'phone-pad' = 'default',
    ) => (
        <View>
            <Text>{label}</Text>
            <TextInput
                style={line}
                value={value}
                onChangeText={onChange}
                keyboardType={keyboardType}
            />
        </View>
    );
    const areaField = (label: string, area: Area, key: 'areaA' | 'areaB') => (
        <View style={{ marginVertical: 6 }}>
            <Text style={{ fontWeight: 'bold' }}>{label}</Text>
            {(['latitude', 'longitude', 'radius'] as const).map((k) => (
                <View key={k}>
                    {field(
                        k,
                        String(area[k]),
                        (v) => change({ [key]: { ...area, [k]: Number(v) } } as Partial<Rule>),
                        'numeric',
                    )}
                </View>
            ))}
        </View>
    );
    const valid = (r: Rule) => {
        if (!r.name.trim() || !/^01\d{8,9}$/.test(r.recipient.replace(/-/g, '')))
            return '설정명 또는 수신번호를 확인하세요.';
        if (!r.arrival && !r.scheduled) return '알람 유형을 하나 이상 선택하세요.';
        if (!r.days.length) return '요일을 선택하세요.';
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) return '시간 형식은 HH:mm입니다.';
        for (const a of [r.areaA, r.areaB])
            if (
                !Number.isFinite(a.latitude) ||
                !Number.isFinite(a.longitude) ||
                Math.abs(a.latitude) > 90 ||
                Math.abs(a.longitude) > 180 ||
                !Number.isFinite(a.radius) ||
                a.radius < 50 ||
                a.radius > 10000
            )
                return '위도, 경도 또는 반경(50~10000m)을 확인하세요.';
        if (!r.message.trim()) return '문자 내용을 입력하세요.';
        return null;
    };
    const persist = (r: Rule) => {
        const err = valid(r);
        if (err) {
            Alert.alert('입력 오류', err);
            return;
        }
        saveRule({ ...r, recipient: r.recipient.replace(/-/g, '') });
        setDraft(null);
        refresh();
    };
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#f8fafc' }}
            contentContainerStyle={{ padding: 18, gap: 12 }}
        >
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>위치 기반 SMS 알람</Text>
            <Text>
                설정은 기기 SQLite에 저장됩니다. 자동 SMS는 Android 개발 빌드에서만 동작합니다.
            </Text>
            <Button
                title="위치 감시 시작 (권한 요청)"
                onPress={async () => {
                    try {
                        if (Platform.OS === 'android') {
                            const s = await PermissionsAndroid.request(
                                PermissionsAndroid.PERMISSIONS.SEND_SMS,
                            );
                            if (s !== 'granted') throw new Error('SMS permission denied');
                        }
                        await startTracking();
                        Alert.alert('완료', '백그라운드 위치 감시가 시작되었습니다.');
                    } catch (e) {
                        Alert.alert('오류', String(e));
                    }
                }}
            />
            <Button
                title="위치 감시 중지"
                onPress={async () => {
                    await stopTracking();
                    Alert.alert('중지', '위치 감시가 중지되었습니다.');
                }}
            />
            <Button title="새 설정 추가" onPress={() => setDraft(newRule())} />
            {rules.map((r) => (
                <View
                    key={r.id}
                    style={{ backgroundColor: 'white', padding: 14, borderRadius: 10, gap: 6 }}
                >
                    <Text style={{ fontSize: 17, fontWeight: 'bold' }}>{r.name}</Text>
                    <Text>
                        {r.arrival ? '진입 ' : ''}
                        {r.scheduled ? `예약 ${r.time}` : ''} ·{' '}
                        {r.days.map((x) => days[x]).join(', ')}
                    </Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text>활성화</Text>
                        <Switch
                            value={r.enabled}
                            onValueChange={(v) => {
                                saveRule({ ...r, enabled: v });
                                refresh();
                            }}
                        />
                    </View>
                    <Button title="수정" onPress={() => setDraft({ ...r })} />
                    <Button
                        title="복사해서 새로 만들기"
                        onPress={() =>
                            setDraft({
                                ...r,
                                id: makeId(),
                                name: r.name + ' - 복사본',
                                enabled: false,
                                days: [...r.days],
                                areaA: { ...r.areaA },
                                areaB: { ...r.areaB },
                            })
                        }
                    />
                    <Button
                        title="삭제"
                        color="#b91c1c"
                        onPress={() =>
                            Alert.alert('삭제 확인', r.name, [
                                { text: '취소' },
                                {
                                    text: '삭제',
                                    style: 'destructive',
                                    onPress: () => {
                                        deleteRule(r.id);
                                        refresh();
                                    },
                                },
                            ])
                        }
                    />
                </View>
            ))}
            {draft && (
                <View style={{ backgroundColor: '#e2e8f0', padding: 14, borderRadius: 10, gap: 8 }}>
                    <Text style={{ fontSize: 19, fontWeight: 'bold' }}>설정 편집</Text>
                    {field('설정명', draft.name, (v) => change({ name: v }))}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text>위치 진입 SMS (A → B)</Text>
                        <Switch
                            value={draft.arrival}
                            onValueChange={(v) => change({ arrival: v })}
                        />
                    </View>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text>B지역 지정 시간 SMS</Text>
                        <Switch
                            value={draft.scheduled}
                            onValueChange={(v) => change({ scheduled: v })}
                        />
                    </View>
                    <Text>요일 (다중 선택)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {days.map((d, i) => (
                            <Text
                                key={d}
                                onPress={() =>
                                    change({
                                        days: draft.days.includes(i)
                                            ? draft.days.filter((x) => x !== i)
                                            : [...draft.days, i].sort(),
                                    })
                                }
                                style={{
                                    padding: 10,
                                    backgroundColor: draft.days.includes(i) ? '#93c5fd' : 'white',
                                    borderRadius: 6,
                                }}
                            >
                                {d}
                            </Text>
                        ))}
                    </View>
                    {field('예약 시간 (HH:mm)', draft.time, (v) => change({ time: v }))}
                    {field(
                        'SMS 수신번호',
                        draft.recipient,
                        (v) => change({ recipient: v }),
                        'phone-pad',
                    )}
                    {field('SMS 내용', draft.message, (v) => change({ message: v }))}
                    {field(
                        '중복 방지 시간 (분)',
                        String(draft.cooldownMinutes),
                        (v) => change({ cooldownMinutes: Number(v) }),
                        'numeric',
                    )}
                    {areaField('A지역', draft.areaA, 'areaA')}
                    {areaField('B지역', draft.areaB, 'areaB')}
                    <Button title="설정 저장" onPress={() => persist(draft)} />
                    <Button title="취소" onPress={() => setDraft(null)} />
                </View>
            )}
            <Button title="발송 기록 새로고침" onPress={refresh} />
            {events.map((e, i) => (
                <Text key={i} style={{ fontSize: 12 }}>
                    {e.at} · {e.kind} · {e.result}
                </Text>
            ))}
        </ScrollView>
    );
}
