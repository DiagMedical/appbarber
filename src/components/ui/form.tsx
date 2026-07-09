import * as React from 'react'
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { cn } from '@/lib/utils'

// ─── Form (provider wrapper) ────────────────────────────────────────────────────
const Form = FormProvider

// ─── FormField ──────────────────────────────────────────────────────────────────
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName }

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
)

// ─── FormItem ────────────────────────────────────────────────────────────────────
type FormItemContextValue = { id: string }
const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
)

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn('grid gap-1.5', className)} {...props} />
    </FormItemContext.Provider>
  )
}

// ─── useFormField ────────────────────────────────────────────────────────────────
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()
  const fieldState = getFieldState(fieldContext.name, formState)
  if (!fieldContext.name) throw new Error('useFormField must be used within <FormField>')
  return { id: itemContext.id, name: fieldContext.name, formItemId: `${itemContext.id}-item`, formMessageId: `${itemContext.id}-msg`, ...fieldState }
}

// ─── FormLabel ───────────────────────────────────────────────────────────────────
function FormLabel({ className, ...props }: React.ComponentProps<'label'>) {
  const { error, formItemId } = useFormField()
  return (
    <label
      htmlFor={formItemId}
      className={cn('text-sm font-medium', error && 'text-destructive', className)}
      {...props}
    />
  )
}

// ─── FormControl ─────────────────────────────────────────────────────────────────
function FormControl({ children }: { children: React.ReactElement }) {
  const { error, formItemId, formMessageId } = useFormField()
  return React.cloneElement(children, {
    id: formItemId,
    'aria-invalid': !!error,
    'aria-describedby': formMessageId,
  } as React.HTMLAttributes<HTMLElement>)
}

// ─── FormDescription ──────────────────────────────────────────────────────────────
function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />
}

// ─── FormMessage ──────────────────────────────────────────────────────────────────
function FormMessage({ className, children, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? '') : children
  if (!body) return null
  return (
    <p id={formMessageId} className={cn('text-sm font-medium text-destructive', className)} {...props}>
      {body}
    </p>
  )
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
}
