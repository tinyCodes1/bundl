#!/usr/bin/env -S deno run --ext=ts --allow-read --allow-write --allow-env --allow-net

/**
 *  bundl : simple wrapper script around deno_emit
 */

import { parseArgs } from "jsr:@std/cli@^1.0.6/parse-args";
import {isLocalFile, bundl} from "./funct.ts";

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

const out=(outputText : string, newline:boolean=true)=>{
    if (newline) {
        outputText += `\n`;
    }
    const output = new TextEncoder().encode(outputText);
    Deno.stdout.writeSync(output)
}

const main=async(url:string, outputName:string)=>{
    if (!url) {
        out(`Give filepath`);
        return;
    }
    if (!outputName) {
        outputName = url.replace(/\.js$/,`.b.js`).replace(/\.ts$/,`.b.js`);
        out(`Prefer giving output file name with -o flag.`);
        if (!isLocalFile) {
            const parts = url.split(`/`);
            outputName = parts[parts.length-1].replace(/\.js$/,`.b.js`).replace(/\.ts$/,`.b.js`);
        }
    }
    const bundledText = await bundl(url);
    Deno.writeTextFileSync(outputName , bundledText);
    out(`output written to: ` + outputName);
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

// setting variable for main/bundl
const url = flags._[0];
const outputName = flags.o;

main(url, outputName);
