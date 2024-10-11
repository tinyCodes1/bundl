#!/usr/bin/env -S deno run --ext=ts --allow-read --allow-write --allow-env --allow-net

/**
 *  bundl : simple wrapper script around deno_emit
 */

import { bundle } from "jsr:@deno/emit@^0.40.0";
import { resolve } from "jsr:@std/path@^0.224.0";

const isLocalFile=(path:string):boolean=> {
    try {
        new URL(path);
        return false;
    } catch (_err) {
        return true ;
    }
}


const bundl = async(url:string):Promise<string>=> {
    let rv = `err`;
    try {
        let filePath = ``;
        if (isLocalFile(url)) {
            filePath = resolve(Deno.cwd() , url);
        } else {
            filePath = url;
        }
        const res = await bundle(filePath);
        const { code } = res;
        return code ;
    } catch (err) {
        if (err instanceof Error) {
            rv = `Error in ${url} : ${err.message}` ;
        }
    }
    return rv;
}

export {bundl, isLocalFile};
