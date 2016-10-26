"use strict";

var DRAW_FRAMERATE = 1000 / 60;
var SCREEN_WIDTH = 640.0;
var SCREEN_HEIGHT = 480.0;
var PROJ_NEAR = 0.1;
var PROJ_FAR = 1000.0;


var gl;


// Cubemap shader variables

var gCubemapProgram;
var gCubemapVS;
var gCubemapFS;

var gCubemapModelMatLoc;
var gCubemapViewMatLoc;
var gCubemapProjMatLoc;
var gCubemapTextureLoc;

var gCubemapPosLoc;

var gCubemapPosBuf;

var gCubemapModel;

// Lighting shader variables

var gProgram;
var gVertShader;
var gFragShader;

var gModelMatLoc;
var gViewMatLoc;
var gProjMatLoc;
var gNormMatLoc;
var gLightPosLoc;
var gInverseViewMatLoc;
var gTextureLoc;

var gPosLoc;
var gNormLoc;

var gCubemapTexture;

var gCubemapImg = [];

var gViewMat;
var gProjMat;

var gSceneGraph = [];
var gTeapot;

var gLoader;
var gImgLoader;

var gLoadCanvas;
var gLoadCtx;
var gLoaded = false

var gLoaderCount = 0;

function loaderFinish() {
    
    gLoaderCount += 1;
    
    if (gLoaderCount == 2) {
        
        gCubemapImg.push(gImgLoader.getData("cubemap-posx"));
        gCubemapImg.push(gImgLoader.getData("cubemap-negx"));
        gCubemapImg.push(gImgLoader.getData("cubemap-posy"));
        gCubemapImg.push(gImgLoader.getData("cubemap-negy"));
        gCubemapImg.push(gImgLoader.getData("cubemap-posz"));
        gCubemapImg.push(gImgLoader.getData("cubemap-negz"));
        
        
        gTeapot = new Model();
        var res = gLoader.getResource("teapot");

        gTeapot.parseOBJ(res.data);

        console.log(gTeapot.numVert);

        startGL();
    }
};


function init() {

    var loadCanvas = document.getElementById("load-canvas");
    gLoadCtx = loadCanvas.getContext("2d");
    gLoadCtx.fillStyle = "#FFFFFF";
    gLoadCtx.font = "30px Arial";
    gLoadCtx.textAlign = "center";
    
    gImgLoader = new ImageLoader();
    
    gImgLoader.setCallback(loaderFinish);
    gImgLoader.setResource("cubemap-negx", "http://www.pk-tan.com/assets/cubemap_negx.jpg");
    gImgLoader.setResource("cubemap-posx", "http://www.pk-tan.com/assets/cubemap_posx.jpg");
    gImgLoader.setResource("cubemap-negy", "http://www.pk-tan.com/assets/cubemap_negy.jpg");
    gImgLoader.setResource("cubemap-posy", "http://www.pk-tan.com/assets/cubemap_posy.jpg");
    gImgLoader.setResource("cubemap-negz", "http://www.pk-tan.com/assets/cubemap_negz.jpg");
    gImgLoader.setResource("cubemap-posz", "http://www.pk-tan.com/assets/cubemap_posz.jpg");

    gImgLoader.loadAll();
    
    gLoader = new Loader();
    
    gLoader.setCallback(loaderFinish);
    gLoader.setResource("teapot", "http://www.pk-tan.com/assets/teapot.obj", "text");
    
    gLoader.loadAll(); 
}

function startGL() {
    var canvas = document.getElementById("gl-canvas");
    
    gl = initWebGL(canvas);
    
    if (!gl) {
        return;
    }
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gCubemapProgram = gl.createProgram();
    gCubemapVS = loadShaderDOM(gl, "cubemap-vert");
    gCubemapFS = loadShaderDOM(gl, "cubemap-frag");
    gl.attachShader(gCubemapProgram, gCubemapVS);
    gl.attachShader(gCubemapProgram, gCubemapFS);
    gl.linkProgram(gCubemapProgram);

    gProgram = gl.createProgram();
    gVertShader = loadShaderDOM(gl, "shader-vert");
    gFragShader = loadShaderDOM(gl, "shader-frag");
    gl.attachShader(gProgram, gVertShader);
    gl.attachShader(gProgram, gFragShader);
    gl.linkProgram(gProgram);
    
    if (!gl.getProgramParameter(gProgram, gl.LINK_STATUS)) {
        console.log("Unable to link lighting shader program.");    
    }
    
    gl.useProgram(gProgram);
    
    initData();
    
    setInterval(draw, DRAW_FRAMERATE);
}


function draw() {
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    
    // Run cubemap shader program
    
    gl.useProgram(gCubemapProgram);
    
    gl.enableVertexAttribArray(gCubemapPosLoc);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, gCubemapPosBuf);
    gl.vertexAttribPointer(gCubemapPosLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, gCubemapModel.vertCount);
    
    gl.disableVertexAttribArray(gCubemapPosLoc);
    
    
    // Run lighting shader program
    
    gl.useProgram(gProgram); 
    
    gl.enableVertexAttribArray(gPosLoc);
    gl.enableVertexAttribArray(gNormLoc);
    
    var teapotTransform = gTeapot.transform;
    mat4.rotate(teapotTransform, teapotTransform, 0.01, [0.0, 0.0, 1.0]);
    gTeapot.transform = teapotTransform; 

    for (var i = 0; i < gSceneGraph.length; ++i) {
        var obj = gSceneGraph[i];
        
        var modelViewMat = mat4.create();
        mat4.multiply(modelViewMat, gViewMat, obj.transform);
        var normMat = mat3.create();
        mat3.normalFromMat4(normMat, modelViewMat);
        gl.uniformMatrix3fv(gNormMatLoc, false, new Float32Array(normMat));
        
        var inverseViewMat = mat3.create();
        var inverseViewMat4 = mat4.create();
        mat4.invert(inverseViewMat4, gViewMat);
        mat3.fromMat4(inverseViewMat, inverseViewMat4);
        gl.uniformMatrix3fv(gInverseViewMatLoc, false, new Float32Array(inverseViewMat));
        
        gl.uniformMatrix4fv(gModelMatLoc, false, new Float32Array(obj.transform));
    
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.glPosBuf);
        gl.vertexAttribPointer(gPosLoc, 4, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.glNormBuf);
        gl.vertexAttribPointer(gNormLoc, 3, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, obj.numVert);
    }
    
    gl.disableVertexAttribArray(gNormLoc);
    gl.disableVertexAttribArray(gPosLoc);
}


