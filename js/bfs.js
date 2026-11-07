/**
 * Campus Water-Pipeline Fault Isolation Tool
 * Real-Time Breadth-First Search (BFS) Algorithmic Engine
 * 
 * Features:
 *  - First BFS: Multi-source Boundary Isolation Valve Identification
 *  - Second BFS: Water Source-Propagated Building Reachability Assessment
 *  - Step Generator for interactive step-by-step visual animation
 *  - Queue inspector logging for pedagogical transparency
 */

class CampusWaterBFS {
    constructor(networkData) {
        this.nodes = JSON.parse(JSON.stringify(networkData.nodes));
        this.pipelines = JSON.parse(JSON.stringify(networkData.pipelines));
        this.adj = this.buildAdjacency();
    }

    /**
     * Builds undirected adjacency list:
     * node_id -> array of { neighbor, pipeId, pipeData }
     */
    buildAdjacency() {
        const adj = {};
        for (const nodeId of Object.keys(this.nodes)) {
            adj[nodeId] = [];
        }

        for (const pipe of this.pipelines) {
            const { u, v, id } = pipe;
            if (adj[u] && adj[v]) {
                adj[u].push({ neighbor: v, pipeId: id, pipe });
                adj[v].push({ neighbor: u, pipeId: id, pipe });
            }
        }
        return adj;
    }

    /**
     * FIRST BFS: Boundary Isolation Valve Identification
     * 
     * Algorithmic Procedure:
     * 1. Initialize FIFO queue with both endpoints of the ruptured pipeline.
     * 2. Mark both endpoints as visited.
     * 3. Traverse outwards level-by-level through adjacent pipelines.
     * 4. Allow traversal through junctions, buildings, and water source.
     * 5. CRITICAL CONDITION: As soon as an isolation valve is reached, STOP traversal along that branch.
     * 6. Collect all boundary isolation valves surrounding the damaged section.
     */
    runFirstBFS(faultyU, faultyV, faultyPipeId) {
        const startTime = performance.now();
        const queue = [];
        const visited = new Set();
        const parentMap = {};
        const boundaryValves = new Set();
        const traversalOrder = [];
        const executionSteps = [];

        // Step 0: Check endpoints
        for (const ep of [faultyU, faultyV]) {
            visited.add(ep);
            traversalOrder.push(ep);
            parentMap[ep] = null;

            if (this.nodes[ep].type === "valve") {
                boundaryValves.add(ep);
                executionSteps.push({
                    stepNumber: executionSteps.length + 1,
                    action: "ENDPOINT_IS_VALVE",
                    phase: 1,
                    currentNode: ep,
                    neighborNode: null,
                    pipeId: faultyPipeId,
                    highlightEdges: [],
                    queueSnapshot: [...queue],
                    visitedNodes: Array.from(visited),
                    traversalOrder: [...traversalOrder],
                    boundaryValves: Array.from(boundaryValves),
                    message: `Endpoint ${ep} (${this.nodes[ep].name}) is an isolation valve. Added to boundary isolation set.`
                });
            } else {
                queue.push(ep);
                executionSteps.push({
                    stepNumber: executionSteps.length + 1,
                    action: "ENQUEUE_ENDPOINT",
                    phase: 1,
                    currentNode: ep,
                    neighborNode: null,
                    pipeId: faultyPipeId,
                    highlightEdges: [],
                    queueSnapshot: [...queue],
                    visitedNodes: Array.from(visited),
                    traversalOrder: [...traversalOrder],
                    boundaryValves: Array.from(boundaryValves),
                    message: `Enqueued faulty pipeline endpoint: ${ep} (${this.nodes[ep].name}) into FIFO queue.`
                });
            }
        }

        // BFS loop
        while (queue.length > 0) {
            const curr = queue.shift();
            const currNode = this.nodes[curr];

            executionSteps.push({
                stepNumber: executionSteps.length + 1,
                action: "DEQUEUE_NODE",
                phase: 1,
                currentNode: curr,
                neighborNode: null,
                pipeId: null,
                highlightEdges: [],
                queueSnapshot: [...queue],
                visitedNodes: Array.from(visited),
                traversalOrder: [...traversalOrder],
                boundaryValves: Array.from(boundaryValves),
                message: `Dequeued ${curr} (${currNode.name}) from queue. Inspecting all connected pipelines.`
            });

            // If current node is a valve and wasn't one of the initial endpoints, do not explore beyond it
            if (currNode.type === "valve" && curr !== faultyU && curr !== faultyV) {
                continue;
            }

            const neighbors = this.adj[curr] || [];
            for (const { neighbor, pipeId, pipe } of neighbors) {
                // Do NOT traverse across the ruptured pipe itself
                if ((curr === faultyU && neighbor === faultyV) || (curr === faultyV && neighbor === faultyU)) {
                    continue;
                }

                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    parentMap[neighbor] = curr;
                    traversalOrder.push(neighbor);
                    const nbrNode = this.nodes[neighbor];

                    if (nbrNode.type === "valve") {
                        // Reached an isolation valve -> STOP along this branch!
                        boundaryValves.add(neighbor);
                        executionSteps.push({
                            stepNumber: executionSteps.length + 1,
                            action: "VALVE_DISCOVERED",
                            phase: 1,
                            currentNode: curr,
                            neighborNode: neighbor,
                            pipeId: pipeId,
                            highlightEdges: [pipeId],
                            queueSnapshot: [...queue],
                            visitedNodes: Array.from(visited),
                            traversalOrder: [...traversalOrder],
                            boundaryValves: Array.from(boundaryValves),
                            message: `BOUNDARY VALVE FOUND: ${neighbor} (${nbrNode.name}) via ${pipe.label}. Halting traversal on this branch.`
                        });
                    } else if (nbrNode.type === "source") {
                        // Water source reached
                        queue.push(neighbor);
                        executionSteps.push({
                            stepNumber: executionSteps.length + 1,
                            action: "SOURCE_REACHED",
                            phase: 1,
                            currentNode: curr,
                            neighborNode: neighbor,
                            pipeId: pipeId,
                            highlightEdges: [pipeId],
                            queueSnapshot: [...queue],
                            visitedNodes: Array.from(visited),
                            traversalOrder: [...traversalOrder],
                            boundaryValves: Array.from(boundaryValves),
                            message: `Reached Water Tower ${neighbor} via ${pipe.label}. Enqueued to explore adjacent trunks.`
                        });
                    } else {
                        // Junction or building
                        queue.push(neighbor);
                        executionSteps.push({
                            stepNumber: executionSteps.length + 1,
                            action: "ENQUEUE_NEIGHBOR",
                            phase: 1,
                            currentNode: curr,
                            neighborNode: neighbor,
                            pipeId: pipeId,
                            highlightEdges: [pipeId],
                            queueSnapshot: [...queue],
                            visitedNodes: Array.from(visited),
                            traversalOrder: [...traversalOrder],
                            boundaryValves: Array.from(boundaryValves),
                            message: `Discovered ${nbrNode.type} ${neighbor} (${nbrNode.name}) via ${pipe.label}. Enqueued for expansion.`
                        });
                    }
                }
            }
        }

