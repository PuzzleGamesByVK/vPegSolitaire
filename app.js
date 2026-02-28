import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Stages6of7, inicialXY, ABCcds } from './stages.js';

const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
    setup() {
        // --- 1. MULTI-PLAYER & DATA STATE ---
        const players = ref(JSON.parse(localStorage.getItem('vPeg_Players')) || [
            { name: 'Player 1', data: [[],[],[],[],[],["2026-02-27"]] },
            { name: 'Player 2', data: [[],[],[],[],[],["2026-02-27"]] }
        ]);
        const currentPlayerIdx = ref(parseInt(localStorage.getItem('vPeg_CurrentIdx')) || 0);
        
        // Shortcut to current active player's data
        const iPegSLD = computed(() => players.value[currentPlayerIdx.value].data);
        const userName = computed(() => players.value[currentPlayerIdx.value].name);

        // Game Navigation (Initial: LoadStageF(2,0))
        const currentPack = ref(2); 
        const currentStage = ref(0);
        
        // Modal States
        const showMenu = ref(false);
        const showProfile = ref(false);
        const alertVisible = ref(false);
        const alertMessage = ref("");

        // Logic Helpers
        const selectedId = ref(null);
        const meshes = [];
        let scene, camera, renderer, raycaster, pointer, controls;

        // --- 2. THEMES ---
        const Themes = {
            midnight: { bg: 0x050520, base: 0x333333, normal: 0x00FFFF, ring: 0xFF00FF, small: 0xFFFF00 },
            wood: { bg: 0x221100, base: 0x443322, normal: 0xccaa88, ring: 0xaa5533, small: 0xffeecc }
        };
        const activeTheme = ref(Themes.midnight);

        // --- 3. COMPUTED SCORES ---
        const displayScore = computed(() => {
            const p = iPegSLD.value[1]?.length || 0;
            const g = iPegSLD.value[2]?.length || 0;
            return `p${p}g${g.toString().padStart(2, '0')}`;
        });

        const numericScore = computed(() => {
            return (iPegSLD.value[1]?.length * 10) + (iPegSLD.value[2]?.length || 0);
        });

        const isOnlineEnabled = computed(() => numericScore.value >= 330);

		       // --- FUNCTIONS ---
        const INFOalertF = (tXt) => {
            alertMessage.value = tXt;
            alertVisible.value = true;
        };

        const resetGame = () => {
            INFOalertF("Game Resetting... (Logic to be added next!)");
        };
        
        const showFAQ = () => {
            // This is the long text from your PegSOL3JS_BE.html file
            const faqTXT = `<b>How to Play</b><br>
                The target is to leave only one peg on the board. 
                Jumps are performed by one peg over another into an empty hole.<br><br>
                <b>Score System</b><br>
                p-points: Completed Packs (Cloud levels).<br>
                g-points: Completed individual stages.<br><br>
                <b>HX vs HV</b><br>
                HX (Hexagonal) allows 6 move directions, while HV (Horizontal-Vertical) allows 4.`;
            INFOalertF(faqTXT);
        };

        const saveProfile = () => {
            localStorage.setItem('vPeg_User', userName.value);
            showProfile.value = false;
            INFOalertF("Profile saved!");
        };

        const fetchCloud = () => {
            if(!isOnlineEnabled.value) return;
            INFOalertF("Connecting to Firebase Project: puzzlegamesbyvk...");
        };


        // --- 4. BOARD LOGIC (Appear/Disappear Mechanism) ---
        const spawn = (id, kind, color, z) => {
            const pos = inicialXY[id];
            if (!pos) return;

            let geo, mat;
            // Hardware-friendly Lambert materials
            if (kind === 'base') {
                geo = new THREE.CircleGeometry(0.45, 32);
                mat = new THREE.MeshBasicMaterial({ color: color });
            } else if (kind === 'ring') {
                geo = new THREE.TorusGeometry(0.3, 0.08, 8, 20);
                mat = new THREE.MeshLambertMaterial({ color: color });
            } else if (kind === 'small') {
                geo = new THREE.SphereGeometry(0.25, 16, 12);
                mat = new THREE.MeshLambertMaterial({ color: color });
            } else { // normal
                geo = new THREE.CylinderGeometry(0.35, 0.35, 0.6, 16);
                mat = new THREE.MeshLambertMaterial({ color: color });
            }

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(pos[0], pos[1], z);
            if (kind !== 'base') mesh.rotation.x = Math.PI / 2;
            
            mesh.userData = { id, kind };
            scene.add(mesh);
            meshes.push(mesh);
        };

        const createBoard = () => {
            if (!scene) return;
            meshes.forEach(m => scene.remove(m));
            meshes.length = 0;

            const stageData = Stages6of7[currentPack.value][currentStage.value];
            const theme = activeTheme.value;

            // Layer 1: Bases (stageData[2])
            stageData[2].forEach(id => spawn(id, 'base', theme.base, 0));
            // Layer 2: Normal Pegs (stageData[3])
            stageData[3].forEach(id => spawn(id, 'normal', theme.normal, 0.3));
            // Layer 3: Ring Pegs (stageData[4])
            stageData[4].forEach(id => spawn(id, 'ring', theme.ring, 0.3));
            // Layer 4: Small Pegs (stageData[5]) with "Second Floor" Logic
            stageData[5].forEach(id => {
                const isOnNormal = stageData[3].includes(id);
                const zPos = isOnNormal ? 0.9 : 0.3; 
                spawn(id, 'small', theme.small, zPos);
            });
        };

        // --- 5. INPUT & MOVE VALIDATION ---
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
                    // Selection Logic
                    selectedId.value = data.id;
                    INFOalertF(`Selected Peg at ${ABCcds[data.id]}`);
                } else if (selectedId.value !== null) {
                    // Try to move to empty base
                    executeMove(selectedId.value, data.id);
                }
            }
        };

        const executeMove = (startId, endId) => {
            const stage = Stages6of7[currentPack.value][currentStage.value];
            
            // Porting Transformation logic: Small lands on Ring
            if (stage[5].includes(startId) && stage[4].includes(endId)) {
                stage[5] = stage[5].filter(i => i !== startId);
                stage[4] = stage[4].filter(i => i !== endId);
                stage[3].push(endId);
                INFOalertF("Transformation: Normal Peg Formed!");
            } else {
                // Standard Jump placeholder
                INFOalertF(`Moving ${ABCcds[startId]} to ${ABCcds[endId]}`);
                // Move validation math would go here
            }
            
            selectedId.value = null;
            createBoard();
        };

        // --- 6. INITIALIZATION ---
        const initGame = () => {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(activeTheme.value.bg);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, -2, 12); 

            renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            controls = new OrbitControls(camera, renderer.domElement);
            raycaster = new THREE.Raycaster();
            pointer = new THREE.Vector2();

            scene.add(new THREE.AmbientLight(0xffffff, 0.8));
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

        // Save progress whenever players data changes
        watch(players, (newVal) => {
            localStorage.setItem('vPeg_Players', JSON.stringify(newVal));
        }, { deep: true });

        onMounted(initGame);

        return { 
            userName, displayScore, numericScore, isOnlineEnabled, 
            showMenu, showProfile, alertVisible, alertMessage, 
            currentPlayerIdx, players,
            INFOalertF, 
            switchPlayer: (idx) => { currentPlayerIdx.value = idx; localStorage.setItem('vPeg_CurrentIdx', idx); createBoard(); }
        };
    }
}).mount('#app');
