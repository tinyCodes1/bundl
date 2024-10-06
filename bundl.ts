#!/usr/bin/env -S deno run --ext=ts --allow-read --allow-write --allow-env --allow-net

/**
 *  bundl : simple wrapper script around deno_emit
 */

import { bundle } from "jsr:@deno/emit@^0.40.0";
import { resolve } from "jsr:@std/path@^0.224.0";
import { parseArgs } from "jsr:@std/cli@^1.0.6/parse-args";

const log=(logMessage:any)=>{
    const debug = flags.d;
    if (debug) {
        out(logMessage);
    }
}

const isLocalFile=(path:string)=> {
    try {
        new URL(path);
        return false;
    } catch (_err) {
        return true ;
    }
}

const err=(errText : string, newline:boolean=true)=>{
    if (newline) {
        errText += `\n`;
    }
    const output = new TextEncoder().encode(errText);
    Deno.stderr.writeSync(output)
}

const out=(outputText : string, newline:boolean=true)=>{
    if (newline) {
        outputText += `\n`;
    }
    const output = new TextEncoder().encode(outputText);
    Deno.stdout.writeSync(output)
}

const main = async(flags: Flags)=> {
    const url = flags._[0].trim() ;
    let outputName = flags.o ;
    if (!url) {
        out(`Give filepath`);
        return;
    }

    try {
        let filePath = ``;
        if (isLocalFile(url)) {
            log(`file type is .... local file`);
            filePath = resolve(Deno.cwd() , url);
            if (!outputName) {
                outputName = url.replace(/\.js$/,`.b.js`).replace(/\.ts$/,`.b.js`);
                out(`output name not specified => Default: ${outputName}`);
            }
        } else {
            log(`file type is ... url`);
            filePath = url;
            if (!outputName) {
                const parts = url.split(`/`);
                outputName = parts[parts.length-1].replace(/\.js$/,`.b.js`).replace(/\.ts$/,`.b.js`);
                out(`output name not specified- Default: ${outputName}`);
            }
        }
        const result = await bundle(filePath);
        const { code } = result;
        Deno.writeTextFileSync(outputName , code);
        out(`output written to: ` + outputName);
    } catch (error) {
        err(`Error in ${url} : ${error.message}`);
    }
}

const showHelp=()=> {
    const parts = Deno.mainModule.split(`/`);
    const scriptName = parts[parts.length -1];
    out(
        `Usage: ${scriptName} [Options] <filename>
        simple wrapper around deno_emit.
            Options:
            -h Show this help message.
            -o Output file path/name.
            `);
        return;
}


// script starts here 
type Flags = {
    h: boolean; 
    o: string;
    d: boolean;
    _: string;
};

const flags:Flags = parseArgs(Deno.args, {
    boolean: [`h`, `d`],
    string: [`o`],
    default: { h:false, d:false },
});

if (flags.h) { showHelp(); Deno.exit(0); }
main(flags);

