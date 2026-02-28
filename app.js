import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LaslosLeapRaw, LazloPars, convertTo9x9 } from './stages.js';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
    const currentStageIdx = ref(0);
    const board = ref(new Int8Array(81));
    const moveCount = ref(0);

    // FIX: Use .value inside computed functions
    const stageName = computed(() => {
        const stage = LaslosLeapRaw[currentStageIdx.value];
        return stage ? stage[1] : "Loading...";
    });

    const currentPar = computed(() => {
        return LazloPars[currentStageIdx.value] || 0;
    });
        
        const themes = {
            classic: { bg: 0x111111, base: 0x444444, peg: 0x00ffff, select: 0xff00ff },
            sunset: { bg: 0x221100, base: 0x553311, peg: 0xffaa00, select: 0xffffff },
            neon: { bg: 0x050520, base: 0x333333, peg: 0x00FFFF, select: 0xFF00FF },
            wood: { bg: 0x221100, base: 0x443322, peg: 0xCCAA88, select: 0xFFFF00 }
        };
        const activeTheme = ref(themes.classic);

        let scene, camera, renderer, raycaster, pointer;

        //const stageName = computed(() => LaslosLeapRaw[currentStageIdx.value][1]);
        //const currentPar = computed(() => LazloPars[currentStageIdx.value]);

        const loadStage = (idx) => {
            currentStageIdx.value = idx;
            moveCount.value = 0;
            selectedIdx.value = null;
            // Get pegs from index 3 of the raw array
            board.value = convertTo9x9(LaslosLeapRaw[idx][3]); // [cite: 1]
            renderThreeBoard();
        };

        const renderThreeBoard = () => {
            if (!scene) return;
            // Clear existing game objects
            scene.children.filter(obj => obj.name && (obj.name.startsWith('b') || obj.name.startsWith('p')))
                          .forEach(obj => scene.remove(obj));

            board.value.forEach((val, i) => {
                if (val === -1) return;
                const x = (i % 9) - 4;
                const y = 4 - Math.floor(i / 9);

                // Create Base
                const bGeo = new THREE.CircleGeometry(0.4, 32);
                const bMat = new THREE.MeshBasicMaterial({ color: activeTheme.value.base });
                const bMesh = new THREE.Mesh(bGeo, bMat);
                bMesh.position.set(x, y, 0);
                bMesh.name = `b${i}`;
                scene.add(bMesh);

                // Create Peg
                if (val === 1) {
                    const pGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
                    const isSel = selectedIdx.value === i;
                    const pMat = new THREE.MeshLambertMaterial({ color: isSel ? activeTheme.value.select : activeTheme.value.peg });
                    const pMesh = new THREE.Mesh(pGeo, pMat);
                    pMesh.position.set(x, y, 0.25);
                    pMesh.rotation.x = Math.PI / 2;
                    pMesh.name = `p${i}`;
                    scene.add(pMesh);
                }
            });
        };

        const handleInput = (event) => {
            const x = event.touches ? event.touches[0].clientX : event.clientX;
            const y = event.touches ? event.touches[0].clientY : event.clientY;
            pointer.x = (x / window.innerWidth) * 2 - 1;
            pointer.y = -(y / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const hits = raycaster.intersectObjects(scene.children);
            if (hits.length > 0) {
                const name = hits[0].object.name;
                const idx = parseInt(name.substring(1));

                if (name[0] === 'p') {
                    selectedIdx.value = idx;
                } else if (name[0] === 'b' && selectedIdx.value !== null) {
                    executeJump(selectedIdx.value, idx);
                }
                renderThreeBoard();
            }
        };

        const executeJump = (start, end) => {
            if (board.value[end] !== 0) return;
            const dx = (end % 9) - (start % 9);
            const dy = Math.floor(end / 9) - Math.floor(start / 9);

            if ((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0)) {
                const mid = start + (dx / 2) + (dy / 2 * 9);
                if (board.value[mid] === 1) {
                    board.value[start] = 0;
                    board.value[mid] = 0;
                    board.value[end] = 1;
                    moveCount.value++;
                    selectedIdx.value = null;
                }
            }
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
            scene.add(new THREE.AmbientLight(0xffffff, 0.8));
            window.addEventListener('mousedown', handleInput);
            loadStage(0);
            const animate = () => { requestAnimationFrame(animate); renderer.render(scene, camera); };
            animate();
        });

        return {
        stageName, 
        moveCount, 
        currentPar, 
        currentStageIdx, // Exporting this helps the template see it
        loadStage,
        LaslosLeapRaw // Add this to the return object so the HTML can see it!
        };
    }
}).mount('#app');
