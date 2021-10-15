// Controlling 3D character with voice classifier 
// assignment for Yining Shi's ITP Fa21 ML for Web class
// Resources:
// EXCELLENT Tutorial from https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/
// check out my classmate's adaptation with the same tutorial + BlazePose: https://github.com/quavaro/blazepose-3d/

let scene,  
    renderer,
    camera,
    model,                              // Our character
    neck,                               // Reference to the neck bone in the skeleton
    waist,                               // Reference to the waist bone in the skeleton
    possibleAnims,                      // Animations found in our file
    mixer,                              // THREE.js animations mixer
    idle,                               // Idle, the default state our character returns to
    squat,
    burpee,
    jumpingjack,
    clock = new THREE.Clock(),          // Used for anims, which run to a clock instead of frame rate 
    currentlyAnimating = false,         // Used to check whether characters neck is being used in another anim
    raycaster = new THREE.Raycaster(),  // Used to detect the click on our character
    loaderAnim = document.getElementById('js-loader');


const mySoundModelURL = 'https://teachablemachine.withgoogle.com/models/G470IzpbC/' + 'model.json';
let mySoundModel, resultDiv;
    
function preload() {
    mySoundModel = ml5.soundClassifier(mySoundModelURL);
}

function setup() {
    mySoundModel.classify(gotResults);
}

init();

function init() {
    const MODEL_PATH = 'squidGirl2.glb';

    var loader = new THREE.GLTFLoader();

    loader.load(
        MODEL_PATH,
        function(gltf) {
            model = gltf.scene;
            let fileAnimations = gltf.animations;
        
            model.traverse(o => {
                
                // if (o.isBone) {
                //     console.log(o.name);
                // }

                if (o.isMesh) {
                  o.castShadow = true;
                  o.receiveShadow = true;
                }
                if (o.isBone && o.name === 'mixamorigNeck') { 
                    neck = o;
                }
                if (o.isBone && o.name === 'mixamorigSpine') { 
                    waist = o;
                }
            });

            // Set the models initial scale
            model.scale.set(6, 6, 6);   
            model.position.y = -11;

            scene.add(model);
            loaderAnim.remove();
            mixer = new THREE.AnimationMixer(model);

            let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');
            
            idleAnim.tracks.splice(3, 3);
            idleAnim.tracks.splice(9, 3);
            
            idle = mixer.clipAction(idleAnim);
            idle.play();

            // squat
            let squatAnim = THREE.AnimationClip.findByName(fileAnimations, 'squating');
            squat = mixer.clipAction(squatAnim);
            // burpee
            let burpeeAnim = THREE.AnimationClip.findByName(fileAnimations, 'burpee');
            burpee = mixer.clipAction(burpeeAnim);
            // jumpingjack
            let jumpingjackAnim = THREE.AnimationClip.findByName(fileAnimations, 'jumpingjack');
            jumpingjack = mixer.clipAction(jumpingjackAnim);
        },
        undefined, // We don't need this function
        function(error) {
            console.error(error);
        }
    );

    const canvas = document.querySelector('#c');
    const backgroundColor = 0xf1f1f1;

    // Init the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = new THREE.Fog(backgroundColor, 60, 100);

    // Init the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Add a camera
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 30 
    camera.position.x = 0;
    camera.position.y = -3;

    // Add lights
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
    hemiLight.position.set(0, 50, 0);

    // Add hemisphere light to scene
    scene.add(hemiLight);

    let d = 8.25;
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
    dirLight.position.set(-8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = d * -1;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = d * -1;
    
    // Add directional Light to scene
    scene.add(dirLight);

    // Floor
    let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    let floorMaterial = new THREE.MeshPhongMaterial({
        color: 0xeeeeee,
        shininess: 0,
    });

    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI; // This is 90 degrees by the way
    floor.receiveShadow = true;
    floor.position.y = -11;
    scene.add(floor);

    let geometry = new THREE.SphereGeometry(8, 32, 32);
    let material = new THREE.MeshBasicMaterial({ color: 0x9bffaf }); // 0xf2ce2e 
    let sphere = new THREE.Mesh(geometry, material);
    sphere.position.z = -15;
    sphere.position.y = -2.5;
    sphere.position.x = -0.25;
    scene.add(sphere);
}

function update(){
    if (mixer) {
        mixer.update(clock.getDelta());
    }

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
}

update();

function resizeRendererToDisplaySize(renderer) {
    
    const canvas = renderer.domElement;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let canvasPixelWidth = canvas.width / window.devicePixelRatio;
    let canvasPixelHeight = canvas.height / window.devicePixelRatio;
  
    const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height;
    
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
}

window.addEventListener('click', e => raycast(e));
window.addEventListener('touchend', e => raycast(e, true));

function raycast(e, touch = false) {
    var mouse = {};
    if (touch) {
        mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
        mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
    } else {
        mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
    }
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects[0]) {
        var object = intersects[0].object;

        if (!currentlyAnimating) {
            currentlyAnimating = true;
            playOnClick();
        }
    }

    function playOnClick() {
        console.log('clicked');
        squat.play();
        playModifierAnimation(idle, 0.25, squat, 0.25);
    }


    // function playModifierAnimation(from, fSpeed, to, tSpeed) {
    //     to.setLoop(THREE.LoopOnce);
    //     to.reset();
    //     to.play();
    //     from.crossFadeTo(to, fSpeed, true);
    //     setTimeout(function() {
    //         from.enabled = true;
    //         to.crossFadeTo(from, tSpeed, true);
    //         currentlyAnimating = false;
    //     }, to._clip.duration * 1000 - ((tSpeed + fSpeed) * 1000));
    // }

}

