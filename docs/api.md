# API Reference

## `new Kuflow(config)`

| Option                     | Type             | Description                      |
| -------------------------- | ---------------- | -------------------------------- |
| `parent`                   | `HTMLDivElement` | **Required.** Container element. |
| `disablePatternBackground` | `boolean`        | Hide the dot-grid background.    |
| `registry`                 | `NodeRegistry`   | Enable `createNode()`.           |
| `model`                    | `ExportedGraph`  | Initial graph state to restore.  |

## `Kuflow` Methods

| Method                           | Description                                        |
| -------------------------------- | -------------------------------------------------- |
| `add(node)`                      | Add a `NodeBasic` to the canvas. Returns the node. |
| `remove(node)`                   | Remove a node and its connected edges.             |
| `createNode(type, opts?)`        | Instantiate a node from the registry.              |
| `connect(outPortId, inPortId)`   | Create an edge between two ports.                  |
| `getNode(id)`                    | Look up a node by ID.                              |
| `export()`                       | Serialize the full graph.                          |
| `error(nodeId, err)`             | Attach an error to a node.                         |
| `clearErrors(nodeId)`            | Remove all errors from a node.                     |
| `getErrors(nodeId)`              | Get all errors for a node.                         |
| `hasErrors(nodeId)`              | Check if a node has errors.                        |
| `addEventListener(event, cb)`    | Subscribe to an event. Returns unsubscribe fn.     |
| `removeEventListener(event, cb)` | Unsubscribe from an event.                         |
| `destroy()`                      | Tear down the editor and remove from DOM.          |

## `new NodeBasic(id, options?)`

| Option                               | Type                | Description                                                                         |
| ------------------------------------ | ------------------- | ----------------------------------------------------------------------------------- |
| `title`                              | `string`            | Display title of the node.                                                          |
| `position`                           | `{ x, y }`          | Initial position on canvas.                                                         |
| `ports`                              | `{ input, output }` | Arrays of `NodePort` instances.                                                     |
| `onMount(body)`                      | `fn → void \| Promise<void>` | Runs once after DOM creation. May be async — the node blocks `validate()` until it resolves. |
| `onValidate(node)`                   | `fn → void \| Promise<void>` | Called by `node.validate()`. May be async (e.g. backend call). Call `kuflow.error()` inside to report failures. |
| `onPreprocessParameters(node, data)` | `fn`                | Transform `FormData` before it's read.                                              |
| `active`                             | `boolean`           | Initial active/highlight state.                                                     |

### `NodeBasic` Instance Methods

| Method       | Returns            | Description                                                                                           |
| ------------ | ------------------ | ----------------------------------------------------------------------------------------------------- |
| `validate()` | `Promise<boolean>` | Waits for `onMount` to settle, clears existing errors, runs `onValidate`, returns `true` if no errors. |

> **Visual feedback:** when a node has errors (via `kuflow.error()`), it automatically shows a red ring. The ring disappears when `kuflow.clearErrors()` is called.

## `new NodePort(id, label, dataType[], meta?)`

| Param      | Type                     | Description                                        |
| ---------- | ------------------------ | -------------------------------------------------- |
| `id`       | `string`                 | Unique port ID.                                    |
| `label`    | `string`                 | Display label.                                     |
| `dataType` | `string[]`               | Accepted types. First element is the primary type. |
| `meta`     | `{ color?, _ref_name? }` | Override auto-generated port color.                |

## `NodeRegistry`

```ts
const registry = new NodeRegistry()

registry.define({
  type: string,
  title: string,
  inputs?:  { label: string, dataType: string[], defaultValue?: any }[],
  outputs?: { label: string, dataType: string[], defaultValue?: any }[],
  body?(form: HTMLFormElement): void,
  execute?(inputs, params): outputs,
})

registry.get('type')   // NodeDefinition | undefined
registry.has('type')   // boolean
registry.list()        // NodeDefinition[]
```

## Events

| Event              | Callback Signature                                |
| ------------------ | ------------------------------------------------- |
| `'zoom'`           | `(transform: { x, y, k }) => void`                |
| `'pan'`            | `(transform: { x, y, k }) => void`                |
| `'zoom-pan'`       | `(transform: { x, y, k }) => void`                |
| `'node.focus'`     | `(node: NodeBasic, toolbar: HTMLElement) => void` |
| `'node.error'`     | `(error: NodeError) => void`                      |
| `'canvas.update'`  | `() => void`                                      |
| `'port.mousedown'` | `(event: PortMouseDownEvent) => void`             |
| `'port.mousemove'` | `(event: MouseEvent) => void`                     |
| `'port.mouseup'`   | `(event: MouseEvent) => void`                     |

## Export Format

```ts
interface ExportedGraph {
  x: number   // pan X
  y: number   // pan Y
  k: number   // zoom scale
  nodes: Array<{
    id: string
    _ref: string | null
    parameters: Record<string, FormDataEntryValue>
    position: { x: number, y: number }
    ports: {
      input:  Array<{ id: string, type: string[], label: string, meta?: object }>
      output: Array<{ id: string, type: string[], label: string, meta?: object }>
    }
  }>
  edges: Array<[{ id: string, node_id: string }, { id: string, node_id: string }]>
}
```

## CSS Variables

| Variable              | Description              |
| --------------------- | ------------------------ |
| `--kuflow-background` | Canvas background color. |
| `--kuflow-foreground` | Text and element color.  |
| `--kuflow-grid`       | Dot-grid color.          |
