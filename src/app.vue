<script setup>
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { stages3ar } from './stages.js'; // Make sure stages.js is in the src folder
import { solveBFS } from './solver.js'; // Let's bring in the brain!

const canvasRef = ref(null);
let renderer, scene, camera, raycaster, pointer;

const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

        // --- 1. STATE & VARIABLES ---  counter good. ai not mark as solved opacity, hundle input cite? 
        const currentPackIdx = ref(1);   // ---  human player mode animation ok. 
        const currentStageIdx = ref(0);  // ---  chk gemini 2. Update localStorage (Human vs. AI Solved)
        const board = ref(new Int8Array(81));
        const isSolving = ref(false); // New: prevents human clicks while AI is moving
        const moveCount = ref(0);
        const selectedIdx = ref(null);
        const lastMovedIdx = ref(null); // Used for multi-jump logic
        const isSidebarOpen = ref(false);
        //const victoryVisible = ref(false);
		    const victoryVisible = ref(true); // Start true for the "Welcome"
		    const victoryMessage = ref("Welcome to vPegSolitaire!");
		    const isParAchieved = ref(false);
    		const savedData = localStorage.getItem('vPegSave');
	    	const completedStages = ref(savedData ? JSON.parse(savedData) : {});
	    	//const completedStages = ref({}); // Structure: { "packIdx-stageIdx": "par" | "done" }
		    const saveProgress = () => {
  	  	    localStorage.setItem('vPegSave', JSON.stringify(completedStages.value));
	    	};
            const wasSolvedByAI = ref(false);
		
        const themes = {
            classic: { bg: 0x111111, base: 0x444444, peg: 0x00ffff, select: 0xff00ff },
            sunset: { bg: 0x221100, base: 0x553311, peg: 0xffaa00, select: 0xffffff },
            neon: { bg: 0x050520, base: 0x333333, peg: 0x00FFFF, select: 0xFF00FF },
            wood: { bg: 0x221100, base: 0x443322, peg: 0xCCAA88, select: 0xFFFF00 }
        };
        const activeTheme = ref(themes.classic);

        const holeGeo = new THREE.CircleGeometry(0.4, 32);
        const pegGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);


const renderThreeBoard = () => {
    if (!scene) return;
    
    // Clear old meshes
    const toRemove = scene.children.filter(obj => obj.name && (obj.name[0] === 'b' || obj.name[0] === 'p'));
    toRemove.forEach(obj => scene.remove(obj));

    board.value.forEach((val, i) => {
        if (val === -1) return;
        const x = (i % 9) - 4;
        const y = 4 - Math.floor(i / 9);

        // Holes can share a material because they are all the same color
        const bMesh = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: activeTheme.value.base }));
        bMesh.position.set(x, y, 0);
        bMesh.name = `b${i}`;
        scene.add(bMesh);

        if (val === 1) {
            const isSel = selectedIdx.value === i;
            // Pegs NEED their own material instance to show the "Selected" color highlight
            const pMesh = new THREE.Mesh(
                pegGeo, 
                new THREE.MeshLambertMaterial({ 
                    color: isSel ? activeTheme.value.select : activeTheme.value.peg 
                })
            ); 
            pMesh.position.set(x, y, 0.25);
            pMesh.rotation.x = Math.PI / 2;
            pMesh.name = `p${i}`;
            scene.add(pMesh);
        }
    });
};

        const loadStage = (packIdx, stageIdx) => {
		  	    victoryVisible.value = false;
		  	    isParAchieved.value = false;
            currentPackIdx.value = packIdx;
            currentStageIdx.value = stageIdx;
            moveCount.value = 0;
            selectedIdx.value = null;
            lastMovedIdx.value = null;
            wasSolvedByAI.value = false;
            
            // Direct load from the stages3ar array
            board.value = new Int8Array(stages3ar[packIdx][stageIdx][3]);
            
            if (scene) renderThreeBoard();
        };

      const checkWin = () => { // updated ok! next (1)update githup ok. (2)new vite branch via terminal...
        // 1. Count remaining pegs
        const remaining = board.value.filter(v => v === 1).length;

        if (remaining === 1) {
        const goalIdx = stages3ar[currentPackIdx.value][currentStageIdx.value][2];
        const currentPegIdx = board.value.indexOf(1); // Find where the last peg actually is

        // 2. Check if the peg is in the correct final position (if one is required)
        // If goalIdx is -1, any hole is fine. If > -1, it MUST match.
        if (goalIdx !== -1 && currentPegIdx !== goalIdx) {
            victoryMessage.value = "Solved, but not in the Goal hole!";
            isParAchieved.value = false;
        } else {
            victoryMessage.value = "SOLVED";
            
            // 3. Check for Par
            const par = stages3ar[currentPackIdx.value][currentStageIdx.value][0];
            isParAchieved.value = moveCount.value <= par && par > 0;
        }

        // 4. Save Progress to LocalStorage
        const key = `${currentPackIdx.value}-${currentStageIdx.value}`;

        // Check if the AI was the one moving
        const solverType = isSolving.value ? 'ai' : 'human'; 

        completedStages.value[key] = {
        status: isParAchieved.value ? 'par' : 'done',
        method: solverType // Store if AI or Human solved it
        };

        // This is the line that saves it to your PC's memory
        localStorage.setItem('vPegSave', JSON.stringify(completedStages.value));

        // 5. Show the UI and wait before moving to the next stage
        victoryVisible.value = true;
        
        setTimeout(() => {
            victoryVisible.value = false;
            const nextIdx = (currentStageIdx.value + 1) % stages3ar[currentPackIdx.value].length;
            loadStage(currentPackIdx.value, nextIdx);
        }, 3000); // 3 seconds to let the user read the message
        }
      };

