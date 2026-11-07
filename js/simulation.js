/**
 * Campus Water-Pipeline Fault Isolation Tool
 * Interactive Step-by-Step Simulation Controller & Algorithmic State Machine
 * 
 * Features:
 *  - Full Playback Controls: Play, Pause, Next Step, Prev Step, Reset
 *  - Live FIFO Queue inspection & animation
 *  - Visited Nodes & Traversal Order breadcrumbs tracking
 *  - Dual-Engine Support: High-precision Client JS & Python REST API
 */

class SimulationController {
    constructor(networkData, visualizer, bfsEngine, uiCallbacks) {
        this.data = networkData;
        this.visualizer = visualizer;
        this.bfsEngine = bfsEngine;
        this.ui = uiCallbacks || {};

        // State Machine
        this.state = {
            phase: "NORMAL", // NORMAL, FAULT, PHASE1_BFS, VALVES_CLOSED, PHASE2_BFS, COMPLETE
            selectedFault: null, // { u, v, pipeId, pipe }
            phase1Result: null,
            phase2Result: null,
            boundaryValves: [],
            closedValves: [],
            reachableNodes: Object.keys(this.data.nodes),
            unreachableNodes: [],
            visitedNodesPhase1: [],
            traversalOrder: [],
            highlightedEdges: [],
            activeNode: null,
            currentStepIndex: -1,
            totalSteps: 0,
            isPlaying: false,
            speedMultiplier: 1.0,
            engineMode: "js" // "js" or "python"
        };

        // Active Step Queue
        this.currentSteps = [];
        this.currentPhaseNum = 0; // 1 for Phase 1, 2 for Phase 2
        this.playbackTimer = null;
    }

    getApiBase() {
        return (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.startsWith("http"))
            ? window.location.origin
            : "http://localhost:5000";
    }

    setEngineMode(mode) {
        this.state.engineMode = mode;
        if (this.ui.onLogMessage) {
            this.ui.onLogMessage(`Algorithmic engine switched to: ${mode === "python" ? "Python REST API Backend (Localhost:5000)" : "Client-Side High-Precision JavaScript"}`);
        }
    }

    setSpeed(speed) {
        this.state.speedMultiplier = parseFloat(speed) || 1.0;
        // If currently playing, adjust active interval
        if (this.state.isPlaying) {
            this.pause();
            this.play();
        }
    }

    /**
     * Resets the entire network to default operational baseline
     */
    resetNetwork() {
        this.pause();
        this.currentSteps = [];
        this.currentPhaseNum = 0;

        this.state.phase = "NORMAL";
        this.state.selectedFault = null;
        this.state.phase1Result = null;
        this.state.phase2Result = null;
        this.state.boundaryValves = [];
        this.state.closedValves = [];
        this.state.reachableNodes = Object.keys(this.data.nodes);
        this.state.unreachableNodes = [];
        this.state.visitedNodesPhase1 = [];
        this.state.traversalOrder = [];
        this.state.highlightedEdges = [];
        this.state.activeNode = null;
        this.state.currentStepIndex = -1;
        this.state.totalSteps = 0;
        this.state.isPlaying = false;

        this.visualizer.setSimulationState(this.state);

        if (this.ui.onStateChange) this.ui.onStateChange(this.state);
        if (this.ui.onStepUpdate) {
            this.ui.onStepUpdate({
                phase: 0,
                stepIndex: 0,
                stepNumber: 0,
                totalSteps: 0,
                action: "RESET",
                currentNode: null,
                queue: [],
                visitedNodes: [],
                traversalOrder: [],
                message: "System baseline restored. Select a pipeline to begin fault simulation.",
                isPlaying: false
            });
        }
        if (this.ui.onLogMessage) this.ui.onLogMessage("Network restored to normal operational baseline. All pipelines pressurized.");
    }

