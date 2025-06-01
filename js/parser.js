/**
 * Enhanced Python Code Parser
 * Parses Python code to extract classes, functions, imports, and advanced metrics
 * Uses Pyodide to leverage Python's AST module for accurate parsing
 */
class PythonParser {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.nodeMap = {};
        this.nodeIndex = 0;
        this.pythonFiles = new Set();
        this.filePathMap = {};
        this.pyodideReady = false;
        this.pyodide = null;
        this.metrics = {}; // Store code metrics
        this.docstrings = {}; // Store docstrings
        this.testFiles = new Set(); // Track test files
        this.initializePyodide();
    }

    /**
     * Initialize Pyodide for Python AST parsing
     */
    async initializePyodide() {
        try {
            console.log("Loading Pyodide...");
            this.pyodide = await loadPyodide();
            await this.pyodide.loadPackage("micropip");
            const micropip = this.pyodide.pyimport("micropip");
            
            await this.pyodide.runPythonAsync(`
                import sys
                import json
                import ast
                import re
                
                class CodeAnalyzer(ast.NodeVisitor):
                    """Advanced Python code analyzer using AST"""
                    
                    def __init__(self):
                        self.imports = []
                        self.from_imports = []
                        self.classes = []
                        self.functions = []
                        self.metrics = {
                            'lines_of_code': 0,
                            'lines_of_comments': 0,
                            'cyclomatic_complexity': 1,
                            'max_nesting_depth': 0,
                            'function_count': 0,
                            'class_count': 0,
                            'has_docstrings': False,
                            'test_count': 0,
                            'assertion_count': 0,
                            'global_variables': [],
                            'constants': [],
                            'type_annotations': 0,
                            'decorators': []
                        }
                        self.current_depth = 0
                        self.docstrings = {}
                        self.todo_comments = []
                        self.function_calls = {}
                        self.unused_imports = set()
                        self.used_names = set()
                    
                    def visit_Import(self, node):
                        for alias in node.names:
                            self.imports.append({
                                'name': alias.name,
                                'asname': alias.asname,
                                'line': node.lineno
                            })
                            if alias.asname:
                                self.unused_imports.add(alias.asname)
                            else:
                                self.unused_imports.add(alias.name.split('.')[0])
                        self.generic_visit(node)
                    
                    def visit_ImportFrom(self, node):
                        module = node.module or ''
                        for alias in node.names:
                            self.from_imports.append({
                                'module': module,
                                'name': alias.name,
                                'asname': alias.asname,
                                'line': node.lineno
                            })
                            if alias.name != '*':
                                if alias.asname:
                                    self.unused_imports.add(alias.asname)
                                else:
                                    self.unused_imports.add(alias.name)
                        self.generic_visit(node)
                    
                    def visit_ClassDef(self, node):
                        self.metrics['class_count'] += 1
                        
                        # Extract class docstring
                        docstring = ast.get_docstring(node)
                        if docstring:
                            self.docstrings[node.name] = docstring
                            self.metrics['has_docstrings'] = True
                        
                        # Extract decorators
                        decorators = [self._get_decorator_name(d) for d in node.decorator_list]
                        
                        class_info = {
                            'name': node.name,
                            'bases': [self._get_name(base) for base in node.bases],
                            'methods': [],
                            'properties': [],
                            'class_variables': [],
                            'lineno': node.lineno,
                            'end_lineno': getattr(node, 'end_lineno', node.lineno),
                            'decorators': decorators,
                            'docstring': docstring,
                            'is_abstract': any('ABC' in self._get_name(base) for base in node.bases),
                            'complexity': 0
                        }
                        
                        # Visit class body
                        old_depth = self.current_depth
                        self.current_depth += 1
                        
                        for item in node.body:
                            if isinstance(item, ast.FunctionDef):
                                method_info = self._extract_function_info(item, is_method=True)
                                method_info['parent_class'] = node.name
                                
                                # Check if it's a property
                                if any(d == 'property' for d in method_info['decorators']):
                                    class_info['properties'].append(method_info['name'])
                                else:
                                    class_info['methods'].append(method_info)
                                    
                                class_info['complexity'] += method_info['complexity']
                            
                            elif isinstance(item, ast.Assign):
                                # Class variables
                                for target in item.targets:
                                    if isinstance(target, ast.Name):
                                        class_info['class_variables'].append(target.id)
                        
                        self.current_depth = old_depth
                        self.classes.append(class_info)
                        self.generic_visit(node)
                    
                    def visit_FunctionDef(self, node):
                        # Only process top-level functions
                        if isinstance(node.parent, ast.Module):
                            func_info = self._extract_function_info(node)
                            self.functions.append(func_info)
                            
                            # Check if it's a test function
                            if node.name.startswith('test_') or node.name.endswith('_test'):
                                self.metrics['test_count'] += 1
                        
                        self.generic_visit(node)
                    
                    def visit_Name(self, node):
                        # Track used names to identify unused imports
                        if isinstance(node.ctx, (ast.Load, ast.Store)):
                            self.used_names.add(node.id)
                        self.generic_visit(node)
                    
                    def visit_Attribute(self, node):
                        # Track attribute access
                        if isinstance(node.ctx, ast.Load):
                            base_name = self._get_base_name(node)
                            if base_name:
                                self.used_names.add(base_name)
                        self.generic_visit(node)
                    
                    def visit_If(self, node):
                        self.metrics['cyclomatic_complexity'] += 1
                        self._update_depth()
                        self.generic_visit(node)
                    
                    def visit_While(self, node):
                        self.metrics['cyclomatic_complexity'] += 1
                        self._update_depth()
                        self.generic_visit(node)
                    
                    def visit_For(self, node):
                        self.metrics['cyclomatic_complexity'] += 1
                        self._update_depth()
                        self.generic_visit(node)
                    
                    def visit_ExceptHandler(self, node):
                        self.metrics['cyclomatic_complexity'] += 1
                        self.generic_visit(node)
                    
                    def visit_Assert(self, node):
                        self.metrics['assertion_count'] += 1
                        self.generic_visit(node)
                    
                    def visit_Global(self, node):
                        self.metrics['global_variables'].extend(node.names)
                        self.generic_visit(node)
                    
                    def visit_AnnAssign(self, node):
                        # Type annotations
                        self.metrics['type_annotations'] += 1
                        self.generic_visit(node)
                    
                    def _update_depth(self):
                        self.metrics['max_nesting_depth'] = max(
                            self.metrics['max_nesting_depth'],
                            self.current_depth
                        )
                    
                    def _get_name(self, node):
                        """Extract name from various AST node types"""
                        if isinstance(node, ast.Name):
                            return node.id
                        elif isinstance(node, ast.Attribute):
                            return f"{self._get_name(node.value)}.{node.attr}"
                        elif isinstance(node, ast.Call):
                            return self._get_name(node.func)
                        elif isinstance(node, ast.Subscript):
                            return self._get_name(node.value)
                        elif isinstance(node, str):
                            return node
                        else:
                            return str(type(node).__name__)
                    
                    def _get_base_name(self, node):
                        """Get the base name from an attribute chain"""
                        if isinstance(node, ast.Name):
                            return node.id
                        elif isinstance(node, ast.Attribute):
                            return self._get_base_name(node.value)
                        return None
                    
                    def _get_decorator_name(self, node):
                        """Extract decorator name"""
                        if isinstance(node, ast.Name):
                            return node.id
                        elif isinstance(node, ast.Attribute):
                            return node.attr
                        elif isinstance(node, ast.Call):
                            return self._get_decorator_name(node.func)
                        return str(node)
                    
                    def _extract_function_info(self, node, is_method=False):
                        """Extract detailed function/method information"""
                        self.metrics['function_count'] += 1
                        
                        # Get docstring
                        docstring = ast.get_docstring(node)
                        if docstring:
                            self.docstrings[node.name] = docstring
                            self.metrics['has_docstrings'] = True
                        
                        # Extract decorators
                        decorators = [self._get_decorator_name(d) for d in node.decorator_list]
                        self.metrics['decorators'].extend(decorators)
                        
                        # Extract parameters with type annotations
                        params = []
                        for arg in node.args.args:
                            param_info = {'name': arg.arg}
                            if arg.annotation:
                                param_info['type'] = self._get_name(arg.annotation)
                                self.metrics['type_annotations'] += 1
                            params.append(param_info)
                        
                        # Extract return type annotation
                        return_type = None
                        if node.returns:
                            return_type = self._get_name(node.returns)
                            self.metrics['type_annotations'] += 1
                        
                        # Calculate function complexity
                        complexity = self._calculate_function_complexity(node)
                        
                        # Extract function calls
                        function_calls = self._extract_function_calls(node)
                        
                        return {
                            'name': node.name,
                            'params': params,
                            'decorators': decorators,
                            'docstring': docstring,
                            'return_type': return_type,
                            'lineno': node.lineno,
                            'end_lineno': getattr(node, 'end_lineno', node.lineno),
                            'complexity': complexity,
                            'function_calls': function_calls,
                            'is_async': isinstance(node, ast.AsyncFunctionDef),
                            'is_generator': self._is_generator(node),
                            'is_method': is_method,
                            'is_static': 'staticmethod' in decorators,
                            'is_class_method': 'classmethod' in decorators,
                            'is_property': 'property' in decorators
                        }
                    
                    def _calculate_function_complexity(self, node):
                        """Calculate cyclomatic complexity for a function"""
                        complexity = 1
                        for child in ast.walk(node):
                            if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                                complexity += 1
                            elif isinstance(child, ast.BoolOp):
                                complexity += len(child.values) - 1
                        return complexity
                    
                    def _extract_function_calls(self, node):
                        """Extract all function calls within a function"""
                        calls = []
                        for child in ast.walk(node):
                            if isinstance(child, ast.Call):
                                call_name = self._get_name(child.func)
                                if call_name and not call_name.startswith('_'):
                                    calls.append(call_name)
                        return list(set(calls))
                    
                    def _is_generator(self, node):
                        """Check if function is a generator"""
                        for child in ast.walk(node):
                            if isinstance(child, (ast.Yield, ast.YieldFrom)):
                                return True
                        return False
                    
                    def finalize_analysis(self):
                        """Finalize analysis and clean up data"""
                        # Remove used imports from unused_imports set
                        self.unused_imports = self.unused_imports - self.used_names
                        
                        # Convert sets to lists for JSON serialization
                        self.metrics['unused_imports'] = list(self.unused_imports)
                        
                        # Calculate code quality score
                        self.metrics['quality_score'] = self._calculate_quality_score()
                    
                    def _calculate_quality_score(self):
                        """Calculate a code quality score based on various metrics"""
                        score = 100
                        
                        # Penalize for complexity
                        if self.metrics['cyclomatic_complexity'] > 10:
                            score -= min(20, (self.metrics['cyclomatic_complexity'] - 10) * 2)
                        
                        # Penalize for deep nesting
                        if self.metrics['max_nesting_depth'] > 4:
                            score -= min(15, (self.metrics['max_nesting_depth'] - 4) * 5)
                        
                        # Reward for docstrings
                        if not self.metrics['has_docstrings']:
                            score -= 10
                        
                        # Reward for type annotations
                        if self.metrics['function_count'] > 0:
                            annotation_ratio = self.metrics['type_annotations'] / self.metrics['function_count']
                            score += min(10, int(annotation_ratio * 10))
                        
                        # Penalize for unused imports
                        if self.metrics['unused_imports']:
                            score -= min(10, len(self.metrics['unused_imports']) * 2)
                        
                        return max(0, score)
                
                def parse_python_code(code, filename):
                    """Parse Python code and extract comprehensive information"""
                    try:
                        # Parse code into AST
                        tree = ast.parse(code, filename=filename)
                        
                        # Add parent references
                        for node in ast.walk(tree):
                            for child in ast.iter_child_nodes(node):
                                child.parent = node
                        
                        # Count lines
                        lines = code.split('\\n')
                        total_lines = len(lines)
                        comment_lines = sum(1 for line in lines if line.strip().startswith('#'))
                        blank_lines = sum(1 for line in lines if not line.strip())
                        code_lines = total_lines - comment_lines - blank_lines
                        
                        # Analyze with visitor
                        analyzer = CodeAnalyzer()
                        analyzer.metrics['total_lines'] = total_lines
                        analyzer.metrics['lines_of_code'] = code_lines
                        analyzer.metrics['lines_of_comments'] = comment_lines
                        analyzer.metrics['blank_lines'] = blank_lines
                        
                        # Check if it's a test file
                        is_test_file = ('test_' in filename.lower() or 
                                       '_test' in filename.lower() or
                                       '/test' in filename.lower() or
                                       '\\\\test' in filename.lower())
                        
                        analyzer.visit(tree)
                        analyzer.finalize_analysis()
                        
                        # Find TODO comments
                        todo_pattern = re.compile(r'#\\s*(TODO|FIXME|XXX|HACK|BUG):\\s*(.+)', re.IGNORECASE)
                        for i, line in enumerate(lines, 1):
                            match = todo_pattern.search(line)
                            if match:
                                analyzer.todo_comments.append({
                                    'type': match.group(1).upper(),
                                    'message': match.group(2).strip(),
                                    'line': i
                                })
                        
                        return {
                            'imports': analyzer.imports,
                            'from_imports': analyzer.from_imports,
                            'classes': analyzer.classes,
                            'functions': analyzer.functions,
                            'metrics': analyzer.metrics,
                            'docstrings': analyzer.docstrings,
                            'todo_comments': analyzer.todo_comments,
                            'is_test_file': is_test_file
                        }
                    
                    except SyntaxError as e:
                        return {
                            'error': f"Syntax error in {filename}: {str(e)}",
                            'line': e.lineno,
                            'imports': [],
                            'from_imports': [],
                            'classes': [],
                            'functions': [],
                            'metrics': {},
                            'docstrings': {},
                            'todo_comments': [],
                            'is_test_file': False
                        }
                    except Exception as e:
                        return {
                            'error': f"Error parsing {filename}: {str(e)}",
                            'imports': [],
                            'from_imports': [],
                            'classes': [],
                            'functions': [],
                            'metrics': {},
                            'docstrings': {},
                            'todo_comments': [],
                            'is_test_file': False
                        }
            `);
            
            this.pyodideReady = true;
            console.log("Pyodide initialized successfully with advanced analysis");
        } catch (error) {
            console.error("Failed to initialize Pyodide:", error);
            this.pyodideReady = false;
        }
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
        this.metrics = {};
        this.docstrings = {};
        this.testFiles.clear();
        
        // Make sure Pyodide is ready
        if (!this.pyodideReady) {
            try {
                await this.initializePyodide();
            } catch (error) {
                console.error("Could not initialize Pyodide:", error);
            }
        }
        
        // First, collect all Python file names
        for (const file of files) {
            if (file.name.endsWith('.py')) {
                const moduleName = file.name.replace('.py', '');
                this.pythonFiles.add(moduleName);
                
                // Check if it's a test file
                if (file.name.includes('test_') || file.name.includes('_test')) {
                    this.testFiles.add(file.name);
                }
            }
        }
        
        // Parse each Python file
        const totalFiles = files.length;
        let processedFiles = 0;
        
        for (const file of files) {
            if (file.name.endsWith('.py')) {
                const content = await this.readFile(file);
                const filepath = file.webkitRelativePath || file.name;
                await this.parseFile(file.name, content, filepath);
                
                processedFiles++;
                // Dispatch progress event
                this.dispatchProgressEvent(processedFiles, totalFiles);
            }
        }
        
        // Post-processing
        this.handleDuplicateFilenames();
        this.calculateNodeSizes();
        this.calculateOverallMetrics();
        
        return {
            nodes: this.nodes,
            links: this.links,
            metrics: this.metrics,
            testFiles: Array.from(this.testFiles)
        };
    }
    
    /**
     * Dispatch progress event for UI updates
     */
    dispatchProgressEvent(current, total) {
        const event = new CustomEvent('parseProgress', {
            detail: {
                current,
                total,
                percentage: Math.round((current / total) * 100)
            }
        });
        document.dispatchEvent(event);
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
    async parseFile(filename, content, filepath) {
        console.log(`Parsing file: ${filename}, filepath: ${filepath}`);
        
        // Track this filename and its path
        if (!this.filePathMap[filename]) {
            this.filePathMap[filename] = [];
        }
        this.filePathMap[filename].push(filepath);
        
        // Create a node for the file
        const fileNode = this.createNode('file', filepath, filename);
        
        if (this.pyodideReady) {
            try {
                // Use Pyodide to parse the Python code with AST
                const result = await this.pyodide.runPythonAsync(`
                    parse_python_code(${JSON.stringify(content)}, ${JSON.stringify(filename)})
                `);
                
                const parseResult = result.toJs();
                
                // Store metrics
                if (parseResult.metrics) {
                    this.metrics[filepath] = parseResult.metrics;
                    fileNode.metrics = parseResult.metrics;
                    fileNode.quality_score = parseResult.metrics.quality_score || 0;
                    fileNode.is_test_file = parseResult.is_test_file;
                }
                
                // Store docstrings
                if (parseResult.docstrings) {
                    this.docstrings[filepath] = parseResult.docstrings;
                }
                
                // Add TODO comments as special nodes
                if (parseResult.todo_comments && parseResult.todo_comments.length > 0) {
                    fileNode.todo_count = parseResult.todo_comments.length;
                    parseResult.todo_comments.forEach(todo => {
                        const todoNode = this.createNode(
                            'todo',
                            `${filepath}:TODO:${todo.line}`,
                            `${todo.type}: ${todo.message}`
                        );
                        todoNode.line = todo.line;
                        todoNode.type = todo.type;
                        this.createLink(fileNode.id, todoNode.id);
                    });
                }
                
                // Check if there was an error during parsing
                if (parseResult.error) {
                    console.error(parseResult.error);
                    fileNode.has_error = true;
                    fileNode.error = parseResult.error;
                    // Fall back to regex-based parsing
                    this.parseWithRegex(content, fileNode, filename, filepath);
                    return;
                }
                
                // Process imports
                this.processImports(parseResult, fileNode);
                
                // Process classes and functions
                this.processClassesAndFunctions(parseResult, fileNode, filename, filepath);
                
            } catch (error) {
                console.error("Error using Pyodide for parsing:", error);
                this.parseWithRegex(content, fileNode, filename, filepath);
            }
        } else {
            this.parseWithRegex(content, fileNode, filename, filepath);
        }
    }
    
    /**
     * Process imports from AST parsing result
     * @param {Object} parseResult - Result from AST parsing
     * @param {Object} fileNode - File node to link imports to
     */
    processImports(parseResult, fileNode) {
        // Process regular imports
        parseResult.imports.forEach(importInfo => {
            const importName = importInfo.name;
            const importNode = this.createOrGetNode('import', importName, importName);
            this.createLink(fileNode.id, importNode.id);
        });
        
        // Process from imports
        parseResult.from_imports.forEach(importInfo => {
            const module = importInfo.module;
            const importName = importInfo.name;
            
            let moduleNode;
            
            // Check if this module corresponds to a Python file in the project
            if (this.pythonFiles.has(module)) {
                const fileName = `${module}.py`;
                let foundNode = null;
                if (this.filePathMap[fileName]) {
                    const filePath = this.filePathMap[fileName][0];
                    foundNode = this.nodeMap[filePath];
                }
                moduleNode = foundNode || this.createOrGetNode('module', module, module);
            } else {
                moduleNode = this.createOrGetNode('module', module, module);
            }
            
            this.createLink(fileNode.id, moduleNode.id);
            
            if (importName !== '*') {
                const importNode = this.createOrGetNode('import', `${module}.${importName}`, importName);
                this.createLink(moduleNode.id, importNode.id);
                this.createLink(fileNode.id, importNode.id);
            }
        });
    }
    
    /**
     * Process classes and functions from AST parsing result
     * @param {Object} parseResult - Result from AST parsing
     * @param {Object} fileNode - File node to link classes/functions to
     * @param {string} filename - Name of the file
     * @param {string} filepath - Full path of the file
     */
    processClassesAndFunctions(parseResult, fileNode, filename, filepath) {
        // Process classes
        parseResult.classes.forEach(classInfo => {
            const className = classInfo.name;
            const classNode = this.createNode('class', `${filepath}:${className}`, className);
            classNode.complexity = classInfo.complexity || 0;
            classNode.is_abstract = classInfo.is_abstract || false;
            classNode.decorators = classInfo.decorators || [];
            classNode.docstring = classInfo.docstring;
            classNode.methods_count = classInfo.methods.length;
            classNode.properties_count = (classInfo.properties || []).length;
            
            this.createLink(fileNode.id, classNode.id);
            
            // Process parent classes
            classInfo.bases.forEach(parent => {
                const parentNode = this.createOrGetNode('class', parent, parent);
                this.createLink(classNode.id, parentNode.id);
            });
            
            // Process methods
            classInfo.methods.forEach(methodInfo => {
                const methodName = methodInfo.name;
                const methodNode = this.createNode(
                    'method',
                    `${filepath}:${className}.${methodName}`,
                    `${className}.${methodName}`
                );
                
                // Add method metadata
                methodNode.complexity = methodInfo.complexity || 1;
                methodNode.is_async = methodInfo.is_async || false;
                methodNode.is_generator = methodInfo.is_generator || false;
                methodNode.is_static = methodInfo.is_static || false;
                methodNode.is_class_method = methodInfo.is_class_method || false;
                methodNode.is_property = methodInfo.is_property || false;
                methodNode.has_docstring = !!methodInfo.docstring;
                methodNode.params = methodInfo.params || [];
                methodNode.return_type = methodInfo.return_type;
                
                this.createLink(classNode.id, methodNode.id);
                
                // Process function calls within the method
                methodInfo.function_calls.forEach(call => {
                    let callNode;
                    if (call.includes('.')) {
                        callNode = this.createOrGetNode('method', call, call);
                    } else {
                        callNode = this.createOrGetNode('function', call, call);
                    }
                    this.createLink(methodNode.id, callNode.id);
                });
            });
        });
        
        // Process top-level functions
        parseResult.functions.forEach(funcInfo => {
            const funcName = funcInfo.name;
            const funcNode = this.createNode('function', `${filepath}:${funcName}`, funcName);
            
            // Add function metadata
            funcNode.complexity = funcInfo.complexity || 1;
            funcNode.is_async = funcInfo.is_async || false;
            funcNode.is_generator = funcInfo.is_generator || false;
            funcNode.has_docstring = !!funcInfo.docstring;
            funcNode.params = funcInfo.params || [];
            funcNode.return_type = funcInfo.return_type;
            funcNode.decorators = funcInfo.decorators || [];
            
            this.createLink(fileNode.id, funcNode.id);
            
            // Process function calls
            funcInfo.function_calls.forEach(call => {
                let callNode;
                if (call.includes('.')) {
                    callNode = this.createOrGetNode('method', call, call);
                } else {
                    callNode = this.createOrGetNode('function', call, call);
                }
                this.createLink(funcNode.id, callNode.id);
            });
        });
    }
    
    /**
     * Fallback to regex-based parsing if AST parsing fails
     * @param {string} content - Content of the file
     * @param {Object} fileNode - File node
     * @param {string} filename - Name of the file
     * @param {string} filepath - Full path of the file
     */
    parseWithRegex(content, fileNode, filename, filepath) {
        console.log(`Falling back to regex-based parsing for ${filename}`);
        
        const lines = content.split('\n');
        
        // Basic metrics for regex parsing
        const metrics = {
            total_lines: lines.length,
            lines_of_code: lines.filter(l => l.trim() && !l.trim().startsWith('#')).length,
            lines_of_comments: lines.filter(l => l.trim().startsWith('#')).length,
            blank_lines: lines.filter(l => !l.trim()).length
        };
        
        this.metrics[filepath] = metrics;
        fileNode.metrics = metrics;
        
        this.parseImports(lines, fileNode);
        this.parseClassesAndFunctions(lines, fileNode, filename, filepath);
    }
    
    /**
     * Parse import statements using regex (fallback method)
     * @param {string[]} lines - Lines of Python code
     * @param {Object} fileNode - File node to link imports to
     */
    parseImports(lines, fileNode) {
        const importRegex = /^import\s+([a-zA-Z0-9_.,\s]+)/;
        const fromImportRegex = /^from\s+([a-zA-Z0-9_.]+)\s+import\s+([a-zA-Z0-9_.,\s*]+)/;
        
        lines.forEach(line => {
            line = line.trim();
            
            let match = line.match(importRegex);
            if (match) {
                const imports = match[1].split(',').map(imp => imp.trim());
                imports.forEach(imp => {
                    const importNode = this.createOrGetNode('import', imp, imp);
                    this.createLink(fileNode.id, importNode.id);
                });
                return;
            }
            
            match = line.match(fromImportRegex);
            if (match) {
                const module = match[1].trim();
                const imports = match[2].split(',').map(imp => imp.trim());
                
                let moduleNode;
                
                if (this.pythonFiles.has(module)) {
                    const fileName = `${module}.py`;
                    let foundNode = null;
                    if (this.filePathMap[fileName]) {
                        const filePath = this.filePathMap[fileName][0];
                        foundNode = this.nodeMap[filePath];
                    }
                    moduleNode = foundNode || this.createOrGetNode('module', module, module);
                } else {
                    moduleNode = this.createOrGetNode('module', module, module);
                }
                
                this.createLink(fileNode.id, moduleNode.id);
                
                imports.forEach(imp => {
                    if (imp !== '*') {
                        const importNode = this.createOrGetNode('import', `${module}.${imp}`, imp);
                        this.createLink(moduleNode.id, importNode.id);
                        this.createLink(fileNode.id, importNode.id);
                    }
                });
            }
        });
    }
    
    /**
     * Parse classes and functions using regex
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
            
            let match = line.match(classRegex);
            if (match) {
                const className = match[1];
                currentClass = this.createNode('class', `${filepath}:${className}`, className);
                this.createLink(fileNode.id, currentClass.id);
                
                if (match[2]) {
                    const parentClasses = match[2].split(',').map(cls => cls.trim());
                    parentClasses.forEach(parent => {
                        const parentNode = this.createOrGetNode('class', parent, parent);
                        this.createLink(currentClass.id, parentNode.id);
                    });
                }
                continue;
            }
            
            match = line.match(funcRegex);
            if (match && !line.trim().startsWith(' ')) {
                const funcName = match[1];
                const funcNode = this.createNode('function', `${filepath}:${funcName}`, funcName);
                this.createLink(fileNode.id, funcNode.id);
                this.analyzeCodeBlock(lines, i + 1, fileNode, funcNode);
                continue;
            }
            
            match = line.match(methodRegex);
            if (match && currentClass) {
                const methodName = match[1];
                const methodNode = this.createNode('method',
                    `${filepath}:${currentClass.label}.${methodName}`,
                    `${currentClass.label}.${methodName}`);
                this.createLink(currentClass.id, methodNode.id);
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
        let blockIndent = 0;
        let j = startLine;
        
        while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) {
            j++;
        }
        
        if (j < lines.length) {
            const firstLine = lines[j];
            blockIndent = firstLine.length - firstLine.trimLeft().length;
        } else {
            return;
        }
        
        const callRegex = /([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\s*\(/g;
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.trim() !== '' && !line.trim().startsWith('#')) {
                const indent = line.length - line.trimLeft().length;
                if (indent <= blockIndent) {
                    break;
                }
            }
            
            let callMatch;
            while ((callMatch = callRegex.exec(line)) !== null) {
                const call = callMatch[1];
                
                const builtins = ['print', 'len', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'sum', 'min', 'max'];
                if (builtins.includes(call)) {
                    continue;
                }
                
                let callNode;
                if (call.includes('.')) {
                    callNode = this.createOrGetNode('method', call, call);
                } else {
                    callNode = this.createOrGetNode('function', call, call);
                }
                
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
            size: 5,
            index: this.nodeIndex++,
            metrics: {}
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
        if (source === target) {
            return;
        }
        
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
     * Calculate node sizes based on their connections and metrics
     */
    calculateNodeSizes() {
        const connections = {};
        
        this.links.forEach(link => {
            connections[link.source] = (connections[link.source] || 0) + 1;
            connections[link.target] = (connections[link.target] || 0) + 1;
        });
        
        this.nodes.forEach(node => {
            const degree = connections[node.id] || 0;
            let baseSize = 5;
            
            // Adjust size based on node type and metrics
            if (node.type === 'file') {
                // Size based on lines of code
                if (node.metrics && node.metrics.lines_of_code) {
                    baseSize = 5 + Math.min(15, node.metrics.lines_of_code / 50);
                }
            } else if (node.type === 'class') {
                // Size based on complexity and method count
                baseSize = 7 + (node.methods_count || 0) * 0.5;
                if (node.complexity) {
                    baseSize += Math.min(5, node.complexity / 10);
                }
            } else if (node.type === 'function' || node.type === 'method') {
                // Size based on complexity
                if (node.complexity) {
                    baseSize = 5 + Math.min(10, node.complexity);
                }
            }
            
            // Add connection influence
            node.size = baseSize + (degree * 1.5);
        });
    }
    
    /**
     * Handle duplicate filenames by updating their labels
     */
    handleDuplicateFilenames() {
        const filenameCount = {};
        const filenameToNodes = {};
        
        this.nodes.forEach(node => {
            if (node.type === 'file') {
                const filename = node.label;
                
                if (!filenameCount[filename]) {
                    filenameCount[filename] = 0;
                    filenameToNodes[filename] = [];
                }
                
                filenameCount[filename]++;
                filenameToNodes[filename].push(node);
            }
        });
        
        for (const [filename, count] of Object.entries(filenameCount)) {
            if (count > 1) {
                filenameToNodes[filename].forEach(node => {
                    const path = node.id;
                    let parentDir = '';
                    
                    const forwardSlashParts = path.split('/');
                    if (forwardSlashParts.length > 1) {
                        parentDir = forwardSlashParts[forwardSlashParts.length - 2];
                    } else {
                        const backslashParts = path.split('\\');
                        if (backslashParts.length > 1) {
                            parentDir = backslashParts[backslashParts.length - 2];
                        }
                    }
                    
                    if (parentDir) {
                        node.label = `${filename} (${parentDir})`;
                    }
                });
            }
        }
    }
    
    /**
     * Calculate overall codebase metrics
     */
    calculateOverallMetrics() {
        const overall = {
            total_files: 0,
            total_lines: 0,
            total_code_lines: 0,
            total_comment_lines: 0,
            total_functions: 0,
            total_classes: 0,
            total_complexity: 0,
            avg_complexity: 0,
            max_complexity: 0,
            total_todos: 0,
            test_coverage_estimate: 0,
            files_with_errors: 0,
            quality_scores: []
        };
        
        Object.entries(this.metrics).forEach(([filepath, metrics]) => {
            overall.total_files++;
            overall.total_lines += metrics.total_lines || 0;
            overall.total_code_lines += metrics.lines_of_code || 0;
            overall.total_comment_lines += metrics.lines_of_comments || 0;
            overall.total_functions += metrics.function_count || 0;
            overall.total_classes += metrics.class_count || 0;
            overall.total_complexity += metrics.cyclomatic_complexity || 0;
            overall.max_complexity = Math.max(overall.max_complexity, metrics.cyclomatic_complexity || 0);
            
            if (metrics.quality_score) {
                overall.quality_scores.push(metrics.quality_score);
            }
        });
        
        // Calculate averages
        if (overall.total_files > 0) {
            overall.avg_complexity = overall.total_complexity / overall.total_functions || 0;
            overall.avg_quality_score = overall.quality_scores.length > 0 
                ? overall.quality_scores.reduce((a, b) => a + b, 0) / overall.quality_scores.length 
                : 0;
        }
        
        // Calculate test coverage estimate
        const testFileCount = this.testFiles.size;
        const regularFileCount = overall.total_files - testFileCount;
        overall.test_coverage_estimate = regularFileCount > 0 
            ? Math.round((testFileCount / regularFileCount) * 100) 
            : 0;
        
        // Count TODOs
        this.nodes.forEach(node => {
            if (node.type === 'todo') {
                overall.total_todos++;
            }
            if (node.has_error) {
                overall.files_with_errors++;
            }
        });
        
        this.metrics.overall = overall;
    }
}

// Create a global instance
const pythonParser = new PythonParser();