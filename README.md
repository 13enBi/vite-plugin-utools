# vite-plugin-utools
<a href="http://www.u.tools/">Utools</a> for Vite

- 支持 preload.js 模块化 
- 支持 utools api 模块化

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
			apiName: 'utools-api',
			preloadPath: './src/preload.ts',
			preloadName: 'window.preload',
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

## utools api 支持 ESM
```js
import { onPluginReady, getUser } from 'utools-api';

onPluginReady(() => {
	console.log('Ready');
	console.log(getUser());
});
```

## TypeScript 类型支持
可使用官方提供的 utools-api-types 类型文件
```
npm i -D utools-api-types
```
```ts
declare module 'utools-api' {
	import Utools from 'utools-api-types';
	export = Utools;
}
```
## 配置
### apiName
utools api 导入的模块名，默认为 `utools-api-types`

### preloadPath
preload.js 文件路径，默认为`./src/preload`

### preloadName
preload.js 模块在 window 的挂载名，默认为 `window.preload`