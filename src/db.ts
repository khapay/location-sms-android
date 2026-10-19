import * as SQLite from 'expo-sqlite';
import type { Rule } from './types';
const db = SQLite.openDatabaseSync('locationsms.db');
db.execSync(
    'CREATE TABLE IF NOT EXISTS rules (id TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, rule_id TEXT NOT NULL, kind TEXT NOT NULL, result TEXT NOT NULL);',
);
export function listRules(): Rule[] {
    return db
        .getAllSync<{ payload: string }>('SELECT payload FROM rules ORDER BY rowid DESC')
        .map((r) => JSON.parse(r.payload));
}
export function saveRule(r: Rule) {
    db.runSync('INSERT OR REPLACE INTO rules(id,payload) VALUES (?,?)', r.id, JSON.stringify(r));
}
export function deleteRule(id: string) {
    db.runSync('DELETE FROM rules WHERE id=?', id);
}
export function getState(key: string) {
    return (
        db.getFirstSync<{ value: string }>('SELECT value FROM state WHERE key=?', key)?.value ??
        null
    );
}
export function setState(key: string, value: string) {
    db.runSync('INSERT OR REPLACE INTO state(key,value) VALUES (?,?)', key, value);
}
export function logEvent(id: string, kind: string, result: string) {
    db.runSync(
        'INSERT INTO events(at,rule_id,kind,result) VALUES (?,?,?,?)',
        new Date().toISOString(),
        id,
        kind,
        result,
    );
}
export function recentEvents() {
    return db.getAllSync<{ at: string; rule_id: string; kind: string; result: string }>(
        'SELECT at,rule_id,kind,result FROM events ORDER BY id DESC LIMIT 30',
    );
}
