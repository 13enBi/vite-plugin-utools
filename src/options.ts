export interface Options {
	apiName?: string;
	preloadPath?: string;
	preloadName?: string;
}

const defaultOptions: Required<Options> = {
	apiName: 'utools-api-types',
	preloadPath: './src/preload',
	preloadName: 'window.preload',
};

export const assginOptions = (options: Options) => ({ ...defaultOptions, ...options });
