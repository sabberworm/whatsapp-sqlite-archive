import { Command, IFlagsParseResult } from 'https://deno.land/x/cliffy@v0.5.1/command.ts';
import { IFlagArgument, IFlagOptions, ITypeHandler } from 'https://deno.land/x/cliffy@v0.5.1/flags.ts';
import { configureAction } from '../main.ts';
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

export const SUBCOMMANDS : Record<string, Command> = {
	load: new Command()
		.description('Load a backup into the DB')
		.arguments('<import-file:string> [chat-name:string]')
		.option('-F --force', 'Set to import a chat that already exists.')
		.option('-m --merge-strategy [type:merge-strategy]', `This option determines how messages are imported into a chat that already exists when --force is set. Available values are ${Object.keys(MERGE_STRATEGIES).map(name => `${name} (${(MERGE_STRATEGIES as any)[name].describe})`).join(', ')}.`, {depends: ['force']})
		.type('merge-strategy', MERGE_TYPE)
		.action((options : IFlagsParseResult) => {
			console.log('action', options)
			configureAction(load.bind(null, options));
		}),
	list: new Command()
};

