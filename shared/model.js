"use strict";

function Model() {
   
}

Model.prototype = {
 
    constructor: Model(),
    
    glPosBuf: null,
    glTexBuf: null,
    glNormBuf: null,
    
    transform: null,
    
    ambientColor: [0.0, 0.0, 0.0],
    diffuseColor: [0.0, 0.0, 0.0],
    specularColor: [0.0, 0.0, 0.0],
    
    shininess: 0.0,
    specStrength: 0.0,

    objColor: [0.0, 0.0, 0.0],
    isTextured: false,
    glTexture: null,
    glTexUnit: 0,
    
    posData: [],
    texData: [],
    normData: [],
    faceData: [],
    
    numVert: 0
}

Model.prototype.parseOBJ = function(data) {
    
    var posPattern = /v +([\-\d\.]+) +([\-\d\.]+) +([\-\d\.]+)/;
    var normPattern = /vn +([\-\d\.]+) +([\-\d\.]+) +([\-\d\.]+)/;
    var texPattern = /vt +([\-\d\.]+) +([\-\d\.]+)/;
    var face3Pattern = /f +(\d+)\/(\d+)\/(\d+) +(\d+)\/(\d+)\/(\d+) +(\d+)\/(\d+)\/(\d+)$/;
    var face4Pattern = /f +(\d+)\/(\d+)\/(\d+) +(\d+)\/(\d+)\/(\d+) +(\d+)\/(\d+)\/(\d+) +(\d+)\/(\d+)\/(\d+)$/;
    
    var lines = data.split("\n");
    
    var rawPosData = [];
    var rawTexData = [];
    var rawNormData = [];
    var rawFaceData = [];
    
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];
        
        line = line.trim();
        
        var res;
        
        if (line[0] == '#') {
            continue;   
        }
        else if (res = posPattern.exec(line)) {
            var x = parseFloat(res[1]);
            var y = parseFloat(res[2]);
            var z = parseFloat(res[3]);
            rawPosData.push([x, y, z, 1.0]);
        }
        else if (res = texPattern.exec(line)) {
            var u = parseFloat(res[1]);
            var v = parseFloat(res[2]);
            rawTexData.push([u, v]);
        }
        else if (res = normPattern.exec(line)) {
            var x = parseFloat(res[1]);
            var y = parseFloat(res[2]);
            var z = parseFloat(res[3]);
            rawNormData.push([x, y, z]);
        }
        else if (res = face3Pattern.exec(line)) {
            var v1 = [parseInt(res[1]), parseInt(res[2]), parseInt(res[3])];
            var v2 = [parseInt(res[4]), parseInt(res[5]), parseInt(res[6])];
            var v3 = [parseInt(res[7]), parseInt(res[8]), parseInt(res[9])];
            rawFaceData.push([v1, v2, v3]);
        }
        else if (res = face4Pattern.exec(line)) {
            var v1 = [parseInt(res[1]), parseInt(res[2]), parseInt(res[3])];
            var v2 = [parseInt(res[4]), parseInt(res[5]), parseInt(res[6])];
            var v3 = [parseInt(res[7]), parseInt(res[8]), parseInt(res[9])];
            var v4 = [parseInt(res[10]), parseInt(res[11]), parseInt(res[12])];
            rawFaceData.push([v1, v2, v4]);
            rawFaceData.push([v4, v2, v3]);
        }
    }

    for (var i = 0; i < rawFaceData.length; ++i) {
        
        for (var j = 0; j < rawFaceData[i].length; ++j) {
            var posIndex = rawFaceData[i][j][0] - 1;
            this.posData.push(rawPosData[posIndex][0]);
            this.posData.push(rawPosData[posIndex][1]);
            this.posData.push(rawPosData[posIndex][2]);
            this.posData.push(rawPosData[posIndex][3]);
            
            var texIndex = rawFaceData[i][j][1] - 1;
            this.texData.push(rawTexData[texIndex][0]);
            this.texData.push(rawTexData[texIndex][1]);
            
            var normIndex = rawFaceData[i][j][2] - 1;
            this.normData.push(rawNormData[normIndex][0]);
            this.normData.push(rawNormData[normIndex][1]);
            this.normData.push(rawNormData[normIndex][2]);
        }
    }
    
    this.numVert = rawFaceData.length * 3;
}

function createSheet(xlength, zlength, xdiv, zdiv) {
    var model = new Model();
    
    var xstart = xlength / 2.0;
    var zstart = zlength / 2.0;
    
    var dx = xlength / xdiv;
    var dz = zlength / zdiv;
    
    var ds = 1.0 / xdiv;
    var dt = 1.0 / zdiv;
    
    for (var i = 0; i < xdiv; ++i) {
        for (var j = 0; j < zdiv; ++j) {
            model.posData.push(xstart - i * dx, 0.0, zstart - j * dz, 1.0);
            model.posData.push(xstart - (i + 1) * dx, 0.0, zstart - j * dz, 1.0);
            model.posData.push(xstart - i * dx, 0.0, zstart - (j + 1) * dz, 1.0);
            model.posData.push(xstart - i * dx, 0.0, zstart - (j + 1) * dz, 1.0);
            model.posData.push(xstart - (i + 1) * dx, 0.0, zstart - j * dz, 1.0);
            model.posData.push(xstart - (i + 1) * dx, 0.0, zstart - (j + 1) * dz, 1.0);
            
            model.normData.push(0.0, 1.0, 0.0);
            model.normData.push(0.0, 1.0, 0.0);
            model.normData.push(0.0, 1.0, 0.0);
            model.normData.push(0.0, 1.0, 0.0);
            model.normData.push(0.0, 1.0, 0.0);
            model.normData.push(0.0, 1.0, 0.0);
            
            model.texData.push(i * ds, j * dt);
            model.texData.push((i + 1) * ds, j * dt);
            model.texData.push(i * ds, (j + 1) * dt);
            model.texData.push(i * ds, (j + 1) * dt);
            model.texData.push((i + 1) * ds, j * dt);
            model.texData.push((i + 1) * ds, (j + 1) * dt);
        }
    }
    
    model.numVert = xdiv * zdiv * 6;
    
    return model;
}

