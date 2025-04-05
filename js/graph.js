/**
 * Graph Visualizer
 * Creates and manages the force-directed graph visualization
 */
class GraphVisualizer {
    constructor(containerId, detailsId) {
        this.containerId = containerId;
        this.detailsId = detailsId;
        this.svg = null;
        this.simulation = null;
        this.nodeElements = null;
        this.linkElements = null;
        this.zoom = null;
        this.width = 0;
        this.height = 0;
        this.data = { nodes: [], links: [] };
        
        // Color scheme for different node types using CSS variables
        this.colorMap = {
            file: getComputedStyle(document.documentElement).getPropertyValue('--file-color').trim(),
            class: getComputedStyle(document.documentElement).getPropertyValue('--class-color').trim(),
            function: getComputedStyle(document.documentElement).getPropertyValue('--function-color').trim(),
            method: getComputedStyle(document.documentElement).getPropertyValue('--method-color').trim(),
            import: getComputedStyle(document.documentElement).getPropertyValue('--import-color').trim(),
            module: getComputedStyle(document.documentElement).getPropertyValue('--module-color').trim()
        };
    }
    
    /**
     * Initialize the graph visualization
     */
    initialize() {
        // Get container dimensions
        const container = document.getElementById(this.containerId);
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        // Set up SVG with zoom behavior
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .classed('responsive-svg', true);
            
        // Create a group for the graph that will be transformed by zoom
        this.g = this.svg.append('g')
            .attr('class', 'graph');
        
        // Set up zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
            
        this.svg.call(this.zoom);
        
        // Set up handlers for the zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-view').addEventListener('click', () => this.resetZoom());
        
        // Add resize handler for responsiveness
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * Handle window resize to make the visualization responsive
     */
    handleResize() {
        const container = document.getElementById(this.containerId);
        
        // Update dimensions
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        // Update viewBox
        this.svg
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);
            
        // Center the graph to fit the new dimensions
        this.centerGraph();
        
        // If simulation is running, restart it to adapt to new dimensions
        if (this.simulation) {
            this.simulation
                .force('center', d3.forceCenter(this.width / 2, this.height / 2))
                .alpha(0.3) // Apply some energy to allow repositioning
                .restart();
        }
    }
    
    /**
     * Create or update the graph with new data
     * @param {Object} data - Graph data with nodes and links
     */
    update(data) {
        if (!this.svg) {
            this.initialize();
        }
        
        this.data = this.preprocessData(data);
        
        // Clear previous graph
        this.g.selectAll('*').remove();
        
        // Create link elements
        this.linkElements = this.g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.data.links)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke-width', d => Math.max(1, Math.sqrt(d.source.size) * 0.2))
            .attr('stroke-opacity', 0.5);
        
        // Add glow filter for nodes
        const defs = this.svg.append('defs');
        
