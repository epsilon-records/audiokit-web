import { Tooltip as TooltipPrimitive } from 'bits-ui';
import Content from './tooltip-content.svelte';

// A tooltip only repeats what is on the page or in the trigger's accessible name: it can't be
// reached by touch, so nothing should be said only there.
const Root = TooltipPrimitive.Root;
const Trigger = TooltipPrimitive.Trigger;
const Provider = TooltipPrimitive.Provider;

export {
	Root,
	Trigger,
	Content,
	Provider,
	//
	Root as Tooltip,
	Trigger as TooltipTrigger,
	Content as TooltipContent,
	Provider as TooltipProvider
};
