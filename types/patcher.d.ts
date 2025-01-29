export type BeforeOverwrite<F extends Fn> = (context?: any, args?: Parameters<F>, original?: F, unpatch?: () => void) => Parameters<F> | void;
export type InsteadOverwrite<F extends Fn> = (context?: any, args?: Parameters<F>, original?: F, unpatch?: () => void) => ReturnType<F> | void;
export type AfterOverwrite<F extends Fn> = (context?: any, args?: Parameters<F>, result?: ReturnType<F>, unpatch?: () => void) => ReturnType<F> | void;

export interface Patch {
	mdl: Record<string, any> | Function;
	func: string;
	original: Function;
	unpatch: () => void;
	patches: {
		before: Patcher[];
		after: Patcher[];
		instead: Patcher[];
	};
}

export interface Patcher {
	caller: string;
	once: boolean;
	type: Type;
	id: number;
	callback: any;
	unpatch: () => void;
}