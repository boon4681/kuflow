
export type D3Any = d3.Selection<any, any, any, any>
export type D3Div<Data = any> = d3.Selection<HTMLDivElement, Data, any, any>
export type D3Path<Data = any> = d3.Selection<SVGPathElement, Data, any, any>

export interface INodePosition {
    x: number
    y: number
}

export interface INodePort {
    id: string
    nodeId: string
    label: string
    dataType: string[]
    defaultValue?: any
}

export type PortType = "input" | "output"