        const endTime = performance.now();
        const durationMs = (endTime - startTime).toFixed(2);

        return {
            faultyPipeline: { u: faultyU, v: faultyV, pipeId: faultyPipeId },
            boundaryValves: Array.from(boundaryValves).sort(),
            traversalOrder,
            visitedNodes: Array.from(visited),
            parentMap,
            steps: executionSteps,
            executionTimeMs: durationMs
        };
    }

    /**
     * SECOND BFS: Water Supply Propagation & Affected Buildings Assessment
     * 
     * Algorithmic Procedure:
     * 1. Simulate closing all boundary isolation valves (they physically block water flow).
     * 2. Remove the faulty pipeline from network circulation.
     * 3. Start BFS from the Water Tower ('WT').
     * 4. Discover all reachable junctions, valves, and buildings.
     * 5. Water cannot flow past closed boundary valves.
     * 6. Buildings reachable = OPERATIONAL (receiving water).
     * 7. Buildings unreachable = AFFECTED (water supply disrupted).
     */
    runSecondBFS(faultyU, faultyV, closedValvesList) {
        const startTime = performance.now();
        const closedValves = new Set(closedValvesList);
        const queue = ["WT"];
        const reachableNodes = new Set(["WT"]);
        const parentMap = { WT: null };
        const traversalOrder = ["WT"];
        const executionSteps = [];

        executionSteps.push({
            stepNumber: executionSteps.length + 1,
            action: "SOURCE_INITIALIZED",
            phase: 2,
            currentNode: "WT",
            neighborNode: null,
            pipeId: null,
            highlightEdges: [],
            queueSnapshot: [...queue],
            visitedNodes: Array.from(reachableNodes),
            reachableNodes: Array.from(reachableNodes),
            traversalOrder: [...traversalOrder],
            message: "Second BFS started at the Central Water Tower ('WT') with the boundary valves closed."
        });

        while (queue.length > 0) {
            const curr = queue.shift();
            const currNode = this.nodes[curr];

            executionSteps.push({
                stepNumber: executionSteps.length + 1,
                action: "DEQUEUE_FLOW",
                phase: 2,
                currentNode: curr,
                neighborNode: null,
                pipeId: null,
                highlightEdges: [],
                queueSnapshot: [...queue],
                visitedNodes: Array.from(reachableNodes),
                reachableNodes: Array.from(reachableNodes),
                traversalOrder: [...traversalOrder],
                message: `Dequeued ${curr} (${currNode.name}). Checking which neighbours it connects to.`
            });

            // If current node is a closed valve, water cannot pass through it to downstream pipes
            if (closedValves.has(curr)) {
                continue;
            }

            const neighbors = this.adj[curr] || [];
            for (const { neighbor, pipeId, pipe } of neighbors) {
                // Do NOT pass through the severed/faulty pipe
                if ((curr === faultyU && neighbor === faultyV) || (curr === faultyV && neighbor === faultyU)) {
                    continue;
                }

                // If neighbor is a closed valve, water reaches its upstream side, but cannot go beyond
                if (closedValves.has(neighbor)) {
                    if (!reachableNodes.has(neighbor)) {
                        reachableNodes.add(neighbor);
                        parentMap[neighbor] = curr;
                        traversalOrder.push(neighbor);
                        executionSteps.push({
                            stepNumber: executionSteps.length + 1,
                            action: "BLOCKED_AT_VALVE",
                            phase: 2,
                            currentNode: curr,
                            neighborNode: neighbor,
                            pipeId: pipeId,
                            highlightEdges: [pipeId],
                            queueSnapshot: [...queue],
                            visitedNodes: Array.from(reachableNodes),
                            reachableNodes: Array.from(reachableNodes),
                            traversalOrder: [...traversalOrder],
                            message: `Reached closed valve ${neighbor} via ${pipe.label}. The search stops here (valve is CLOSED).`
                        });
                    }
                    continue;
                }

                if (!reachableNodes.has(neighbor)) {
                    reachableNodes.add(neighbor);
                    parentMap[neighbor] = curr;
                    traversalOrder.push(neighbor);
                    queue.push(neighbor);

                    const nbrNode = this.nodes[neighbor];
                    executionSteps.push({
                        stepNumber: executionSteps.length + 1,
                        action: "WATER_PROPAGATED",
                        phase: 2,
                        currentNode: curr,
                        neighborNode: neighbor,
                        neighborType: nbrNode.type,
                        pipeId: pipeId,
                        highlightEdges: [pipeId],
                        queueSnapshot: [...queue],
                        visitedNodes: Array.from(reachableNodes),
                        reachableNodes: Array.from(reachableNodes),
                        traversalOrder: [...traversalOrder],
                        message: `${nbrNode.type} ${neighbor} (${nbrNode.name}) is reachable via ${pipe.label}. Enqueued.`
                    });
                }
            }
        }

        const allBuildings = Object.keys(this.nodes).filter(id => this.nodes[id].type === "building");
        const operationalBuildings = allBuildings.filter(id => reachableNodes.has(id));
        const affectedBuildings = allBuildings.filter(id => !reachableNodes.has(id));
        const unreachableNodes = Object.keys(this.nodes).filter(id => !reachableNodes.has(id));

        const totalDemand = allBuildings.reduce((sum, b) => sum + (this.nodes[b].demand || 50), 0);
        const operationalDemand = operationalBuildings.reduce((sum, b) => sum + (this.nodes[b].demand || 50), 0);
        const affectedDemand = affectedBuildings.reduce((sum, b) => sum + (this.nodes[b].demand || 50), 0);
        const protectionEfficiency = totalDemand ? ((operationalDemand / totalDemand) * 100).toFixed(1) : "100.0";

        const endTime = performance.now();
        const durationMs = (endTime - startTime).toFixed(2);

        return {
            closedValves: Array.from(closedValves).sort(),
            reachableNodes: Array.from(reachableNodes),
            unreachableNodes,
            operationalBuildings,
            affectedBuildings,
            totalBuildings: allBuildings.length,
            traversalOrder,
            parentMap,
            steps: executionSteps,
            metrics: {
                totalDemand,
                operationalDemand,
                affectedDemand,
                protectionEfficiency,
                ratioString: `${operationalBuildings.length} of ${allBuildings.length} Buildings Active`
            },
            executionTimeMs: durationMs
        };
    }

    /**
     * Finds pipe object between two endpoints
     */
    findPipe(u, v) {
        return this.pipelines.find(p => (p.u === u && p.v === v) || (p.u === v && p.v === u));
    }
}

// Export for browser or node
if (typeof module !== "undefined" && module.exports) {
    module.exports = CampusWaterBFS;
}

