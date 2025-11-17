/**
 * Toolbox - Manages left panel controls and inspector
 */
class Toolbox {
    constructor() {
        this.selectedAgent = null;
        this.onAgentSelected = null; // Callback
        this.onAgentDeselected = null; // Callback

        this.setupEventListeners();
    }

    /**
     * Setup event listeners for toolbox controls
     */
    setupEventListeners() {
        // Energy slider
        document.getElementById('energySlider').addEventListener('input', (e) => {
            if (this.selectedAgent) {
                this.selectedAgent.energy = parseInt(e.target.value);
                document.getElementById('energySliderValue').textContent = e.target.value;
                this.updateInspector();
            }
        });

        // Feed agent button
        document.getElementById('feedAgentBtn').addEventListener('click', () => {
            if (this.selectedAgent) {
                this.selectedAgent.energy = Math.min(100, this.selectedAgent.energy + 20);
                this.updateInspector();
            }
        });

        // Deselect agent button
        document.getElementById('deselectAgentBtn').addEventListener('click', () => {
            this.deselectAgent();
        });

        // Reset saliences button
        document.getElementById('resetSaliencesBtn').addEventListener('click', () => {
            if (this.selectedAgent) {
                if (confirm('Reset all saliences to equal distribution?')) {
                    this.selectedAgent.resetSaliences();
                    this.updateInspector();
                }
            }
        });

        // Speed slider
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            document.getElementById('speedValue').textContent = e.target.value;
            // The actual speed change is handled in main.js
        });
    }

    /**
     * Select an agent
     */
    selectAgent(agent) {
        // Deselect previous agent
        if (this.selectedAgent) {
            this.selectedAgent.selected = false;
        }

        this.selectedAgent = agent;
        agent.selected = true;

        // Show inspector
        document.getElementById('agentInspector').style.display = 'block';
        document.getElementById('welcomeMessage').style.display = 'none';

        this.updateInspector();

        if (this.onAgentSelected) {
            this.onAgentSelected(agent);
        }
    }

    /**
     * Deselect current agent
     */
    deselectAgent() {
        if (this.selectedAgent) {
            this.selectedAgent.selected = false;
            this.selectedAgent = null;
        }

        document.getElementById('agentInspector').style.display = 'none';

        if (this.onAgentDeselected) {
            this.onAgentDeselected();
        }
    }

    /**
     * Update inspector display
     */
    updateInspector() {
        if (!this.selectedAgent) return;

        const agent = this.selectedAgent;

        // Update basic info
        document.getElementById('agentIdDisplay').textContent = `Agent #${agent.id}`;
        document.getElementById('agentPosition').textContent = `(${Math.round(agent.x)}, ${Math.round(agent.y)})`;
        document.getElementById('agentEnergy').textContent = Math.round(agent.energy);
        document.getElementById('agentAge').textContent = agent.age;

        // Update energy bar
        const energyBar = document.getElementById('agentEnergyBar');
        energyBar.style.width = `${agent.energy}%`;

        // Update energy slider
        const energySlider = document.getElementById('energySlider');
        energySlider.value = Math.round(agent.energy);
        document.getElementById('energySliderValue').textContent = Math.round(agent.energy);

        // Update dominant purpose
        const dominant = agent.getDominantPurpose();
        const purpose = agent.purposes[dominant];
        const badge = document.getElementById('agentDominantPurpose');
        badge.textContent = dominant;
        badge.style.background = purpose.color;

        // Update salience list
        this.updateSalienceList();
    }

    /**
     * Update salience list display
     */
    updateSalienceList() {
        if (!this.selectedAgent) return;

        const container = document.getElementById('salienceList');
        container.innerHTML = '';

        const purposes = this.selectedAgent.getPurposesSorted();
        const dominant = this.selectedAgent.getDominantPurpose();

        purposes.forEach(purpose => {
            const item = document.createElement('div');
            item.className = 'salience-item';

            if (purpose.name === dominant) {
                item.classList.add('dominant');
            }

            const header = document.createElement('div');
            header.className = 'salience-header';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'salience-name';

            const colorDot = document.createElement('span');
            colorDot.className = 'salience-color';
            colorDot.style.background = purpose.color;

            nameSpan.appendChild(colorDot);
            nameSpan.appendChild(document.createTextNode(purpose.name));

            if (purpose.name === dominant) {
                const star = document.createTextNode(' ★');
                nameSpan.appendChild(star);
            }

            const valueSpan = document.createElement('span');
            valueSpan.className = 'salience-value';
            valueSpan.textContent = `${Math.round(purpose.salience * 100)}%`;

            header.appendChild(nameSpan);
            header.appendChild(valueSpan);

            const barContainer = document.createElement('div');
            barContainer.className = 'salience-bar-container';

            const bar = document.createElement('div');
            bar.className = 'salience-bar';
            bar.style.width = `${purpose.salience * 100}%`;
            bar.style.background = purpose.color;

            barContainer.appendChild(bar);

            item.appendChild(header);
            item.appendChild(barContainer);
            container.appendChild(item);
        });
    }

    /**
     * Update statistics display
     */
    updateStatistics(agents) {
        // Total agents
        document.getElementById('totalAgents').textContent = agents.length;

        // Average energy
        if (agents.length > 0) {
            const avgEnergy = agents.reduce((sum, a) => sum + a.energy, 0) / agents.length;
            document.getElementById('avgEnergy').textContent = avgEnergy.toFixed(1);
        } else {
            document.getElementById('avgEnergy').textContent = '0';
        }

        // Purpose distribution
        const distribution = {};
        agents.forEach(agent => {
            const dominant = agent.getDominantPurpose();
            distribution[dominant] = (distribution[dominant] || 0) + 1;
        });

        const distContainer = document.getElementById('purposeDistList');
        distContainer.innerHTML = '';

        // Sort by count descending
        const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

        sorted.forEach(([purposeName, count]) => {
            // Find purpose color from any agent that has it
            let color = '#2196F3';
            for (let agent of agents) {
                if (agent.purposes[purposeName]) {
                    color = agent.purposes[purposeName].color;
                    break;
                }
            }

            const item = document.createElement('div');
            item.className = 'purpose-dist-item';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'purpose-dist-name';

            const colorDot = document.createElement('span');
            colorDot.className = 'salience-color';
            colorDot.style.background = color;

            nameDiv.appendChild(colorDot);
            nameDiv.appendChild(document.createTextNode(purposeName));

            const countSpan = document.createElement('span');
            countSpan.className = 'purpose-dist-count';
            countSpan.textContent = count;

            item.appendChild(nameDiv);
            item.appendChild(countSpan);
            distContainer.appendChild(item);
        });
    }

    /**
     * Update turn counter
     */
    updateTurnCounter(turn) {
        document.getElementById('turnCounter').textContent = turn;
    }

    /**
     * Update play/pause button
     */
    updatePlayPauseButton(isRunning) {
        const btn = document.getElementById('playPauseBtn');
        const icon = document.getElementById('playPauseIcon');

        if (isRunning) {
            icon.textContent = '⏸';
            btn.innerHTML = `<span id="playPauseIcon">⏸</span> Pause`;
        } else {
            icon.textContent = '▶';
            btn.innerHTML = `<span id="playPauseIcon">▶</span> Play`;
        }
    }

    /**
     * Check if agent is selected
     */
    isAgentSelected() {
        return this.selectedAgent !== null;
    }

    /**
     * Get selected agent
     */
    getSelectedAgent() {
        return this.selectedAgent;
    }
}
