<script lang="ts">
	import { Badge, type BadgeTone } from '#lib/components/ui/badge/index.js';

	export type BadgeStatus =
		| 'succeeded'
		| 'running'
		| 'queued'
		| 'failed'
		| 'active'
		| 'revoked'
		| 'paid'
		| 'open'
		| 'past due';

	type Props = { status: BadgeStatus };

	let { status }: Props = $props();

	const tones: Record<BadgeStatus, BadgeTone> = {
		succeeded: 'ok',
		running: 'accent',
		queued: 'muted',
		failed: 'warn',
		active: 'accent',
		revoked: 'muted',
		paid: 'ok',
		open: 'accent',
		'past due': 'warn'
	};
</script>

<Badge tone={tones[status] ?? 'muted'}>{status}</Badge>
