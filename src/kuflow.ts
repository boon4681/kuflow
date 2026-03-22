import './css/style.css'
import { GroupNode, NodeBasic, NodePort, type Renderable } from "./renderable"
import * as d3 from 'd3';
import { color, transformStyle } from './utils';
import type { D3Any, INodePosition, NodeError } from './type';
import { KUFLOW_PORT_MOUSEDOWN, type PortMouseDownEvent, type MouseEventExt, KUFLOW_NODE_FOCUSED } from './events';
import { Edge } from './renderable/edge';
import "./cyclic"
import { detectCycles, mapLinks } from './cyclic';
import { createId } from '@paralleldrive/cuid2';
import type { NodeRegistry } from './registry';

export interface KuflowConfig {
    parent: HTMLDivElement,
    disablePatternBackground?: boolean,
    registry?: NodeRegistry,
    model?: {
        x?: number;
        y?: number;
        k?: number;
    } | {
        x?: number;
        y?: number;
        k?: number;
        edges: {
            id: string;
            node_id: string;
        }[][];
        nodes: {
            id: string;
            parameters: void | {
                [k: string]: FormDataEntryValue;
            };
            _ref: string | null;
            position: {
                x: number;
                y: number;
            };
            ports: {
                input: {
                    id: string;
                    type: string[];
                    label: string;
                    meta: {
                        _ref_name?: string;
                        color?: string;
                    } | undefined;
                }[];
                output: {
                    id: string;
                    type: string[];
                    label: string;
                    meta: {
                        _ref_name?: string;
                        color?: string;
                    } | undefined;
                }[];
            };
        }[];
    }
}

type Callable = (...args: any) => void
type registeredEvents =
    'zoom' |
    'pan' |
    'zoom-pan' |
    'port.mousedown' |
    'port.mousemove' |
    'port.mouseup' |
    'node.focus' |
    'node.error' |
    'canvas.update'
    ;

export class Kuflow {
    private parent: HTMLDivElement
    private canvas: d3.Selection<HTMLDivElement, unknown, null, undefined>
    private bgCanvas: d3.Selection<SVGSVGElement, unknown, null, undefined>
    private mainElement = document.createElement("div")
    private nodeGroup: d3.Selection<HTMLDivElement, unknown, null, undefined>
    private nodeGroupRenderable: GroupNode
    private edgeGroupRenderable: GroupNode
    private edgeGroup: d3.Selection<HTMLDivElement, unknown, null, undefined>
    private bgSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    private parentSizeObserver: ResizeObserver
    private mutationObserver: MutationObserver
    private toolbar?: d3.Selection<HTMLDivElement, unknown, null, undefined>

    private afterRenders: Array<() => void> = []
    private registry?: NodeRegistry

    zoom: { x: number, y: number, k: number } = {
        x: 0,
        y: 0,
        k: 2,
    }

    renderingPool: Renderable<any>[] = []
    pool: Renderable<any>[] = []
    nodes: Set<NodeBasic> = new Set()
    focusedNode: NodeBasic | null = null
    x: number = 0
    y: number = 0
    private nodePortTrackingTable: Map<Node, NodePort> = new Map()
    private registerRenderableTable: Map<string, Renderable<any>> = new Map()
    private linkPortInputToOutputTable: Map<string, { outputPortId: string, edge: Edge }> = new Map()
    private _links: Set<Edge> = new Set()
    private _errors: Map<string, NodeError[]> = new Map()

    private get links() {
        return Array.from(this._links.values())
    }
    private eventPools: Record<registeredEvents, Callable[]> = {
        'zoom': [],
        'pan': [],
        'zoom-pan': [],
        'port.mousedown': [],
        'port.mousemove': [],
        'port.mouseup': [],
        'node.focus': [],
        'node.error': [],
        'canvas.update': []
    }

