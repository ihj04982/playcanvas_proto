var ScPlayerController = pc.createScript('scPlayerController');

ScPlayerController.attributes.add('movementType', {
    type: 'string',
    title: 'Movement Type',
    enum: [
        { 'Joystick': 'joystick' },
        { 'WASD': 'wasd' }
    ],
    default: 'joystick',
});

ScPlayerController.attributes.add('joystickId', {
    type: 'string',
    title: 'Joystick ID'
});

ScPlayerController.attributes.add('jumpButtonId', {
    type: 'string',
    title: 'Jump Button ID'
});

ScPlayerController.attributes.add('speed', {
    type: 'number',
    title: 'Move Speed',
    default: 5
});

ScPlayerController.attributes.add('jumpPower', {
    type: 'number',
    title: 'Jump Power',
    default: 500
});

ScPlayerController.attributes.add('minWalkableHeight', {
    type: 'number',
    title: 'Min Obstacle Height',
    default: 0.16
});

ScPlayerController.attributes.add('maxWalkableHeight', {
    type: 'number',
    title: 'Max Obstacle Height',
    default: 0.3
});

ScPlayerController.attributes.add('modelEntity', {
    type: 'entity',
    title: 'Model Entity'
});

ScPlayerController.prototype.initialize = function () {

    this.walkableObstacle = false;
    this.isJumping = false;
    this.isStopped = false;

    this.loadMyAccount();
    this.network = pc.network;
    var isConnected = this.network.isConnected();

    if (isConnected === false) {
        try {
            this.network.connect();

            var email = 'test1@mz.co.kr';
            var nickname = 'test2';

            console.log('[ScPlayerController] this.app.myAccount: ', this.app.myAccount);

            if (this.app.myAccount) {
                if (this.app.myAccount.email) {
                    email = this.app.myAccount.email;
                }
                if (this.app.myAccount.nickname) {
                    nickname = this.app.myAccount.nickname;
                }
            }

            // this.network.join(email, nickname, {
            //     position: this.entity.getPosition()
            // });
        } catch (err) {
            console.error(err);
        }
    }

    var nicknameLabel = this.entity.findByName("Text_NickName");
    nicknameLabel.element.text = this.app.myAccount.nickname;
};

ScPlayerController.prototype.loadMyAccount = function () {
    this.app.myAccount = {};

    let jsonString = window.localStorage.getItem('my_account');
    if (jsonString) {
        let member = JSON.parse(jsonString);
        // console.log('[client][playcanvas][myAccount] member', member);
        if (member) {
            this.app.myAccount = member;
        }
    }
};

ScPlayerController.prototype.update = function (dt) {
    switch (this.movementType) {
        case 'joystick': {
            this.moveByJoystick();
        } break;
        case 'wasd': {
            this.moveByWASD(dt);
        } break;
    }
    this.updatejumpingState();
    this.updateWalkableObstacleState();
    this.moveVertically(dt);
};



ScPlayerController.prototype.moveByJoystick = function (dt) {
    const joypad = window.touchJoypad;
    const joystick = joypad.sticks[this.joystickId];

    var velocity = new pc.Vec3();
    var forward = this.entity.forward;
    var right = this.entity.right;

    var frameMovementRight = right.clone().scale(joystick.x);
    var frameMovementForward = forward.clone().scale(joystick.y * -1);

    velocity.add2(frameMovementRight, frameMovementForward);

    velocity.normalize();
    velocity.scale(this.speed);
    var cameraRotation = this.getCameraRotation();

    this.handleMovement(velocity, cameraRotation);

};

ScPlayerController.prototype.moveByWASD = function (dt) {
    var velocity = new pc.Vec3();
    var forward = this.entity.forward;
    var right = this.entity.right;

    if (this.app.keyboard.isPressed(pc.KEY_A)) { velocity.sub(right); }
    if (this.app.keyboard.isPressed(pc.KEY_D)) { velocity.add(right); }
    if (this.app.keyboard.isPressed(pc.KEY_W)) { velocity.sub(forward); }
    if (this.app.keyboard.isPressed(pc.KEY_S)) { velocity.add(forward); }

    // velocity.scale(dt).normalize();
    velocity.normalize();
    velocity.scale(this.speed);
    var cameraRotation = this.getCameraRotation();

    this.handleMovement(velocity, cameraRotation);
};

