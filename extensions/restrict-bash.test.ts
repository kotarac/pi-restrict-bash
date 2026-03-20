import assert from 'node:assert/strict'
import test from 'node:test'
import shellExtension from './restrict-bash.ts'

type ToolCallHandler = (event: unknown, ctx?: unknown) => unknown | Promise<unknown>

test('blocks forbidden built-in tools', async () => {
  const handler = createToolCallHandler()
  const grepResult = await handler({ toolName: 'grep', input: { pattern: 'x', path: '.' } })
  assert.ok(isBlocked(grepResult))
  assert.match(grepResult.reason, /The `grep` tool is blocked/)
  const lsResult = await handler({ toolName: 'ls', input: { path: '.' } })
  assert.ok(isBlocked(lsResult))
  assert.match(lsResult.reason, /The `ls` tool is blocked/)
})

test('blocks bash tool calls without a command', async () => {
  const handler = createToolCallHandler()
  const result = await handler({ toolName: 'bash', input: {} })
  assert.ok(isBlocked(result))
  assert.match(result.reason, /called without a command/)
})

test('blocks command substitution and variable expansion', async () => {
  const handler = createToolCallHandler()
  const backticks = await handler({ toolName: 'bash', input: { command: 'echo `date`' } })
  assert.ok(isBlocked(backticks))
  assert.match(backticks.reason, /backticks/)
  const dollarParens = await handler({ toolName: 'bash', input: { command: 'echo $(date)' } })
  assert.ok(isBlocked(dollarParens))
  assert.match(dollarParens.reason, /\$\(\)/)
  const variableExpansion = await handler({ toolName: 'bash', input: { command: 'echo $HOME' } })
  assert.ok(isBlocked(variableExpansion))
  assert.match(variableExpansion.reason, /Variable expansion/)
})

test('blocks redirects, subshell syntax, and background execution', async () => {
  const handler = createToolCallHandler()
  const redirect = await handler({ toolName: 'bash', input: { command: 'echo hi > out.txt' } })
  assert.ok(isBlocked(redirect))
  assert.match(redirect.reason, /Redirection/)
  const subshell = await handler({ toolName: 'bash', input: { command: '(echo hi)' } })
  assert.ok(isBlocked(subshell))
  assert.match(subshell.reason, /Subshell/)
  const background = await handler({ toolName: 'bash', input: { command: 'sleep 1 &' } })
  assert.ok(isBlocked(background))
  assert.match(background.reason, /Background execution/)
})

test('blocks unterminated quotes', async () => {
  const handler = createToolCallHandler()
  const result = await handler({ toolName: 'bash', input: { command: 'echo "hi' } })
  assert.ok(isBlocked(result))
  assert.match(result.reason, /Unterminated quotes/)
})

test('blocks wrapper and search/listing commands', async () => {
  const handler = createToolCallHandler()
  const wrapper = await handler({ toolName: 'bash', input: { command: 'eval echo hi' } })
  assert.ok(isBlocked(wrapper))
  assert.match(wrapper.reason, /wrapper command is blocked/)
  const listing = await handler({ toolName: 'bash', input: { command: 'command ls -la' } })
  assert.ok(isBlocked(listing))
  assert.match(listing.reason, /search\/listing command is blocked/)
})

test('blocks sed in-place edits', async () => {
  const handler = createToolCallHandler()
  const result = await handler({ toolName: 'bash', input: { command: "sed -i 's/a/b/' file.txt" } })
  assert.ok(isBlocked(result))
  assert.match(result.reason, /sed -i/)
})

test('blocks git commands that can mutate the repo, allows safe reads', async () => {
  const handler = createToolCallHandler()
  const status = await handler({ toolName: 'bash', input: { command: 'git status' } })
  assert.equal(status, undefined)
  const commit = await handler({ toolName: 'bash', input: { command: 'git commit -m msg' } })
  assert.ok(isBlocked(commit))
  assert.match(commit.reason, /git commit/)
  const commitWithGlobalFlag = await handler({ toolName: 'bash', input: { command: 'git -c foo=bar commit -m msg' } })
  assert.ok(isBlocked(commitWithGlobalFlag))
  assert.match(commitWithGlobalFlag.reason, /git commit/)
  const statusWithCwdFlag = await handler({ toolName: 'bash', input: { command: 'git -C repo status' } })
  assert.equal(statusWithCwdFlag, undefined)
})

test('blocks shell control-flow keywords', async () => {
  const handler = createToolCallHandler()
  const result = await handler({ toolName: 'bash', input: { command: 'if true; then echo ok; fi' } })
  assert.ok(isBlocked(result))
  assert.match(result.reason, /control-flow keyword/)
})

function createToolCallHandler(): ToolCallHandler {
  let toolCallHandler: ToolCallHandler | undefined
  const pi = {
    on: (eventName: string, handler: ToolCallHandler) => {
      if (eventName !== 'tool_call') return
      toolCallHandler = handler
    },
  }
  shellExtension(pi as never)
  assert.ok(toolCallHandler)
  return toolCallHandler
}

function isBlocked(value: unknown): value is { block: true; reason: string } {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { block?: unknown; reason?: unknown }
  return candidate.block === true && typeof candidate.reason === 'string'
}