function initData() {
    
    // Globals
    
    gViewMat = mat4.create();

    mat4.translate(gViewMat, gViewMat, [0.0, -5.0, -45.0]);
    
    var projMat = mat4.create();
    mat4.perspective(projMat, 45.0, SCREEN_WIDTH / SCREEN_HEIGHT, PROJ_NEAR, PROJ_FAR);

    var gCubemapTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, gCubemapTexture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    for (var i = 0; i < 6; ++i) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, gCubemapImg[i]);   
    }
    gl.activeTexture(gl.TEXTURE0);
    
    
    // Cubemap shader
    
    gl.useProgram(gCubemapProgram);
    
    gCubemapPosLoc = gl.getAttribLocation(gCubemapProgram, "vPosition");
    
    gCubemapModelMatLoc = gl.getUniformLocation(gCubemapProgram, "uModelMat");
    gCubemapViewMatLoc = gl.getUniformLocation(gCubemapProgram, "uViewMat");
    gCubemapProjMatLoc = gl.getUniformLocation(gCubemapProgram, "uProjMat");
    gCubemapTextureLoc = gl.getUniformLocation(gCubemapProgram, "uTexture");
    
    gCubemapModel = new Cube(200.0);
    
    gCubemapPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gCubemapPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gCubemapModel.posData), gl.STATIC_DRAW);
    
    gl.uniformMatrix4fv(gCubemapModelMatLoc, false, new Float32Array(mat4.create()));
    gl.uniformMatrix4fv(gCubemapViewMatLoc, false, new Float32Array(gViewMat));
    gl.uniformMatrix4fv(gCubemapProjMatLoc, false, new Float32Array(projMat));
    gl.uniform1i(gCubemapTextureLoc, 1);
    
   
    // Lighting shader
    
    gl.useProgram(gProgram);
    
    gPosLoc = gl.getAttribLocation(gProgram, "vPosition");
    gNormLoc = gl.getAttribLocation(gProgram, "vNormal");
    
    gModelMatLoc = gl.getUniformLocation(gProgram, "uModelMat");
    gViewMatLoc = gl.getUniformLocation(gProgram, "uViewMat");
    gProjMatLoc = gl.getUniformLocation(gProgram, "uProjMat");
    gNormMatLoc = gl.getUniformLocation(gProgram, "uNormMat");
    gInverseViewMatLoc = gl.getUniformLocation(gProgram, "uInverseViewMat");
    gTextureLoc = gl.getUniformLocation(gProgram, "uTexture");
    
    gl.uniformMatrix4fv(gViewMatLoc, false, new Float32Array(gViewMat));
    gl.uniformMatrix4fv(gProjMatLoc, false, new Float32Array(projMat));
    gl.uniform1i(gTextureLoc, 1);
    
    
    // Teapot Obj
    
    var teapotPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gTeapot.posData), gl.STATIC_DRAW);
    
    var teapotNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gTeapot.normData), gl.STATIC_DRAW);
    
    var teapotTransform = mat4.create();
    mat4.rotate(teapotTransform, teapotTransform, -1.0, [1.0, 0.0, 0.0]);
 
    gTeapot.glPosBuf = teapotPosBuf;
    //gTeapot.glTexBuf = teapotTexBuf;
    gTeapot.glNormBuf = teapotNormBuf;
    gTeapot.transform = teapotTransform;
    gTeapot.ambientColor = [0.3, 0.3, 0.3];
    gTeapot.diffuseColor = [0.8, 0.0, 0.0];
    gTeapot.specularColor = [1.0, 1.0, 1.0];
    gTeapot.shininess = 20.0;
    gTeapot.specStrength = 5.0;
    gTeapot.isTextured = false;
    gTeapot.objColor = [0.1, 0.0, 0.0];
    //gTeapot.glTexture = teapotTexture;
    //gTeapot.glTexUnit = 1; 
    
    
    // Add objects into scene graph
    
    gSceneGraph.push(gTeapot);
}

function initWebGL(canvas) {
    gl = null;
    
    try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch(e) {
        
    }
    
    if (!gl) {
        alert("Unable to initialize WebGL");
        gl = null;
    }
    
    return gl;
}

function loadShaderDOM(gl, id) {
    var script = document.getElementById(id);
    
    console.log(script);
    
    if (!script) return null;

    var source = "";
    
    source = script.textContent;
    
    var shader;
    
    if (script.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);   
        shader.type = "Vertex Shader";
    } else if (script.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        shader.type = "Fragment Shader";
    } else {
        console.log("Shader not vertex or fragment shader");
        return null;
    }
    
    gl.shaderSource(shader, source);
    
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(shader.type + ": " + gl.getShaderInfoLog(shader));
        return null;
    }
    
    return shader;
}