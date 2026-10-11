import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'

import { cn } from '@/shared/lib/utils'

export type Choice<T extends string> = { value: T; label: string; hint?: string; icon?: LucideIcon }

/**
 * One of a few choices, as DESIGN.md's payment tiles: equal tiles, the
 * chosen one on a primary-container fill with a primary border and a
 * primary-strong label. They are radio buttons underneath, so arrow keys and
 * screen readers work as on any radio group; each tile's hint is its
 * button's description, and the whole tile takes the click. Disabled, the
 * choice shows and can't change.
 */
export function ChoiceTiles<T extends string>({
  legend,
  legendStyle = 'label',
  value,
  choices,
  onChange,
  disabled = false,
}: {
  legend: string
  /**
   * The legend as the field's label (the default), or, under a heading that
   * already names the choice, as the heading's description.
   */
  legendStyle?: 'label' | 'description'
  value: T
  choices: Choice<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const name = useId()
  return (
    <fieldset disabled={disabled} className="grid content-start gap-2">
      <legend
        className={cn(
          'mb-2',
          legendStyle === 'label' ? 'text-title-md text-on-surface' : 'text-body-md text-on-surface-variant',
        )}
      >
        {legend}
      </legend>
      <div className={cn('grid gap-2', choices.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {choices.map((choice) => {
          const id = `${name}-${choice.value}`
          const Icon = choice.icon
          return (
            <div
              key={choice.value}
              className="relative grid min-h-11 content-center gap-0.5 rounded-tile border border-outline bg-surface px-3 py-2 text-on-surface has-[:checked]:border-primary has-[:checked]:bg-primary-container has-[:checked]:text-primary-strong has-[:disabled]:opacity-70 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={choice.value}
                checked={value === choice.value}
                onChange={() => onChange(choice.value)}
                aria-describedby={choice.hint ? `${id}-hint` : undefined}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 text-title-md peer-disabled:cursor-not-allowed after:absolute after:inset-0 after:content-['']"
              >
                {Icon && <Icon aria-hidden="true" className="size-5" />}
                {choice.label}
              </label>
              {choice.hint && (
                <p id={`${id}-hint`} className="text-label-md text-on-surface-variant">
                  {choice.hint}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
