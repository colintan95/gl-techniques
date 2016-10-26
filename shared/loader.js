"use strict";

function LoaderResult(ident, data, type) {
    this.ident = ident;
    this.data = data;
    this.type = type;
};

function LoaderResource(ident, url, type) {
    this.ident = ident;
    this.url = url;
    this.type = type;
}

function Loader() {
    this.loadList = [];
    this.xhrReqs = {};
    this.resList = {};
    this.numResource = 0;
    this.callback = null;
    
    this.numReady = 0;
    this.numErrors = 0;
    this.numLoaded = 0;
}

Loader.prototype.setCallback = function(callback) {
      this.callback = callback;
};

Loader.prototype.setResource = function(ident, url, type) {
    var resource = new LoaderResource(ident, url, type);
    
    this.numResource += 1;
    
    this.loadList.push(resource);
}

Loader.prototype.loadFinish = function() {
    
    this.numErrors = this.numLoaded - this.numReady;
    console.log("Loader - Successful: " + this.numReady + ", Errors: " + this.numErrors);
    
    if (this.callback) {
        this.callback();   
    }
}

function LoaderRequest(loader, resource) {
    this.req = new XMLHttpRequest();
    this.loader = loader;
    this.resource = resource;
    
    if (this.resource.type == "binary") {
        this.req.responseType = "arraybuffer";
    }
    else {
        this.req.responseType = "text";   
    }
    
    var request = this;
    
    this.req.addEventListener("loadend", function() { request.loadEndCallback(); });
    this.req.onreadystatechange = function() { request.readyStateCallback(); }
    
    this.req.open("GET", this.resource.url);
    this.req.send();
}

LoaderRequest.prototype.loadEndCallback = function() {

    this.loader.numLoaded += 1;
    
    if (this.loader.numLoaded == this.loader.numResource) {
        this.loader.loadFinish();   
    }
}

LoaderRequest.prototype.readyStateCallback = function() {
    if (this.req.readyState == 4 && this.req.status == 200) {
        var res = new LoaderResult(this.resource.ident, this.req.response, this.resource.type);
        this.loader.resList[this.resource.ident] = res;
        this.loader.numReady += 1;   
    }
}

Loader.prototype.loadAll = function() {
    
    if (this.loadList.length == 0) {
        this.numLoaded = 0;
        this.numReady = 0;
        this.loadFinish();
    }
    
    for (var i = 0; i < this.loadList.length; ++i) {
        var resource = this.loadList[i];
        
        var req = new LoaderRequest(this, resource);
        
        this.xhrReqs[resource.ident] = req;
    }
}

Loader.prototype.getResource = function(ident) {
    return this.resList[ident];
}