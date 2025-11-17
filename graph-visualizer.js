/**
 * Graph Visualizer for purpose network in modal
 */
class GraphVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        // Node positions (can be dragged by user)
        this.nodePositions = {};

        // Dragging state
        this.draggingNode = null;
        this.dragOffset = { x: 0, y: 0 };

        // Animation
        this.animationTime = 0;

        this.resizeCanvas();
        this.setupEventListeners();
    }

    /**
     * Resize canvas
     */
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        this.ctx.scale(dpr, dpr);
    }

    /**
     * Setup event listeners for dragging nodes
     */
    setupEventListeners() {
        let isDragging = false;

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if clicking on a node
            for (let nodeName in this.nodePositions) {
                const pos = this.nodePositions[nodeName];
                const dx = x - pos.x;
                const dy = y - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= pos.radius) {
                    this.draggingNode = nodeName;
                    this.dragOffset = { x: dx, y: dy };
                    isDragging = true;
                    this.canvas.style.cursor = 'grabbing';
                    break;
                }
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.draggingNode) {
                // Update node position
                this.nodePositions[this.draggingNode].x = x - this.dragOffset.x;
                this.nodePositions[this.draggingNode].y = y - this.dragOffset.y;
            } else {
                // Check hover for cursor change
                let hovering = false;
                for (let nodeName in this.nodePositions) {
                    const pos = this.nodePositions[nodeName];
                    const dx = x - pos.x;
                    const dy = y - pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist <= pos.radius) {
                        hovering = true;
                        break;
                    }
                }
                this.canvas.style.cursor = hovering ? 'grab' : 'default';
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.draggingNode = null;
            isDragging = false;
            this.canvas.style.cursor = 'default';
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.draggingNode = null;
            isDragging = false;
            this.canvas.style.cursor = 'default';
        });
    }

    /**
     * Render purpose graph
     */
    render(purposes) {
        this.clear();
        this.animationTime += 0.05;

        // Update node positions if needed
        this.updateNodePositions(purposes);

        // Draw edges first (so they appear behind nodes)
        this.drawEdges(purposes);

        // Draw nodes
        this.drawNodes(purposes);
    }

    /**
     * Clear canvas
     */
    clear() {
        this.ctx.fillStyle = '#fafafa';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Update node positions using hierarchical layout
     */
    updateNodePositions(purposes) {
        // Check if we need to recalculate positions
        const purposeNames = Object.keys(purposes);
        const existingNames = Object.keys(this.nodePositions);

        const needsUpdate = purposeNames.length !== existingNames.length ||
            purposeNames.some(name => !this.nodePositions[name]);

        if (needsUpdate) {
            // Compute hierarchical layout
            const layout = PurposeGraph.computeHierarchicalLayout(
                purposes,
                this.width,
                this.height
            );

            // Preserve existing positions, add new ones
            for (let name in layout) {
                if (!this.nodePositions[name]) {
                    this.nodePositions[name] = {
                        x: layout[name].x,
                        y: layout[name].y,
                        radius: 30
                    };
                }
            }

            // Remove positions for deleted purposes
            for (let name in this.nodePositions) {
                if (!purposes[name]) {
                    delete this.nodePositions[name];
                }
            }
        }

        // Update radius based on salience
        for (let name in purposes) {
            const purpose = purposes[name];
            const baseRadius = purpose.type === 'terminal' ? 35 : 30;
            const salienceBonus = purpose.salience * 10;
            this.nodePositions[name].radius = baseRadius + salienceBonus;
        }
    }

    /**
     * Draw edges (connections between purposes)
     */
    drawEdges(purposes) {
        const ctx = this.ctx;

        for (let sourceName in purposes) {
            const source = purposes[sourceName];
            const sourcePos = this.nodePositions[sourceName];

            if (!source.connections || !sourcePos) continue;

            for (let conn of source.connections) {
                const targetPos = this.nodePositions[conn.target];
                if (!targetPos) continue;

                const target = purposes[conn.target];

                // Calculate arrow points
                const dx = targetPos.x - sourcePos.x;
                const dy = targetPos.y - sourcePos.y;
                const angle = Math.atan2(dy, dx);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Start and end points (adjusted for node radius)
                const startX = sourcePos.x + Math.cos(angle) * sourcePos.radius;
                const startY = sourcePos.y + Math.sin(angle) * sourcePos.radius;
                const endX = targetPos.x - Math.cos(angle) * targetPos.radius;
                const endY = targetPos.y - Math.sin(angle) * targetPos.radius;

                // Control point for curve
                const controlX = (startX + endX) / 2 + Math.sin(angle) * 30;
                const controlY = (startY + endY) / 2 - Math.cos(angle) * 30;

                // Draw curve
                ctx.save();
                ctx.strokeStyle = this.blendColors(source.color, target.color, 0.5);
                ctx.lineWidth = 2 + conn.probability * 3;
                ctx.globalAlpha = 0.6;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.quadraticCurveTo(controlX, controlY, endX, endY);
                ctx.stroke();

                // Draw arrowhead
                const arrowSize = 8;
                const arrowAngle = Math.atan2(endY - controlY, endX - controlX);

                ctx.fillStyle = ctx.strokeStyle;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
                    endY - arrowSize * Math.sin(arrowAngle - Math.PI / 6)
                );
                ctx.lineTo(
                    endX - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
                    endY - arrowSize * Math.sin(arrowAngle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();

                // Draw probability label
                const labelX = (startX + endX) / 2;
                const labelY = (startY + endY) / 2;

                ctx.globalAlpha = 1;
                ctx.fillStyle = 'white';
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 3;
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeText(conn.probability.toFixed(2), labelX, labelY);
                ctx.fillText(conn.probability.toFixed(2), labelX, labelY);

                ctx.restore();
            }
        }
    }

    /**
     * Draw nodes (purposes)
     */
    drawNodes(purposes) {
        const ctx = this.ctx;

        for (let name in purposes) {
            const purpose = purposes[name];
            const pos = this.nodePositions[name];
            if (!pos) continue;

            ctx.save();

            // Glow effect for high salience
            if (purpose.salience > 0.6) {
                ctx.shadowColor = purpose.color;
                ctx.shadowBlur = 15 * purpose.salience;
            }

            // Draw circle with gradient
            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, pos.radius
            );
            gradient.addColorStop(0, this.lightenColor(purpose.color, 40));
            gradient.addColorStop(1, purpose.color);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pos.radius, 0, Math.PI * 2);
            ctx.fill();

            // Border (thicker for terminal purposes)
            ctx.strokeStyle = purpose.type === 'terminal' ? '#333' : '#666';
            ctx.lineWidth = purpose.type === 'terminal' ? 3 : 2;
            ctx.stroke();

            // Pulse animation for dominant purpose
            const allPurposes = Object.values(purposes);
            const maxSalience = Math.max(...allPurposes.map(p => p.salience));
            if (purpose.salience === maxSalience && purpose.salience > 0) {
                const pulseRadius = pos.radius + Math.sin(this.animationTime * 3) * 4;
                ctx.strokeStyle = purpose.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();

            // Draw label
            ctx.save();
            ctx.fillStyle = '#333';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(purpose.name, pos.x, pos.y);

            // Draw salience percentage below name
            ctx.font = '11px sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText(
                `${Math.round(purpose.salience * 100)}%`,
                pos.x,
                pos.y + 15
            );

            ctx.restore();
        }
    }

    /**
     * Blend two colors
     */
    blendColors(color1, color2, ratio) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);

        const r = Math.round(rgb1.r * ratio + rgb2.r * (1 - ratio));
        const g = Math.round(rgb1.g * ratio + rgb2.g * (1 - ratio));
        const b = Math.round(rgb1.b * ratio + rgb2.b * (1 - ratio));

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 100, g: 150, b: 255 };
    }

    /**
     * Lighten color
     */
    lightenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        const r = Math.min(255, rgb.r + (255 - rgb.r) * percent / 100);
        const g = Math.min(255, rgb.g + (255 - rgb.g) * percent / 100);
        const b = Math.min(255, rgb.b + (255 - rgb.b) * percent / 100);
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
}
