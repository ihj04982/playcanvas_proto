var ScCollisionGenerator = pc.createScript('scCollisionGenerator');

// Add targetEntity property
ScCollisionGenerator.attributes.add('targetEntity', {
    type: 'entity',
    title: 'Target Entity',
    description: 'The entity to apply the collision generator script.'
});

// initialize code called once per entity
ScCollisionGenerator.prototype.initialize = function () {
    if (!this.targetEntity) {
        console.error("ScCollisionGenerator: Target Entity not set.");
        return;
    }
    this.addCollisionRecursive(this.targetEntity);
};

ScCollisionGenerator.prototype.addCollisionRecursive = function (entity) {
    var children = entity.children;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.children.length > 0) {
            this.addCollisionRecursive(child)
        } else {
            if (child.render) {
                var meshAsset = child.render.asset;
                child.addComponent('collision', {
                    type: 'mesh',
                    renderAsset: meshAsset
                });
                child.addComponent('rigidbody', {
                    type: 'static'
                });
            }
        }
    }
};

ScCollisionGenerator.prototype.addCollisionRecursiveWolrd2 = function (entity) {

    var name = entity.name;

    var hasEnvOrVehCar = name.indexOf("Env") !== -1 || name.indexOf("Veh_Car") !== -1;
    var isExcludedChild = name.indexOf("Plates") !== -1 || name.indexOf("Steering") !== -1 || name.indexOf("Wheel") !== -1;

    if (entity.render && hasEnvOrVehCar && !isExcludedChild) {
        var meshAsset = entity.render.asset;
        if (meshAsset) {
            entity.addComponent('collision', {
                type: 'mesh',
                renderAsset: meshAsset
            });
            entity.addComponent('rigidbody', {
                type: 'static'
            });
        }
    }

    var children = entity.children;
    if (!children) {
        return;
    }

    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        this.addCollisionRecursive(child);
    }

};