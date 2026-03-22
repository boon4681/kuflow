# Svelte

In Svelte, use the `onMount` / `onDestroy` lifecycle hooks.

## Basic Setup

```svelte
<!-- KuflowEditor.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import 'kuflow/css'
  import { Kuflow } from 'kuflow'
  import { NodeBasic, NodePort } from 'kuflow/renderable'

  let container: HTMLDivElement
  let kuflow: Kuflow

  onMount(() => {
    kuflow = new Kuflow({
      parent: container,
      disablePatternBackground: false,
    })

    kuflow.add(new NodeBasic('node-1', {
      title: 'Source',
      position: { x: 80, y: 120 },
      ports: {
        input: [],
        output: [new NodePort('n1-out', 'Data', ['any'])],
      },
    }))

    kuflow.add(new NodeBasic('node-2', {
      title: 'Sink',
      position: { x: 360, y: 120 },
      ports: {
        input: [new NodePort('n2-in', 'Data', ['any'])],
        output: [],
      },
    }))

    kuflow.connect('n1-out', 'n2-in')
  })

  onDestroy(() => {
    kuflow?.destroy()
  })

  function exportGraph() {
    console.log(kuflow.export())
  }
</script>

<div class="editor-wrap">
  <button on:click={exportGraph}>Export</button>
  <div class="canvas" bind:this={container} />
</div>

<style>
  .editor-wrap {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .canvas {
    flex: 1;
    --kuflow-background: #111827;
    --kuflow-foreground: #f9fafb;
    --kuflow-grid:       #1f2937;
  }
</style>
```

## Mounting a Svelte Component Inside a Node

`onMount` receives the node's `<form>` body element — you can mount any Svelte component into it. Any `<input>`, `<select>`, or `<textarea>` with a `name` attribute will be picked up by `node.parameters` automatically.

```svelte
<!-- NumberInput.svelte -->
<script lang="ts">
  export let label: string
  export let name: string
</script>

<label>
  {label}
  <input {name} type="number" value="0" />
</label>
```

```svelte
<!-- KuflowEditor.svelte -->
<script lang="ts">
  import { onMount, onDestroy, mount, unmount } from 'svelte'
  import { Kuflow } from 'kuflow'
  import { NodeBasic, NodePort } from 'kuflow/renderable'
  import NumberInput from './NumberInput.svelte'
  import 'kuflow/css'

  let container: HTMLDivElement
  let kuflow: Kuflow

  // Track component instances to destroy them later
  const components: SvelteComponent[] = []

  onMount(() => {
    kuflow = new Kuflow({ parent: container })

    kuflow.add(new NodeBasic('node-1', {
      title: 'Multiply',
      ports: {
        input:  [new NodePort('in-a', 'A', ['number']), new NodePort('in-b', 'B', ['number'])],
        output: [new NodePort('out', 'Result', ['number'])],
      },
      onMount(body) {
        onMount(body) {
          const c = mount(NumberInput, { target: body, props: { label: 'Factor', name: 'factor' } })
          components.push(c)
        }
      },
    }))
  })

  onDestroy(() => {
    // cleanup: components.forEach(unmount)
    components.forEach(unmount)
    kuflow?.destroy()
  })
</script>

<div bind:this={container} style="width:100%;height:100vh;" />
```

## Using the Registry + Reactive Export

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Kuflow, NodeRegistry } from 'kuflow'
  import 'kuflow/css'

  let container: HTMLDivElement
  let kuflow: Kuflow
  let graph = $state(null)

  const registry = new NodeRegistry()
  registry.define({
    type: 'math/multiply',
    title: 'Multiply',
    inputs: [
      { label: 'A', dataType: ['number'] },
      { label: 'B', dataType: ['number'] },
    ],
    outputs: [{ label: 'Product', dataType: ['number'] }],
  })

  let offUpdate: (() => void) | undefined

  onMount(() => {
    kuflow = new Kuflow({ parent: container, registry })
    kuflow.createNode('math/multiply', { position: { x: 150, y: 150 } })

    offUpdate = kuflow.addEventListener('canvas.update', () => {
      graph = kuflow.export()
    })
  })

  onDestroy(() => {
    offUpdate?.()
    kuflow?.destroy()
  })
</script>

<div bind:this={container} style="width:100%;height:100vh;" />

{#if graph}
  <pre>{JSON.stringify(graph, null, 2)}</pre>
{/if}
```
