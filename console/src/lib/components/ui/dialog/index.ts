import { Dialog as DialogPrimitive } from 'bits-ui';
import Body from './dialog-body.svelte';
import Content from './dialog-content.svelte';
import Description from './dialog-description.svelte';
import Footer from './dialog-footer.svelte';
import Header from './dialog-header.svelte';
import Overlay from './dialog-overlay.svelte';
import Title from './dialog-title.svelte';

const Root = DialogPrimitive.Root;
const Trigger = DialogPrimitive.Trigger;
const Close = DialogPrimitive.Close;

export {
	Root,
	Trigger,
	Close,
	Overlay,
	Content,
	Header,
	Body,
	Footer,
	Title,
	Description,
	//
	Root as Dialog,
	Trigger as DialogTrigger,
	Close as DialogClose,
	Overlay as DialogOverlay,
	Content as DialogContent,
	Header as DialogHeader,
	Body as DialogBody,
	Footer as DialogFooter,
	Title as DialogTitle,
	Description as DialogDescription
};
