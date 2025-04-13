/**
 * Export Functionality
 * Handles exporting graph data as JSON/SVG/PNG
 */

// Global variables to store SVG element and dimensions
let capturedSvgElement = null;
let capturedWidth = 800;
let capturedHeight = 600;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up export functionality");
    
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
});

/**
 * Capture SVG element after analysis
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
        } else {
            console.warn("SVG element not found");
        }
    } catch (error) {
        console.error("Error capturing SVG element:", error);
    }
}

/**
 * Export graph data as JSON
 */
function exportJSON() {
    console.log("Exporting JSON...");
    
    // Check if we have captured SVG element
    if (!capturedSvgElement) {
        console.error("No SVG element captured");
        showNotification('No visualization to export. Please analyze a codebase first.', true);
        return;
    }
    
    try {
        // Extract graph data from the SVG
        const graphData = extractGraphDataFromSvg(capturedSvgElement);
        
        if (!graphData) {
            console.error("Failed to extract graph data from SVG");
            showNotification('Failed to extract graph data. Please try again.', true);
            return;
        }
        
        // Create a formatted JSON string
        const jsonData = JSON.stringify(graphData, null, 2);
        console.log("JSON data created, length:", jsonData.length);
        
        // Download the JSON file
        downloadFile(jsonData, 'codebase-visualization.json', 'application/json');
        
        showNotification('JSON data exported successfully!');
    } catch (error) {
        console.error("Error exporting JSON:", error);
        showNotification('Error exporting JSON: ' + error.message, true);
    }
}

/**
 * Extract graph data from SVG element
 * @param {SVGElement} svgElement - The SVG element
 * @returns {Object} - The graph data
 */
function extractGraphDataFromSvg(svgElement) {
    try {
        // Find all node circles
        const nodeElements = svgElement.querySelectorAll('.node');
        console.log("Found", nodeElements.length, "node elements");
        
        if (nodeElements.length === 0) {
            return null;
        }
        
        // Extract node data
        const nodes = [];
        nodeElements.forEach((node, index) => {
            const cx = parseFloat(node.getAttribute('cx') || 0);
            const cy = parseFloat(node.getAttribute('cy') || 0);
            const r = parseFloat(node.getAttribute('r') || 5);
            const fill = node.getAttribute('fill') || '#999';
            
            // Try to get the label from associated text element
            const label = `Node ${index + 1}`;
            
            // Try to determine type from color
            let type = 'unknown';
            if (fill.includes('3498db')) type = 'file';
            else if (fill.includes('e74c3c')) type = 'class';
            else if (fill.includes('2ecc71')) type = 'function';
            else if (fill.includes('9b59b6')) type = 'method';
            else if (fill.includes('f39c12')) type = 'import';
            else if (fill.includes('1abc9c')) type = 'module';
            
            nodes.push({
                id: `node-${index}`,
                label: label,
                type: type,
                size: r,
                x: cx,
                y: cy
            });
        });
        
        // Find all links
        const linkElements = svgElement.querySelectorAll('.link');
        console.log("Found", linkElements.length, "link elements");
        
        // Extract link data
        const links = [];
        linkElements.forEach((link, index) => {
            const x1 = parseFloat(link.getAttribute('x1') || 0);
            const y1 = parseFloat(link.getAttribute('y1') || 0);
            const x2 = parseFloat(link.getAttribute('x2') || 0);
            const y2 = parseFloat(link.getAttribute('y2') || 0);
            
            // Find source and target nodes based on coordinates
            const sourceIndex = findNodeIndexByCoordinates(nodes, x1, y1);
            const targetIndex = findNodeIndexByCoordinates(nodes, x2, y2);
            
            if (sourceIndex !== -1 && targetIndex !== -1) {
                links.push({
                    source: nodes[sourceIndex].id,
                    target: nodes[targetIndex].id
                });
            }
        });
        
        return { nodes, links };
    } catch (error) {
        console.error("Error extracting graph data from SVG:", error);
        return null;
    }
}

/**
 * Find node index by coordinates
 * @param {Array} nodes - Array of nodes
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} - Index of the node or -1 if not found
 */
function findNodeIndexByCoordinates(nodes, x, y) {
    // Allow for some tolerance in coordinate matching
    const tolerance = 1;
    
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (Math.abs(node.x - x) <= tolerance && Math.abs(node.y - y) <= tolerance) {
            return i;
        }
    }
    
    return -1;
}

/**
 * Export visualization as SVG
 */
function exportSVG() {
    console.log("Exporting SVG...");
    
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
        
        // Set explicit dimensions
        svgClone.setAttribute('width', capturedWidth);
        svgClone.setAttribute('height', capturedHeight);
        console.log("SVG dimensions set:", capturedWidth, "x", capturedHeight);
        
        // Convert to string
        const svgString = new XMLSerializer().serializeToString(svgClone);
        console.log("SVG serialized, length:", svgString.length);
        
        // Download the SVG file
        downloadFile(svgString, 'codebase-visualization.svg', 'image/svg+xml');
        
        showNotification('SVG exported successfully!');
    } catch (error) {
        console.error("Error exporting SVG:", error);
        showNotification('Error exporting SVG: ' + error.message, true);
    }
}

/**
 * Export visualization as PNG
 */
function exportPNG() {
    console.log("Exporting PNG...");
    
    // Check if we have captured SVG element
    if (!capturedSvgElement) {
        console.error("No SVG element captured");
        showNotification('No visualization to export. Please analyze a codebase first.', true);
        return;
    }
    
    try {
        // Create a canvas with the same dimensions
        const canvas = document.createElement('canvas');
        canvas.width = capturedWidth;
        canvas.height = capturedHeight;
        console.log("Canvas created with dimensions:", capturedWidth, "x", capturedHeight);
        
        const ctx = canvas.getContext('2d');
        
        // Set background color
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--darker-bg').trim() || '#1a1a1a';
        ctx.fillRect(0, 0, capturedWidth, capturedHeight);
        console.log("Canvas background set");
        
        // Convert SVG to data URL
        const svgString = new XMLSerializer().serializeToString(capturedSvgElement);
        console.log("SVG serialized, length:", svgString.length);
        
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        console.log("SVG blob created, size:", svgBlob.size);
        
        const url = URL.createObjectURL(svgBlob);
        console.log("URL created:", url);
        
        // Create image from SVG
        const img = new Image();
        console.log("Image created");
        
        img.onload = function() {
            console.log("Image loaded");
            
            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0);
            console.log("Image drawn on canvas");
            
            // Clean up SVG URL
            URL.revokeObjectURL(url);
            
            // Convert canvas to PNG and download
            canvas.toBlob(function(blob) {
                console.log("Canvas converted to blob, size:", blob.size);
                
                // Download the PNG file
                downloadFileFromBlob(blob, 'codebase-visualization.png', 'image/png');
                
                showNotification('PNG exported successfully!');
            }, 'image/png');
        };
        
        img.onerror = function(error) {
            console.error("Error loading SVG image:", error);
            showNotification('Error exporting PNG: Failed to load SVG image', true);
        };
        
        console.log("Setting image source");
        img.src = url;
    } catch (error) {
        console.error("Error exporting PNG:", error);
        showNotification('Error exporting PNG: ' + error.message, true);
    }
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
        a.style.display = 'none'; // Hide the link
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