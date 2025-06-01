/**
 * Enhanced Export Functionality
 * Handles exporting graph data as JSON/SVG/PNG with improved features
 */

// Global variables to store visualization state
let capturedSvgElement = null;
let capturedWidth = 800;
let capturedHeight = 600;
let currentTransform = null;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up enhanced export functionality");
    
    // Set up event listeners for export buttons
    document.getElementById('export-json').addEventListener('click', exportJSON);
    document.getElementById('export-svg').addEventListener('click', exportSVG);
    document.getElementById('export-png').addEventListener('click', exportPNG);
    
    // Hook into the analyze button to capture SVG element
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            console.log("Analyze button clicked, will capture SVG after analysis");
            
            // Wait for the graph to be updated
            setTimeout(captureSvgElement, 2000);
        });
    }
    
    // Listen for graph updates
    document.addEventListener('graphUpdated', function() {
        setTimeout(captureSvgElement, 500);
    });
});

/**
 * Capture SVG element and current transform after analysis
 */
function captureSvgElement() {
    console.log("Attempting to capture SVG element");
    
    try {
        // Try to find the SVG directly
        const svgElement = document.querySelector('#visualization svg');
        if (svgElement) {
            capturedSvgElement = svgElement;
            console.log("Found SVG element directly");
            
            // Get dimensions
            capturedWidth = svgElement.clientWidth || 800;
            capturedHeight = svgElement.clientHeight || 600;
            console.log("Captured dimensions:", capturedWidth, "x", capturedHeight);
            
            // Capture current transform
            const graphG = svgElement.querySelector('.graph');
            if (graphG) {
                const transform = graphG.getAttribute('transform');
                currentTransform = transform;
                console.log("Captured transform:", transform);
            }
        } else {
            console.warn("SVG element not found");
        }
    } catch (error) {
        console.error("Error capturing SVG element:", error);
    }
}

/**
 * Export graph data as JSON with enhanced metadata
 */
function exportJSON() {
    console.log("Exporting enhanced JSON...");
    
    // Check if we have the graph visualizer instance
    if (!window.graphVisualizer) {
        showNotification('No visualization to export. Please analyze a codebase first.', true);
        return;
    }
    
    try {
        // Get the graph data from the visualizer
        const graphData = graphVisualizer.exportJSON();
        
        // Add metadata
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                version: '2.0',
                nodeCount: graphData.nodes.length,
                linkCount: graphData.links.length,
                fileCount: graphData.nodes.filter(n => n.type === 'file').length
            },
            ...graphData
        };
        
        // Create a formatted JSON string
        const jsonData = JSON.stringify(exportData, null, 2);
        console.log("JSON data created, length:", jsonData.length);
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `codebase-visualization-${timestamp}.json`;
        
        // Download the JSON file
        downloadFile(jsonData, filename, 'application/json');
        
        showNotification('JSON data exported successfully!');
    } catch (error) {
        console.error("Error exporting JSON:", error);
        showNotification('Error exporting JSON: ' + error.message, true);
    }
}

/**
 * Export visualization as SVG with enhanced styling
 */
function exportSVG() {
    console.log("Exporting enhanced SVG...");
    
    // Check if we have captured SVG element
    if (!capturedSvgElement) {
        console.error("No SVG element captured");
        showNotification('No visualization to export. Please analyze a codebase first.', true);
        return;
    }
    
    try {
        // Clone the SVG to avoid modifying the original
        const svgClone = capturedSvgElement.cloneNode(true);
        console.log("SVG cloned");
        
        // Set explicit dimensions and viewBox
        svgClone.setAttribute('width', capturedWidth);
        svgClone.setAttribute('height', capturedHeight);
        svgClone.setAttribute('viewBox', `0 0 ${capturedWidth} ${capturedHeight}`);
        
        // Add metadata
        const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
        metadata.textContent = JSON.stringify({
            creator: 'MilkFish Codebase Visualizer',
            created: new Date().toISOString(),
            description: 'Python codebase visualization'
        });
        svgClone.insertBefore(metadata, svgClone.firstChild);
        
        // Add title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = 'Python Codebase Visualization';
        svgClone.insertBefore(title, svgClone.firstChild);
        
        // Embed styles
        embedStylesInSVG(svgClone);
        
        // Convert to string
        const svgString = new XMLSerializer().serializeToString(svgClone);
        console.log("SVG serialized, length:", svgString.length);
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `codebase-visualization-${timestamp}.svg`;
        
        // Download the SVG file
        downloadFile(svgString, filename, 'image/svg+xml');
        
        showNotification('SVG exported successfully!');
    } catch (error) {
        console.error("Error exporting SVG:", error);
        showNotification('Error exporting SVG: ' + error.message, true);
    }
}

/**
 * Export visualization as PNG with high quality
 */
