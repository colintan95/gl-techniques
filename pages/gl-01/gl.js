"use strict";

var DRAW_FRAMERATE = 1000 / 60;
var SCREEN_WIDTH = 640.0;
var SCREEN_HEIGHT = 480.0;
var PROJ_NEAR = 0.1;
var PROJ_FAR = 1000.0;

var gl;

var gProgram;
var gVertShader;
var gFragShader;

var gModelMatLoc;
var gViewMatLoc;
var gProjMatLoc;
var gNormMatLoc;
var gTexSamplerLoc;
var gAmbientLoc;
var gDiffuseLoc;
var gSpecularLoc;
var gShininessLoc;
var gLightPosLoc;

var gModelMat;
var gViewMat;
var gTexture;

var gPosLoc;
var gTexLoc;
var gNormLoc;

var gPosBuf;
var gTexBuf;
var gNormBuf;

var gCube;
var gTeapot;
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
    gImgLoader.setResource("texture", "http://www.pk-tan.com/assets/texture.jpg");

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
    
    setInterval(draw, DRAW_FRAMERATE);
}


function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.useProgram(gProgram);
    
    mat4.rotate(gModelMat, gModelMat, -0.01, [0.0, 0.0, 1.0]);
    gl.uniformMatrix4fv(gModelMatLoc, false, new Float32Array(gModelMat));
    
    var normMat = mat3.create();
    var mvMat = mat4.create();
    mat4.multiply(mvMat, gViewMat, gModelMat);
    mat3.fromMat4(normMat, mvMat);
    mat3.invert(normMat, normMat);
    mat3.transpose(normMat, normMat);
    gl.uniformMatrix3fv(gNormMatLoc, false, new Float32Array(normMat));
    
    gl.enableVertexAttribArray(gPosLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, gPosBuf);
    gl.vertexAttribPointer(gPosLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.enableVertexAttribArray(gTexLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, gTexBuf);
    gl.vertexAttribPointer(gTexLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.enableVertexAttribArray(gNormLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, gNormBuf);
    gl.vertexAttribPointer(gNormLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, gTeapot.numVert);
    
    gl.disableVertexAttribArray(gNormLoc);
    gl.disableVertexAttribArray(gTexLoc);
    gl.disableVertexAttribArray(gPosLoc);
}

function initUniforms() {
    gModelMatLoc = gl.getUniformLocation(gProgram, "uModelMat");
    gModelMat = mat4.create();
    mat4.rotate(gModelMat, gModelMat, -1.57, [1.0, 0.0, 0.0]); 
    gl.uniformMatrix4fv(gModelMatLoc, false, new Float32Array(gModelMat));
    
    gViewMatLoc = gl.getUniformLocation(gProgram, "uViewMat");
    gViewMat = mat4.create();
    mat4.translate(gViewMat, gViewMat, [0.0, -4.0, -50.0]);
    mat4.rotate(gViewMat, gViewMat, 0.6, [1.0, 0.0, 0.0]);
    gl.uniformMatrix4fv(gViewMatLoc, false, new Float32Array(gViewMat));
    
    gProjMatLoc = gl.getUniformLocation(gProgram, "uProjMat");
    var projMat = mat4.create();
    mat4.perspective(projMat, 45.0, SCREEN_WIDTH / SCREEN_HEIGHT, PROJ_NEAR, PROJ_FAR);
    gl.uniformMatrix4fv(gProjMatLoc, false, new Float32Array(projMat));
    
    gNormMatLoc = gl.getUniformLocation(gProgram, "uNormMat");
    var normMat = mat3.create();
    var mvMat = mat4.create();
    mat4.multiply(mvMat, gViewMat, gModelMat);
    mat3.fromMat4(normMat, mvMat);
    mat3.invert(normMat, normMat);
    mat3.transpose(normMat, normMat);
    gl.uniformMatrix3fv(gNormMatLoc, false, new Float32Array(normMat));
    
    console.log(gTextureImg);
    
    gTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, gTextureImg);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, gTexture);
    gl.activeTexture(gl.TEXTURE0);
    
    gTexSamplerLoc = gl.getUniformLocation(gProgram, "uTexSampler");
    gl.uniform1i(gTexSamplerLoc, 1);
    
    gAmbientLoc = gl.getUniformLocation(gProgram, "uAmbient");
    var ambVec = [0.3, 0.3, 0.3, 1.0];
    gl.uniform4fv(gAmbientLoc, new Float32Array(ambVec));
    
    gDiffuseLoc = gl.getUniformLocation(gProgram, "uDiffuse");
    var difVec = [0.5, 0.0, 0.0, 1.0];
    gl.uniform4fv(gDiffuseLoc, new Float32Array(difVec));
    
    gSpecularLoc = gl.getUniformLocation(gProgram, "uSpecular");
    var specVec = [1.0, 1.0, 1.0, 1.0];
    gl.uniform4fv(gSpecularLoc, new Float32Array(specVec));
    
    gShininessLoc = gl.getUniformLocation(gProgram, "uShininess");
    var shininess = 16.0;
    gl.uniform1f(gShininessLoc, shininess);
    
    gLightPosLoc = gl.getUniformLocation(gProgram, "uLightPos");
    var lightPos = [30.0, 10.0, 30.0, 1.0];
    gl.uniform4fv(gLightPosLoc, new Float32Array(lightPos));
}

function initBuffers() {
    
    gPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gTeapot.posData), gl.STATIC_DRAW);
    
    gTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gTeapot.texData), gl.STATIC_DRAW);
    
    gNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gTeapot.normData), gl.STATIC_DRAW);
    
    gPosLoc = gl.getAttribLocation(gProgram, "vPosition");
    gTexLoc = gl.getAttribLocation(gProgram, "vTexcoord");
    gNormLoc = gl.getAttribLocation(gProgram, "vNormal");
    
    
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