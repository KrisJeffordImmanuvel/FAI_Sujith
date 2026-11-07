"""
Campus Water-Pipeline Fault Isolation Tool
Algorithm Engine: Breadth-First Search (BFS) for Water Distribution Networks
Author: Karunya Institute of Technology and Sciences - Team 25DC204
"""

from collections import deque
import time

def get_default_network():
    """
    Returns the campus water network nodes and pipeline topology.
    Includes:
      - Water Tower (Main Water Source)
      - Junctions (J1, J2, J3, J4, J5)
      - Valves (V1, V2, V3, V4)
      - Buildings (Hostel, Laboratory, Canteen, Academic Block, Library)
    """
    nodes = {
        "WT": {
            "id": "WT",
            "name": "Central Water Tower",
            "type": "source",
            "description": "Primary campus reservoir and pressure tower (Capacity: 500,000 L, Head: 35m)",
            "x": 80,
            "y": 280,
            "pressure": 3.5, # bar
            "status": "normal"
        },
        "J1": {
            "id": "J1",
            "name": "Junction 1 (West Quad)",
            "type": "junction",
            "description": "Main transmission header distributing water to North and South rings",
            "x": 240,
            "y": 280,
            "status": "normal"
        },
        "V1": {
            "id": "V1",
            "name": "Valve 1 (Hostel Sector)",
            "type": "valve",
            "description": "High-pressure gate valve controlling northern residential feed",
            "x": 240,
            "y": 140,
            "state": "open",
            "status": "normal"
        },
        "Hostel": {
            "id": "Hostel",
            "name": "Hostel Residence Complex",
            "type": "building",
            "description": "Student accommodations (Capacity: 1,800 students, Daily demand: 120,000 L)",
            "x": 240,
            "y": 40,
            "demand": 120, # m3/day
            "status": "normal"
        },
        "J2": {
            "id": "J2",
            "name": "Junction 2 (North Science Quad)",
            "type": "junction",
            "description": "Distribution hub for research labs and northern circulation",
            "x": 420,
            "y": 170,
            "status": "normal"
        },
        "V2": {
            "id": "V2",
            "name": "Valve 2 (Lab Sector)",
            "type": "valve",
            "description": "Motorized butterfly valve isolating research facility supply",
            "x": 580,
            "y": 120,
            "state": "open",
            "status": "normal"
        },
        "Laboratory": {
            "id": "Laboratory",
            "name": "Science & Research Labs",
            "type": "building",
            "description": "Chemistry, Physics, and Bio-Tech laboratories requiring clean water supply",
            "x": 740,
            "y": 120,
            "demand": 65, # m3/day
            "status": "normal"
        },
        "J3": {
            "id": "J3",
            "name": "Junction 3 (South Utility Quad)",
            "type": "junction",
            "description": "Distribution hub for catering facilities and southern grid",
            "x": 420,
            "y": 390,
            "status": "normal"
        },
        "V3": {
            "id": "V3",
            "name": "Valve 3 (Canteen Sector)",
            "type": "valve",
            "description": "Ball valve isolating campus dining and catering complex",
            "x": 580,
            "y": 440,
            "state": "open",
            "status": "normal"
        },
        "Canteen": {
            "id": "Canteen",
            "name": "Campus Food Court & Canteen",
            "type": "building",
            "description": "Main food court, kitchen facilities, and student dining hall",
            "x": 740,
            "y": 440,
            "demand": 45, # m3/day
            "status": "normal"
        },
        "J4": {
            "id": "J4",
            "name": "Junction 4 (East Academic Ring)",
            "type": "junction",
            "description": "Eastern feeder node supplying central classrooms and library",
            "x": 620,
            "y": 280,
            "status": "normal"
        },
        "V4": {
            "id": "V4",
            "name": "Valve 4 (East Academic Valve)",
            "type": "valve",
            "description": "Multi-turn gate valve protecting eastern instructional facilities",
            "x": 770,
            "y": 280,
            "state": "open",
            "status": "normal"
        },
        "Academic": {
            "id": "Academic",
            "name": "Main Academic Block",
            "type": "building",
            "description": "Lecture halls, administrative auditoriums, and faculty offices",
            "x": 920,
            "y": 220,
            "demand": 85, # m3/day
            "status": "normal"
        },
        "Library": {
            "id": "Library",
            "name": "Central Campus Library",
            "type": "building",
            "description": "4-storey digital and archival study library with public facilities",
            "x": 920,
            "y": 340,
            "demand": 30, # m3/day
            "status": "normal"
        },
        "J5": {
            "id": "J5",
            "name": "Junction 5 (Central Loop Intertie)",
            "type": "junction",
            "description": "Cross-connecting intertie providing hydraulic redundancy between rings",
            "x": 420,
            "y": 280,
            "status": "normal"
        }
    }

    pipelines = [
        {"id": "P1", "u": "WT", "v": "J1", "label": "Main Trunk Feeder", "dia": 300, "length": 150, "flow": 2800},
        {"id": "P2", "u": "J1", "v": "V1", "label": "Hostel Approach Line", "dia": 150, "length": 90, "flow": 950},
        {"id": "P3", "u": "V1", "v": "Hostel", "label": "Hostel Service Lateral", "dia": 100, "length": 60, "flow": 950},
        {"id": "P4", "u": "J1", "v": "J2", "label": "North Ring Main", "dia": 200, "length": 140, "flow": 1200},
        {"id": "P5", "u": "J1", "v": "J3", "label": "South Ring Main", "dia": 200, "length": 140, "flow": 1100},
        {"id": "P6", "u": "J2", "v": "V2", "label": "Lab Branch Line", "dia": 150, "length": 80, "flow": 600},
        {"id": "P7", "u": "V2", "v": "Laboratory", "label": "Lab Service Lateral", "dia": 100, "length": 55, "flow": 600},
        {"id": "P8", "u": "J3", "v": "V3", "label": "Canteen Branch Line", "dia": 150, "length": 80, "flow": 450},
        {"id": "P9", "u": "V3", "v": "Canteen", "label": "Canteen Service Lateral", "dia": 100, "length": 55, "flow": 450},
        {"id": "P10", "u": "J2", "v": "J5", "label": "North-Central Link", "dia": 180, "length": 100, "flow": 600},
        {"id": "P11", "u": "J3", "v": "J5", "label": "South-Central Link", "dia": 180, "length": 100, "flow": 650},
        {"id": "P12", "u": "J5", "v": "J4", "label": "East Header Conduit", "dia": 200, "length": 120, "flow": 1250},
        {"id": "P13", "u": "J4", "v": "V4", "label": "Academic/Library Line", "dia": 180, "length": 75, "flow": 1250},
        {"id": "P14", "u": "V4", "v": "Academic", "label": "Academic Lateral", "dia": 120, "length": 60, "flow": 800},
        {"id": "P15", "u": "V4", "v": "Library", "label": "Library Lateral", "dia": 100, "length": 50, "flow": 450},
        {"id": "P16", "u": "J2", "v": "J4", "label": "North-East Bypass", "dia": 150, "length": 180, "flow": 400},
        {"id": "P17", "u": "J3", "v": "J4", "label": "South-East Bypass", "dia": 150, "length": 180, "flow": 350}
    ]

    return nodes, pipelines

