import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Stages6of7, inicialXY, ABCcds } from './stages.js';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // --- DATA STATE ---
        const iPegSLD = ref(JSON.parse(localStorage.getItem('iPegSLD')) || [[],[],[],[],[],["2026-02-27"]]);
        const userName = ref(localStorage.getItem('vPeg_User') || 'Guest');
        const currentLevel = ref(0);
        
        // Modal Visibility
        const showMenu = ref(false);
        const showProfile = ref(false);
        const alertVisible = ref(false);
        const alertMessage = ref("");

        // Game Selection Logic
        const selectedPeg = ref(null); 
        const holes = []; // 3D objects for empty spots
        const pegs = [];  // 3D objects for actual pegs

        // Three.js Globals
        let scene, camera, renderer, raycaster, pointer;

        // --- COMPUTED ---
        const displayScore = computed(() => {
            const p = iPegSLD.value[1]?.length || 0;
            const g = iPegSLD.value[2]?.length || 0;
            return `p${p}g${g.toString().padStart(2, '0')}`;
        });
        const isOnlineEnabled = computed(() => (iPegSLD.value[1]?.length * 10 + (iPegSLD.value[2]?.length || 0)) >= 100);

        const INFOalertF = (tXt) => { alertMessage.value = tXt; alertVisible.value = true; };

        // --- BOARD BUILDER ---
        const createBoard = () => {
            // Clear previous
            pegs.forEach(p => scene.remove(p));
            holes.forEach(h => scene.remove(h));
            pegs.length = 0;
            holes.length = 0;

            const levelData = Stages6of7[currentLevel.value];
            
            for (let i = 0; i < levelData.length; i += 3) {
                const x = levelData[i];
                const y = levelData[i + 1];
                const type = levelData[i + 2];

                // Base Hole (Gold Ring)
                const holeGeo = new THREE.TorusGeometry(0.4, 0.05, 16, 32);
                const holeMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 }); // Gold
                const hole = new THREE.Mesh(holeGeo, holeMat);
                hole.position.set(x * 0.1, y * 0.1, 0);
                hole.userData = { x, y, type: 0, isHole: true };
                scene.add(hole);
                holes.push(hole);

                if (type > 0) {
                    // Peg (Cyan Neon)
                    const pegGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 32);
                    const pegMat = new THREE.MeshPhongMaterial({ color: 0x00FFFF, emissive: 0x005555 });
                    const peg = new THREE.Mesh(pegGeo, pegMat);
                    peg.position.set(x * 0.1, y * 0.1, 0.4);
                    peg.rotation.x = Math.PI / 2;
                    peg.userData = { x, y, type, isHole: false };
                    scene.add(peg);
                    pegs.push(peg);
                }
            }
        };

        const handleInput = (event) => {
            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;

            pointer.x = (clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            
            // Check Pegs first, then Holes
            const intersects = raycaster.intersectObjects([...pegs, ...holes]);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                const data = object.userData;

                if (!data.isHole) {
                    // STEP 1: SELECT PEG
                    if (selectedPeg.value) selectedPeg.value.material.color.set(0x00FFFF); // Reset old
                    selectedPeg.value = object;
                    object.material.color.set(0xFF00FF); // Highlight Pink
                } else if (selectedPeg.value) {
                    // STEP 2: TRY MOVE TO HOLE
                    executeMove(selectedPeg.value.userData, data);
                    selectedPeg.value.material.color.set(0x00FFFF);
                    selectedPeg.value = null;
                }
            }
        };

        const executeMove = (start, end) => {
            // Here we call your validation
            console.log("Attempting move:", start, "to", end);
            // If valid: remove middle peg, move start peg to end
            createBoard(); // Refresh board for now
        };

        const initGame = () => {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x050520); // Deep Midnight Blue

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, -5, 12);

            renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            new OrbitControls(camera, renderer.domElement);
            raycaster = new THREE.Raycaster();
            pointer = new THREE.Vector2();

            const light = new THREE.PointLight(0xffffff, 1, 100);
            light.position.set(10, 10, 10);
            scene.add(light);
            scene.add(new THREE.AmbientLight(0x404040));

            window.addEventListener('mousedown', handleInput);
            window.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(e); }, { passive: false });

            const animate = () => {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            };

            createBoard();
            animate();
        };

        onMounted(initGame);

        return { userName, displayScore, isOnlineEnabled, showMenu, showProfile, alertVisible, alertMessage, INFOalertF, saveProfile: () => showProfile.value = false };
    }
}).mount('#app');
