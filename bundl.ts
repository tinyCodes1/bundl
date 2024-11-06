#!/usr/bin/env -S deno run --ext=ts --allow-read --allow-write --allow-env --allow-net

/**
 *  bundl : simple wrapper script around deno_emit
 */

import { parseArgs } from "./deps.ts";
import { bundle } from "./deps.ts";
import { resolve } from "./deps.ts";

const isLocalFile=(path:string):boolean=> {
    try {
        new URL(path);
        return false;
    } catch (_err) {
        return true ;
    }
}

const fileExists=(path: string): boolean=> {
    let rv = false;
    try {
        Deno.statSync(path);  
        rv = true;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            rv = false; 
        }
    }
    return rv;
}

const bundl = async(url:string):Promise<string>=> {
    try {
        let filePath = ``;
        if (isLocalFile(url)) {
            filePath = resolve(Deno.cwd() , url);
            if (!fileExists(filePath)) {
                console.log(`File not found : ${filePath}`);
                Deno.exit(1);
            }
        } else {
            filePath = url;
        }
        const res = await bundle(filePath);
        const { code } = res;
        return code ;
    } catch (err) {
        if (err instanceof Error) {
            out(`Error in file : ${url} : ${err.message}`);
        }
    }
    return `err`;
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
        outputName = url.replace(/\.js$/,`.b.js`).replace(/\.ts$/,`.b.js`).replace(/\.mjs$/,`.b.mjs`);
        out(`Prefer giving output file name with -o flag.`);
        if (!isLocalFile) {
            const parts = url.split(`/`);
            outputName = parts[parts.length-1].replace(/\.js$/,`.b.js`).replace(/\.ts$/,`.b.js`).replace(/\.mjs$/,`.b.mjs`);
        }
    }
    if (outputName === url) {
        out(`File name error. Not overwriting. Specify output file name with -o`);
        return;
    }
    const bundledText = await bundl(url);
    if (bundledText !== `err`) {
        Deno.writeTextFileSync(outputName , bundledText);
        out(`output written to: ` + outputName);
    }
}

// script starts here 
type Flags = {
    o: string;
    i: string;
};

const flags:Flags = parseArgs(Deno.args, {
    string: [`o`, `i`],
});

// setting variable for main/bundl
const url = flags.i;
const outputName = flags.o;

main(url, outputName);
