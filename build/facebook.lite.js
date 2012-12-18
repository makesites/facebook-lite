/* 
 * Facebook Lite
 * Lightweight JavaScript SDK for the Facebook API 
 * 
 * Created by Makis Tracend (@tracend)
 * Published at Makesites.org - http://github.com/makesites/facebook-lite
 * 
 * MIT licensed
 * 
 * "original methods": ["Data", "Data.query", "Data.waitOn", "Dom", "Dom.addCssRules", "Event", "Event.subscribe", "Event.unsubscribe", "Insights", "Insights.impression", "Music", "Music.flashCallback", "Music.init", "Music.send", "Payment", "Payment.init", "Payment.setSize", "UA", "UA.nativeApp", "XD", "XD.onMessage", "XFBML", "XFBML.parse", "api", "getAccessToken", "getAuthResponse", "getLoginStatus", "getUserID", "init", "login", "logout", "ui"]
 */

// Don't include if the namespace is taken (by the official lib?)
window.FB || (function(window) {

// configuration 
var config = {
}

function Facebook()
{
	
	// setup css 
	
	// check if there's already an access token...
	this.auth = ( checkCookie("fb.lite") ) ? JSON.parse( getCookie("fb.lite") ) : false;
	//if( !auth) return false;
	this.promise = new Promise( this );
}

Facebook.prototype.init = function(options)
{
	
	// if logging check the query
	if( options.logging === true && window.location.hash.search("access_token") > -1 ){
		this.parseResponse( window.location.href );
	}
	
	// appId
    
    // type: app, web, client
	options.type || ( options.type = "app"); 
	
	// set redirect uri
	if( options.type == "app" && typeof options.namespace != "undefined" ){
		options.redirect_uri = "https://apps.facebook.com/"+ namespace +"/"
	}
	
	if( options.type == "web" ){
		options.redirect_uri = window.location.origin;
	}
	
    /*
	// check
	switch( options.type ){
		case "app":
			options.authorize = "https://www.facebook.com/dialog/oauth/";
		break;
		case "desktop":
			options.authorize = 
		break;
		case "mobile":
			options.authorize = 
		break;
		default:
			options.authorize = 
		break;
	}
	*/
	
  
	// save options for later
	this.options = options;
	
}
  
Facebook.prototype.getLoginStatus = function( callback ){
	// access cookie
	return callback( this.auth );
};

Facebook.prototype.login = function(callback, options){
	
	var self = this;
	
    var client_id = this.options.appId || false;
	var redirect_uri = this.options.redirect_uri || "https://www.facebook.com/connect/login_success.html";
	// scope: 'email,user_likes'
	var scope = options.scope || false;
	// display: page, popup, iframe, or touch
	var display = options.display || "page";
	var auth_type = options.auth_type || false;
	
    // exit now if no app id is supplied
    if(!client_id) return;
	
	// return existing auth unless reauthenticate if needed...
	if( this.auth && auth_type != 'reauthenticate') { 
		return callback( this.auth );
	} else {
		// save the callback for later
		this.promise.add( callback );
	}

    // assemble authorization URL
	var url   = "https://www.facebook.com/dialog/oauth/?"
                        + "client_id=" + client_id
                        + "&redirect_uri=" + encodeURIComponent(redirect_uri)
                        + "&display="+ display
						+ "&response_type=token";
                        //+ "&type=user_agent";
	
	// add scope
	if( scope ) url += "&scope=" + scope;
                        
	// open the login url
	this.window( url );
	
};

Facebook.prototype.ui = function(options, callback){
	// ui dialogues
	/*
	Example: 
	FB.ui(
	  {
		method: 'feed',
		name: 'Facebook Dialogs',
		link: 'http://developers.facebook.com/docs/reference/dialogs/',
		picture: 'http://fbrell.com/f8.jpg',
		caption: 'Reference Documentation',
		description: 'Dialogs provide a simple, consistent interface for applications to interface with users.'
	  },
	  function(response) {
		if (response && response.post_id) {
		  alert('Post was published.');
		} else {
		  alert('Post was not published.');
		}
	  }
	); */
};

Facebook.prototype.api = function(){
    var service, method, options, callback;
	// get the access token
	var access_token = this.auth.authResponse.accessToken;
	
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
    var access_token = ((service.search("\\?") > -1 ) ? "&" : "?" ) + "access_token=" + access_token;
    
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

/*

  YOUR_REDIRECT_URI#
  access_token=USER_ACCESS_TOKEN
  &expires_in=NUMBER_OF_SECONDS_UNTIL_TOKEN_EXPIRES
  
   YOUR_REDIRECT_URI?
  error_reason=user_denied
  &error=access_denied
  &error_description=The+user+denied+your+request.
  
*/
Facebook.prototype.parseResponse = function(query)
{

	var result = unescape(query).split("#")[1];
	result = unescape(result);
	
	// TODO: Error Check
	var accessToken = result.split("&")[0].split("=")[1];		
	var expiresIn = result.split("&")[1].split("=")[1];

	var response = {
		status: 'connected',
		authResponse: {
			accessToken: accessToken,
			expiresIn: expiresIn
		}
	}
	
	// save response 
	setCookie("fb.lite", JSON.stringify( response ), expiresIn);
	
	// keep the response in memory
	this.auth = response;
	
	// continue...
	this.promise.resolve( this.auth );
	//this.callback( this.auth );
	
}

Facebook.prototype.noConnection = function()
{
	navigator.notification.alert("Unfortunately your request to the server has failed... Please try again later.", null, "No Connection");
}


// window method - override with custom logic if needed
Facebook.prototype.window = function( url )
{
	window.location = url;
}


// Internal methods
// - standard AJAX request
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

// - format a date object for api requests
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


// - cookies
getCookie = function(name) {
	var i,key,value,cookies=document.cookie.split(";");
	for (i=0;i<cookies.length;i++){
		key=cookies[i].substr(0,cookies[i].indexOf("="));
		value=cookies[i].substr(cookies[i].indexOf("=")+1);
		key=key.replace(/^\s+|\s+$/g,"");
		if (key==name){
			return unescape(value);
		}
	}
}
	
setCookie = function(name,val,expiry){
	var date = new Date( ( new Date() ).getTime() + parseInt(expiry) );
	var value=escape(val) + ((expiry==null) ? "" : "; expires="+date.toUTCString());
	document.cookie=name + "=" + value;
}
	
checkCookie = function( name ){
	var cookie=getCookie( name );
	if (cookie!=null && cookie!=""){
		return true;
	} else {
		return false;
	}
}


	function Promise (obj) {
        var args = null;
        var callbacks = [];
        var resolved = false;
        
        this.add = function(callback) {
            if (resolved) {
                callback.apply(obj, args);
            } else {
                callbacks.push(callback);
            }
        },
        
        this.resolve = function() {
            if (!resolved) {            
                args = arguments;
                resolved = true;
                
                var callback;
                while (callback = callbacks.shift()) {
                    callback.apply(obj, arguments);
                }
                
                callbacks = null;
            }
        }
    };
	
FB = new Facebook();

})(window);
