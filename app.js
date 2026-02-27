import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // --- DATA STATE ---
        // Mirroring your original iPegSLD structure: [ [], [], [], [], [], ["date"] ]
        const iPegSLD = ref(JSON.parse(localStorage.getItem('iPegSLD')) || [[],[],[],[],[],["2026-02-27"]]);
        const userName = ref(localStorage.getItem('vPeg_User') || 'Guest');
        
        // Modal Visibility States
        const showProfile = ref(false);
        const alertVisible = ref(false);
        const alertMessage = ref("");

        // --- COMPUTED SCORE (The CalcScoreF logic) ---
        const displayScore = computed(() => {
            // Porting your logic: p is based on packs (index 1), g is based on stages (index 2)
            const pPoints = iPegSLD.value[1] ? iPegSLD.value[1].length : 0;
            const gPoints = iPegSLD.value[2] ? iPegSLD.value[2].length : 0;
            
            // Returns the format "p1g01" as seen in your original game
            return `p${pPoints}g${gPoints.toString().padStart(2, '0')}`;
        });

        const numericScore = computed(() => {
            // Logic to unlock Firebase: p points count for 10, g points for 1
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

        const saveProfile = () => {
            localStorage.setItem('vPeg_User', userName.value);
            showProfile.value = false;
            INFOalertF("Profile Updated locally!");
        };

        const initGame = () => {
            // Your Three.js code will live here
            // I will help you migrate the massive "Stages" logic next
            console.log("Three.js Initializing...");
        };

        onMounted(() => {
            initGame();
        });

        return { 
            userName, iPegSLD, displayScore, numericScore, 
            isOnlineEnabled, showProfile, alertVisible, alertMessage,
            saveProfile, INFOalertF 
        };
    }
}).mount('#app');
