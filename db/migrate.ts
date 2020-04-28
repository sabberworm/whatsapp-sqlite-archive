import { Connection } from './mod.ts';

const MIGRATIONS = [
	`CREATE TABLE "meta" (
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
	)`
];

export const DB_VERSION = MIGRATIONS.length;

export async function migrate(con : Connection, from : number, to : number = DB_VERSION) {
	const migrations = MIGRATIONS.slice(from, to);
	for(const migration of migrations) {
		con.db.query(migration, []);
	}
	con.db.query('UPDATE meta SET version = ? WHERE 1', [from + migrations.length]);
	await con.save();
}

export function checkVersion(con : Connection) {
	try {
		const res = con.db.query('SELECT version FROM meta LIMIT 1', []);
		const row = res.next();
		res.done();
		return (row.value as number[])[0];
	} catch(e) {
		// Table doesn’t exist yet
		return 0;
	}
}
