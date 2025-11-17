/**
 * Main Application Controller
 */
class FreeWillAgentApp {
    constructor() {
        // Core state
        this.agents = [];
        this.nextAgentId = 1;
        this.turn = 0;
        this.isRunning = false;
        this.isPlacementMode = false;

        // Components
        this.canvasRenderer = null;
        this.toolbox = null;
        this.willGraphModal = null;

        // Simulation settings
        this.turnsPerSecond = 10;
        this.simulationInterval = null;

        // Dragging state
        this.draggedAgent = null;
        this.dragOffset = { x: 0, y: 0 };

        // Double-click detection
        this.lastClickTime = 0;
        this.lastClickedAgent = null;
    }

    /**
     * Initialize the application
     */
    initialize() {
        // Initialize canvas renderer
        const canvas = document.getElementById('agentCanvas');
        this.canvasRenderer = new CanvasRenderer(canvas);

        // Initialize toolbox
        this.toolbox = new Toolbox();

        // Initialize will graph modal
        this.willGraphModal = new WillGraphModal();
        this.willGraphModal.initialize();

        // Setup event listeners
        this.setupEventListeners();

        // Start rendering loop
        this.startRenderLoop();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvasRenderer.resizeCanvas();
        });

        console.log('Free Will Agent Designer initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create agent button
        document.getElementById('createAgentBtn').addEventListener('click', () => {
            this.enterPlacementMode();
        });

        // Delete agent button
        document.getElementById('deleteAgentBtn').addEventListener('click', () => {
            this.deleteSelectedAgent();
        });

        // Edit will graph button
        document.getElementById('editWillGraphBtn').addEventListener('click', () => {
            if (this.toolbox.selectedAgent) {
                this.willGraphModal.open(this.toolbox.selectedAgent);
            }
        });

        // Clone agent button
        document.getElementById('cloneAgentBtn').addEventListener('click', () => {
            this.cloneSelectedAgent();
        });

        // Play/pause button
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            this.toggleSimulation();
        });

        // Step button
        document.getElementById('stepBtn').addEventListener('click', () => {
            this.simulationStep();
        });

        // Speed slider
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.turnsPerSecond = parseInt(e.target.value);
            if (this.isRunning) {
                this.stopSimulation();
                this.startSimulation();
            }
        });

        // Clear all button
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            if (confirm('Delete all agents?')) {
                this.clearAllAgents();
            }
        });

        // Reset simulation button
        document.getElementById('resetSimBtn').addEventListener('click', () => {
            if (confirm('Reset simulation (turn counter to 0)?')) {
                this.resetSimulation();
            }
        });

        // Canvas events
        const canvas = document.getElementById('agentCanvas');

        canvas.addEventListener('mousedown', (e) => {
            this.handleCanvasMouseDown(e);
        });

        canvas.addEventListener('mousemove', (e) => {
            this.handleCanvasMouseMove(e);
        });

        canvas.addEventListener('mouseup', (e) => {
            this.handleCanvasMouseUp(e);
        });

        canvas.addEventListener('mouseleave', () => {
            this.draggedAgent = null;
        });
    }

    /**
     * Handle canvas mouse down
     */
    handleCanvasMouseDown(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isPlacementMode) {
            // Place new agent
            this.createAgent(x, y);
            this.exitPlacementMode();
            return;
        }

        // Check if clicking on an agent
        const agent = this.canvasRenderer.getAgentAtPosition(this.agents, x, y);

        if (agent) {
            // Check for double-click
            const now = Date.now();
            if (this.lastClickedAgent === agent && (now - this.lastClickTime) < 300) {
                // Double-click detected
                this.handleAgentDoubleClick(agent);
                this.lastClickedAgent = null;
                this.lastClickTime = 0;
                return;
            }

            this.lastClickedAgent = agent;
            this.lastClickTime = now;

            // Single click - select and prepare for drag
            this.toolbox.selectAgent(agent);

            this.draggedAgent = agent;
            this.dragOffset = {
                x: x - agent.x,
                y: y - agent.y
            };
        } else {
            // Clicked on empty space - deselect
            this.toolbox.deselectAgent();
        }
    }

    /**
     * Handle canvas mouse move
     */
    handleCanvasMouseMove(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.draggedAgent) {
            // Drag agent
            this.draggedAgent.x = x - this.dragOffset.x;
            this.draggedAgent.y = y - this.dragOffset.y;

            // Keep within bounds
            this.draggedAgent.x = Math.max(30, Math.min(this.canvasRenderer.width - 30, this.draggedAgent.x));
            this.draggedAgent.y = Math.max(30, Math.min(this.canvasRenderer.height - 30, this.draggedAgent.y));

            // Update inspector if this is the selected agent
            if (this.toolbox.selectedAgent === this.draggedAgent) {
                this.toolbox.updateInspector();
            }
        }
    }

    /**
     * Handle canvas mouse up
     */
    handleCanvasMouseUp(e) {
        this.draggedAgent = null;
    }

    /**
     * Handle agent double-click
     */
    handleAgentDoubleClick(agent) {
        this.willGraphModal.open(agent);
    }

    /**
     * Enter placement mode
     */
    enterPlacementMode() {
        this.isPlacementMode = true;
        document.getElementById('createAgentBtn').classList.add('disabled');
        document.getElementById('placementModeText').style.display = 'block';
        document.getElementById('agentCanvas').style.cursor = 'crosshair';
    }

    /**
     * Exit placement mode
     */
    exitPlacementMode() {
        this.isPlacementMode = false;
        document.getElementById('createAgentBtn').classList.remove('disabled');
        document.getElementById('placementModeText').style.display = 'none';
        document.getElementById('agentCanvas').style.cursor = 'default';
    }

    /**
     * Create new agent
     */
    createAgent(x, y) {
        const agent = new Agent(x, y, this.nextAgentId++);
        this.agents.push(agent);

        // Hide welcome message
        document.getElementById('welcomeMessage').style.display = 'none';

        // Select the new agent
        this.toolbox.selectAgent(agent);

        console.log(`Created Agent #${agent.id} at (${Math.round(x)}, ${Math.round(y)})`);
    }

    /**
     * Delete selected agent
     */
    deleteSelectedAgent() {
        if (!this.toolbox.selectedAgent) return;

        const agent = this.toolbox.selectedAgent;

        if (confirm(`Delete Agent #${agent.id}?`)) {
            this.agents = this.agents.filter(a => a !== agent);
            this.toolbox.deselectAgent();

            // Show welcome message if no agents left
            if (this.agents.length === 0) {
                document.getElementById('welcomeMessage').style.display = 'block';
            }

            console.log(`Deleted Agent #${agent.id}`);
        }
    }

    /**
     * Clone selected agent
     */
    cloneSelectedAgent() {
        if (!this.toolbox.selectedAgent) return;

        const parent = this.toolbox.selectedAgent;

        // Place clone nearby
        const angle = Math.random() * Math.PI * 2;
        const distance = 80;
        const x = parent.x + Math.cos(angle) * distance;
        const y = parent.y + Math.sin(angle) * distance;

        const clone = parent.clone(x, y, this.nextAgentId++);
        clone.energy = 100; // Clones start with full energy

        this.agents.push(clone);

        console.log(`Cloned Agent #${parent.id} -> Agent #${clone.id}`);
    }

    /**
     * Clear all agents
     */
    clearAllAgents() {
        this.agents = [];
        this.toolbox.deselectAgent();
        this.turn = 0;
        document.getElementById('welcomeMessage').style.display = 'block';
        console.log('Cleared all agents');
    }

    /**
     * Reset simulation
     */
    resetSimulation() {
        this.turn = 0;
        this.toolbox.updateTurnCounter(this.turn);
        console.log('Reset simulation');
    }

    /**
     * Toggle simulation running state
     */
    toggleSimulation() {
        if (this.isRunning) {
            this.stopSimulation();
        } else {
            this.startSimulation();
        }
    }

    /**
     * Start simulation
     */
    startSimulation() {
        if (this.agents.length === 0) {
            alert('Create at least one agent first!');
            return;
        }

        this.isRunning = true;
        this.toolbox.updatePlayPauseButton(true);

        const intervalMs = 1000 / this.turnsPerSecond;
        this.simulationInterval = setInterval(() => {
            this.simulationStep();
        }, intervalMs);

        console.log('Simulation started');
    }

    /**
     * Stop simulation
     */
    stopSimulation() {
        this.isRunning = false;
        this.toolbox.updatePlayPauseButton(false);

        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }

        console.log('Simulation stopped');
    }

    /**
     * Single simulation step
     */
    simulationStep() {
        this.turn++;
        this.toolbox.updateTurnCounter(this.turn);

        // Compute observations for all agents
        const observations = this.computeObservations();

        // Update saliences for all agents
        for (let agent of this.agents) {
            const agentObs = observations[agent.id] || { neighborCount: 0 };
            agent.updateSaliences(agentObs);
        }

        // Execute actions for all agents
        const newAgents = [];
        for (let agent of this.agents) {
            const result = agent.act(
                this.agents,
                this.canvasRenderer.width,
                this.canvasRenderer.height
            );

            // Handle reproduction
            if (result && result.type === 'reproduce') {
                const child = result.parent.clone(result.x, result.y, this.nextAgentId++);
                newAgents.push(child);
                console.log(`Agent #${result.parent.id} reproduced -> Agent #${child.id}`);
            }
        }

        // Add new agents
        this.agents.push(...newAgents);

        // Update agent state
        for (let agent of this.agents) {
            agent.update();
        }

        // Remove dead agents
        const deadAgents = this.agents.filter(a => a.isDead());
        this.agents = this.agents.filter(a => !a.isDead());

        deadAgents.forEach(agent => {
            console.log(`Agent #${agent.id} died`);

            // Deselect if it was selected
            if (this.toolbox.selectedAgent === agent) {
                this.toolbox.deselectAgent();
            }
        });

        // Show welcome message if all agents died
        if (this.agents.length === 0) {
            document.getElementById('welcomeMessage').style.display = 'block';
            this.stopSimulation();
        }
    }

    /**
     * Compute observations for agents
     */
    computeObservations() {
        const observations = {};

        for (let agent of this.agents) {
            // Count nearby neighbors
            let neighborCount = 0;
            for (let other of this.agents) {
                if (other === agent) continue;

                const dx = other.x - agent.x;
                const dy = other.y - agent.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    neighborCount++;
                }
            }

            observations[agent.id] = {
                neighborCount: neighborCount
            };
        }

        return observations;
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        const render = () => {
            // Render agents on canvas
            this.canvasRenderer.render(this.agents);

            // Update inspector if agent is selected
            if (this.toolbox.selectedAgent) {
                this.toolbox.updateInspector();
            }

            // Update statistics
            this.toolbox.updateStatistics(this.agents);

            requestAnimationFrame(render);
        };

        render();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FreeWillAgentApp();
    app.initialize();

    // Make app globally accessible for debugging
    window.app = app;
});
