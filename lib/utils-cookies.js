
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

