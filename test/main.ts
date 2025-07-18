import "./app.css"
import { Kuflow } from '../src/kuflow'
import { NodeBasic, NodePort } from "../src/renderable"

const kuflow = new Kuflow({
    parent: document.querySelector<HTMLDivElement>('#kuflow')!,
    disablePatternBackground: true
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

// node1.active = true

// setTimeout(()=>{
//     node1.active = false
// }, 4000)

// kuflow.remove(node1)
kuflow.connect("n2-o-1", "n1-i-1")
// kuflow.connect("n3-o-1", "n1-i-1")
setTimeout(() => {
    console.log(kuflow.export())
})