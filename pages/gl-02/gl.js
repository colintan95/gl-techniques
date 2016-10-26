"use strict";

var DRAW_FRAMERATE = 1000 / 60;
var SCREEN_WIDTH = 640.0;
var SCREEN_HEIGHT = 480.0;
var PROJ_NEAR = 0.1;
var PROJ_FAR = 1000.0;

var PARTICLE_COUNT = 96;
var PARTICLE_ACCELERATION = [0.0, -0.1, 0.0];
var PARTICLE_MIN_SIZE = 5.0;
var PARTICLE_MAX_SIZE = 50.0;
var PARTICLE_LIFETIME = 5.0;

var gl;

var gProgram;
var gVertShader;
var gFragShader;

var gTime = 0;
var gFrametime = 0;
var gStarttime = 0;

var gModelMatLoc;
var gViewMatLoc;
var gProjMatLoc;
var gNormMatLoc;

var gModelMat;
var gViewMat;
var gProjMat;

var gLifetimeLoc;
var gMinSizeLoc;
var gMaxSizeLoc;
var gTextureLoc;

var gTexture;

var gPosLoc;
var gAgeLoc;

var gPosBuf;
var gAgeBuf;

var gPosData = [];
var gAgeData = [];
var gInitVelocityData = [];
var gVelocityData = [];
var gStartData = [];

var gTextureImg;

var gLoader;

var gLoadCanvas;
var gLoadCtx;
var gLoaded = false

var gImgLoader;

function loadFinish() {
    
    gTextureImg = gImgLoader.getData("circle");
    
    startGL();   
}

function init() {

    var loadCanvas = document.getElementById("load-canvas");
    gLoadCtx = loadCanvas.getContext("2d");
    gLoadCtx.fillStyle = "#FFFFFF";
    gLoadCtx.font = "30px Arial";
    gLoadCtx.textAlign = "center";
    
    gImgLoader = new ImageLoader();
    
    gImgLoader.setCallback(function() { loadFinish(); });
    gImgLoader.setResource("circle", "http://www.pk-tan.com/assets/circle.png");
    
    gImgLoader.loadAll();
}

function startGL() {
    var canvas = document.getElementById("gl-canvas");
    
    gl = initWebGL(canvas);
    
    if (!gl) {
        return;
    }
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gProgram = gl.createProgram();
    
    gVertShader = loadShaderDOM(gl, "shader-vert");
    gFragShader = loadShaderDOM(gl, "shader-frag");
    
    gl.attachShader(gProgram, gVertShader);
    gl.attachShader(gProgram, gFragShader);
    gl.linkProgram(gProgram);
    
    if (!gl.getProgramParameter(gProgram, gl.LINK_STATUS)) {
        console.log("Unable to link program.");    
    }
    
    gl.useProgram(gProgram);
    
    initUniforms();
    
    initBuffers();
    
    gStarttime = ((new Date()).getTime()) / 1000.0;
    gTime = 0.0;
    gFrametime = 0.0;
    
    setInterval(draw, DRAW_FRAMERATE);
}


function draw() {
    var currentTime = ((new Date()).getTime()) / 1000.0 - gStarttime;
    gFrametime = currentTime - gTime;
    gTime = currentTime;
    
    for (var i = 0; i < PARTICLE_COUNT; ++i) {
        var velocity = gVelocityData[i];
        var start = gStartData[i];
        
        if (gTime >= start) {
            gAgeData[i] = gTime - start;
            
            
            
            if (gAgeData[i] > PARTICLE_LIFETIME) {
                gPosData[i * 3 + 0] = 0.0;
                gPosData[i * 3 + 1] = 0.0;
                gPosData[i * 3 + 2] = 0.0;
                gVelocityData[i][0] = gInitVelocityData[i][0];
                gVelocityData[i][1] = gInitVelocityData[i][1];
                gVelocityData[i][2] = gInitVelocityData[i][2];
                gStartData[i] = gTime;
            }
            else {
                gPosData[i * 3 + 0] += velocity[0] * gFrametime;
                gPosData[i * 3 + 1] += velocity[1] * gFrametime;
                gPosData[i * 3 + 2] += velocity[2] * gFrametime;
                gVelocityData[i][0] += PARTICLE_ACCELERATION[0] * gFrametime;
                gVelocityData[i][1] += PARTICLE_ACCELERATION[1] * gFrametime;
                gVelocityData[i][2] += PARTICLE_ACCELERATION[2] * gFrametime;
            }
        }
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.useProgram(gProgram);
    
    gl.enableVertexAttribArray(gPosLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, gPosBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(gPosData));
    gl.vertexAttribPointer(gPosLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.enableVertexAttribArray(gAgeLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, gAgeBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(gAgeData));
    gl.vertexAttribPointer(gAgeLoc, 1, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    
    gl.disableVertexAttribArray(gAgeLoc);
    gl.disableVertexAttribArray(gPosLoc);
}

function initUniforms() {
    gModelMatLoc = gl.getUniformLocation(gProgram, "uModelMat");
    gModelMat = mat4.create();
    gl.uniformMatrix4fv(gModelMatLoc, false, new Float32Array(gModelMat));
    
    gViewMatLoc = gl.getUniformLocation(gProgram, "uViewMat");
    gViewMat = mat4.create();
    mat4.translate(gViewMat, gViewMat, [0.0, -2.0, -10.0]);
    gl.uniformMatrix4fv(gViewMatLoc, false, new Float32Array(gViewMat));
    
    gProjMatLoc = gl.getUniformLocation(gProgram, "uProjMat");
    var projMat = mat4.create();
    mat4.perspective(projMat, 45.0, SCREEN_WIDTH / SCREEN_HEIGHT, PROJ_NEAR, PROJ_FAR);
    gl.uniformMatrix4fv(gProjMatLoc, false, new Float32Array(projMat));
    
    gLifetimeLoc = gl.getUniformLocation(gProgram, "uLifetime");
    gl.uniform1f(gLifetimeLoc, PARTICLE_LIFETIME);
    
    gMinSizeLoc = gl.getUniformLocation(gProgram, "uMinParticleSize");
    gl.uniform1f(gMinSizeLoc, PARTICLE_MIN_SIZE);
    
    gMaxSizeLoc = gl.getUniformLocation(gProgram, "uMaxParticleSize");
    gl.uniform1f(gMaxSizeLoc, PARTICLE_MAX_SIZE);
    
    gTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gTextureImg);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, gTexture);
    
    gTextureLoc = gl.getUniformLocation(gProgram, "uTexture");
    gl.uniform1i(gTextureLoc, 1);
}

function initBuffers() {
    
    for (var i = 0; i < PARTICLE_COUNT; ++i) {
        var theta = Math.random() * (Math.PI / 6.0);
        var phi = Math.random() * (Math.PI * 2.0);
        var dir = [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
        var dirInit = [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
        var mag = 0.5 + Math.random() * 0.5;
        dir[0] *= mag;
        dir[1] *= mag;
        dir[2] *= mag;
        
        gAgeData.push(0.0);
        
        gInitVelocityData.push(dirInit);
        gVelocityData.push(dir);
        
        gStartData.push(1.0 + i * 0.05);
        
        gPosData.push(0.0);
        gPosData.push(0.0);
        gPosData.push(0.0);
    }
    
    gPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gPosData), gl.STREAM_DRAW);
    
    gAgeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gAgeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gAgeData), gl.STREAM_DRAW);
    
    gPosLoc = gl.getAttribLocation(gProgram, "vPosition");
    gAgeLoc = gl.getAttribLocation(gProgram, "vAge");
    
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