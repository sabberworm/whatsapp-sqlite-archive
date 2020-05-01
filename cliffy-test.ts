import { Command } from 'https://deno.land/x/cliffy@v0.4.0/command.ts';

await new Command()
	.option( '--flag1', 'flag 1' )
	.option( '--flag2 <val:string>', 'flag 2', {depends: ['flag1'], default: 'example'} )
	.parse( Deno.args );