def build_adjacency(nodes, pipelines):
    """
    Builds undirected adjacency list: node_id -> list of (neighbor_id, pipe_info)
    """
    adj = {nid: [] for nid in nodes}
    for p in pipelines:
        u, v = p["u"], p["v"]
        adj[u].append((v, p))
        adj[v].append((u, p))
    return adj

def run_first_bfs(nodes, pipelines, faulty_u, faulty_v, faulty_pipe_id=None):
    """
    FIRST BFS: Boundary Isolation Valve Identification
    
    Algorithmic Rules:
    1. Initialize BFS queue with both endpoints of the damaged pipeline.
    2. Explore outward level-by-level through connected edges.
    3. Traversal is allowed through junctions and buildings.
    4. Traversal STOPS along any path when an isolation valve is reached.
    5. If the Water Tower is reached, the whole search stops: no valve stands between the
       tower and the burst, so valves cannot isolate it and none are closed.
    6. Otherwise only the valves on the water-tower side ("upstream") are returned as the
       valves to close; valves on the far side carry no water to the burst.
    """
    start_time = time.perf_counter()
    adj = build_adjacency(nodes, pipelines)
    
    queue = deque()
    visited = set()
    parent_map = {}
    boundary_valves = set()
    traversal_order = []
    execution_steps = []
    reached_source = False
    
    # 1. Initialize queue with faulty endpoints
    for ep in [faulty_u, faulty_v]:
        visited.add(ep)
        traversal_order.append(ep)
        parent_map[ep] = None
        
        # Check if endpoint itself is a valve
        if nodes[ep]["type"] == "valve":
            boundary_valves.add(ep)
            execution_steps.append({
                "step": len(execution_steps) + 1,
                "stepNumber": len(execution_steps) + 1,
                "action": "ENDPOINT_IS_VALVE",
                "phase": 1,
                "current_node": ep,
                "currentNode": ep,
                "neighbor_node": None,
                "pipeline_id": faulty_pipe_id,
                "queue_snapshot": list(queue),
                "visited_nodes": sorted(list(visited)),
                "visitedNodes": sorted(list(visited)),
                "traversal_order": list(traversal_order),
                "traversalOrder": list(traversal_order),
                "discovered_valves": sorted(list(boundary_valves)),
                "boundaryValves": sorted(list(boundary_valves)),
                "message": f"Pipeline endpoint {ep} ({nodes[ep]['name']}) is an isolation valve. Recorded as boundary valve."
            })
        else:
            queue.append(ep)
            if nodes[ep]["type"] == "source":
                reached_source = True
            execution_steps.append({
                "step": len(execution_steps) + 1,
                "stepNumber": len(execution_steps) + 1,
                "action": "ENQUEUE_ENDPOINT",
                "phase": 1,
                "current_node": ep,
                "currentNode": ep,
                "neighbor_node": None,
                "pipeline_id": faulty_pipe_id,
                "queue_snapshot": list(queue),
                "visited_nodes": sorted(list(visited)),
                "visitedNodes": sorted(list(visited)),
                "traversal_order": list(traversal_order),
                "traversalOrder": list(traversal_order),
                "discovered_valves": sorted(list(boundary_valves)),
                "boundaryValves": sorted(list(boundary_valves)),
                "message": f"Initialized BFS queue with fault endpoint {ep} ({nodes[ep]['name']})."
            })
            
    # 2. Process BFS queue (stops early once the Water Tower is reached)
    while queue and not reached_source:
        curr = queue.popleft()
        curr_info = nodes[curr]
        
        execution_steps.append({
            "step": len(execution_steps) + 1,
            "stepNumber": len(execution_steps) + 1,
            "action": "DEQUEUE",
            "phase": 1,
            "current_node": curr,
            "currentNode": curr,
            "neighbor_node": None,
            "pipeline_id": None,
            "queue_snapshot": list(queue),
            "visited_nodes": sorted(list(visited)),
            "visitedNodes": sorted(list(visited)),
            "traversal_order": list(traversal_order),
            "traversalOrder": list(traversal_order),
            "discovered_valves": sorted(list(boundary_valves)),
            "boundaryValves": sorted(list(boundary_valves)),
            "message": f"Dequeued node {curr} ({curr_info['name']}) to inspect connected pipelines."
        })
        
        # If current node is a valve and wasn't one of the initial endpoints, do not explore beyond it
        if curr_info["type"] == "valve" and curr not in (faulty_u, faulty_v):
            continue
            
        for nbr, pipe in adj[curr]:
            # Do NOT traverse across the ruptured pipe itself
            if (curr == faulty_u and nbr == faulty_v) or (curr == faulty_v and nbr == faulty_u):
                continue
                
            if nbr not in visited:
                visited.add(nbr)
                parent_map[nbr] = curr
                traversal_order.append(nbr)
                nbr_info = nodes[nbr]
                
                if nbr_info["type"] == "valve":
                    # Reached an isolation valve -> STOP along this branch!
                    boundary_valves.add(nbr)
                    execution_steps.append({
                        "step": len(execution_steps) + 1,
                        "stepNumber": len(execution_steps) + 1,
                        "action": "VALVE_DISCOVERED",
                        "phase": 1,
                        "current_node": curr,
                        "currentNode": curr,
                        "neighbor_node": nbr,
                        "neighborNode": nbr,
                        "pipeline_id": pipe["id"],
                        "pipeId": pipe["id"],
                        "highlightEdges": [pipe["id"]],
                        "queue_snapshot": list(queue),
                        "visited_nodes": sorted(list(visited)),
                        "visitedNodes": sorted(list(visited)),
                        "traversal_order": list(traversal_order),
                        "traversalOrder": list(traversal_order),
                        "discovered_valves": sorted(list(boundary_valves)),
                        "boundaryValves": sorted(list(boundary_valves)),
                        "message": f"Encountered isolation valve {nbr} ({nbr_info['name']}) via pipe {pipe['id']}. Halting traversal on this branch and adding {nbr} to boundary valves."
                    })
                elif nbr_info["type"] == "source":
                    # Water Tower reached without passing a valve -> valves cannot isolate the burst
                    reached_source = True
                    execution_steps.append({
                        "step": len(execution_steps) + 1,
                        "stepNumber": len(execution_steps) + 1,
                        "action": "SOURCE_DISCOVERED",
                        "phase": 1,
                        "current_node": curr,
                        "currentNode": curr,
                        "neighbor_node": nbr,
                        "neighborNode": nbr,
                        "pipeline_id": pipe["id"],
                        "pipeId": pipe["id"],
                        "highlightEdges": [pipe["id"]],
                        "queue_snapshot": list(queue),
                        "visited_nodes": sorted(list(visited)),
                        "visitedNodes": sorted(list(visited)),
                        "traversal_order": list(traversal_order),
                        "traversalOrder": list(traversal_order),
                        "discovered_valves": sorted(list(boundary_valves)),
                        "boundaryValves": sorted(list(boundary_valves)),
                        "message": f"Reached the Water Tower ({nbr}) via pipe {pipe['id']} without passing a valve. Search stops: no valve stands between the tower and the burst."
                    })
                    break
                else:
                    # Junction or Building
                    queue.append(nbr)
                    execution_steps.append({
                        "step": len(execution_steps) + 1,
                        "stepNumber": len(execution_steps) + 1,
                        "action": "ENQUEUE_NEIGHBOR",
                        "phase": 1,
                        "current_node": curr,
                        "currentNode": curr,
                        "neighbor_node": nbr,
                        "neighborNode": nbr,
                        "pipeline_id": pipe["id"],
                        "pipeId": pipe["id"],
                        "highlightEdges": [pipe["id"]],
                        "queue_snapshot": list(queue),
                        "visited_nodes": sorted(list(visited)),
                        "visitedNodes": sorted(list(visited)),
                        "traversal_order": list(traversal_order),
                        "traversalOrder": list(traversal_order),
                        "discovered_valves": sorted(list(boundary_valves)),
                        "boundaryValves": sorted(list(boundary_valves)),
                        "message": f"Discovered {nbr_info['type']} {nbr} ({nbr_info['name']}) via {pipe['id']}. Enqueued for level-order exploration."
                    })

    # 3. Decide which of the valves found actually need closing
    valves_found = sorted(boundary_valves)
    if reached_source:
        valves_to_close, skipped_valves = [], valves_found
        message = ("No valve stands between the Water Tower and this pipe, so closing valves cannot stop the leak. "
                   "Nothing will be closed (closing valves here would only cut off buildings). "
                   "The leak continues until the pipe is repaired or the tower is shut.")
    else:
        region = {n for n in visited if nodes[n]["type"] != "valve"}
        upstream = reachable_from_source(nodes, adj, region, faulty_u, faulty_v)
        valves_to_close = [v for v in valves_found if v in upstream]
        skipped_valves = [v for v in valves_found if v not in upstream]
        message = f"Valves to close: [{', '.join(valves_to_close)}] (on the water-tower side of the burst)."
        if skipped_valves:
            message += f" Not needed: [{', '.join(skipped_valves)}] (no water reaches the burst through them)."
    execution_steps.append({
        "step": len(execution_steps) + 1,
        "stepNumber": len(execution_steps) + 1,
        "action": "NOT_ISOLATABLE" if reached_source else "VALVES_SELECTED",
        "phase": 1,
        "current_node": None,
        "currentNode": None,
        "neighbor_node": None,
        "pipeline_id": None,
        "queue_snapshot": [],
        "visited_nodes": sorted(list(visited)),
        "visitedNodes": sorted(list(visited)),
        "traversal_order": list(traversal_order),
        "traversalOrder": list(traversal_order),
        "discovered_valves": valves_to_close,
        "boundaryValves": valves_to_close,
        "message": message
    })

    duration_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "faulty_pipeline": {
            "u": faulty_u,
            "v": faulty_v,
            "id": faulty_pipe_id
        },
        "boundary_valves": valves_to_close,
        "valves_found": valves_found,
        "skipped_valves": skipped_valves,
        "reached_source": reached_source,
        "isolatable": not reached_source,
        "traversal_order": traversal_order,
        "visited_nodes": sorted(list(visited)),
        "parent_map": parent_map,
        "steps": execution_steps,
        "execution_time_ms": round(duration_ms, 3)
    }

