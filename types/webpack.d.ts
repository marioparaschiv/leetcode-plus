export type Filter = (mdl: Module) => any;
export type Module = any[] | Record<any, any>;

interface Data {
	push: ((...args: any[]) => any) | null;
	instance: WebpackInstance | null;
	listeners: Set<(...args: any[]) => any>;
}

export type WebpackInstance = ((id: any) => any) & {
	c: Record<string, any> | null,
	d: (target: Record<any, any>, exports: any) => void;
};

export type WebpackDependecies = number[];
export type WebpackModuleDefinition = number[];
export type WebpackModuleDefinition = number[];
export type WebpackModuleDefinitionCollectiom = Record<string, WebpackModuleDefinition>;
export type WebpackModule = [WebpackDependecies, WebpackModuleDefinitionCollectiom] | [WebpackDependecies, WebpackModuleDefinitionCollectiom,];

type WebpackGlobal = [];