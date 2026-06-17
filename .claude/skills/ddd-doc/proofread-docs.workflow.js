// ddd-doc: light proofreading pass over the technical `docs` layer with Haiku.
// This CORRECTS existing docs — typos, grammar, agreement, punctuation — WITHOUT
// changing meaning, rewriting, or touching code symbols in `backticks`.
//
// Precondition: /tmp/docs-proofread.json exists — a JSON array of {module,id,docs}
// for every component that HAS a `docs` value.
// Each agent writes the corrected text to /tmp/ddd-docs-proofed/<module>/<id>.md
// (distinct path → parallel-safe). Then OVERWRITE-merge:
//   pnpm --filter @repo/system-board apply-docs /tmp/ddd-docs-proofed docs --overwrite
// Editing is high-judgment (a weak editor "improves" = breaks meaning; Haiku regressed ~13%
// of edits), so this defaults to SONNET. Always review the git diff afterwards regardless.
// Override with Workflow({ ..., args: { model: "haiku" } }).
export const meta = {
  name: 'ddd-doc-proofread',
  description: 'Light proofreading of technical docs prose (typos/grammar only; Sonnet — review diff after)',
  phases: [
    { title: 'plan', detail: 'read the docs-to-proofread list' },
    { title: 'proofread', detail: 'one agent per component → write corrected md' },
  ],
}

const MODEL = (typeof args === 'object' && args && args.model) || 'sonnet'

const ITEMS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          module: { type: 'string' },
          id: { type: 'string' },
          docs: { type: 'string' },
        },
        required: ['module', 'id', 'docs'],
      },
    },
  },
  required: ['items'],
}

phase('plan')
const plan = await agent(
  'Read the file /tmp/docs-proofread.json (a JSON array of DDD component docs to proofread). Return its contents EXACTLY as the structured `items` array — do not add, drop, or modify any element.',
  { schema: ITEMS_SCHEMA, label: 'load-proofread' }
)
const items = (plan && plan.items) || []
log(`proofreading docs for ${items.length} components (model: ${MODEL})`)

function proofreadPrompt(it) {
  return [
    `You are a Russian-language COPY EDITOR doing a LIGHT proofread of one technical`,
    `documentation string. Your job is correctness, NOT rewriting.`,
    ``,
    `FIX ONLY: spelling/typos, grammar, case/agreement, punctuation, doubled words,`,
    `obvious word-order slips. Keep the exact same meaning, length, and structure.`,
    ``,
    `DO NOT: rephrase for "style", change technical claims, add or remove information,`,
    `change markdown structure (paragraphs/line breaks), translate anything, or touch`,
    `ANYTHING inside \`backticks\` (code symbols — copy them verbatim, even if they look odd).`,
    `If the text is already correct, output it UNCHANGED.`,
    ``,
    `Text to proofread (between the markers, markers not included):`,
    `<<<DOC`,
    it.docs,
    `DOC`,
    ``,
    `Use the Write tool to write ONLY the corrected text (no code fences, no commentary,`,
    `no "Вот исправленный текст") to EXACTLY this path:`,
    `/tmp/ddd-docs-proofed/${it.module}/${it.id}.md`,
    `Finally return the single word: ok`,
  ].join('\n')
}

phase('proofread')
const results = await parallel(
  items.map((it) => () =>
    agent(proofreadPrompt(it), { model: MODEL, label: `${it.module}/${it.id}`, phase: 'proofread' })
  )
)
const ok = results.filter(Boolean).length
log(`proofread ${ok}/${items.length} component docs`)
return { planned: items.length, proofread: ok }
