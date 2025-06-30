import type { NodeBasic } from "./renderable";
type Graph = Map<NodeBasic, NodeBasic[]>;

export function detectCycles(graph: Graph): NodeBasic[][] {
    const visited: Set<NodeBasic> = new Set();
    const recursionStack: Set<NodeBasic> = new Set();
    const cycles: NodeBasic[][] = [];
    const pathStack: NodeBasic[] = [];
    for (const node of graph.keys()) {
        if (!visited.has(node)) {
            dfs(node, visited, recursionStack, pathStack, cycles, graph);
        }
    }
    return cycles;
}

function dfs(
    node: NodeBasic,
    visited: Set<NodeBasic>,
    recursionStack: Set<NodeBasic>,
    pathStack: NodeBasic[],
    cycles: NodeBasic[][],
    graph: Graph
): void {
    visited.add(node);
    recursionStack.add(node);
    pathStack.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
            dfs(neighbor, visited, recursionStack, pathStack, cycles, graph);
        }
        else if (recursionStack.has(neighbor)) {
            const cycleStart = pathStack.indexOf(neighbor);
            const cycle = pathStack.slice(cycleStart);
            cycles.push([...cycle, neighbor]);
        }
    }

    recursionStack.delete(node);
    pathStack.pop();
}

export function mapLinks(edges: [NodeBasic, NodeBasic][]): Graph {
    const graph: Graph = new Map();

    edges.forEach(([from, to]) => {
        if (!graph.has(from)) {
            graph.set(from, []);
        }
        graph.get(from)!.push(to);

        if (!graph.has(to)) {
            graph.set(to, []);
        }
    });

    return graph;
}