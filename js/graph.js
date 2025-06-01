/**
 * Enhanced Graph Visualizer
 * Creates and manages advanced force-directed graph visualizations
 */
class GraphVisualizer {
    constructor(containerId, detailsId) {
        this.containerId = containerId;
        this.detailsId = detailsId;
        this.svg = null;
        this.simulation = null;
        this.nodeElements = null;
        this.linkElements = null;
        this.labelElements = null;
        this.zoom = null;
        this.width = 0;
        this.height = 0;
        this.data = { nodes: [], links: [] };
        this.filteredData = { nodes: [], links: [] };
        this.selectedNode = null;
        this.hoveredNode = null;
        
        // Layout modes
        this.layoutMode = 'force'; // force, hierarchical, circular, radial
        
        // View settings
        this.showLabels = true;
        this.showMetrics = false;
        this.colorBy = 'type'; // type, complexity, quality, connections
        this.nodeFilters = new Set(['file', 'class', 'function', 'method', 'import', 'module', 'todo']);
        
        // Search functionality
        this.searchQuery = '';
        this.searchResults = [];
        
        // Color schemes
        this.colorSchemes = {
            type: {
                file: '#3498db',
                class: '#e74c3c',
                function: '#2ecc71',
                method: '#9b59b6',
                import: '#f39c12',
                module: '#1abc9c',
                todo: '#e67e22'
            },
            complexity: {
                scale: d3.scaleSequential(d3.interpolateRdYlGn).domain([20, 1]),
                fallback: '#999999'
            },
            quality: {
                scale: d3.scaleSequential(d3.interpolateRdYlGn).domain([0, 100]),
                fallback: '#999999'
            },
            connections: {
                scale: d3.scaleSequential(d3.interpolateBlues).domain([0, 20]),
                fallback: '#999999'
            }
        };
        
        // Initialize color map from CSS variables
        this.updateColorMap();
        
        // Tooltip
        this.tooltip = null;
        this.initTooltip();
        
        // Minimap
        this.minimap = null;
        this.minimapScale = 0.1;
    }
    
    /**
     * Update color map from CSS variables
     */
    updateColorMap() {
        const root = document.documentElement;
        this.colorSchemes.type = {
            file: getComputedStyle(root).getPropertyValue('--file-color').trim(),
            class: getComputedStyle(root).getPropertyValue('--class-color').trim(),
            function: getComputedStyle(root).getPropertyValue('--function-color').trim(),
            method: getComputedStyle(root).getPropertyValue('--method-color').trim(),
            import: getComputedStyle(root).getPropertyValue('--import-color').trim(),
            module: getComputedStyle(root).getPropertyValue('--module-color').trim(),
            todo: '#e67e22'
        };
    }
    
    /**
     * Initialize tooltip
     */
    initTooltip() {
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'graph-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('max-width', '300px')
            .style('box-shadow', '0 2px 10px rgba(0, 0, 0, 0.3)');
    }
    
