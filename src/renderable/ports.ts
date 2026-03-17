import { NodeBasic, Renderable } from ".";
import { colorWheel, hexToHSL } from "../utils";
import type { D3Any, D3Div, INodePort, PortType } from "../type";
import { KUFLOW_PORT_MOUSEDOWN, type MouseEventExt, type PortMouseDownEvent } from "../events";

export class NodePort extends Renderable<D3Div> implements INodePort {
    declare public parent: NodeBasic | undefined;
    type!: PortType;
    nodeId!: string;
    color!: string;
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
            console.log(this.color)
        }
        this.color = this.color ? this.color : colorWheel(this.dataType[0])
    }
    update(): void {
        this.node.text(this.label)
    }
    onMount(container: D3Any, nodeId: string, portType: PortType): void {
        const node = container.append("div")
        this.type = portType
        if (portType == "input") {
            node.attr('data-kuflow-node-input-id', this.id)
            node.attr('class', "input")
        }
        if (portType == "output") {
            node.attr('data-kuflow-node-output-id', this.id)
            node.attr('class', "output")
        }
        node.style('--color', this.color!)
        node.on('mousedown', (e: MouseEvent) => {
            e.stopPropagation();
            node.dispatch(KUFLOW_PORT_MOUSEDOWN, {
                detail: Object.assign(e as MouseEventExt, {
                    portType: portType,
                    nodeId: this.parent!.id,
                    interfaceId: this.id,
                    interfaceType: this.dataType,
                    port: this
                }) satisfies PortMouseDownEvent,
                bubbles: true,
                cancelable: true
            })
        })
        this.bind(node)
        this.parent?.link(this)
        this.kuflow._addToNodePortTable(this)
        this.nodeId = nodeId
    }
    onDestroy(): void {
        // this.kuflow._removeLink()
        this.kuflow._removeFromNodePortTable(this)
    }
}