import { Data, isObject, isUndef, pick } from './helper';

export interface PreloadOptions {
	path?: string;
	watch?: boolean;
}

export interface External {
	api?: string;
	preload?: string;
}

export interface PluginOptions {
	name: string;
	pluginName?: string;
	description?: string;
	author?: string;
	homepage?: string;
	version?: string;
}

export interface BuildUpxOptions {
	pluginPath: string;
	outDir?: string;
	outName?: string;
	pluginOptions: PluginOptions;
}

export interface Options {
	external?: External;
	preload?: PreloadOptions;
	buildUpx?: BuildUpxOptions | false;
}

type NestedRequired<T> = {
	[P in keyof T]-?: NestedRequired<Exclude<T[P], false | undefined | null>>;
};

export type RequiredOptions = NestedRequired<Options>;

const defaultOptions = {
	external: {
		api: 'utools-api-types',
		preload: 'window.preload',
	},
	preload: {
		path: './src/preload.ts',
		watch: true,
	},
	buildUpx: false,
};

const defaultOut = {
	outDir: 'upx',
	outName: '[pluginName]_[version].upx',
};

const getPackage = () => {
	try {
		const pkgJson = require(`${process.cwd()}/package.json`);

		const pkgOpts: Data = pick(pkgJson, ['name', 'description', 'author', 'homepage', 'version']);
		pkgOpts.pluginName = pkgOpts.name;
		Reflect.deleteProperty(pkgOpts, 'name');

		return pkgOpts;
	} catch (error) {
		return {};
	}
};

const resolvePluginOptions = (options: BuildUpxOptions) => ({
	...getPackage(),
	...require(options.pluginPath),
	...options.pluginOptions,
});

const resolveBuildUpxOptions = (options: BuildUpxOptions) => ({
	...defaultOut,
	...options,
	pluginOptions: resolvePluginOptions(options),
});

export const resolveOptions = (options: Options): RequiredOptions =>
	Object.entries(defaultOptions).reduce((ret, [key, v1]) => {
		// @ts-ignore
		const v2 = options[key];

		if (key === 'buildUpx') {
			ret[key] = resolveBuildUpxOptions(v2);
		} else {
			ret[key] = isUndef(v2) ? v1 : isObject(v1) && isObject(v2) ? { ...v1, ...v2 } : v1;
		}

		return ret;
	}, {} as any);
