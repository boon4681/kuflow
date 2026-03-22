import { NodeBasic, Renderable } from ".";
import { colorWheel, hexToHSL } from "../utils";
import type { D3Any, D3Div, INodePort, PortType } from "../type";
import { KUFLOW_PORT_MOUSEDOWN, type MouseEventExt, type PortMouseDownEvent } from "../events";

export class NodePort extends Renderable<D3Div> implements INodePort {
    declare parent: NodeBasic | undefined
    type!: PortType
    color: string
    constructor(
        public id: string,
        public label: string,
        public dataType: string[],
        public meta?: {
            _ref_name?: string
            color?: string
        }
    ) {
        super()
        if (this.meta?.color?.startsWith("#")) {
            const g = hexToHSL(this.meta.color)
            this.color = `${g.h} ${g.l}% ${g.s}%`
        } else {
            this.color = colorWheel(this.dataType[0])
        }
    }

    get nodeId(): string {
        return this.parent!.id
    }

    protected onMount(container: D3Any): void {
        const node = container.append("div")
        if (this.type === "input") {
            node.attr('data-kuflow-node-input-id', this.id)
            node.attr('class', "input")
        }
        if (this.type === "output") {
            node.attr('data-kuflow-node-output-id', this.id)
            node.attr('class', "output")
        }
        node.style('--color', this.color)
        node.on('mousedown', (e: MouseEvent) => {
            e.stopPropagation();
            node.dispatch(KUFLOW_PORT_MOUSEDOWN, {
                detail: Object.assign(e as MouseEventExt, {
                    portType: this.type,
                    nodeId: this.nodeId,
                    interfaceId: this.id,
                    interfaceType: this.dataType,
                    port: this
                }) satisfies PortMouseDownEvent,
                bubbles: true,
                cancelable: true
            })
        })
        this.node = node
        this.parent?.link(this)
        this.kuflow._addToNodePortTable(this)
    }

    protected onUpdate(): void {
        this.node.text(this.label)
    }

    protected onDestroy(): void {
        this.kuflow._removeFromNodePortTable(this)
    }
}
