import { intercept } from '~/webpack';
import * as modules from '~/modules';


intercept();

for (const module in modules) {
	const mod = modules[module as keyof typeof modules];

	try {
		mod();
	} catch (error) {
		console.error(`Failed to initialize ${module}:`, error);
	}
}
