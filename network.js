/**
 * Follower & Network Analysis Module (Module 7)
 * Implements an interactive Canvas-based force-directed graph to inspect
 * relationships, identify bot ring structures, and trace coordinated clusters.
 */

class NetworkVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
        this.hoveredNode = null;
        this.draggedNode = null;
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        
        this.setupEventListeners();
        this.loadPreset('star_botnet'); // Default preset
        
        // Physics constants
        this.kRepulsion = 400;
        this.kAttraction = 0.04;
        this.damping = 0.85;
        
        this.startSimulationLoop();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Check hover
            this.hoveredNode = null;
            for (let node of this.nodes) {
                const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
                if (dist <= node.radius + 4) {
                    this.hoveredNode = node;
                    break;
                }
            }

            if (this.draggedNode) {
                this.draggedNode.x = mouseX;
                this.draggedNode.y = mouseY;
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.hoveredNode) {
                this.draggedNode = this.hoveredNode;
                this.selectedNode = this.hoveredNode;
                if (this.onSelectNodeCallback) {
                    this.onSelectNodeCallback(this.hoveredNode);
                }
            } else {
                this.selectedNode = null;
            }
        });

        window.addEventListener('mouseup', () => {
            this.draggedNode = null;
        });
    }

    onSelectNode(callback) {
        this.onSelectNodeCallback = callback;
    }

    loadPreset(presetName) {
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
        this.hoveredNode = null;
        
        const names = ["Dan", "Sarah", "Alex", "Emma", "John", "Sophia", "Elon", "Chris", "Mia", "Leo", "Anna", "Ben", "Lisa", "Tom", "Jess"];

        if (presetName === 'star_botnet') {
            // Central main account and surrounding follower bots linked to it
            // This is characteristic of follower-purchaser bots or a central bot-master
            const centerNode = {
                id: "center",
                label: "Target_Hub",
                role: "Central Hub",
                type: "suspicious",
                x: this.centerX,
                y: this.centerY,
                vx: 0,
                vy: 0,
                radius: 14,
                details: "Receives high volume of followers from isolated newly created accounts."
            };
            this.nodes.push(centerNode);

            for (let i = 1; i <= 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const dist = 120 + Math.random() * 40;
                const node = {
                    id: "bot_" + i,
                    label: "Bot_Acct_" + Math.floor(Math.random() * 10000),
                    role: "Follower Bot",
                    type: "fake",
                    x: this.centerX + Math.cos(angle) * dist,
                    y: this.centerY + Math.sin(angle) * dist,
                    vx: 0,
                    vy: 0,
                    radius: 8,
                    details: "Follows target hub. Has 0 followers and matches spam profile patterns."
                };
                this.nodes.push(node);
                this.links.push({ source: node, target: centerNode });
            }
        } 
        else if (presetName === 'circular_ring') {
            // Circular rings: bots following each other in a circle to artificially boost following numbers
            const nodeCount = 10;
            const tempNodes = [];
            for (let i = 0; i < nodeCount; i++) {
                const angle = (i / nodeCount) * Math.PI * 2;
                const dist = 130;
                const node = {
                    id: "ring_" + i,
                    label: "Ring_Bot_" + i,
                    role: "Syndicate Bot",
                    type: "fake",
                    x: this.centerX + Math.cos(angle) * dist,
                    y: this.centerY + Math.sin(angle) * dist,
                    vx: 0,
                    vy: 0,
                    radius: 9,
                    details: "Part of a closed loop follow circle designed to trick spam algorithms."
                };
                this.nodes.push(node);
                tempNodes.push(node);
            }

            // Link in a loop
            for (let i = 0; i < nodeCount; i++) {
                const nextNode = tempNodes[(i + 1) % nodeCount];
                this.links.push({ source: tempNodes[i], target: nextNode });
            }
        } 
        else {
            // Normal human networks: organic cluster structures, tree networks, multiple cross connections
            const seedNodes = [
                { id: "n1", label: "DevDan", role: "Developer", type: "real", radius: 11, details: "Verified tech enthusiast." },
                { id: "n2", label: "DesignerEmma", role: "Designer", type: "real", radius: 10, details: "Freelance artist." },
                { id: "n3", label: "NasaOfficial", role: "Nasa Science", type: "real", radius: 13, details: "Astronomy outreach page." },
                { id: "n4", label: "TechDan", role: "Blogger", type: "real", radius: 10, details: "Dan Martinez." },
                { id: "n5", label: "GamerKid", role: "Player", type: "real", radius: 8, details: "Organic casual user." }
            ];

            seedNodes.forEach((n, idx) => {
                const angle = (idx / seedNodes.length) * Math.PI * 2;
                n.x = this.centerX + Math.cos(angle) * 100;
                n.y = this.centerY + Math.sin(angle) * 100;
                n.vx = 0;
                n.vy = 0;
                this.nodes.push(n);
            });

            // Connect organicaly
            this.links.push({ source: this.nodes[0], target: this.nodes[1] });
            this.links.push({ source: this.nodes[1], target: this.nodes[2] });
            this.links.push({ source: this.nodes[0], target: this.nodes[3] });
            this.links.push({ source: this.nodes[3], target: this.nodes[2] });
            this.links.push({ source: this.nodes[4], target: this.nodes[0] });
            this.links.push({ source: this.nodes[4], target: this.nodes[1] });
        }
    }

    startSimulationLoop() {
        const tick = () => {
            this.updatePhysics();
            this.draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    updatePhysics() {
        // 1. Repulsion between all nodes
        for (let i = 0; i < this.nodes.length; i++) {
            const n1 = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n2 = this.nodes[j];
                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const dist = Math.hypot(dx, dy) || 1;
                
                // Repel formula
                const force = this.kRepulsion / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                if (n1 !== this.draggedNode) {
                    n1.vx -= fx;
                    n1.vy -= fy;
                }
                if (n2 !== this.draggedNode) {
                    n2.vx += fx;
                    n2.vy += fy;
                }
            }
        }

        // 2. Attraction along links
        for (let link of this.links) {
            const n1 = link.source;
            const n2 = link.target;
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.hypot(dx, dy) || 1;
            
            // Attract formula
            const force = dist * this.kAttraction;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (n1 !== this.draggedNode) {
                n1.vx += fx;
                n1.vy += fy;
            }
            if (n2 !== this.draggedNode) {
                n2.vx -= fx;
                n2.vy -= fy;
            }
        }

        // 3. Central gravitational pull
        for (let node of this.nodes) {
            if (node === this.draggedNode) continue;
            
            const dx = this.centerX - node.x;
            const dy = this.centerY - node.y;
            node.vx += dx * 0.005;
            node.vy += dy * 0.005;
            
            // Dampen and update position
            node.vx *= this.damping;
            node.vy *= this.damping;
            node.x += node.vx;
            node.y += node.vy;
            
            // Boundary constraints
            node.x = Math.max(20, Math.min(this.width - 20, node.x));
            node.y = Math.max(20, Math.min(this.height - 20, node.y));
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Links
        this.ctx.lineWidth = 1;
        for (let link of this.links) {
            this.ctx.strokeStyle = "rgba(255,255,255,0.06)";
            
            // Highlight connections to selected node
            if (this.selectedNode && (link.source === this.selectedNode || link.target === this.selectedNode)) {
                this.ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
                this.ctx.lineWidth = 2;
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(link.source.x, link.source.y);
            this.ctx.lineTo(link.target.x, link.target.y);
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }

        // Draw Nodes
        for (let node of this.nodes) {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            
            // Color scheme based on classification type
            let color = "#10b981"; // success (real)
            let glowColor = "rgba(16, 185, 129, 0.3)";
            
            if (node.type === "fake") {
                color = "#ef4444"; // danger (fake)
                glowColor = "rgba(239, 68, 68, 0.4)";
            } else if (node.type === "suspicious") {
                color = "#f59e0b"; // warning (suspicious)
                glowColor = "rgba(245, 158, 11, 0.4)";
            }

            this.ctx.fillStyle = color;
            this.ctx.fill();

            // Glow effect
            if (node === this.selectedNode || node === this.hoveredNode) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = 15;
                this.ctx.strokeStyle = "#ffffff";
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Draw selection outer ring
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
                this.ctx.strokeStyle = "rgba(255,255,255,0.2)";
                this.ctx.stroke();
            } else {
                this.ctx.shadowBlur = 0;
                this.ctx.strokeStyle = "rgba(0,0,0,0.3)";
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            this.ctx.shadowBlur = 0; // reset

            // Labels
            this.ctx.fillStyle = "#cbd5e1";
            this.ctx.font = "500 10px 'Outfit', sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.fillText(node.label, node.x, node.y - node.radius - 6);
        }
    }
}
