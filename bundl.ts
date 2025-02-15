#!/usr/bin/env -S deno run --ext=ts --allow-read --allow-write --allow-env --allow-net

/**
 *  bundl : simple wrapper script around deno_emit
 */

// import ts from "https://esm.sh/typescript@5.7.2";
import ts from "npm:typescript@^5.7.2";
import { bundle } from "jsr:@deno/emit@^0.46.0";
import { parseArgs } from "jsr:@std/cli@^1.0.6/parse-args";
import { dirname, resolve } from "jsr:@std/path@^1.0.8";
import { UntarStream } from "jsr:@std/tar@^0.1.4/untar-stream";

const ifexists=(path: string)=> {
    try {
        Deno.statSync(path);
        return true;
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            return false;
        } else {
            throw err;
        }
    }
}

const download = (url: string, outputPath?: string) => {
    const bufferSize = 2048000000; // Buffer size for storing the text
    const sharedBuffer = new SharedArrayBuffer(bufferSize);
    const textBuffer = new Int32Array(sharedBuffer);
    if (!outputPath) {
        outputPath = url.split("/").slice(-1)[0];  ;
    }
    Atomics.store(textBuffer, 0, 0);
    const workerCode = `
    onmessage = async (e) => {
        const textBuffer = new Int32Array(e.data.sharedBuffer);
        const outputPath = e.data.outputPath;
        try {
            const response = await fetch(e.data.url);
            const file = await Deno.open(outputPath, { create: true, write: true });
            await response.body.pipeTo(file.writable);
            Atomics.store(textBuffer, 0, 1);
        } catch (error) {
            Atomics.store(textBuffer, 0, -1);
        }
        Atomics.notify(textBuffer, 0);
    };
    `;
    const blob = new Blob([workerCode], { type: 'application/typescript' });
    const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
    worker.postMessage({ sharedBuffer: sharedBuffer, url: url, outputPath: outputPath });
    Atomics.wait(textBuffer, 0, 0);
    const resultCode = Atomics.load(textBuffer, 0);
    worker.terminate();
    if (resultCode === -1) {
        throw new Error(`Failed to fetch or the file size exceeds buffer capacity.`);
    }
    return resolve(outputPath);
};

const readOnlineText = (path: string): string => {
    const bufferSize = 204800000; // Buffer size for storing the text
    const sharedBuffer = new SharedArrayBuffer(bufferSize);
    const textBuffer = new Int32Array(sharedBuffer);
    Atomics.store(textBuffer, 0, 0);
    const workerCode = `
    onmessage = async (e) => {
        const textBuffer = new Int32Array(e.data.sharedBuffer);
        try {
            const response = await fetch(e.data.url);
            const responseText = await response.text();
            const encodedText = new TextEncoder().encode(responseText);
            if (encodedText.length > textBuffer.length) {
                Atomics.store(textBuffer, 0, -1);
            } else {
                textBuffer.set(encodedText.slice(0, textBuffer.length), 0);
            }
        } catch (error) {
            Atomics.store(textBuffer, 0, -1);
        }
        Atomics.notify(textBuffer, 0);
    };
    `;
    const blob = new Blob([workerCode], { type: 'application/typescript' });
    const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
    worker.postMessage({ sharedBuffer: sharedBuffer, url: path });
    Atomics.wait(textBuffer, 0, 0);
    const resultCode = Atomics.load(textBuffer, 0);
    worker.terminate();
    if (resultCode === -1) {
        throw new Error(`Failed to fetch or the file size exceeds buffer capacity.`);
    }
    const decodedText = new TextDecoder().decode(textBuffer);
    return decodedText.replace(/\0/g, ``).replace(/\s*$/g,``).trim(); 
}

const readText=(path:string, defaultText=``)=>{
    if ((path.startsWith(`http://`) || path.startsWith(`https://`))) {
        return readOnlineText(path).trim();
    }
let filetext = ``;
try {
    filetext = Deno.readTextFileSync(path);
} catch (error) {
    if (error instanceof Deno.errors.NotFound) {
        writeText(path, defaultText);
        out(`File created: ${path}`);
    } else {
        throw error;
    }
}
return filetext;
}

const writeText=(path:string, text:string, options?: { whatIfExist?:`overwrite`|`skip`|`append`, verbose?:boolean})=>{
    const { whatIfExist=`overwrite`, verbose=true} = options || {};
    const dir = dirname(path);
    try {
        Deno.mkdirSync(dir, {recursive:true});
    } catch (error) {
        if (error instanceof Deno.errors.AlreadyExists) {
            if (verbose) {
                out(`directory already exists: ${dir}`);  
            }
        } else {
            throw error;
        }
    }
    try {
        if ((ifexists(path)) && (whatIfExist === `skip`)) {
            if (verbose) {
                out(`File exists: ${path}. skip.`);
            }
            return; 
        }
        const appendText = (whatIfExist === `append`) ? true : false;
        Deno.writeTextFileSync(path, text.trim(), { append: appendText });
    } catch (error) {
        throw error;
    }
}

