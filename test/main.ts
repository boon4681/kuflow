import "./app.css"
import { Kuflow } from '../src/kuflow'
import { NodeBasic, NodePort } from "../src/renderable"

const kuflow = new Kuflow({
    parent: document.querySelector<HTMLDivElement>('#kuflow')!,
    disablePatternBackground: false
})

const node1 = kuflow.add(new NodeBasic("1", {
    title: "absolute",
    ports: {
        input: [
            new NodePort("n1-i-1", "a", ["AXIUM.INT", "AXIUM.BOOL"]),
            new NodePort("n1-i-2", "b", ["AXIUM.INT", "AXIUM.BOOL"]),
        ],
        output: [
            new NodePort("n1-o-1", "sum", ["AXIUM.INT"]),
        ]
    },
    position: {
        x: 100,
        y: 100
    },
    onMount(body) {
        body.innerHTML =
            `
<input name="message" value="YO" type="text" placeholder="hi" />
`
    },
    onPreprocessParameters(_, data) {
        return data
    }
}))

kuflow.add(new NodeBasic("2", {
    ports: {
        input: [
            new NodePort("n2-i-1", "a", ["AXIUM.INT", "AXIUM.BOOL"]),
            new NodePort("n2-i-2", "b", ["AXIUM.INT", "AXIUM.BOOL"]),
        ],
        output: [
            new NodePort("n2-o-1", "sum", ["AXIUM.BOOL"]),
        ]
    },
    position: {
        x: -200,
        y: 200
    }
}))

kuflow.add(new NodeBasic("3", {
    ports: {
        input: [
            new NodePort("n3-i-1", "a", ["AXIUM.INT", "AXIUM.BOOL"]),
            new NodePort("n3-i-2", "b", ["AXIUM.INT"]),
        ],
        output: [
            new NodePort("n3-o-1", "sum", ["AXIUM.INT"]),
        ]
    },
    position: {
        x: 100,
        y: 250
    },
}))
kuflow.add(new NodeBasic("4", {
    ports: {
        input: [
            new NodePort("n4-i-1", "a", ["AXIUM.INT", "AXIUM.BOOL"]),
            new NodePort("n4-i-2", "b", ["AXIUM.INT"]),
        ],
        output: [
            new NodePort("n4-o-1", "sum", ["AXIUM.INT"]),
        ]
    },
    position: {
        x: 400,
        y: 200
    },
}))

kuflow.connect("n2-o-1", "n1-i-1")
kuflow.connect("n1-o-1", "n3-i-1")

// --- validation test node ---
const node5 = kuflow.add(new NodeBasic("5", {
    title: "Validate Me",
    ports: {
        input: [new NodePort("n5-i-1", "value", ["AXIUM.INT"])],
        output: [new NodePort("n5-o-1", "result", ["AXIUM.INT"])]
    },
    position: { x: 400, y: 400 },
    onMount(body) {
        body.innerHTML = `
<input name="threshold" type="number" placeholder="threshold" value="" />
<button type="button" id="validate-btn">Validate</button>
`
        body.querySelector('#validate-btn')!.addEventListener('click', async () => {
            const valid = await node5.validate()
            console.log('[validate]', valid ? 'OK' : 'FAILED', kuflow.getErrors('5'))
        })
    },
    async onValidate(node) {
        const params = node.parameters as Record<string, FormDataEntryValue>
        const threshold = params['threshold']
        // simulate async backend check
        await new Promise<void>((resolve) => setTimeout(resolve, 300))
        if (!threshold || threshold === '') {
            kuflow.error(node.id, { param: 'threshold', message: 'threshold is required' })
        } else if (Number(threshold) < 0) {
            kuflow.error(node.id, { param: 'threshold', message: 'threshold must be >= 0' })
        }
    }
}))

kuflow.addEventListener('node.error', (error) => {
    console.warn('[node.error]', error)
})

setTimeout(() => {
    console.log(kuflow.export())
}, 200)