async function exportPNG() {
    console.log("Exporting high-quality PNG...");
    
    // Check if we have captured SVG element
    if (!capturedSvgElement) {
        console.error("No SVG element captured");
        showNotification('No visualization to export. Please analyze a codebase first.', true);
        return;
    }
    
    try {
        // Show progress
        showNotification('Generating PNG image...');
        
        // Create a high-resolution canvas (2x for retina displays)
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = capturedWidth * scale;
        canvas.height = capturedHeight * scale;
        console.log("Canvas created with dimensions:", canvas.width, "x", canvas.height);
        
        const ctx = canvas.getContext('2d');
        
        // Scale the context for high DPI
        ctx.scale(scale, scale);
        
        // Set background color
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--darker-bg').trim() || '#1a1a1a';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, capturedWidth, capturedHeight);
        console.log("Canvas background set");
        
        // Clone SVG and prepare for rendering
        const svgClone = capturedSvgElement.cloneNode(true);
        svgClone.setAttribute('width', capturedWidth);
        svgClone.setAttribute('height', capturedHeight);
        
        // Embed all styles inline
        embedStylesInSVG(svgClone, true);
        
        // Convert SVG to data URL
        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        // Create image from SVG
        const img = new Image();
        
        await new Promise((resolve, reject) => {
            img.onload = function() {
                console.log("Image loaded successfully");
                
                // Draw the image on the canvas
                ctx.drawImage(img, 0, 0, capturedWidth, capturedHeight);
                console.log("Image drawn on canvas");
                
                // Clean up
                URL.revokeObjectURL(url);
                resolve();
            };
            
            img.onerror = function(error) {
                console.error("Error loading SVG image:", error);
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load SVG image"));
            };
            
            img.src = url;
        });
        
        // Add watermark
        addWatermark(ctx, capturedWidth, capturedHeight);
        
        // Convert canvas to blob
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Failed to create PNG blob"));
                    }
                },
                'image/png',
                1.0 // Maximum quality
            );
        });
        
        console.log("PNG blob created, size:", blob.size);
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `codebase-visualization-${timestamp}.png`;
        
        // Download the PNG file
        downloadFileFromBlob(blob, filename, 'image/png');
        
        showNotification('PNG exported successfully!');
    } catch (error) {
        console.error("Error exporting PNG:", error);
        showNotification('Error exporting PNG: ' + error.message, true);
    }
}

/**
 * Embed styles in SVG for standalone viewing
 * @param {SVGElement} svgElement - SVG element to process
 * @param {boolean} forPNG - Whether to prepare for PNG export
 */
function embedStylesInSVG(svgElement, forPNG = false) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    
    // Get computed styles for colors
    const root = document.documentElement;
    const fileColor = getComputedStyle(root).getPropertyValue('--file-color').trim();
    const classColor = getComputedStyle(root).getPropertyValue('--class-color').trim();
    const functionColor = getComputedStyle(root).getPropertyValue('--function-color').trim();
    const methodColor = getComputedStyle(root).getPropertyValue('--method-color').trim();
    const importColor = getComputedStyle(root).getPropertyValue('--import-color').trim();
    const moduleColor = getComputedStyle(root).getPropertyValue('--module-color').trim();
    
    style.textContent = `
        .node { cursor: pointer; stroke-width: 1.5px; }
        .node-file { fill: ${fileColor}; stroke: ${d3.color(fileColor).darker(1)}; }
        .node-class { fill: ${classColor}; stroke: ${d3.color(classColor).darker(1)}; }
        .node-function { fill: ${functionColor}; stroke: ${d3.color(functionColor).darker(1)}; }
        .node-method { fill: ${methodColor}; stroke: ${d3.color(methodColor).darker(1)}; }
        .node-import { fill: ${importColor}; stroke: ${d3.color(importColor).darker(1)}; }
        .node-module { fill: ${moduleColor}; stroke: ${d3.color(moduleColor).darker(1)}; }
        .node-todo { fill: #e67e22; stroke: ${d3.color('#e67e22').darker(1)}; }
        .link { stroke: #555; stroke-opacity: 0.6; fill: none; }
        text { fill: white; font-family: Arial, sans-serif; font-size: 10px; }
        ${forPNG ? 'text { display: none; }' : ''} /* Hide text for PNG to avoid rendering issues */
    `;
    
    // Insert style at the beginning
    const defs = svgElement.querySelector('defs') || svgElement.insertBefore(
        document.createElementNS('http://www.w3.org/2000/svg', 'defs'),
        svgElement.firstChild
    );
    defs.appendChild(style);
    
    // Apply inline styles to nodes for better compatibility
    if (forPNG) {
        svgElement.querySelectorAll('.node').forEach(node => {
            const nodeType = Array.from(node.classList).find(c => c.startsWith('node-'))?.replace('node-', '');
            if (nodeType) {
                const color = {
                    file: fileColor,
                    class: classColor,
                    function: functionColor,
                    method: methodColor,
                    import: importColor,
                    module: moduleColor,
                    todo: '#e67e22'
                }[nodeType] || '#999';
                
                node.style.fill = color;
                node.style.stroke = d3.color(color).darker(1);
                node.style.strokeWidth = '1.5px';
            }
        });
        
        svgElement.querySelectorAll('.link').forEach(link => {
            link.style.stroke = '#555';
            link.style.strokeOpacity = '0.6';
            link.style.fill = 'none';
        });
    }
}