const removeDir = async(dir:string) => {
    try {
        const list = Deno.readDirSync(dir);
        for await (const file of list) {
            const filepath = `${dir}/${file.name}`;
            if (file.isDirectory) {
                await removeDir(filepath);
            } else if (file.isSymlink) {
                Deno.removeSync(filepath);
            } else if (file.isFile) {
                Deno.removeSync(filepath);
            }
        }
        Deno.removeSync(dir);
    } catch (error) {
        throw error;
    }
}

const getFiles=(dirpath:string, recursive=false, searchword=""):string[]=>{
    const results = [];
    const files = Deno.readDirSync(dirpath);
    for (const file of files) {
        const fullpath = resolve(dirpath , file.name);
        if ((file.isDirectory) && (recursive)) {
            results.push(...getFiles(fullpath, true, searchword));
        } else {
            const searchregex = new RegExp(searchword, 'gi');
            if (searchregex.test(file.name)) {
                results.push(fullpath);
            }
        }
    }
    return results;
}

const untgz=async(fileName:string, outDir?:string)=>{
    const filePath = resolve(fileName);
    for await (
        const entry of ( Deno.openSync(filePath))
    .readable
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new UntarStream ())
    ) {
        let path = resolve(entry.path);
        if (outDir) {
            path = resolve(outDir + S + entry.path);
        }
        Deno.mkdirSync(dirname(path), { recursive: true });
        entry.readable?.pipeTo((Deno.createSync(path)).writable);
    }
}

const getOsType=()=>{
    if (typeof Deno?.build?.os === "string") {
        return Deno.build.os;
    }
    if ((navigator as any)?.appVersion?.includes?.("Win")) {
        return "windows";
    }
    return "linux";
}

const S = (getOsType() === "windows")? "\\" : "/";

const err=(errText : string, newline:boolean=true)=>{
    if (newline) {
        errText += `\n`;
    }
    const output = new TextEncoder().encode(errText);
    Deno.stderr.writeSync(output)
}

const out=(outputText:string, newline:boolean=true)=>{
  if (newline) {
    outputText += `\n`;
  }
  const output = new TextEncoder().encode(`\x1B[2K\r` + outputText);
    Deno.stdout.writeSync(output)
}

const showHelp=()=> {
    const parts = Deno.mainModule.split(`/`);
    const scriptName = parts[parts.length -1];

    const gray = "\x1b[94m";
    const bold = "\x1b[1m";
    const italic = "\x1b[3m";
    const reset = "\x1b[0m"; 

    out(`
        A lightweight wrapper around deno_emit. It is intended for bundling local files, npm packages, and jsr packages. For npm packages dependencies are fetched via esm.sh. All examples here assumes that script is installed with the default name, i.e. "bundl"

            ${bold}USAGE${reset}
            ${scriptName} [Options] <filename>

            ${bold}UTILITY ${reset}${gray}AND EXAMPLES${reset}
            1. Bundle local file/url
                ${gray}bundl localFile.ts -o localFile.js
                bundl url -o output.js${reset}
            2. Retrieve a package from jsr.io${reset}
                ${gray}bundl -j @scope/package -o packageName.js${reset}
            3. Retrieve a package from npm (via esm.sh and npm registry)
                ${gray}bundl -n packageName -o packageName.js${reset}
            esm.sh includes TypeScript types by default. To generate additional types, use the -t flag.${reset}
                ${gray}bundl -n packageName -t -o packageName.js${reset}

            ${bold}OPTIONS${reset}
            -h   Show this help message and exit
            -j   Retrieve package from jsr.io
            -n   Retrieve package from npm. [Uses esm.sh]
            ${gray}For generating types for npm, additionally include -t flag${reset}
            -o   Specify the output file path or name

            ${gray}${italic}link: https://github.com/tinyCodes1/bundl${reset}${reset}
                `);
            return;
}

const bundl = async(url:string):Promise<string>=> {
    try {
        const filePath = url;
        const res = await bundle(filePath);
        const { code } = res;
        return code ;
    } catch (error) {
        if (error instanceof Error) {
            err(`Error in ${url}`);
        }
    }
    return `err`;
}

const removeExtensions = (fileName:string):string => {
    return fileName.replace(/\.ts$/,``).replace(/\.mjs$/,``).replace(/\.js$/,``).replace(/\.b$/,``).replace(/\.d$/,``);
}

