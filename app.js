import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

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

        const initGame = () => {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x591e8a);
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Note: OrbitControls is used here from the import above
            const controls = new OrbitControls(camera, renderer.domElement);
            camera.position.set(0, 0, 10);

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
            saveProfile, INFOalertF, showFAQ, fetchCloud
        };
    }
}).mount('#app');
