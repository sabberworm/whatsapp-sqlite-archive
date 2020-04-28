import { open, save, DB } from "https://deno.land/x/sqlite/mod.ts";

export class Connection {
	constructor(public db : DB) {};

	public save() {
		return save(this.db);
	}

	public close() {
		this.db.close();
	}
}

export async function openConnection(db : string) : Promise<Connection> {
	return new Connection(await open(db));
}
