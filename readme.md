<div style="padding: 5px; font-weight:bold"> [EXPERIMENTAL] </div>
<div style="padding: 5px"> - Always use with version number </div>

<br/>
<a href="https://jsr.io/@tinycode/bundl">
<img src="https://jsr.io/badges/@tinycode/bundl" alt="JSR Badge" />
</a>

<br/>
<br/>

<p style="margin-left: 20px;"><code>@tinycode/bundl</code>
is a lightweight wrapper around 
<a href="https://jsr.io/@deno/emit@0.46.0" target="_blank">deno_emit</a>.
It is useful for bundling local files, npm packages, or jsr packages. Any other modules eg. deno/x can be bundled via url. It is also useful for writing types of existing javascript and typescript files.</p>

<p style="margin-left: 20px;">For npm packages,
<code>@tinycode/bundl</code>
fetches dependencies via
<a href="https://esm.sh" target="_blank">esm.sh</a></p>

<p style="margin-left: 20px;">
Bundling is often necessary for debugging, script minification, or creating offline applications. 
For online applications or cutting-edge projects, it is recommended to use URLs directly from jsr, npm or esm.sh</p>


<h2>Install/Update</h2>
<pre><code>deno install -frgA jsr:@tinycode/bundl -n bundl</code></pre>
or
<pre><code>deno install -frg --allow-read --allow-write --allow-env --allow-net jsr:@tinycode/bundl -n bundl</code></pre>

<h2>Usage</h2>
<em>Local file</em>
<pre><code>bundl script.ts -o output.js</code></pre>
<em>Url</em>
<pre><code>bundl url -o output.js</code></pre>
<em>JSR package</em>
<pre><code>bundl -j @scope/package -o packageName.js</code></pre>
<em>NPM package</em>
<pre><code>bundl -n packageName -o packageName.mjs</code></pre>


<h2>CLI Options</h2>
<div style="margin-left:20px;">
<p><strong>-h</strong>  show this help message</p>
<p><strong>-o</strong>  output file name</p>
<p><strong>-j</strong>  Retrieve package from jsr.io</p>
<p><strong>-n</strong>  Retrieve npm package via esm.sh</p>
<p><strong>-t</strong>  Retrieve types of npm packages (-n also needed)</p>
</div>


<h2>License</h2>
<p style="margin-left: 20px;">This project is licensed under the <a href="./LICENSES/LICENSE.txt">MIT License</a>.</p>

<h3>Dependencies</h3>
<p style="margin-left: 20px;">Some dependencies may be licensed under different terms. (see <a href="./LICENSES">LICENSES</a> for more details)</p>
