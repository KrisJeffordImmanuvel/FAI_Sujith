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
    scenarios: [
        {
            id: "scenario_hostel_line",
            title: "Scenario 1: Hostel Residential Feed Rupture",
            fault_u: "V1",
            fault_v: "Hostel",
            pipe_id: "P3",
            badge: "Residential",
            badgeColor: "blue",
            severity: "High (Residential impact)",
            expectedBoundaryValves: ["V1"],
            expectedAffectedBuildings: ["Hostel"],
            expectedOperationalBuildings: ["Laboratory", "Canteen", "Academic", "Library"],
            description: "A lateral pipeline burst between Valve 1 and the Hostel Complex. Demonstrates single-valve boundary isolation where only Hostel is cut off while all academic facilities stay supplied."
        },
        {
            id: "scenario_lab_lateral",
            title: "Scenario 2: Research Laboratory Service Fracture",
            fault_u: "V2",
            fault_v: "Laboratory",
            pipe_id: "P7",
            badge: "Research",
            badgeColor: "purple",
            severity: "Medium (Chemical safety priority)",
            expectedBoundaryValves: ["V2"],
            expectedAffectedBuildings: ["Laboratory"],
            expectedOperationalBuildings: ["Hostel", "Canteen", "Academic", "Library"],
            description: "A high-pressure pipe fracture feeding the Science & Research Labs. The BFS algorithm targets Valve 2, maintaining stable water flow to student housing and classrooms."
        },
        {
            id: "scenario_canteen_branch",
            title: "Scenario 3: Food Court Supply Conduit Burst",
            fault_u: "V3",
            fault_v: "Canteen",
            pipe_id: "P9",
            badge: "Dining",
            badgeColor: "amber",
            severity: "Medium (Food services disruption)",
            expectedBoundaryValves: ["V3"],
            expectedAffectedBuildings: ["Canteen"],
            expectedOperationalBuildings: ["Hostel", "Laboratory", "Academic", "Library"],
            description: "Sub-surface pipe failure supplying the campus dining complex. Demonstrates localized southern isolation via Valve 3 without disturbing academic wings."
        },
        {
            id: "scenario_academic_rupture",
            title: "Scenario 4: East Academic Quadrant Pipe Rupture",
            fault_u: "V4",
            fault_v: "Academic",
            pipe_id: "P14",
            badge: "Academic",
            badgeColor: "orange",
            severity: "Critical (Instructional block affected)",
            expectedBoundaryValves: ["V4"],
            expectedAffectedBuildings: ["Academic", "Library"],
            expectedOperationalBuildings: ["Hostel", "Laboratory", "Canteen"],
            description: "A major line fracture near the Academic Block. Because Valve 4 protects both the Academic Block and Library sub-loop, closing V4 isolates both buildings while the rest of the campus remains active."
        },
        {
            id: "scenario_central_header",
            title: "Scenario 5: North Ring Main Transmission Rupture",
            fault_u: "J1",
            fault_v: "J2",
            pipe_id: "P4",
            badge: "Trunk Main",
            badgeColor: "red",
            severity: "Severe (Inter-junction loop failure)",
            expectedBoundaryValves: ["V1", "V2", "V3", "V4"],
            expectedAffectedBuildings: ["Hostel", "Laboratory", "Canteen", "Academic", "Library"],
            expectedOperationalBuildings: [],
            description: "A severe transmission break along the primary North Ring (J1-J2). Multi-source BFS discovers all boundary valves across the interconnected grid to safeguard against massive reservoir drainage."
        }
    ]
};

// Export for browser global usage or Node / CommonJS if needed
if (typeof module !== "undefined" && module.exports) {
    module.exports = CAMPUS_NETWORK_DATA;
}

