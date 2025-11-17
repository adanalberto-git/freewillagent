# Free Will Agent Designer

An interactive web application for creating and observing agents with fully customizable Dynamic Bayesian Network-based purpose hierarchies, implementing the DeLancey & Gomez (2025) model of purposeful behavior.

## Overview

This application allows you to design agents with hierarchical purpose networks where:

- **Terminal Purposes** (intrinsic goals): SURVIVE, REPRODUCE, THRIVE
- **Instrumental Purposes** (user-defined means to ends): Fully customizable purposes that connect to terminal or other instrumental purposes

## Features

### 1. Agent Creation & Management
- Click "Create Agent" to place agents on the canvas
- Click to select agents
- Drag agents to move them
- Double-click agents to open the Purpose Network Editor
- Manual controls: adjust energy, feed agents, clone agents

### 2. Purpose Network Editor
- **Create New Purposes**: Define custom instrumental purposes (e.g., "Get Food", "Hunt Prey", "Help Neighbor")
- **Configure Connections**: Set which purposes activate which other purposes with probability weights
- **Action Effects**: Define what happens when a purpose is dominant:
  - Increase/decrease energy
  - Move randomly
  - Reproduce
  - Custom behaviors
- **Visual Graph**: Interactive node-and-edge visualization of the purpose network
- **Real-time Salience**: Watch salience values update during simulation

### 3. Simulation
- **Play/Pause**: Control simulation execution
- **Speed Control**: Adjust simulation speed (1-60 turns/second)
- **Step Mode**: Execute single simulation steps
- **Statistics**: Track agent population, average energy, purpose distribution

### 4. Salience Computation
Salience values update each turn based on:
- **Previous Salience** (α = 0.3): Temporal carry-over
- **Observations** (β = 0.4): Environmental factors
- **Activation/Homeostatic** (γ = 0.3):
  - For terminal purposes: homeostatic drives (e.g., low energy → high SURVIVE)
  - For instrumental purposes: activation from connected purposes

### 5. Agent Behavior
Agents execute actions based on their dominant purpose (highest salience):
- **SURVIVE**: Maintain status (conservation)
- **REPRODUCE**: Create offspring (costs 30 energy, requires >70 energy)
- **THRIVE**: Community maintenance
- **Custom Instrumental**: User-defined behaviors (e.g., "Get Food" → gain energy)

## Getting Started

### Running the Application

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
2. Click "Create Agent" to place your first agent
3. Double-click the agent to open the Purpose Network Editor
4. Create custom purposes and connections
5. Click "Play" to start the simulation

### Example: Creating a Foraging Agent

1. Create an agent
2. Double-click to open editor
3. Create new purpose:
   - Name: "Get Food"
   - Type: Instrumental
   - Initial Salience: 0.2
   - Color: Yellow
   - Connects to: SURVIVE (0.9)
   - Action: "Increase energy by 5"
4. Save and close
5. Start simulation
6. Watch as low energy → high SURVIVE salience → activates "Get Food" → agent forages

### Example: Multi-Level Hierarchy

1. Create "Hunt Prey":
   - Connects to: "Get Food" (0.8)
   - Action: "Increase energy by 10"
2. Create "Get Food":
   - Connects to: SURVIVE (0.9)
   - Action: "Increase energy by 5"
3. Hierarchy: Hunt Prey → Get Food → SURVIVE

## File Structure

```
freewillagent/
├── index.html              # Main HTML structure
├── styles.css              # Complete styling
├── agent.js                # Agent class with purpose network
├── purpose-graph.js        # Graph algorithms and utilities
├── canvas-renderer.js      # Canvas rendering for agents
├── graph-visualizer.js     # Graph visualization in modal
├── will-graph-modal.js     # Purpose network editor modal
├── toolbox.js              # Left panel controls and inspector
└── main.js                 # Application coordination and simulation
```

## Key Concepts

### Purpose Types

**Terminal Purposes** (Intrinsic Goals):
- Cannot be deleted
- No outgoing connections
- Driven by homeostatic factors
- Examples: SURVIVE, REPRODUCE, THRIVE

**Instrumental Purposes** (Means to Ends):
- User-defined
- Must connect to at least one other purpose
- Activated by target purposes (top-down)
- Can have custom action effects

### Salience Dynamics

The salience of each purpose represents its current urgency/importance. The agent always acts on the purpose with the highest salience.

**Terminal Purpose Update:**
```
S = α×S_previous + β×observations + γ×homeostatic
```

**Instrumental Purpose Update:**
```
activation = Σ(connected_purpose.salience × edge_probability)
S = α×S_previous + β×observations + γ×activation
```

### Feedback Loops

Example: Energy depletion creates a feedback loop:
1. Energy drops
2. SURVIVE salience increases (homeostatic drive)
3. SURVIVE activates "Get Food" (via connection probability)
4. "Get Food" becomes dominant
5. Agent forages (gains energy)
6. Energy increases
7. SURVIVE salience decreases
8. Cycle continues

## Tips & Tricks

1. **Experiment with probabilities**: Higher probability connections create stronger activation
2. **Multi-level hierarchies**: Create chains like "Hunt" → "Get Food" → SURVIVE
3. **Balanced networks**: Avoid making one purpose too dominant
4. **Watch salience values**: The inspector shows real-time salience updates
5. **Clone successful agents**: Use "Clone Agent" to duplicate well-designed purpose networks
6. **Adjust speed**: Use the speed slider to slow down and observe behavior in detail

## Browser Compatibility

Requires a modern browser with support for:
- HTML5 Canvas
- ES6 JavaScript
- CSS3

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Theoretical Background

This application implements the Dynamic Bayesian Network model of purposeful behavior described in:

DeLancey & Gomez (2025). "Hierarchical Purpose Networks in Autonomous Agents"

Key principles:
- Purposes form a directed graph (DAG or with cycles)
- Salience propagates through the network
- Action selection based on highest salience
- Homeostatic and observational influences
- Temporal carry-over of salience values

## License

This is an educational demonstration of the DeLancey & Gomez (2025) model.

## Author

Created by Adan Gomez
