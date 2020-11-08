import { Command } from 'https://deno.land/x/cliffy@v0.15.0/command/mod.ts';
import { SUBCOMMANDS } from './commands/mod.ts';
import { Connection } from './db/mod.ts';

let action : ((con : Connection) => Promise<void>) | undefined = undefined;
export function configureAction(newAction : (con : Connection) => Promise<void>) {
	action = newAction;
}

let command = new Command()
	.description('Keep WhatsApp chats in sqlite')
	.version('0.1.0')
	.option('-f --db-file <file:string>', 'The database file to use.', {default: './whatsapp.db', required: true, global: true})
	.option('-e --existing-only', 'Only work on existing databases, refuse to work if given DB does not exist or does not have a known schema.', {global: true})
	.option('-B --backupless', 'Do not create a backup when migrating to a new schema version.', {global: true});

for(const subCommand in SUBCOMMANDS) {
	command = command.command(subCommand, SUBCOMMANDS[subCommand]);
}

const options = await command.parse(Deno.args);
