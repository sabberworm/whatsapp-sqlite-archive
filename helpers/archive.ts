import { resolve } from 'https://deno.land/std@v0.41.0/path/posix.ts';
import { JSZip, readZip } from 'https://deno.land/x/jszip@0.3.0/mod.ts';


export interface ArchiveProvider {
	chat() : Promise<string>;
	media(file : string) : Promise<Uint8Array>
}

export class ExtractedArchive implements ArchiveProvider {
	chatFile : string;

	constructor(private directory : string, chatFile? : string) {
		if(!chatFile) {
			this.chatFile = resolve(directory, '_chat.txt');
		} else {
			this.chatFile = chatFile;
		}
	}

	async chat() {
		const decoder = new TextDecoder('utf-8');
		return decoder.decode(await Deno.readFile(this.chatFile));
	}

	media(file : string) {
		return Deno.readFile(resolve(this.directory, file));
	}
}

export class ZippedArchive implements ArchiveProvider {
	zipFile : Promise<JSZip>;
	constructor(zipFile : string) {
		this.zipFile = readZip(zipFile);
	}

	async chat() {
		const zip = await this.zipFile;
		return zip.file('_chat.txt').async('string');
	}

	async media(file : string) {
		const zip = await this.zipFile;
		return zip.file(file).async('uint8array');
	}
}
