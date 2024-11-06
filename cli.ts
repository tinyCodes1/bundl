#!/usr/bin/env -S deno run --ext=ts --allow-env --allow-read --allow-run

/**
 *  About : this is wrapper script for bundl.ts
 */

import { parseArgs } from "./deps.ts";
const debug = false;

// deno-lint-ignore no-explicit-any
const log=(logMessage : any)=>{
    if (debug) { console.log(logMessage); }
}

const run=(com:string) : string=>{
    com = com.replace(/\s+/g, ` `);
    const command = com.split(` `);
    const commandName = command.shift() as string;
    const output = new Deno.Command(commandName, { args: command , stderr:`inherit`, stdout:`inherit`}).outputSync();
    log(output);
    return ``+output.code;
}

const showHelp=()=> {
    const parts = Deno.mainModule.split(`/`);
    const scriptName = parts[parts.length -1];
    console.log(
        `Usage: ${scriptName} <inputFile> [Options]
        simple wrapper around deno_emit.
            Options:
            -h Show this help message.
            -w Watch file for changes.
            -o Output file path/name.
            `);
        return;
}

const main=(flags:Flags)=>{
    const inputFile = flags._ ;
    if (!inputFile[0]) {
        console.log(`Please specify input file/module.`);
        return;
    }
    let filewatch = ``;
    let watch_command = ``;
    if (flags.w) { filewatch = flags.w; }
    if (filewatch !== `none`) {
        if (filewatch) {
            watch_command = `--watch=${filewatch}`;
            console.log(`watching file: ${filewatch}`);
        } else {
            watch_command = `--watch=${inputFile}`;
            console.log(`watching file: ${inputFile}`);
        }
    }
    const output_command = flags.o ? `-o ${flags.o}` : ``;
    const com =`deno run -A ${watch_command} bundl.ts -i ${inputFile} ${output_command}`;
    run(com);
}

// script starts here 
type Flags = {
    _:string,
    h: boolean,
    w: string,
    o: string
};

const flags:Flags = parseArgs(Deno.args, {
    boolean: [`h`],
    string: [`o`, `w`],
    default: { h:false, o:``, watch:`none` },
    alias: { w:`watch` },
});

if (flags.h) { showHelp(); Deno.exit(0); }

main(flags);

