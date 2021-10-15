// Tutorial from https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/

let scene,  
    renderer,
    camera,
    model,                              // Our character
    neck,                               // Reference to the neck bone in the skeleton
    waist,                               // Reference to the waist bone in the skeleton
    possibleAnims,                      // Animations found in our file
    mixer,                              // THREE.js animations mixer
    idle,                               // Idle, the default state our character returns to
    clock = new THREE.Clock(),          // Used for anims, which run to a clock instead of frame rate 
    currentlyAnimating = false,         // Used to check whether characters neck is being used in another anim
    raycaster = new THREE.Raycaster(),  // Used to detect the click on our character
    loaderAnim = document.getElementById('js-loader');


init();

function init() {
    const MODEL_PATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb';

    let stacy_txt = new THREE.TextureLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg');

    stacy_txt.flipY = false; // we flip the texture so that its the right way up

    const stacy_mtl = new THREE.MeshPhongMaterial({
    map: stacy_txt,
    color: 0xffffff,
    skinning: true
    });

    var loader = new THREE.GLTFLoader();

    loader.load(
        MODEL_PATH,
        function(gltf) {
        // A lot is going to happen here
            model = gltf.scene;
            let fileAnimations = gltf.animations;
        
            model.traverse(o => {
                if (o.isMesh) {
                  o.castShadow = true;
                  o.receiveShadow = true;
                  o.material = stacy_mtl;
                }
                // Reference the neck and waist bones
                if (o.isBone && o.name === 'mixamorigNeck') { 
                    neck = o;
                }
                if (o.isBone && o.name === 'mixamorigSpine') { 
                    waist = o;
                }
            });

            // Set the models initial scale
            model.scale.set(7, 7, 7);   
            model.position.y = -11;

            scene.add(model);
            loaderAnim.remove();
            mixer = new THREE.AnimationMixer(model);
            // based on custon animation, modify based on your model structure
            let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');
            
            idleAnim.tracks.splice(3, 3);
            idleAnim.tracks.splice(9, 3);
            
            idle = mixer.clipAction(idleAnim);
            idle.play();

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

