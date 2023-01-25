import { PluginObj, transformAsync, types as t } from '@babel/core';
import generator from '@babel/generator';

import { ensureHoisted, genStatements, joinVarName, replaceByTemplate } from '../helper';

const getPatternNames = (pattern: t.PatternLike | t.LVal | t.Expression | null): string[] => {
	if (!pattern) return [];

	switch (pattern.type) {
		case 'ArrayPattern':
			return pattern.elements.map(getPatternNames).flat();

		case 'AssignmentPattern':
			return getPatternNames(pattern.left);

		case 'Identifier':
			return [pattern.name];

		case 'ObjectPattern':
			return pattern.properties
				.map((prop) => getPatternNames(t.isProperty(prop) ? prop.value : prop.argument))
				.flat();

		case 'RestElement':
			return getPatternNames(pattern.argument);

		case 'StringLiteral':
			return [pattern.value];

		default:
			return [];
	}
};

const generatorVariable = (decl: t.VariableDeclarator, varName: string, kind = 'var') => {
	const { id, init } = decl;

	if (!init) return '';

	if (t.isIdentifier(id)) return `${joinVarName(varName, id.name)} = ${generator(init).code}`;

	if (t.isArrayPattern(id) || t.isObjectPattern(id)) {
		const names = getPatternNames(id);

		return `${kind} ${generator(decl).code}; \
        ${names.map((name) => `${joinVarName(varName, name)} = ${name}`).join(',')}`;
	}
};

export const transformExportToAssign = (varName: string): PluginObj => {
	return {
		name: 'transform-export-to-assign',

		visitor: {
			ExportNamedDeclaration(path) {
				const declaration = path.node.declaration;

				switch (declaration?.type) {
					// export const/let/var variable = ... -> varName.variable = ...
					case 'VariableDeclaration': {
						const code = declaration.declarations
							.map((decl) => generatorVariable(decl, varName, declaration.kind))
							.join(';');

						replaceByTemplate(path, code);

						return;
					}

					// export function func(){} -> varName.func = function(){}
					case 'FunctionDeclaration': {
						const funcName = declaration.id?.name || '';
						const code = `${joinVarName(varName, funcName)} = ${generator(declaration).code};`;
						replaceByTemplate(path, code);

						return;
					}

					// export {a, b as c} -> varName.a = a, varName.c = b
					default: {
						const code = path.node.specifiers
							.map((specifier) =>
								t.isExportSpecifier(specifier) && t.isIdentifier(specifier.exported)
									? `${joinVarName(varName, specifier.exported.name)} = ${specifier.local.name}`
									: ''
							)
							.join(';');

						replaceByTemplate(path, code);
					}
				}
			},

			ExportDefaultDeclaration: (path) => {
				// export default ... -> varName.default = ...
				replaceByTemplate(
					path,
					`${joinVarName(varName, 'default')} = ${generator(path.node.declaration).code};`
				);
			},

			Program: {
				exit(path) {
					const nodes = genStatements(`${varName} = Object.create(null);`);

					ensureHoisted(nodes);

					path.unshiftContainer('body', nodes);
				},
			},
		},
	};
};

export const transformPreload = async (sourceCode: string, varName: string) => {
	const result = await transformAsync(sourceCode, {
		plugins: [transformExportToAssign(varName)],
	});

	return result?.code;
};

export default transformPreload;
