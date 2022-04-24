import { types } from '@babel/core';
import { parse } from '@babel/parser';
import { createFilter } from '@rollup/pluginutils';

export type Data = Record<any, any>;

export const genStatements = (source: string) => parse(source).program.body;

export const ensureHoisted = (statements: types.Statement[]) =>
	statements.forEach((node) => {
		//@ts-ignore
		node._blockHoist = 3;
	});

const includeRE = /\.([jt]sx?|vue)$/i;
export const transformFilter = createFilter(includeRE, 'node_modules');

export const createPreloadFilter = (preloadPath: string) =>
	createFilter([preloadPath, preloadPath.replace(includeRE, '')]);

export const isObject = (val: unknown): val is Data => !!val && typeof val === 'object';

export const isUndef = (val: unknown): val is undefined | null => val == void 0;

export const isString = (val: unknown): val is string => typeof val === 'string';
