<script lang="ts">
	export type BadgeStatus =
		| 'succeeded'
		| 'running'
		| 'queued'
		| 'failed'
		| 'active'
		| 'revoked'
		| 'paid'
		| 'open'
		| 'past due'
		| 'within quota'
		| 'quota reached'
		| 'overage';

	type Props = { status: BadgeStatus };

	let { status }: Props = $props();

	const tones: Record<BadgeStatus, { tone: string; label: string }> = {
		succeeded: { tone: 'ok', label: 'succeeded' },
		running: { tone: 'accent', label: 'running' },
		queued: { tone: 'muted', label: 'queued' },
		failed: { tone: 'warn', label: 'failed' },
		active: { tone: 'accent', label: 'active' },
		revoked: { tone: 'muted', label: 'revoked' },
		paid: { tone: 'ok', label: 'paid' },
		open: { tone: 'accent', label: 'open' },
		'past due': { tone: 'warn', label: 'past due' },
		'within quota': { tone: 'ok', label: 'within quota' },
		'quota reached': { tone: 'warn', label: 'quota reached' },
		overage: { tone: 'warn', label: 'overage' }
	};

	const tone = $derived(tones[status] ?? { tone: 'muted', label: status });
</script>

<span class="badge badge-{tone.tone}">
	<span class="badge-dot" aria-hidden="true"></span>
	{tone.label}
</span>
