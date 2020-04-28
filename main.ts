import { BinaryFlag, EarlyExitFlag, PartialOption } from 'https://deno.land/x/args@1.0.11/flag-types.ts';
import { MAIN_COMMAND } from "https://deno.land/x/args@1.0.11/symbols.ts";
import { Text } from 'https://deno.land/x/args@1.0.11/value-types.ts';
import args from 'https://deno.land/x/args@1.0.11/wrapper.ts';
import * as commands from './commands/mod.ts';
import { checkVersion, DB_VERSION, migrate } from './db/migrate.ts';
import { openConnection } from './db/mod.ts';


const parser = args
	.describe('Keep WhatsApp chats in sqlite')
	.with(EarlyExitFlag('help', {
		alias: ['h'],
		describe: 'Show help',
		exit () {
			console.log(parser.sub);
			console.log(parser.help())
			return Deno.exit()
		}
	}))
	.with(PartialOption('db', {
		alias: ['f'],
		type: Text,
		default: './whatsapp.db',
		describe: 'The database file to use.'
	}))
	.with(BinaryFlag('existing', {
		alias: ['e'],
		describe: 'Only work on existing databases, refuse to work if given DB does not exist or does not have a known schema.'
	}))
	.with(BinaryFlag('backupless', {
		alias: ['B'],
		describe: 'Do not create a backup when migrating to a new schema version.'
	}));

const res = parser.parse(Deno.args);
if (res.tag !== MAIN_COMMAND) {
	console.error(res.error.toString());
	throw Deno.exit(5);
}

const db = res.value.db;
const con = await openConnection(db);
const dbVersion = checkVersion(con);

if(dbVersion === 0 && res.value.existing) {
	console.error(`Database ${db} does not exist.`);
	throw Deno.exit(9);
}

if(dbVersion < DB_VERSION) {
	// Migration necessary
	if(!res.value.backupless && dbVersion > 0) {
		// Save pre-migration state as backup
		await con.save(`${db}~`);
	}
	const newVersion = await migrate(con, dbVersion);
	if(dbVersion === 0) {
		console.debug(`Successfully initialized ${db} (version ${newVersion})`);
	} else {
		console.debug(`Migrated ${db} from version ${dbVersion} to ${newVersion}`);
	}
}

const command = res._[0];
try {
	if(command in commands) {
		const cmdArgs = res._.slice(1);
		const fn = (commands as any)[command];
		await fn(con, cmdArgs);
	} else {
		commands.default(Object.keys(commands));
	}
} catch(e) {
	console.error(`Error running command ${command}`, e);
}
