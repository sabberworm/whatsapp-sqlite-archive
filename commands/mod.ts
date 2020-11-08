import { Command } from 'https://deno.land/x/cliffy@v0.15.0/command/mod.ts';
import { IFlagArgument, IFlagOptions, IFlags, ITypeHandler } from 'https://deno.land/x/cliffy@v0.15.0/flags/mod.ts';
import { checkVersion, DB_VERSION, migrate } from '../db/migrate.ts';
import { Connection, openConnection } from '../db/mod.ts';
import { load } from './import.ts';

const MERGE_STRATEGIES = {
	replace: {
		describe: 'Deletes all messages in the existing chat before importing',
	},
	amend: {
		describe: 'Imports all messages that don’t already exist. Uniqueness is determined by time stamp + sender',
	},
	add: {
		describe: 'Imports all messages, including duplicates',
	},
};

const MERGE_TYPE : ITypeHandler<string | undefined> = (option : IFlagOptions, arg : IFlagArgument, value : string | false) => {
	console.log('ITypeHandler', option, arg, value);
	if(!value) {
		return;
	}

	if(!(value in MERGE_STRATEGIES)) {
		throw new Error( `Option --${option.name} must be one of ${Object.keys(MERGE_STRATEGIES).join(', ')}, but got: ${value}`);
	}

	return value;
};

declare global {
	interface Command {
		enrich() : void;
	}
}

export const SUBCOMMANDS : Record<string, Command> = {
	load: new Command()
		.description('Load a backup into the DB')
		.arguments('<import-file:string> [chat-name:string]')
		.option('-F --force', 'Set to import a chat that already exists.')
		.option('-m --merge-strategy [type:merge-strategy]', `This option determines how messages are imported into a chat that already exists when --force is set. Available values are ${Object.keys(MERGE_STRATEGIES).map(name => `${name} (${(MERGE_STRATEGIES as any)[name].describe})`).join(', ')}.`, {depends: ['force']})
		.type('merge-strategy', MERGE_TYPE)
		.action(execute.bind(load)),
	list: new Command()
};

// Add default options to all commands
for(const command of Object.values(SUBCOMMANDS)) {
	command
		.version('0.1.0')
		.option('-f --db-file <file:string>', 'The database file to use.', {default: './whatsapp.db', required: true})
		.option('-e --existing-only', 'Only work on existing databases, refuse to work if given DB does not exist or does not have a known schema.')
		.option('-B --backupless', 'Do not create a backup when migrating to a new schema version.');
}

async function execute(this : (con : Connection, flags : IFlags, ...args : string[]) => Promise<void>, flags : IFlags, ...args : string[]) {
	const db = flags.dbFile as string;
	const con = openConnection(db);
	const dbVersion = checkVersion(con);
	
	if(dbVersion === 0 && flags.existingOnly) {
		console.error(`Database ${db} does not exist.`);
		throw Deno.exit(9);
	}
	
	if(dbVersion < DB_VERSION) {
		// Migration necessary
		if(!flags.backupless && dbVersion > 0) {
			// Save pre-migration state as backup
			await con.saveAs(`${db}~`);
		}
		const newVersion = await migrate(con, dbVersion);
		if(dbVersion === 0) {
			console.debug(`Successfully initialized ${db} (version ${newVersion})`);
		} else {
			console.debug(`Migrated ${db} from version ${dbVersion} to ${newVersion}`);
		}
	}
	
	await this(con, flags, ...args);
}