/**
 * Add watermark to canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function addWatermark(ctx, width, height) {
    ctx.save();
    
    // Set watermark style
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    
    // Add watermark text
    const watermarkText = `MilkFish Visualizer - ${new Date().toLocaleDateString()}`;
    ctx.fillText(watermarkText, width - 10, height - 10);
    
    ctx.restore();
}

/**
 * Helper function to download a file
 * @param {string} content - The file content
 * @param {string} filename - The filename
 * @param {string} contentType - The content type
 */
function downloadFile(content, filename, contentType) {
    try {
        console.log("Creating download for", filename);
        
        // Create a blob
        const blob = new Blob([content], { type: contentType });
        console.log("Blob created, size:", blob.size);
        
        downloadFileFromBlob(blob, filename, contentType);
    } catch (error) {
        console.error("Error in downloadFile:", error);
        throw error;
    }
}

/**
 * Helper function to download a file from a blob
 * @param {Blob} blob - The file blob
 * @param {string} filename - The filename
 * @param {string} contentType - The content type
 */
function downloadFileFromBlob(blob, filename, contentType) {
    try {
        console.log("Downloading blob as", filename);
        
        // Create a URL for the blob
        const url = URL.createObjectURL(blob);
        console.log("URL created:", url);
        
        // Create a download link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        console.log("Download link created");
        
        // Append to body, click, and remove
        document.body.appendChild(a);
        console.log("Link appended to body");
        a.click();
        console.log("Link clicked");
        
        // Clean up immediately
        setTimeout(function() {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("Cleanup completed");
        }, 100);
    } catch (error) {
        console.error("Error in downloadFileFromBlob:", error);
        throw error;
    }
}

/**
 * Export visualization settings
 */
function exportSettings() {
    const settings = {
        layout: window.graphVisualizer?.layoutMode || 'force',
        colorBy: window.graphVisualizer?.colorBy || 'type',
        showLabels: window.graphVisualizer?.showLabels !== false,
        filters: window.graphVisualizer?.nodeFilters ? Array.from(window.graphVisualizer.nodeFilters) : [],
        timestamp: new Date().toISOString()
    };
    
    const settingsJson = JSON.stringify(settings, null, 2);
    downloadFile(settingsJson, 'visualization-settings.json', 'application/json');
}

/**
 * Import visualization settings
 */
function importSettings(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const settings = JSON.parse(e.target.result);
            
            if (window.graphVisualizer) {
                // Apply settings
                if (settings.layout) {
                    window.graphVisualizer.layoutMode = settings.layout;
                    document.getElementById('layout-mode').value = settings.layout;
                }
                
                if (settings.colorBy) {
                    window.graphVisualizer.colorBy = settings.colorBy;
                    document.getElementById('color-mode').value = settings.colorBy;
                }
                
                if (typeof settings.showLabels === 'boolean') {
                    window.graphVisualizer.showLabels = settings.showLabels;
                }
                
                if (settings.filters && Array.isArray(settings.filters)) {
                    window.graphVisualizer.nodeFilters = new Set(settings.filters);
                    // Update filter checkboxes
                    document.querySelectorAll('#node-filters input').forEach(checkbox => {
                        checkbox.checked = settings.filters.includes(checkbox.value);
                    });
                }
                
                // Re-render with new settings
                window.graphVisualizer.applyFilters();
                window.graphVisualizer.render();
                
                showNotification('Settings imported successfully!');
            }
        } catch (error) {
            console.error('Error importing settings:', error);
            showNotification('Error importing settings: Invalid file format', true);
        }
    };
    
    reader.readAsText(file);
}

// Add export settings button dynamically
document.addEventListener('DOMContentLoaded', function() {
    const exportControls = document.querySelector('.export-controls');
    if (exportControls && !document.getElementById('export-settings')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'export-settings';
        settingsBtn.title = 'Export/Import Settings';
        settingsBtn.innerHTML = '<span>⚙️</span>';
        settingsBtn.onclick = function() {
            showSettingsModal();
        };
        exportControls.appendChild(settingsBtn);
    }
});

/**
 * Show settings export/import modal
 */
function showSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Visualization Settings</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">×</span>
            </div>
            <div class="modal-body">
                <p>Export or import your visualization settings to reuse them later.</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="exportSettings()">Export Settings</button>
                    <label class="secondary-btn" style="margin: 0;">
                        Import Settings
                        <input type="file" accept=".json" style="display: none;" 
                               onchange="importSettings(this.files[0]); this.closest('.modal').remove();">
                    </label>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}