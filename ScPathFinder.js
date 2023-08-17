// A* Node class
class AStarNode {
    constructor(x, y, z, isWalkable) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.isWalkable = isWalkable;
        this.parent = null;
        this.gCost = 0;
        this.hCost = 0;
    }

    get fCost() {
        return this.gCost + this.hCost;
    }
}

//Calculate the Euclidean distance between two nodes in 3D space
function distance(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    let dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Helper function to clamp a value to a range
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// A* pathfinding algorithm
function astar(startNode, endNode, grid, planeEntity, resolution) {
    if (!endNode.isWalkable && !startNode.isWalkable) {
        console.log("No path found due to invalid start or end node");
        return [];
    }

    const openList = [startNode];
    const closedList = new Set();

    while (openList.length > 0) {
        let lowestIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].fCost < openList[lowestIndex].fCost) {
                lowestIndex = i;
            }
        }

        const currentNode = openList[lowestIndex];
        openList.splice(lowestIndex, 1);
        closedList.add(currentNode);

        if (currentNode === endNode) {
            const path = [];
            let current = currentNode;
            while (current !== null) {
                path.push(current);
                current = current.parent;
            }
            return path.reverse();
        }

        const neighbors = getNeighbors(currentNode, grid, planeEntity, resolution);

        for (let neighbor of neighbors) {
            if (!neighbor.isWalkable || closedList.has(neighbor)) {
                continue;
            }

            const tentativeGCost = currentNode.gCost + distance(currentNode, neighbor);

            if (tentativeGCost < neighbor.gCost || !openList.includes(neighbor)) {
                neighbor.gCost = tentativeGCost;
                neighbor.hCost = distance(neighbor, endNode);
                neighbor.parent = currentNode;

                if (!openList.includes(neighbor)) {
                    openList.push(neighbor);
                }
            }
        }
    }

    console.log("No path found");
    return [];
}

function getNeighbors(node, grid, planeEntity, resolution) {
    const neighbors = [];
    const gridCoords = worldToGridCoordinates(
        new pc.Vec3(node.x, node.y, node.z), grid, planeEntity, resolution);
    const { x: gridX, z: gridZ } = gridCoords;

    [-1, 0, 1].forEach((dx) => {
        [-1, 0, 1].forEach((dz) => {
            if (dx === 0 && dz === 0) return;

            const newX = gridX + dx;
            const newZ = gridZ + dz;

            if (isValidGridPosition(newX, newZ, grid)) {
                neighbors.push(grid[newX][newZ]);
            }
        });
    });

    return neighbors;
}

// Check if the grid position is valid
function isValidGridPosition(x, z, grid) {
    const maxX = grid.length - 1;
    const maxZ = grid[0].length - 1;

    return x >= 0 && x <= maxX && z >= 0 && z <= maxZ;
}
// Convert world coordinates to grid coordinates
function worldToGridCoordinates(worldPos, grid, planeEntity, resolution) {
    const { x: planeWidth, z: planeHeight } = planeEntity.getLocalScale();
    const { x: planePosX, z: planePosZ } = planeEntity.getPosition();

    const offsetX = planeWidth / 2 - planePosX;
    const offsetZ = planeHeight / 2 - planePosZ;

    let gridX = Math.round((worldPos.x + offsetX) / resolution);
    let gridZ = Math.round((worldPos.z + offsetZ) / resolution);

    gridX = clamp(gridX, 0, grid.length - 1);
    gridZ = clamp(gridZ, 0, grid[0].length - 1);

    return { x: gridX, z: gridZ };
}


function createGrid(planeEntity, resolution, obstacleVertices) {
    const { x: planeWidth, z: planeHeight } = planeEntity.getLocalScale();
    const { x: planePosX, z: planePosZ } = planeEntity.getPosition();

    const gridWidth = Math.ceil(planeWidth / resolution);
    const gridHeight = Math.ceil(planeHeight / resolution);
    const newGrid = new Array(gridWidth);

    for (let x = 0; x < gridWidth; x++) {
        newGrid[x] = new Array(gridHeight);
        for (let z = 0; z < gridHeight; z++) {
            let worldX = planePosX - planeWidth / 2 + x * resolution;
            let worldY = 0;
            let worldZ = planePosZ - planeHeight / 2 + z * resolution;

            let isWalkable = true;
            let nodeCorners = [
                new pc.Vec3(worldX - resolution / 2, worldY, worldZ - resolution / 2),
                new pc.Vec3(worldX + resolution / 2, worldY, worldZ - resolution / 2),
                new pc.Vec3(worldX - resolution / 2, worldY, worldZ + resolution / 2),
                new pc.Vec3(worldX + resolution / 2, worldY, worldZ + resolution / 2),
                new pc.Vec3(worldX, worldY, worldZ)
            ];

            for (let corner of nodeCorners) {
                for (let vertices of obstacleVertices) {
                    if (isInsidePolygon(vertices, corner)) {
                        isWalkable = false;
                        break;
                    }
                }
                if (!isWalkable) {
                    break;
                }
            }

            newGrid[x][z] = new AStarNode(worldX, worldY, worldZ, isWalkable);
        }
    }

    return newGrid;
}

