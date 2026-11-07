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
     * 4. Allow traversal through junctions and buildings.
     * 5. As soon as an isolation valve is reached, STOP traversal along that branch.
     * 6. If the Water Tower is reached, stop the whole search: no valve stands between the
     *    tower and the burst, so valves cannot isolate it (closing any would be unnecessary).
     * 7. Otherwise keep only the valves on the water-tower side ("upstream"): closing those cuts
     *    the burst off from the supply. Valves on the far side carry no water to the burst.
     */
    runFirstBFS(faultyU, faultyV, faultyPipeId) {
        const startTime = performance.now();
        const queue = [];
        const visited = new Set();
        const parentMap = {};
        const boundaryValves = new Set();
        const traversalOrder = [];
        const executionSteps = [];
        let reachedSource = false;

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
                if (this.nodes[ep].type === "source") reachedSource = true;
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

        // BFS loop (stops early once the Water Tower is reached)
        while (queue.length > 0 && !reachedSource) {
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
                        // Water Tower reached without passing a valve -> no valve can isolate the burst
                        reachedSource = true;
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
                            message: `Reached the Water Tower (${neighbor}) via ${pipe.label} without passing a valve. Search stops: no valve stands between the tower and the burst.`
                        });
                        break;
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

        // Decide which of the valves found actually need closing
        const valvesFound = Array.from(boundaryValves).sort();
        let valvesToClose = [];
        let skippedValves = valvesFound;
        let message;
        if (reachedSource) {
            message = "No valve stands between the Water Tower and this pipe, so closing valves cannot stop the leak. " +
                "Nothing will be closed (closing valves here would only cut off buildings). The leak continues until the pipe is repaired or the tower is shut.";
        } else {
            const region = new Set(Array.from(visited).filter(id => this.nodes[id].type !== "valve"));
            const upstream = this.reachableFromSource(region, faultyU, faultyV);
            valvesToClose = valvesFound.filter(id => upstream.has(id));
            skippedValves = valvesFound.filter(id => !upstream.has(id));
            message = `Valves to close: [${valvesToClose.join(", ")}] (on the water-tower side of the burst).` +
                (skippedValves.length ? ` Not needed: [${skippedValves.join(", ")}] (no water reaches the burst through them).` : "");
        }
        executionSteps.push({
            stepNumber: executionSteps.length + 1,
            action: reachedSource ? "NOT_ISOLATABLE" : "VALVES_SELECTED",
            phase: 1,
            currentNode: null,
            neighborNode: null,
            pipeId: null,
            highlightEdges: [],
            queueSnapshot: [],
            visitedNodes: Array.from(visited),
            traversalOrder: [...traversalOrder],
            boundaryValves: valvesToClose,
            message
        });

        const endTime = performance.now();
        const durationMs = (endTime - startTime).toFixed(2);

        return {
            faultyPipeline: { u: faultyU, v: faultyV, pipeId: faultyPipeId },
            boundaryValves: valvesToClose,      // the valves to close
            valvesFound,                        // every valve the search touched
            skippedValves,                      // found but not needed
            reachedSource,
            isolatable: !reachedSource,
            traversalOrder,
            visitedNodes: Array.from(visited),
            parentMap,
            steps: executionSteps,
            executionTimeMs: durationMs
        };
    }

    /**
     * Nodes the Water Tower can reach without entering the burst region or crossing the burst pipe.
     * A boundary valve in this set is "upstream": water would reach the burst through it.
     */
    reachableFromSource(region, faultyU, faultyV) {
        const sources = Object.keys(this.nodes).filter(id => this.nodes[id].type === "source");
        const seen = new Set(sources);
        const queue = [...sources];
        while (queue.length > 0) {
            const curr = queue.shift();
            for (const { neighbor } of this.adj[curr] || []) {
                if ((curr === faultyU && neighbor === faultyV) || (curr === faultyV && neighbor === faultyU)) continue;
                if (region.has(neighbor) || seen.has(neighbor)) continue;
                seen.add(neighbor);
                queue.push(neighbor);
            }
        }
        return seen;
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

        // The leak is stopped if no end of the burst pipe still receives water through an open node
        const leakIsolated = ![faultyU, faultyV].some(id => reachableNodes.has(id) && !closedValves.has(id));

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
            leakIsolated,
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

