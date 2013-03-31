
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


// extract the token from a URL fragment
// Example: 
// var token = extractToken(document.location.hash);
var extractToken = function(hash) {
  var match = hash.match(/access_token=(\w+)/);
  return !!match && match[1];
};