    constructor(config: KuflowConfig) {
        this.registry = config.registry
        if (config.model) {
            this.zoom.x = config.model.x ?? this.zoom.x
            this.zoom.y = config.model.y ?? this.zoom.y
            this.zoom.k = config.model.k ?? this.zoom.k
        }
        // setup html element
        this.parent = config.parent
        this.parent.classList.add('kuflow')
        this.bgSvg.classList.add('backdrop')
        this.mainElement.classList.add('canvas')
        this.parent.appendChild(this.mainElement)
        this.parent.appendChild(this.bgSvg)

        // setup canvas element
        this.canvas = d3.select(this.mainElement);
        this.bgCanvas = d3.select(this.bgSvg);
        this.edgeGroup = this.canvas.append("div")
        this.edgeGroup.attr('class', 'edge-group')
        this.nodeGroup = this.canvas.append("div")
        this.nodeGroup.attr('class', 'node-group')

        // setup node-group
        this.nodeGroupRenderable = new GroupNode(this.nodeGroup)
        this.nodeGroupRenderable.mount(this)

        // setup edge-group
        this.edgeGroupRenderable = new GroupNode(this.edgeGroup)
        this.edgeGroupRenderable.mount(this)

        // setup misc
        const rect = this.parent.getBoundingClientRect()
        this.setCanvasSize(rect.width, rect.height)
        if (!config.disablePatternBackground) {
            this.setupGridPattern()
        }

        this.parentSizeObserver = new ResizeObserver(() => {
            const rect = this.parent.getBoundingClientRect()
            this.setCanvasSize(rect.width, rect.height)
        })
        this.parentSizeObserver.observe(this.parent)

        this.mutationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type == "attributes") {
                    // console.log(mutation.attributeName)
                }
                if (mutation.removedNodes) {
                    Array.from(mutation.removedNodes).forEach(node => {
                        if (this.nodePortTrackingTable.has(node)) {
                            this.nodePortTrackingTable.delete(node)
                        }
                    });
                }
            });
        });
        this.mutationObserver.observe(this.mainElement, { subtree: true, childList: true, attributeFilter: ['data-kuflow-ignore-drag'] });

        // setup renderer
        this.on('zoom-pan', (transform) => {
            this.nodeGroup.style('transform', transformStyle(transform))
            this.edgeGroup.style('transform', transformStyle(transform))
        })

        // interface mouse event
        this.nodeGroup.on(KUFLOW_PORT_MOUSEDOWN, ({ detail }) => {
            this.fire("port.mousedown", detail)
        })
        this.canvas.on("mousemove", (event) => {
            this.fire("port.mousemove", event)
        })
        this.canvas.on("mousedown", (event) => {
            if (this.toolbar && (this.toolbar.node() == event.target || this.toolbar.node()?.contains(event.target))) {
                return
            }
            this.focusedNode?.mark()
            this.focusedNode = null
        })
        this.canvas.on("mouseup", (event) => {
            this.fire("port.mouseup", event)
        })
        // node event
        this.nodeGroup.on(KUFLOW_NODE_FOCUSED, ({ detail }) => {
            if (this.toolbar) {
                this.toolbar.remove()
                this.toolbar = undefined
            }
            this.toolbar = this.nodeGroup.append("div")
            this.toolbar.attr('class', 'node-toolbar')
            this.toolbar?.style('left', `${detail.x + this.divK(detail.htmlNode.getBoundingClientRect().width / 2)}px`)
            this.toolbar?.style('top', `${detail.y - 20}px`)

            this.fire("node.focus", detail, this.toolbar.node())
        })

        // setup editor
        this.setupEdgeCreator()

        // setup zoom
        this.setupZoom()
        requestAnimationFrame(this.renderLoop.bind(this));
    }

    public readonly add = (obj: NodeBasic) => {
        this._addRenderable(obj)
        return obj
    }

    public readonly remove = (obj: NodeBasic) => {
        obj.remove({ removeWithLink: true })
    }

    public readonly createNode = (type: string, options?: { position?: INodePosition, id?: string }) => {
        if (!this.registry) throw new Error("No registry provided in KuflowConfig")
        const def = this.registry.get(type)
        if (!def) throw new Error(`Node type "${type}" not found in registry`)

        const node = new NodeBasic(options?.id ?? createId(), {
            _ref: type,
            title: def.title,
            ports: {
                input: (def.inputs ?? []).map(p => new NodePort(createId(), p.label, p.dataType)),
                output: (def.outputs ?? []).map(p => new NodePort(createId(), p.label, p.dataType)),
            },
            position: options?.position,
            onMount: def.body,
        })
        return this.add(node)
    }

    public readonly addEventListener = <T extends registeredEvents>(name: T, cb: (...args: any) => void) => {
        this.on(name, cb)
        return () => {
            this.removeEventListener(name, cb)
        }
    }
    public readonly removeEventListener = <T extends registeredEvents>(name: T, cb: (...args: any) => void) => {
        this.remove_on(name, cb)
    }

    public readonly addAfterRender = (cb: () => void) => {
        this.afterRenders.push(cb)
        return () => {
            this.afterRenders = this.afterRenders.filter(a => a != cb)
        }
    }

    public readonly error = (nodeId: string, error: { port?: string, param?: string, message: string }) => {
        const entry: NodeError = { nodeId, ...error }
        if (!this._errors.has(nodeId)) {
            this._errors.set(nodeId, [])
        }
        this._errors.get(nodeId)!.push(entry)
        this.fire("node.error", entry)
        const node = this.getNode(nodeId)
        if (node) node.mark()
    }

    public readonly clearErrors = (nodeId: string) => {
        this._errors.delete(nodeId)
        const node = this.getNode(nodeId)
        if (node) node.mark()
    }

    public readonly getErrors = (nodeId: string): NodeError[] => {
        return this._errors.get(nodeId) ?? []
    }

    public readonly hasErrors = (nodeId: string): boolean => {
        const errors = this._errors.get(nodeId)
        return !!errors && errors.length > 0
    }

    protected readonly _addRenderable = <V extends D3Any, T extends Renderable<V>>(obj: T) => {
        this.pool.push(obj)
        if (obj instanceof Edge) {
            obj.mount(this, this.edgeGroupRenderable)
        } else {
            obj.mount(this, this.nodeGroupRenderable)
        }
        return obj
    }

    public readonly connect = (sourcePortId: string, targetPortId: string) => {
        if (sourcePortId == targetPortId) throw new Error("Cannot connect the same port together.");

        let source = this.registerRenderableTable.get(sourcePortId)
        let target = this.registerRenderableTable.get(targetPortId)
        console.log(source, target, source instanceof NodePort, target instanceof NodePort)
        if (!source) throw new Error("SourcePort not found or not mounted")
        if (!target) throw new Error("TargetPort not found or not mounted")
        if (!(source instanceof NodePort)) throw new Error("Source is not a port")
        if (!(target instanceof NodePort)) throw new Error("Target is not a port");
        if (source.type == target.type) throw new Error("Source and Target port must be difference type.");
        if (source.nodeId == target.nodeId) throw new Error("Node cannot be connecting to it-self.")
        let [sourcePort, targetPort] = source.type == "output" ? [source, target] : [target, source]
        if (!targetPort.dataType.includes(sourcePort.dataType[0])) throw new Error(`Incorrect input. expected ${targetPort.dataType} but receive ${sourcePort.dataType}`)

        if (this.linkPortInputToOutputTable.get(targetPort.id)) throw new Error(`This input port id ${JSON.stringify(targetPort.id)} already connect`)
        const edge = new Edge(sourcePort, targetPort)
        const links = this.links
        links.push(edge)
        if (this.isCylic(links)) {
            edge.remove()
            throw new Error("Cyclic graph detected.")
        }
        this._addRenderable(edge)
        this._links.add(edge)
        this.linkPortInputToOutputTable.set(targetPort.id, { outputPortId: sourcePort.id, edge })
    }

    public readonly getNode = (nodeId: string) => {
        return this.pool.find(a => a.id == nodeId)
    }

    public readonly export = () => {
        const list = Array.from(this.nodes.values())
        const result = list.map(a => {
            return {
                id: a.id,
                parameters: a.parameters,
                _ref: a._ref,
                position: {
                    x: a.x,
                    y: a.y
                },
                ports: {
                    input: a.ports.input.map(a => {
                        return {
                            id: a.id,
                            type: a.dataType,
                            label: a.label,
                            meta: a.meta
                        }
                    }),
                    output: a.ports.output.map(a => {
                        return {
                            id: a.id,
                            type: a.dataType,
                            label: a.label,
                            meta: a.meta
                        }
                    })
                }
            }
        })
        return {
            x: this.zoom.x,
            y: this.zoom.y,
            k: this.zoom.k,
            edges: this.links.map(a => [
                {
                    id: a.source.id,
                    node_id: a.source.nodeId
                },
                {
                    id: a.target.id,
                    node_id: a.target.nodeId
                },
            ]),
            nodes: result
        }
    }

    public divK(i: number) {
        return i / this.zoom.k
    }

    _addToNodePortTable(port: NodePort) {
        this.nodePortTrackingTable.set((port.node as any)._groups[0][0], port)
    }
    _removeFromNodePortTable(port: NodePort) {
        this.nodePortTrackingTable.delete((port.node as any)._groups[0][0])
    }
    _hasInNodePortTable(ele: HTMLElement) {
        return this.nodePortTrackingTable.has(ele)
    }
    _getNodePort(ele: HTMLElement) {
        return this.nodePortTrackingTable.get(ele)!
    }
    _registerRenderable(obj: Renderable<any>) {
        if (this.registerRenderableTable.has(obj.id)) {
            throw new Error("Key conflict cannot add 2 object with same id")
        }
        this.registerRenderableTable.set(obj.id, obj)
    }
    _unregisterRenderable(obj: Renderable<any>) {
        this.registerRenderableTable.delete(obj.id)
    }
    _removeLink(link: Edge) {
        for (const [key, { edge }] of this.linkPortInputToOutputTable.entries()) {
            if (edge == link) {
                this.linkPortInputToOutputTable.delete(key)
                this._links.delete(edge)
                link.remove()
                break
            }
        }
    }
    _getLinkFromPort(port: NodePort) {
        for (const [key, { edge }] of this.linkPortInputToOutputTable.entries()) {
            if (edge.source == port || edge.target == port) {
                return [key, edge] as const
            }
        }
        return [undefined, undefined] as const
    }

    private fire<T extends registeredEvents>(name: T, ...args: any) {
        this.eventPools[name].forEach(a => a(...args))
    }

    private on<T extends registeredEvents>(name: T, cb: (...args: any) => void) {
        this.eventPools[name].push(cb)
    }
    private remove_on<T extends registeredEvents>(name: T, cb: (...args: any) => void) {
        this.eventPools[name] = this.eventPools[name].filter(a => cb !== a)
    }

    private isCylic(links: Edge[]) {
        const list = links.map(a => [a.source.parent, a.target.parent] as [NodeBasic, NodeBasic])
        const graph = mapLinks(list)
        const cyclics = detectCycles(graph)
        return cyclics.length > 0
    }

    private setupEdgeCreator() {
        let edge: Edge | undefined = undefined
        this.on("port.mousedown", (event: PortMouseDownEvent) => {
            if (edge) return;
            if (event.port.type == "input") {
                const [output, link] = this._getLinkFromPort(event.port)
                if (output && link) {
                    edge = this._addRenderable(new Edge(link.source))
                    this._removeLink(link)
                    link.remove()
                }
            }
            if (!edge) edge = this._addRenderable(new Edge(event.port))
            const rect = event.target.getBoundingClientRect()
            if (edge.source.type == "input") {
                edge.sx = this.divK(rect.x - this.zoom.x - this.x)
                edge.sy = this.divK(rect.y - this.zoom.y - this.y)
            } else {
                edge.sx = this.divK(rect.x + rect.width - this.zoom.x - this.x)
                edge.sy = this.divK(rect.y + rect.height * 0.5 - this.zoom.y - this.y)
            }
            edge.tx = edge.sx
            edge.ty = edge.sy
        })
        this.on("port.mousemove", (event: MouseEventExt) => {
            if (!edge) return;
            edge.tx = this.divK(event.x - this.zoom.x - this.x)
            edge.ty = this.divK(event.y - this.zoom.y - this.y)
            edge.mark()
        })
        this.on("port.mouseup", (event: MouseEventExt) => {
            if (!edge) return;
            if (!this._hasInNodePortTable(event.target)) {
                edge.remove()
                edge = undefined
                return
            };
            const targetPort = this._getNodePort(event.target)
            if (targetPort.type != edge.source.type) {
                const rect = event.target.getBoundingClientRect()
                if (targetPort.type == "input") {
                    edge.tx = this.divK(rect.x - this.zoom.x - this.x)
                    edge.ty = this.divK(rect.y + rect.height * 0.5 - this.zoom.y - this.y)
                } else {
                    edge.tx = this.divK(rect.x + rect.width - this.zoom.x - this.x)
                    edge.ty = this.divK(rect.y + rect.height * 0.5 - this.zoom.y - this.y)
                }
                edge.connected = true
                edge.target = targetPort
                if (edge.target.type == "input") {
                    const [_, link] = this._getLinkFromPort(edge.target)
                    if (link) this._removeLink(link)
                }
                const sourceId = edge.source.id
                edge.remove()
                edge = undefined

                this.connect(sourceId, targetPort.id)
            } else {
                edge.remove()
                edge = undefined
            }
        })
    }

    private setupZoom() {
        const zoom = d3.zoom<HTMLDivElement, unknown>()
        zoom.scaleExtent([0.5, 2])
        zoom.filter((event) => {
            return event.button === 0 || event.button === 1 || event.type === 'wheel';
        });
        zoom.on('zoom', (event) => {
            this.zoom = {
                x: event.transform.x,
                y: event.transform.y,
                k: event.transform.k
            }
            if (event.sourceEvent?.type === 'wheel') {
                this.fire("zoom", event.transform)
            } else {
                this.fire("pan", event.transform)
            }
            this.fire("zoom-pan", event.transform)
        })

        this.canvas.call(zoom)
        this.canvas.call(zoom.transform, d3.zoomIdentity.translate(this.zoom.x, this.zoom.y).scale(this.zoom.k))
    }

    private setupGridPattern() {
        const defaultGridSize = 20
        const gridPattern = this.bgCanvas.append('pattern')
            .attr('id', 'grid')
            .attr('width', defaultGridSize)
            .attr('height', defaultGridSize)
            .attr('patternUnits', 'userSpaceOnUse');

        const circle = gridPattern.append('circle')
            .attr('fill', color('kuflow-grid'))
            .attr('cx', '1')
            .attr('cy', '1')
            .attr('r', '1')
        // const path = gridPattern.append('path')
        //     .attr('d', `M ${defaultGridSize} 0 L 0 0 0 ${defaultGridSize}`)
        //     .attr('fill', 'none')
        //     .attr('stroke', color('grid'))
        //     .attr('stroke-width', '0.5');

        this.on('zoom-pan', (transform) => {
            const gridSize = defaultGridSize * transform.k
            gridPattern.attr('width', gridSize)
            gridPattern.attr('height', gridSize)
            gridPattern.attr('x', transform.x)
            gridPattern.attr('y', transform.y)

            circle.attr('cx', this.zoom.k)
                .attr('cy', this.zoom.k)
                .attr('r', this.zoom.k)
            // path.attr('d', `M ${gridSize} 0 L 0 0 0 ${gridSize}`)
        })

        this.bgCanvas.append('rect')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', 'url(#grid)')
            .attr('class', 'grid-background');
    }

    private setCanvasSize(w: number, h: number) {
        this.canvas.style('overflow', 'hidden')
        this.canvas.style('width', w + 'px')
        this.canvas.style('height', h + 'px')
    }

    private renderLoop() {
        // if (this.renderingPool.length > 0) console.log(this.renderingPool.slice(0))
        const pool = Array.from(this.renderingPool)
        if (pool.length) {
            this.fire("canvas.update")
        }
        this.renderingPool = []
        const rect = this.parent.getBoundingClientRect()
        this.x = rect.x
        this.y = rect.y
        for (const node of pool) {
            if (node.isDirty) {
                node.render()
            }
        }
        if (this.focusedNode != null) {
            this.toolbar?.style('left', `${this.focusedNode.x + this.divK(this.focusedNode.htmlNode.getBoundingClientRect().width / 2)}px`)
            this.toolbar?.style('top', `${this.focusedNode.y - 20}px`)
        }
        if (this.toolbar && this.focusedNode == null) {
            this.toolbar.remove()
            this.toolbar = undefined
        }
        if (this.pool.length) {
            for (const cb of this.afterRenders) {
                cb()
            }
        }
        requestAnimationFrame(this.renderLoop.bind(this));
    }

    destroy() {
        this.parentSizeObserver.unobserve(this.parent)
        this.mainElement.remove()
    }
}