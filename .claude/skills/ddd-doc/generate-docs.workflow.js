// ddd-doc: generate Russian markdown `docs` for undocumented DDD components.
// Each agent READS the component's source and writes the technical doc — comprehension is
// the judgment here, so this layer defaults to SONNET. Override for a cheap draft:
//   Workflow({ scriptPath: ".../generate-docs.workflow.js", args: { model: "haiku" } })
// Precondition: /tmp/undoc.json exists — a JSON array of {module,id,type,name,summary,file,rel}
// for every component lacking `docs` (derive it from system-map.generated.json after `generate`).
// Each agent writes ONE file /tmp/ddd-docs/<module>/<id>.md (distinct path → parallel-safe).
// Then merge deterministically:  pnpm --filter @repo/system-board apply-docs /tmp/ddd-docs
export const meta = {
  name: 'ddd-doc-generate',
  description: 'Generate Russian markdown docs for undocumented DDD components (Sonnet reads source + writes; override args.model)',
  phases: [
    { title: 'plan', detail: 'read the undocumented-components list' },
    { title: 'docs', detail: 'one agent per component reads source → writes md file' },
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
          type: { type: 'string' },
          name: { type: 'string' },
          summary: { type: 'string' },
          file: { type: ['string', 'null'] },
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
  'Read the file /tmp/undoc.json (a JSON array of DDD components needing documentation). Return its contents EXACTLY as the structured `items` array — do not add, drop, or modify any element.',
  { schema: ITEMS_SCHEMA, label: 'load-undoc' }
)
const items = (plan && plan.items) || []
log(`planning docs for ${items.length} components (model: ${MODEL})`)

function docPrompt(it) {
  const src = it.file
    ? `Source file: ${it.file}\nREAD IT FIRST with the Read tool and ground the doc in the ACTUAL code — real symbol names, real behavior. Do not invent.`
    : `(No single source file — document from the role/relations above.)`
  return [
    `You are documenting ONE element of the DDD model for the MadOS "${it.module}" bounded context,`,
    `for an internal architecture viewer. Be accurate, not generic.`,
    ``,
    `Element: ${it.type} «${it.name}» (id: ${it.id})`,
    `Summary: ${it.summary || '(none)'}`,
    `Relations: ${it.rel || '(none)'}`,
    src,
    ``,
    `Write a CONCISE Russian markdown description:`,
    `- 2–4 sentences, max ~55 words. No headings, no bullet lists, no preamble like "Вот описание".`,
    `- Explain WHAT it is and its role in the flow. If you read code, reference real symbols in \`backticks\`.`,
    `- House style is terse and factual, e.g.: "Корень агрегата Presale. Нормализованное представление запроса клиента; единственная точка входа в домен."`,
    `- Russian prose; keep technical terms and code symbols in English.`,
    ``,
    `Then use the Write tool to write ONLY that markdown (no code fences, nothing else) to EXACTLY this path:`,
    `/tmp/ddd-docs/${it.module}/${it.id}.md`,
    `Finally return the single word: ok`,
  ].join('\n')
}

phase('docs')
const results = await parallel(
  items.map((it) => () =>
    agent(docPrompt(it), { model: MODEL, label: `${it.module}/${it.id}`, phase: 'docs' })
  )
)
const ok = results.filter(Boolean).length
log(`generated ${ok}/${items.length} component docs`)
return { planned: items.length, generated: ok }
