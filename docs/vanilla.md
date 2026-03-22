# Vanilla JS / TypeScript

## Basic Setup

```html
<!-- index.html -->
<div id="kuflow" style="width: 100vw; height: 100vh;"></div>
```

```ts
import 'kuflow/css'
import { Kuflow } from 'kuflow'
import { NodeBasic, NodePort } from 'kuflow/renderable'

const kuflow = new Kuflow({
  parent: document.querySelector<HTMLDivElement>('#kuflow')!,
  disablePatternBackground: false, // set true to hide dot grid
})
```

## Creating Nodes

```ts
import { NodeBasic, NodePort } from 'kuflow/renderable'

const node = kuflow.add(new NodeBasic('node-1', {
  title: 'Add',
  position: { x: 100, y: 150 },

  ports: {
    input: [
      new NodePort('n1-in-a', 'A', ['number']),
      new NodePort('n1-in-b', 'B', ['number']),
    ],
    output: [
      new NodePort('n1-out', 'Result', ['number']),
    ],
  },

  onMount(body) {
    body.innerHTML = `<input name="label" type="text" placeholder="Node label" />`
  },
}))
```

## Connecting Ports

Pass the output port ID as the first argument and the input port ID as the second. Kuflow validates types, prevents duplicate inputs, and runs cycle detection.

```ts
kuflow.connect('n1-out', 'n2-in-a')
```

## Listening to Events

`addEventListener` returns an unsubscribe function.

```ts
// Node focused
const off = kuflow.addEventListener('node.focus', (node, toolbar) => {
  console.log('focused node:', node.id)
})

// Zoom / pan
kuflow.addEventListener('zoom-pan', ({ x, y, k }) => {
  console.log('transform:', x, y, k)
})

// Canvas updated (fires each render frame that had dirty nodes)
kuflow.addEventListener('canvas.update', () => {
  console.log('canvas updated')
})

// Unsubscribe
off()
```

Available events: `'zoom'`, `'pan'`, `'zoom-pan'`, `'node.focus'`, `'node.error'`, `'canvas.update'`, `'port.mousedown'`, `'port.mousemove'`, `'port.mouseup'`.

## Exporting Graph State

```ts
const graph = kuflow.export()
console.log(graph)
/*
{
  x: 0, y: 0, k: 1,          // current pan/zoom
  nodes: [ { id, _ref, parameters, position, ports } ],
  edges: [ [{ id, node_id }, { id, node_id }] ]
}
*/
```

## Restoring a Saved Graph

Pass the saved export as the `model` option:

```ts
const saved = JSON.parse(localStorage.getItem('graph')!)

const kuflow = new Kuflow({
  parent: document.querySelector('#kuflow')!,
  model: saved,
})
```

## Node Errors

```ts
kuflow.error('node-1', { port: 'n1-in-a', message: 'Type mismatch' })
kuflow.error('node-1', { param: 'label',  message: 'Required' })

kuflow.hasErrors('node-1')   // true
kuflow.getErrors('node-1')   // NodeError[]
kuflow.clearErrors('node-1')
```

## Node Validation

`onValidate` can be async — useful for calling a backend before deciding if the node is valid. `node.validate()` waits for `onMount` to finish first (so React/other frameworks are fully rendered), then runs `onValidate`, then returns `true` if no errors were recorded.

Nodes with errors automatically show a **red ring**. It clears when `kuflow.clearErrors()` is called (which `validate()` does at the start of each run).

```ts
const node = kuflow.add(new NodeBasic('node-1', {
  title: 'Validated Node',
  ports: { input: [], output: [] },

  async onValidate(node) {
    const params = node.parameters as Record<string, FormDataEntryValue>

    // local check
    if (!params.label) {
      kuflow.error(node.id, { param: 'label', message: 'Label is required' })
      return
    }

    // async backend check
    const res = await fetch('/api/validate', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      kuflow.error(node.id, { message: 'Backend validation failed' })
    }
  },
}))

const valid = await node.validate() // true | false
console.log(kuflow.getErrors('node-1'))
```

Listen to validation errors globally:

```ts
kuflow.addEventListener('node.error', (error) => {
  // { nodeId, param?, port?, message }
  console.warn('node error:', error)
})
```

## Using the Node Registry

Define reusable node types once, then instantiate them by name.

```ts
import { Kuflow, NodeRegistry } from 'kuflow'

const registry = new NodeRegistry()

registry.define({
  type: 'math/add',
  title: 'Add',
  inputs: [
    { label: 'A', dataType: ['number'] },
    { label: 'B', dataType: ['number'] },
  ],
  outputs: [
    { label: 'Result', dataType: ['number'] },
  ],
  body(form) {
    form.innerHTML = `<input name="label" type="text" placeholder="Label" />`
  },
  execute({ A, B }) {
    return { Result: A + B }
  },
})

const kuflow = new Kuflow({ parent: container, registry })

// Instantiate from registry
const node = kuflow.createNode('math/add', { position: { x: 200, y: 100 } })
```

## Removing Nodes

```ts
kuflow.remove(node)
```

## Cleanup

```ts
kuflow.destroy()
```

## CSS Theming

Override these CSS custom properties on the container or globally:

```css
#kuflow {
  --kuflow-background: #1a1a2e;
  --kuflow-foreground: #e0e0e0;
  --kuflow-grid:       #2a2a4a;
}
```