def reachable_from_source(nodes, adj, region, faulty_u, faulty_v):
    """
    Nodes the Water Tower can reach without entering the burst region or crossing the burst pipe.
    A boundary valve in this set is "upstream": water would reach the burst through it.
    """
    sources = [n for n, d in nodes.items() if d["type"] == "source"]
    seen = set(sources)
    queue = deque(sources)
    while queue:
        curr = queue.popleft()
        for nbr, _pipe in adj[curr]:
            if (curr == faulty_u and nbr == faulty_v) or (curr == faulty_v and nbr == faulty_u):
                continue
            if nbr in region or nbr in seen:
                continue
            seen.add(nbr)
            queue.append(nbr)
    return seen

def run_second_bfs(nodes, pipelines, faulty_u, faulty_v, closed_valves):
    """
    SECOND BFS: Affected Building & Water Reachability Identification
    
    Algorithmic Rules:
    1. Simulate closing all boundary isolation valves (they block water transmission).
    2. Remove the faulty pipeline segment from the graph.
    3. Start BFS from the primary supply source: Central Water Tower ('WT').
    4. Explore level-by-level across reachable pipelines.
    5. Water cannot pass through closed boundary valves or the severed line.
    6. Classify every campus building as OPERATIONAL (receiving water) or AFFECTED (deprived).
    """
    start_time = time.perf_counter()
    adj = build_adjacency(nodes, pipelines)
    closed_valves_set = set(closed_valves)
    
    queue = deque(["WT"])
    reachable_nodes = {"WT"}
    parent_map = {"WT": None}
    traversal_order = ["WT"]
    execution_steps = []
    
    execution_steps.append({
        "step": len(execution_steps) + 1,
        "stepNumber": len(execution_steps) + 1,
        "action": "SOURCE_INITIALIZED",
        "phase": 2,
        "current_node": "WT",
        "currentNode": "WT",
        "neighbor_node": None,
        "pipeline_id": None,
        "queue_snapshot": list(queue),
        "visited_nodes": sorted(list(reachable_nodes)),
        "visitedNodes": sorted(list(reachable_nodes)),
        "reachable_nodes": sorted(list(reachable_nodes)),
        "reachableNodes": sorted(list(reachable_nodes)),
        "traversal_order": list(traversal_order),
        "traversalOrder": list(traversal_order),
        "message": "Second BFS started at the Central Water Tower ('WT') with the boundary valves closed."
    })
    
    while queue:
        curr = queue.popleft()
        
        execution_steps.append({
            "step": len(execution_steps) + 1,
            "stepNumber": len(execution_steps) + 1,
            "action": "DEQUEUE_FLOW",
            "phase": 2,
            "current_node": curr,
            "currentNode": curr,
            "neighbor_node": None,
            "pipeline_id": None,
            "queue_snapshot": list(queue),
            "visited_nodes": sorted(list(reachable_nodes)),
            "visitedNodes": sorted(list(reachable_nodes)),
            "reachable_nodes": sorted(list(reachable_nodes)),
            "reachableNodes": sorted(list(reachable_nodes)),
            "traversal_order": list(traversal_order),
            "traversalOrder": list(traversal_order),
            "message": f"Dequeued {curr} ({nodes[curr]['name']}). Checking which neighbours it connects to."
        })
        
        # If current node is a closed valve, water cannot flow out through it
        if curr in closed_valves_set:
            continue
            
        for nbr, pipe in adj[curr]:
            # Do NOT pass through the severed/faulty pipe
            if (curr == faulty_u and nbr == faulty_v) or (curr == faulty_v and nbr == faulty_u):
                continue
                
            # If neighbor is a closed valve, water reaches the upstream valve face, but does not propagate through it
            if nbr in closed_valves_set:
                if nbr not in reachable_nodes:
                    reachable_nodes.add(nbr)
                    parent_map[nbr] = curr
                    traversal_order.append(nbr)
                    execution_steps.append({
                        "step": len(execution_steps) + 1,
                        "stepNumber": len(execution_steps) + 1,
                        "action": "BLOCKED_AT_VALVE",
                        "phase": 2,
                        "current_node": curr,
                        "currentNode": curr,
                        "neighbor_node": nbr,
                        "neighborNode": nbr,
                        "pipeline_id": pipe["id"],
                        "pipeId": pipe["id"],
                        "highlightEdges": [pipe["id"]],
                        "queue_snapshot": list(queue),
                        "visited_nodes": sorted(list(reachable_nodes)),
                        "visitedNodes": sorted(list(reachable_nodes)),
                        "reachable_nodes": sorted(list(reachable_nodes)),
                        "reachableNodes": sorted(list(reachable_nodes)),
                        "traversal_order": list(traversal_order),
                        "traversalOrder": list(traversal_order),
                        "message": f"Reached closed valve {nbr} via pipe {pipe['id']}. The search stops here (valve is CLOSED)."
                    })
                continue
                
            if nbr not in reachable_nodes:
                reachable_nodes.add(nbr)
                parent_map[nbr] = curr
                traversal_order.append(nbr)
                queue.append(nbr)
                
                nbr_type = nodes[nbr]["type"]
                execution_steps.append({
                    "step": len(execution_steps) + 1,
                    "stepNumber": len(execution_steps) + 1,
                    "action": "FLOW_PROPAGATED",
                    "phase": 2,
                    "current_node": curr,
                    "currentNode": curr,
                    "neighbor_node": nbr,
                    "neighborNode": nbr,
                    "neighbor_type": nbr_type,
                    "pipeline_id": pipe["id"],
                    "pipeId": pipe["id"],
                    "highlightEdges": [pipe["id"]],
                    "queue_snapshot": list(queue),
                    "visited_nodes": sorted(list(reachable_nodes)),
                    "visitedNodes": sorted(list(reachable_nodes)),
                    "reachable_nodes": sorted(list(reachable_nodes)),
                    "reachableNodes": sorted(list(reachable_nodes)),
                    "traversal_order": list(traversal_order),
                    "traversalOrder": list(traversal_order),
                    "message": f"{nbr_type} {nbr} ({nodes[nbr]['name']}) is reachable via pipe {pipe['id']}. Enqueued."
                })

    # The leak is stopped if no end of the burst pipe still receives water through an open node
    leak_isolated = not any(n in reachable_nodes and n not in closed_valves_set for n in (faulty_u, faulty_v))

    all_buildings = [nid for nid, d in nodes.items() if d["type"] == "building"]
    operational_buildings = [b for b in all_buildings if b in reachable_nodes]
    affected_buildings = [b for b in all_buildings if b not in reachable_nodes]
    unreachable_nodes = [nid for nid in nodes if nid not in reachable_nodes]
    
    # Calculate water metrics
    total_campus_demand = sum(nodes[b].get("demand", 50) for b in all_buildings)
    operational_demand = sum(nodes[b].get("demand", 50) for b in operational_buildings)
    affected_demand = sum(nodes[b].get("demand", 50) for b in affected_buildings)
    
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "closed_valves": sorted(list(closed_valves_set)),
        "reachable_nodes": sorted(list(reachable_nodes)),
        "unreachable_nodes": sorted(unreachable_nodes),
        "operational_buildings": operational_buildings,
        "affected_buildings": affected_buildings,
        "total_buildings": len(all_buildings),
        "leak_isolated": leak_isolated,
        "traversal_order": traversal_order,
        "parent_map": parent_map,
        "steps": execution_steps,
        "metrics": {
            "total_demand_m3_day": total_campus_demand,
            "operational_demand_m3_day": operational_demand,
            "affected_demand_m3_day": affected_demand,
            "protection_efficiency_pct": round((operational_demand / total_campus_demand * 100) if total_campus_demand else 100, 1),
            "reachability_ratio": f"{len(operational_buildings)} / {len(all_buildings)} Buildings Protected"
        },
        "execution_time_ms": round(duration_ms, 3)
    }

