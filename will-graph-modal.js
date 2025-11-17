/**
 * Will Graph Modal - Handles the purpose network editor modal
 */
class WillGraphModal {
    constructor() {
        this.modal = document.getElementById('willGraphModal');
        this.currentAgent = null;
        this.graphVisualizer = null;
        this.isOpen = false;
        this.hasChanges = false;

        // Store original purposes for cancel functionality
        this.originalPurposes = null;

        this.setupEventListeners();
    }

    /**
     * Initialize the modal (called after DOM is loaded)
     */
    initialize() {
        const graphCanvas = document.getElementById('graphCanvas');
        this.graphVisualizer = new GraphVisualizer(graphCanvas);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close buttons
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.close(false);
        });

        document.getElementById('cancelModalBtn').addEventListener('click', () => {
            this.close(false);
        });

        document.getElementById('saveModalBtn').addEventListener('click', () => {
            this.close(true);
        });

        // Close on overlay click
        this.modal.querySelector('.modal-overlay').addEventListener('click', () => {
            this.close(false);
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close(false);
            }
        });

        // Purpose type radio buttons
        const typeRadios = document.querySelectorAll('input[name="purposeType"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateConnectionsVisibility();
            });
        });

        // Initial salience slider
        document.getElementById('initialSalience').addEventListener('input', (e) => {
            document.getElementById('salienceValue').textContent = parseFloat(e.target.value).toFixed(2);
        });

        // Action type selector
        document.getElementById('actionType').addEventListener('change', (e) => {
            const actionValue = document.getElementById('actionValue');
            const needsValue = ['increase_energy', 'decrease_energy'].includes(e.target.value);
            actionValue.style.display = needsValue ? 'block' : 'none';
        });

        document.getElementById('editActionType').addEventListener('change', (e) => {
            const actionValue = document.getElementById('editActionValue');
            const needsValue = ['increase_energy', 'decrease_energy'].includes(e.target.value);
            actionValue.style.display = needsValue ? 'block' : 'none';
        });

        // Add connection button
        document.getElementById('addConnectionBtn').addEventListener('click', () => {
            this.addConnectionField();
        });

        document.getElementById('addEditConnectionBtn').addEventListener('click', () => {
            this.addEditConnectionField();
        });

        // Create purpose form
        document.getElementById('createPurposeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPurpose();
        });

        // Edit purpose selector
        document.getElementById('editPurposeSelect').addEventListener('change', (e) => {
            this.loadPurposeForEditing(e.target.value);
        });

        // Update purpose button
        document.getElementById('updatePurposeBtn').addEventListener('click', () => {
            this.updatePurpose();
        });

        // Delete purpose button
        document.getElementById('deletePurposeBtn').addEventListener('click', () => {
            this.deletePurpose();
        });
    }

    /**
     * Open modal for an agent
     */
    open(agent) {
        this.currentAgent = agent;
        this.isOpen = true;
        this.hasChanges = false;

        // Store original purposes for cancel
        this.originalPurposes = JSON.parse(JSON.stringify(agent.purposes));

        // Update modal title
        document.getElementById('modalTitle').textContent = `Agent #${agent.id} - Purpose Network Editor`;

        // Populate edit dropdown
        this.populateEditDropdown();

        // Show modal
        this.modal.style.display = 'flex';

        // Reset form
        this.resetCreateForm();

        // Hide edit panel
        document.getElementById('editPurposePanel').style.display = 'none';
        document.getElementById('editPurposeSelect').value = '';

        // Start rendering graph
        this.startGraphRendering();

        // Update salience table
        this.updateSalienceTable();
    }

    /**
     * Close modal
     */
    close(save) {
        if (!save && this.hasChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }

            // Restore original purposes
            this.currentAgent.purposes = this.originalPurposes;
        }

        this.isOpen = false;
        this.modal.style.display = 'none';
        this.stopGraphRendering();
        this.currentAgent = null;
    }

    /**
     * Start rendering graph animation
     */
    startGraphRendering() {
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
        }

        this.renderInterval = setInterval(() => {
            if (this.currentAgent && this.isOpen) {
                this.graphVisualizer.render(this.currentAgent.purposes);
                this.updateSalienceTable();
            }
        }, 1000 / 30); // 30 FPS
    }

    /**
     * Stop rendering graph
     */
    stopGraphRendering() {
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
        }
    }

    /**
     * Update connections visibility based on purpose type
     */
    updateConnectionsVisibility() {
        const type = document.querySelector('input[name="purposeType"]:checked').value;
        const connectionsGroup = document.getElementById('connectionsGroup');
        connectionsGroup.style.display = type === 'instrumental' ? 'block' : 'none';
    }

    /**
     * Reset create form
     */
    resetCreateForm() {
        document.getElementById('createPurposeForm').reset();
        document.getElementById('salienceValue').textContent = '0.30';
        document.getElementById('connectionsList').innerHTML = '';
        document.getElementById('actionValue').style.display = 'none';
        this.updateConnectionsVisibility();
        this.addConnectionField(); // Add one empty connection field
    }

    /**
     * Add connection field to create form
     */
    addConnectionField() {
        const container = document.getElementById('connectionsList');

        const item = document.createElement('div');
        item.className = 'connection-item';

        const select = document.createElement('select');
        select.className = 'connection-target';
        select.innerHTML = '<option value="">-- Select target --</option>';

        // Add all existing purposes as options
        for (let name in this.currentAgent.purposes) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }

        const probLabel = document.createElement('label');
        probLabel.textContent = 'Probability: ';
        probLabel.className = 'connection-label';

        const probSlider = document.createElement('input');
        probSlider.type = 'range';
        probSlider.min = '0';
        probSlider.max = '1';
        probSlider.step = '0.01';
        probSlider.value = '0.8';
        probSlider.className = 'slider';

        const probValue = document.createElement('span');
        probValue.textContent = '0.80';

        probSlider.addEventListener('input', () => {
            probValue.textContent = parseFloat(probSlider.value).toFixed(2);
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-small btn-danger';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
            item.remove();
        });

        const row = document.createElement('div');
        row.className = 'connection-row';
        row.appendChild(select);
        row.appendChild(removeBtn);

        const probRow = document.createElement('div');
        probRow.className = 'connection-row';
        probRow.appendChild(probLabel);
        probRow.appendChild(probSlider);
        probRow.appendChild(probValue);

        item.appendChild(row);
        item.appendChild(probRow);
        container.appendChild(item);
    }

    /**
     * Create new purpose
     */
    createPurpose() {
        const name = document.getElementById('purposeName').value.trim();
        const type = document.querySelector('input[name="purposeType"]:checked').value;
        const salience = parseFloat(document.getElementById('initialSalience').value);
        const color = document.getElementById('purposeColor').value;
        const actionType = document.getElementById('actionType').value;
        const actionValue = parseInt(document.getElementById('actionValue').value) || 5;

        // Validation
        if (!name) {
            alert('Purpose name is required');
            return;
        }

        if (this.currentAgent.purposes[name]) {
            alert(`Purpose '${name}' already exists`);
            return;
        }

        // Get connections
        const connections = [];
        if (type === 'instrumental') {
            const connectionItems = document.querySelectorAll('#connectionsList .connection-item');
            connectionItems.forEach(item => {
                const target = item.querySelector('.connection-target').value;
                const probability = parseFloat(item.querySelector('input[type="range"]').value);

                if (target) {
                    connections.push({ target, probability });
                }
            });

            if (connections.length === 0) {
                alert('Instrumental purposes must have at least one connection');
                return;
            }
        }

        // Build action effect
        let actionEffect = null;
        if (actionType !== 'none') {
            actionEffect = {
                type: actionType,
                value: actionValue
            };
        }

        // Create purpose
        try {
            this.currentAgent.addPurpose(name, type, salience, color, connections, actionEffect);
            this.hasChanges = true;

            // Reset form
            this.resetCreateForm();

            // Update UI
            this.populateEditDropdown();

            // Show success message
            alert(`Purpose '${name}' created successfully!`);

        } catch (error) {
            alert('Error creating purpose: ' + error.message);
        }
    }

    /**
     * Populate edit purpose dropdown
     */
    populateEditDropdown() {
        const select = document.getElementById('editPurposeSelect');
        select.innerHTML = '<option value="">-- Select a purpose --</option>';

        for (let name in this.currentAgent.purposes) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    }

    /**
     * Load purpose for editing
     */
    loadPurposeForEditing(purposeName) {
        const panel = document.getElementById('editPurposePanel');

        if (!purposeName) {
            panel.style.display = 'none';
            return;
        }

        const purpose = this.currentAgent.purposes[purposeName];
        if (!purpose) return;

        panel.style.display = 'block';

        // Populate fields
        document.getElementById('editPurposeName').value = purpose.name;
        document.getElementById('editPurposeType').textContent = purpose.type === 'terminal' ? 'Terminal' : 'Instrumental';
        document.getElementById('editPurposeSalience').textContent = purpose.salience.toFixed(2);
        document.getElementById('editPurposeColor').value = purpose.color;

        // Action effect
        if (purpose.actionEffect) {
            document.getElementById('editActionType').value = purpose.actionEffect.type;
            document.getElementById('editActionValue').value = purpose.actionEffect.value || 5;
            document.getElementById('editActionValue').style.display = ['increase_energy', 'decrease_energy'].includes(purpose.actionEffect.type) ? 'block' : 'none';
        } else {
            document.getElementById('editActionType').value = 'none';
            document.getElementById('editActionValue').style.display = 'none';
        }

        // Connections
        const connectionsGroup = document.getElementById('editConnectionsGroup');
        const connectionsList = document.getElementById('editConnectionsList');

        if (purpose.type === 'instrumental') {
            connectionsGroup.style.display = 'block';
            connectionsList.innerHTML = '';

            purpose.connections.forEach(conn => {
                this.addEditConnectionField(conn);
            });
        } else {
            connectionsGroup.style.display = 'none';
        }

        // Disable delete for terminal purposes
        const deleteBtn = document.getElementById('deletePurposeBtn');
        deleteBtn.disabled = purpose.type === 'terminal';
        deleteBtn.title = purpose.type === 'terminal' ? 'Terminal purposes cannot be deleted' : '';
    }

    /**
     * Add connection field to edit form
     */
    addEditConnectionField(existingConn = null) {
        const container = document.getElementById('editConnectionsList');

        const item = document.createElement('div');
        item.className = 'connection-item';

        const select = document.createElement('select');
        select.className = 'connection-target';
        select.innerHTML = '<option value="">-- Select target --</option>';

        // Add all existing purposes as options
        for (let name in this.currentAgent.purposes) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            if (existingConn && existingConn.target === name) {
                option.selected = true;
            }
            select.appendChild(option);
        }

        const probLabel = document.createElement('label');
        probLabel.textContent = 'Probability: ';
        probLabel.className = 'connection-label';

        const probSlider = document.createElement('input');
        probSlider.type = 'range';
        probSlider.min = '0';
        probSlider.max = '1';
        probSlider.step = '0.01';
        probSlider.value = existingConn ? existingConn.probability.toString() : '0.8';
        probSlider.className = 'slider';

        const probValue = document.createElement('span');
        probValue.textContent = parseFloat(probSlider.value).toFixed(2);

        probSlider.addEventListener('input', () => {
            probValue.textContent = parseFloat(probSlider.value).toFixed(2);
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-small btn-danger';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
            item.remove();
        });

        const row = document.createElement('div');
        row.className = 'connection-row';
        row.appendChild(select);
        row.appendChild(removeBtn);

        const probRow = document.createElement('div');
        probRow.className = 'connection-row';
        probRow.appendChild(probLabel);
        probRow.appendChild(probSlider);
        probRow.appendChild(probValue);

        item.appendChild(row);
        item.appendChild(probRow);
        container.appendChild(item);
    }

    /**
     * Update existing purpose
     */
    updatePurpose() {
        const select = document.getElementById('editPurposeSelect');
        const oldName = select.value;

        if (!oldName) return;

        const purpose = this.currentAgent.purposes[oldName];
        const newName = document.getElementById('editPurposeName').value.trim();
        const color = document.getElementById('editPurposeColor').value;
        const actionType = document.getElementById('editActionType').value;
        const actionValue = parseInt(document.getElementById('editActionValue').value) || 5;

        // Validation
        if (!newName) {
            alert('Purpose name is required');
            return;
        }

        if (newName !== oldName && this.currentAgent.purposes[newName]) {
            alert(`Purpose '${newName}' already exists`);
            return;
        }

        // Get connections if instrumental
        let connections = [];
        if (purpose.type === 'instrumental') {
            const connectionItems = document.querySelectorAll('#editConnectionsList .connection-item');
            connectionItems.forEach(item => {
                const target = item.querySelector('.connection-target').value;
                const probability = parseFloat(item.querySelector('input[type="range"]').value);

                if (target) {
                    connections.push({ target, probability });
                }
            });

            if (connections.length === 0) {
                alert('Instrumental purposes must have at least one connection');
                return;
            }
        }

        // Build action effect
        let actionEffect = null;
        if (actionType !== 'none') {
            actionEffect = {
                type: actionType,
                value: actionValue
            };
        }

        try {
            // Update purpose
            purpose.color = color;
            purpose.connections = connections;
            purpose.actionEffect = actionEffect;

            // Handle name change
            if (newName !== oldName) {
                // Create new purpose with new name
                this.currentAgent.purposes[newName] = purpose;
                purpose.name = newName;
                delete this.currentAgent.purposes[oldName];

                // Update connections that pointed to old name
                for (let purposeName in this.currentAgent.purposes) {
                    const p = this.currentAgent.purposes[purposeName];
                    if (p.connections) {
                        p.connections.forEach(conn => {
                            if (conn.target === oldName) {
                                conn.target = newName;
                            }
                        });
                    }
                }
            }

            this.hasChanges = true;

            // Update UI
            this.populateEditDropdown();
            document.getElementById('editPurposeSelect').value = newName;

            alert(`Purpose '${newName}' updated successfully!`);

        } catch (error) {
            alert('Error updating purpose: ' + error.message);
        }
    }

    /**
     * Delete purpose
     */
    deletePurpose() {
        const select = document.getElementById('editPurposeSelect');
        const purposeName = select.value;

        if (!purposeName) return;

        const purpose = this.currentAgent.purposes[purposeName];

        if (purpose.type === 'terminal') {
            alert('Cannot delete terminal purposes');
            return;
        }

        // Check if other purposes connect to this
        const incoming = PurposeGraph.getIncomingConnections(purposeName, this.currentAgent.purposes);
        if (incoming.length > 0) {
            const msg = `Warning: The following purposes connect to '${purposeName}':\n` +
                incoming.map(c => `- ${c.source}`).join('\n') +
                '\n\nThese connections will be removed. Continue?';

            if (!confirm(msg)) {
                return;
            }
        }

        if (!confirm(`Delete purpose '${purposeName}'?`)) {
            return;
        }

        try {
            this.currentAgent.removePurpose(purposeName);
            this.hasChanges = true;

            // Update UI
            this.populateEditDropdown();
            document.getElementById('editPurposePanel').style.display = 'none';

            alert(`Purpose '${purposeName}' deleted successfully!`);

        } catch (error) {
            alert('Error deleting purpose: ' + error.message);
        }
    }

    /**
     * Update salience table
     */
    updateSalienceTable() {
        if (!this.currentAgent) return;

        const tbody = document.getElementById('modalSalienceBody');
        tbody.innerHTML = '';

        const purposes = this.currentAgent.getPurposesSorted();
        const dominant = this.currentAgent.getDominantPurpose();

        purposes.forEach(purpose => {
            const row = document.createElement('tr');
            if (purpose.name === dominant) {
                row.className = 'dominant-row';
            }

            row.innerHTML = `
                <td>${purpose.name}</td>
                <td>${purpose.type === 'terminal' ? 'Terminal' : 'Instrumental'}</td>
                <td>${Math.round(purpose.salience * 100)}%</td>
                <td>${purpose.name === dominant ? '<span class="dominant-star">★ YES</span>' : ''}</td>
            `;

            tbody.appendChild(row);
        });
    }
}
