import webExtension from 'vite-plugin-web-extension';
import paths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';


export default defineConfig({
	plugins: [
		webExtension({ additionalInputs: ['src/index.ts'] }),
		paths()
	]
});