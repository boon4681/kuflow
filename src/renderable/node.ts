import * as d3 from "d3";
import { createId } from "@paralleldrive/cuid2";
import { NodePort, Renderable } from ".";
import { transformStyle } from "../utils";
import type { D3Div, INodePosition } from "../type";

export class GroupNode extends Renderable<D3Div> {
    id: string = createId();
    constructor(container: D3Div) {
        super();
        this.bind(container)
    }
    onMount(): void { }
    update(): void { }
}

export class NodeBasic extends Renderable<D3Div<NodeBasic>> {
    x: number = 0
    y: number = 0
    title: string = "Test"
    private _active: boolean = false
    private _focus: boolean = false
    titleNode!: D3Div
    ports: { input: NodePort[], output: NodePort[] }
    get active() {
        return this._active
    }
    set active(active: boolean) {
        this._active = active
        this.mark()
    }

    constructor(
        public id: string,
        private options?: {
            title?: string
            ports?: { input: NodePort[], output: NodePort[] },
            position?: INodePosition,
            active?: boolean,
            onMount?: (body: HTMLDivElement) => void
        }
    ) {
        super();
        this.ports = options?.ports ? options.ports : {
            input: [],
            output: []
        }
        this.title = options?.title ?? this.title
        this.x = options?.position?.x ?? 0
        this.y = options?.position?.y ?? 0
        this._active = options?.active ?? false
    }
    update(): void {
        this.node.attr("data-kuflow-node-active", this._active)
        this.node.attr("data-kuflow-node-focus", this._focus)
        this.titleNode.text(this.title)
        this.node?.style('transform', transformStyle({
            x: this.x,
            y: this.y
        }))
    }
    onMount(): void {
        const node = this.parentNode!.append("div")
        this.titleNode = node.append("div")
        this.titleNode.attr('class', 'name')
        const interfaceGroup = node.append('div')
        interfaceGroup.attr('class', 'interfaces')
        const inputGroup = interfaceGroup.append('div')
        inputGroup.attr('class', 'input-group')
        const outputGroup = interfaceGroup.append('div')
        outputGroup.attr('class', 'output-group')
        const body = node.append('div')
        body.attr('class', 'body')

        node.data([this])
        node.attr('class', 'node')
        node.attr('data-kuflow-node-id', this.id)
        node.attr("data-kuflow-node-active", this._active)
        node.attr("data-kuflow-node-focus", this._focus)
        node.style('transform', d => transformStyle(d))
        let start = { x: 0, y: 0, tx: 0, ty: 0 }
        const drag = d3.drag<HTMLDivElement, NodeBasic>()
        drag.filter((e) => {
            if (body.node()!.contains(e.target)) {
                e.stopPropagation();
                return false
            }
            return true
        })
        drag.on("start", (event, d) => {
            if (body.node()!.contains(event.sourceEvent.target)) {
                event.sourceEvent.preventDefault();
                return
            };
            node.raise()
            start.x = event.x
            start.y = event.y
            start.tx = d.x
            start.ty = d.y
            this._focus = true
            this.mark()
        })
        drag.on("drag", (event, d) => {
            const dx = event.x - start.x;
            const dy = event.y - start.y;

            d.x = start.tx + this.kuflow.divK(dx);
            d.y = start.ty + this.kuflow.divK(dy);
            this._focus = true
            this.mark()
        })
        drag.on("end", () => {
            this._focus = false
            this.mark()
        })
        node.call(drag)
        for (const port of this.ports.input) {
            this.addChild(inputGroup, port, this.id, "input")
        }
        for (const port of this.ports.output) {
            this.addChild(outputGroup, port, this.id, "output")
        }
        this.bind(node)
        this.options?.onMount?.(body.node()!)
    }
    onDestroy(): void {
        this.kuflow.pool = this.kuflow.pool.filter(a => a.id != this.id)
    }
}