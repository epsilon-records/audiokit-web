// First-touch signup source on the public pages (AudioKit decisions 0040 and 0041, EPSILON-98).
// The landing page's referrer host, utm_* values and path are added to that page's sign-up and
// sign-in links. Nothing is stored on the device. Ported from the static site's
// test/first-touch.test.mjs (EPSILON-169 PR 2): the links are now this app's own /signup and
// /login, so the script finds them on its own origin.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'vitest';
import { publicHead } from '../../src/lib/server/site/public-head';

const source = readFileSync(
	new URL('../../src/lib/public/first-touch.js', import.meta.url),
	'utf8'
);

type Touch = Record<string, string>;
type Api = {
	touchFrom: (href: string, referrer: string) => Touch;
	decorate: (links: Link[], consoleUrl: string, touch: Touch) => number;
	referrerHost: (referrer: unknown) => string;
};
type Link = {
	href: string;
	getAttribute: () => string;
	setAttribute: (k: string, v: string) => void;
};

function load(): Api {
	const module = { exports: {} as Api };
	vm.runInNewContext(source, { module, URL, JSON });
	return module.exports;
}
const ft = load();
const plain = (o: unknown) => JSON.parse(JSON.stringify(o));
const SITE = 'https://audiokit.ai';

function links(...hrefs: string[]): Link[] {
	return hrefs.map((href) => {
		const l: Link = {
			href,
			getAttribute: () => l.href,
			setAttribute: (_, value) => (l.href = value)
		};
		return l;
	});
}

// Run the script as a browser would, with every device-storage API spied on.
function runInPage({ href, referrer, hrefs }: { href: string; referrer: string; hrefs: string[] }) {
	const writes: string[] = [];
	const storage = (name: string) =>
		new Proxy(
			{},
			{
				get:
					(_, prop) =>
					(...args: unknown[]) => {
						writes.push(`${name}.${String(prop)}(${args.join(',')})`);
						return null;
					},
				set: (_, prop) => (writes.push(`${name}.${String(prop)}=`), true)
			}
		);
	const anchors = links(...hrefs);
	const document = {
		currentScript: { dataset: {} },
		referrer,
		readyState: 'interactive',
		querySelectorAll: () => anchors
	};
	Object.defineProperty(document, 'cookie', {
		get: () => '',
		set: (v) => writes.push(`document.cookie=${v}`)
	});
	const window = {
		sessionStorage: storage('sessionStorage'),
		localStorage: storage('localStorage')
	};
	vm.runInNewContext(source, {
		URL,
		JSON,
		document,
		window,
		location: { href, origin: new URL(href).origin },
		sessionStorage: window.sessionStorage,
		localStorage: window.localStorage,
		indexedDB: storage('indexedDB'),
		fetch: (...a: unknown[]) => writes.push(`fetch(${a[0]})`),
		navigator: { sendBeacon: (...a: unknown[]) => writes.push(`sendBeacon(${a[0]})`) }
	});
	return { anchors, writes };
}

test('captures the referrer host, utm_* values and the landing path', () => {
	const touch = ft.touchFrom(
		`${SITE}/pricing/?utm_source=hn&utm_medium=social&utm_campaign=launch&other=x#top`,
		'https://news.ycombinator.com/item?id=123'
	);
	assert.deepEqual(plain(touch), {
		ak_ref: 'news.ycombinator.com',
		utm_source: 'hn',
		utm_medium: 'social',
		utm_campaign: 'launch',
		ak_landing: '/pricing/'
	});
});

test("keeps only the referrer's host name; drops IPs; our own hosts mean 'not a landing'", () => {
	assert.equal(ft.referrerHost('https://www.google.com/search?q=secret'), 'www.google.com');
	assert.equal(ft.referrerHost('https://audiokit.ai/docs/'), 'self');
	assert.equal(ft.referrerHost('https://console.audiokit.ai/login'), 'self');
	assert.equal(ft.referrerHost('http://192.168.1.10/admin'), '');
	assert.equal(ft.referrerHost('http://[::1]/'), '');
	assert.equal(ft.referrerHost('android-app://com.example'), '');
	assert.equal(ft.referrerHost('not a url'), '');
	assert.equal(ft.referrerHost(''), '');
});

