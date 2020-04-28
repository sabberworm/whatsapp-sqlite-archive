import { openConnection } from '../db/mod.ts';
import { checkVersion, migrate as migrateDB, DB_VERSION } from '../db/migrate.ts';

export async function init(db : string) {
	const con = await openConnection(db);
	if(checkVersion(con) > 0) {
		console.error(`DB ${db} already initialized`);
		throw Deno.exit(9);
	}
	await migrateDB(con, 0);
}

export async function migrate(db : string) {
	const con = await openConnection(db);
	const version = checkVersion(con);
	if(version === DB_VERSION) {
		console.error(`DB ${db} schema already at latest version`);
		throw Deno.exit(9);
	}
	await migrateDB(con, version);
}
