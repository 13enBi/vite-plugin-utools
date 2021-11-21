import { createPackageWithOptions } from 'asar';
import { resolve as pathResolve } from 'path';
import { Transform } from 'stream';
import { createReadStream, createWriteStream } from 'fs';
import { unlink, mkdir } from 'fs/promises';
import { createGzip } from 'zlib';
import { BuildUpxOptions, PluginOptions } from './options';
import { ResolvedConfig } from 'vite';
import chalk from 'chalk';

const vaildPluginOptions = (options: PluginOptions) => {
	if (!options.name) throw new Error('plugin name is required');
};

const transformPluginOptions = (options: PluginOptions) => (id: string) =>
	id.endsWith('plugin.json')
		? new Transform({
				transform(_, __, cb) {
					this.push(JSON.stringify(options));
					cb();
				},
		  })
		: void 0;

const tempRE = /\[(\w+)\]/g;
const generateOutName = (temp: string, pluginOptions: PluginOptions) =>
	temp.replace(tempRE, (str, key) => (Reflect.has(pluginOptions, key) ? (pluginOptions as any)[key] : str));

const prepareOutDir = (options: BuildUpxOptions) =>
	pathResolve(options.outDir!, generateOutName(options.outName!, options.pluginOptions));

const TEMPORARY_DEST = pathResolve(process.cwd(), `./.utools_${Math.random()}`);

const doBuild = (input: string, out: string, transformer: (id: string) => Transform | undefined) =>
	new Promise(async (resolve, reject) => {
		await createPackageWithOptions(input, TEMPORARY_DEST, {
			transform: transformer,
		});

		createReadStream(TEMPORARY_DEST)
			.pipe(createGzip())
			.on('error', reject)
			.pipe(createWriteStream(out))
			.on('error', reject)
			.on('finish', () => resolve(out));
	});

export const buildUpx = async (input: string, options: BuildUpxOptions, logger: ResolvedConfig['logger']) => {
	logger.info(chalk.green('\nbuilding for upx...'));

	vaildPluginOptions(options.pluginOptions);

	await mkdir(options.outDir!, { recursive: true });

	const out = prepareOutDir(options);
	const transformer = transformPluginOptions(options.pluginOptions);

	try {
		await doBuild(input, out, transformer);

		logger.info(chalk.green('✓ ') + chalk.cyan(out));

		return out;
	} catch (error: any) {
		logger.error(error);
	} finally {
		await unlink(TEMPORARY_DEST);
	}
};

export default buildUpx;
