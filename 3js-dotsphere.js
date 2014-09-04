var VisaDots = (function(){

    // Class properties

    var settings = {
        sphereSize:     400,
        numOfNodes:     200,
        cameraZ:        500,
        cameraSpeed:    0.25,
        lineOpacity:    0.25,
        orbitalControl: true
    };

    var windowHalfX     = window.innerWidth / 2,
        windowHalfY     = window.innerHeight / 2,
        PI2             = Math.PI * 2,
        objects         = [],
        zooming         = false,
        sin             = cos = 0,
        cameraDistance  = settings.cameraZ,
        camera,
        projector,
        scene,
        renderer,
        controls;

    var mouseX = -windowHalfX, mouseY = -windowHalfY;

    // Class methods

    var init = function() {
        var container   = document.createElement('div'),
            amountX     = 50,
            amountY     = 50,
            particle,
            material;

        camera      = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100000 );
        scene       = new THREE.Scene();
        projector   = new THREE.Projector();
        renderer    = new THREE.CanvasRenderer();

        if (settings.orbitalControl) {
            controls                    = new THREE.OrbitControls(camera);
            controls.autoRotate         = true;
            controls.autoRotateSpeed    = settings.cameraSpeed;
            controls.userZoom           = false;
        }

        camera.position.z = settings.cameraZ;
        renderer.setSize(window.innerWidth,window.innerHeight);

        document.body.appendChild(container);
        container.appendChild(renderer.domElement);

        // Particles
        var geometry = new THREE.Geometry(),
            materialProgram = function(context) {
                context.beginPath();
                context.arc(0,0,1,0,PI2,true);
                context.fill();
            },
            randomColor = function() {
                if (Math.random()>=0.25) return 0xffffff;
                return 0xffa000
            };

        for (var i=0;i<settings.numOfNodes;i++) {
            material = new THREE.ParticleCanvasMaterial({color:randomColor(),program:materialProgram,transparent:true});
            particle = new THREE.Particle(material);

            particle.position.x = Math.random() * 2 - 1;
            particle.position.y = Math.random() * 2 - 1;
            particle.position.z = Math.random() * 2 - 1;
            particle.position.normalize();
            particle.position.multiplyScalar( Math.random() * 10 + settings.sphereSize );
            particle.scale.x = particle.scale.y = 10;

            objects.push(particle);
            scene.add(particle);
            geometry.vertices.push(particle.position);
        }

        // Lines
        scene.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffffff,opacity:settings.lineOpacity})));

        //document.addEventListener('mousemove',onDocumentMouseMove,false);
        document.addEventListener('mousedown',onDocumentMouseDown,false);
        document.addEventListener('touchstart',onDocumentTouchStart,false);
        //document.addEventListener('touchmove',onDocumentTouchMove,false);
        window.addEventListener('resize',onWindowResize,false);
        if (settings.orbitalControl) controls.addEventListener('change',render);
    };

    var moveToNode = function(obj) {
        if (zooming) return;
        zooming = true;
        controls.autoRotate = false;
        controls.userRotate = false;

        var oldPos = obj.position.clone();
        var newPos = obj.position.clone().multiplyScalar(1.25);

        var moveToObj = function() {
                TweenLite.to(camera.position,1,{
                    x:          newPos.x,
                    y:          newPos.y,
                    z:          newPos.z,
                    ease:       Quad.easeInOut,
                    bezier:     [{x:newPos.x, y:newPos.y, z:newPos.z}],
                    onComplete: finishMove
                });
            },
            finishMove = function() {
                setTimeout(function() {
                    cameraDistance      = newPos.z;
                    zooming             = false;
                    controls.autoRotate = true;
                    controls.userRotate = true;
                },500);
            }

        TweenLite.to(camera.position,0.5,{
            x:          camera.position.x * 1.15,
            y:          camera.position.y * 1.15,
            z:          camera.position.z * 1.15,
            ease:       Quad.easeInOut,
            onComplete: moveToObj
        });
    };

    var onDocumentMouseDown = function(evt) {
        var clientX = evt.clientX,
            clientY = evt.clientY;

        if (evt.type==='touchstart') {
            clientX = evt.touches[0].clientX;
            clientY = evt.touches[0].clientY;
        }

        //writeDebug(evt.clientX+' - '+evt.clientY);
        var vector = new THREE.Vector3((clientX / window.innerWidth) * 2 - 1,-(clientY/window.innerHeight) * 2 + 1,0.5);
        projector.unprojectVector(vector,camera);

        var raycaster = new THREE.Raycaster(camera.position,vector.sub(camera.position).normalize());
        var intersects = raycaster.intersectObjects(objects);
        if (intersects.length===0) return;

        evt.preventDefault();

        var material = new THREE.ParticleCanvasMaterial({
            color:      0xffa000,
            program:    function (context) {
                context.beginPath();
                context.arc(0,0,1,0,PI2,true);
                context.fill();
            }
        });

        intersects[0].object.material = material;
        moveToNode(intersects[0].object);
    };

    var onWindowResize = function() {
        windowHalfX     = window.innerWidth / 2;
        windowHalfY     = window.innerHeight / 2;
        camera.aspect   = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    };

    var onDocumentTouchStart = function(evt) {
        if (evt.touches.length<1) return;
        mouseX = evt.touches[0].pageX - windowHalfX;
        mouseY = evt.touches[0].pageY - windowHalfY;
        onDocumentMouseDown(evt);
        evt.preventDefault();
    };

    var onDocumentTouchMove = function(evt) {
        evt.preventDefault();
        if (evt.touches.length!=1) return;

        mouseX = evt.touches[0].pageX - windowHalfX;
        mouseY = evt.touches[0].pageY - windowHalfY;
    };

    var setOpacity = function() {
        var i, objRef, newOpacity;
        for (i=0;i<objects.length;i++) {
            objRef = objects[i];
            newOpacity = objRef.position.distanceTo(camera.position)/1000;
            newOpacity = (newOpacity) + 0.25;

            if (newOpacity<0.1)    newOpacity = 0.1;
            if (newOpacity>1)      newOpacity = 1;

            objRef.material.opacity = newOpacity;
        }
    };

    var animate = function() {
        requestAnimationFrame(animate);
        render();
        if (settings.orbitalControl) controls.update();
    };

    var render = function() {
        setOpacity();
        camera.lookAt(scene.position);
        renderer.render(scene,camera);
    };

    var radToDeg = function(value) { return value*180/Math.PI; }

    var writeDebug = function(message) {
        var debugBox = document.getElementById('debug');
        if (debugBox===null) return;
        
        debugBox.innerHTML += '<p>' + message + '</p>';
        debugBox.scrollTop = debugBox.scrollHeight
    };
    
    (function() {
        init();
        animate();
    }());

    // Return 'public' method(s)
    return { };

}());