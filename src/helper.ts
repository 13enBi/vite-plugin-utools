import { types } from '@babel/core';
import { parse } from '@babel/parser';

export const UTOOLS_EXTERNAL = 'window.utools';

export const genStatements = (source: string) => parse(source).program.body;

export const ensureHoisted = (statements: types.Statement[]) =>
	statements.forEach((node) => {
		//@ts-ignore
		node._blockHoist = 3;
	});

const filterRE = /[jt]sx?|vue$/i;
const nodeModules = 'node_modules';
export const transformFilter = (path: string) => path.includes(nodeModules) || !path.match(filterRE);