    /**
     * Initialize the graph visualization
     */
    initialize() {
        const container = document.getElementById(this.containerId);
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        // Main SVG
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .classed('responsive-svg', true);
        
        // Add arrow markers for directed edges
        const defs = this.svg.append('defs');
        
        // Define arrow markers
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('xoverflow', 'visible')
            .append('path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#555')
            .style('stroke', 'none');
        
        // Add filters
        this.createFilters(defs);
        
        // Create main group
        this.g = this.svg.append('g')
            .attr('class', 'graph');
        
        // Set up zoom
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
                this.updateMinimapViewport(event.transform);
            });
        
        this.svg.call(this.zoom);
        
        // Set up controls
        this.setupControls();
        
        // Initialize minimap
        this.initMinimap();
        
        // Add resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
    }
    
    /**
     * Create SVG filters
     */
    createFilters(defs) {
        // Glow filter
        const glow = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        
        glow.append('feGaussianBlur')
            .attr('stdDeviation', '2.5')
            .attr('result', 'coloredBlur');
        
        const feMerge = glow.append('feMerge');
        feMerge.append('feMergeNode')
            .attr('in', 'coloredBlur');
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');
        
        // Drop shadow filter
        const shadow = defs.append('filter')
            .attr('id', 'shadow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        
        shadow.append('feDropShadow')
            .attr('dx', '2')
            .attr('dy', '2')
            .attr('stdDeviation', '3')
            .attr('flood-opacity', '0.3');
    }
    
    /**
     * Set up control handlers
     */
    setupControls() {
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-view').addEventListener('click', () => this.resetZoom());
    }
    
    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'f':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.focusSearch();
                    }
                    break;
                case 'l':
                    this.toggleLabels();
                    break;
                case 'm':
                    this.toggleMetrics();
                    break;
                case 'Escape':
                    this.clearSelection();
                    break;
                case '+':
                case '=':
                    this.zoomIn();
                    break;
                case '-':
                    this.zoomOut();
                    break;
                case '0':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.resetZoom();
                    }
                    break;
            }
        });
    }
    
    /**
     * Initialize minimap
     */
    initMinimap() {
        const minimapContainer = d3.select(`#${this.containerId}`)
            .append('div')
            .attr('class', 'minimap-container')
            .style('position', 'absolute')
            .style('bottom', '10px')
            .style('right', '10px')
            .style('width', '150px')
            .style('height', '150px')
            .style('background', 'rgba(0, 0, 0, 0.7)')
            .style('border', '1px solid #333')
            .style('border-radius', '5px')
            .style('overflow', 'hidden');
        
        this.minimap = minimapContainer.append('svg')
            .attr('width', '150')
            .attr('height', '150');
        
        this.minimapG = this.minimap.append('g')
            .attr('transform', `scale(${this.minimapScale})`);
        
        // Viewport indicator
        this.minimapViewport = this.minimap.append('rect')
            .attr('class', 'minimap-viewport')
            .style('fill', 'none')
            .style('stroke', '#e83e8c')
            .style('stroke-width', '2')
            .style('opacity', '0.5');
    }
    
    /**
     * Update minimap viewport indicator
     */
    updateMinimapViewport(transform) {
        if (!this.minimapViewport) return;
        
        const scale = transform.k;
        const x = -transform.x / scale;
        const y = -transform.y / scale;
        const width = this.width / scale;
        const height = this.height / scale;
        
        this.minimapViewport
            .attr('x', x * this.minimapScale)
            .attr('y', y * this.minimapScale)
            .attr('width', width * this.minimapScale)
            .attr('height', height * this.minimapScale);
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        const container = document.getElementById(this.containerId);
        
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
        
        if (this.layoutMode === 'force') {
            this.centerGraph();
            
            if (this.simulation) {
                this.simulation
                    .force('center', d3.forceCenter(this.width / 2, this.height / 2))
                    .alpha(0.3)
                    .restart();
            }
        } else {
            this.applyLayout();
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
        this.applyFilters();
        this.render();
        
        // Add search functionality
        this.setupSearch();
        
        // Add filter controls
        this.setupFilterControls();
        
        // Add layout controls
        this.setupLayoutControls();
        
        // Add color controls
        this.setupColorControls();
        
        // Update minimap
        this.updateMinimap();
        
        // Dispatch event that graph has been updated
        document.dispatchEvent(new CustomEvent('graphUpdated'));
    }
    
    /**
     * Preprocess data for visualization
     */
    preprocessData(data) {
        const processedData = {
            nodes: JSON.parse(JSON.stringify(data.nodes)),
            links: JSON.parse(JSON.stringify(data.links)),
            metrics: data.metrics || {}
        };
        
        // Calculate additional node properties
        const linkCounts = {};
        processedData.links.forEach(link => {
            linkCounts[link.source] = (linkCounts[link.source] || 0) + 1;
            linkCounts[link.target] = (linkCounts[link.target] || 0) + 1;
        });
        
        processedData.nodes.forEach(node => {
            node.connections = linkCounts[node.id] || 0;
            
            // Extract numeric metrics for color scales
            if (node.type === 'file' && node.metrics) {
                node.complexity = node.metrics.cyclomatic_complexity || 1;
                node.quality = node.quality_score || node.metrics.quality_score || 50;
            } else if (node.type === 'class' || node.type === 'function' || node.type === 'method') {
                node.complexity = node.complexity || 1;
                node.quality = node.has_docstring ? 80 : 40;
            } else {
                node.complexity = 1;
                node.quality = 50;
            }
        });
        
        // Convert link references
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
     * Apply filters to the data
     */
    applyFilters() {
        // Filter nodes by type
        this.filteredData.nodes = this.data.nodes.filter(node => 
            this.nodeFilters.has(node.type)
        );
        
        // Filter links to only include those between visible nodes
        const visibleNodeIds = new Set(this.filteredData.nodes.map(n => n.id));
        this.filteredData.links = this.data.links.filter(link => 
            visibleNodeIds.has(link.source.id) && visibleNodeIds.has(link.target.id)
        );
        
        // Apply search filter if active
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            this.searchResults = this.filteredData.nodes.filter(node =>
                node.label.toLowerCase().includes(query) ||
                node.id.toLowerCase().includes(query)
            );
            
            if (this.searchResults.length > 0) {
                const resultIds = new Set(this.searchResults.map(n => n.id));
                
                // Highlight search results
                this.filteredData.nodes.forEach(node => {
                    node.searchMatch = resultIds.has(node.id);
                });
            }
        }
    }
    
    /**
     * Render the graph
     */
    render() {
        // Clear previous graph
        this.g.selectAll('*').remove();
        
        // If switching to force layout, ensure no fixed positions
        if (this.layoutMode === 'force') {
            this.filteredData.nodes.forEach(node => {
                delete node.fx;
                delete node.fy;
            });
        }
        
        // Create link elements
        this.linkElements = this.g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.filteredData.links)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke-width', d => Math.max(1, Math.sqrt(d.source.size) * 0.2))
            .attr('stroke-opacity', 0.5)
            .attr('marker-end', 'url(#arrowhead)');
        
        // Create node elements
        this.nodeElements = this.g.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(this.filteredData.nodes)
            .enter()
            .append('circle')
            .attr('class', d => `node node-${d.type}`)
            .attr('r', d => d.size)
            .attr('fill', d => this.getNodeColor(d))
            .style('filter', d => d.searchMatch ? 'url(#glow) brightness(1.5)' : 'url(#glow)')
            .style('stroke', d => d.searchMatch ? '#fff' : d3.color(this.getNodeColor(d)).darker(1))
            .style('stroke-width', d => d.searchMatch ? 3 : 1.5)
            .style('cursor', 'pointer')
            .call(this.drag())
            .on('click', (event, d) => this.selectNode(d))
            .on('mouseover', (event, d) => this.handleNodeHover(d, event))
            .on('mouseout', () => this.handleNodeHoverOut());
        
        // Create labels
        if (this.showLabels) {
            this.labelElements = this.g.append('g')
                .attr('class', 'labels')
                .selectAll('text')
                .data(this.filteredData.nodes)
                .enter()
                .append('text')
                .text(d => this.showMetrics ? this.getNodeMetricLabel(d) : d.label)
                .attr('fill', 'white')
                .attr('font-size', d => d.size > 10 ? '10px' : '8px')
                .attr('dx', d => d.size + 5)
                .attr('dy', 4)
                .style('pointer-events', 'none')
                .style('opacity', 0.8);
        }
        
        // Apply layout
        this.applyLayout();
    }
    
    /**
     * Get node color based on current color scheme
     */
    getNodeColor(node) {
        switch(this.colorBy) {
            case 'type':
                return this.colorSchemes.type[node.type] || '#999';
            case 'complexity':
                return this.colorSchemes.complexity.scale(node.complexity);
            case 'quality':
                return this.colorSchemes.quality.scale(node.quality);
            case 'connections':
                return this.colorSchemes.connections.scale(node.connections);
            default:
                return this.colorSchemes.type[node.type] || '#999';
        }
    }
    
    /**
     * Get node metric label
     */
    getNodeMetricLabel(node) {
        switch(this.colorBy) {
            case 'complexity':
                return `${node.label} (${node.complexity})`;
            case 'quality':
                return `${node.label} (${node.quality}%)`;
            case 'connections':
                return `${node.label} (${node.connections})`;
            default:
                return node.label;
        }
    }
    
    /**
     * Apply the selected layout
     */
    applyLayout() {
        // Clear any existing fixed positions when switching layouts
        if (this.layoutMode === 'force') {
            // For force layout, clear all fixed positions
            this.filteredData.nodes.forEach(node => {
                delete node.fx;
                delete node.fy;
            });
        }
        
        switch(this.layoutMode) {
            case 'force':
                this.applyForceLayout();
                break;
            case 'hierarchical':
                this.applyHierarchicalLayout();
                break;
            case 'circular':
                this.applyCircularLayout();
                break;
            case 'radial':
                this.applyRadialLayout();
                break;
        }
    }
    
    /**
     * Apply force-directed layout
     */
    applyForceLayout() {
        // Stop any existing simulation
        if (this.simulation) {
            this.simulation.stop();
        }
        
        // Clear all fixed positions to allow free movement
        this.filteredData.nodes.forEach(node => {
            delete node.fx;
            delete node.fy;
        });
        
        // Create new simulation
        this.simulation = d3.forceSimulation(this.filteredData.nodes)
            .force('link', d3.forceLink(this.filteredData.links)
                .id(d => d.id)
                .distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 10))
            .on('tick', () => this.ticked());
        
        // Reheat the simulation to ensure movement
        this.simulation.alpha(1).restart();
    }
    
    /**
     * Apply hierarchical layout
     */
    applyHierarchicalLayout() {
        // Stop and clean up force simulation
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        
        // Create hierarchy from file nodes
        const roots = this.filteredData.nodes.filter(n => n.type === 'file');
        const levels = this.calculateHierarchyLevels();
        
        const yScale = d3.scaleLinear()
            .domain([0, Math.max(...Object.values(levels))])
            .range([50, this.height - 50]);
        
        const xGroups = {};
        Object.entries(levels).forEach(([nodeId, level]) => {
            if (!xGroups[level]) xGroups[level] = [];
            xGroups[level].push(nodeId);
        });
        
        // Position nodes
        Object.entries(xGroups).forEach(([level, nodeIds]) => {
            const xScale = d3.scaleLinear()
                .domain([0, nodeIds.length - 1])
                .range([50, this.width - 50]);
            
            nodeIds.forEach((nodeId, i) => {
                const node = this.filteredData.nodes.find(n => n.id === nodeId);
                if (node) {
                    node.x = xScale(i);
                    node.y = yScale(parseInt(level));
                    node.fx = node.x;
                    node.fy = node.y;
                }
            });
        });
        
        this.ticked();
    }
    
    /**
     * Apply circular layout
     */
    applyCircularLayout() {
        // Stop and clean up force simulation
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        
        const radius = Math.min(this.width, this.height) / 2 - 100;
        const angleScale = d3.scaleLinear()
            .domain([0, this.filteredData.nodes.length])
            .range([0, 2 * Math.PI]);
        
        this.filteredData.nodes.forEach((node, i) => {
            const angle = angleScale(i);
            node.x = this.width / 2 + radius * Math.cos(angle);
            node.y = this.height / 2 + radius * Math.sin(angle);
            node.fx = node.x;
            node.fy = node.y;
        });
        
        this.ticked();
    }
    
    /**
     * Apply radial layout
     */
    applyRadialLayout() {
        // Stop and clean up force simulation
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        
        // Group nodes by type
        const groups = d3.group(this.filteredData.nodes, d => d.type);
        const types = Array.from(groups.keys());
        const angleScale = d3.scaleLinear()
            .domain([0, types.length])
            .range([0, 2 * Math.PI]);
        
        types.forEach((type, typeIndex) => {
            const typeNodes = groups.get(type);
            const typeAngle = angleScale(typeIndex);
            const typeRadius = 200;
            
            typeNodes.forEach((node, nodeIndex) => {
                const nodeAngle = typeAngle + (nodeIndex / typeNodes.length) * (2 * Math.PI / types.length);
                const nodeRadius = typeRadius + (nodeIndex % 3) * 50;
                
                node.x = this.width / 2 + nodeRadius * Math.cos(nodeAngle);
                node.y = this.height / 2 + nodeRadius * Math.sin(nodeAngle);
                node.fx = node.x;
                node.fy = node.y;
            });
        });
        
        this.ticked();
    }
    
    /**
     * Calculate hierarchy levels for nodes
     */
    calculateHierarchyLevels() {
        const levels = {};
        const visited = new Set();
        
        // Start with file nodes at level 0
        this.filteredData.nodes.filter(n => n.type === 'file').forEach(node => {
            levels[node.id] = 0;
            visited.add(node.id);
        });
        
        // BFS to assign levels
        let currentLevel = 0;
        while (visited.size < this.filteredData.nodes.length) {
            const currentLevelNodes = Object.entries(levels)
                .filter(([id, level]) => level === currentLevel)
                .map(([id]) => id);
            
            if (currentLevelNodes.length === 0) break;
            
            currentLevelNodes.forEach(nodeId => {
                this.filteredData.links.forEach(link => {
                    if (link.source.id === nodeId && !visited.has(link.target.id)) {
                        levels[link.target.id] = currentLevel + 1;
                        visited.add(link.target.id);
                    }
                });
            });
            
            currentLevel++;
        }
        
        // Assign remaining nodes
        this.filteredData.nodes.forEach(node => {
            if (!levels[node.id]) {
                levels[node.id] = currentLevel;
            }
        });
        
        return levels;
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
        
        if (this.labelElements) {
            this.labelElements
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        }
        
        // Update minimap
        this.updateMinimap();
    }
    
    /**
     * Update minimap
     */
    updateMinimap() {
        if (!this.minimapG) return;
        
        // Clear previous minimap
        this.minimapG.selectAll('*').remove();
        
        // Draw links
        this.minimapG.append('g')
            .selectAll('line')
            .data(this.filteredData.links)
            .enter()
            .append('line')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .style('stroke', '#555')
            .style('stroke-width', 1)
            .style('stroke-opacity', 0.3);
        
        // Draw nodes
        this.minimapG.append('g')
            .selectAll('circle')
            .data(this.filteredData.nodes)
            .enter()
            .append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.size * 0.5)
            .style('fill', d => this.getNodeColor(d))
            .style('opacity', 0.8);
    }
    
    /**
     * Set up drag behavior for nodes
     */
    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active && this.simulation) {
                    this.simulation.alphaTarget(0.3).restart();
                }
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active && this.simulation) {
                    this.simulation.alphaTarget(0);
                }
                
                // Only release position if we're in force layout
                if (this.layoutMode === 'force') {
                    d.fx = null;
                    d.fy = null;
                }
                // For other layouts, keep the position fixed
            });
    }
    
    /**
     * Handle node hover
     */
    handleNodeHover(node, event) {
        this.hoveredNode = node;
        
        // Show tooltip
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        let content = `<strong>${node.label}</strong><br/>
                      Type: ${node.type}<br/>
                      Connections: ${node.connections}`;
        
        if (node.type === 'file' && node.metrics) {
            content += `<br/>Lines of Code: ${node.metrics.lines_of_code}
                       <br/>Complexity: ${node.metrics.cyclomatic_complexity}
                       <br/>Quality Score: ${node.quality}%`;
        } else if (node.complexity && node.complexity > 1) {
            content += `<br/>Complexity: ${node.complexity}`;
        }
        
        if (node.has_docstring) {
            content += `<br/><em>Has documentation</em>`;
        }
        
        if (node.todo_count) {
            content += `<br/><span style="color: #e67e22;">TODOs: ${node.todo_count}</span>`;
        }
        
        this.tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        
        // Dim other nodes
        this.nodeElements.style('opacity', d => 
            d.id === node.id || this.areNodesConnected(node, d) ? 1 : 0.3
        );
        
        this.linkElements.style('opacity', d =>
            d.source.id === node.id || d.target.id === node.id ? 1 : 0.1
        );
    }
    
    /**
     * Handle node hover out
     */
    handleNodeHoverOut() {
        this.hoveredNode = null;
        
        // Hide tooltip
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        
        // Reset opacity
        if (!this.selectedNode) {
            this.nodeElements.style('opacity', 1);
            this.linkElements.style('opacity', 0.6);
        }
    }
    
    /**
     * Check if two nodes are connected
     */
    areNodesConnected(node1, node2) {
        return this.filteredData.links.some(link =>
            (link.source.id === node1.id && link.target.id === node2.id) ||
            (link.source.id === node2.id && link.target.id === node1.id)
        );
    }
    
    /**
     * Select a node and show details
     */
    selectNode(node) {
        this.selectedNode = node;
        this.showNodeDetails(node);
        this.highlightConnections(node);
    }
    
    /**
     * Display details for a selected node
     */
    showNodeDetails(node) {
        const detailsContainer = document.getElementById(this.detailsId);
        
        const incoming = this.filteredData.links.filter(link => link.target.id === node.id).length;
        const outgoing = this.filteredData.links.filter(link => link.source.id === node.id).length;
        
        const nodeColor = this.getNodeColor(node);
        
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
                </div>`;
        
        // Add type-specific metrics
        if (node.type === 'file' && node.metrics) {
            html += `
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; color: var(--magenta-primary);">${node.metrics.lines_of_code}</div>
                    <div style="color: var(--text-secondary); font-size: 12px;">Lines</div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; color: var(--magenta-primary);">${node.quality}%</div>
                    <div style="color: var(--text-secondary); font-size: 12px;">Quality</div>
                </div>`;
        } else if ((node.type === 'function' || node.type === 'method') && node.complexity) {
            html += `
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; color: var(--magenta-primary);">${node.complexity}</div>
                    <div style="color: var(--text-secondary); font-size: 12px;">Complexity</div>
                </div>`;
        }
        
        html += '</div>';
        
        // Add additional details
        if (node.docstring) {
            html += `<div style="background: rgba(40, 40, 40, 0.5); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                        <h4>Documentation</h4>
                        <p style="font-style: italic; color: var(--text-secondary);">${node.docstring}</p>
                     </div>`;
        }
        
        if (node.params && node.params.length > 0) {
            html += `<div style="margin-bottom: 15px;">
                        <h4>Parameters</h4>
                        <ul style="list-style: none; padding-left: 0;">`;
            node.params.forEach(param => {
                html += `<li>• ${param.name}${param.type ? `: ${param.type}` : ''}</li>`;
            });
            html += '</ul></div>';
        }
        
        if (node.decorators && node.decorators.length > 0) {
            html += `<div style="margin-bottom: 15px;">
                        <h4>Decorators</h4>
                        <div>${node.decorators.map(d => `<span style="background: #333; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">@${d}</span>`).join('')}</div>
                     </div>`;
        }
        
        // Show connections
        if (incoming > 0) {
            html += `<h4>Incoming Connections <span style="color: var(--magenta-primary);">(${incoming})</span>:</h4><ul>`;
            this.filteredData.links.filter(link => link.target.id === node.id)
                .sort((a, b) => a.source.label.localeCompare(b.source.label))
                .forEach(link => {
                    const sourceColor = this.getNodeColor(link.source);
                    html += `<li><span style="color: ${sourceColor};">${link.source.label}</span> <small>(${link.source.type})</small></li>`;
                });
            html += '</ul>';
        }
        
        if (outgoing > 0) {
            html += `<h4>Outgoing Connections <span style="color: var(--magenta-primary);">(${outgoing})</span>:</h4><ul>`;
            this.filteredData.links.filter(link => link.source.id === node.id)
                .sort((a, b) => a.target.label.localeCompare(b.target.label))
                .forEach(link => {
                    const targetColor = this.getNodeColor(link.target);
                    html += `<li><span style="color: ${targetColor};">${link.target.label}</span> <small>(${link.target.type})</small></li>`;
                });
            html += '</ul>';
        }
        
        if (incoming === 0 && outgoing === 0) {
            html += `<p style="text-align: center; margin-top: 20px; color: var(--text-secondary);">This ${node.type} has no connections.</p>`;
        }
        
        detailsContainer.innerHTML = html;
    }
    
    /**
     * Highlight a node and its connections
     */
    highlightConnections(node) {
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
        
        this.filteredData.links.forEach(link => {
            if (link.source.id === node.id || link.target.id === node.id) {
                connectedNodes.add(link.source.id);
                connectedNodes.add(link.target.id);
                
                this.linkElements.filter(l => l === link)
                    .attr('opacity', 1)
                    .attr('stroke', highlightColor)
                    .attr('stroke-width', 2);
            }
        });
        
        this.nodeElements.filter(d => connectedNodes.has(d.id) && d.id !== node.id)
            .attr('opacity', 0.8)
            .style('stroke', d => d3.color(this.getNodeColor(d)).brighter(0.5))
            .style('filter', 'url(#glow) brightness(1.1)');
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedNode = null;
        this.nodeElements.attr('opacity', 1)
            .style('stroke', d => d3.color(this.getNodeColor(d)).darker(1))
            .style('stroke-width', 1.5)
            .style('filter', 'url(#glow)');
        
        this.linkElements.attr('opacity', 0.6)
            .attr('stroke', '#555')
            .attr('stroke-width', d => Math.max(1, Math.sqrt(d.source.size) * 0.2));
        
        document.getElementById(this.detailsId).innerHTML = '<p>Click on a node to see details</p>';
    }
    
    /**
     * Setup search functionality
     */
    setupSearch() {
        // Add search input if it doesn't exist
        if (!document.getElementById('graph-search')) {
            const searchContainer = document.createElement('div');
            searchContainer.className = 'graph-search-container';
            searchContainer.innerHTML = `
                <input type="text" id="graph-search" placeholder="Search nodes... (Ctrl+F)" />
                <button id="clear-search">×</button>
                <div id="search-results"></div>
            `;
            
            const visualizationSection = document.querySelector('.visualization-section');
            visualizationSection.insertBefore(searchContainer, visualizationSection.children[1]);
            
            // Add event listeners
            const searchInput = document.getElementById('graph-search');
            const clearButton = document.getElementById('clear-search');
            
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            clearButton.addEventListener('click', () => this.clearSearch());
        }
    }
    
    /**
     * Handle search input
     */
    handleSearch(query) {
        this.searchQuery = query.trim();
        this.applyFilters();
        this.render();
        
        // Update search results display
        const resultsDiv = document.getElementById('search-results');
        if (this.searchResults.length > 0) {
            resultsDiv.innerHTML = `Found ${this.searchResults.length} results`;
            resultsDiv.style.display = 'block';
            
            // Focus on first result
            if (this.searchResults[0]) {
                this.centerOnNode(this.searchResults[0]);
            }
        } else if (this.searchQuery) {
            resultsDiv.innerHTML = 'No results found';
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    }
    
    /**
     * Clear search
     */
    clearSearch() {
        this.searchQuery = '';
        this.searchResults = [];
        document.getElementById('graph-search').value = '';
        document.getElementById('search-results').style.display = 'none';
        this.applyFilters();
        this.render();
    }
    
    /**
     * Focus search input
     */
    focusSearch() {
        const searchInput = document.getElementById('graph-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    /**
     * Center view on a specific node
     */
    centerOnNode(node) {
        const transform = d3.zoomIdentity
            .translate(this.width / 2 - node.x, this.height / 2 - node.y)
            .scale(1.5);
        
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, transform);
    }
    
    /**
     * Setup filter controls
     */
    setupFilterControls() {
        if (!document.getElementById('node-filters')) {
            const filterContainer = document.createElement('div');
            filterContainer.className = 'graph-filters';
            filterContainer.innerHTML = `
                <h4>Node Filters</h4>
                <div id="node-filters">
                    ${['file', 'class', 'function', 'method', 'import', 'module', 'todo'].map(type => `
                        <label>
                            <input type="checkbox" value="${type}" ${this.nodeFilters.has(type) ? 'checked' : ''}>
                            ${type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                    `).join('')}
                </div>
            `;
            
            const detailsPanel = document.querySelector('.details-panel');
            detailsPanel.appendChild(filterContainer);
            
            // Add event listeners
            document.querySelectorAll('#node-filters input').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => this.handleFilterChange(e));
            });
        }
    }
    
    /**
     * Handle filter change
     */
    handleFilterChange(event) {
        const type = event.target.value;
        if (event.target.checked) {
            this.nodeFilters.add(type);
        } else {
            this.nodeFilters.delete(type);
        }
        this.applyFilters();
        this.render();
    }
    
    /**
     * Setup layout controls
     */
    setupLayoutControls() {
        if (!document.getElementById('layout-controls')) {
            const layoutContainer = document.createElement('div');
            layoutContainer.className = 'graph-layout-controls';
            layoutContainer.innerHTML = `
                <label>Layout: 
                    <select id="layout-mode">
                        <option value="force" ${this.layoutMode === 'force' ? 'selected' : ''}>Force-Directed</option>
                        <option value="hierarchical" ${this.layoutMode === 'hierarchical' ? 'selected' : ''}>Hierarchical</option>
                        <option value="circular" ${this.layoutMode === 'circular' ? 'selected' : ''}>Circular</option>
                        <option value="radial" ${this.layoutMode === 'radial' ? 'selected' : ''}>Radial</option>
                    </select>
                </label>
            `;
            
            const controlsDiv = document.querySelector('.visualization-controls');
            controlsDiv.appendChild(layoutContainer);
            
            // Add event listener
            document.getElementById('layout-mode').addEventListener('change', (e) => {
                const oldMode = this.layoutMode;
                this.layoutMode = e.target.value;
                
                // If switching to force layout from another layout, we need to clear fixed positions
                if (this.layoutMode === 'force' && oldMode !== 'force') {
                    // Clear all fixed positions
                    this.filteredData.nodes.forEach(node => {
                        delete node.fx;
                        delete node.fy;
                    });
                }
                
                // Re-render with new layout
                this.render();
            });
        }
    }
    
    /**
     * Setup color controls
     */
    setupColorControls() {
        if (!document.getElementById('color-controls')) {
            const colorContainer = document.createElement('div');
            colorContainer.className = 'graph-color-controls';
            colorContainer.innerHTML = `
                <label>Color by: 
                    <select id="color-mode">
                        <option value="type" ${this.colorBy === 'type' ? 'selected' : ''}>Type</option>
                        <option value="complexity" ${this.colorBy === 'complexity' ? 'selected' : ''}>Complexity</option>
                        <option value="quality" ${this.colorBy === 'quality' ? 'selected' : ''}>Quality</option>
                        <option value="connections" ${this.colorBy === 'connections' ? 'selected' : ''}>Connections</option>
                    </select>
                </label>
            `;
            
            const controlsDiv = document.querySelector('.visualization-controls');
            controlsDiv.appendChild(colorContainer);
            
            // Add event listener
            document.getElementById('color-mode').addEventListener('change', (e) => {
                this.colorBy = e.target.value;
                this.updateNodeColors();
                this.showMetrics = this.colorBy !== 'type';
                this.render();
            });
        }
    }
    
    /**
     * Update node colors without re-rendering
     */
    updateNodeColors() {
        this.nodeElements
            .transition()
            .duration(500)
            .attr('fill', d => this.getNodeColor(d))
            .style('stroke', d => d3.color(this.getNodeColor(d)).darker(1));
        
        // Update minimap
        this.updateMinimap();
    }
    
    /**
     * Toggle label visibility
     */
    toggleLabels() {
        this.showLabels = !this.showLabels;
        if (this.labelElements) {
            this.labelElements.style('display', this.showLabels ? 'block' : 'none');
        }
    }
    
    /**
     * Toggle metrics display
     */
    toggleMetrics() {
        this.showMetrics = !this.showMetrics;
        if (this.labelElements && this.showLabels) {
            this.labelElements.text(d => this.showMetrics ? this.getNodeMetricLabel(d) : d.label);
        }
    }
    
    /**
     * Center the graph in the viewport
     */
    centerGraph() {
        const bounds = this.g.node().getBBox();
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        const width = this.width;
        const height = this.height;
        
        const midX = bounds.x + fullWidth / 2;
        const midY = bounds.y + fullHeight / 2;
        
        const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height);
        const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
        
        const transform = d3.zoomIdentity
            .translate(translate[0], translate[1])
            .scale(scale);
        
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
        this.clearSelection();
    }
    
    /**
     * Export graph as PNG with current view
     */
    exportPNG() {
        // Implementation would be similar to export.js but with current transform applied
        console.log('Exporting graph as PNG...');
    }
    
    /**
     * Export graph data as JSON
     */
    exportJSON() {
        const exportData = {
            nodes: this.filteredData.nodes.map(n => ({
                id: n.id,
                label: n.label,
                type: n.type,
                x: n.x,
                y: n.y,
                size: n.size,
                metrics: n.metrics || {},
                connections: n.connections
            })),
            links: this.filteredData.links.map(l => ({
                source: l.source.id,
                target: l.target.id
            })),
            metrics: this.data.metrics
        };
        
        return exportData;
    }
}

// Create a global instance
const graphVisualizer = new GraphVisualizer('visualization', 'node-details');