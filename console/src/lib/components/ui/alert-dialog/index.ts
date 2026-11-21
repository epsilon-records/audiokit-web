import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
import Body from '../dialog/dialog-body.svelte';
import Footer from '../dialog/dialog-footer.svelte';
import Header from '../dialog/dialog-header.svelte';
import Cancel from './alert-dialog-cancel.svelte';
import Content from './alert-dialog-content.svelte';
import Description from './alert-dialog-description.svelte';
import Title from './alert-dialog-title.svelte';

const Root = AlertDialogPrimitive.Root;
const Trigger = AlertDialogPrimitive.Trigger;

// The action is the caller's own Button: in the console it is a form's submit button, so the
// request works the same way the page's other forms do.
export {
	Root,
	Trigger,
	Content,
	Header,
	Body,
	Footer,
	Title,
	Description,
	Cancel,
	//
	Root as AlertDialog,
	Trigger as AlertDialogTrigger,
	Content as AlertDialogContent,
	Header as AlertDialogHeader,
	Body as AlertDialogBody,
	Footer as AlertDialogFooter,
	Title as AlertDialogTitle,
	Description as AlertDialogDescription,
	Cancel as AlertDialogCancel
};