function Cube() {
    
}

function Cube(length) {
    var n = length;
    this.posData =  [ n, n, n, 1.0,
                      n,-n, n, 1.0,
                      n, n,-n, 1.0,
                      n, n,-n, 1.0,
                      n,-n, n, 1.0,
                      n,-n,-n, 1.0, //positive yz plane
                     
                     -n, n,-n, 1.0,
                     -n,-n,-n, 1.0,
                     -n, n, n, 1.0,
                     -n, n, n, 1.0,
                     -n,-n,-n, 1.0,
                     -n,-n, n, 1.0, //negative yz plane
                     
                     -n, n,-n, 1.0,
                     -n, n, n, 1.0,
                      n, n,-n, 1.0,
                      n, n,-n, 1.0,
                     -n, n, n, 1.0,
                      n, n, n, 1.0, //positive xz plane
                     
                      n,-n, n, 1.0,
                      n,-n,-n, 1.0,
                     -n,-n, n, 1.0,
                     -n,-n, n, 1.0,
                      n,-n,-n, 1.0,
                     -n,-n,-n, 1.0, //negative xz plane
                     
                     -n, n, n, 1.0,
                     -n,-n, n, 1.0,
                      n, n, n, 1.0,
                      n, n, n, 1.0,
                     -n,-n, n, 1.0,
                      n,-n, n, 1.0, //positive xy plane
                     
                      n, n,-n, 1.0,
                      n,-n,-n, 1.0,
                     -n, n,-n, 1.0,
                     -n, n,-n, 1.0,
                      n,-n,-n, 1.0,
                     -n,-n,-n, 1.0]; //negative xy plane
    
    this.normData = [ 1.0, 0.0, 0.0,
                      1.0, 0.0, 0.0,
                      1.0, 0.0, 0.0,
                      1.0, 0.0, 0.0,
                      1.0, 0.0, 0.0,
                      1.0, 0.0, 0.0,
                     
                     -1.0, 0.0, 0.0,
                     -1.0, 0.0, 0.0,
                     -1.0, 0.0, 0.0,
                     -1.0, 0.0, 0.0,
                     -1.0, 0.0, 0.0,
                     -1.0, 0.0, 0.0,
                     
                      0.0, 1.0, 0.0,
                      0.0, 1.0, 0.0,
                      0.0, 1.0, 0.0,
                      0.0, 1.0, 0.0,
                      0.0, 1.0, 0.0,
                      0.0, 1.0, 0.0,
                     
                      0.0,-1.0, 0.0,
                      0.0,-1.0, 0.0,
                      0.0,-1.0, 0.0,
                      0.0,-1.0, 0.0,
                      0.0,-1.0, 0.0,
                      0.0,-1.0, 0.0,
                     
                      0.0, 0.0, 1.0,
                      0.0, 0.0, 1.0,
                      0.0, 0.0, 1.0,
                      0.0, 0.0, 1.0,
                      0.0, 0.0, 1.0,
                      0.0, 0.0, 1.0,
                     
                      0.0, 0.0,-1.0,
                      0.0, 0.0,-1.0,
                      0.0, 0.0,-1.0,
                      0.0, 0.0,-1.0,
                      0.0, 0.0,-1.0,
                      0.0, 0.0,-1.0];
    
    this.texData = [ 0.0, 1.0,
                     1.0, 1.0,
                     0.0, 0.0,
                     0.0, 0.0,
                     1.0, 1.0,
                     1.0, 0.0,
                    
                     0.0, 1.0,
                     1.0, 1.0,
                     0.0, 0.0,
                     0.0, 0.0,
                     1.0, 1.0,
                     1.0, 0.0,
                    
                     0.0, 1.0,
                     1.0, 1.0,
                     0.0, 0.0,
                     0.0, 0.0,
                     1.0, 1.0,
                     1.0, 0.0,
                    
                     0.0, 1.0,
                     1.0, 1.0,
                     0.0, 0.0,
                     0.0, 0.0,
                     1.0, 1.0,
                     1.0, 0.0,
                    
                     0.0, 1.0,
                     1.0, 1.0,
                     0.0, 0.0,
                     0.0, 0.0,
                     1.0, 1.0,
                     1.0, 0.0,
                    
                     0.0, 1.0,
                     1.0, 1.0,
                     0.0, 0.0,
                     0.0, 0.0,
                     1.0, 1.0,
                     1.0, 0.0];
    
    this.vertCount = 36;
}