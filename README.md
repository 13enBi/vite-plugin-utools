# vite-plugin-utools
<a href="http://www.u.tools/">Utools</a> for Vite

- 支持 preload.js 模块化 
- 支持 uTools api 模块化
- 支持插件打包

## 用法

```bash
npm i vite-plugin-utools -D
```

在 `vite.config.js` 中添加配置

```js
import utools from 'vite-plugin-utools';

export default {
	plugins: [
		utools({
			external: 'uTools',
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
		}),
	],
};
```
 
## preload.js 支持 ESM

```js
// preload.js

import { readFileSync } from 'fs';

export const readConfig = () => readFileSync('./config.json');
```

其他文件从 preload.js 中导入
```js
// index.js

import { readConfig } from './preload';

console.log(readConfig());
```

上诉文件会转换为
```js
// preload.js

window.preload = {};

const { readFileSync } = require('fs')

window.preload.readConfig =  () => readFileSync('./config.json');
```

```js
const readConfig = window.preload.readConfig

console.log(readConfig());
```

## uTools api 支持 ESM
```js
import { onPluginReady, getUser } from 'uTools';

onPluginReady(() => {
	console.log('Ready');
	console.log(getUser());
});
```

### TypeScript 类型支持
可使用官方提供的 utools-api-types 类型文件
```
npm i -D utools-api-types
```
```ts
declare module 'uTools' {
	import Utools from 'utools-api-types';
	export = Utools;
}
```
## Upx 打包
在插件的 `plugin.json` 文件添加额外配置
```json
"name": "demo", // uTools 开发者工具中的项目 id
"version": "1.0.0",  
"pluginName": "demo",  
"description": "demo", 
"author": "yo3emite",  
"homepage": "https://github.com/13enbi",
```
可将 vite 构建后的产物打包成 uTools 的 `upx` 离线包
## 配置
### external
扩展 window.utools 的模块名，默认为 `utools-api-types`

### preload.path
preload.js 文件路径，默认为 `./src/preload`

### preload. name
preload.js 模块在 window 的挂载名，默认为 `window.preload`

### preload.watch
preload.js 模块修改后重新构建,配合 uTools 开发者工具开启`隐藏插件后完全退出`使用

### buildUpx.pluginPath
插件 plugin.json 文件路径

### buildUpx.outDir
插件打包输出路径，默认为 `upx`

### buildUpx.outName
插件输出文件名，默认为 `[pluginName]_[version].upx`