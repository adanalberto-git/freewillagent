/**
 * Purpose Graph utilities for analyzing and manipulating purpose networks
 */
class PurposeGraph {
    /**
     * Detect cycles in purpose network
     */
    static detectCycles(purposes) {
        const visited = new Set();
        const recursionStack = new Set();

        const hasCycleDFS = (purposeName) => {
            visited.add(purposeName);
            recursionStack.add(purposeName);

            const purpose = purposes[purposeName];
            if (purpose && purpose.connections) {
                for (let conn of purpose.connections) {
                    if (!visited.has(conn.target)) {
                        if (hasCycleDFS(conn.target)) {
                            return true;
                        }
                    } else if (recursionStack.has(conn.target)) {
                        return true;
                    }
                }
            }

            recursionStack.delete(purposeName);
            return false;
        };

        for (let purposeName in purposes) {
            if (!visited.has(purposeName)) {
                if (hasCycleDFS(purposeName)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get topological sort of purposes (for ordered salience computation)
     * Returns null if cycle detected
     */
    static topologicalSort(purposes) {
        const inDegree = {};
        const adjList = {};

        // Initialize
        for (let name in purposes) {
            inDegree[name] = 0;
            adjList[name] = [];
        }

        // Build graph
        for (let name in purposes) {
            const purpose = purposes[name];
            if (purpose.connections) {
                for (let conn of purpose.connections) {
                    adjList[name].push(conn.target);
                    inDegree[conn.target]++;
                }
            }
        }

        // Kahn's algorithm
        const queue = [];
        for (let name in inDegree) {
            if (inDegree[name] === 0) {
                queue.push(name);
            }
        }

        const sorted = [];
        while (queue.length > 0) {
            const current = queue.shift();
            sorted.push(current);

            for (let neighbor of adjList[current]) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) {
                    queue.push(neighbor);
                }
            }
        }

        // If sorted length !== number of purposes, there's a cycle
        if (sorted.length !== Object.keys(purposes).length) {
            return null;
        }

        return sorted;
    }

    /**
     * Compute hierarchical layout for graph visualization
     * Returns object with positions for each purpose node
     */
    static computeHierarchicalLayout(purposes, width, height) {
        const positions = {};
        const layers = this.computeLayers(purposes);

        const layerHeight = height / (layers.length + 1);

        layers.forEach((layer, layerIndex) => {
            const y = height - (layerIndex + 1) * layerHeight;
            const layerWidth = width - 100; // Padding
            const nodeSpacing = layerWidth / (layer.length + 1);

            layer.forEach((purposeName, index) => {
                positions[purposeName] = {
                    x: 50 + (index + 1) * nodeSpacing,
                    y: y
                };
            });
        });

        return positions;
    }

    /**
     * Compute layers for hierarchical layout
     * Layer 0 = terminal purposes (bottom)
     * Layer N = purposes that connect only to purposes in layer < N
     */
    static computeLayers(purposes) {
        const layers = [];
        const layerMap = {};

        // Layer 0: Terminal purposes
        const terminals = [];
        for (let name in purposes) {
            if (purposes[name].type === 'terminal') {
                terminals.push(name);
                layerMap[name] = 0;
            }
        }
        layers.push(terminals);

        // Compute layers for instrumental purposes
        let changed = true;
        let maxIterations = 100;
        let iteration = 0;

        while (changed && iteration < maxIterations) {
            changed = false;
            iteration++;

            for (let name in purposes) {
                if (layerMap[name] !== undefined) continue; // Already assigned

                const purpose = purposes[name];
                if (!purpose.connections || purpose.connections.length === 0) continue;

                // Check if all targets have been assigned layers
                let allTargetsAssigned = true;
                let maxTargetLayer = -1;

                for (let conn of purpose.connections) {
                    if (layerMap[conn.target] === undefined) {
                        allTargetsAssigned = false;
                        break;
                    }
                    maxTargetLayer = Math.max(maxTargetLayer, layerMap[conn.target]);
                }

                if (allTargetsAssigned) {
                    const layer = maxTargetLayer + 1;
                    layerMap[name] = layer;

                    // Add to layers array
                    while (layers.length <= layer) {
                        layers.push([]);
                    }
                    layers[layer].push(name);
                    changed = true;
                }
            }
        }

        // Reverse layers so terminals are at bottom (layer 0 at bottom)
        return layers.reverse();
    }

    /**
     * Get incoming connections for a purpose
     */
    static getIncomingConnections(purposeName, purposes) {
        const incoming = [];

        for (let name in purposes) {
            const purpose = purposes[name];
            if (purpose.connections) {
                for (let conn of purpose.connections) {
                    if (conn.target === purposeName) {
                        incoming.push({
                            source: name,
                            probability: conn.probability
                        });
                    }
                }
            }
        }

        return incoming;
    }

    /**
     * Validate purpose network structure
     */
    static validate(purposes) {
        const errors = [];

        // Check for instrumental purposes without connections
        for (let name in purposes) {
            const purpose = purposes[name];

            if (purpose.type === 'instrumental') {
                if (!purpose.connections || purpose.connections.length === 0) {
                    errors.push(`Instrumental purpose '${name}' has no connections`);
                }
            }

            if (purpose.type === 'terminal') {
                if (purpose.connections && purpose.connections.length > 0) {
                    errors.push(`Terminal purpose '${name}' cannot have outgoing connections`);
                }
            }

            // Check for invalid connection targets
            if (purpose.connections) {
                for (let conn of purpose.connections) {
                    if (!purposes[conn.target]) {
                        errors.push(`Purpose '${name}' connects to non-existent purpose '${conn.target}'`);
                    }

                    if (conn.probability < 0 || conn.probability > 1) {
                        errors.push(`Connection from '${name}' to '${conn.target}' has invalid probability: ${conn.probability}`);
                    }
                }
            }
        }

        return errors;
    }

    /**
     * Generate random color for new purposes
     */
    static generateRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 60 + Math.floor(Math.random() * 20); // 60-80%
        const lightness = 60 + Math.floor(Math.random() * 15); // 60-75%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    /**
     * Convert HSL to RGB hex
     */
    static hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }
}
