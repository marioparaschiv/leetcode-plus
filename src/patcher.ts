import type { AfterOverwrite, BeforeOverwrite, InsteadOverwrite, Patch, Patcher } from '#patcher';


export enum Type {
	Before = 'before',
	Instead = 'instead',
	After = 'after',
}

export const patches: Patch[] = [];

export function before<
	M extends Record<P, Fn>,
	P extends PropOf<M>
>(caller: string, mdl: M, func: P, callback: BeforeOverwrite<M[P]>, once: boolean = false): () => void {
	return patch(caller, mdl, func, callback, Type.Before, once);
}

export function instead<
	M extends Record<P, Fn>,
	P extends PropOf<M>
>(caller: string, mdl: M, func: P, callback: InsteadOverwrite<M[P]>, once: boolean = false): () => void {
	return patch(caller, mdl, func, callback, Type.Instead, once);
}

export function after<
	M extends Record<P, Fn>,
	P extends PropOf<M>
>(caller: string, mdl: M, func: P, callback: AfterOverwrite<M[P]>, once: boolean = false): () => void {
	return patch(caller, mdl, func, callback, Type.After, once);
}

export function createPatcher(name: string) {
	return {
		getPatchesByCaller,
		before<M extends Record<P, Fn>, P extends PropOf<M>>(mdl: M, func: P, callback: BeforeOverwrite<M[P]>, once: boolean = false) {
			return before(name, mdl, func, callback, once);
		},
		instead<M extends Record<P, Fn>, P extends PropOf<M>>(mdl: M, func: P, callback: InsteadOverwrite<M[P]>, once: boolean = false) {
			return instead(name, mdl, func, callback, once);
		},
		after<M extends Record<P, Fn>, P extends PropOf<M>>(mdl: M, func: P, callback: AfterOverwrite<M[P]>, once: boolean = false) {
			return after(name, mdl, func, callback, once);
		},
		unpatchAll: () => unpatchAll(name),
	};
}

export function getPatchesByCaller(id?: string) {
	if (!id) return [];
	const payload: Patcher[] = [];

	for (const entry of patches) {
		const store = [
			...entry.patches.before,
			...entry.patches.instead,
			...entry.patches.after
		];

		for (const patch of store) {
			if (!id || patch.caller === id) {
				payload.push(patch);
			}
		}
	}

	return payload;
}

export function unpatchAll(caller?: string): void {
	const patches = getPatchesByCaller(caller);
	if (!patches.length) return;

	for (const patch of patches) {
		patch.unpatch();
	}
}

function override(patch: Patch) {
	return function (this: any) {
		if (
			!patch?.patches?.before.length &&
			!patch?.patches?.after.length &&
			!patch?.patches?.instead.length &&
			!patches.find(p => p.mdl === patch.mdl && p.func === patch.func)
		) {
			patch.unpatch();
			return new.target ? new (patch.original as Constructor)(...arguments as any as []) : patch.original.apply(this, arguments);
		}

		let res;
		let args = arguments as any;

		const before = [...patch.patches.before];
		for (let i = 0; i < before.length; i++) {
			const instance = before[i];
			if (!instance) continue;

			try {
				const temp = instance.callback(this, args, patch.original.bind(this), patch.unpatch);
				if (Array.isArray(temp)) args = temp;
				if (instance.once) instance.unpatch();
			} catch (error) {
				console.error(`Could not fire before patch for ${patch.func} of ${instance.caller}`, error);
			}
		}

		const instead = [...patch.patches.instead];
		if (!instead.length) {
			if (new.target) {
				res = new (patch.original as Constructor)(...args as any as []);
			} else {
				res = patch.original.apply(this, args);
			}
		} else {
			for (let i = 0; i < instead.length; i++) {
				const instance = instead[i];
				if (!instance) continue;

				try {
					const ret = instance.callback(this, args, patch.original.bind(this), patch.unpatch);
					if (typeof ret !== 'undefined') res = ret;
					if (instance.once) instance.unpatch();
				} catch (error) {
					console.error(`Could not fire instead patch for ${patch.func} of ${instance.caller}`, error);
				}
			}
		}

		const after = [...patch.patches.after];
		for (let i = 0; i < after.length; i++) {
			const instance = after[i];
			if (!instance) continue;

			try {
				const ret: unknown = instance.callback(this, args, res, patch.unpatch);
				if (typeof ret !== 'undefined') res = ret;
				if (instance.once) instance.unpatch();
			} catch (error) {
				console.error(`Could not fire after patch for ${patch.func} of ${instance.caller}`, error);
			}
		}

		return res;
	};
}

function push(mdl: Record<string, any>, func: string): Patch {
	const patch = {
		mdl,
		func,
		original: mdl[func as keyof typeof mdl],
		unpatch: () => {
			patch.mdl[patch.func as keyof typeof mdl] = patch.original;

			patch.patches = {
				before: [],
				after: [],
				instead: []
			};
		},
		patches: {
			before: [],
			after: [],
			instead: []
		}
	};


	const patched = override(patch);
	mdl[func as keyof typeof mdl] = patched;

	const descriptors = Object.getOwnPropertyDescriptors(patch.original);
	delete descriptors.length;

	Object.defineProperties(mdl[func], {
		...descriptors,
		toString: {
			value: () => patch.original.toString(),
			configurable: true,
			enumerable: false
		},
		__ORIGINAL__: {
			value: patch.original,
			configurable: true,
			enumerable: false
		}
	});

	patches.push(patch);
	return patch;
}

function get(mdl: Record<string, any> | Function, func: string) {
	const patch = patches.find(p => p.mdl === mdl && p.func === func);
	if (patch) return patch;

	return push(mdl, func);
}

function patch<F extends Fn>(caller: string, mdl: Record<string, any> | Function, func: string, callback: BeforeOverwrite<F> | InsteadOverwrite<F> | AfterOverwrite<F>, type = Type.After, once = false): () => void {
	if (!caller || typeof caller !== 'string') {
		throw new TypeError('first argument "caller" must be of type string');
	} else if (!mdl || !['function', 'object'].includes(typeof mdl)) {
		throw new TypeError('second argument "mdl" must be of type function or object');
	} else if (!func || typeof func !== 'string') {
		throw new TypeError('third argument "func" must be of type string');
	} else if (!callback || typeof callback !== 'function') {
		throw new TypeError('fourth argument "callback" must be of type function');
	} else if (!type || typeof type !== 'string' || !['after', 'before', 'instead'].includes(type)) {
		throw new TypeError('fifth argument "type" must be of type string and any of the three: after, before, instead');
	}

	const current = get(mdl, func);

	const patch = {
		caller,
		once,
		type,
		id: current.patches?.[type]?.length ?? 0,
		callback,
		unpatch: () => {
			// Remove the original patch this callback was from
			const individual = current.patches?.[type].findIndex(p => p.id === patch.id);
			if (~individual) current.patches?.[type].splice(individual, 1);

			if (
				current.patches?.before.length ||
				current.patches?.after.length ||
				current.patches?.instead.length
			) return;

			// If no other patches on the module are remaining, completely remove all patches
			// and re-assign the original module to its original place.
			const module = patches.findIndex(p => p.mdl == mdl && p.func == func);

			if (!module) return;
			patches[module]?.unpatch();
			patches.splice(module, 1);
		}
	};

	current.patches[type] ??= [];
	current.patches[type].push(patch);

	return patch.unpatch;
}

export default { createPatcher, before, instead, after, unpatchAll, patches };