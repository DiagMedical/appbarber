/**
 * Componente Form customizado — substitui o shadcn/ui form sem deps externas do Radix.
 * Estratégia: FormField usa useFormContext() internamente, sem prop `control` explícita.
 * Isso elimina o conflito de generics TTransformedValues do react-hook-form v7+.
 */
import * as React from 'react'
import {
  Controller,
  FormProvider,
  useFormContext,
  type FieldPath,
  type FieldValues,
  type ControllerRenderProps,
  type ControllerFieldState,
  type UseFormStateReturn,
} from 'react-hook-form'
import { cn } from '@/lib/utils'

// ─── Form (provider wrapper) ────────────────────────────────────────────────────
const Form = FormProvider

// ─── FormField ──────────────────────────────────────────────────────────────────
type FormFieldContextValue = { name: string }
const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
  /** Optional – ignored but accepted for API compat with shadcn callers. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control?: any
  defaultValue?: TFieldValues[TName]
  disabled?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: any
  shouldUnregister?: boolean
  render: (props: {
    field: ControllerRenderProps<TFieldValues, TName>
    fieldState: ControllerFieldState
    formState: UseFormStateReturn<TFieldValues>
  }) => React.ReactElement
}

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ name, render, defaultValue, disabled, rules, shouldUnregister }: FormFieldProps<TFieldValues, TName>) {
  // Always use FormProvider context — avoids the 3rd-generic mismatch on Control.
  const { control } = useFormContext<TFieldValues>()
  return (
    <FormFieldContext.Provider value={{ name: name as string }}>
      <Controller
        name={name}
        control={control}
        render={render}
        defaultValue={defaultValue}
        disabled={disabled}
        rules={rules}
        shouldUnregister={shouldUnregister}
      />
    </FormFieldContext.Provider>
  )
}

// ─── FormItem ────────────────────────────────────────────────────────────────────
type FormItemContextValue = { id: string }
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn('grid gap-1.5', className)} {...props} />
    </FormItemContext.Provider>
  )
}

// ─── useFormField ────────────────────────────────────────────────────────────────
function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()
  const fieldState = getFieldState(fieldContext.name, formState)
  if (!fieldContext.name) throw new Error('useFormField must be used within <FormField>')
  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-item`,
    formMessageId: `${itemContext.id}-msg`,
    ...fieldState,
  }
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
