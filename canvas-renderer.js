/**
 * Canvas Renderer for drawing agents
 */
class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        // Animation state
        this.animationTime = 0;

        this.resizeCanvas();
    }

    /**
     * Resize canvas to fill container
     */
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        // Set canvas size with device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        this.ctx.scale(dpr, dpr);
    }

    /**
     * Clear canvas
     */
    clear() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Render all agents
     */
    render(agents) {
        this.clear();
        this.animationTime += 0.05;

        // Draw agents
        for (let agent of agents) {
            this.drawAgent(agent);
        }
    }

    /**
     * Draw a single agent
     */
    drawAgent(agent) {
        const ctx = this.ctx;
        const dominant = agent.getDominantPurpose();
        const purpose = agent.purposes[dominant];

        // Calculate visual properties
        const baseRadius = 10;
        const maxRadiusBonus = 20;
        const radius = baseRadius + (agent.energy / 100) * maxRadiusBonus;

        const salience = purpose.salience;
        const opacity = 0.4 + 0.6 * salience;

        // Parse color and apply opacity
        const color = this.hexToRgb(purpose.color);
        const fillColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;

        // Draw agent body
        ctx.save();

        // Glow effect for selected agent
        if (agent.selected) {
            ctx.shadowColor = purpose.color;
            ctx.shadowBlur = 15;
        }

        // Main circle with gradient
        const gradient = ctx.createRadialGradient(
            agent.x, agent.y, 0,
            agent.x, agent.y, radius
        );
        gradient.addColorStop(0, this.lightenColor(purpose.color, 30));
        gradient.addColorStop(1, purpose.color);

        ctx.fillStyle = gradient;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Border for selected agent
        if (agent.selected) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();

        // Pulse animation for dominant purpose with high salience
        if (salience > 0.7) {
            const pulseRadius = radius + Math.sin(this.animationTime * 3) * 3;
            ctx.save();
            ctx.globalAlpha = 0.3 * salience;
            ctx.strokeStyle = purpose.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(agent.x, agent.y, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw energy indicator (small bar below agent)
        this.drawEnergyBar(agent, radius);

        // Draw agent ID (for debugging)
        if (agent.selected) {
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Agent #${agent.id}`, agent.x, agent.y - radius - 10);
            ctx.restore();
        }
    }

    /**
     * Draw energy bar below agent
     */
    drawEnergyBar(agent, radius) {
        const ctx = this.ctx;
        const barWidth = radius * 2;
        const barHeight = 3;
        const barY = agent.y + radius + 5;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(
            agent.x - barWidth / 2,
            barY,
            barWidth,
            barHeight
        );

        // Energy fill
        const energyRatio = agent.energy / 100;
        const fillColor = energyRatio > 0.5 ? '#4CAF50' :
                         energyRatio > 0.25 ? '#FFC107' : '#f44336';

        ctx.fillStyle = fillColor;
        ctx.fillRect(
            agent.x - barWidth / 2,
            barY,
            barWidth * energyRatio,
            barHeight
        );
    }

    /**
     * Get agent at position (for click detection)
     */
    getAgentAtPosition(agents, x, y) {
        // Check in reverse order (topmost agents first)
        for (let i = agents.length - 1; i >= 0; i--) {
            const agent = agents[i];
            const baseRadius = 10;
            const maxRadiusBonus = 20;
            const radius = baseRadius + (agent.energy / 100) * maxRadiusBonus;

            const dx = x - agent.x;
            const dy = y - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= radius) {
                return agent;
            }
        }

        return null;
    }

    /**
     * Convert hex color to RGB object
     */
    hexToRgb(hex) {
        // Handle both #RGB and #RRGGBB formats
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 100, g: 150, b: 255 }; // Default blue
    }

    /**
     * Lighten a color by a percentage
     */
    lightenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        const r = Math.min(255, rgb.r + (255 - rgb.r) * percent / 100);
        const g = Math.min(255, rgb.g + (255 - rgb.g) * percent / 100);
        const b = Math.min(255, rgb.b + (255 - rgb.b) * percent / 100);
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    /**
     * Draw grid background (optional)
     */
    drawGrid() {
        const ctx = this.ctx;
        const gridSize = 50;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        ctx.restore();
    }
}
