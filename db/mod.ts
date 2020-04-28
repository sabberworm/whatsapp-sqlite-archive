import { DB, open, save } from "https://deno.land/x/sqlite/mod.ts";

export class Connection {
	constructor(public db : DB) {};

	public save(path? : string) {
		return save(this.db, path);
	}

	public close() {
		this.db.close();
	}

	public singleValue(stmt : string, vars : any[] = []) {
		const res = this.db.query(stmt, vars);
		const row = res.next();
		const val = row.value?.[0];
		res.done();
		return val;
	}
}

export async function openConnection(db : string) : Promise<Connection> {
	return new Connection(await open(db));
}
