import { Plugin } from 'vite';
import { resolve, normalize } from 'path';
import { transformFilter, UTOOLS_EXTERNAL } from './helper';
import { assginOptions, Options } from './options';
import transformExternal from './transform/external';
import transformPreload from './transform/preload';

export const viteUtoolsPlugin = (options: Options = {}): Plugin => {
	const { apiName, preloadPath, preloadName } = assginOptions(options);
	const preloadFileId = normalize(resolve(process.cwd(), preloadPath));
	const isIncludePreload = (path: string) => preloadFileId.includes(path);

	return {
		name: 'vite:utools',

		config: () => ({
			optimizeDeps: { exclude: [apiName] },
			build: {
				assetsDir: './',
				rollupOptions: {
					input: {
						preload: preloadFileId,
						index: './index.html',
					},
					output: {
						entryFileNames: '[name].js',
					},
				},
			},
		}),

		transform: (code, id) =>
			transformFilter(id)
				? code
				: isIncludePreload(normalize(id))
				? transformPreload(code, preloadName)
				: transformExternal(code, (sourcePath) =>
						sourcePath === apiName
							? UTOOLS_EXTERNAL
							: isIncludePreload(resolve(id, '../', sourcePath))
							? preloadName
							: void 0
				  ),
	};
};

export default viteUtoolsPlugin;