const npmDtsRetrieval = async(parts0:string, outputName:string)=>{
    out(`Downloading details from npm registry...`, false);
    const urlNpm = `https://registry.npmjs.org/${parts0}`;
        const metaDataNpm = readText(urlNpm);
    if (!metaDataNpm) {
        out(`npm metadata not found. url: ${urlNpm}`);
        Deno.exit(0);
    }
    const metaJsonNpm = JSON.parse(metaDataNpm);
    let latestVersion = ``;
    try {
        latestVersion = metaJsonNpm[`dist-tags`][`latest`];
    } catch (_e) {
        out(`npm package not found. url: ${urlNpm}`);
        Deno.exit(0);
    }
    const tarUrl = metaJsonNpm[`versions`][latestVersion][`dist`][`tarball`];
    const tempDirNpm = Deno.makeTempDirSync();
    if (tarUrl) {
        out(`Downloading npm package...`, false);
        const tarFile = download(tarUrl, tempDirNpm+S+parts0+`.tgz`);

        out(`Unpacking npm package...`, false);
        await untgz(tarFile, tempDirNpm);

        out(`Collecting dts files...`, false);
        const allDtsFiles = getFiles(tempDirNpm, true, `.d.ts$`);
        let allDtsText = ``;
        for (const dtsFile of allDtsFiles) {
            const dtsText = readText(dtsFile);
            const fileName = dtsFile.split(`/`).slice(-1).join(``);
            allDtsText += `// ------------- ${fileName} ---------\n\n` + dtsText + `\n\n\n\n`;
        }
        if (allDtsText) {
            const dtsName = removeExtensions(outputName) + `.d.ts`;
            writeText(dtsName, allDtsText);
            out(`Types written to: ` + dtsName);
        }
        removeDir(tempDirNpm);
    }
}

const main=async(url:string, outputName:string, mode:string)=>{
    if (!url) {
        out(`Give filepath`);
        return;
    }
    if (outputName === url) {
        out(`File name error. Not overwriting. Specify another file name with -o`);
        return;
    }
    const bundledText = await bundl(url);
    if (bundledText === `err`) {
        return;
    }
    if (!/.js$/.test(outputName)) {
        outputName += `.js`;
    }
    writeText(outputName, bundledText);
    out(`Output written to: ` + outputName);

    if (mode === `none`) {
        const dtsText = getDtsText(url);
        if (dtsText) {
            const dtsName = removeExtensions(outputName) + `.d.ts`;
            writeText(dtsName, dtsText);
            out(`Types written to: ` + dtsName);
        }
    }
}

