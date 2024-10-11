## Overview
@tinycode/bundl is simple wrapper script around [deno_emit](https://deno.land/x/emit@0.40.0).

## Install
```typescript
deno install -frgA jsr:@tinycode/bundl
```

## Usage
```typescript
bundl script.ts -o output.js
```
or
```typescript
bundl script.js -o output.js
```

<h2>Available options</h2>
<div style="margin-left:20px;">
<p>-o   output file name</p>
<p>-d   debug mode (default: false)</p>
<p>-h   show this help message</p>
</div>


<h2>Usage(in browser, Deno)</h2>
<code>
import {bundl} from "https://jsr.io/@tinycode/bundl/0.0.9/mod.ts";
</code>
