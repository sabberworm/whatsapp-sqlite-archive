import { Connection } from './mod.ts';

const MIGRATIONS = [
	`CREATE TABLE meta (version UNSIGNED INT)`,
];

export const DB_VERSION = MIGRATIONS.length;

export async function migrate(con : Connection, from : number, to : number = DB_VERSION) {
	const migrations = MIGRATIONS.slice(from, to);
	for(const migration of migrations) {
		con.db.query(migration, []);
	}
	con.db.query('INSERT OR REPLACE INTO meta (version) VALUES (?)', [to]);
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
	}

	return 0;
}
