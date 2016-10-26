"use strict";

var DRAW_FRAMERATE = 1000 / 60;
var SCREEN_WIDTH = 640.0;
var SCREEN_HEIGHT = 480.0;
var PROJ_NEAR = 0.1;
var PROJ_FAR = 1000.0;

var SHADOW_TEXTURE_WIDTH = 1024.0;
var SHADOW_TEXTURE_HEIGHT = 1024.0;
var SHADOW_FRUSTUM_DEPTH = 100.0;

var gl;

// Lighting shader variables

var gProgram;
var gVertShader;
var gFragShader;

var gWavenumberLoc;
var gVelocityLoc;
var gAmplitudeLoc;
var gTimeLoc;

var gModelMatLoc;
var gViewMatLoc;
var gProjMatLoc;
var gModelViewNormLoc;
var gShadowScaleBiasMatLoc;
var gShadowMatLoc;
var gLightPosLoc; // Vertex shader uniform location

var gTexSamplerLoc;
var gIsTexturedLoc;
var gObjColorLoc;
var gAmbientLoc;
var gDiffuseLoc;
var gSpecularLoc;
var gShininessLoc; 
var gSpecStrengthLoc;
var gConstAttenuationLoc;
var gLinearAttenuationLoc;
var gDepthTextureLoc; // Fragment shader uniform location

var gPosLoc;
var gTexLoc;
var gNormLoc;


// Shadow shader variables

var gShadowProg;
var gShadowVS;
var gShadowFS;

var gShadowModelMatLoc;
var gShadowViewMatLoc;
var gShadowProjMatLoc;

var gShadowPosLoc;

var gShadowFbo;
var gShadowTexture;


// User data and models

var gModelMat;
var gViewMat;
var gViewNormMat;
var gTexture;

var gStartTime;

var gShadowScaleBiasMat = [0.5, 0.0, 0.0, 0.0,
                           0.0, 0.5, 0.0, 0.0,
                           0.0, 0.0, 0.5, 0.0,
                           0.5, 0.5, 0.5, 1.0];

var gLightPos = [10.0, 30.0, 20.0];

var gSceneGraph = [];
var gSheet;

var gTextureImg;

var gLoader;
var gImgLoader;

var gLoadCanvas;
var gLoadCtx;
var gLoaded = false

var gLoaderCount = 0;

function loaderFinish() {
    
    gLoaderCount += 1;
    
    if (gLoaderCount == 2) {
        
        gTextureImg = gImgLoader.getData("texture");
        
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
    gImgLoader.setResource("texture", "http://www.pk-tan.com/assets/texture.jpg");

    gImgLoader.loadAll();
    
    
    gLoader = new Loader();
    
    gLoader.setCallback(loaderFinish);
    //gLoader.setResource("teapot", "http://www.pk-tan.com/assets/teapot.obj", "text");
    
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
    
    gShadowProg = gl.createProgram();
    gShadowVS = loadShaderDOM(gl, "shadow-vs");
    gShadowFS = loadShaderDOM(gl, "shadow-fs");
    gl.attachShader(gShadowProg, gShadowVS);
    gl.attachShader(gShadowProg, gShadowFS);
    gl.linkProgram(gShadowProg);
    
    if (!gl.getProgramParameter(gShadowProg, gl.LINK_STATUS)) {
        console.log("Unable to link shadow shader program.");    
    }
    
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
    
    
    // Run shadow shader program
    
    gl.useProgram(gShadowProg);
    
    gl.viewport(0, 0, SHADOW_TEXTURE_WIDTH, SHADOW_TEXTURE_HEIGHT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, gShadowFbo);
    
    gl.clearDepth(1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.enableVertexAttribArray(gShadowPosLoc);
    
    for (var i = 0; i < gSceneGraph.length; ++i) {
        var obj = gSceneGraph[i];
        
        gl.uniformMatrix4fv(gShadowModelMatLoc, false, new Float32Array(obj.transform));
        
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.glPosBuf);
        gl.vertexAttribPointer(gShadowPosLoc, 4, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, obj.numVert);
    }
    
    gl.disableVertexAttribArray(gShadowPosLoc);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    
    
    // Run lighting shader program
    
    gl.useProgram(gProgram); 
    
    gl.viewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    var currentTime = (new Date()).getTime() / 1000.0;
    var time = currentTime - gStartTime;
    gl.uniform1f(gTimeLoc, time);
    
    gl.enableVertexAttribArray(gPosLoc);
    gl.enableVertexAttribArray(gTexLoc);
    gl.enableVertexAttribArray(gNormLoc);
    
    for (var i = 0; i < gSceneGraph.length; ++i) {
        var obj = gSceneGraph[i];
        
        var modelViewMat = mat4.create();
        mat4.multiply(modelViewMat, gViewMat, obj.transform);
        var modelViewNormMat = mat3.create();
        mat3.normalFromMat4(modelViewNormMat, modelViewMat);
        gl.uniformMatrix3fv(gModelViewNormLoc, false, new Float32Array(modelViewNormMat));
        
        gl.uniformMatrix4fv(gModelMatLoc, false, new Float32Array(obj.transform));
        gl.uniform3fv(gAmbientLoc, new Float32Array(obj.ambientColor));
        gl.uniform3fv(gDiffuseLoc, new Float32Array(obj.diffuseColor));
        gl.uniform3fv(gSpecularLoc, new Float32Array(obj.specularColor));
        gl.uniform1f(gShininessLoc, obj.shininess);
        gl.uniform1f(gSpecStrengthLoc, obj.specStrength);
        gl.uniform1i(gIsTexturedLoc, obj.isTextured);
        gl.uniform1i(gTexSamplerLoc, obj.glTexUnit);
        gl.uniform3fv(gObjColorLoc,  new Float32Array(obj.objColor));
        
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.glPosBuf);
        gl.vertexAttribPointer(gPosLoc, 4, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.glTexBuf);
        gl.vertexAttribPointer(gTexLoc, 2, gl.FLOAT, false, 0, 0);
         
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.glNormBuf);
        gl.vertexAttribPointer(gNormLoc, 3, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, obj.numVert);
    }
    
    gl.disableVertexAttribArray(gNormLoc);
    gl.disableVertexAttribArray(gTexLoc);
    gl.disableVertexAttribArray(gPosLoc);
}


