import {exists} from 'https://deno.land/std/fs/exists.ts';

import args from 'https://deno.land/x/args@1.0.11/wrapper.ts'
import { EarlyExitFlag, BinaryFlag, PartialOption } from 'https://deno.land/x/args@1.0.11/flag-types.ts'
import { Text } from 'https://deno.land/x/args@1.0.11/value-types.ts'
import { MAIN_COMMAND } from "https://deno.land/x/args@1.0.11/symbols.ts";

import * as commands from './commands/mod.ts';

const parser = args
  .describe('Keep WhatsApp chats in sqlite')
  .with(EarlyExitFlag('help', {
    alias: ['h'],
    describe: 'Show help',
    exit () {
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
    describe: 'Only work on existing databases, refuse to work if given DB does not exist.'
  }));

const res = parser.parse(Deno.args);
if (res.tag !== MAIN_COMMAND) {
  console.error(res.error.toString());
  throw Deno.exit(5);
}

console.log(res);

const db = res.value.db;
if(res.value.existing && !(await exists(db))) {
  console.error(`Database ${db} does not exist.`);
  throw Deno.exit(9);
}

const command = res._[0];
try {
  if(command in commands) {
    const cmdArgs = res._.slice(1);
    const fn = (commands as any)[command];
    await fn(db, cmdArgs);
  } else {
    commands.default(Object.keys(commands));
  }
} catch(e) {
  console.error(`Error running command ${command}`, e);
}
