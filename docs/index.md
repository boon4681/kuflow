# Kuflow Documentation

Kuflow is a visual node-editor engine for building graph-based workflows in the browser.

## Guides

- [Vanilla JS / TypeScript](./vanilla.md)
- [React](./react.md)
- [Svelte](./svelte.md)
- [API Reference](./api.md)

---

## Installation

```bash
npm install kuflow
# or
yarn add kuflow
```

Import the stylesheet somewhere in your app:

```ts
import 'kuflow/css'
```

---

## Core Concepts

| Concept        | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `Kuflow`       | Main orchestrator. Attach it to a `<div>` container.                   |
| `NodeBasic`    | A draggable node with input/output ports and an optional form body.    |
| `NodePort`     | A typed connection point on a node.                                    |
| `Edge`         | A curved SVG path connecting two ports (managed by Kuflow internally). |
| `NodeRegistry` | Optional registry for reusable node type definitions.                  |

**Port type matching:** An edge can be created from an output port to an input port only when the output port's first `dataType` is included in the input port's `dataType` array.
