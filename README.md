# Python Codebase Visualizer 🔍

[![GitHub](https://img.shields.io/badge/GitHub-Maloskins-181717?style=for-the-badge&logo=github)](https://github.com/Maloskins)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.6+-blue?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A sleek, lightweight visualization tool that transforms your Python codebase into an interactive network graph, revealing connections between files, classes, methods, and functions. Perfect for identifying "floating nodes" – forgotten or unrealized components in your projects.

![Python Codebase Visualizer Demo](https://via.placeholder.com/800x400?text=Python+Codebase+Visualizer+Demo)

## 🚀 Features

- **Holistic Code Analysis**: See your entire codebase as an interconnected network
- **Relationship Discovery**: Visualize how components connect and interact
- **Floating Node Detection**: Quickly identify unused or disconnected code
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Lightweight**: No heavy dependencies or frameworks
- **Dark Mode UI**: Easy on the eyes for those late-night coding sessions

## 🔧 Installation & Usage

1. **Clone the repository**
   ```bash
   git clone https://github.com/Maloskins/python-codebase-visualizer.git
   cd python-codebase-visualizer
   ```

2. **Start a local server**
   ```bash
   # Using Python's built-in HTTP server
   python -m http.server 8000
   ```

3. **Open in your browser**
   ```
   http://localhost:8000
   ```

4. **Analyze your codebase**
   - Click "Choose Directory" to select a directory of Python files
   - Or click "Load Sample Code" to see the visualizer in action with example files
   - Explore the generated graph, zoom in/out, and click on nodes to see detailed information

## 🧠 The Story Behind

Developed by [Matthew Haskins](https://github.com/Maloskins) during a PyGame project to identify forgotten components of the game, this tool emerged from my research in Geometric Neural Networks. I needed a way to quality-check code from a more holistic perspective – seeing relationships that aren't immediately obvious when looking at individual files.

## 🤖 AI Development Tool

This visualizer serves as an excellent tool for AI agents involved in code generation:

- **Hallucination Prevention**: By visualizing the entire codebase, AI can verify that generated components connect properly to existing code
- **Redundancy Detection**: Easily spot duplicate functionality or unused code that AI might generate
- **Architecture Alignment**: Ensure AI-generated code follows the established project structure and patterns
- **Verification**: Provides a feedback mechanism to verify that AI-generated code integrates as expected

## 💻 Technical Details

- **Front-end**: HTML5, CSS3, and vanilla JavaScript (ES6+)
- **Visualization**: D3.js for the force-directed graph
- **Parser**: Custom JavaScript parser for Python code analysis
- **Responsive Design**: Works on devices of all sizes
- **No Backend Required**: Runs entirely in the browser

## 🤝 Contribute

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Maloskins/python-codebase-visualizer/issues).

## ☕ Support My Work

If you find this tool useful, consider buying me a coffee:

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/maloskins)

## 📝 License

This project is [MIT](LICENSE) licensed.

---

Created with ❤️ by [Matthew Haskins](https://github.com/Maloskins)