test('a page reached from another audiokit.ai page carries nothing', () => {
	assert.deepEqual(plain(ft.touchFrom(`${SITE}/pricing/?utm_source=x`, `${SITE}/`)), {});
});

test('a direct landing still records its path', () => {
	assert.deepEqual(plain(ft.touchFrom(`${SITE}/`, '')), { ak_landing: '/' });
});

test('cleans and caps visitor-controlled values', () => {
	const long = 'a'.repeat(500);
	const touch = ft.touchFrom(
		`${SITE}/?utm_source=${long}&utm_term=%20two%0A%0Dwords%20&utm_content=%20`,
		''
	);
	assert.equal(touch.utm_source.length, 100);
	assert.equal(touch.utm_term, 'two words');
	assert.ok(!('utm_content' in touch), 'an empty value is not sent');
	const email = ft.touchFrom(`${SITE}/?utm_source=jane%40example.com&utm_medium=email`, '');
	assert.ok(!('utm_source' in email), 'an email-like value is dropped');
	assert.equal(email.utm_medium, 'email');
});

test('only same-origin sign-up and sign-in links are decorated', () => {
	const touch = { ak_ref: 'example.org', utm_source: 'hn', ak_landing: '/' };
	const [signup, login, keys, docs, other] = links(
		'/signup',
		'/login?next=%2Fapi-keys&utm_source=keep',
		'/api-keys',
		'/docs/',
		'https://example.com/signup'
	);
	assert.equal(ft.decorate([signup, login, keys, docs, other], SITE, touch), 2);
	const s = new URL(signup.href);
	assert.equal(s.origin, SITE);
	assert.equal(s.searchParams.get('ak_ref'), 'example.org');
	assert.equal(s.searchParams.get('utm_source'), 'hn');
	assert.equal(s.searchParams.get('ak_landing'), '/');
	const l = new URL(login.href);
	assert.equal(l.searchParams.get('next'), '/api-keys');
	assert.equal(l.searchParams.get('utm_source'), 'keep', 'a value already on the link wins');
	assert.equal(keys.href, '/api-keys');
	assert.equal(docs.href, '/docs/');
	assert.equal(other.href, 'https://example.com/signup');
});

test('in the page: links on its own origin are decorated and nothing is written to the device (0041)', () => {
	const { anchors, writes } = runInPage({
		href: `${SITE}/?utm_source=hn`,
		referrer: 'https://news.ycombinator.com/',
		hrefs: ['/signup', '/pricing/']
	});
	assert.equal(
		anchors[0].href,
		`${SITE}/signup?ak_ref=news.ycombinator.com&utm_source=hn&ak_landing=%2F`
	);
	assert.equal(anchors[1].href, '/pricing/');
	assert.deepEqual(writes, [], 'no storage, cookie or network call');
});

test('in the page: on the console host before the cut-over, its own links are decorated too', () => {
	const { anchors } = runInPage({
		href: 'https://console.audiokit.ai/pricing/?utm_source=hn',
		referrer: '',
		hrefs: ['/login']
	});
	assert.equal(
		anchors[0].href,
		'https://console.audiokit.ai/login?utm_source=hn&ak_landing=%2Fpricing%2F'
	);
});

test('in the page: after navigating within the site, links are left alone', () => {
	const { anchors, writes } = runInPage({
		href: `${SITE}/pricing/`,
		referrer: `${SITE}/`,
		hrefs: ['/signup']
	});
	assert.equal(anchors[0].href, '/signup');
	assert.deepEqual(writes, []);
});

test('the source names no storage API at all', () => {
	const code = source.replace(/\/\/.*$/gm, '');
	assert.doesNotMatch(
		code,
		/sessionStorage|localStorage|indexedDB|document\.cookie|fetch\(|sendBeacon|XMLHttpRequest/
	);
});

test('every public page loads the script, with no origin named', () => {
	for (const indexable of [true, false]) {
		const head = publicHead(indexable, {});
		assert.match(head, /<script src="[^"]*first-touch[^"]*" defer><\/script>/);
		assert.doesNotMatch(head, /data-console-url/);
	}
});
