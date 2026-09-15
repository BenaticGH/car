// --- GLOBALS & SETUP ---
let scene, camera, renderer, world;
let vehicle, chassisBody;
let trackMeshes = [], trackBodies = [];
let finishZone;
let isPlaying = false, startTime = 0, elapsedTime = 0, currentLevel = 1;

// Gradual Steering Variable
let currentSteer = 0; 

const COLORS = {
    car: 0xff4757,
    wheels: 0x2f3542,
    track: 0x34495e,
    finish: 0x2ed573
};

const keys = { w: false, a: false, s: false, d: false };

initEngine();

// --- ENGINE INITIALIZATION ---
function initEngine() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); 
    scene.fog = new THREE.Fog(0x87CEEB, 50, 800);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(100, 150, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.left = -250;
    dirLight.shadow.camera.right = 250;
    dirLight.shadow.camera.top = 250;
    dirLight.shadow.camera.bottom = -250;
    scene.add(dirLight);

    world = new CANNON.World();
    // FIXED GRAVITY: Slashed in half to normal arcade levels. You will now retain forward momentum and soar off ramps!
    world.gravity.set(0, -25, 0); 

    const groundMaterial = new CANNON.Material();
    const wheelMaterial = new CANNON.Material();
    const wheelGroundContact = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
        friction: 0.9, 
        restitution: 0.0, 
        contactEquationStiffness: 1000
    });
    world.addContactMaterial(wheelGroundContact);

    setupCar(wheelMaterial);

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', (e) => handleKey(e.key.toLowerCase(), true));
    document.addEventListener('keyup', (e) => handleKey(e.key.toLowerCase(), false));

    animate();
}

// --- PHYSICS CAR SETUP ---
function setupCar(wheelMat) {
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.3, 1.6)); 
    chassisBody = new CANNON.Body({ mass: 800 });
    chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.2, 0)); 
    
    const chassisGeo = new THREE.BoxGeometry(2, 0.6, 4);
    const chassisMesh = new THREE.Mesh(chassisGeo, new THREE.MeshStandardMaterial({ color: COLORS.car }));
    chassisMesh.castShadow = true;
    scene.add(chassisMesh);
    chassisBody.mesh = chassisMesh;

    vehicle = new CANNON.RaycastVehicle({
        chassisBody: chassisBody,
        indexRightAxis: 0,
        indexUpAxis: 1,
        indexForwardAxis: 2
    });

    const options = {
        radius: 0.5, 
        directionLocal: new CANNON.Vec3(0, -1, 0),
        suspensionStiffness: 45, 
        suspensionRestLength: 0.45,
        frictionSlip: 3.0, 
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 100000,
        rollInfluence: 0.01, 
        axleLocal: new CANNON.Vec3(1, 0, 0),
        chassisConnectionPointLocal: new CANNON.Vec3(1, 0, 1),
        maxSuspensionTravel: 0.4,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true
    };

    options.chassisConnectionPointLocal.set(1.1, 0, -1.2); vehicle.addWheel(options);
    options.chassisConnectionPointLocal.set(-1.1, 0, -1.2); vehicle.addWheel(options);
    options.chassisConnectionPointLocal.set(1.1, 0, 1.2); vehicle.addWheel(options);
    options.chassisConnectionPointLocal.set(-1.1, 0, 1.2); vehicle.addWheel(options);

    vehicle.addToWorld(world);

    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMeshMat = new THREE.MeshStandardMaterial({ color: COLORS.wheels });
    vehicle.wheelInfos.forEach((wheel) => {
        const cylinder = new THREE.Mesh(wheelGeo, wheelMeshMat);
        cylinder.castShadow = true;
        scene.add(cylinder);
        wheel.mesh = cylinder;
    });
}

