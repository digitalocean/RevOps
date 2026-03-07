/**
 * Unified modal per To-DO spec:
 * Backdrop blur, card max-w-[480px], header with icon + title + subtitle, divider, body, footer.
 * Entry: scale 0.96→1, opacity 0→1, 180ms ease-out.
 */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from './ui/utils';

const ToDoModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[100] bg-black/45 backdrop-blur-[8px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));

const ToDoModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Icon element (e.g. colored 36px rounded-lg bg) */
    icon?: React.ReactNode;
    /** Main title */
    title: string;
    /** Subtitle below title */
    subtitle?: string;
    /** Accent for icon bg: task (green), tracker (blue), workspace (purple), etc. */
    iconVariant?: 'task' | 'tracker' | 'workspace' | 'crew' | 'fields' | 'view' | 'filter' | 'default';
  }
>(({ className, children, icon, title, subtitle, iconVariant = 'default', ...props }, ref) => {
  const iconBg = {
    task: 'bg-[var(--status-on-track)]/10 text-[var(--status-on-track)]',
    tracker: 'bg-[var(--accent)]/10 text-[var(--accent)]',
    workspace: 'bg-[var(--status-in-review)]/10 text-[var(--status-in-review)]',
    crew: 'bg-[var(--priority-p2)]/10 text-[var(--priority-p2)]',
    fields: 'bg-[var(--priority-p1)]/10 text-[var(--priority-p1)]',
    view: 'bg-[var(--accent)]/10 text-[var(--accent)]',
    filter: 'bg-[var(--status-complete)]/10 text-[var(--status-complete)]',
    default: 'bg-[var(--accent)]/10 text-[var(--accent)]',
  }[iconVariant];

  return (
    <DialogPrimitive.Portal>
      <ToDoModalOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[20vh] z-[100] w-full max-w-[480px] translate-x-[-50%]',
          'rounded-2xl border border-[#E8E8EC] bg-white shadow-[0_24px_48px_rgba(0,0,0,0.15)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-[180ms] ease-out',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          {icon != null && (
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="text-base font-semibold text-[#0F0F13]">
              {title}
            </DialogPrimitive.Title>
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-[#6B7280]">{subtitle}</p>
            )}
          </div>
          <DialogPrimitive.Close
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#6B7280] hover:bg-gray-100 focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:outline-none"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="h-px shrink-0 bg-[#F0F0F4]" />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

function ToDoModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-4 px-6 py-5', className)}
      {...props}
    />
  );
}

function ToDoModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex justify-end gap-2.5 px-6 pb-6 pt-4', className)}
      {...props}
    />
  );
}

/** Label for form fields inside modal body (spec: 11px uppercase muted) */
function ToDoModalLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]', className)}
      {...props}
    />
  );
}

/** Standard input style for modal inputs */
const toDoModalInputClass =
  'w-full rounded-lg border-[1.5px] border-[#E4E4EC] px-3.5 py-2.5 text-sm outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/10';

/** Primary CTA button for modal footer */
const toDoModalPrimaryButtonClass =
  'rounded-lg bg-[#6366F1] px-5 py-2 text-sm font-medium text-white hover:bg-[#5254CC] active:scale-[0.98] transition-all duration-150';

/** Cancel/ghost button for modal footer */
const toDoModalCancelButtonClass =
  'rounded-lg px-4 py-2 text-sm text-[#6B7280] hover:bg-gray-100 transition-colors';

const ToDoModal = DialogPrimitive.Root;
const ToDoModalTrigger = DialogPrimitive.Trigger;
const ToDoModalClose = DialogPrimitive.Close;

export {
  ToDoModal,
  ToDoModalTrigger,
  ToDoModalClose,
  ToDoModalContent,
  ToDoModalBody,
  ToDoModalFooter,
  ToDoModalLabel,
  toDoModalInputClass,
  toDoModalPrimaryButtonClass,
  toDoModalCancelButtonClass,
};