const animateMove = (mesh, targetPos, victimMesh, callback) => {
  const startPos = mesh.position.clone();
  const startTime = performance.now();
  const duration = 200; // 0.2

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1); //  0 to 1

    // 1. Lerp X  Y
    mesh.position.x = startPos.x + (targetPos.x - startPos.x) * progress;
    mesh.position.y = startPos.y + (targetPos.y - startPos.y) * progress;

    // jump progress 0.5 1.0 1.5
      mesh.position.z = startPos.z + Math.sin(progress * Math.PI) * 3.5;

    // droped peg
    if (victimMesh && progress > 0.5) {
      victimMesh.scale.set(1 - (progress - 0.5) * 2, 1 - (progress - 0.5) * 2, 1 - (progress - 0.5) * 2);
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      callback(); // end animation, upd board
    }
  };

  requestAnimationFrame(step);
};

        // --- SHARED LOGIC: The "Jump" ---
    const executeJump = (start, end) => {
    // 1. Basic validation (ensure the mid-point has a peg)
    const dx = (end % 9) - (start % 9);
    const dy = Math.floor(end / 9) - Math.floor(start / 9);
    const mid = start + (dx / 2) + (dy / 2 * 9);
    const pegMesh = scene.getObjectByName(`p${start}`);
    const victimMesh = scene.getObjectByName(`p${mid}`);

    if (board.value[mid] !== 1 || board.value[end] !== 0) return;

    // 2. COUNTER LOGIC: Only increment if this is a NEW peg starting a move
    // We check if the 'start' index of this jump is the same as where the 
    // last peg ended up. If NOT, it's a new turn.
    if (lastMovedIdx.value !== start) {
        moveCount.value++;
    }

    const targetX = (end % 9) - 4;
    const targetY = 4 - Math.floor(end / 9);
    isSolving.value = true;

    animateMove(pegMesh, { x: targetX, y: targetY }, victimMesh, () => {
    // 3. Perform the jump
    board.value[start] = 0;
    board.value[mid] = 0;
    board.value[end] = 1;

    // 4. Remember this peg's NEW position
    selectedIdx.value = end; 
    lastMovedIdx.value = end; 
    // 1. Check the win while isSolving is still TRUE
    checkWin(); 
    // 2. Now unlock the board
    isSolving.value = false; 
    renderThreeBoard();
    });
    };


        const handleInput = (event) => {
            if (isSolving.value) return; 

            // Get the actual size and position of the canvas
            const rect = canvasRef.value.getBoundingClientRect();

            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;

            // Calculate mouse position relative to the canvas
            pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            const hits = raycaster.intersectObjects(scene.children);
            
            if (hits.length > 0) {
                // Filter out non-interactive objects if necessary
                const hit = hits.find(h => h.object.name && (h.object.name.startsWith('p') || h.object.name.startsWith('b')));
                
                if (hit) {
                    const name = hit.object.name;
                    const idx = parseInt(name.substring(1));

                    if (name[0] === 'p') {
                        if (selectedIdx.value !== idx) lastMovedIdx.value = null;
                        selectedIdx.value = idx;
                        renderThreeBoard();
                        //console.log("Selected peg:", idx); // Debug log
                    } else if (name[0] === 'b' && selectedIdx.value !== null) {
                        //console.log("Attempting jump to:", idx); // Debug log
                        executeJump(selectedIdx.value, idx);
                    }
                    //renderThreeBoard();
                }
            }
        };

