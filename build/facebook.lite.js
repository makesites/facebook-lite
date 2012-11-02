// Facebook Lite
// Lightweight JavaScript SDK for the Facebook API 
// 
// Created by Makis Tracend (@tracend)
// MIT licensed

/*
 * "original methods": ["Data", "Data.query", "Data.waitOn", "Dom", "Dom.addCssRules", "Event", "Event.subscribe", "Event.unsubscribe", "Insights", "Insights.impression", "Music", "Music.flashCallback", "Music.init", "Music.send", "Payment", "Payment.init", "Payment.setSize", "UA", "UA.nativeApp", "XD", "XD.onMessage", "XFBML", "XFBML.parse", "api", "getAccessToken", "getAuthResponse", "getLoginStatus", "getUserID", "init", "login", "logout", "ui"]
 */

// Don't include if the namespace is taken (by the official lib?)
window.FB || (function(window) {

function Facebook()
{

}

Facebook.prototype.init = function(options)
{
    
    
    // authorize...
    //this.auth(options);
    
    
}

Facebook.prototype.auth = function(options){
	
	var self = this;
	
    this.client_id = options.appId || 0;
	this.redirect_uri = "https://www.facebook.com/connect/login_success.html";
	this.display = options.display || "touch";
    
    // exit now if no app id is supplied
    if(!this.client_id) return;
    
	var authorize_url   = "https://graph.facebook.com/oauth/authorize?"
                        + "client_id=" + this.client_id
                        + "&redirect_uri=" + this.redirect_uri
                        + "&display="+ this.display
                        + "&type=user_agent";

	//window.location(authorize_url);
	//window.location.onLocationChange = function(loc){self.onLocationChange(loc);};
    
	this.ajax(authorize_url, false, this.onLocationChange )
	
}

Facebook.prototype.onLocationChange = function(newLoc)
{
	if(newLoc.indexOf(this.redirect_uri) == 0)
	{
		var result = unescape(newLoc).split("#")[1];
		result = unescape(result);
		
		// TODO: Error Check
		this.accessToken = result.split("&")[0].split("=")[1];		
		//this.expiresIn = result.split("&")[1].split("=")[1];
	
		window.close();
		this.onConnect();
		
	}
}

Facebook.prototype.api = function()
{
    var service, method, options, callback;
    // define parameters
    switch(arguments.length){
        case 0:
            return;
        break;
        case 1:
            service = arguments[0];
        break;
        case 2:
            service = arguments[0];
            callback = arguments[1];
        break;
        case 3:
            service = arguments[0];
            method = arguments[1];
            callback = arguments[2];
        break;
        case 4:
            service = arguments[0];
            method = arguments[1];
            options = JSON_serialize( arguments[2] );
            callback = arguments[3];
        break;
    }
    
    if(typeof(service) == "undefined") return;
    // remove leading/ending slash
    service = service.replace(/^\/|\/$/g, '');
    // set other params
    method || (method = "get");
    options || (options = null);
    // set the token (check if the service has a questionmark)
    var access_token = ((service.search("\\?") > -1 ) ? "&" : "?" ) + "access_token=" + this.accessToken;
    
	var url = "https://graph.facebook.com/"+ service + access_token;
	var req = new XMLHttpRequest();
    var self = this;
	
	req.open(method,url,true);
    if(options != null){
        //req.setRequestHeader("Content-type","application/json");
        req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
        req.setRequestHeader('Content-Length',options.length);
    }
	req.send(options);
	req.onerror = function(){
		self.noConnection();
	};
    
    if(typeof(callback) == "undefined"){
        // if no callback just return the request object (assuming we'll do something with it :P)
        return req;
	} else {
        req.onload = function(e){
            var response = JSON.parse(e.target.responseText);
            callback.call(this, response);
        }
    }
}

Facebook.prototype.ajax = function( url, options, callback)
{
	// setting fallbacks
	url || (url = false);
	callback || (callback = false);
	// check if there's a URL
	if(!url) return;
	
	options || (options = null);
	
	var url = authorize_url;
	var req = new XMLHttpRequest();
    var self = this;
	
	req.open(method,url,true);
	
    if(options != null){
        //req.setRequestHeader("Content-type","application/json");
        req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
        req.setRequestHeader('Content-Length',options.length);
    }
	req.send(options);
	req.onerror = function(){
		self.noConnection();
	};
    
    if(!callback){
        // if no callback just return the request object (assuming we'll do something with it :P)
        return req;
	} else {
        req.onload = function(e){
            var response = JSON.parse(e.target.responseText);
            callback.call(this, response);
        }
    }
	
}

// fomrat a date object for api requests
Facebook.prototype.date = function(date)
{
    var y = date.getFullYear(),
        m = date.getMonth()+1,
        d = date.getDate(), 
        h = date.getHours(), 
        i = date.getMinutes();
    
    // tweaks...
    if(m.length == 1) m = "0"+m;
    if(d.length == 1) d = "0"+d;
   
    return  y+"-"+m+"-"+d+" "+h+":"+i;
                
}

Facebook.prototype.getLoginStatus = function(callback)
{
    // request login status
    //this.api(options, callback);
}

Facebook.prototype.noConnection = function()
{
	navigator.notification.alert("Unfortunately your request to the server has failed... Please try again later.", null, "No Connection");
}

// Helpers
function JSON_serialize( obj ){
    var str = "";
    for(key in obj) {
        str += key + '=' + obj[key] + '&';
    }
    // remove the final ampersand
    str = str.slice(0, str.length - 1); 
    
    return str;
}

FB = new Facebook();

})(window);