const getDtsText =(fileName:string, tmpJsrDir?:string)=>{
    const tmpDtsDir = Deno.makeTempDirSync();
    const compilerOptions: ts.CompilerOptions = {
        declaration: true,
        allowJs: true,
        noEmit: false,
        outDir: tmpDtsDir
    };
    const host = ts.createCompilerHost(compilerOptions);
    const program = ts.createProgram([fileName], compilerOptions, host);
    program.emit();
    const dtsFiles: string[] = getFiles(tmpDtsDir, true, `.d.ts$`);
    let totalText = ``;
    for (const dtsFile of dtsFiles) {
        const fileName = dtsFile.split(`/`).slice(-1).join(`.`).replace(`.d`,``);
        let dtsText = readText(dtsFile);
        const fileNameRegex = new RegExp(`export.*from.*;`,`gi`);
        dtsText = dtsText.replace(fileNameRegex, `// (removedLine) $&`);
        dtsText = dtsText.replace(/^\#\!.*/gm, `// (removedLine) $&`);
        totalText += `// ------------- ${fileName} ---------\n\n` + dtsText + `\n\n\n\n`;
    }
    removeDir(tmpDtsDir);
    if (tmpJsrDir) {
        removeDir(tmpJsrDir);
    }
    return totalText;
}

// script starts here 
type Flags = {
    h: boolean; 
    j: boolean;
    n: boolean;
    t: boolean;
    o: string;
    _: string;
};

const flags:Flags = parseArgs(Deno.args, {
    boolean: [`h`, `j`, `n`, `t`],
    string: [`o`],
    default: { h:false},
});

if (flags.h) { showHelp(); Deno.exit(0); }

// setting variable for main/bundl
let url = flags._[0];
let outputName = flags.o;
const jsrMode = flags.j;
const npmMode = flags.n;
const npmTypes = flags.t;
let mode = `none`;

if (jsrMode) {
    mode = `jsr`;
    const parts = url.split(`/`);
    if (!parts[0].startsWith(`@`)) {
        out(`jsr path should start with @`);
        Deno.exit(0);
    }

    out(`Retrieving version from jsr.io...`, false);
    const metaJson = readText(`https://jsr.io/${parts[0]}/${parts[1]}/meta.json`);
        let meta = JSON.parse(`{}`);
    try {
        meta = JSON.parse(metaJson);
    } catch (_err) {
        out(`Error in retrieving jsr files. url: ${url}`);
        Deno.exit(0);
    }
    const latest = meta[`latest`];

    out(`Retrieving other details from jsr.io...`, false);
    const versionJson = readText(`https://jsr.io/${parts[0]}/${parts[1]}/${latest}_meta.json`);
        const jsonObj = JSON.parse(versionJson);
    const exports = jsonObj[`exports`];
    let laterParts =  parts.slice(2).join(`/`);
    if (typeof exports !== `string`) {
        const keyValue = JSON.parse(JSON.stringify(exports));
        const key = `./` + laterParts;
        if (key in keyValue) {
            laterParts = keyValue[key];
        }
    }

    out(`Setting url and output name...`, false);
    if (laterParts) {
        if (laterParts.endsWith(`.ts`)) {
            url = `https://jsr.io/${parts[0]}/${parts[1]}/${latest}/${laterParts}`;
                if (!outputName) {
                out(`Prefer giving output file name with -o flag.`);
                outputName = laterParts.replace(/\.ts$/,`.js`);
            }
        } else {
            url = `https://jsr.io/${parts[0]}/${parts[1]}/${latest}/${laterParts}/mod.ts`;
                if (!outputName) {
                out(`Prefer giving output file name with -o flag.`);
                outputName = laterParts + `.js`;
            }
        }
    } else {
        url = `https://jsr.io/${parts[0]}/${parts[1]}/${latest}/mod.ts`;
            if (!outputName) {
            out(`Prefer giving output file name with -o flag.`);
            outputName = parts[1] + `.js`;
        }
    }


    out(`Downloading jsr files...`, false);
    const tempDir = Deno.makeTempDirSync();
    const mainFile = exports[`.`].replace(/^\.\//g, ``);
        const fileList = jsonObj[`manifest`];
    if (fileList) {
        const filelistObj = JSON.parse(JSON.stringify(fileList));
        for (const file in filelistObj) {
            if ((/.ts$/).test(file)) {
                url = `https://jsr.io/${parts[0]}/${parts[1]}/${latest}${file}`;
                    const fileText = readText(url);
                writeText(tempDir + S + file, fileText);
            }
        }

        out(`Generating types...`, false);
        if (mainFile) {
            const dtsText = getDtsText(tempDir + S + mainFile, tempDir);
            if (dtsText) {
                const dtsName = removeExtensions(outputName) + `.d.ts`;
                writeText(dtsName, dtsText);
                out(`Types written to: ` + dtsName);
            }
        }
    }
}

if (npmMode) {
    mode = `npm`;
    const parts = url.split(`/`);

    out(`Retrieving link from esm.sh...`, false);
    const urlEsm = `https://esm.sh/${parts[0]}?dev&target=deno&bundle-deps`;
        const metaDataEsm = readText(urlEsm);
    if (!metaDataEsm) {
        out(`npm package not found. url: ${urlEsm}`);
        Deno.exit(0);
    }

    out(`Setting url and output name...`, false);
    let laterurl = ``;
    const metaLines = metaDataEsm.split(/\n/);
    for (const line of metaLines) {
        const lineparts = line.split(` from `);
        if (lineparts[0].trim() === `export { default }`) {
            laterurl = lineparts[1].replace(/;/,``).replace(/['"]/g,``).trim();
        }
    }
    url = `https://esm.sh${laterurl}`;
        if (!outputName) {
        out(`Prefer giving output file name with -o flag.`);
        outputName = parts[0] + `.mjs`;
    }
    if (!outputName.match(/\.mjs$/)) {
        outputName = removeExtensions(outputName) + `.mjs`;
    }
    if (npmTypes) {
        npmDtsRetrieval(parts[0], outputName);
    }
}


let isUrl = false;
let endsWithExtension = false
if (url.startsWith(`https://`) || url.startsWith(`http://`)) {
    isUrl = true;
}
if ((url.endsWith(`.js`) || url.endsWith(`.ts`) || url.endsWith(`.mjs`))) {
    endsWithExtension = true;
}

if ((isUrl) && (!endsWithExtension)) {
    url = url.replace(/\/$/,``) + `/mod.ts`;
}



if ((!outputName && (url))) {
    out(`Prefer giving output file name with -o flag.`);
    const parts = url.split(`/`);
 //   outputName = removeExtensions(parts[parts.length-1]) + `.js` ;
    outputName = removeExtensions(parts[parts.length-1]) ;
    if (outputName == `mod`) {
        if (parts[parts.length-2]) {
            outputName = removeExtensions(parts[parts.length-2]).split(`@`)[0];
        }
    }
}

if (import.meta.main) {
    await main(url, outputName, mode);
}

