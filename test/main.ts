import "./app.css"
import { Kuflow } from '../src/kuflow'
import { NodeBasic, NodePort } from "../src/renderable"

const kuflow = new Kuflow({
    parent: document.querySelector<HTMLDivElement>('#kuflow')!
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
        x: 0,
        y: 0
    },
    onMount(body) {
        body.innerHTML =
`
<input type="text" placeholder="hi" />
`
    },
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
        x: 0,
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
        x: 400,
        y: 100
    },
}))

// node1.active = true

// setTimeout(()=>{
//     node1.active = false
// }, 4000)

// kuflow.remove(node1)
kuflow.connect("n2-o-1", "n1-i-1")
kuflow.connect("n3-o-1", "n1-i-1")
