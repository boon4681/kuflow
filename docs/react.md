# React

Kuflow is a vanilla DOM library, so in React you manage the instance via `useRef` and `useEffect`.

## Basic Setup

```tsx
// KuflowEditor.tsx
import { useEffect, useRef } from 'react'
import 'kuflow/css'
import { Kuflow } from 'kuflow'
import { NodeBasic, NodePort } from 'kuflow/renderable'

export function KuflowEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef    = useRef<Kuflow | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const kuflow = new Kuflow({
      parent: containerRef.current,
      disablePatternBackground: false,
    })
    editorRef.current = kuflow

    kuflow.add(new NodeBasic('node-1', {
      title: 'Input',
      position: { x: 80, y: 120 },
      ports: {
        input: [],
        output: [new NodePort('n1-out', 'Value', ['string'])],
      },
      onMount(body) {
        body.innerHTML = `<input name="value" type="text" placeholder="Enter value" />`
      },
    }))

    kuflow.add(new NodeBasic('node-2', {
      title: 'Output',
      position: { x: 350, y: 120 },
      ports: {
        input: [new NodePort('n2-in', 'Value', ['string'])],
        output: [],
      },
    }))

    kuflow.connect('n1-out', 'n2-in')

    const offFocus = kuflow.addEventListener('node.focus', (node) => {
      console.log('focused:', node.id)
    })

    return () => {
      offFocus()
      kuflow.destroy()
      editorRef.current = null
    }
  }, []) // run once on mount

  function handleExport() {
    const graph = editorRef.current?.export()
    console.log(graph)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <button onClick={handleExport}>Export</button>
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  )
}
```

## Mounting a React Component Inside a Node

`onMount` receives the node's `<form>` body element — you can render a full React component into it with `createRoot`. Any `<input>`, `<select>`, or `<textarea>` with a `name` attribute will be picked up by `node.parameters` automatically.

```tsx
import { createRoot, type Root } from 'react-dom/client'

// A normal React component
function NumberInput({ label }: { label: string }) {
  return (
    <label>
      {label}
      <input name={label.toLowerCase()} type="number" defaultValue={0} />
    </label>
  )
}

// Track roots so we can unmount on cleanup
const roots = new Map<string, Root>()

const node = kuflow.add(new NodeBasic('node-1', {
  title: 'Multiply',
  ports: {
    input:  [new NodePort('in-a', 'A', ['number']), new NodePort('in-b', 'B', ['number'])],
    output: [new NodePort('out',  'Result', ['number'])],
  },
  onMount(body) {
    const root = createRoot(body)
    root.render(
      <>
        <NumberInput label="A" />
        <NumberInput label="B" />
      </>
    )
    roots.set('node-1', root)
  },
}))

// Unmount when the node is removed
kuflow.addEventListener('canvas.update', () => {
  if (!kuflow.getNode('node-1')) {
    roots.get('node-1')?.unmount()
    roots.delete('node-1')
  }
})
```

## Using the Node Registry

```tsx
import { useEffect, useRef } from 'react'
import { Kuflow, NodeRegistry } from 'kuflow'
import 'kuflow/css'

const registry = new NodeRegistry()
registry.define({
  type: 'transform/uppercase',
  title: 'Uppercase',
  inputs:  [{ label: 'Text', dataType: ['string'] }],
  outputs: [{ label: 'Result', dataType: ['string'] }],
})

export function RegistryEditor() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const kuflow = new Kuflow({ parent: containerRef.current, registry })

    kuflow.createNode('transform/uppercase', { position: { x: 100, y: 100 } })

    return () => kuflow.destroy()
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
}
```

## Validation with Formik

`onValidate` can be async, which pairs naturally with Formik's `validateForm()`. Pass a `ref` to the Formik instance from inside the node body, then call it in `onValidate`.

```tsx
import { useEffect, useRef } from 'react'
import { Kuflow } from 'kuflow'
import { NodeBasic, NodePort } from 'kuflow/renderable'
import { createRoot } from 'react-dom/client'
import { Formik, Form, Field, type FormikProps } from 'formik'
import * as yup from 'yup'

const schema = yup.object({
  threshold: yup.number().required('Required').min(0, 'Must be >= 0'),
})

function NodeForm({ formikRef }: { formikRef: React.RefObject<FormikProps<any> | null> }) {
  return (
    <Formik
      innerRef={formikRef}
      initialValues={{ threshold: '' }}
      validationSchema={schema}
      onSubmit={() => {}}
    >
      {({ errors, touched }) => (
        <Form>
          <Field name="threshold" type="number" placeholder="threshold" />
          {touched.threshold && errors.threshold && (
            <span style={{ color: 'red', fontSize: 11 }}>{errors.threshold as string}</span>
          )}
        </Form>
      )}
    </Formik>
  )
}

// In your setup:
const formikRef = { current: null } as React.RefObject<FormikProps<any> | null>

kuflow.add(new NodeBasic('node-1', {
  title: 'Threshold',
  ports: {
    input:  [new NodePort('n1-in',  'value',  ['number'])],
    output: [new NodePort('n1-out', 'result', ['number'])],
  },
  onMount(body) {
    createRoot(body).render(<NodeForm formikRef={formikRef} />)
  },
  async onValidate(node) {
    if (!formikRef.current) return
    const errors = await formikRef.current.validateForm()
    formikRef.current.setTouched(
      Object.fromEntries(Object.keys(errors).map(k => [k, true]))
    )
    for (const [field, message] of Object.entries(errors)) {
      kuflow.error(node.id, { param: field, message: message as string })
    }
  },
}))

// Trigger validation — returns true if no errors, false otherwise.
// Nodes with errors show a red ring automatically.
const valid = await node.validate()
```

Listen for errors globally:

```ts
kuflow.addEventListener('node.error', (error) => {
  // { nodeId, param?, port?, message }
  console.warn('node error:', error)
})
```

## Restoring Saved State

```tsx
useEffect(() => {
  const saved = JSON.parse(localStorage.getItem('graph') ?? 'null')

  const kuflow = new Kuflow({
    parent: containerRef.current!,
    model: saved ?? undefined,
  })

  const offUpdate = kuflow.addEventListener('canvas.update', () => {
    localStorage.setItem('graph', JSON.stringify(kuflow.export()))
  })

  return () => { offUpdate(); kuflow.destroy() }
}, [])
```
