import { Data, isObject, isUndef } from './helper';

export interface PreloadOptions {
	path?: string;
	watch?: boolean;
	name?: string;
}

export interface PluginOptions {
	name: string;
	logo: string;
	features: Data;
	pluginName?: string;
	description?: string;
	author?: string;
	homepage?: string;
	version?: string;
}

export interface BuildUpxOptions {
	pluginPath?: string;
	outDir?: string;
	outName?: string;
}

export interface Options {
	external?: string;
	preload?: PreloadOptions;
	buildUpx?: BuildUpxOptions | false;
}

type NestedRequired<T> = {
	[P in keyof T]-?: NestedRequired<Exclude<T[P], false | undefined | null>>;
};

export type RequiredOptions = NestedRequired<Options>;

const defaultOptions: RequiredOptions = {
	external: 'utools-api-types',
	preload: {
		path: './src/preload.ts',
		watch: true,
		name: 'window.preload',
	},
	buildUpx: {
		pluginPath: './plugin.json',
		outDir: 'upx',
		outName: '[pluginName]_[version].upx',
	},
};

export const resolveOptions = (options: Options): RequiredOptions =>
	Object.entries(defaultOptions).reduce((ret, [key, v1]) => {
		// @ts-ignore
		const v2 = options[key];

		ret[key] = isUndef(v2) ? v1 : isObject(v1) && isObject(v2) ? { ...v1, ...v2 } : v2;

		return ret;
	}, {} as any);
