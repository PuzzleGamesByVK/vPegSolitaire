import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Stages6of7, inicialXY, ABCcds } from './stages.js';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // --- DATA STATE ---
        const iPegSLD = ref(JSON.parse(localStorage.getItem('iPegSLD')) || [[],[],[],[],[],["2026-02-27"]]);
        const userName = ref(localStorage.getItem('vPeg_User') || 'Guest');
        
        // Navigation: Packs and Stages (Original structure)
        const currentPack = ref(0);
        const currentStage = ref(0);
        
        // Modal States
        const showMenu = ref(false);
        const showProfile = ref(false);
        const alertVisible = ref(false);
        const alertMessage = ref("");

        // Selection Logic
        const selectedId = ref(null); // Stores the index (0-985)
        const meshes = []; // Track all 3D objects for cleanup

        let scene, camera, renderer, raycaster, pointer;

        // --- COMPUTED ---
        const displayScore = computed(() => {
            const p = iPegSLD.value[1]?.length || 0;
            const g = iPegSLD.value[2]?.length || 0;
            return `p${p}g${g.toString().padStart(2, '0')}`;
        });

        // --- HELPERS ---
        const INFOalertF = (tXt) => { alertMessage.value = tXt; alertVisible.value = true; };

        // --- THE BOARD BUILDER (Supports 4 types) ---
        const createBoard = () => {
            if (!scene) return;
            meshes.forEach(m => scene.remove(m));
            meshes.length = 0;

            // Get current stage data
            // Assuming Stages6of7[pack][stage] format
            const stage = Stages6of7[currentPack.value][currentStage.value];
            
            // 1. Render BASES (stage[2] contains array of indices)
            if(stage[2]) stage[2].forEach(id => spawnObject(id, 'base'));
            
            // 2. Render NORMAL PEGS (stage[3])
            if(stage[3]) stage[3].forEach(id => spawnObject(id, 'normal'));
            
            // 3. Render RING PEGS (stage[4])
            if(stage[4]) stage[4].forEach(id => spawnObject(id, 'ring'));
            
            // 4. Render SMALL PEGS (stage[5])
            if(stage[5]) stage[5].forEach(id => spawnObject(id, 'small'));
        };

        const spawnObject = (id, kind) => {
            const pos = inicialXY[id];
            if (!pos) return;

            let geo, mat, z = 0;

            if (kind === 'base') {
                geo = new THREE.CircleGeometry(0.45, 32);
                mat = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Dark Grey
                z = 0;
            } else if (kind === 'normal') {
                geo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16);
                mat = new THREE.MeshLambertMaterial({ color: 0x00FFFF }); // Cyan
                z = 0.3;
            } else if (kind === 'ring') {
                geo = new THREE.TorusGeometry(0.3, 0.1, 8, 24);
                mat = new THREE.MeshLambertMaterial({ color: 0xFF00FF }); // Magenta
                z = 0.3;
            } else if (kind === 'small') {
                geo = new THREE.SphereGeometry(0.25, 16, 16);
                mat = new THREE.MeshLambertMaterial({ color: 0xFFFF00 }); // Yellow
                z = 0.6; // Sits higher
            }

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(pos[0], pos[1], z);
            if (kind !== 'base') mesh.rotation.x = Math.PI / 2;
            
            mesh.userData = { id, kind };
            scene.add(mesh);
            meshes.push(mesh);
        };

        const handleInput = (event) => {
            const x = event.touches ? event.touches[0].clientX : event.clientX;
            const y = event.touches ? event.touches[0].clientY : event.clientY;

            pointer.x = (x / window.innerWidth) * 2 - 1;
            pointer.y = -(y / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(meshes);

            if (intersects.length > 0) {
                const obj = intersects[0].object;
                const data = obj.userData;

                if (data.kind !== 'base') {
                    // SELECTING A PEG
                    if (selectedId.value === data.id) {
                        selectedId.value = null; // Deselect
                        obj.material.emissive?.set(0x000000);
                    } else {
                        selectedId.value = data.id;
                        // Visual feedback (Old-laptop friendly)
                        obj.material.emissive?.set(0x333333); 
                    }
                } else if (selectedId.value !== null) {
                    // CLICKING A BASE WITH A PEG SELECTED (Move validation)
                    validateMove(selectedId.value, data.id);
                }
            }
        };

        const validateMove = (startId, endId) => {
            const start = inicialXY[startId];
            const end = inicialXY[endId];
            
            // Simple distance check for now
            const dist = Math.sqrt(Math.pow(end[0]-start[0], 2) + Math.pow(end[1]-start[1], 2));
            
            if (dist > 1.8 && dist < 2.2) {
                INFOalertF(`Jump from ${ABCcds[startId]} to ${ABCcds[endId]}`);
                // Logic to remove middle peg goes here
            } else {
                INFOalertF("Invalid Distance!");
            }
            selectedId.value = null;
        };

        const initGame = () => {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x050520); // Midnight Blue

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 0, 12); // View the whole board
            camera.lookAt(0, 0, 0);

            renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            new OrbitControls(camera, renderer.domElement);
            raycaster = new THREE.Raycaster();
            pointer = new THREE.Vector2();

            // Simple Lights (Hardware Friendly)
            scene.add(new THREE.AmbientLight(0xffffff, 0.7));
            const light = new THREE.PointLight(0xffffff, 0.5);
            light.position.set(5, 5, 10);
            scene.add(light);

            window.addEventListener('mousedown', handleInput);
            window.addEventListener('touchstart', (e) => { handleInput(e); }, { passive: false });

            const animate = () => {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            };

            createBoard();
            animate();
        };

        onMounted(initGame);

        return { userName, displayScore, showMenu, showProfile, alertVisible, alertMessage, INFOalertF, saveProfile: () => showProfile.value = false };
    }
}).mount('#app');
