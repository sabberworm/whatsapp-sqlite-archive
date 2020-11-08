import { DB } from 'https://deno.land/x/sqlite@v2.3.1/mod.ts';

export class Connection {
	constructor(public file : string, public db : DB) {};

	public async saveAs(path : string) {
		await Deno.copyFile(this.file, path);
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

export function openConnection(db : string) : Connection {
	return new Connection(db, new DB(db));
}