// --- LEVEL DESIGN ---
const levels = {
    1: [ 
        { pos: [0, 0, -40], size: [20, 1, 100] },
        { pos: [0, 0, -140], size: [20, 1, 100] },
        { pos: [0, 0, -240], size: [20, 1, 100] }
    ],
    2: [ 
        { pos: [0, 0, -25], size: [20, 1, 70] }, 
        { pos: [0, 2, -75], size: [20, 1, 35], rot: [0.2, 0, 0] }, 
        { pos: [0, -5, -155], size: [30, 1, 100] }, 
        { pos: [0, -5, -255], size: [20, 1, 100] }
    ],
    3: [ 
        { pos: [0, 0, -30], size: [20, 1, 80] }, 
        { pos: [-25, 0, -80], size: [70, 1, 20] }, 
        { pos: [-50, 0, -130], size: [20, 1, 80] }, 
        { pos: [-25, 0, -180], size: [70, 1, 20] }, 
        { pos: [0, 0, -230], size: [20, 1, 80] }
    ],
    4: [ 
        { pos: [0, 0, -40], size: [20, 1, 100] }, 
        { pos: [0, 5, -110], size: [20, 1, 50], rot: [0.25, 0, 0] }, 
        { pos: [0, -15, -240], size: [40, 1, 150] }, 
        { pos: [0, -15, -360], size: [20, 1, 90] }
    ],
    5: [ 
        { pos: [0, 0, -30], size: [20, 1, 80] },
        { pos: [30, 0, -80], size: [80, 1, 20] }, 
        { pos: [60, 0, -130], size: [20, 1, 80] }, 
        { pos: [30, 0, -180], size: [80, 1, 20] }, 
        { pos: [0, 0, -230], size: [20, 1, 80] }, 
        { pos: [0, 3, -285], size: [20, 1, 35], rot: [0.2, 0, 0] }, 
        { pos: [0, -8, -365], size: [30, 1, 100] } 
    ]
};

function buildLevel(levelNum) {
    trackBodies.forEach(b => world.removeBody(b));
    trackMeshes.forEach(m => scene.remove(m));
    if (finishZone) scene.remove(finishZone);
    trackBodies = []; trackMeshes = [];

    const data = levels[levelNum];
    const trackMat = new CANNON.Material();
    
    let lastPiece;
    data.forEach(piece => {
        const shape = new CANNON.Box(new CANNON.Vec3(piece.size[0]/2, piece.size[1]/2, piece.size[2]/2));
        const body = new CANNON.Body({ mass: 0, material: trackMat });
        body.addShape(shape);
        body.position.set(...piece.pos);
        
        if (piece.rot) {
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), piece.rot[0]);
        }
        
        world.addBody(body);
        trackBodies.push(body);

        const geo = new THREE.BoxGeometry(...piece.size);
        const mat = new THREE.MeshStandardMaterial({ color: COLORS.track });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
        mesh.receiveShadow = true;
        scene.add(mesh);
        trackMeshes.push(mesh);

        lastPiece = piece;
    });

    const finishGeo = new THREE.BoxGeometry(lastPiece.size[0], 10, 2);
    const finishMat = new THREE.MeshBasicMaterial({ color: COLORS.finish, transparent: true, opacity: 0.6 });
    finishZone = new THREE.Mesh(finishGeo, finishMat);
    finishZone.position.set(lastPiece.pos[0], lastPiece.pos[1] + 5, lastPiece.pos[2] - (lastPiece.size[2]/2) + 2);
    scene.add(finishZone);
}

// --- GAME LOGIC ---
function startGame(level) {
    currentLevel = level;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('timer').style.display = 'block';
    document.getElementById('speedometer').style.display = 'block';
    document.getElementById('back-btn').classList.remove('hidden'); // Show Esc button

    buildLevel(level);
    resetCar();
    
    startTime = Date.now();
    elapsedTime = 0;
    isPlaying = true;
}

function resetCar() {
    chassisBody.position.set(0, 5, 0);
    chassisBody.velocity.set(0, 0, 0);
    chassisBody.angularVelocity.set(0, 0, 0);
    chassisBody.quaternion.set(0, 0, 0, 1);
    keys.w = keys.a = keys.s = keys.d = false;
    currentSteer = 0; 
}

function handleKey(key, isDown) {
    if (key === 'w' || key === 'arrowup') keys.w = isDown;
    if (key === 's' || key === 'arrowdown') keys.s = isDown;
    if (key === 'a' || key === 'arrowleft') keys.a = isDown;
    if (key === 'd' || key === 'arrowright') keys.d = isDown;
    
    // Quick Restart and Menu Exit Keys
    if (isDown && isPlaying) {
        if (key === 'r' || key === 'enter') {
            resetCar();
            startTime = Date.now();
        }
        if (key === 'escape') {
            returnToMenu();
        }
    }
}

