export interface NodePortDefinition {
    label: string
    dataType: string[]
    defaultValue?: any
}

export interface NodeDefinition<
    TParams extends Record<string, any> = Record<string, any>,
    TInputs extends Record<string, any> = Record<string, any>,
    TOutputs extends Record<string, any> = Record<string, any>
> {
    type: string
    title: string
    inputs?: NodePortDefinition[]
    outputs?: NodePortDefinition[]
    body?: (form: HTMLFormElement) => void
    execute?: (inputs: TInputs, params: TParams) => TOutputs | Promise<TOutputs>
}

export class NodeRegistry {
    private _definitions = new Map<string, NodeDefinition>()

    define(definition: NodeDefinition): this {
        this._definitions.set(definition.type, definition)
        return this
    }

    get(type: string): NodeDefinition | undefined {
        return this._definitions.get(type)
    }

    has(type: string): boolean {
        return this._definitions.has(type)
    }

    list(): NodeDefinition[] {
        return Array.from(this._definitions.values())
    }
}
