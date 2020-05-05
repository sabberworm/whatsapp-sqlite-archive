import { Command } from 'https://deno.land/x/cliffy@v0.5.1/command.ts';
import { SUBCOMMANDS } from './commands/mod.ts';
import { checkVersion, DB_VERSION, migrate } from './db/migrate.ts';
import { Connection, openConnection } from './db/mod.ts';

let action : ((con : Connection) => Promise<void>) | undefined = undefined;
export function configureAction(newAction : (con : Connection) => Promise<void>) {
	action = newAction;
}

let command = new Command()
	.version('0.1.0')
	.description('Keep WhatsApp chats in sqlite')
	.option('-f --db-file <file:string>', 'The database file to use.', {default: './whatsapp.db', required: true})
	.option('-e --existing-only', 'Only work on existing databases, refuse to work if given DB does not exist or does not have a known schema.')
	.option('-B --backupless', 'Do not create a backup when migrating to a new schema version.');

for(const subCommand in SUBCOMMANDS) {
	command = command.command(subCommand, SUBCOMMANDS[subCommand]);
}

const options = await command.parse(Deno.args);

console.log('options', options, action);
// throw Deno.exit();

const db = options.options.dbFile as string;
const con = await openConnection(db);
const dbVersion = checkVersion(con);

if(dbVersion === 0 && options.options['existing-only']) {
	console.error(`Database ${db} does not exist.`);
	throw Deno.exit(9);
}

if(dbVersion < DB_VERSION) {
	// Migration necessary
	if(!options.options.backupless && dbVersion > 0) {
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

if(action) {
	await action(con);
}

// const command = res._[0];
// try {
// 	if(command in commands) {
// 		const cmdArgs = res._.slice(1);
// 		const fn = (commands as any)[command];
// 		await fn(con, cmdArgs);
// 	} else {
// 		commands.default(Object.keys(commands));
// 	}
// } catch(e) {
// 	console.error(`Error running command ${command}`, e);
// }
