export { init, migrate } from './db.ts';

export default function invalidCommand(validCommands : string[]) {
	console.error('Missing or invalid command given');
	console.error('Must be one of:');
	for(const cmdName of validCommands) {
		if(cmdName === 'default') {
			continue;
		}
		console.error(` • ${cmdName}`);
	}
	Deno.exit(5);
}
