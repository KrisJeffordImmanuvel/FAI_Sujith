/**
 * Campus Water-Pipeline Fault Isolation Tool
 * Campus Water Distribution Network Data Model & Preset Scenarios
 * Institution: Karunya Institute of Technology and Sciences
 * Course: Fundamentals of Artificial Intelligence (25DC204)
 */

const CAMPUS_NETWORK_DATA = {
    metadata: {
        title: "Campus Water Distribution System",
        institution: "Karunya Institute of Technology and Sciences",
        course: "Fundamentals of Artificial Intelligence",
        courseCode: "25DC204",
        academicYear: "2026–2027",
        team: [
            { name: "Dabria Susan Sam", role: "Algorithm & Graph Modeling" },
            { name: "G Revanth Hari", role: "Hydraulic Network Simulation" },
            { name: "Sujith S.", role: "Full-Stack Development & UI/UX" },
            { name: "Leah Sasha V.L.", role: "Testing & Analytical Reporting" }
        ]
    },

    // Campus Nodes: Water Tower, Junctions (J1-J5), Valves (V1-V4), Buildings
    nodes: {
        WT: {
            id: "WT",
            name: "Central Water Tower",
            type: "source",
            label: "Water Tower (Source)",
            description: "Primary elevated campus reservoir (Capacity: 500,000 L, Pressure: 3.5 bar)",
            x: 90,
            y: 280,
            icon: "water-tower",
            pressure: 3.5,
            capacity: 500000
        },
        J1: {
            id: "J1",
            name: "Junction 1 (West Quad)",
            type: "junction",
            label: "J1 - West Hub",
            description: "Main western transmission manifold splitting to northern and southern loops",
            x: 230,
            y: 280,
            icon: "junction"
        },
        V1: {
            id: "V1",
            name: "Valve 1 (Hostel Sector)",
            type: "valve",
            label: "Valve V1",
            description: "High-pressure gate valve controlling northern hostel residential line",
            x: 230,
            y: 150,
            icon: "valve",
            defaultState: "open"
        },
        Hostel: {
            id: "Hostel",
            name: "Hostel Residence Complex",
            type: "building",
            label: "Hostel Complex",
            description: "Student accommodations (Capacity: 1,800 students, Daily demand: 120,000 L)",
            x: 230,
            y: 45,
            icon: "building-hostel",
            demand: 120,
            occupancy: 1800
        },
        J2: {
            id: "J2",
            name: "Junction 2 (North Science Quad)",
            type: "junction",
            label: "J2 - North Hub",
            description: "Northern distribution manifold serving research facilities and ring loop",
            x: 410,
            y: 160,
            icon: "junction"
        },
        V2: {
            id: "V2",
            name: "Valve 2 (Lab Sector)",
            type: "valve",
            label: "Valve V2",
            description: "Motorized isolation butterfly valve for research laboratories",
            x: 580,
            y: 110,
            icon: "valve",
            defaultState: "open"
        },
        Laboratory: {
            id: "Laboratory",
            name: "Science & Research Labs",
            type: "building",
            label: "Research Labs",
            description: "Advanced chemistry, materials, and biotechnology research facility",
            x: 740,
            y: 110,
            icon: "building-lab",
            demand: 65,
            occupancy: 450
        },
        J3: {
            id: "J3",
            name: "Junction 3 (South Utility Quad)",
            type: "junction",
            label: "J3 - South Hub",
            description: "Southern distribution manifold serving catering complex and ring loop",
            x: 410,
            y: 400,
            icon: "junction"
        },
        V3: {
            id: "V3",
            name: "Valve 3 (Canteen Sector)",
            type: "valve",
            label: "Valve V3",
            description: "Quarter-turn ball valve isolating central food court and kitchen facilities",
            x: 580,
            y: 450,
            icon: "valve",
            defaultState: "open"
        },
        Canteen: {
            id: "Canteen",
            name: "Campus Food Court & Canteen",
            type: "building",
            label: "Food Court",
            description: "Main campus dining complex, kitchen services, and food courts",
            x: 740,
            y: 450,
            icon: "building-canteen",
            demand: 45,
            occupancy: 1200
        },
        J4: {
            id: "J4",
            name: "Junction 4 (East Academic Ring)",
            type: "junction",
            label: "J4 - East Hub",
            description: "Eastern distribution header supplying academic lectures and library",
            x: 620,
            y: 280,
            icon: "junction"
        },
        V4: {
            id: "V4",
            name: "Valve 4 (East Academic Valve)",
            type: "valve",
            label: "Valve V4",
            description: "Heavy-duty wedge gate valve protecting eastern instructional wing",
            x: 760,
            y: 280,
            icon: "valve",
            defaultState: "open"
        },
        Academic: {
            id: "Academic",
            name: "Main Academic Block",
            type: "building",
            label: "Academic Block",
            description: "Lecture auditoriums, computational labs, and departmental faculty suites",
            x: 910,
            y: 210,
            icon: "building-academic",
            demand: 85,
            occupancy: 2500
        },
        Library: {
            id: "Library",
            name: "Central Campus Library",
            type: "building",
            label: "Central Library",
            description: "4-tier learning and digital resource center with archive rooms",
            x: 910,
            y: 350,
            icon: "building-library",
            demand: 30,
            occupancy: 700
        },
        J5: {
            id: "J5",
            name: "Junction 5 (Central Loop Intertie)",
            type: "junction",
            label: "J5 - Intertie Hub",
            description: "Central hydraulic balancer providing cross-loop redundancy",
            x: 410,
            y: 280,
            icon: "junction"
        }
    },

    // Pipelines (Edges)
    pipelines: [
        { id: "P1", u: "WT", v: "J1", label: "Main Supply Trunk", dia: 300, length: 150, flow: 2800 },
        { id: "P2", u: "J1", v: "V1", label: "Hostel Branch Feeder", dia: 150, length: 90, flow: 950 },
        { id: "P3", u: "V1", v: "Hostel", label: "Hostel Service Lateral", dia: 100, length: 60, flow: 950 },
        { id: "P4", u: "J1", v: "J2", label: "North Ring Conduit", dia: 200, length: 140, flow: 1200 },
        { id: "P5", u: "J1", v: "J3", label: "South Ring Conduit", dia: 200, length: 140, flow: 1100 },
        { id: "P6", u: "J2", v: "V2", label: "Laboratory Branch Feeder", dia: 150, length: 80, flow: 600 },
        { id: "P7", u: "V2", v: "Laboratory", label: "Laboratory Service Lateral", dia: 100, length: 55, flow: 600 },
        { id: "P8", u: "J3", v: "V3", label: "Canteen Branch Feeder", dia: 150, length: 80, flow: 450 },
        { id: "P9", u: "V3", v: "Canteen", label: "Canteen Service Lateral", dia: 100, length: 55, flow: 450 },
        { id: "P10", u: "J2", v: "J5", label: "North-Central Cross Link", dia: 180, length: 100, flow: 600 },
        { id: "P11", u: "J3", v: "J5", label: "South-Central Cross Link", dia: 180, length: 100, flow: 650 },
        { id: "P12", u: "J5", v: "J4", label: "East Header Conduit", dia: 200, length: 120, flow: 1250 },
        { id: "P13", u: "J4", v: "V4", label: "Academic / Library Valve Header", dia: 180, length: 75, flow: 1250 },
        { id: "P14", u: "V4", v: "Academic", label: "Academic Block Lateral", dia: 120, length: 60, flow: 800 },
        { id: "P15", u: "V4", v: "Library", label: "Library Lateral", dia: 100, length: 50, flow: 450 },
        { id: "P16", u: "J2", v: "J4", label: "North-East Bypass Loop", dia: 150, length: 180, flow: 400 },
        { id: "P17", u: "J3", v: "J4", label: "South-East Bypass Loop", dia: 150, length: 180, flow: 350 }
    ],

    // Pre-configured Demonstration Scenarios
    // Expected results below were verified by running both BFS engines on every pipe.
    scenarios: [
        {
            id: "scenario_tower_trunk",
            title: "Water Tower Trunk Rupture (Worst Case)",
            fault_u: "WT",
            fault_v: "J1",
            pipe_id: "P1",
            badge: "Worst Case",
            badgeColor: "red",
            severity: "Severe (whole campus)",
            expectedBoundaryValves: [],
            expectedAffectedBuildings: ["Hostel", "Laboratory", "Canteen", "Academic", "Library"],
            expectedOperationalBuildings: [],
            expectedLeakStopped: false,
            description: "P1 is the only pipe leaving the water tower, and it has no valve. The search reaches the tower at once, so no valve can isolate the burst and none is closed. All 5 buildings lose supply because their only feed is broken, and the leak continues until the tower is shut or the pipe is repaired."
        },
        {
            id: "scenario_hostel_line",
            title: "Hostel Service Line Rupture (Single Building)",
            fault_u: "V1",
            fault_v: "Hostel",
            pipe_id: "P3",
            badge: "Single Building",
            badgeColor: "blue",
            severity: "Low (one building)",
            expectedBoundaryValves: ["V1"],
            expectedAffectedBuildings: ["Hostel"],
            expectedOperationalBuildings: ["Laboratory", "Canteen", "Academic", "Library"],
            expectedLeakStopped: true,
            description: "P3 runs from valve V1 to the Hostel. One endpoint is already a valve and the other side is a dead end, so BFS closes only V1. Only the Hostel loses supply; the other 4 buildings stay connected."
        },
        {
            id: "scenario_academic_lateral",
            title: "Academic Block Lateral Rupture (Shared Valve)",
            fault_u: "V4",
            fault_v: "Academic",
            pipe_id: "P14",
            badge: "Shared Valve",
            badgeColor: "orange",
            severity: "Medium (two buildings)",
            expectedBoundaryValves: ["V4"],
            expectedAffectedBuildings: ["Academic", "Library"],
            expectedOperationalBuildings: ["Hostel", "Laboratory", "Canteen"],
            expectedLeakStopped: true,
            description: "P14 links valve V4 to the Academic Block. BFS closes only V4, but V4 also feeds the Library, so 2 buildings lose supply even though only one pipe broke."
        },
        {
            id: "scenario_bypass_loop",
            title: "North-East Bypass Loop Rupture (Looped Pipe)",
            fault_u: "J2",
            fault_v: "J4",
            pipe_id: "P16",
            badge: "Looped Pipe",
            badgeColor: "purple",
            severity: "Leak cannot be isolated",
            expectedBoundaryValves: [],
            expectedAffectedBuildings: [],
            expectedOperationalBuildings: ["Hostel", "Laboratory", "Canteen", "Academic", "Library"],
            expectedLeakStopped: false,
            description: "P16 is part of a loop. With it broken, water reroutes around the loop (via J5), so no building loses supply. From J2 the search reaches the water tower without passing a valve, so no valve can isolate this pipe and none is closed.",
            note: "Closing valves here would not stop the leak; it would only cut off buildings. The loop pipes have no valves of their own, so the leak continues until the pipe is repaired."
        }
    ]
};

// Export for browser global usage or Node / CommonJS if needed
if (typeof module !== "undefined" && module.exports) {
    module.exports = CAMPUS_NETWORK_DATA;
}