function isInsidePolygon(vertices, point) {
    let intersections = 0;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        let xi = vertices[i].x, zi = vertices[i].z;
        let xj = vertices[j].x, zj = vertices[j].z;

        let isZDiffPositive = (zi > point.z) !== (zj > point.z);
        let intersect = isZDiffPositive && (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi);
        if (intersect) {
            intersections++;
        }
    }

    return intersections % 2 !== 0;
}

var ScPathFinder = pc.createScript('scPathFinder');

ScPathFinder.attributes.add('character', { type: 'entity', title: 'Character' });
ScPathFinder.attributes.add('movementSpeed', { type: 'number', default: 5, title: 'Movement Speed' });
ScPathFinder.attributes.add('resolution', { type: 'number', default: 0.5, title: 'Resolution Scale' });
ScPathFinder.attributes.add('startPositionName', { type: 'string', title: 'Start Position Name' });
ScPathFinder.attributes.add('endPositionNameList', { type: 'string', array: true, title: 'End Position Name' });
ScPathFinder.attributes.add('gridVisualization', { type: 'boolean', title: 'Visualize Grid' });

// Initialize pathfinding
ScPathFinder.prototype.initialize = function () {
    this.planeEntity = this.app.root.findByName('plane');
    if (this.startPositionName) {
        this.startPositionEntity = this.app.root.findByName(this.startPositionName);
    }
    if (this.endPositionNameList) {
        this.endPositionEntity = this.app.root.findByName(this.endPositionNameList[0]);
    }
    this.obstacleEntities = this.app.root.findByTag("Obstacle");
    this.exceptionalObstacleEntities = this.app.root.findByTag("ExceptionalObstacle");
    this.obstacleVertices = this.getObstacles(this.exceptionalObstacleEntities, this.obstacleEntities);
    this.grid = createGrid(this.planeEntity, this.resolution, this.obstacleVertices);

    this.initialGrid = JSON.parse(JSON.stringify(this.grid));
    this.setStartAndEndNodes();

    this.endNameListIndex = 0;
    this.app.keyboard.on(pc.EVENT_KEYDOWN, this.handleKeyDown, this);

    if (this.gridVisualization) {
        this.visualizeGrid(this.grid);
    }
};

ScPathFinder.prototype.getObstacles = function (exceptionalObstacles, obstacles) {
    var obstacleArrays = [];
    var maxDistance = 3.0; // Maximum distance for separation

    if (exceptionalObstacles.length === 0) {
        console.error("Targets not found!");
        return [];
    }

    exceptionalObstacles.forEach(function (target) { // Change: Used forEach loop
        var worldPositions = getWorldPosition(target);
        var groupedVertices = groupVerticesByDistance(worldPositions, maxDistance);

        groupedVertices.forEach(function (vertices) { // Change: Used forEach loop
            if (vertices.length > 0) {
                var convexHull = getConvexHull(vertices);
                obstacleArrays.push(convexHull);
            }
        });
    });

    obstacles.forEach(function (obstacle) { // Change: Used forEach loop
        var obstacleVertices = getWorldPosition(obstacle);
        obstacleVertices = getConvexHull(obstacleVertices);
        obstacleArrays.push(obstacleVertices);
    });


    console.log('obstacleArrays', obstacleArrays);
    return obstacleArrays;
};

function getWorldPosition(target) {
    var targetMeshInstance = target.render.meshInstances[0];

    if (!targetMeshInstance) {
        console.error("MeshInstance not found for target:", target);
    }

    var targetMesh = targetMeshInstance.mesh;
    var positions = [];
    targetMesh.getPositions(positions);
    var worldTransform = target.getWorldTransform();

    var worldPositions = [];

    var worldPositions = positions.reduce(function (acc, val, index) {
        if (index % 3 === 0) {
            var localPosition = new pc.Vec3(val, positions[index + 1], positions[index + 2]);
            var worldPosition = worldTransform.transformPoint(localPosition);
            acc.push(worldPosition);
        }
        return acc;
    }, []);

    return worldPositions;
}

