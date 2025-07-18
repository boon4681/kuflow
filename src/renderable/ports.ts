import { NodeBasic, Renderable } from ".";
import { colorWheel } from "../utils";
import type { D3Any, D3Div, INodePort, PortType } from "../type";
import { KUFLOW_PORT_MOUSEDOWN, type MouseEventExt, type PortMouseDownEvent } from "../events";

export class NodePort extends Renderable<D3Div> implements INodePort {
    declare public parent: NodeBasic | undefined;
    type!: PortType;
    nodeId!: string;
    constructor(
        public id: string,
        public label: string,
        public dataType: string[],
        public color?: string
    ) {
        super()
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