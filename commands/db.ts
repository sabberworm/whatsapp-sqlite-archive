import { checkVersion, DB_VERSION, migrate as migrateDB } from '../db/migrate.ts';
import { openConnection } from '../db/mod.ts';

export async function init(db : string) {
	const con = await openConnection(db);
	if(checkVersion(con) > 0) {
		console.error(`DB ${db} already initialized`);
		throw Deno.exit(9);
	}
	const newVersion = await migrateDB(con, 0);
	console.log(`Successfully initialized ${db} (version ${newVersion})`);
}

export async function migrate(db : string) {
	const con = await openConnection(db);
	const version = checkVersion(con);
	if(version === DB_VERSION) {
		console.error(`DB ${db} schema already at latest version ${DB_VERSION}`);
		throw Deno.exit(9);
	}
	const newVersion = await migrateDB(con, version);
	console.log(`Migrated ${db} from version ${version} to ${newVersion}`);
}