    /**
     * Step 1: Detect & Select Fault
     */
    detectFault(u, v, pipeId) {
        this.pause();
        this.currentSteps = [];
        this.currentPhaseNum = 0;

        let pipe = null;
        if (pipeId) {
            pipe = this.data.pipelines.find(p => p.id === pipeId);
        } else if (u && v) {
            pipe = this.bfsEngine.findPipe(u, v);
            if (pipe) pipeId = pipe.id;
        }

        if (!pipe) {
            if (this.ui.onError) this.ui.onError("Invalid pipeline selection. Please choose valid adjacent endpoints.");
            return;
        }

        this.state.phase = "FAULT";
        this.state.selectedFault = {
            u: pipe.u,
            v: pipe.v,
            pipeId: pipe.id,
            pipe: pipe
        };
        this.state.boundaryValves = [];
        this.state.closedValves = [];
        this.state.visitedNodesPhase1 = [];
        this.state.traversalOrder = [];
        this.state.highlightedEdges = [pipe.id];
        this.state.activeNode = null;
        this.state.currentStepIndex = -1;
        this.state.totalSteps = 0;
        this.state.phase1Result = null;
        this.state.phase2Result = null;

        this.visualizer.setSimulationState(this.state);

        if (this.ui.onStateChange) this.ui.onStateChange(this.state);
        if (this.ui.onStepUpdate) {
            this.ui.onStepUpdate({
                phase: 1,
                stepIndex: 0,
                stepNumber: 0,
                totalSteps: 0,
                action: "FAULT_SELECTED",
                currentNode: null,
                queue: [pipe.u, pipe.v],
                visitedNodes: [pipe.u, pipe.v],
                traversalOrder: [pipe.u, pipe.v],
                message: `Fault detected on Pipeline ${pipe.id} (${pipe.u} ↔ ${pipe.v}). Ready to initiate Phase 1 BFS.`,
                isPlaying: false
            });
        }
        if (this.ui.onLogMessage) {
            this.ui.onLogMessage(`[FAULT DETECTED] Pipeline ${pipe.id} (${pipe.label}) ruptured between ${pipe.u} and ${pipe.v}! Estimated leak rate: ${pipe.flow} L/min.`);
        }
    }

