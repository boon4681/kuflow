import type { Kuflow } from "../kuflow"
import type { D3Any } from "../type"

export abstract class Renderable<T extends D3Any> {
    protected dirty = false
    protected mounted = false
    protected isDestroyed = false
    public parent!: Renderable<any> | undefined
    protected parentNode!: D3Any
    protected children: Renderable<any>[] = []
    /**
     * Link other object to this object.
     * when this object got marked, mark all objects that linked to this object
     */
    protected _link: Set<Renderable<any>> = new Set()
    protected _linkSource: Set<Renderable<any>> = new Set()
    private _constructPhase = true
    node!: T

    abstract id: string
    abstract update(): void
    protected kuflow!: Kuflow
    abstract onMount(container?: D3Any, ...rest: any): void
    onDestroy(): void { }
    onLinkMarked(): void { }

    get isDirty() {
        return this.dirty
    }
    get htmlNode(): HTMLElement {
        return (this.node as any)._groups[0][0]
    }
    public readonly mount = (kuflow: Kuflow, parent?: Renderable<any>, container?: D3Any, ...rest: any) => {
        this._constructPhase = false
        this.kuflow = kuflow
        this.kuflow
        if (parent) {
            this.parent = parent
            this.parentNode = parent.node
        }
        this.kuflow._registerRenderable(this)
        this.mark()
        this.onMount(container ?? parent?.node, ...rest)
        this.mounted = true
    }
    public readonly bind = (node: T) => {
        if (this.node) {
            throw new Error("This object is already bind.")
        }
        this.node = node
    }
    public readonly mark = () => {
        this.dirty = true
        this.kuflow.renderingPool.push(this)
        for (const obj of this._link) {
            obj.onLinkMarked()
            obj.mark()
        }
    }
    public readonly link = (obj: Renderable<any>) => {
        this._link.add(obj)
        obj._linkSource.add(this)
    }
    public readonly unlink = (obj: Renderable<any>) => {
        this._link.delete(obj)
        obj._linkSource.delete(this)
    }
    public readonly unmark = () => {
        this.dirty = false
    }
    public readonly render = () => {
        if (!this.dirty) {
            return;
        }
        this.update() // render-self
        for (const child of this.children) {
            child.render();
        }
        this.unmark()
    }
    public readonly removeChild = (node: Renderable<any>): void => {
        const index = this.children.findIndex(child => child != node);
        if (index !== -1) {
            const child = this.children[index];
            child.parent = undefined;
            this.children.splice(index, 1);
            this.mark();
        }
    }
    public readonly addChild = (container: D3Any, child: Renderable<D3Any>, ...rest: any): void => {
        if (this._constructPhase) throw new Error("cannot add child object during constructor phase")
        child.mount(this.kuflow, this, container, ...rest)
        this.children.push(child)
        child.mark()
    }
    public readonly remove = () => {
        this.kuflow._unregisterRenderable(this)
        if (!this.isDestroyed && this.node) {
            this.onDestroy()
            this.node.remove()
        }
        this._link = new Set()
        for (const source of this._linkSource) {
            source.unlink(this)
        }
        for (const child of this.children) {
            child.remove()
        }
        if (this.parent) {
            this.parent.removeChild(this)
            this.parent.mark()
        }
        if (this.kuflow) this.kuflow.pool = this.kuflow.pool.filter(a => a != this)
        this.isDestroyed = true
    }
}