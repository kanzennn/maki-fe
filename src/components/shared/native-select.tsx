import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Maki: a text-field (44px, icon-muted border). className sizes the
// wrapper, so `w-full` in a form and a fixed width in a filter bar both work.
function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div
      className={cn(
        "group/native-select relative has-[select:disabled]:opacity-50",
        className
      )}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        className={cn(
          "h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-surface py-2 pr-9 pl-3 text-body-md text-on-surface outline-none disabled:pointer-events-none disabled:cursor-not-allowed",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive"
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-icon-muted select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({
  ...props
}: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" {...props} />
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
