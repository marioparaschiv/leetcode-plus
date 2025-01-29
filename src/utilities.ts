export function predefine<T = Record<any, any>, U extends keyof T = keyof T>(target: T, prop: U, effect: (value: any) => any) {
	const value = target[prop];

	Object.defineProperty(target, prop, {
		configurable: true,
		get: () => value,
		set: (value) => {
			Object.defineProperty(target, prop, {
				value: value,
				configurable: true,
				enumerable: true,
				writable: true
			});

			const origValue = value;
			try {
				const ret = effect.bind(target, value)();
				if (ret) value = ret;
			} catch (error) {
				console.error('Faced an issue triggering a predefine effect:', error);
			}

			if (value != origValue) {
				Object.defineProperty(target, prop, {
					value: value,
					configurable: true,
					enumerable: true,
					writable: true
				});
			}

			return value;
		},
	});
};