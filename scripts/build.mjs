import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: ['src/plugin.jsx'], outfile: 'client.js',
  bundle: true, platform: 'browser', target: 'es2022', format: 'cjs',
  external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'], loader: { '.css': 'text' },
  banner: { js: "window.__ModuleLoader__.load({id:'chasey-harness',factory(require){const module={exports:{}};" },
  footer: { js: 'return module.exports;}});' },
})
