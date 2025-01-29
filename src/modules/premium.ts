import { waitByStrings } from '~/webpack';
import { createPatcher } from '~/patcher';


const USERS_MODULE_KEYWORDS = ['enabled:!!t', 'arguments[0]'];
const Patcher = createPatcher('Premium');

export default async () => {
	const DataModule = await waitByStrings(...USERS_MODULE_KEYWORDS);
	if (!DataModule || typeof DataModule !== 'object' || Array.isArray(DataModule)) return;

	for (const key in DataModule) {
		const value = DataModule[key];

		if (typeof value !== 'function') continue;

		const stringified = value.toString();
		if (!USERS_MODULE_KEYWORDS.every(s => stringified.includes(s))) continue;

		Patcher.after(DataModule, key, (_, args, res) => {
			const { data } = res ?? {};

			if (data?.userStatus) data.userStatus.isPremium = true;
		});
	}
};