ScPlayerController.prototype.handleMovement = function (velocity, cameraRotation) {
    if (velocity.x !== 0 || velocity.z !== 0) {
        velocity = cameraRotation.forward.clone().scale(velocity.z).add(cameraRotation.right.clone().scale(velocity.x));
        this.moveHorizontally(velocity);
        this.sendMovementToNetwork(velocity);
        this.isStopped = false;
    } else {
        this.modelEntity.anim.setFloat('Speed', 0);
        if (this.isJumping && !this.isStopped) {
            this.sendMovementToNetwork(velocity);
            this.isStopped = true;
        }
    }
};

ScPlayerController.prototype.sendMovementToNetwork = function (velocity) {
    this.network.move(this.app.myAccount.email, {
        velocity: velocity,
        position: this.entity.getPosition(),
        jump: this.isJumping
    });
};


ScPlayerController.prototype.moveHorizontally = function (velocity) {
    this.modelEntity.anim.setFloat('Speed', 1);

    var angle = this.getNewAngle(velocity);
    this.modelEntity.setEulerAngles(0, angle, 0);

    velocity.y = this.entity.rigidbody.linearVelocity.y;
    this.entity.rigidbody.linearVelocity = velocity;
};


ScPlayerController.prototype.getCameraRotation = function (dt) {
    var cameraFollowEntity = this.app.root.findByName("CameraFollow");
    var cameraFollowScript = cameraFollowEntity.script.get('ScCameraFollow');

    var cameraRotation = cameraFollowScript.getCameraDirections();
    if (cameraRotation) {
        var cameraForward = cameraRotation.forward.clone().normalize();
        var cameraRight = cameraRotation.right.clone().normalize();
        cameraForward.y = 0;
        cameraRight.y = 0;
    }
    return {
        forward: cameraForward,
        right: cameraRight
    };
};

ScPlayerController.prototype.getNewAngle = function (velocity) {
    var angle = 0;
    var newAngle = 90 - (Math.atan2(velocity.z, velocity.x) * pc.math.RAD_TO_DEG);

    return pc.math.lerpAngle(angle, newAngle, 1) % 360;

};

ScPlayerController.prototype.moveVertically = function (dt) {
    if (!this.isJumping) {
        this.handleJump();
    }
    if (!this.isJumping && this.walkableObstacle) {
        this.handleWalkableObstacleJump();
    }
};

ScPlayerController.prototype.handleJump = function () {
    const joypad = window.touchJoypad;

    if (this.app.keyboard.wasPressed(pc.KEY_SPACE) || joypad.buttons.wasPressed(this.jumpButtonId)) {
        var jumpVector = new pc.Vec3();
        jumpVector.y = this.jumpPower;
        this.entity.rigidbody.applyImpulse(jumpVector);
    }
};

ScPlayerController.prototype.handleWalkableObstacleJump = function () {
    var jumpVector = new pc.Vec3();
    jumpVector.y = (this.jumpPower / 4);
    this.entity.rigidbody.applyImpulse(jumpVector);
};

ScPlayerController.prototype.updatejumpingState = function () {
    var groundRayStart = this.entity.getPosition();
    var groundrayEnd = groundRayStart.clone();
    groundrayEnd.y -= this.entity.collision.halfExtents.y + 0.2;
    var groundedResult = this.app.systems.rigidbody.raycastFirst(groundRayStart, groundrayEnd);
    if (groundedResult && groundedResult.entity.rigidbody && groundedResult.entity.rigidbody.type === pc.BODYTYPE_STATIC) {
        this.isJumping = false;
        this.entity.rigidbody.linearDamping = 0.9999;
        this.modelEntity.anim.setBoolean('isJumping', false);
    } else {
        this.isJumping = true;
        this.entity.rigidbody.linearDamping = 0.2;
        this.modelEntity.anim.setBoolean('isJumping', true);
    }
};

ScPlayerController.prototype.updateWalkableObstacleState = function () {
    var forwardRayStart = this.entity.getPosition().clone();
    var modelForward = this.modelEntity.forward.clone().scale(-1);
    var offset = modelForward.clone().scale(0.35);
    forwardRayStart.add(offset);
    var forwardRayEnd = forwardRayStart.clone();
    forwardRayEnd.y -= 1;
    var forwardRayResult = this.app.systems.rigidbody.raycastFirst(forwardRayStart, forwardRayEnd);
    if (forwardRayResult && forwardRayResult.normal) {
        var obstacleHeight = (this.entity.collision.halfExtents.y - (forwardRayStart.y - forwardRayResult.point.y));
        if (this.minWalkableHeight <= obstacleHeight && obstacleHeight <= this.maxWalkableHeight) {
            this.walkableObstacle = true;
        } else if (obstacleHeight < this.minWalkableHeight || obstacleHeight > this.maxWalkableHeight) {
            this.walkableObstacle = false;
        }
    } else {
        this.walkableObstacle = false;
    }
};