onMounted(() => {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(activeTheme.value.bg);
            camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
            camera.position.set(0, 0, 10);

  renderer = new THREE.WebGLRenderer({ 
    canvas: canvasRef.value,
    antialias: true 
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            new OrbitControls(camera, renderer.domElement);
            
             raycaster = new THREE.Raycaster();
            pointer = new THREE.Vector2();
            scene.add(new THREE.AmbientLight(0xffffff, 1));

            // Setup listeners
            window.addEventListener('pointerdown', handleInput);
            window.addEventListener('resize', handleResize);

            // Initialize the first stage
            loadStage(2, 0); 
            
            const animate = () => { 
                requestAnimationFrame(animate); 
                renderer.render(scene, camera); 
            };
            animate();

});

        // A helper to play back the moves for the user
const animateSolution = async (moves) => {
    for (const move of moves) {
        // 'move' is now a chain, e.g., { path: [39, 41, 59], ... }
        // We iterate through the path to execute each individual jump in the chain
        for (let i = 0; i < move.path.length - 1; i++) {
            const from = move.path[i];
            const to = move.path[i+1];
            
            // This ensures the human UI sees every jump in the multi-move
            executeJump(from, to); 
            
            // Small pause between jumps in the SAME move
            await new Promise(resolve => setTimeout(resolve, 400)); 
        }
        // Small pause between different MOVES
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    isSolving.value = false;
};

        const runAISolver = async () => {
         // 1. Tell the AI the goal hole
        const goal = stages3ar[currentPackIdx.value][currentStageIdx.value][2];
    
        // 2. Run the math (from solver.js)
        const solution = solveBFS(board.value, goal);

        wasSolvedByAI.value = true;
        if (solution) {
        isSolving.value = true; // Lock the board
        
        await animateSolution(solution); 
        
        console.log("AI finish!");
        } else {
        console.log("No solution found from this position.");
        }
        isSolving.value = false;
        };


onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('pointerdown', handleInput);
  renderer.dispose();
  holeGeo.dispose();
  pegGeo.dispose();
});

const stageName = computed(() => stages3ar[currentPackIdx.value][currentStageIdx.value][1]);
const parValue = computed(() => stages3ar[currentPackIdx.value][currentStageIdx.value][0]);

// Helper for the sidebar checkmarks
const getCheckmarkData = (pIdx, sIdx) => {
    const data = completedStages.value[`${pIdx}-${sIdx}`];
    if (!data) return { icon: '', isAI: false };
    // Support for old simple string saves
    if (typeof data === 'string') {
        return { icon: data === 'par' ? ' ⭐✅' : ' ✅', isAI: false };
    }
    const isAI = data.method === 'ai';
    let icon = '';
    if (data.status === 'par') {
        icon = isAI ? ' ☆☑' : ' ⭐✅'; // AI Par vs Human Par
    } else {
        icon = isAI ? ' ☑' : ' ✅';    // AI Done vs Human Done
    }
    return { icon, isAI };
};
</script>


<template>
  <!-- 1. The UI Overlay (Sidebar, Buttons, Stats) -->
  <div id="mDiv1">
      <div class="stats-bar">
          <strong>{{ stageName }}</strong> &nbsp;
          <span>Moves: {{ moveCount }}</span>
          <span v-if="parValue > 0">/ Par: {{ parValue }}</span>
      </div>
      <div class="pack-btns">
          <button @click="loadStage(0, 0)" :class="{active: currentPackIdx === 0}">Tutorial</button>
          <button @click="loadStage(1, 0)" :class="{active: currentPackIdx === 1}">Lazlo</button>
          <button @click="loadStage(2, 0)" :class="{active: currentPackIdx === 2}">Full</button>
      </div>
  </div>



  <div class="sidebar" :class="{ open: isSidebarOpen }">
      <button class="menu-toggle" @click="isSidebarOpen = !isSidebarOpen">
          {{ isSidebarOpen ? '✕' : '☰' }}
      </button>
    <button @click="runAISolver" :disabled="isSolving" class="ai-btn">
      {{ isSolving ? 'Computing...' : 'AI Solve' }}
    </button>
    <!--<br />-->
      <div class="sidebar-header"><h3>Stages</h3></div>
      <div class="sidebar-list">
<div v-for="(stage, idx) in stages3ar[currentPackIdx]" 
     :key="idx" 
     @click="loadStage(currentPackIdx, idx); isSidebarOpen = false"
     class="level-item">
    <span>{{ idx + 1 }}. {{ stage[1] }}</span>
    <span :class="{ 'ai-solved-icon': getCheckmarkData(currentPackIdx, idx).isAI }">
        {{ getCheckmarkData(currentPackIdx, idx).icon }}
    </span>
</div>
      </div>
  </div>

  <div v-if="victoryVisible" class="victory-overlay">
      <h1 class="bounce-text">{{ victoryMessage }}</h1>
      <p v-if="isParAchieved" style="color: gold; font-weight: bold;">⭐ PAR ACHIEVED ⭐</p>
  </div>

  <!-- 2. The Three.js Canvas (stays at the bottom or uses absolute positioning) -->
  <canvas ref="canvasRef"></canvas>
</template>