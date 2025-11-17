/**
 * Agent class representing an agent with a Dynamic Bayesian Network-based purpose hierarchy
 * Implements the DeLancey & Gomez (2025) model of purposeful behavior
 */
class Agent {
    constructor(x, y, id) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.energy = 100;
        this.age = 0;
        this.selected = false;

        // Purpose network stored as graph
        // Format: purposeName -> purpose object
        this.purposes = {
            'SURVIVE': {
                name: 'SURVIVE',
                type: 'terminal',
                salience: 0.33,
                color: '#6495ED', // cornflower blue
                connections: [], // terminals have no outgoing connections
                actionEffect: null
            },
            'REPRODUCE': {
                name: 'REPRODUCE',
                type: 'terminal',
                salience: 0.33,
                color: '#90EE90', // light green
                connections: [],
                actionEffect: {
                    type: 'reproduce',
                    value: 0
                }
            },
            'THRIVE': {
                name: 'THRIVE',
                type: 'terminal',
                salience: 0.34,
                color: '#DDA0DD', // plum
                connections: [],
                actionEffect: null
            }
        };

        // Store previous salience for temporal carry-over
        this.previousSaliences = {
            'SURVIVE': 0.33,
            'REPRODUCE': 0.33,
            'THRIVE': 0.34
        };
    }

    /**
     * Add new purpose to network
     */
    addPurpose(name, type, initialSalience, color, connections, actionEffect) {
        if (this.purposes[name]) {
            throw new Error(`Purpose '${name}' already exists`);
        }

        if (type === 'instrumental' && (!connections || connections.length === 0)) {
            throw new Error('Instrumental purposes must have at least one connection');
        }

        this.purposes[name] = {
            name: name,
            type: type, // 'terminal' or 'instrumental'
            salience: initialSalience,
            color: color,
            connections: connections || [], // Array of {target: 'PURPOSE_NAME', probability: 0.9}
            actionEffect: actionEffect // {type: 'increase_energy', value: 5}
        };

        this.previousSaliences[name] = initialSalience;
    }

    /**
     * Remove purpose from network
     */
    removePurpose(name) {
        if (!this.purposes[name]) {
            throw new Error(`Purpose '${name}' does not exist`);
        }

        if (this.purposes[name].type === 'terminal') {
            throw new Error('Cannot remove terminal purpose');
        }

        // Remove the purpose
        delete this.purposes[name];
        delete this.previousSaliences[name];

        // Remove any connections TO this purpose from other purposes
        for (let purposeName in this.purposes) {
            const purpose = this.purposes[purposeName];
            purpose.connections = purpose.connections.filter(conn => conn.target !== name);
        }
    }

    /**
     * Update purpose properties
     */
    updatePurpose(name, updates) {
        if (!this.purposes[name]) {
            throw new Error(`Purpose '${name}' does not exist`);
        }

        // Validate connections for instrumental purposes
        if (updates.connections !== undefined && this.purposes[name].type === 'instrumental') {
            if (updates.connections.length === 0) {
                throw new Error('Instrumental purposes must have at least one connection');
            }
        }

        // Update properties
        Object.assign(this.purposes[name], updates);
    }

    /**
     * Add connection from one purpose to another
     */
    addConnection(fromPurpose, toPurpose, probability) {
        if (!this.purposes[fromPurpose] || !this.purposes[toPurpose]) {
            throw new Error('Invalid purpose names');
        }

        if (this.purposes[fromPurpose].type === 'terminal') {
            throw new Error('Terminal purposes cannot have outgoing connections');
        }

        // Check if connection already exists
        const existing = this.purposes[fromPurpose].connections.find(
            conn => conn.target === toPurpose
        );

        if (existing) {
            // Update probability
            existing.probability = probability;
        } else {
            // Add new connection
            this.purposes[fromPurpose].connections.push({
                target: toPurpose,
                probability: probability
            });
        }
    }

    /**
     * Remove connection
     */
    removeConnection(fromPurpose, toPurpose) {
        if (!this.purposes[fromPurpose]) return;

        this.purposes[fromPurpose].connections =
            this.purposes[fromPurpose].connections.filter(conn => conn.target !== toPurpose);
    }

    /**
     * Update salience for all purposes (core DBN computation)
     * @param {Object} observations - Environmental observations
     * @param {Number} alpha - Weight for previous salience (temporal carry-over)
     * @param {Number} beta - Weight for observations
     * @param {Number} gamma - Weight for activation/homeostatic influence
     */
    updateSaliences(observations, alpha = 0.3, beta = 0.4, gamma = 0.3) {
        // Store previous saliences
        for (let name in this.purposes) {
            this.previousSaliences[name] = this.purposes[name].salience;
        }

        // Update each purpose
        for (let name in this.purposes) {
            const purpose = this.purposes[name];

            if (purpose.type === 'terminal') {
                // Terminal purposes updated by observations and homeostatic factors
                const obsInfluence = this.computeObservationInfluence(purpose, observations);
                const homeoInfluence = this.computeHomeostaticInfluence(purpose);

                purpose.salience =
                    alpha * this.previousSaliences[name] +
                    beta * obsInfluence +
                    gamma * homeoInfluence;

            } else {
                // Instrumental purposes activated by their target purposes (top-down activation)
                let activation = 0;
                for (let conn of purpose.connections) {
                    const targetSalience = this.previousSaliences[conn.target] || 0;
                    activation += targetSalience * conn.probability;
                }

                // Normalize activation to [0, 1]
                activation = Math.min(1, activation);

                const obsInfluence = this.computeObservationInfluence(purpose, observations);

                purpose.salience =
                    alpha * this.previousSaliences[name] +
                    beta * obsInfluence +
                    gamma * activation;
            }

            // Clamp to [0, 1]
            purpose.salience = Math.max(0, Math.min(1, purpose.salience));
        }
    }

    /**
     * Compute observation influence for a purpose
     */
    computeObservationInfluence(purpose, observations) {
        // Base observation influence
        let influence = 0;

        // Different observations affect different purposes
        // This can be customized based on purpose semantics

        // For now, we'll use general heuristics
        // Terminal purposes respond to specific observations
        if (purpose.name === 'SURVIVE') {
            // Low energy increases SURVIVE salience
            influence = 1 - (this.energy / 100);
        } else if (purpose.name === 'REPRODUCE') {
            // High energy and maturity increase REPRODUCE salience
            const energyFactor = this.energy / 100;
            const ageFactor = Math.min(this.age / 50, 1);
            influence = energyFactor * ageFactor;
        } else if (purpose.name === 'THRIVE') {
            // Stable conditions increase THRIVE salience
            const neighborCount = observations.neighborCount || 0;
            const optimalNeighbors = 5;
            influence = 1 - Math.abs(neighborCount - optimalNeighbors) / optimalNeighbors;
            influence = Math.max(0, Math.min(1, influence));
        } else {
            // Instrumental purposes have minimal direct observation influence
            influence = 0.1;
        }

        return influence;
    }

    /**
     * Compute homeostatic influence for terminal purposes
     */
    computeHomeostaticInfluence(purpose) {
        // Homeostatic factors drive terminal purposes
        if (purpose.name === 'SURVIVE') {
            // Low energy creates urgency
            return 1 - (this.energy / 100);
        } else if (purpose.name === 'REPRODUCE') {
            // High energy enables reproduction
            return this.energy > 70 ? 0.8 : 0.2;
        } else if (purpose.name === 'THRIVE') {
            // Balanced state
            return 0.5;
        }

        return 0.3; // Default
    }

    /**
     * Get purpose with highest salience
     */
    getDominantPurpose() {
        let maxSalience = -1;
        let dominant = null;

        for (let name in this.purposes) {
            if (this.purposes[name].salience > maxSalience) {
                maxSalience = this.purposes[name].salience;
                dominant = name;
            }
        }

        return dominant;
    }

    /**
     * Execute action based on dominant purpose
     * Returns action result or null
     */
    act(agents, canvasWidth, canvasHeight) {
        const dominant = this.getDominantPurpose();
        const purpose = this.purposes[dominant];

        // Handle terminal purposes with default behaviors
        if (purpose.name === 'SURVIVE') {
            // No action, just maintain status
            return null;
        }

        if (purpose.name === 'REPRODUCE') {
            return this.attemptReproduction(agents, canvasWidth, canvasHeight);
        }

        if (purpose.name === 'THRIVE') {
            // No action, maintain community status
            return null;
        }

        // Handle instrumental purposes with custom actions
        if (purpose.actionEffect) {
            return this.executeActionEffect(purpose.actionEffect, agents, canvasWidth, canvasHeight);
        }

        return null;
    }

    /**
     * Attempt to reproduce (create offspring)
     */
    attemptReproduction(agents, canvasWidth, canvasHeight) {
        if (this.energy < 70) {
            return null;
        }

        // Check if there's space nearby
        const nearbyAgents = agents.filter(a => {
            const dx = a.x - this.x;
            const dy = a.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < 100 && a.id !== this.id;
        });

        if (nearbyAgents.length > 5) {
            // Too crowded
            return null;
        }

        // Create offspring nearby
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 30;
        const childX = Math.max(30, Math.min(canvasWidth - 30, this.x + Math.cos(angle) * distance));
        const childY = Math.max(30, Math.min(canvasHeight - 30, this.y + Math.sin(angle) * distance));

        // Parent loses energy
        this.energy -= 30;

        return {
            type: 'reproduce',
            x: childX,
            y: childY,
            parent: this
        };
    }

    /**
     * Execute custom action effect for instrumental purpose
     */
    executeActionEffect(effect, agents, canvasWidth, canvasHeight) {
        switch(effect.type) {
            case 'increase_energy':
                this.energy = Math.min(100, this.energy + effect.value);
                return { type: 'increase_energy', amount: effect.value };

            case 'decrease_energy':
                this.energy = Math.max(0, this.energy - effect.value);
                return { type: 'decrease_energy', amount: effect.value };

            case 'move_random':
                // Move to random nearby position
                const dx = (Math.random() - 0.5) * 40;
                const dy = (Math.random() - 0.5) * 40;
                this.x = Math.max(30, Math.min(canvasWidth - 30, this.x + dx));
                this.y = Math.max(30, Math.min(canvasHeight - 30, this.y + dy));
                return { type: 'move_random' };

            case 'reproduce':
                return this.attemptReproduction(agents, canvasWidth, canvasHeight);

            default:
                return null;
        }
    }

    /**
     * Update agent state (age, energy decay)
     */
    update() {
        this.age++;

        // Energy naturally decays
        this.energy = Math.max(0, this.energy - 0.5);
    }

    /**
     * Check if agent should die
     */
    isDead() {
        return this.energy <= 0;
    }

    /**
     * Clone agent with same purpose network
     */
    clone(newX, newY, newId) {
        const clone = new Agent(newX, newY, newId);

        // Deep copy all purposes
        clone.purposes = {};
        for (let name in this.purposes) {
            clone.purposes[name] = {
                ...this.purposes[name],
                connections: this.purposes[name].connections.map(c => ({...c}))
            };
        }

        clone.previousSaliences = {...this.previousSaliences};
        clone.energy = 50; // Offspring start with half energy

        return clone;
    }

    /**
     * Reset all saliences to equal distribution
     */
    resetSaliences() {
        const purposeCount = Object.keys(this.purposes).length;
        const equalSalience = 1 / purposeCount;

        for (let name in this.purposes) {
            this.purposes[name].salience = equalSalience;
            this.previousSaliences[name] = equalSalience;
        }
    }

    /**
     * Get all purpose names sorted by type (terminals first)
     */
    getPurposesSorted() {
        const purposes = Object.values(this.purposes);
        purposes.sort((a, b) => {
            if (a.type === 'terminal' && b.type !== 'terminal') return -1;
            if (a.type !== 'terminal' && b.type === 'terminal') return 1;
            return a.name.localeCompare(b.name);
        });
        return purposes;
    }
}
