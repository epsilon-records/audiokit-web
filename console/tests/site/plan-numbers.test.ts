// The legacy subscription plans are written down in two places in this repo: the console's mock
// fixtures and docs/freemium-plans.md. Ported from the static site's test/plan-numbers.test.mjs
// (EPSILON-169 PR 2), unchanged in substance.
// Source: AudioKit decision 0023 (plans and prices) and 0027 (a stem is billed once). Both are
// superseded by 0052 (prepaid credits); the pricing page states credits and is checked by
// tests/site/pricing-copy.test.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// What 0023 decided. If a number changes here, every artifact has to change with it.
const PLANS = {
	free: { price: '$0', jobs: '100', stems: '10', jobLimit: 100 },
	pro: { price: '$99', year: '$990', jobs: '1,000', stems: '250', jobLimit: 1_000 },
	enterprise: { price: '$499', jobs: '5,000', stems: '1,500', jobLimit: 5_000 }
};

// Every value below is money, so `$` has to be escaped before it reaches a RegExp.
const esc = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const docs = read('../../../docs/freemium-plans.md');
const fixtures = read('../../src/lib/fixtures.ts');

test("the console's mock plans keep the stem allowances from 0023 and state Free in credits", () => {
	assert.match(fixtures, /'100 credits \/ month'/, "fixtures are missing Free's monthly credits");
	assert.doesNotMatch(fixtures, /jobs per month/, 'no fixture may state a job allowance');
	for (const tier of ['pro', 'enterprise'] as const) {
		const plan = PLANS[tier];
		assert.match(
			fixtures,
			new RegExp(esc(`${plan.stems} stem separations included`)),
			`fixtures are missing the ${tier} stem allowance`
		);
	}
	assert.match(fixtures, /jobLimit: 100/);
	assert.match(fixtures, /jobLimit: 1_000/);
	assert.match(fixtures, /jobLimit: 5_000/);
	assert.match(fixtures, /priceMonthly: null/);
});

test('docs/freemium-plans.md agrees on prices, allowances and overage rates', () => {
	for (const plan of Object.values(PLANS)) {
		assert.match(docs, new RegExp(esc(plan.price)), `docs are missing a price (${plan.price})`);
		assert.match(
			docs,
			new RegExp(esc(plan.jobs) + '\\b'),
			`docs are missing an allowance (${plan.jobs})`
		);
		assert.match(
			docs,
			new RegExp(esc(plan.stems) + '\\b'),
			`docs are missing a stem allowance (${plan.stems})`
		);
	}
	assert.match(docs, /\$990\/year/, 'docs lost the annual Pro price');
	assert.match(docs, /`\$0\.15\/stem`, `\$0\.01\/other job`/, 'docs lost the Pro overage rates');
	assert.match(docs, /~`\$0\.08\/stem`/, 'docs lost the Enterprise volume overage rate');
});

test('Free is a hard stop with no overage, in the docs and the console', () => {
	assert.match(docs, /Free plan: no overages — hard stop instead\./);
	const freeBlock = fixtures.slice(fixtures.indexOf("id: 'free'"), fixtures.indexOf("id: 'pro'"));
	assert.doesNotMatch(freeBlock, /\$0\.\d\d/, 'Free must not show an overage rate');
});
