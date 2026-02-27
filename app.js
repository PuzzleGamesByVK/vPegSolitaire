import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Stages6of7, inicialXY, ABCcds } from './stages.js';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // --- DATA STATE ---
        const iPegSLD = ref(JSON.parse(localStorage.getItem('iPegSLD')) || [[],[],[],[],[],["2026-02-27"]]);
        const userName = ref(localStorage.getItem('vPeg_User') || 'Guest');
        
        // Modal Visibility States
        const showMenu = ref(false);
        const showProfile = ref(false);
        const alertVisible = ref(false);
        const alertMessage = ref("");

        // --- COMPUTED SCORES ---
        const displayScore = computed(() => {
            const pPoints = iPegSLD.value[1] ? iPegSLD.value[1].length : 0;
            const gPoints = iPegSLD.value[2] ? iPegSLD.value[2].length : 0;
            return `p${pPoints}g${gPoints.toString().padStart(2, '0')}`;
        });

        const numericScore = computed(() => {
            const p = iPegSLD.value[1]?.length || 0;
            const g = iPegSLD.value[2]?.length || 0;
            return (p * 10) + g; 
        });

        const isOnlineEnabled = computed(() => numericScore.value >= 100);

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

        // Inside setup() in app.js

const currentLevel = ref(0); // Index for Stages6of7
const pegs = []; // To keep track of 3D objects for raycasting/clicking

const createBoard = (scene) => {
    // 1. Clear existing pegs
    pegs.forEach(p => scene.remove(p));
    pegs.length = 0;

    const levelData = Stages6of7[currentLevel.value];
    
    // Your original logic used a jump of 3 in the array for X, Y, Type
    // We'll use a loop to iterate through the Int16Array
    for (let i = 0; i < levelData.length; i += 3) {
        const x = levelData[i];
        const y = levelData[i + 1];
        const type = levelData[i + 2];

        // Create the "Hole" (The base circle)
        const holeGeo = new THREE.CircleGeometry(0.45, 32);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const hole = new THREE.Mesh(holeGeo, holeMat);
        
        // Use inicialXY to offset positions if needed, or direct coordinates
        hole.position.set(x * 0.1, y * 0.1, 0); 
        scene.add(hole);

        // If type is a "Peg" (e.g., type > 0), add the 3D peg
        if (type > 0) {
            const pegGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 32);
            const pegMat = new THREE.MeshPhongMaterial({ color: 0x00ffcc });
            const peg = new THREE.Mesh(pegGeo, pegMat);
            
            peg.position.set(x * 0.1, y * 0.1, 0.25);
            peg.rotation.x = Math.PI / 2; // Lay it upright
            
            // Store custom data for clicking later
            peg.userData = { x, y, type };
            
            scene.add(peg);
            pegs.push(peg);
        }
    }
};
        
        const initGame = () => {
            console.log("Stages loaded:", Stages6of7.length);// We will use Stages6of7 here in the next step!
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x591e8a);
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Note: OrbitControls is used here from the import above
            const controls = new OrbitControls(camera, renderer.domElement);
            camera.position.set(0, 0, 10);

            // ADD LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // MOUSE INTERACTION (Raycaster)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(pegs);

        if (intersects.length > 0) {
            const selectedPeg = intersects[0].object;
            INFOalertF(`Selected Peg at: ${selectedPeg.userData.x}, ${selectedPeg.userData.y}`);
            // Logic for jumping will go here!
        }
    };

    window.addEventListener('click', onMouseClick);
    
    // Build the initial board
    createBoard(scene);
            
            const animate = () => {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            };
            animate();
        };

        onMounted(() => {
            initGame();
        });

        return { 
            userName, iPegSLD, displayScore, numericScore, 
            isOnlineEnabled, showMenu, showProfile, alertVisible, alertMessage,
            saveProfile, INFOalertF, showFAQ, fetchCloud, resetGame
        };
    }
}).mount('#app');
