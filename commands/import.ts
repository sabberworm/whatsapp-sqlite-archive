import { encode as base64 } from 'https://deno.land/std@0.76.0/encoding/base64.ts';
import { Message as Sha256Message, Sha256 } from 'https://deno.land/std@0.76.0/hash/sha256.ts';
import { basename, normalize, resolve } from 'https://deno.land/std@0.76.0/path/posix.ts';
import { Connection } from '../db/mod.ts';
import { ArchiveProvider, ExtractedArchive, ZippedArchive } from '../helpers/archive.ts';

function sha256(message : Sha256Message) {
	const sha = new Sha256();
	sha.update(message);
	return base64(sha.arrayBuffer()).substring(0, 32);
}


const MESSAGE_START = /^\[(\d{2}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2})\] (([^:]+): )?/;

const ATTACHMENT = /<attached: ([^>]+)>/;
interface Message {
	date : string;
	sender : string | undefined;
	contents : string;
}

async function storeMessages(
	archive : ArchiveProvider,
	chatId : number,
	con : Connection,
	doAmend = false,
) {
	const chat = await archive.chat();

	const lines = chat
		// Strip text direction markers
		.replace(/(\u200E|\u200F)/g, '')
		// Split on newlines
		.split(/\r?\n/);

	let count = 0;
	let currentMessage : Message | undefined;
	for(const line of lines) {
		const match = line.match(MESSAGE_START);
		if(match) {
			count += await storeMessage(archive, currentMessage, chatId, con, doAmend);
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
	count += await storeMessage(archive, currentMessage, chatId, con, doAmend);

	return count;
}

function countExisting(message : Message, chatId : number, con : Connection) : number {
	if(message.sender === undefined) {
		return con.singleValue(
			'SELECT COUNT(*) FROM messages WHERE chat = ? AND date = ? AND sender IS NULL',
			[chatId, message.date],
		);
	}
	return con.singleValue(
		'SELECT COUNT(*) FROM messages WHERE chat = ? AND date = ? AND sender = ?',
		[chatId, message.date, message.sender],
	);
}

async function storeMessage(
	archive : ArchiveProvider,
	message : Message | undefined,
	chatId : number,
	con : Connection,
	doAmend = false,
) {
	if(!message) {
		return 0;
	}
	if(doAmend) {
		const existing = countExisting(message, chatId, con);
		if(existing > 0) {
			return 0;
		}
		console.log('not exists', existing, message);
	}
	const attachment = await extractAttachment(archive, message, con);
	con.db.query(
		'INSERT INTO messages (date, sender, message, chat, attachment) VALUES (?, ?, ?, ?, ?)',
		[message.date, message.sender, message.contents, chatId, attachment],
	);
	return 1;
}

async function extractAttachment(
	archive : ArchiveProvider,
	message : Message,
	con : Connection,
) {
	const match = message.contents.match(ATTACHMENT);
	if(!match) {
		return;
	}
	const file = match[1];
	let data : Uint8Array | undefined;
	try {
		data = await archive.media(file);
	} catch(e) {
		console.error(`Error finding media for attachment ${file}`, e);
		return;
	}
	message.contents = message.contents.replace(ATTACHMENT, '');
	const hash = sha256(data);
	const fileExists = con.singleValue(
		'SELECT COUNT(*) FROM files WHERE hash = ?',
		[hash],
	) > 0;
	if(!fileExists) {
		con.db.query(
			'INSERT INTO files (hash, data) VALUES (?, ?)',
			[hash, data],
		);
	}
	con.db.query(
		'INSERT INTO attachments (file, name) VALUES (?, ?)',
		[hash, file],
	);
	return con.singleValue('SELECT last_insert_rowid() FROM attachments') as number;
}

export async function load(con : Connection, flags : Record<string, any>, file : string, name? : string) {
	file = normalize(file);
	let archive : ArchiveProvider | undefined;
	if(file.endsWith('.txt')) {
		file = resolve(file, '..');
	}
	const stat = await Deno.stat(file);
	if(stat.isDirectory) {
		archive = new ExtractedArchive(file);
		if(!name) {
			name = basename(file);
		}
	} else if(file.endsWith('.zip')) {
		archive = new ZippedArchive(file);
		if(!name) {
			name = basename(file, '.zip');
		}
	} else {
		console.error(`Not sure how to handle archive ${file}`);
		throw Deno.exit(9);
	}

	let chatId = con.singleValue('SELECT id FROM chats WHERE name = ?', [name]);
	let doAmend = false;
	if(chatId !== undefined && !flags.force) {
		console.error(`Chat ${name} already exists. Use --force to amend/replace`);
		throw Deno.exit(9);
	}
	if(chatId === undefined) {
		con.db.query('INSERT INTO chats (name) VALUES (?)', [name]);
		chatId = con.singleValue('SELECT last_insert_rowid() FROM chats');
	} else {
		doAmend = flags.mergeStategy === 'amend';
		if(flags.mergeStategy === 'replace') {
			// Delete all existing chats
			con.db.query('DELETE FROM messages WHERE chat = ?', [chatId]);
		}
	}

	const count = await storeMessages(archive, chatId, con, doAmend);

	if(count > 0) {
		console.log(`Inserted ${count} messages into ${name}.`);
	} else {
		console.log(`Chat ${name}: no messages inserted.`);
	}
}