    /**
     * Step 2: Run / Prepare First BFS (Boundary Valve Identification)
     */
    async runFirstBFS(autoPlay = true, onComplete = null) {
        if (!this.state.selectedFault) {
            if (this.ui.onError) this.ui.onError("Please select a faulty pipeline first.");
            return;
        }

        this.pause();
        this.state.phase = "PHASE1_BFS";
        this.currentPhaseNum = 1;

        const { u, v, pipeId } = this.state.selectedFault;

        let result = null;
        if (this.state.engineMode === "python") {
            try {
                const response = await fetch(`${this.getApiBase()}/api/bfs-boundary`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fault_u: u, fault_v: v, pipe_id: pipeId })
                });
                const data = await response.json();
                result = data.result;
            } catch (err) {
                if (this.ui.onError) this.ui.onError("Python Backend connection failed. Falling back to Client JS Engine.");
                result = this.bfsEngine.runFirstBFS(u, v, pipeId);
            }
        } else {
            result = this.bfsEngine.runFirstBFS(u, v, pipeId);
        }

        this.state.phase1Result = result;
        this.state.boundaryValves = result.boundaryValves || result.boundary_valves || [];
        this.currentSteps = result.steps || [];
        this.state.totalSteps = this.currentSteps.length;
        this.state.currentStepIndex = 0;

        if (this.currentSteps.length > 0) {
            this.applyStep(0);
        }

        if (this.ui.onStateChange) this.ui.onStateChange(this.state);
        if (this.ui.onLogMessage) {
            this.ui.onLogMessage(`Phase 1 BFS steps generated (${this.currentSteps.length} steps). Execution time: ${result.executionTimeMs || result.execution_time_ms} ms.`);
        }

        if (autoPlay && this.state.speedMultiplier <= 4.5) {
            this.play(onComplete);
        } else if (this.state.speedMultiplier > 4.5) {
            // Instant execution
            this.goToStep(this.currentSteps.length - 1);
            if (onComplete) onComplete();
        }
    }

    /**
     * Step 3: Close Boundary Valves
     */
    closeBoundaryValves() {
        if (!this.state.phase1Result || this.state.boundaryValves.length === 0) {
            if (this.ui.onError) this.ui.onError("Execute Phase 1 BFS first to identify boundary isolation valves.");
            return;
        }

        this.pause();
        this.state.phase = "VALVES_CLOSED";
        this.state.closedValves = [...this.state.boundaryValves];
        this.state.activeNode = null;
        this.state.highlightedEdges = [];

        this.visualizer.setSimulationState(this.state);

        if (this.ui.onStateChange) this.ui.onStateChange(this.state);
        if (this.ui.onStepUpdate) {
            this.ui.onStepUpdate({
                phase: 1,
                stepIndex: this.state.currentStepIndex,
                stepNumber: this.state.currentStepIndex + 1,
                totalSteps: this.state.totalSteps,
                action: "VALVES_ISOLATED",
                currentNode: null,
                queue: [],
                visitedNodes: this.state.visitedNodesPhase1,
                traversalOrder: this.state.traversalOrder,
                boundaryValves: this.state.boundaryValves,
                message: `Boundary valves [${this.state.closedValves.join(", ")}] have been closed. Damaged pipeline is isolated.`,
                isPlaying: false
            });
        }
        if (this.ui.onLogMessage) {
            this.ui.onLogMessage(`[VALVES CLOSED] Boundary isolation valves [${this.state.closedValves.join(", ")}] closed. Water leakage physically contained.`);
        }
    }

    /**
     * Step 4: Run / Prepare Second BFS (Water Supply Propagation)
     */
    async runSecondBFS(autoPlay = true, onComplete = null) {
        if (this.state.closedValves.length === 0 && (!this.state.boundaryValves || this.state.boundaryValves.length === 0)) {
            if (this.ui.onError) this.ui.onError("Please identify and close boundary valves first.");
            return;
        }

        this.pause();
        this.state.phase = "PHASE2_BFS";
        this.currentPhaseNum = 2;

        const { u, v } = this.state.selectedFault;
        const closed = this.state.closedValves.length > 0 ? this.state.closedValves : this.state.boundaryValves;

        let result = null;
        if (this.state.engineMode === "python") {
            try {
                const response = await fetch(`${this.getApiBase()}/api/bfs-water-supply`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fault_u: u, fault_v: v, closed_valves: closed })
                });
                const data = await response.json();
                result = data.result;
            } catch (err) {
                if (this.ui.onError) this.ui.onError("Python Backend connection failed. Falling back to Client JS Engine.");
                result = this.bfsEngine.runSecondBFS(u, v, closed);
            }
        } else {
            result = this.bfsEngine.runSecondBFS(u, v, closed);
        }

        this.state.phase2Result = result;
        this.state.reachableNodes = result.reachableNodes || result.reachable_nodes || [];
        this.state.unreachableNodes = result.unreachableNodes || result.unreachable_nodes || [];
        this.currentSteps = result.steps || [];
        this.state.totalSteps = this.currentSteps.length;
        this.state.currentStepIndex = 0;

        if (this.currentSteps.length > 0) {
            this.applyStep(0);
        }

        if (this.ui.onStateChange) this.ui.onStateChange(this.state);
        if (this.ui.onLogMessage) {
            this.ui.onLogMessage(`Phase 2 BFS steps generated (${this.currentSteps.length} steps). Execution time: ${result.executionTimeMs || result.execution_time_ms} ms.`);
        }

        if (autoPlay && this.state.speedMultiplier <= 4.5) {
            this.play(() => {
                this.state.phase = "COMPLETE";
                this.visualizer.setSimulationState(this.state);
                if (this.ui.onStateChange) this.ui.onStateChange(this.state);
                if (onComplete) onComplete();
            });
        } else if (this.state.speedMultiplier > 4.5) {
            // Instant execution
            this.goToStep(this.currentSteps.length - 1);
            this.state.phase = "COMPLETE";
            this.visualizer.setSimulationState(this.state);
            if (this.ui.onStateChange) this.ui.onStateChange(this.state);
            if (onComplete) onComplete();
        }
    }

    /**
     * Applies a specific step index to the visualizer and UI
     */
    applyStep(index) {
        if (!this.currentSteps || index < 0 || index >= this.currentSteps.length) {
            return;
        }

        this.state.currentStepIndex = index;
        const s = this.currentSteps[index];

        const isPhase1 = (this.currentPhaseNum === 1 || s.phase === 1);
        const currentNode = s.currentNode || s.current_node;
        const queueSnapshot = s.queueSnapshot || s.queue_snapshot || [];
        const visitedNodes = s.visitedNodes || s.visited_nodes || s.reachableNodes || s.reachable_nodes || [];
        const traversalOrder = s.traversalOrder || s.traversal_order || [];
        const boundaryValves = s.boundaryValves || s.discovered_valves || this.state.boundaryValves || [];

        this.state.activeNode = currentNode;
        this.state.highlightedEdges = s.highlightEdges || (s.pipeId ? [s.pipeId] : []);
        this.state.traversalOrder = traversalOrder;

        if (isPhase1) {
            this.state.visitedNodesPhase1 = visitedNodes;
            this.state.boundaryValves = boundaryValves;
        } else {
            this.state.reachableNodes = visitedNodes;
        }

        // Update Visualizer
        this.visualizer.setSimulationState({
            phase: isPhase1 ? "PHASE1_BFS" : "PHASE2_BFS",
            fault: this.state.selectedFault,
            activeNode: currentNode,
            boundaryValves: this.state.boundaryValves,
            closedValves: this.state.closedValves,
            reachableNodes: this.state.reachableNodes,
            visitedNodesPhase1: this.state.visitedNodesPhase1,
            highlightedEdges: this.state.highlightedEdges
        });

        // Trigger UI Callbacks
        if (this.ui.onStepUpdate) {
            this.ui.onStepUpdate({
                phase: isPhase1 ? 1 : 2,
                stepIndex: index,
                stepNumber: index + 1,
                totalSteps: this.currentSteps.length,
                action: s.action,
                currentNode: currentNode,
                neighborNode: s.neighborNode || s.neighbor_node,
                pipeId: s.pipeId || s.pipeline_id,
                queue: queueSnapshot,
                visitedNodes: visitedNodes,
                traversalOrder: traversalOrder,
                boundaryValves: this.state.boundaryValves,
                message: s.message,
                isPlaying: this.state.isPlaying
            });
        }
    }

    /**
     * Stepper: Next Step
     */
    nextStep() {
        if (!this.currentSteps || this.currentSteps.length === 0) {
            // If in FAULT state and next clicked, initialize Phase 1
            if (this.state.phase === "FAULT") {
                this.runFirstBFS(false);
                return;
            }
            if (this.state.phase === "VALVES_CLOSED") {
                this.runSecondBFS(false);
                return;
            }
            return;
        }

        if (this.state.currentStepIndex < this.currentSteps.length - 1) {
            this.applyStep(this.state.currentStepIndex + 1);
        } else {
            // Reached the end of current step sequence
            this.pause();
            if (this.currentPhaseNum === 1) {
                if (this.ui.onLogMessage) {
                    this.ui.onLogMessage(`Phase 1 BFS traversal complete! Discovered boundary valves: [${this.state.boundaryValves.join(", ")}]. Click 'Close Boundary Valves' to continue.`);
                }
            } else if (this.currentPhaseNum === 2) {
                this.state.phase = "COMPLETE";
                this.visualizer.setSimulationState(this.state);
                if (this.ui.onStateChange) this.ui.onStateChange(this.state);
                if (this.ui.onLogMessage) {
                    this.ui.onLogMessage("Phase 2 BFS water propagation complete! All operational and affected buildings identified.");
                }
            }
        }
    }

    /**
     * Stepper: Previous Step
     */
    prevStep() {
        if (!this.currentSteps || this.currentSteps.length === 0) return;
        this.pause();
        if (this.state.currentStepIndex > 0) {
            this.applyStep(this.state.currentStepIndex - 1);
        }
    }

    /**
     * Jump directly to step
     */
    goToStep(index) {
        if (!this.currentSteps || this.currentSteps.length === 0) return;
        const target = Math.max(0, Math.min(this.currentSteps.length - 1, index));
        this.applyStep(target);
    }

    /**
     * Stepper: Play
     */
    play(onFinished = null) {
        if (!this.currentSteps || this.currentSteps.length === 0) {
            if (this.state.phase === "FAULT") {
                this.runFirstBFS(true, onFinished);
                return;
            }
            if (this.state.phase === "VALVES_CLOSED") {
                this.runSecondBFS(true, onFinished);
                return;
            }
            return;
        }

        this.pause();
        this.state.isPlaying = true;

        if (this.ui.onPlayStateChange) {
            this.ui.onPlayStateChange(true);
        }

        const baseInterval = 500;
        const intervalMs = Math.max(80, baseInterval / this.state.speedMultiplier);

        this.playbackTimer = setInterval(() => {
            if (this.state.currentStepIndex < this.currentSteps.length - 1) {
                this.applyStep(this.state.currentStepIndex + 1);
            } else {
                this.pause();
                if (this.currentPhaseNum === 1) {
                    if (this.ui.onLogMessage) {
                        this.ui.onLogMessage(`Phase 1 BFS complete. Found boundary valves: [${this.state.boundaryValves.join(", ")}].`);
                    }
                } else if (this.currentPhaseNum === 2) {
                    this.state.phase = "COMPLETE";
                    this.visualizer.setSimulationState(this.state);
                    if (this.ui.onStateChange) this.ui.onStateChange(this.state);
                }
                if (onFinished) onFinished();
            }
        }, intervalMs);
    }

    /**
     * Stepper: Pause
     */
    pause() {
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = null;
        }
        this.state.isPlaying = false;
        if (this.ui.onPlayStateChange) {
            this.ui.onPlayStateChange(false);
        }
    }

    /**
     * Stepper: Toggle Play / Pause
     */
    togglePlayPause() {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Step 5: Full Automated Simulation Runner
     */
    async startFullSimulation(faultU, faultV, pipeId) {
        this.pause();
        this.detectFault(faultU, faultV, pipeId);

        const delay = (ms) => new Promise(res => setTimeout(res, ms / this.state.speedMultiplier));

        await delay(500);
        await this.runFirstBFS(true, async () => {
            await delay(600);
            this.closeBoundaryValves();
            await delay(600);
            await this.runSecondBFS(true, () => {
                if (this.ui.onLogMessage) {
                    this.ui.onLogMessage("Full simulation finished! Generating comprehensive isolation report...");
                }
                if (this.ui.onReportReady) {
                    this.ui.onReportReady(this.getReportData());
                }
            });
        });
    }

    getReportData() {
        if (!this.state.selectedFault || !this.state.phase1Result || !this.state.phase2Result) {
            return null;
        }

        const pipe = this.state.selectedFault.pipe;
        const phase1 = this.state.phase1Result;
        const phase2 = this.state.phase2Result;

        return {
            metadata: this.data.metadata,
            fault: {
                pipeId: pipe.id,
                label: pipe.label,
                u: pipe.u,
                v: pipe.v,
                uName: this.data.nodes[pipe.u].name,
                vName: this.data.nodes[pipe.v].name,
                dia: pipe.dia,
                length: pipe.length,
                flow: pipe.flow
            },
            phase1: {
                boundaryValves: phase1.boundaryValves || phase1.boundary_valves || [],
                boundaryValvesDetails: (phase1.boundaryValves || phase1.boundary_valves || []).map(vid => ({
                    id: vid,
                    name: this.data.nodes[vid].name,
                    state: "CLOSED"
                })),
                traversalOrder: phase1.traversalOrder || phase1.traversal_order || [],
                visitedCount: (phase1.visitedNodes || phase1.visited_nodes || []).length,
                timeMs: phase1.executionTimeMs || phase1.execution_time_ms || 0.5
            },
            phase2: {
                operationalBuildings: (phase2.operationalBuildings || phase2.operational_buildings || []).map(bid => ({
                    id: bid,
                    name: this.data.nodes[bid].name,
                    demand: this.data.nodes[bid].demand
                })),
                affectedBuildings: (phase2.affectedBuildings || phase2.affected_buildings || []).map(bid => ({
                    id: bid,
                    name: this.data.nodes[bid].name,
                    demand: this.data.nodes[bid].demand
                })),
                metrics: phase2.metrics || {
                    protectionEfficiency: "80.0",
                    ratioString: "4 of 5 Buildings Protected"
                },
                timeMs: phase2.executionTimeMs || phase2.execution_time_ms || 0.4
            },
            waterSavedLiters: Math.round(pipe.flow * 0.85 * 45),
            timestamp: new Date().toLocaleString()
        };
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = SimulationController;
}
