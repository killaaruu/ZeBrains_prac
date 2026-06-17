// ddd-doc: generate the plain-language `overview` layer for DDD components with Haiku.
// The `overview` is the SIMPLE read (1–2 sentences, no code symbols, business meaning);
// the technical `docs` layer is left untouched. We distill the overview FROM the existing
// technical `docs` + summary + relations — no source re-read — so the two layers stay
// consistent and the run stays cheap.
//
// Precondition: /tmp/no-overview.json exists — a JSON array of
//   {module,id,type,name,summary,docs,rel} for every component lacking `overview`.
// Each agent writes ONE file /tmp/ddd-overview/<module>/<id>.md (distinct path → parallel-safe).
// Then merge deterministically:  pnpm --filter @repo/system-board apply-docs /tmp/ddd-overview overview
// Low-judgment layer (rephrase already-verified docs, no source read) → defaults to HAIKU.
// Override with Workflow({ ..., args: { model: "sonnet" } }).
export const meta = {
  name: 'ddd-doc-overview',
  description: 'Generate plain-language overview prose for DDD components (Haiku distils from docs; override args.model)',
  phases: [
    { title: 'plan', detail: 'read the components-needing-overview list' },
    { title: 'overview', detail: 'one agent per component → write md file' },
  ],
}

const MODEL = (typeof args === 'object' && args && args.model) || 'haiku'

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
          type: { type: 'string' },
          name: { type: 'string' },
          summary: { type: 'string' },
          docs: { type: 'string' },
          rel: { type: 'string' },
        },
        required: ['module', 'id', 'type', 'name'],
      },
    },
  },
  required: ['items'],
}

phase('plan')
const plan = await agent(
  'Read the file /tmp/no-overview.json (a JSON array of DDD components needing a plain-language overview). Return its contents EXACTLY as the structured `items` array — do not add, drop, or modify any element.',
  { schema: ITEMS_SCHEMA, label: 'load-no-overview' }
)
const items = (plan && plan.items) || []
log(`planning overview for ${items.length} components (model: ${MODEL})`)

function overviewPrompt(it) {
  return [
    `You are writing the SIMPLE overview line for ONE element of the MadOS "${it.module}" DDD model,`,
    `shown at the top of an internal architecture viewer for someone skimming, BEFORE they dig into details.`,
    ``,
    `Element: ${it.type} «${it.name}» (id: ${it.id})`,
    `Summary: ${it.summary || '(none)'}`,
    `Relations: ${it.rel || '(none)'}`,
    `Existing technical description (your source of truth — distill from it, do NOT contradict it):`,
    it.docs ? it.docs : '(none — write from the type/name/summary/relations above)',
    ``,
    `Write a PLAIN-LANGUAGE Russian overview:`,
    `- 1–2 sentences, max ~35 words. What it is and why it matters in the business flow.`,
    `- NO code symbols, NO backticks, NO field lists, NO Zod/type/enum jargon. A non-engineer should follow it.`,
    `- No headings, no bullets, no preamble like "Это" or "Вот описание". Just the sentences.`,
    `- Russian prose, terse and factual. Example tone: "Заявка клиента на адаптацию резюме под конкретную вакансию — точка входа всего процесса."`,
    ``,
    `Then use the Write tool to write ONLY that text (no code fences, nothing else) to EXACTLY this path:`,
    `/tmp/ddd-overview/${it.module}/${it.id}.md`,
    `Finally return the single word: ok`,
  ].join('\n')
}

phase('overview')
const results = await parallel(
  items.map((it) => () =>
    agent(overviewPrompt(it), { model: MODEL, label: `${it.module}/${it.id}`, phase: 'overview' })
  )
)
const ok = results.filter(Boolean).length
log(`generated ${ok}/${items.length} component overviews`)
return { planned: items.length, generated: ok }