function updateVehicleControls() {
    const engineForce = 2800; // Boosted slightly to easily clear the high jumps
    const currentSpeed = chassisBody.velocity.length() * 3.6;

    // Acceleration
    if (keys.w) {
        vehicle.applyEngineForce(engineForce, 2);
        vehicle.applyEngineForce(engineForce, 3);
    } else if (keys.s && !keys.w) {
        vehicle.applyEngineForce(-engineForce, 2);
        vehicle.applyEngineForce(-engineForce, 3);
    } else {
        vehicle.applyEngineForce(0, 2);
        vehicle.applyEngineForce(0, 3);
    }

    // Braking
    if (keys.s && currentSpeed > 5) {
        vehicle.setBrake(100, 2); vehicle.setBrake(100, 3);
    } else {
        vehicle.setBrake(0, 2); vehicle.setBrake(0, 3);
    }

    // --- FIXED GRADUAL STEERING ---
    // Mathematically reduces your max steering angle at high speeds for perfect stability
    const dynamicMaxSteer = Math.max(0.15, 0.35 - (currentSpeed / 800)); 
    const steerSpeed = 0.005; // Cut in half so it eases in beautifully

    if (keys.a) {
        currentSteer = Math.min(currentSteer + steerSpeed, dynamicMaxSteer);
    } else if (keys.d) {
        currentSteer = Math.max(currentSteer - steerSpeed, -dynamicMaxSteer);
    } else {
        // Auto-center smoothly
        currentSteer *= 0.85; 
        if (Math.abs(currentSteer) < 0.001) currentSteer = 0;
    }

    vehicle.setSteeringValue(currentSteer, 0);
    vehicle.setSteeringValue(currentSteer, 1);
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

function checkGameState() {
    if (chassisBody.position.y < -40) {
        resetCar();
        startTime = Date.now(); 
    }

    if (finishZone) {
        const carBox = new THREE.Box3().setFromObject(chassisBody.mesh);
        const finishBox = new THREE.Box3().setFromObject(finishZone);

        if (carBox.intersectsBox(finishBox)) {
            isPlaying = false;
            document.getElementById('timer').style.display = 'none';
            document.getElementById('speedometer').style.display = 'none';
            document.getElementById('back-btn').classList.add('hidden');
            
            document.getElementById('end-screen').classList.remove('hidden');
            document.getElementById('final-time').innerText = formatTime(elapsedTime);
            
            displayLocalLeaderboard();
        }
    }
}

// --- MAIN ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (isPlaying) {
        world.step(1 / 60);
        updateVehicleControls();

        chassisBody.mesh.position.copy(chassisBody.position);
        chassisBody.mesh.quaternion.copy(chassisBody.quaternion);

        for (let i = 0; i < vehicle.wheelInfos.length; i++) {
            vehicle.updateWheelTransform(i);
            const t = vehicle.wheelInfos[i].worldTransform;
            vehicle.wheelInfos[i].mesh.position.copy(t.position);
            vehicle.wheelInfos[i].mesh.quaternion.copy(t.quaternion);
        }

        const chaseDist = 8.5; 
        const chaseHeight = 4.0;
        const cameraOffset = new THREE.Vector3(0, chaseHeight, chaseDist);
        cameraOffset.applyQuaternion(chassisBody.mesh.quaternion);
        cameraOffset.add(chassisBody.mesh.position);
        
        camera.position.lerp(cameraOffset, 0.15); 
        camera.lookAt(chassisBody.mesh.position);

        elapsedTime = Date.now() - startTime;
        document.getElementById('timer').innerText = formatTime(elapsedTime);
        const speed = Math.abs(Math.round(chassisBody.velocity.length() * 3.6));
        document.getElementById('speedometer').innerText = `${speed} km/h`;

        checkGameState();
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- LOCAL LEADERBOARD ---
function getLocalScores() {
    const data = localStorage.getItem(`polytrack_scores_level_${currentLevel}`);
    return data ? JSON.parse(data) : [];
}

function displayLocalLeaderboard() {
    const scores = getLocalScores();
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    if (scores.length === 0) {
        list.innerHTML = '<li>No times recorded yet!</li>';
        return;
    }

    scores.forEach((s, i) => {
        list.innerHTML += `<li><span>${i+1}. ${s.name}</span> <span>${formatTime(s.time)}</span></li>`;
    });
}

function submitScore() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value || 'Player';
    
    const scores = getLocalScores();
    scores.push({ name, time: elapsedTime });
    
    scores.sort((a, b) => a.time - b.time);
    const top5 = scores.slice(0, 5);
    
    localStorage.setItem(`polytrack_scores_level_${currentLevel}`, JSON.stringify(top5));
    
    nameInput.value = ''; 
    displayLocalLeaderboard(); 
}

function returnToMenu() {
    isPlaying = false;
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    document.getElementById('timer').style.display = 'none';
    document.getElementById('speedometer').style.display = 'none';
    document.getElementById('back-btn').classList.add('hidden');
}