function groupVerticesByDistance(vertices, maxDistance) {
    var vertexArrays = [];

    vertices.forEach(function (vertex) {
        var foundArray = vertexArrays.some(function (array) {
            if (array.length > 0) {
                var firstVertex = array[0];
                var distance = firstVertex.distance(vertex);
                if (distance <= maxDistance) {
                    array.push(vertex);
                    return true;
                }
            }
            return false;
        });
        if (!foundArray) {
            var newArray = [vertex];
            vertexArrays.push(newArray);
        }
    });

    return vertexArrays;
}


function getConvexHull(vertices) {
    vertices.sort((a, b) => a.x === b.x ? a.z - b.z : a.x - b.x);

    let lower = [];
    for (let i = 0; i < vertices.length; i++) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], vertices[i]) <= 0) {
            lower.pop();
        }
        lower.push(vertices[i]);
    }

    let upper = [];
    for (let i = vertices.length - 1; i >= 0; i--) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], vertices[i]) <= 0) {
            upper.pop();
        }
        upper.push(vertices[i]);
    }

    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

function cross(o, a, b) {
    return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
}

// New function to set the start and end nodes
ScPathFinder.prototype.setStartAndEndNodes = function () {
    let startCoords = worldToGridCoordinates(this.startPositionEntity.getPosition(), this.grid, this.planeEntity, this.resolution);
    let endCoords = worldToGridCoordinates(this.endPositionEntity.getPosition(), this.grid, this.planeEntity, this.resolution);

    let startNode = this.grid[startCoords.x][startCoords.z];
    let endNode = this.grid[endCoords.x][endCoords.z];

    this.currentNode = startNode;

    this.previousEndPosition = this.endPositionEntity.getPosition().clone();
    this.path = astar(startNode, endNode, this.grid, this.planeEntity, this.resolution);
    this.currentNodeIndex = 0;

    console.log('[ScPathFinder] path to', this.endPositionEntity.name, ': ', this.path.map(node => ({ x: node.x, y: node.y, z: node.z })));
};

ScPathFinder.prototype.handleKeyDown = function (event) {
    if (event.key >= pc.KEY_0 && event.key <= pc.KEY_2) {
        this.endNameListIndex = event.key - pc.KEY_0;
        if (this.endPositionNameList && this.endNameListIndex < this.endPositionNameList.length) {
            this.endPositionEntity = this.app.root.findByName(this.endPositionNameList[this.endNameListIndex]);
            this.grid = JSON.parse(JSON.stringify(this.initialGrid));
            this.setStartAndEndNodes();
        }
    }

};

// Update character movement along the path
ScPathFinder.prototype.update = function (dt) {
    if (this.path && this.path.length > 0 && this.currentNodeIndex < this.path.length) {

        let targetNode = this.path[this.currentNodeIndex];
        let targetPosition = new pc.Vec3(targetNode.x, 0.5, targetNode.z);
        let distanceToTarget = this.character.getPosition().distance(targetPosition);

        if (distanceToTarget > 0.001) {
            this.moveToTarget(dt, this.character, targetPosition);
        } else if (this.currentNodeIndex < this.path.length - 1) {
            this.currentNodeIndex++;
            this.currentNode = this.path[this.currentNodeIndex];
        } else if (this.endPositionNameList) {
            this.endNameListIndex = (this.endNameListIndex + 1) % this.endPositionNameList.length;
            this.endPositionEntity = this.app.root.findByName(this.endPositionNameList[this.endNameListIndex]);
            this.grid = JSON.parse(JSON.stringify(this.initialGrid));
            this.setStartAndEndNodes();
        }

    }
};

// move the character towards a target position
ScPathFinder.prototype.moveToTarget = function (dt, character, targetPosition) {
    let direction = targetPosition.clone().sub(character.getPosition()).normalize();
    let distanceToTarget = character.getPosition().distance(targetPosition);
    let moveDistance = Math.min(this.movementSpeed * dt, distanceToTarget);
    character.translate(direction.scale(moveDistance));
};

ScPathFinder.prototype.visualizeGrid = function (grid) {
    
    this.redMaterial = new pc.StandardMaterial();
    this.redMaterial.diffuse.set(1, 0, 0);
    this.redMaterial.update();

    this.greenMaterial = new pc.StandardMaterial();
    this.greenMaterial.diffuse.set(0, 1, 0);
    this.greenMaterial.update();
    
    for (let x = 0; x < grid.length; x++) {
        for (let z = 0; z < grid[x].length; z++) {
            let node = grid[x][z];
            let cube = new pc.Entity();

            let material = node.isWalkable ? this.greenMaterial : this.redMaterial;
            cube.addComponent('model', {
                type: 'box',
                material: material
            });

            cube.setLocalScale(0.9 * this.resolution, 0.1, 0.9 * this.resolution);
            cube.setPosition(node.x, node.y, node.z);
            this.app.root.addChild(cube);
        }
    }
};

