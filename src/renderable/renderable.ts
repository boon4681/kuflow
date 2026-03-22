import type { Kuflow } from "../kuflow"
import type { D3Any } from "../type"

type RenderableRemoveOptions = {
    removeWithLink?: boolean
}

export abstract class Renderable<T extends D3Any> {
    protected dirty = false
    protected mounted = false
    protected destroyed = false
    parent: Renderable<any> | undefined
    protected kuflow!: Kuflow
    protected children: Renderable<any>[] = []
    /**
     * Linked renderables: when this object is marked dirty, these get marked too.
     */
    private _links = new Set<Renderable<any>>()
    /**
     * Reverse links: objects that link TO this object (for cleanup on removal).
     */
    private _linkSources = new Set<Renderable<any>>()
    node!: T

    abstract id: string

    /**
     * Create DOM elements and assign this.node.
     * Called once during mount(). Use addChild() here to attach children.
     */
    protected abstract onMount(container?: D3Any): void

    /**
     * Update DOM to reflect current state.
     * Called each render frame when dirty.
     */
    protected abstract onUpdate(): void

    /** Cleanup hook called before DOM removal. */
    protected onDestroy(): void { }

    /** Called when a linked renderable's mark propagates to this one. */
    protected onLinkMarked(): void { }

    get isDirty() {
        return this.dirty
    }
    get htmlNode(): HTMLElement {
        return (this.node as any)._groups[0][0]
    }

    mount(kuflow: Kuflow, parent?: Renderable<any>, container?: D3Any) {
        this.kuflow = kuflow
        this.parent = parent
        kuflow._registerRenderable(this)
        this.mounted = true
        this.onMount(container ?? parent?.node)
        this.mark()
    }

    mark() {
        this.dirty = true
        this.kuflow.renderingPool.push(this)
        for (const linked of this._links) {
            linked.onLinkMarked()
            linked.mark()
        }
    }

    unmark() {
        this.dirty = false
    }

    render() {
        if (!this.dirty) return
        this.onUpdate()
        for (const child of this.children) {
            child.render()
        }
        this.unmark()
    }

    link(obj: Renderable<any>) {
        this._links.add(obj)
        obj._linkSources.add(this)
    }

    unlink(obj: Renderable<any>) {
        this._links.delete(obj)
        obj._linkSources.delete(this)
    }

    addChild(child: Renderable<D3Any>, container?: D3Any) {
        if (!this.mounted) throw new Error("Cannot add child before mount")
        child.mount(this.kuflow, this, container)
        this.children.push(child)
    }

    removeChild(child: Renderable<any>) {
        const index = this.children.indexOf(child)
        if (index !== -1) {
            this.children.splice(index, 1)
            child.parent = undefined
        }
    }

    remove(options?: RenderableRemoveOptions) {
        this.kuflow?._unregisterRenderable(this)
        if (!this.destroyed && this.node) {
            if (this.kuflow.focusedNode?.id === this.id) {
                this.kuflow.focusedNode = null
            }
            this.onDestroy()
            this.node.remove()
        }
        if (options?.removeWithLink) {
            for (const linked of this._links) {
                linked.remove(options)
            }
        }
        this._links = new Set()
        for (const source of this._linkSources) {
            source.unlink(this)
        }
        for (const child of this.children) {
            child.remove()
        }
        if (this.parent) {
            this.parent.removeChild(this)
            this.parent.mark()
        }
        if (this.kuflow) {
            this.kuflow.pool = this.kuflow.pool.filter(a => a !== this)
        }
        this.destroyed = true
    }
}