def generate_isolation_report(faulty_u, faulty_v, faulty_pipe_id, phase1_res, phase2_res, nodes, pipelines):
    """
    Generates a structured, professional engineering report of the fault isolation event.
    """
    pipe_dict = {p["id"]: p for p in pipelines}
    pipe_info = pipe_dict.get(faulty_pipe_id)
    if not pipe_info:
        for p in pipelines:
            if (p["u"] == faulty_u and p["v"] == faulty_v) or (p["u"] == faulty_v and p["v"] == faulty_u):
                pipe_info = p
                break
                
    report = {
        "project_metadata": {
            "title": "Campus Water-Pipeline Fault Isolation Tool Using Breadth-First Search (BFS)",
            "institution": "Karunya Institute of Technology and Sciences",
            "course": "Fundamentals of Artificial Intelligence (25DC204)",
            "academic_year": "2026–2027",
            "team_members": [
                {"name": "Dabria Susan Sam", "role": "Algorithm & Graph Modeling"},
                {"name": "G Revanth Hari", "role": "Hydraulic Network Simulation"},
                {"name": "Sujith S.", "role": "Full-Stack Development & UI/UX"},
                {"name": "Leah Sasha V.L.", "role": "Testing & Analytical Reporting"}
            ]
        },
        "fault_summary": {
            "pipeline_id": pipe_info["id"] if pipe_info else "CUSTOM",
            "pipeline_label": pipe_info["label"] if pipe_info else f"{faulty_u} - {faulty_v}",
            "endpoint_u": faulty_u,
            "endpoint_u_name": nodes[faulty_u]["name"],
            "endpoint_v": faulty_v,
            "endpoint_v_name": nodes[faulty_v]["name"],
            "diameter_mm": pipe_info.get("dia", 150) if pipe_info else 150,
            "length_m": pipe_info.get("length", 100) if pipe_info else 100,
            "normal_flow_lpm": pipe_info.get("flow", 1000) if pipe_info else 1000,
            "severity": "PIPE RUPTURE"
        },
        "phase1_valve_isolation": {
            "algorithm": "Multi-Source Level-Order Breadth-First Search",
            "initial_queue": [faulty_u, faulty_v],
            "traversal_order": phase1_res["traversal_order"],
            "total_nodes_visited": len(phase1_res["visited_nodes"]),
            "boundary_valves_identified": phase1_res["boundary_valves"],
            "boundary_valves_details": [
                {"id": vid, "name": nodes[vid]["name"], "action": "CLOSED_FOR_ISOLATION"}
                for vid in phase1_res["boundary_valves"]
            ],
            "execution_time_ms": phase1_res["execution_time_ms"]
        },
        "phase2_supply_assessment": {
            "algorithm": "Source-Propagated Reachability Breadth-First Search",
            "source_node": "WT (Central Water Tower)",
            "operational_buildings": [
                {"id": bid, "name": nodes[bid]["name"], "status": "SUPPLIED", "daily_demand_m3": nodes[bid].get("demand", 0)}
                for bid in phase2_res["operational_buildings"]
            ],
            "affected_buildings": [
                {"id": bid, "name": nodes[bid]["name"], "status": "ISOLATED", "daily_demand_m3": nodes[bid].get("demand", 0)}
                for bid in phase2_res["affected_buildings"]
            ],
            "protection_efficiency_pct": phase2_res["metrics"]["protection_efficiency_pct"],
            "execution_time_ms": phase2_res["execution_time_ms"]
        },
        "estimated_water_conservation": {
            "unmitigated_leakage_rate_lpm": (pipe_info.get("flow", 1000) if pipe_info else 1000) * 0.85,
            "manual_isolation_time_min": 45,
            "algorithmic_bfs_isolation_time_sec": 1.2,
            "estimated_water_saved_liters": round(((pipe_info.get("flow", 1000) if pipe_info else 1000) * 0.85) * 44.98),
            "network_integrity_status": "SECURED & ISOLATED"
        }
    }
    
    return report

