import { Connection } from './mod.ts';

const MIGRATIONS = [
	`CREATE TABLE IF NOT EXISTS "meta" (
		"id"	INTEGER PRIMARY KEY,
		"version"	UNSIGNED INT
	)`,
	`CREATE TABLE "attachments" (
		"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
		"data"	BLOB,
		"hash"	TEXT
	)`,
	`CREATE TABLE "chats" (
		"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
		"name"	TEXT,
		"hash"	TEXT
	)`,
	`CREATE TABLE "messages" (
		"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
		"date"	DATETIME,
		"sender"	TEXT,
		"message"	TEXT,
		"attachment"	INTEGER,
		"chat"	INTEGER,
		FOREIGN KEY("chat") REFERENCES "chats"("id"),
		FOREIGN KEY("attachment") REFERENCES "attachments"("id")
	)`,
];

export const DB_VERSION = MIGRATIONS.length;

export async function migrate(con : Connection, from : number, to : number = DB_VERSION) {
	const migrations = MIGRATIONS.slice(from, to);
	for(const migration of migrations) {
		con.db.query(migration, []);
	}
	const newVersion = from + migrations.length;
	con.db.query('INSERT OR REPLACE INTO meta (id, version) VALUES (0, ?)', [newVersion]);
	await con.save();
	return newVersion;
}

export function checkVersion(con : Connection) {
	try {
		const res = con.db.query('SELECT version FROM meta LIMIT 1', []);
		const row = res.next();
		const version = (row.value as number[])[0] || 0;
		res.done();
		return version;
	} catch(e) {
		// Table doesn’t exist yet
		return 0;
	}
}
