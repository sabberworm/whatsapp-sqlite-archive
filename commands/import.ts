import { resolve } from 'https://deno.land/std@v0.41.0/path/posix.ts';
import { BinaryFlag, EarlyExitFlag, Option, PartialOption } from 'https://deno.land/x/args@1.0.11/flag-types.ts';
import { MAIN_COMMAND } from "https://deno.land/x/args@1.0.11/symbols.ts";
import { Choice, Text } from 'https://deno.land/x/args@1.0.11/value-types.ts';
import args from 'https://deno.land/x/args@1.0.11/wrapper.ts';
import { Connection } from '../db/mod.ts';
import { ArchiveProvider, ExtractedArchive, ZippedArchive } from '../helpers/archive.ts';

const MESSAGE_START = /^\[(\d{2}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2})\] (([^:]+): )?/;

interface Message {
	date : string;
	sender : string | undefined;
	contents : string;
}

function storeMessage(message : Message | undefined, chatId : number, con : Connection) {
	if(!message) {
		return;
	}
	con.db.query(
		'INSERT INTO messages (date, sender, message, chat) VALUES (?, ?, ?, ?)',
		[message.date, message.sender, message.contents, chatId]
	);
}

export async function load(con : Connection, argv : string[]) {
	const parser = args
		.describe('Load a backup into the DB')
		.with(EarlyExitFlag('help', {
			alias: ['h'],
			describe: 'Show help',
			exit () {
				console.log(parser.help())
				return Deno.exit()
			}
		}))
		.with(PartialOption('path', {
			alias: ['p'],
			type: Text,
			default: '.',
			describe: 'The path of the export. Can either be a folder containing _chat.txt, _chat.txt itself or a zip file.'
		}))
		.with(Option('name', {
			alias: ['n'],
			type: Text,
			describe: 'The name of the chat to import.'
		}))
		.with(BinaryFlag('force', {
			alias: ['f'],
			describe: 'Set to import a chat that already exists.'
		}))
		.with(PartialOption('merge-stategy', {
			alias: ['m'],
			type: Choice(
				{
					value: 'replace',
					describe: 'Deletes all messages in the existing chat before importing.'
				},
				{
					value: 'amend',
					describe: 'Imports all messages that don’t already exist. Uniqueness is determined by time stamp + sender.'
				},
				{
					value: 'add',
					describe: 'Imports all messages, including duplicates.'
				}
			),
			default: 'amend',
			describe: 'This option determines how messages are imported into a chat that already exists when --force is set.'
		}));

	const res = parser.parse(argv);
	if (res.tag !== MAIN_COMMAND) {
		console.error(res.error.toString());
		throw Deno.exit(5);
	}

	const file = res.value.path;
	let archiveProvider : ArchiveProvider | undefined;
	const stat = await Deno.stat(file);
	if(stat.isDirectory) {
		archiveProvider = new ExtractedArchive(file);
	} else if(file.endsWith('.txt')) {
		archiveProvider = new ExtractedArchive(resolve(file, '..'), file);
	} else if(file.endsWith('.zip')) {
		archiveProvider = new ZippedArchive(file);
	} else {
		console.error(`Not sure how to handle archive ${file}`);
		throw Deno.exit(9);
	}

	const name = res.value.name;
	let chatId = con.singleValue('SELECT id FROM chats WHERE name = ?', [name]);
	let doAmend = false;
	if(chatId !== undefined && !res.value.force) {
		console.error(`Chat ${name} already exists. Use --force to amend/replace`);
		throw Deno.exit(9);
	}
	if(chatId === undefined) {
		con.db.query('INSERT INTO chats (name) VALUES (?)', [name]);
		chatId = con.singleValue('SELECT last_insert_rowid() FROM chats');
	} else {
		doAmend = res.value["merge-stategy"] === 'amend';
		if(res.value["merge-stategy"] === 'replace') {
			// Delete all existing chats
			con.db.query('DELETE FROM messages WHERE chat = ?', [chatId]);
		}
	}

	const chat = await archiveProvider.chat();

	const lines = chat
		// Strip text direction markers
		.replace(/(\u200E|\u200F)/g, '')
		// Split on newlines
		.split(/\r?\n/);
	let currentMessage : Message | undefined;
	for(const line of lines) {
		const match = line.match(MESSAGE_START);
		if(match) {
			storeMessage(currentMessage, chatId, con);
			currentMessage = {
				date: match[1],
				sender: match[3],
				contents: line.replace(MESSAGE_START, ''),
			};
			continue;
		}
		if(!currentMessage) {
			if(line) {
				console.warn(`Don’t know what to do with ${line}`);
			}
			continue;
		}
		currentMessage.contents += '\n' + line;
	}
	storeMessage(currentMessage, chatId, con);

	con.save();
}