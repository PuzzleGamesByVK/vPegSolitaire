import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { stages3ar } from './stages.js';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const currentPackIdx = ref(1);
        const currentStageIdx = ref(0);
        const board = ref(new Int8Array(81));
        const moveCount = ref(0);
        const selectedIdx = ref(null);
        const lastMovedIdx = ref(null); // To track if the same peg is continuing a move
        const isSidebarOpen = ref(false);

        let scene, camera, renderer, raycaster, pointer;

        // --- MOBILE FRIENDLY INPUT ---
        const handleInput = (event) => {
            // Prevent scrolling when touching the game
            if(event.type === 'touchstart') event.preventDefault();

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
                    // If we select a NEW peg, the previous "multi-jump" chain ends
                    if (selectedIdx.value !== idx) lastMovedIdx.value = null;
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

                    // --- THE SPECIAL MOVE COUNT LOGIC ---
                    // Only increment if it's NOT the same peg continuing a jump
                    if (lastMovedIdx.value !== start) {
                        moveCount.value++;
                    }
                    
                    selectedIdx.value = end; // Auto-select the peg at its new home
                    lastMovedIdx.value = end; // Mark this peg as the "active" mover
                    
                    checkWin();
                }
            }
        };

        const checkWin = () => {
            const remaining = board.value.filter(v => v === 1).length;
            if (remaining === 1) {
                triggerSolvedAnimation();
            }
        };

        const triggerSolvedAnimation = () => {
            // 1. Show 3D "SOLVED" text (or a flash effect)
            // 2. Wait 2 seconds
            // 3. Automatically load next stage
            setTimeout(() => {
                const nextIdx = (currentStageIdx.value + 1) % stages3ar[currentPackIdx.value].length;
                loadStage(currentPackIdx.value, nextIdx);
            }, 2500);
        };

        // ... include onMounted and renderThreeBoard from previous version ...
        // Add listeners for both:
        // window.addEventListener('mousedown', handleInput);
        // window.addEventListener('touchstart', handleInput, { passive: false });

        return { 
            stageName: computed(() => stages3ar[currentPackIdx.value][currentStageIdx.value][1]),
            moveCount, 
            isSidebarOpen,
            loadStage, 
            currentPackIdx, 
            stages3ar 
        };
    }
}).mount('#app');
