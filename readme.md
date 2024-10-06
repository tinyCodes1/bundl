## Overview
@tinycode/bundl is simple wrapper script around [deno_emit](https://deno.land/x/emit@0.40.0).

## Install
```typescript
deno install --allow-read --allow-write --allow-net --allow-env -fr jsr:@tinycode/bundl
```

## Usage
```typescript
bundl script.ts -o output.js
```
or
```typescript
bundl script.js -o output.js
```

<h2>Available options:</h2>
<div style="margin-left:10px;">
    <p>-o   output file name</p>
    <p>-d   debug mode (default: false)</p>
    <p>-h   show this help message</p>
</div>
