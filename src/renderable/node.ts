import * as d3 from "d3";
import { createId } from "@paralleldrive/cuid2";
import { NodePort, Renderable } from ".";
import { transformStyle } from "../utils";
import type { D3Any, D3Div, INodePosition } from "../type";
import { KUFLOW_NODE_FOCUSED } from "../events";

export class GroupNode extends Renderable<D3Div> {
    id: string = createId()
    private _container: D3Div
    constructor(container: D3Div) {
        super()
        this._container = container
    }
    protected onMount(): void {
        this.node = this._container
    }
    protected onUpdate(): void { }
}

export class NodeBasic extends Renderable<D3Div<NodeBasic>> {
    x: number = 0
    y: number = 0
    _ref: string | null = null
    title: string = "Test"
    private _active: boolean = false
    private _focus: boolean = false
    private form!: d3.Selection<HTMLFormElement, any, any, any>
    titleNode!: D3Div
    ports: { input: NodePort[], output: NodePort[] }
    get active() {
        return this._active
    }
    set active(active: boolean) {
        this._active = active
        this.mark()
    }
    get focus() {
        return this._focus
    }
    set focus(focus: boolean) {
        this._focus = focus
        this.mark()
    }

    get parameters() {
        const data = Object.fromEntries(new FormData(this.form.node()!).entries());
        if (this.options?.onPreprocessParameters) {
            return this.options.onPreprocessParameters(this, data)
        }
        return data
    }

    private _ready: Promise<void> = Promise.resolve()
    get ready() { return this._ready }

    constructor(
        public id: string,
        private options?: {
            _ref?: string
            title?: string
            ports?: { input: NodePort[], output: NodePort[] },
            position?: INodePosition,
            active?: boolean,
            onMount?: (body: HTMLFormElement) => void | Promise<void>,
            onValidate?: (node: NodeBasic) => void | Promise<void>,
            onPreprocessParameters?: (node: NodeBasic, paramenters: Record<string, FormDataEntryValue>) => void
        }
    ) {
        super();
        this.ports = options?.ports ?? { input: [], output: [] }
        this._ref = options?._ref ?? "unk"
        this.title = options?.title ?? this.title
        this.x = options?.position?.x ?? 0
        this.y = options?.position?.y ?? 0
        this._active = options?.active ?? false
    }

    async validate(): Promise<boolean> {
        await this._ready
        this.kuflow.clearErrors(this.id)
        if (this.options?.onValidate) {
            await this.options.onValidate(this)
        }
        return !this.kuflow.hasErrors(this.id)
    }

    protected onUpdate(): void {
        this._focus = this.kuflow.focusedNode?.id == this.id
        this.node.attr("data-kuflow-node-active", this.active)
        this.node.attr("data-kuflow-node-focus", this.focus)
        this.node.attr("data-kuflow-node-error", this.kuflow.hasErrors(this.id))
        this.titleNode.text(this.title)
        this.node?.style('transform', transformStyle({
            x: this.x,
            y: this.y
        }))
    }
    protected onMount(container: D3Any): void {
        const node = container.append("div")
        this.titleNode = node.append("div")
        this.titleNode.attr('class', 'name')
        const interfaceGroup = node.append('div')
        interfaceGroup.attr('class', 'interfaces')
        const inputGroup = interfaceGroup.append('div')
        inputGroup.attr('class', 'input-group')
        const outputGroup = interfaceGroup.append('div')
        outputGroup.attr('class', 'output-group')
        this.form = node.append('form')
        this.form.attr('class', 'body')

        node.data([this])
        node.attr('class', 'node')
        node.attr('data-kuflow-node-id', this.id)
        node.attr("data-kuflow-node-active", this.active)
        node.attr("data-kuflow-node-focus", this.focus)
        node.style('transform', d => transformStyle(d))
        let start = { x: 0, y: 0, tx: 0, ty: 0 }
        const drag = d3.drag<HTMLDivElement, NodeBasic>()
        drag.filter((e) => {
            if (this.form.node()!.contains(e.target)) {
                e.stopPropagation();
                return false
            }
            return true
        })
        drag.on("start", (event, d) => {
            this.kuflow.focusedNode?.mark()
            this.kuflow.focusedNode = this
            node.dispatch(KUFLOW_NODE_FOCUSED, {
                detail: this,
                bubbles: true,
                cancelable: true
            })
            if (this.form.node()!.contains(event.sourceEvent.target)) {
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
            this.focus = true
            this.mark()
        })
        drag.on("end", () => {
            this.kuflow.focusedNode?.mark()
            this.kuflow.focusedNode = this
            this.mark()
        })
        node.call(drag)
        for (const port of this.ports.input) {
            port.type = "input"
            this.addChild(port, inputGroup)
        }
        for (const port of this.ports.output) {
            port.type = "output"
            this.addChild(port, outputGroup)
        }

        this.node = node
        this.kuflow.nodes.add(this)
        const result = this.options?.onMount?.(this.form.node()!)
        if (result instanceof Promise) {
            this._ready = result.catch(() => {})
        }
    }
    protected onDestroy(): void {
        this.kuflow.nodes.delete(this)
    }
}
