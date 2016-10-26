"use strict";

function ImageLoader() {
    this.loadList = [];
    this.reqList = {};
    this.resList = {};
    this.numLoaded = 0;
    this.numErrors = 0;
    this.numRequests = 0;
    this.callback = null;
}

ImageLoader.prototype.setCallback = function(callback) {
    this.callback = callback;   
}

ImageLoader.prototype.setResource = function(ident, url) {
    var resource = {};
    resource.ident = ident;
    resource.url = url;
    
    this.loadList.push(resource);
    this.numRequests += 1;
}

ImageLoader.prototype.loadAll = function() {
    
    if (this.loadList.length == 0) {
        this.numLoaded = 0;
        this.numErrors = 0;
        this.finishLoad();
    }
 
    for (var i = 0; i < this.loadList.length; ++i) {
        var resource = this.loadList[i];
        
        this.reqList[resource.ident] = new ImageLoaderRequest(resource, this);
    }
}

ImageLoader.prototype.getData = function(ident) {
    return this.resList[ident];   
}

ImageLoader.prototype.finishLoad = function() {
    console.log("Image Loader - " + "Successful: " + this.numLoaded + ", Errors: " + this.numErrors);
    
    if (this.callback) this.callback();
}

function ImageLoaderRequest(resource, loader) {
    this.resource = resource;
    this.loader = loader;
    
    var request = this;
    
    var image = new Image();
    image.onload = function() { request.loadCallback(); }
    image.onerror = function() { request.errorCallback(); }
    image.src = resource.url;
    
    loader.resList[resource.ident] = image;
}

ImageLoaderRequest.prototype.loadCallback = function() {
    this.loader.numLoaded += 1; 
    
    if (this.loader.numLoaded + this.loader.numErrors == this.loader.numRequests) {
        this.loader.finishLoad();   
    }
}

ImageLoaderRequest.prototype.errorCallback = function() {
    this.loader.numErrors += 1;
    
    if (this.loader.numLoaded + this.loader.numErrors == this.loader.numRequests) {
        this.loader.finishLoad();   
    }
}

