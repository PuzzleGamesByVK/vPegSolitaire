
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Stages6of7, inicialXY, ABCcds } from './stages.js';

const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
    setup() {
        // --- 1. STATE ---
        const players = ref(JSON.parse(localStorage.getItem('vPeg_Players')) || [
            { name: 'Player 1', data: [[],[],[],[],[],["2026-02-27"]] },
            { name: 'Player 2', data: [[],[],[],[],[],["2026-02-27"]] }
        ]);
        const currentPlayerIdx = ref(parseInt(localStorage.getItem('vPeg_CurrentIdx')) || 0);
        const currentPack = ref(2); 
        const currentStage = ref(0);
        
        // Modal & Selection
        const showMenu = ref(false);
        const alertVisible = ref(false);
        const alertMessage = ref("");
        const selectedName = ref(null); // Will store names like "3m" (peg) or "2m" (base)

        let scene, camera, renderer, raycaster, pointer;

        // --- 2. THEMES ---
        const Themes = {
            midnight: { bg: 0x050520, base: 0x333333, normal: 0x00FFFF, ring: 0xFF00FF, small: 0xFFFF00 },
            wood: { bg: 0x221100, base: 0x443322, normal: 0xccaa88, ring: 0xaa5533, small: 0xffeecc }
        };
        const activeTheme = ref(Themes.midnight);

        // --- 2. THE PROCESSING LOGIC (LoadStageF logic) ---
        const createBoard = () => {
            if (!scene) return;
            // Clear scene of game objects (starting with 2, 3, 4, or 5)
            for (let i = scene.children.length - 1; i >= 0; i--) {
                const obj = scene.children[i];
                if (obj.name && "2345".includes(obj.name[0])) {
                    scene.remove(obj);
                }
            }

            const stageData = Stages6of7[currentPack.value][currentStage.value];
            const theme = activeTheme.value;

            // In your logic: stageData[2] are the active BASES (ShowBases equivalent)
            const activeBases = stageData[2]; 
            
            activeBases.forEach(id => {
                // Render Base (Prefix '2')
                spawn(id, '2', theme.base, 0);

                // Check if this ID has a Normal Peg (Prefix '3')
                if (stageData[3].includes(id)) spawn(id, '3', theme.normal, 0.3);
                
                // Check if this ID has a Ring (Prefix '4')
                if (stageData[4].includes(id)) spawn(id, '4', theme.ring, 0.3);
                
                // Check if this ID has a Small Peg (Prefix '5')
                if (stageData[5].includes(id)) {
                    const onNormal = stageData[3].includes(id);
                    spawn(id, '5', theme.small, onNormal ? 0.9 : 0.3);
                }
            });
        };

        const spawn = (id, prefix, color, z) => {
            const pos = inicialXY[id];
            const name = prefix + ABCcds[id]; // e.g., "3m" for peg at index m
            
            let geo;
            if (prefix === '2') geo = new THREE.CircleGeometry(0.45, 32);
            else if (prefix === '4') geo = new THREE.TorusGeometry(0.3, 0.08, 8, 20);
            else if (prefix === '5') geo = new THREE.SphereGeometry(0.25, 16, 12);
            else geo = new THREE.CylinderGeometry(0.35, 0.35, 0.6, 16);

            const mat = new THREE.MeshLambertMaterial({ color: color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(pos[0], pos[1], z);
            if (prefix !== '2') mesh.rotation.x = Math.PI / 2;
            
            mesh.name = name;
            scene.add(mesh);
        };

        // --- 3. SELECTION & RAYCASTING ---
        const handleInput = (event) => {
            const x = event.touches ? event.touches[0].clientX : event.clientX;
            const y = event.touches ? event.touches[0].clientY : event.clientY;

            pointer.x = (x / window.innerWidth) * 2 - 1;
            pointer.y = -(y / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(scene.children);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                const name = obj.name;

                if (!name || !"2345".includes(name[0])) return;

                if (name[0] !== '2') {
                    // It's a PEG (3, 4, or 5)
                    if (selectedName.value) {
                        const prev = scene.getObjectByName(selectedName.value);
                        if (prev) prev.material.emissive.set(0x000000);
                    }
                    selectedName.value = name;
                    obj.material.emissive.set(0x444444);
                    console.log("Selected:", name);
                } else if (selectedName.value) {
                    // It's a BASE ('2') and we have a PEG selected
                    processMove(selectedName.value, name);
                }
            }
        };

        const processMove = (pegName, baseName) => {
            const pegId = pegName.substring(1); // the 'm' in '3m'
            const baseId = baseName.substring(1);
            
            // Here you can trigger your original logic: 
            // 1. Identify middle ID
            // 2. Update Stages6of7 arrays
            // 3. Call createBoard()
            
            alertMessage.value = `Jump attempt from ${pegName} to ${baseName}`;
            alertVisible.value = true;
            
            // Reset selection
            const pegObj = scene.getObjectByName(pegName);
            if (pegObj) pegObj.material.emissive.set(0x000000);
            selectedName.value = null;
        };

        const initGame = () => {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(activeTheme.value.bg);
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 0, 12);

            renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            new OrbitControls(camera, renderer.domElement);
            raycaster = new THREE.Raycaster();
            pointer = new THREE.Vector2();

            scene.add(new THREE.AmbientLight(0xffffff, 0.8));
            window.addEventListener('mousedown', handleInput);
            window.addEventListener('touchstart', (e) => { handleInput(e); }, { passive: false });

            const animate = () => { requestAnimationFrame(animate); renderer.render(scene, camera); };
            createBoard();
            animate();
        };

        onMounted(initGame);

        return { userName: computed(() => players.value[currentPlayerIdx.value].name), alertVisible, alertMessage, showMenu };
    }
}).mount('#app');
