import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        // --- 1. GAME STATE ---
        // 0 = Empty Base, 1 = Normal Peg, -1 = No Base (Outside grid)
        const board = ref(new Array(81).fill(-1)); 
        const selectedIndex = ref(null);
        
        // --- 2. THEMES ---
        const themes = {
            neon: { bg: 0x050520, base: 0x333333, peg: 0x00FFFF, highlight: 0xFF00FF },
            wood: { bg: 0x221100, base: 0x443322, peg: 0xCCAA88, highlight: 0xFFFF00 }
        };
        const currentTheme = ref(themes.neon);

        let scene, camera, renderer, raycaster, pointer;

        // --- 3. COORDINATE HELPERS ---
        const getPos = (idx) => {
            const x = (idx % 9) - 4;
            const y = 4 - Math.floor(idx / 9);
            return { x, y };
        };

        // --- 4. BOARD INITIALIZATION ---
        const loadLazloStage = () => {
            // Example: Classic English style on a 9x9 grid
            // Reset board
            board.value.fill(-1);
            
            // Define a 7x7 cross area within the 9x9
            for(let i=0; i<81; i++) {
                const {x, y} = getPos(i);
                if ((Math.abs(x) < 2 || Math.abs(y) < 2) && (Math.abs(x) < 4 && Math.abs(y) < 4)) {
                    board.value[i] = 1; // Fill with pegs
                }
            }
            board.value[40] = 0; // Center is empty
            renderThreeBoard();
        };

        const renderThreeBoard = () => {
            if (!scene) return;
            // Clear previous meshes
            while(scene.children.length > 0){ scene.remove(scene.children[0]); }
            
            // Re-add lights
            scene.add(new THREE.AmbientLight(0xffffff, 0.8));

            board.value.forEach((type, idx) => {
                if (type === -1) return;

                const {x, y} = getPos(idx);
                
                // Base
                const baseGeo = new THREE.CircleGeometry(0.4, 32);
                const baseMat = new THREE.MeshBasicMaterial({ color: currentTheme.value.base });
                const baseMesh = new THREE.Mesh(baseGeo, baseMat);
                baseMesh.position.set(x, y, 0);
                baseMesh.name = `base_${idx}`;
                scene.add(baseMesh);

                // Peg
                if (type === 1) {
                    const pegGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
                    const color = (idx === selectedIndex.value) ? currentTheme.value.highlight : currentTheme.value.peg;
                    const pegMat = new THREE.MeshLambertMaterial({ color: color });
                    const pegMesh = new THREE.Mesh(pegGeo, pegMat);
                    pegMesh.position.set(x, y, 0.25);
                    pegMesh.rotation.x = Math.PI / 2;
                    pegMesh.name = `peg_${idx}`;
                    scene.add(pegMesh);
                }
            });
        };

        // --- 5. INTERACTION & JUMP LOGIC ---
        const handleInput = (event) => {
            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;
            pointer.x = (clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(scene.children);

            if (intersects.length > 0) {
                const name = intersects[0].object.name;
                const idx = parseInt(name.split('_')[1]);

                if (board.value[idx] === 1) {
                    selectedIndex.value = idx;
                } else if (board.value[idx] === 0 && selectedIndex.value !== null) {
                    attemptJump(selectedIndex.value, idx);
                }
                renderThreeBoard();
            }
        };

        const attemptJump = (start, end) => {
            const s = getPos(start);
            const e = getPos(end);
            
            const dx = e.x - s.x;
            const dy = e.y - s.y;

            // Simple Lazlo Jump: Distance of 2, must have peg in middle
            if ((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0)) {
                const midIdx = start + (dx / 2) + (dy / 2 * 9);
                if (board.value[midIdx] === 1) {
                    board.value[start] = 0;
                    board.value[midIdx] = 0;
                    board.value[end] = 1;
                    selectedIndex.value = null;
                }
            }
        };

        const initThree = () => {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(currentTheme.value.bg);
            camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
            camera.position.set(0, -2, 8);
            renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            new OrbitControls(camera, renderer.domElement);
            raycaster = new THREE.Raycaster();
            pointer = new THREE.Vector2();

            window.addEventListener('mousedown', handleInput);
            loadLazloStage();
            
            const animate = () => { requestAnimationFrame(animate); renderer.render(scene, camera); };
            animate();
        };

        onMounted(initThree);

        return { changeTheme: (t) => { currentTheme.value = themes[t]; scene.background.set(themes[t].bg); renderThreeBoard(); } };
    }
}).mount('#app');
