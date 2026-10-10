/** Adapt the public Chat tool tree, including PTC subcalls, to Univer's existing reducer. */
export function projectUniverToolRoots(roots, reducers) {
  const operations = new Map()
  const pending = [...roots].reverse()
  while (pending.length !== 0) {
    const block = pending.pop()
    pending.push(...[...(block.subCalls ?? [])].reverse())
    if (block.phase === 'preparing' || (block.name !== '' && !block.name.startsWith('univer_'))) continue
    operations.set(block.callId, block)
  }
  // Completion order is significant for ready/merge followed by read-only calls.
  const ordered = [...operations.values()].sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity))
  let state = { files: [] }
  for (const block of ordered) {
    const argumentsRaw = block.call?.argsRaw ?? block.argsRaw ?? JSON.stringify(Object.fromEntries(
      ['file', 'action', 'worktreeId', 'unitId'].map(key => [key, block.args.value(key)]),
    ))
    state = reducers.addCall(state, { callId: block.callId, name: block.name, arguments: argumentsRaw })
    if (block.kind === 'tool-result') {
      state = reducers.applyResult(state, {
        message: { toolCallId: block.callId, content: block.content, isError: block.isError },
        error: block.error,
      })
    }
  }
  return state.files
}

const emptyTools = Object.freeze([])
const emptySource = { subscribe: () => () => {}, getSnapshot: () => emptyTools }

/** Nested PTC updates notify this source without replacing the Chat node store or timeline. */
export function useUniverTurnTools(React, nodes, turn) {
  const source = React.useMemo(
    () => turn === undefined ? emptySource : nodes.turnDataSource(turn, 'tool-call'),
    [nodes, turn],
  )
  return React.useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
}
