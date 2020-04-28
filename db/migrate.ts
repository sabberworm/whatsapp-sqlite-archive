import { Connection } from './mod.ts';

const MIGRATIONS = [
	`CREATE TABLE IF NOT EXISTS "meta" (
		"id"	INTEGER PRIMARY KEY,
		"version"	UNSIGNED INT
	)`,
	`CREATE TABLE "files" (
		"hash"	TEXT PRIMARY KEY,
		"data"	BLOB
	)`,
	`CREATE TABLE "attachments" (
		"id"	INTEGER PRIMARY KEY,
		"file"	TEXT,
		"name"	TEXT,
		FOREIGN KEY("file") REFERENCES "files"("hash")
	)`,
	`CREATE TABLE "chats" (
		"id"	INTEGER PRIMARY KEY,
		"name"	TEXT UNIQUE
	)`,
	`CREATE TABLE "messages" (
		"id"	INTEGER PRIMARY KEY,
		"date"	DATETIME NOT NULL,
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
		return con.singleValue('SELECT version FROM meta LIMIT 1') as number || 0;
	} catch(e) {
		// Table doesn’t exist yet
		return 0;
	}
}
