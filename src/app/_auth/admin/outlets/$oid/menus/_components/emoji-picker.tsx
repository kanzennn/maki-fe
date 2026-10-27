import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormField } from '@/components/shared/form-field'
import { cn } from '@/lib/utils'

/** The emoji offered first: food and drink, then a few for anything else. */
const presets = [
  '🍚', '🍛', '🍜', '🍝', '🍲', '🥘', '🍗', '🍖', '🥩', '🍤', '🐟', '🍢',
  '🥟', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🥗', '🍞', '🥐', '🧇', '🥞',
  '🍰', '🍩', '🍪', '🧁', '🍨', '🍧', '🍫', '🍮', '☕', '🍵', '🧋', '🥤',
  '🧃', '🍹', '🥛', '🍺', '🍉', '🍌', '🥥', '🌶️', '🧊', '⭐', '🔥', '🎁',
]

/**
 * A category's icon: none, one of the emoji offered, or any other typed or
 * pasted below them. The offered ones are radio buttons, tiles in
 * DESIGN.md's category-tile style; the server checks that anything typed is
 * an emoji.
 */
export function EmojiPicker({
  value,
  onChange,
  error,
}: {
  /** The emoji, or '' for none. */
  value: string
  onChange: (icon: string) => void
  error?: string
}) {
  const { t } = useTranslation('menu')
  const name = useId()
  const [typed, setTyped] = useState(presets.includes(value) ? '' : value)

  function pick(icon: string) {
    setTyped('')
    onChange(icon)
  }

  return (
    <fieldset className="grid content-start gap-3" aria-describedby={`${name}-hint`}>
      <legend className="mb-1 text-title-md text-on-surface">{t('categories.fields.icon')}</legend>
      <p id={`${name}-hint`} className="text-label-md text-on-surface-variant">
        {t('categories.iconHint')}
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
        <Tile
          name={name}
          icon=""
          label={t('categories.noIcon')}
          checked={value === ''}
          onPick={pick}
          className="col-span-2 text-label-md"
        />
        {presets.map((icon) => (
          <Tile
            key={icon}
            name={name}
            icon={icon}
            label={icon}
            checked={value === icon}
            onPick={pick}
            className="text-headline-lg"
          />
        ))}
      </div>
      <FormField
        label={t('categories.fields.customIcon')}
        hint={t('categories.customIconHint')}
        autoComplete="off"
        value={typed}
        error={error}
        onChange={(e) => {
          setTyped(e.target.value)
          onChange(e.target.value.trim())
        }}
      />
    </fieldset>
  )
}

function Tile({
  name,
  icon,
  label,
  checked,
  onPick,
  className,
}: {
  name: string
  icon: string
  label: string
  checked: boolean
  onPick: (icon: string) => void
  /** The tile's size and its label's text size. */
  className?: string
}) {
  const id = `${name}-${icon || 'none'}`
  return (
    <div
      className={cn(
        'relative grid h-11 place-items-center rounded-tile border border-outline bg-surface text-on-surface has-[:checked]:border-primary has-[:checked]:bg-primary-container-muted has-[:checked]:text-primary-strong has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        className,
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={icon}
        checked={checked}
        onChange={() => onPick(icon)}
        className="sr-only"
      />
      <label htmlFor={id} className="cursor-pointer leading-none after:absolute after:inset-0 after:content-['']">
        {label}
      </label>
    </div>
  )
}