document.addEventListener('mousemove', function(e) {
    var mousecoords = getMousePos(e);

    if (neck && waist) {
        moveJoint(mousecoords, neck, 50);
        moveJoint(mousecoords, waist, 30);
    }

});
  
function getMousePos(e) {
    return { x: e.clientX, y: e.clientY };
}

function moveJoint(mouse, joint, degreeLimit) {
    let degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
    joint.rotation.y = THREE.Math.degToRad(degrees.x);
    joint.rotation.x = THREE.Math.degToRad(degrees.y);
}

function getMouseDegrees(x, y, degreeLimit) {
    let dx = 0,
        dy = 0,
        xdiff,
        xPercentage,
        ydiff,
        yPercentage;
  
    let w = { x: window.innerWidth, y: window.innerHeight };
  
    // Left (Rotates neck left between 0 and -degreeLimit)
    
    // 1. If cursor is in the left half of screen
    if (x <= w.x / 2) {
        // 2. Get the difference between middle of screen and cursor position
        xdiff = w.x / 2 - x;  
        // 3. Find the percentage of that difference (percentage toward edge of screen)
        xPercentage = (xdiff / (w.x / 2)) * 100;
        // 4. Convert that to a percentage of the maximum rotation we allow for the neck
        dx = ((degreeLimit * xPercentage) / 100) * -1; 
    }
    
    // Right (Rotates neck right between 0 and degreeLimit)
    if (x >= w.x / 2) {
        xdiff = x - w.x / 2;
        xPercentage = (xdiff / (w.x / 2)) * 100;
        dx = (degreeLimit * xPercentage) / 100;
    }
    // Up (Rotates neck up between 0 and -degreeLimit)
    if (y <= w.y / 2) {
        ydiff = w.y / 2 - y;
        yPercentage = (ydiff / (w.y / 2)) * 100;
        // Note that I cut degreeLimit in half when she looks up
        dy = (((degreeLimit * 0.5) * yPercentage) / 100) * -1;
    }
    
    // Down (Rotates neck down between 0 and degreeLimit)
    if (y >= w.y / 2) {
        ydiff = y - w.y / 2;
        yPercentage = (ydiff / (w.y / 2)) * 100;
        dy = (degreeLimit * yPercentage) / 100;
    }
    return { x: dx, y: dy };
}

function gotResults(err, results) {
    if (err) console.log(err);

    if (results) {
        console.log(results[0].label);

        if (results[0].confidence > 0.9 && results[0].label === 'Squat') {
            console.log('squating');
            squat.play();
            playModifierAnimation(idle, 0.25, squat, 0.25);
        } 

        else if (results[0].confidence > 0.9 && results[0].label === 'Burpee'){
            console.log('burpee');
            burpee.play();
            playModifierAnimation(idle, 0.25, burpee, 0.25);
        }

        else if (results[0].confidence > 0.9 && results[0].label === 'JumpingJack'){
            console.log('jumping jack');
            jumpingjack.play();
            playModifierAnimation(idle, 0.25, jumpingjack, 0.25);
        }
    
    }
}

function playModifierAnimation(from, fSpeed, to, tSpeed) {
    // to.setLoop(THREE.LoopOnce);
    to.setLoop(THREE.LoopRepeat);
    to.reset();
    to.play();
    from.crossFadeTo(to, fSpeed, true);

    setTimeout(function() {
        from.enabled = true;
        to.crossFadeTo(from, tSpeed, true);
        currentlyAnimating = false;
    }, to._clip.duration * 2000 - ((tSpeed + fSpeed) * 1000));
}