function initData() {
    
    
    // Shadow shader
    
    gl.useProgram(gShadowProg);
    
    gPosLoc = gl.getAttribLocation(gShadowProg, "vPosition");
    
    gShadowModelMatLoc = gl.getUniformLocation(gShadowProg, "uModelMat");
    gShadowViewMatLoc = gl.getUniformLocation(gShadowProg, "uViewMat");
    gShadowProjMatLoc = gl.getUniformLocation(gShadowProg, "uProjMat");
    
    gShadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, gShadowFbo);
    
    gShadowTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, gShadowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW_TEXTURE_WIDTH, SHADOW_TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.activeTexture(gl.TEXTURE0);
    
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW_TEXTURE_WIDTH, SHADOW_TEXTURE_HEIGHT);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gShadowTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        console.log("Framebuffer failed to initialize");   
    }
    
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    var lookAtCenter = [0.0, 10.0, 0.0];
    var shadowViewMat = mat4.create();
    mat4.lookAt(shadowViewMat, gLightPos, lookAtCenter, [0.0, 1.0, 0.0]);
    gl.uniformMatrix4fv(gShadowViewMatLoc, false, new Float32Array(shadowViewMat));
    
    var shadowProjMat = mat4.create();
    mat4.frustum(shadowProjMat, -1.0, 1.0, -1.0, 1.0, 1.0, SHADOW_FRUSTUM_DEPTH);
    gl.uniformMatrix4fv(gShadowProjMatLoc, false, new Float32Array(shadowProjMat));

    
    
    // Lighting shader
    
    gl.useProgram(gProgram);
    
    gPosLoc = gl.getAttribLocation(gProgram, "vPosition");
    gTexLoc = gl.getAttribLocation(gProgram, "vTexcoord");
    gNormLoc = gl.getAttribLocation(gProgram, "vNormal");
    
    gWavenumberLoc = gl.getUniformLocation(gProgram, "uWavenumber");
    gVelocityLoc = gl.getUniformLocation(gProgram, "uVelocity");
    gAmplitudeLoc = gl.getUniformLocation(gProgram, "uAmplitude");
    gTimeLoc = gl.getUniformLocation(gProgram, "uTime");
    
    gModelMatLoc = gl.getUniformLocation(gProgram, "uModelMat");
    gViewMatLoc = gl.getUniformLocation(gProgram, "uViewMat");
    gProjMatLoc = gl.getUniformLocation(gProgram, "uProjMat");
    gModelViewNormLoc = gl.getUniformLocation(gProgram, "uModelViewNormMat");
    gShadowScaleBiasMatLoc = gl.getUniformLocation(gProgram, "uShadowScaleBiasMat");
    gShadowMatLoc = gl.getUniformLocation(gProgram, "uShadowMat");
    gLightPosLoc = gl.getUniformLocation(gProgram, "uLightPos");
    
    gTexSamplerLoc = gl.getUniformLocation(gProgram, "uTexSampler");
    gIsTexturedLoc = gl.getUniformLocation(gProgram, "uIsTextured");
    gObjColorLoc = gl.getUniformLocation(gProgram, "uObjColor");
    gAmbientLoc = gl.getUniformLocation(gProgram, "uAmbient");
    gDiffuseLoc = gl.getUniformLocation(gProgram, "uDiffuse");
    gSpecularLoc = gl.getUniformLocation(gProgram, "uSpecular");
    gShininessLoc = gl.getUniformLocation(gProgram, "uShininess");
    gSpecStrengthLoc = gl.getUniformLocation(gProgram, "uSpecStrength");
    gConstAttenuationLoc = gl.getUniformLocation(gProgram, "uConstAttenuation");
    gLinearAttenuationLoc = gl.getUniformLocation(gProgram, "uLinearAttenuation");
    gDepthTextureLoc = gl.getUniformLocation(gProgram, "uDepthTexture");
    
    
    
    // Globals
    
    var wavenumber = 1.0;
    gl.uniform1f(gWavenumberLoc, wavenumber);
    
    var velocity = 5.0;
    gl.uniform1f(gVelocityLoc, velocity);
    
    var amplitude = 1.0;
    gl.uniform1f(gAmplitudeLoc, amplitude);
    
    gl.uniform1f(gTimeLoc, 0.0);
    
    gViewMat = mat4.create();
    mat4.translate(gViewMat, gViewMat, [-2.0, 5.0, -50.0]);
    mat4.rotate(gViewMat, gViewMat, 0.6, [1.0, 0.0, 0.0]);
    gl.uniformMatrix4fv(gViewMatLoc, false, new Float32Array(gViewMat));
    
    var projMat = mat4.create();
    mat4.perspective(projMat, 45.0, SCREEN_WIDTH / SCREEN_HEIGHT, PROJ_NEAR, PROJ_FAR);
    gl.uniformMatrix4fv(gProjMatLoc, false, new Float32Array(projMat));
    
    gl.uniformMatrix4fv(gShadowScaleBiasMatLoc, false, new Float32Array(gShadowScaleBiasMat));
    
    var shadowMat = mat4.create();
    mat4.multiply(shadowMat, shadowProjMat, shadowViewMat);
    gl.uniformMatrix4fv(gShadowMatLoc, false, new Float32Array(shadowMat));
    
    gl.uniform3fv(gLightPosLoc, new Float32Array(gLightPos));
    
    var constAttenuation = 1.0;
    gl.uniform1f(gConstAttenuationLoc, constAttenuation);
    
    var linearAttenuation = 0.1;
    gl.uniform1f(gLinearAttenuationLoc, linearAttenuation);
    
    gl.uniform1i(gDepthTextureLoc, 2);
    
    
    // Sheet Obj
    
    gSheet = createSheet(40.0, 40.0, 100, 100);
    
    var sheetPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sheetPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gSheet.posData), gl.STATIC_DRAW);
    
    var sheetNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sheetNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gSheet.normData), gl.STATIC_DRAW);
    
    var sheetTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sheetTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gSheet.texData), gl.STATIC_DRAW);
    
    var sheetTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sheetTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, gTextureImg);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.activeTexture(gl.TEXTURE0);
    
    var sheetTransform = mat4.create();
    mat4.rotate(sheetTransform, sheetTransform, 0.4, [0.0, 1.0, 0.0]);
    
    gSheet.glPosBuf = sheetPosBuf;
    gSheet.glNormBuf = sheetNormBuf;
    gSheet.glTexBuf = sheetTexBuf;
    gSheet.transform = sheetTransform;
    gSheet.ambientColor = [0.5, 0.3, 0.3];
    gSheet.diffuseColor = [0.8, 0.0, 0.0];
    gSheet.specularColor = [1.0, 1.0, 1.0];
    gSheet.shininess = 20.0;
    gSheet.specStrength = 0.0;
    gSheet.isTextured = true;
    gSheet.glTexture = sheetTexture;
    gSheet.glTexUnit = 1;
    
    
    // Add objects into scene graph

    gSceneGraph.push(gSheet);
    
    
    gStartTime = (new Date()).getTime() / 1000.0;
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