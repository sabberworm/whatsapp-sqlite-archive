import { Command } from 'https://deno.land/x/cliffy@v0.15.0/command/mod.ts';
import type { ITypeInfo } from 'https://deno.land/x/cliffy@v0.15.0/flags/mod.ts';
import type { ITypeHandler } from 'https://deno.land/x/cliffy@v0.15.0/flags/types.ts';
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

const MERGE_TYPE : ITypeHandler<string | undefined> = ({value, name}: ITypeInfo) => {
	if(!value) {
		return;
	}

	if(!(value in MERGE_STRATEGIES)) {
		throw new Error( `Option --${name} must be one of ${Object.keys(MERGE_STRATEGIES).join(', ')}, but got: ${value}`);
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

async function execute(this : (con : Connection, flags : Record<string, any>, ...args : string[]) => Promise<void>, flags : Record<string, any>, ...args : string[]) {
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

