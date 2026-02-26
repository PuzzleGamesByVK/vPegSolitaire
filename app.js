const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        const userName = ref(localStorage.getItem('vPeg_User') || 'New Player');
        const score = ref(parseInt(localStorage.getItem('vPeg_Score')) || 0);
        const showProfile = ref(false);

        const initGame = () => {
            // Your original THREE.js logic from vPegSolitaire.html
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x591e8a);
            
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, -2, 8);

            const renderer = new THREE.WebGLRenderer({
                canvas: document.querySelector('#c'),
                antialias: true 
            });
            renderer.setSize(window.innerWidth, window.innerHeight);

            // Updated OrbitControls for newer Three.js versions
            // Note: In newer versions, we use the global THREE.OrbitControls if loaded via CDN
            const controls = new THREE.OrbitControls(camera, renderer.domElement);

            const animate = () => {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            };
            animate();
        };

        const saveProfile = () => {
            localStorage.setItem('vPeg_User', userName.value);
            showProfile.value = false;
        };

        onMounted(() => {
            initGame();
        });

        return { userName, score, showProfile, saveProfile };
    }
}).mount('#app');
