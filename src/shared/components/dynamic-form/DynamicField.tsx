import { useId } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type UseFormGetValues,
} from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { DynamicFieldRenderer } from "./fieldRenderers";
import type {
  DynamicFieldDefinition,
  DynamicSelectOptionsState,
} from "./dynamicForm.types";

interface DynamicFieldProps<
  TInput extends FieldValues,
  TOutput extends FieldValues,
> {
  definition: DynamicFieldDefinition<TInput>;
  control: Control<TInput, undefined, TOutput>;
  getValues: UseFormGetValues<TInput>;
  disabled: boolean;
  options?: DynamicSelectOptionsState;
}

/** Connect one field to RHF and keep its label, guidance, and errors accessible. */
export function DynamicField<
  TInput extends FieldValues,
  TOutput extends FieldValues,
>({
  definition,
  control,
  getValues,
  disabled,
  options,
}: DynamicFieldProps<TInput, TOutput>) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const optionsId = `${id}-options`;
  return (
    <Controller
      name={definition.name}
      control={control}
      render={({ field, fieldState }) => {
        const describedBy =
          [
            definition.description ? descriptionId : "",
            fieldState.error ? errorId : "",
            options ? optionsId : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined;
        return (
          <div className="space-y-2">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-foreground"
            >
              {definition.label}
            </label>
            {/* Read the current value so clearing a number to undefined does not
              visually restore Controller's original default value. */}
            <DynamicFieldRenderer
              {...definition}
              id={id}
              name={field.name}
              value={getValues(definition.name)}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              // Disable the DOM control, preserving its value for schema validation.
              disabled={
                disabled || Boolean(options?.isLoading || options?.error)
              }
              invalid={Boolean(fieldState.error)}
              describedBy={describedBy}
              options={options?.items}
            />
            {definition.description ? (
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {definition.description}
              </p>
            ) : null}
            {options ? (
              <div id={optionsId} className="text-sm text-muted-foreground">
                {options.isLoading ? (
                  <p role="status">Loading options…</p>
                ) : options.error ? (
                  <div role="alert" className="text-red-600">
                    <p>{options.error}</p>
                    {options.onRetry ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={options.onRetry}
                        disabled={disabled}
                      >
                        Retry options
                      </Button>
                    ) : null}
                  </div>
                ) : options.items.length === 0 ? (
                  <p>No options available.</p>
                ) : null}
              </div>
            ) : null}
            {fieldState.error ? (
              <p id={errorId} role="alert" className="text-sm text-red-600">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        );
      }}
    />
  );
}
