import { Command } from 'https://deno.land/x/cliffy@v0.5.1/command.ts';
import { SUBCOMMANDS } from './commands/mod.ts';
import { checkVersion, DB_VERSION, migrate } from './db/migrate.ts';
import { Connection, openConnection } from './db/mod.ts';

let action : ((con : Connection) => Promise<void>) | undefined = undefined;
export function configureAction(newAction : (con : Connection) => Promise<void>) {
	action = newAction;
}

let command = new Command()
	.description('Keep WhatsApp chats in sqlite')

for(const subCommand in SUBCOMMANDS) {
	command = command.command(subCommand, SUBCOMMANDS[subCommand]);
}

const options = await command.parse(Deno.args);
