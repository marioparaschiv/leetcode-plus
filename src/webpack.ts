import type { Data, Filter, WebpackInstance } from '#webpack';
import { WEBPACK_CHUNK_NAME } from '~/constants';
import { predefine } from '~/utilities';


export const data: Data = {
	push: null,
	instance: null,
	listeners: new Set()
};

export const Filters = {
	byProps: (...props: string[]) => (mdl: any) => {
		for (let i = 0; i < props.length; i++) {
			if (mdl[props[i]] === void 0) {
				return false;
			}
		}

		return true;
	},

	byStrings: (...strings: string[]) => (mdl: any) => {
		if (typeof mdl === 'function') {
			const stringified = mdl.toString();
			return strings.every(s => stringified.includes(s));
		}

		if (typeof mdl !== 'object' || Array.isArray(mdl)) {
			return false;
		}

		for (const key in mdl) {
			const value = mdl[key];

			const stringified = value?.toString?.();
			if (!stringified) continue;

			if (strings.every(s => stringified.includes(s))) {
				return true;
			}
		}

		return false;
	}
};

export function find(filter: Filter) {
	const search = (mdl: any) => {
		try {
			return filter(mdl);
		} catch (error) {
			console.warn('Webpack filter threw an error. This hurts performance a lot. Please refine your filter.', error);
		}
	};

	const require = request();
	if (!require) return null;

	for (const id in require.c) {
		const mdl = require.c[id];
		if (!mdl) continue;

		const exports = mdl.exports;
		if (!exports || exports === window) continue;

		if (search(exports)) {
			return exports;
		}

		if (exports.default && search(exports.default)) {
			return exports;
		}
	}
}

export function waitForModule(filter: (mdl: any) => any) {
	const existing = find(filter);
	if (existing) return existing;

	const search = (mdl: any) => {
		try {
			return filter(mdl);
		} catch (error) {
			console.warn('Webpack filter threw an error. This hurts performance a lot. Please refine your filter.', error);
		}
	};

	return new Promise((resolve) => {
		function onPush(mdl: any) {
			if (search(mdl)) {
				data.listeners.delete(onPush);
				resolve(mdl);
			}

			if (mdl.default && search(mdl.default)) {
				data.listeners.delete(onPush);
				resolve(mdl.default);
			}
		}

		data.listeners.add(onPush);
	});
}

export function waitByProps(...props: string[]) {
	const filter = Filters.byProps(...props);
	return waitForModule(filter);
}

export function waitByStrings(...strings: string[]) {
	const filter = Filters.byStrings(...strings);
	return waitForModule(filter);
}

function onPush(this: any, chunk: any) {
	const [, modules] = chunk;

	for (const moduleId in modules) {
		const originalModule = modules[moduleId];

		modules[moduleId] = (module: any, exports: Record<any, any>, require: any) => {
			try {
				Reflect.apply(originalModule, null, [module, exports, require]);

				const callbacks = [...data.listeners];

				for (let i = 0; i < callbacks.length; i++) {
					try {
						callbacks[i](exports);
					} catch (error) {
						console.error('Could not fire callback listener:', error);
					}
				}
			} catch (error) {
				console.error('Could not patch pushed module:', error);
			} finally {
				require.m[moduleId] = originalModule;
			}
		};

		Object.assign(modules[moduleId], originalModule, {
			toString: () => originalModule.toString()
		});
	}

	return data.push?.call(this, chunk);
};

export function intercept() {
	predefine(window, WEBPACK_CHUNK_NAME, (value) => {
		predefine(value, 'push', function (originalPush) {
			data.push = originalPush;

			const require = request();
			if (require) {
				require.c = extractPrivateCache();
				require.d = (target: any, exports: any) => {
					for (const key in exports) {
						if (!Reflect.has(exports, key)) continue;

						try {
							Object.defineProperty(target, key, {
								get: () => exports[key](),
								set: v => (exports[key] = () => v),
								enumerable: true,
								configurable: true
							});
						} catch (error) {
							console.error(error);
						}
					}
				};
			}

			return onPush.bind(window.webpackChunk_N_E);
		});
	});
};

export function request(cache = true) {
	if (cache && data.instance) return data.instance;

	const host = window[WEBPACK_CHUNK_NAME];
	if (!host) return null;

	host.push([[Symbol()], {}, (require: any) => (data.instance = require)]);

	return data.instance;
}

function extractPrivateCache(): WebpackInstance['c'] {
	let cache: WebpackInstance['c'] = null;
	const sym = Symbol();

	Object.defineProperty(Object.prototype, sym, {
		configurable: true,
		get() {
			cache = this;
			return { exports: {} };
		},
	});

	data.instance!(sym);

	// @ts-expect-error
	delete Object.prototype[sym];
	if (cache) delete cache[sym];

	return cache;
}