"""
Campus Water-Pipeline Fault Isolation Tool - Python REST API Server
Runs locally on Windows 11 with Python's built-in standard library (no pip install required).
Serves API endpoints and static frontend files on http://localhost:5000.
"""

import sys
import os
import json
import socket
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Add current directory to path to import bfs_engine
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, CURRENT_DIR)

from bfs_engine import (
    get_default_network,
    run_first_bfs,
    run_second_bfs,
    generate_isolation_report
)

# Render (and similar hosts) tell the app which port to use via $PORT; locally it stays 5000.
PORT = int(os.environ.get("PORT", "5000"))
HOST = "0.0.0.0"

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# Preset demonstration scenarios (kept in sync with js/network-data.js)
SCENARIOS = [
    {
        "id": "scenario_tower_trunk",
        "title": "Water Tower Trunk Rupture (Worst Case)",
        "fault_u": "WT",
        "fault_v": "J1",
        "pipe_id": "P1",
        "severity": "Severe (whole campus)",
        "description": "P1 is the only pipe leaving the water tower and has no valve, so it cannot be isolated by valves. All 5 buildings lose supply."
    },
    {
        "id": "scenario_hostel_line",
        "title": "Hostel Service Line Rupture (Single Building)",
        "fault_u": "V1",
        "fault_v": "Hostel",
        "pipe_id": "P3",
        "severity": "Low (one building)",
        "description": "BFS closes only V1. Only the Hostel loses supply."
    },
    {
        "id": "scenario_academic_lateral",
        "title": "Academic Block Lateral Rupture (Shared Valve)",
        "fault_u": "V4",
        "fault_v": "Academic",
        "pipe_id": "P14",
        "severity": "Medium (two buildings)",
        "description": "BFS closes only V4, which also feeds the Library, so Academic and Library lose supply."
    },
    {
        "id": "scenario_bypass_loop",
        "title": "North-East Bypass Loop Rupture (Looped Pipe)",
        "fault_u": "J2",
        "fault_v": "J4",
        "pipe_id": "P16",
        "severity": "Leak cannot be isolated",
        "description": "Water reroutes around the loop so no building loses supply, but no valve stands between the tower and P16, so the leak cannot be stopped with valves."
    }
]

class WaterBfsRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve static files from the project root directory
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def end_headers(self):
        # Enable CORS for local testing from any origin or file://
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        payload = json.dumps(data, indent=2).encode("utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/network":
            nodes, pipelines = get_default_network()
            self.send_json_response({
                "status": "success",
                "nodes": nodes,
                "pipelines": pipelines,
                "summary": {
                    "total_nodes": len(nodes),
                    "total_pipelines": len(pipelines),
                    "total_valves": sum(1 for n in nodes.values() if n["type"] == "valve"),
                    "total_buildings": sum(1 for n in nodes.values() if n["type"] == "building"),
                    "source_node": "WT"
                }
            })
            return

        elif path == "/api/scenarios":
            self.send_json_response({
                "status": "success",
                "scenarios": SCENARIOS
            })
            return

        elif path == "/api/status":
            local_ip = get_local_ip()
            self.send_json_response({
                "status": "online",
                "engine": "Python Standard Library BFS Backend",
                "version": "1.0.0",
                "institution": "Karunya Institute of Technology and Sciences",
                "course": "25DC204",
                "local_ip": local_ip,
                "laptop_url": f"http://localhost:{PORT}",
                "mobile_url": f"http://{local_ip}:{PORT}"
            })
            return

        # Fallback to standard static file handling (index.html, css, js)
        super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        content_length = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_length)
        
        try:
            req_data = json.loads(post_body.decode("utf-8")) if post_body else {}
        except Exception as e:
            self.send_json_response({"status": "error", "message": f"Malformed JSON: {str(e)}"}, 400)
            return

        nodes, pipelines = get_default_network()

        if path == "/api/bfs-boundary":
            faulty_u = req_data.get("fault_u")
            faulty_v = req_data.get("fault_v")
            pipe_id = req_data.get("pipe_id")

            if not faulty_u or not faulty_v:
                self.send_json_response({"status": "error", "message": "Endpoints fault_u and fault_v are required."}, 400)
                return

            if faulty_u not in nodes or faulty_v not in nodes:
                self.send_json_response({"status": "error", "message": f"Invalid node IDs: {faulty_u}, {faulty_v}"}, 400)
                return

            result = run_first_bfs(nodes, pipelines, faulty_u, faulty_v, pipe_id)
            self.send_json_response({
                "status": "success",
                "phase": "PHASE_1_BOUNDARY_VALVES",
                "result": result
            })
            return

        elif path == "/api/bfs-water-supply":
            faulty_u = req_data.get("fault_u")
            faulty_v = req_data.get("fault_v")
            closed_valves = req_data.get("closed_valves", [])

            result = run_second_bfs(nodes, pipelines, faulty_u, faulty_v, closed_valves)
            self.send_json_response({
                "status": "success",
                "phase": "PHASE_2_WATER_SUPPLY",
                "result": result
            })
            return

        elif path == "/api/simulate-full":
            faulty_u = req_data.get("fault_u")
            faulty_v = req_data.get("fault_v")
            pipe_id = req_data.get("pipe_id")

            if not faulty_u or not faulty_v:
                self.send_json_response({"status": "error", "message": "Endpoints fault_u and fault_v required"}, 400)
                return

            phase1 = run_first_bfs(nodes, pipelines, faulty_u, faulty_v, pipe_id)
            phase2 = run_second_bfs(nodes, pipelines, faulty_u, faulty_v, phase1["boundary_valves"])
            report = generate_isolation_report(faulty_u, faulty_v, pipe_id, phase1, phase2, nodes, pipelines)

            self.send_json_response({
                "status": "success",
                "phase1": phase1,
                "phase2": phase2,
                "report": report
            })
            return

        else:
            self.send_json_response({"status": "error", "message": "Endpoint not found"}, 404)

def run_server():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, WaterBfsRequestHandler)
    local_ip = get_local_ip()
    print(f"============================================================")
    print(f"  Campus Water-Pipeline Fault Isolation Tool (BFS Engine)")
    print(f"  Karunya Institute of Technology and Sciences (25DC204)")
    print(f"============================================================")
    print(f"  On this Laptop:        http://localhost:{PORT}/")
    print(f"  On your Phone/Mobile:  http://{local_ip}:{PORT}/")
    print(f"  Local Network IP:      http://127.0.0.1:{PORT}/")
    print(f"  API Endpoint:          http://localhost:{PORT}/api/network")
    print(f"  Serving files from:    {PROJECT_ROOT}")
    print(f"============================================================")
    print(f"  * Make sure your phone is on the same Wi-Fi / Hotspot.")
    print(f"  Press Ctrl+C to terminate.")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server gracefully...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()

