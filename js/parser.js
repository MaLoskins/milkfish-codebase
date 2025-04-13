/**
 * Python Code Parser
 * Parses Python code to extract classes, functions, imports, etc.
 */
class PythonParser {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.nodeMap = {};
        this.nodeIndex = 0;
        this.pythonFiles = new Set(); // Track Python file names
        this.filePathMap = {}; // Map to track filenames and their full paths
    }

    /**
     * Parses Python files and builds a graph data structure
     * @param {Array} files - Array of file objects from directory input
     * @returns {Object} - Graph data with nodes and links
     */
    async parseFiles(files) {
        // Reset parser state
        this.nodes = [];
        this.links = [];
        this.nodeMap = {};
        this.nodeIndex = 0;
        this.pythonFiles.clear();
        this.filePathMap = {};
        
        // First, collect all Python file names
        for (const file of files) {
            if (file.name.endsWith('.py')) {
                // Store the file name without extension for module matching
                const moduleName = file.name.replace('.py', '');
                this.pythonFiles.add(moduleName);
            }
        }
        
        // Parse each Python file
        for (const file of files) {
            if (file.name.endsWith('.py')) {
                const content = await this.readFile(file);
                const filepath = file.webkitRelativePath || file.name;
                this.parseFile(file.name, content, filepath);
            }
        }
        
        // Post-processing: Update labels for duplicate filenames
        console.log("Starting post-processing to handle duplicate filenames...");
        this.handleDuplicateFilenames();
        console.log("Post-processing complete");
        
        // Calculate node sizes based on connections (degree)
        this.calculateNodeSizes();
        
        return {
            nodes: this.nodes,
            links: this.links
        };
    }
    
    /**
     * Reads file content
     * @param {File} file - File object to read
     * @returns {Promise<string>} - File content as string
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }
    
    /**
     * Parses a Python file and extracts components
     * @param {string} filename - Name of the file
     * @param {string} content - Content of the file
     * @param {string} filepath - Full path of the file
     */
    parseFile(filename, content, filepath) {
        console.log(`Parsing file: ${filename}, filepath: ${filepath}`);
        
        // Track this filename and its path
        if (!this.filePathMap[filename]) {
            this.filePathMap[filename] = [];
            console.log(`  Creating new entry in filePathMap for ${filename}`);
        }
        this.filePathMap[filename].push(filepath);
        console.log(`  Added ${filepath} to filePathMap for ${filename}`);
        
        // Create a node for the file using the full path as ID for uniqueness
        // The label is just the filename initially, but will be updated for duplicates in handleDuplicateFilenames
        const fileNode = this.createNode('file', filepath, filename);
        console.log(`  Created file node with id: ${filepath}, label: ${filename}`);
        
        // Split content into lines for analysis
        const lines = content.split('\n');
        
        // Process imports
        this.parseImports(lines, fileNode);
        
        // Process classes and functions
        this.parseClassesAndFunctions(lines, fileNode, filename, filepath);
    }
    
    /**
     * Parse import statements
     * @param {string[]} lines - Lines of Python code
     * @param {Object} fileNode - File node to link imports to
     */
    parseImports(lines, fileNode) {
        // Regular expressions for different import patterns
        const importRegex = /^import\s+([a-zA-Z0-9_.,\s]+)/;
        const fromImportRegex = /^from\s+([a-zA-Z0-9_.]+)\s+import\s+([a-zA-Z0-9_.,\s*]+)/;
        
        lines.forEach(line => {
            line = line.trim();
            
            // Match simple import statements
            let match = line.match(importRegex);
            if (match) {
                const imports = match[1].split(',').map(imp => imp.trim());
                imports.forEach(imp => {
                    // Create node for import and link to file
                    const importNode = this.createOrGetNode('import', imp, imp);
                    this.createLink(fileNode.id, importNode.id);
                });
                return;
            }
            
            // Match from...import statements
            match = line.match(fromImportRegex);
            if (match) {
                const module = match[1].trim();
                const imports = match[2].split(',').map(imp => imp.trim());
                
                let moduleNode;
                
                // Check if this module corresponds to a Python file in the project
                if (this.pythonFiles.has(module)) {
                    // Use the file node instead of creating a module node
                    const fileName = `${module}.py`;
                    
                    // Find the file node by checking all paths for this filename
                    let foundNode = null;
                    if (this.filePathMap[fileName]) {
                        // Use the first path found for this filename
                        const filePath = this.filePathMap[fileName][0];
                        foundNode = this.nodeMap[filePath];
                    }
                    
                    moduleNode = foundNode || this.createOrGetNode('module', module, module);
                } else {
                    // External module, create a module node as before
                    moduleNode = this.createOrGetNode('module', module, module);
                }
                
                this.createLink(fileNode.id, moduleNode.id);
                
                imports.forEach(imp => {
                    if (imp !== '*') {
                        // Create nodes for each imported item and link to module
                        const importNode = this.createOrGetNode('import', `${module}.${imp}`, imp);
                        this.createLink(moduleNode.id, importNode.id);
                        this.createLink(fileNode.id, importNode.id);
                    }
                });
            }
        });
    }
    
    /**
     * Parse classes and functions
     * @param {string[]} lines - Lines of Python code
     * @param {Object} fileNode - File node to link classes/functions to
     * @param {string} filename - Name of the file
     */
    parseClassesAndFunctions(lines, fileNode, filename, filepath) {
        const classRegex = /^class\s+([a-zA-Z0-9_]+)(?:\(([a-zA-Z0-9_.,\s]+)\))?:/;
        const funcRegex = /^def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/;
        const methodRegex = /^\s+def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/;
        
        let currentClass = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Match class definitions
            let match = line.match(classRegex);
            if (match) {
                const className = match[1];
                currentClass = this.createNode('class', `${filepath}:${className}`, className);
                this.createLink(fileNode.id, currentClass.id);
                
                // If class inherits from other classes
                if (match[2]) {
                    const parentClasses = match[2].split(',').map(cls => cls.trim());
                    parentClasses.forEach(parent => {
                        const parentNode = this.createOrGetNode('class', parent, parent);
                        this.createLink(currentClass.id, parentNode.id);
                    });
                }
                continue;
            }
            
            // Match function definitions
            match = line.match(funcRegex);
            if (match && !line.trim().startsWith(' ')) {
                const funcName = match[1];
                const funcNode = this.createNode('function', `${filepath}:${funcName}`, funcName);
                this.createLink(fileNode.id, funcNode.id);
                
                // Analyze function body for calls to other functions
                this.analyzeCodeBlock(lines, i + 1, fileNode, funcNode);
                continue;
            }
            
            // Match class methods
            match = line.match(methodRegex);
            if (match && currentClass) {
                const methodName = match[1];
                const methodNode = this.createNode('method',
                    `${filepath}:${currentClass.label}.${methodName}`,
                    `${currentClass.label}.${methodName}`);
                this.createLink(currentClass.id, methodNode.id);
                
                // Analyze method body for calls to other functions or methods
                this.analyzeCodeBlock(lines, i + 1, fileNode, methodNode);
            }
        }
    }
    
    /**
     * Analyze a code block (function or method body) for function calls
     * @param {string[]} lines - Lines of Python code
     * @param {number} startLine - Start line of the code block
     * @param {Object} fileNode - File node
     * @param {Object} parentNode - Function or method node
     */
    analyzeCodeBlock(lines, startLine, fileNode, parentNode) {
        // Find indentation level of first line (to determine block boundary)
        let blockIndent = 0;
        let j = startLine;
        
        while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) {
            j++;
        }
        
        if (j < lines.length) {
            const firstLine = lines[j];
            blockIndent = firstLine.length - firstLine.trimLeft().length;
        } else {
            return; // No code in block
        }
        
        // Simple regex to detect function calls
        const callRegex = /([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\s*\(/g;
        
        // Go through the block and find function calls
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if we're still in the block
            if (line.trim() !== '' && !line.trim().startsWith('#')) {
                const indent = line.length - line.trimLeft().length;
                if (indent <= blockIndent) {
                    break; // End of block
                }
            }
            
            // Find function calls
            let callMatch;
            while ((callMatch = callRegex.exec(line)) !== null) {
                const call = callMatch[1];
                
                // Ignore calls to built-in functions like print, len, etc.
                const builtins = ['print', 'len', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'sum', 'min', 'max'];
                if (builtins.includes(call)) {
                    continue;
                }
                
                // Create node for the called function/method
                let callNode;
                if (call.includes('.')) {
                    // It's a method or attribute access
                    callNode = this.createOrGetNode('method', call, call);
                } else {
                    // It's a function
                    callNode = this.createOrGetNode('function', call, call);
                }
                
                // Link the calling function to the called function
                this.createLink(parentNode.id, callNode.id);
            }
        }
    }
    
    /**
     * Create a node for the graph
     * @param {string} type - Node type (file, class, function, etc.)
     * @param {string} id - Unique identifier
     * @param {string} label - Display label
     * @returns {Object} - Created node
     */
    createNode(type, id, label) {
        const node = {
            id: id,
            type: type,
            label: label,
            size: 5, // Default size, will be updated based on connections
            index: this.nodeIndex++
        };
        
        this.nodes.push(node);
        this.nodeMap[id] = node;
        return node;
    }
    
    /**
     * Create a node if it doesn't exist, or get existing one
     * @param {string} type - Node type
     * @param {string} id - Unique identifier
     * @param {string} label - Display label
     * @returns {Object} - Node object
     */
    createOrGetNode(type, id, label) {
        if (this.nodeMap[id]) {
            return this.nodeMap[id];
        }
        return this.createNode(type, id, label);
    }
    
    /**
     * Create a link between nodes
     * @param {string} source - Source node ID
     * @param {string} target - Target node ID
     */
    createLink(source, target) {
        // Don't create self-links
        if (source === target) {
            return;
        }
        
        // Check if link already exists
        const exists = this.links.some(link => 
            link.source === source && link.target === target);
            
        if (!exists) {
            this.links.push({
                source: source,
                target: target
            });
        }
    }
    
    /**
     * Calculate node sizes based on their connections (degree)
     */
    calculateNodeSizes() {
        // Count connections for each node
        const connections = {};
        
        this.links.forEach(link => {
            connections[link.source] = (connections[link.source] || 0) + 1;
            connections[link.target] = (connections[link.target] || 0) + 1;
        });
        
        // Update node sizes based on connections
        this.nodes.forEach(node => {
            const degree = connections[node.id] || 0;
            // Base size + additional size based on connections
            node.size = 5 + (degree * 2);
        });
    }
    
    /**
     * Handle duplicate filenames by updating their labels to include parent directory
     * This ensures files with the same name in different directories are displayed distinctly
     */
    handleDuplicateFilenames() {
        console.log("Starting duplicate filename detection...");
        
        // First, collect all filenames (without paths) to find duplicates
        const filenameCount = {};
        const filenameToNodes = {};
        
        // Count occurrences of each filename and map them to their nodes
        this.nodes.forEach(node => {
            // Only process File type nodes
            if (node.type === 'file') {
                const filename = node.label;
                
                // Initialize counters and maps
                if (!filenameCount[filename]) {
                    filenameCount[filename] = 0;
                    filenameToNodes[filename] = [];
                }
                
                filenameCount[filename]++;
                filenameToNodes[filename].push(node);
            }
        });
        
        // Process duplicate filenames
        for (const [filename, count] of Object.entries(filenameCount)) {
            if (count > 1) {
                console.log(`Found duplicate filename: ${filename} in ${count} locations`);
                
                // Update labels for all nodes with this filename
                filenameToNodes[filename].forEach(node => {
                    // Extract parent directory from the node ID (which is the full path)
                    const path = node.id;
                    let parentDir = '';
                    
                    // Try to extract parent directory using forward slash
                    const forwardSlashParts = path.split('/');
                    if (forwardSlashParts.length > 1) {
                        parentDir = forwardSlashParts[forwardSlashParts.length - 2];
                    } else {
                        // Try with backslash for Windows paths
                        const backslashParts = path.split('\\');
                        if (backslashParts.length > 1) {
                            parentDir = backslashParts[backslashParts.length - 2];
                        }
                    }
                    
                    // Update the label to include parent directory
                    if (parentDir) {
                        const oldLabel = node.label;
                        node.label = `${filename} (${parentDir})`;
                        console.log(`  Updated label: '${oldLabel}' → '${node.label}'`);
                    }
                });
            }
        }
        
        console.log("Duplicate filename handling complete");
    }
}

// Create a global instance
const pythonParser = new PythonParser();