#!/usr/bin/env -S deno run --ext=ts --allow-read --allow-write --allow-env --allow-net

/**
 *  bundl : simple wrapper script around deno_emit
 */

import { bundle } from "jsr:@deno/emit@^0.40.0";
import { resolve } from "jsr:@std/path@^0.224.0";
import { parseArgs } from "jsr:@std/cli@^1.0.6/parse-args";

const isLocalFile=(path:string)=> {
    try {
        new URL(path);
        return false;
    } catch (_err) {
        return true ;
    }
}


const main = async(flags: Flags)=> {
    const url = flags._[0].trim() ;
    let outputName = flags.o ;
    if (!url) {
        console.log(`Give filepath`);
        return;
    }

    if ((!url.endsWith(`.ts`)) && (!url.endsWith(`.js`)) && (!url.endsWith(`.mjs`))) {
        console.log(`supported file types are: .js, .mjs, .ts`);
        return ;
    }

    try {
        let filePath = "";
        if (isLocalFile(url)) {
            filePath = resolve(Deno.cwd() , url);
            if (!outputName) {
                outputName = url.replace(/\.js$/,'.b.js').replace(/\.ts$/,'.b.js');
            }
        } else {
            if (!url.startsWith(`http`)) {
                console.log(`url not valid : ${url}`);
            }
            filePath = url;
            if (!outputName) {
                const parts = url.split('/');
                outputName = parts[parts.length-1].replace(/\.js$/,'.b.js').replace(/\.ts$/,'.b.js');
            }
        }
        const result = await bundle(filePath);
        const { code } = result;
        Deno.writeTextFileSync(outputName , code);
        console.log(`output written to: ` + outputName);
    } catch (error) {
        console.error(`Error in ${url} : ${error.message}`);
    }
}

const showHelp=()=> {
    const parts = Deno.mainModule.split(`/`);
    const scriptName = parts[parts.length -1];
    console.log(
        `Usage: ${scriptName} <args>
        simple wrapper around deno_emit.
            Options:
            -h Show this help message.
            -o Output file name.
            `);
        return;
}


// script starts here 
type Flags = {
    h: boolean; 
    o: string;
    _: string;
};

const flags:Flags = parseArgs(Deno.args, {
    boolean: [`h`],
    string: [`o`],
    default: { h:false },
});

if (flags.h) { showHelp(); Deno.exit(0); }
await main(flags);

