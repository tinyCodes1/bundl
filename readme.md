<h1>@tinycode/bundl</h1>

<h2>Overview</h2>
<p><code>@tinycode/bundl</code> is a simple wrapper script around
<a href="https://jsr.io/@deno/emit@0.46.0" target="_blank">deno_emit</a>.
</p>

<h2>Install/Update</h2>
<pre><code>deno install -frA -e jsr:@tinycode/bundl/cli.ts -n bundl</code></pre>

<h2>Usage</h2>
<pre><code>bundl script.ts -o output.js</code></pre>
<p>Or</p>
<pre><code>bundl script.js -o output.js</code></pre>

<h2>Available Options</h2>
<div style="margin-left:20px;">
<p><strong>-o</strong>  output file name</p>
<p><strong>-w</strong>  watch for file changes</p>
<p><strong>-h</strong>  show this help message</p>
</div>
