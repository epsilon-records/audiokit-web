<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	// Copy only, matching audiokit.ai/pricing (AudioKit decisions 0052 and 0057, shared 0040).
	// Nothing here can be bought: the subscription Checkout this page used to post to is being
	// removed from billing (AudioKit 0058), and credit packs are not on sale during the beta.
	// The console itself is removed by EPSILON-169 (AudioKit 0053).
	let { data }: PageProps = $props();

	const planLabel = $derived(
		{ free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }[data.account.plan] ?? data.account.plan
	);
</script>

<svelte:head>
	<title>Plan · AudioKit console</title>
</svelte:head>

<PageHeader
	title="Plan"
	kicker="Pricing"
	description="You're on the {planLabel} plan. AudioKit is priced in prepaid credits, with no subscription. One credit is $0.01."
/>

<div class="notice notice-info" role="note" style="margin-bottom: 24px">
	<span>
		<strong>Credit packs open soon.</strong>
		AudioKit is in beta, and packs can't be bought yet. The prices below are what they will cost when
		they open.
	</span>
</div>

<div class="pricing-grid">
	<article class="pricing-card" class:pricing-card-current={data.account.plan === 'free'}>
		<div class="pricing-header">
			<h2>Free</h2>
			<p class="pricing-description">
				{data.account.plan === 'free'
					? 'Your current plan'
					: 'For trying AudioKit and small projects'}
			</p>
		</div>
		<div class="pricing-price">
			<span class="price-amount">$0</span>
			<span class="price-period">/ month</span>
		</div>
		<ul class="pricing-features">
			<li>100 credits each calendar month (UTC)</li>
			<li>Unspent free credits lapse at the end of the month</li>
			<li>All analysis and processing operations</li>
			<li>HMAC-signed webhook delivery</li>
			<li>No card needed</li>
		</ul>
	</article>

	<article class="pricing-card">
		<span class="pricing-badge">Opens soon</span>
		<div class="pricing-header">
			<h2>Credit packs</h2>
			<p class="pricing-description">One-time purchases, no subscription</p>
		</div>
		<ul class="pricing-features">
			<li>$10 for 1,000 credits</li>
			<li>$50 for 5,500 credits</li>
			<li>$200 for 24,000 credits</li>
			<li>Bought credits stay valid for 12 months after purchase</li>
			<li>Credit packs are non-refundable</li>
		</ul>
		<p class="field-hint">Packs open soon. Nothing can be bought during the beta.</p>
	</article>
</div>

<section class="section-block" style="margin-top: 32px" aria-labelledby="rates-heading">
	<h2 id="rates-heading">What each operation costs</h2>
	<div class="table-box">
		<table>
			<thead>
				<tr><th scope="col">Operation</th><th scope="col">Credits</th></tr>
			</thead>
			<tbody>
				<tr>
					<td
						>Analysis: <code>probe</code>, <code>loudness</code>, <code>waveform</code>,
						<code>tempo</code>, <code>key</code>, <code>fingerprint</code>, <code>tags</code></td
					>
					<td>1 per track</td>
				</tr>
				<tr><td>The <code>analyze</code> bundle</td><td>3 per track</td></tr>
				<tr>
					<td><code>stems</code></td>
					<td>3 per audio minute, metered per second, at least 10 per job</td>
				</tr>
				<tr>
					<td><code>transcode</code>, <code>preview</code>, <code>normalize</code></td>
					<td>1 per audio minute</td>
				</tr>
			</tbody>
		</table>
	</div>
	<p class="muted">
		A per-minute job is accepted when your balance covers the operation's minimum, and charged for
		the audio's real length when it finishes. The full terms are on the
		<a class="link" href="https://audiokit.ai/pricing/">pricing page</a>.
	</p>
</section>
