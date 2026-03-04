
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { stages3ar } from './stages.js';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
// src/app.js - Key sections updated
setup() {
    const currentPackIdx = ref(1);
    const currentStageIdx = ref(0);
    const board = ref(new Int8Array(81));
    const moveCount = ref(0);
    const selectedIdx = ref(null);
    const lastMovedIdx = ref(null); // Track the same peg for multi-jumps
    const isSidebarOpen = ref(false);
    const victoryVisible = ref(false); // For the overlay

    // ... (Themes and Three.js variables) ...
	    const themes = {
            classic: { bg: 0x111111, base: 0x444444, peg: 0x00ffff, select: 0xff00ff },
            sunset: { bg: 0x221100, base: 0x553311, peg: 0xffaa00, select: 0xffffff },
            neon: { bg: 0x050520, base: 0x333333, peg: 0x00FFFF, select: 0xFF00FF },
            wood: { bg: 0x221100, base: 0x443322, peg: 0xCCAA88, select: 0xFFFF00 }
        };
        const activeTheme = ref(themes.classic);

        let scene, camera, renderer, raycaster, pointer;

    // DEFINE THIS BEFORE onMounted
    const loadStage = (packIdx, stageIdx) => {
        victoryVisible.value = false;
        currentPackIdx.value = packIdx;
        currentStageIdx.value = stageIdx;
        moveCount.value = 0;
        selectedIdx.value = null;
        lastMovedIdx.value = null;
        
        board.value = new Int8Array(stages3ar[packIdx][stageIdx][3]);
        if (scene) renderThreeBoard();
    };

    const executeJump = (start, end) => {
        const dx = (end % 9) - (start % 9);
        const dy = Math.floor(end / 9) - Math.floor(start / 9);

        if ((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0)) {
            const mid = start + (dx / 2) + (dy / 2 * 9);
            if (board.value[mid] === 1) {
                board.value[start] = 0;
                board.value[mid] = 0;
                board.value[end] = 1;

                // SPECIAL MOVE LOGIC:
                // If it's the SAME peg jumping again, don't increase moveCount
                if (lastMovedIdx.value !== start) {
                    moveCount.value++;
                }
                
                selectedIdx.value = end; 
                lastMovedIdx.value = end; 
                checkWin();
            }
        }
    };

    const checkWin = () => {
        const remaining = board.value.filter(v => v === 1).length;
        if (remaining === 1) {
            victoryVisible.value = true;
            // Auto-advance after 2.5 seconds
            setTimeout(() => {
                const next = (currentStageIdx.value + 1) % stages3ar[currentPackIdx.value].length;
                loadStage(currentPackIdx.value, next);
            }, 2500);
        }
    };

        const renderThreeBoard = () => {
            const toRemove = scene.children.filter(obj => obj.name && (obj.name[0] === 'b' || obj.name[0] === 'p'));
            toRemove.forEach(obj => scene.remove(obj));

            board.value.forEach((val, i) => {
                if (val === -1) return; // Outside
                const x = (i % 9) - 4;
                const y = 4 - Math.floor(i / 9);

                // Base Mesh
                const bMesh = new THREE.Mesh(
                    new THREE.CircleGeometry(0.4, 32),
                    new THREE.MeshBasicMaterial({ color: activeTheme.value.base })
                );
                bMesh.position.set(x, y, 0);
                bMesh.name = `b${i}`;
                scene.add(bMesh);

                // Peg Mesh
                if (val === 1) {
                    const isSel = selectedIdx.value === i;
                    const pMesh = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16),
                        new THREE.MeshLambertMaterial({ color: isSel ? activeTheme.value.select : activeTheme.value.peg })
                    );
                    pMesh.position.set(x, y, 0.25);
                    pMesh.rotation.x = Math.PI / 2;
                    pMesh.name = `p${i}`;
                    scene.add(pMesh);
                }
            });
        };

    onMounted(() => {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(activeTheme.value.bg);
            camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
            camera.position.set(0, 0, 10);
            renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            new OrbitControls(camera, renderer.domElement);
            raycaster = new THREE.Raycaster();
            pointer = new THREE.Vector2();
            scene.add(new THREE.AmbientLight(0xffffff, 1));
            window.addEventListener('mousedown', handleInput);
            loadStage(2, 0); // Load classic english layout
            const animate = () => { requestAnimationFrame(animate); renderer.render(scene, camera); };
            animate();
    });

    return { 
        stageName: computed(() => stages3ar[currentPackIdx.value][currentStageIdx.value][1]),
        parValue: computed(() => stages3ar[currentPackIdx.value][currentStageIdx.value][0]),
        moveCount, isSidebarOpen, victoryVisible, loadStage, currentPackIdx, currentStageIdx, stages3ar 
    };
}
}).mount('#app');
