import { Command } from 'https://deno.land/x/cliffy@v0.15.0/command/mod.ts';
import { SUBCOMMANDS } from './commands/mod.ts';
import { Connection } from './db/mod.ts';

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
