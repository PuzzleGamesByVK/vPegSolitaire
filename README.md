# vPegSolitaire 🧩

A modern 3D Peg Solitaire experience built with **Vue 3**, **Vite**, and **Three.js**. This project features a variety of classic layouts, including the **Lazlo's Leap** pack, and an integrated **AI BFS Solver**.

## 🚀 Live Interaction Available
[Play vPegSolitaire on GitHub Pages](https://puzzlegamesbyvk.github.io/vPegSolitaire/)

## ✨ Key Features
* **3D Interactive Board**: Fully rotatable and zoomable 3D board using Three.js `OrbitControls`.
* **AI Solver**: A built-in BFS (Breadth-First Search) engine that finds optimal solutions for any stage.
* **Multiple Stage Packs**: Includes **Tutorial**, **Lazlo**, and **Full** puzzle collections.
* **Par System**: Tracks moves and identifies if you achieved the "Par" (minimum moves) goal.
* **Progress Tracking**: Automatically saves your progress to `localStorage`, distinguishing between Human (⭐) and AI (☆) solutions.

## 🛠️ Tech Stack
* **Framework**: Vue 3 (Composition API)
* **3D Engine**: Three.js
* **Build Tool**: Vite
* **Deployment**: gh-pages

## Notes of version 0.9.1
The project functions very well, however some details are not ready yet in order to reach version 1.0.0. 
To achieve it, we would need a more solid user inderface (sidebar, modals, buttons and spans).
The AI BFS SOLVER works fine with almost every Lazlos Leap layout, but it fails solving the classic larger stages (english, french, german etc...)
If you have a powerful high-end computer you can try it, but you might experience a freezing of the system for 20 seconds.
Certainly! There are chalenges to improve and hopefuly reach version 1.0.0...

## Notes of version 0.9.2
Still solver progress is being displayed via dev console log! We need a custom log in next versions...
Solver has been improved with BFS/DFS hybrid logic.
English can now be solved via DFS. French layout is our next challenge...
