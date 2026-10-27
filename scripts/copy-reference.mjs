// Copies the original atlas into the build under reference/ and adds the
// public-release note to the copy. The source in reference/public/ stays unedited.
import { cp, readFile, writeFile } from 'node:fs/promises'

const source = new URL('../reference/public/', import.meta.url)
const output = new URL('../dist/reference/', import.meta.url)
const page = new URL('index.html', output)

const NOTE =
  '<p role="note" style="position:fixed;bottom:34px;left:0;right:0;width:fit-content;z-index:2000;' +
  'max-width:calc(100% - 32px);margin:0 auto;padding:7px 12px;border:1px solid #e5d0a7;border-radius:5px;' +
  'background:#fff5df;color:#6f4e1f;font:11px/1.4 -apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,sans-serif;' +
  'box-shadow:0 8px 30px #18372a18;text-align:center">' +
  'Original atlas, kept for comparison. Observations were removed for public release, so its ' +
  '&ldquo;Your locations&rdquo; control does nothing.</p>'

await cp(source, output, { recursive: true })

const html = await readFile(page, 'utf8')
const parts = html.split('<body>')
if (parts.length !== 2) throw new Error('reference/public/index.html: expected exactly one <body> tag')
await writeFile(page, parts.join(`<body>\n${NOTE}`))

console.log('Copied the reference atlas to dist/reference/ with its public-release note.')
