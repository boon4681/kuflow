import * as d3 from "d3";
import { createId } from "@paralleldrive/cuid2";
import { Renderable } from "./renderable";
import type { D3Any, D3Path } from "../type";
import type { NodePort } from ".";
import { colorWheel } from "../utils";

export class Edge extends Renderable<D3Path<Edge>> {
    id: string = createId();
    connected: boolean = false
    sx: number = 0;
    sy: number = 0;
    tx: number = 0;
    ty: number = 0;

    private container!: D3Any
    private _source: NodePort | undefined = undefined
    private _target: NodePort | undefined = undefined
    constructor(sourcePort: NodePort, targetPort?: NodePort) {
        super();
        this.source = sourcePort
        if (targetPort) this.target = targetPort

        this.connected = (this.source ? true : false) && (this.target ? true : false)
    }
    get source() {
        return this._source!
    }
    get target() {
        return this._target!
    }
    set source(port: NodePort) {
        if (this._source) this._source.unlink(this)
        if (!port) {
            this._source = port
            return
        }
        this._source = port
        this._source.link(this)
        if (this.mounted) this.calcPosition()
    }
    set target(port: NodePort) {
        if (this._target) this._target.unlink(this)
        if (!port) {
            this._target = port
            return
        }
        this._target = port
        this._target.link(this)
        if (this.mounted) this.calcPosition()
    }

    onMount(): void {
        const svg = this.parentNode!.append("svg")
        svg.attr("class", "link")
        svg.attr("data-kuflow-edge-id", this.id)
        const g = svg.append("g")
        const path = g.append('path')
        this.container = svg
        this.bind(path)
    }
    onLinkMarked(): void {
        this.calcPosition()
    }
    calcPosition() {
        if (this.source) {
            const rect = this.source.htmlNode.getBoundingClientRect()
            if (this.source.type == "input") {
                this.sx = this.kuflow.divK(rect.x - this.kuflow.zoom.x - this.kuflow.x)
                this.sy = this.kuflow.divK(rect.y + rect.height * 0.5 - this.kuflow.zoom.y - this.kuflow.y)
            } else {
                this.sx = this.kuflow.divK(rect.x + rect.width - this.kuflow.zoom.x - this.kuflow.x)
                this.sy = this.kuflow.divK(rect.y + rect.height * 0.5 - this.kuflow.zoom.y - this.kuflow.y)
            }
        }
        if (this.target) {
            const rect = this.target.htmlNode.getBoundingClientRect()
            if (this.target.type == "input") {
                this.tx = this.kuflow.divK(rect.x - this.kuflow.zoom.x - this.kuflow.x)
                this.ty = this.kuflow.divK(rect.y + rect.height * 0.5 - this.kuflow.zoom.y - this.kuflow.y)
            } else {
                this.tx = this.kuflow.divK(rect.x + rect.width - this.kuflow.zoom.x - this.kuflow.x)
                this.ty = this.kuflow.divK(rect.y + rect.height * 0.5 - this.kuflow.zoom.y - this.kuflow.y)
            }
        }
    }
    update(): void {
        this.calcPosition()
        this.node.attr("stroke", colorWheel(this.source.dataType.sort().join(","), "hsl"))
        this.node.attr("stroke-width", 2.5)
        this.node.attr("fill", "#00000000");
        const curve = d3.line().curve(d3.curveCatmullRom.alpha(0.95));
        // console.log(curve([
        //     [this.sx, this.sy],
        //     [this.sx - 5, this.sy],
        //     [this.tx, this.ty],
        // ]))
        if (this.connected) {
            if (this.source.type == "input") {
                this.node.attr("d", curve([
                    [this.sx, this.sy],
                    [this.sx - 5, this.sy],
                    [this.tx + 5, this.ty],
                    [this.tx, this.ty],
                ]))
            } else {
                this.node.attr("d", curve([
                    [this.sx, this.sy],
                    [this.sx + 5, this.sy],
                    [this.tx - 5, this.ty],
                    [this.tx, this.ty],
                ]))
            }
        } else {
            if (this.source.type == "input") {
                this.node.attr("d", curve([
                    [this.sx, this.sy],
                    [this.sx - 5, this.sy],
                    [this.tx, this.ty],
                ]))
            } else {
                this.node.attr("d", curve([
                    [this.sx, this.sy],
                    [this.sx + 5, this.sy],
                    [this.tx, this.ty],
                ]))
            }
        }
    }
    onDestroy(): void {
        this.container.remove()
        // this.kuflow.
    }
}