        // Create a filter for the glow effect
        const filter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
            
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '2.5')
            .attr('result', 'coloredBlur');
            
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode')
            .attr('in', 'coloredBlur');
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');
        
        // Create node elements with glow effect
        this.nodeElements = this.g.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(this.data.nodes)
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('r', d => d.size)
            .attr('fill', d => this.colorMap[d.type] || '#999')
            .style('filter', 'url(#glow)')
            .style('stroke', d => d3.color(this.colorMap[d.type]).darker(1))
            .style('stroke-width', 1.5)
            .call(this.drag())
            .on('click', (event, d) => this.showNodeDetails(d));
            
        // Add node labels
        this.labelElements = this.g.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(this.data.nodes)
            .enter()
            .append('text')
            .text(d => d.label)
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('dx', d => d.size + 5)
            .attr('dy', 4);
        
        // Create force simulation
        this.simulation = d3.forceSimulation(this.data.nodes)
            .force('link', d3.forceLink(this.data.links)
                .id(d => d.id)
                .distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 10))
            .on('tick', () => this.ticked());
            
        // Center the graph initially
        this.centerGraph();
    }
    
    /**
     * Preprocess data for D3 force layout
     * @param {Object} data - Raw graph data
     * @returns {Object} - Processed data
     */
    preprocessData(data) {
        // Deep clone the data to avoid modifying the original
        const processedData = {
            nodes: JSON.parse(JSON.stringify(data.nodes)),
            links: JSON.parse(JSON.stringify(data.links))
        };
        
        // Convert link references from ID strings to actual node objects
        // This makes D3's force layout work correctly
        processedData.links.forEach(link => {
            const sourceNode = processedData.nodes.find(node => node.id === link.source);
            const targetNode = processedData.nodes.find(node => node.id === link.target);
            
            if (sourceNode && targetNode) {
                link.source = sourceNode;
                link.target = targetNode;
            }
        });
        
        return processedData;
    }
    
    /**
     * Update positions on each simulation tick
     */
    ticked() {
        this.linkElements
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
            
        this.nodeElements
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
            
        this.labelElements
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    }
    
    /**
     * Set up drag behavior for nodes
     * @returns {d3.drag} - D3 drag behavior
     */
    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }
    
    /**
     * Display details for a selected node
     * @param {Object} node - Node data
     */
    showNodeDetails(node) {
        const detailsContainer = document.getElementById(this.detailsId);
        
        // Count incoming and outgoing connections
        const incoming = this.data.links.filter(link => link.target.id === node.id).length;
        const outgoing = this.data.links.filter(link => link.source.id === node.id).length;
        
        // Highlight the selected node and connected nodes
        this.highlightConnections(node);
        
        // Get the node color
        const nodeColor = this.colorMap[node.type] || '#999';
        
        // Create details HTML with improved styling
        let html = `
            <h3 style="color: ${nodeColor};">${node.label}</h3>
            <div class="node-meta" style="display: flex; justify-content: space-between; background: rgba(40, 40, 40, 0.5); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; color: var(--magenta-primary);">${node.type.charAt(0).toUpperCase() + node.type.slice(1)}</div>
                    <div style="color: var(--text-secondary); font-size: 12px;">Type</div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; color: var(--magenta-primary);">${incoming + outgoing}</div>
                    <div style="color: var(--text-secondary); font-size: 12px;">Connections</div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; color: var(--magenta-primary);">${incoming}</div>
                    <div style="color: var(--text-secondary); font-size: 12px;">Incoming</div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; color: var(--magenta-primary);">${outgoing}</div>
                    <div style="color: var(--text-secondary); font-size: 12px;">Outgoing</div>
                </div>
            </div>
        `;
        
        // Show incoming connections
        if (incoming > 0) {
            html += `<h4>Called By <span style="color: var(--magenta-primary);">(${incoming})</span>:</h4><ul>`;
            this.data.links.filter(link => link.target.id === node.id)
                .sort((a, b) => a.source.label.localeCompare(b.source.label))
                .forEach(link => {
                    const sourceColor = this.colorMap[link.source.type] || '#999';
                    html += `<li><span style="color: ${sourceColor};">${link.source.label}</span> <small>(${link.source.type})</small></li>`;
                });
            html += '</ul>';
        }
        // Show outgoing connections
        if (outgoing > 0) {
            html += `<h4>Calls <span style="color: var(--magenta-primary);">(${outgoing})</span>:</h4><ul>`;
            this.data.links.filter(link => link.source.id === node.id)
                .sort((a, b) => a.target.label.localeCompare(b.target.label))
                .forEach(link => {
                    const targetColor = this.colorMap[link.target.type] || '#999';
                    html += `<li><span style="color: ${targetColor};">${link.target.label}</span> <small>(${link.target.type})</small></li>`;
                });
            html += '</ul>';
        }
        
        // Add a note if there are no connections
        if (incoming === 0 && outgoing === 0) {
            html += `<p style="text-align: center; margin-top: 20px; color: var(--text-secondary);">This ${node.type} has no connections.</p>`;
        }
        
        detailsContainer.innerHTML = html;
    }
    
    
    /**
     * Highlight a node and its connections
     * @param {Object} node - The node to highlight
     */
    highlightConnections(node) {
        // Get magenta color for highlighting
        const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--magenta-primary').trim();
        
        // Reset all nodes and links
        this.nodeElements.attr('opacity', 0.3)
            .style('filter', 'url(#glow)')
            .style('stroke-width', 1.5);
        
        this.linkElements.attr('opacity', 0.1)
            .attr('stroke-width', d => Math.max(1, Math.sqrt(d.source.size) * 0.2));
        
        // Highlight the selected node
        this.nodeElements.filter(d => d.id === node.id)
            .attr('opacity', 1)
            .style('stroke', highlightColor)
            .style('stroke-width', 3)
            .style('filter', 'url(#glow) brightness(1.2)');
        
        // Highlight connected nodes and links
        const connectedNodes = new Set();
        
        // Find incoming connections
        this.data.links.filter(link => link.target.id === node.id)
            .forEach(link => {
                connectedNodes.add(link.source.id);
                this.linkElements.filter(l => l.source.id === link.source.id && l.target.id === link.target.id)
                    .attr('opacity', 1)
                    .attr('stroke', highlightColor)
                    .attr('stroke-width', 2);
            });
            
        // Find outgoing connections
        this.data.links.filter(link => link.source.id === node.id)
            .forEach(link => {
                connectedNodes.add(link.target.id);
                this.linkElements.filter(l => l.source.id === link.source.id && l.target.id === link.target.id)
                    .attr('opacity', 1)
                    .attr('stroke', highlightColor)
                    .attr('stroke-width', 2);
            });
            
        // Highlight connected nodes
        this.nodeElements.filter(d => connectedNodes.has(d.id))
            .attr('opacity', 0.8)
            .style('stroke', d => d3.color(this.colorMap[d.type]).brighter(0.5))
            .style('filter', 'url(#glow) brightness(1.1)');
    }
    
    /**
     * Reset node highlighting
     */
    resetHighlighting() {
        this.nodeElements.attr('opacity', 1)
            .attr('stroke', null)
            .attr('stroke-width', null);
            
        this.linkElements.attr('opacity', 0.6)
            .attr('stroke-width', 1);
    }
    
    /**
     * Center the graph in the viewport
     */
    centerGraph() {
        const transform = d3.zoomIdentity
            .translate(this.width / 2, this.height / 2)
            .scale(0.8);
            
        this.svg.call(this.zoom.transform, transform);
    }
    
    /**
     * Zoom in on the graph
     */
    zoomIn() {
        this.svg.transition().duration(300).call(
            this.zoom.scaleBy, 1.3
        );
    }
    
    /**
     * Zoom out on the graph
     */
    zoomOut() {
        this.svg.transition().duration(300).call(
            this.zoom.scaleBy, 0.7
        );
    }
    
    /**
     * Reset zoom to initial state
     */
    resetZoom() {
        this.centerGraph();
        this.resetHighlighting();
    }
}

// Create a global instance
const graphVisualizer = new GraphVisualizer('visualization', 'node-details');