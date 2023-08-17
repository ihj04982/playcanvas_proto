var ScCameraFollow = pc.createScript('ScCameraFollow');

ScCameraFollow.attributes.add('target', {
    type: 'entity',
    title: 'Target Dummy',
    description: 'The target entity to follow'
});

ScCameraFollow.attributes.add('cameraEntity', {
    type: 'entity',
    title: 'Camera Entity',
    description: 'The camera entity to control'
});

ScCameraFollow.attributes.add('cameraDistance', {
    type: 'number',
    title: 'Camera Distance',
    description: 'The distance between the camera and the target',
    default: 10
});

ScCameraFollow.attributes.add('rotateSensitivity', {
    type: 'number',
    title: 'Rotate Sensitivity',
    description: 'The Sensitivity of the camera rotation',
    default: 0.05
});


ScCameraFollow.prototype.initialize = function () {
    this.cameraYaw = 90;
    this.cameraPitch = 45;
    this.mousePressed = false;

    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
};

ScCameraFollow.prototype.update = function (dt) {
    if (!this.target || !this.cameraEntity) return;

    var targetPosition = this.target.getPosition();
    var cameraOffset = this.calculateCameraOffset();
    var desiredPosition;
    var newPosition;

    var rayStart = targetPosition.clone();
    var rayEnd = targetPosition.clone().add(cameraOffset.clone());
    var result = this.app.systems.rigidbody.raycastFirst(rayStart, rayEnd);

    var collisionDistance;

    if (result && !result.entity.tags.has('Signal', 'StreetLight', 'TrafficLight') && result != this.cameraEntity) {
        var collisionPoint = result.point;
        collisionDistance = targetPosition.clone().distance(collisionPoint);

        var newCameraDistance;
        newCameraDistance = Math.max(collisionDistance - 0.2, 0);
        cameraOffset.normalize().scale(newCameraDistance);
    }

    desiredPosition = targetPosition.clone().add(cameraOffset);
    newPosition = this.dampenPosition(desiredPosition);
    this.cameraEntity.setPosition(newPosition);
    this.cameraEntity.lookAt(targetPosition.clone());
};


ScCameraFollow.prototype.calculateCameraOffset = function () {
    var cameraOffset = new pc.Vec3(
        this.cameraDistance * Math.sin(this.cameraPitch * pc.math.DEG_TO_RAD) * Math.cos(this.cameraYaw * pc.math.DEG_TO_RAD),
        this.cameraDistance * Math.cos(this.cameraPitch * pc.math.DEG_TO_RAD),
        this.cameraDistance * Math.sin(this.cameraPitch * pc.math.DEG_TO_RAD) * Math.sin(this.cameraYaw * pc.math.DEG_TO_RAD)
    );
    return cameraOffset;
};

ScCameraFollow.prototype.dampenPosition = function (desiredPosition) {
    var dampingFactor = 0.1;
    var currentPosition = this.cameraEntity.getPosition();
    var positionDelta = desiredPosition.clone().sub(currentPosition);
    positionDelta.scale(dampingFactor);
    return currentPosition.clone().add(positionDelta);
};



ScCameraFollow.prototype.onMouseDown = function (event) {
    if (event.button === pc.MOUSEBUTTON_RIGHT) {
        window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        this.mousePressed = true;
        this.mouseDragged = false;
    }
};

ScCameraFollow.prototype.onMouseUp = function (event) {
    if (event.button === pc.MOUSEBUTTON_RIGHT) {
        this.mousePressed = false;
    }
};

ScCameraFollow.prototype.onMouseMove = function (event) {
    if (this.mousePressed) {
        var deltaX = event.dx || 0;
        var deltaY = event.dy || 0;

        if (deltaX !== 0 || deltaY !== 0) {
            this.mouseDragged = true;
            this.cameraYaw -= deltaX * this.rotateSensitivity;
            this.cameraPitch -= deltaY * this.rotateSensitivity;
            this.cameraPitch = pc.math.clamp(this.cameraPitch, -89, 89);
        }
    }
};

ScCameraFollow.prototype.getCameraDirections = function () {
    var forward, right;

    forward = this.cameraEntity.forward;
    right = this.cameraEntity.right;
    return {
        forward: forward,
        right: right
    };
};
