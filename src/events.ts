import type { NodePort } from "./renderable";
import type { PortType } from "./type";

type name<T extends string> =
    T extends `${infer Head}${infer Rest}`
    ? Rest extends `${string}.${string}`
    ? never
    : Head extends `${string}.${string}`
    ? never
    : Rest extends Uppercase<Rest>
    ? `${Uppercase<Head>}${name<Rest>}`
    : `${Uncapitalize<Head>}_${name<Rest>}`
    : T;

const name = <T extends string>(str: name<T>): name<T> => str as name<T>

export const KUFLOW_PORT_MOUSEDOWN = name("KUFLOW_PORT_MOUSEDOWN")

export interface MouseEventExt extends MouseEvent {
    target: HTMLElement
}

export interface PortMouseDownEvent extends MouseEventExt {
    target: HTMLElement,
    interfaceType: string[]
    portType: PortType
    nodeId: string
    interfaceId: string
    port: NodePort
}