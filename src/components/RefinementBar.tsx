import type { Refinements } from '../types'

interface Props {
  value: Refinements
  onChange: (next: Refinements) => void
  disabled: boolean
}

/**
 * Four dials, and no more.
 *
 * The brief asks for a *lightweight* refinement control, which is a constraint worth
 * honouring literally: every extra filter is a decision the user has to make before they
 * are allowed to see anything, and this product's promise is that you type an idea and get
 * names. Each control here changes the output audibly. Anything that did not was cut.
 *
 * Built as radio groups rather than selects because there are three options each — a
 * select hides two of the three behind a click for no gain, and these are choices you make
 * by comparing, not by knowing.
 */
export function RefinementBar({ value, onChange, disabled }: Props) {
  const set = <K extends keyof Refinements>(key: K, next: Refinements[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
      <Group
        label="Length"
        name="length"
        options={[
          ['short', 'Short'],
          ['medium', 'Medium'],
          ['long', 'Long'],
        ]}
        value={value.length}
        onChange={(next) => set('length', next as Refinements['length'])}
        disabled={disabled}
      />
      <Group
        label="Sound"
        name="sound"
        options={[
          ['softer', 'Softer'],
          ['balanced', 'Balanced'],
          ['stronger', 'Stronger'],
        ]}
        value={value.sound}
        onChange={(next) => set('sound', next as Refinements['sound'])}
        disabled={disabled}
      />
      <Group
        label="Feel"
        name="era"
        options={[
          ['ancient', 'Ancient'],
          ['balanced', 'Balanced'],
          ['modern', 'Modern'],
        ]}
        value={value.era}
        onChange={(next) => set('era', next as Refinements['era'])}
        disabled={disabled}
      />
      <Group
        label="Results"
        name="count"
        options={[
          ['6', '6'],
          ['9', '9'],
          ['12', '12'],
        ]}
        value={String(value.count)}
        onChange={(next) => set('count', Number(next))}
        disabled={disabled}
      />
    </div>
  )
}

interface GroupProps {
  label: string
  name: string
  options: [string, string][]
  value: string
  onChange: (next: string) => void
  disabled: boolean
}

/**
 * A real radio group: arrow keys move between options and only the checked one is in the
 * tab order, which is what a native group does and what a row of buttons would not.
 */
function Group({ label, name, options, value, onChange, disabled }: GroupProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="label mb-2">{label}</legend>
      <div className="flex rounded-lg border border-ink-800 p-0.5">
        {options.map(([option, text]) => {
          const checked = option === value
          return (
            <label
              key={option}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors ${
                checked
                  ? 'bg-ink-800 text-ink-100'
                  : 'text-ink-400 hover:text-ink-200'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={checked}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {text}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
