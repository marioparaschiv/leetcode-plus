import browser from 'webextension-polyfill';


function inject(path: string) {
	const script = document.createElement('script');

	script.setAttribute('type', 'text/javascript');
	script.setAttribute('async', 'true');
	script.setAttribute('async', 'true');
	script.setAttribute('src', path);

	document.documentElement.appendChild(script);
}

const scriptPath = browser.runtime.getURL('src/index.js');
inject(scriptPath);
