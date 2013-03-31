/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * Contains the public method ``FB.api`` and the internal implementation
 * ``FB.ApiServer``.
 *
 * @provides fb.api
 * @requires fb.prelude
 *           fb.qs
 *           fb.flash
 *           fb.json
 */

/**
 * API calls.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * Make a API call to the [Graph API](/docs/api).
   *
   * Server-side calls are available via the JavaScript SDK that allow you to
   * build rich applications that can make API calls against the Facebook
   * servers directly from the user's browser. This can improve performance in
   * many scenarios, as compared to making all calls from your server. It can
   * also help reduce, or eliminate the need to proxy the requests thru your
   * own servers, freeing them to do other things.
   *
   * The range of APIs available covers virtually all facets of Facebook.
   * Public data such as [names][names] and [profile pictures][profilepic] are
   * available if you know the id of the user or object. Various parts of the
   * API are available depending on the [connect status and the
   * permissions](FB.login) the user has granted your application.
   *
   * Except the path, all arguments to this function are optional.
   *
   * Get the **f8 Page Object**:
   *
   *     FB.api('/f8', function(response) {
   *       alert(response.company_overview);
   *     });
   *
   * If you have an [authenticated user](FB.login), get their **User Object**:
   *
   *     FB.api('/me', function(response) {
   *       alert(response.name);
   *     });
   *
   * Get the 3 most recent **Post Objects** *Connected* to (in other words,
   * authored by) the *f8 Page Object*:
   *
   *     FB.api('/f8/posts', { limit: 3 }, function(response) {
   *       for (var i=0, l=response.length; i<l; i++) {
   *         var post = response[i];
   *         if (post.message) {
   *           alert('Message: ' + post.message);
   *         } else if (post.attachment && post.attachment.name) {
   *           alert('Attachment: ' + post.attachment.name);
   *         }
   *       }
   *     });
   *
   * If you have an [authenticated user](FB.login) with the
   * [publish_stream](/docs/authentication/permissions) permission, and want
   * to publish a new story to their feed:
   *
   *     var body = 'Reading Connect JS documentation';
   *     FB.api('/me/feed', 'post', { body: body }, function(response) {
   *       if (!response || response.error) {
   *         alert('Error occurred');
   *       } else {
   *         alert('Post ID: ' + response);
   *       }
   *     });
   *
   * Or if you want a delete a previously published post:
   *
   *     var postId = '1234567890';
   *     FB.api(postId, 'delete', function(response) {
   *       if (!response || response.error) {
   *         alert('Error occurred');
   *       } else {
   *         alert('Post was deleted');
   *       }
   *     });
   *
   *
   * ### Old REST API calls
   *
   * This method can also be used to invoke calls to the
   * [Old REST API](../rest/). The function signature for invoking REST API
   * calls is:
   *
   *     FB.api(params, callback)
   *
   * For example, to invoke [links.getStats](../rest/links.getStats):
   *
   *     FB.api(
   *       {
   *         method: 'links.getStats',
   *         urls: 'facebook.com,developers.facebook.com'
   *       },
   *       function(response) {
   *         alert(
   *           'Total: ' + (response[0].total_count + response[1].total_count));
   *       }
   *     );
   *
   * [names]: https://graph.facebook.com/naitik
   * [profilepic]: https://graph.facebook.com/naitik/picture
   *
   * @access public
   * @param path {String} the url path
   * @param method {String} the http method (default `"GET"`)
   * @param params {Object} the parameters for the query
   * @param cb {Function} the callback function to handle the response
   */
  api: function() {
    if (typeof arguments[0] === 'string') {
      FB.ApiServer.graph.apply(FB.ApiServer, arguments);
    } else {
      FB.ApiServer.rest.apply(FB.ApiServer, arguments);
    }
  }
});

/**
 * API call implementations.
 *
 * @class FB.ApiServer
 * @access private
 */
FB.provide('ApiServer', {
  METHODS: ['get', 'post', 'delete', 'put'],
  _callbacks: {},
  _readOnlyCalls: {
    fql_query: true,
    fql_multiquery: true,
    friends_get: true,
    notifications_get: true,
    stream_get: true,
    users_getinfo: true
  },

  /**
   * Make a API call to Graph server. This is the **real** RESTful API.
   *
   * Except the path, all arguments to this function are optional. So any of
   * these are valid:
   *
   *   FB.api('/me') // throw away the response
   *   FB.api('/me', function(r) { console.log(r) })
   *   FB.api('/me', { fields: 'email' }); // throw away response
   *   FB.api('/me', { fields: 'email' }, function(r) { console.log(r) });
   *   FB.api('/12345678', 'delete', function(r) { console.log(r) });
   *   FB.api(
   *     '/me/feed',
   *     'post',
   *     { body: 'hi there' },
   *     function(r) { console.log(r) }
   *   );
   *
   * @access private
   * @param path   {String}   the url path
   * @param method {String}   the http method
   * @param params {Object}   the parameters for the query
   * @param cb     {Function} the callback function to handle the response
   */
  graph: function() {
    var
      args = Array.prototype.slice.call(arguments),
      atoms = args.shift().match(/\/?([^?]*)\??([^#]*)/),
      path = atoms[1],
      next = args.shift(),
      method,
      params,
      cb;

    while (next) {
      var type = typeof next;
      if (type === 'string' && !method) {
        method = next.toLowerCase();
      } else if (type === 'function' && !cb) {
        cb = next;
      } else if (type === 'object' && !params) {
        params = next;
      } else {
        FB.log('Invalid argument passed to FB.api(): ' + next);
        return;
      }
      next = args.shift();
    }

    method = method || 'get';
    params = FB.copy(params || {}, FB.QS.decode(atoms[2]));

    if (FB.Array.indexOf(FB.ApiServer.METHODS, method) < 0) {
      FB.log('Invalid method passed to FB.api(): ' + method);
      return;
    }

    FB.ApiServer.oauthRequest('graph', path, method, params, cb);
  },

  /**
   * Old school restserver.php calls.
   *
   * @access private
   * @param params {Object} The required arguments vary based on the method
   * being used, but specifying the method itself is mandatory:
   *
   * Property | Type    | Description                      | Argument
   * -------- | ------- | -------------------------------- | ------------
   * method   | String  | The API method to invoke.        | **Required**
   * @param cb {Function} The callback function to handle the response.
   */
  rest: function(params, cb) {
    var method = params.method.toLowerCase().replace('.', '_');
    // this is an optional dependency on FB.Auth
    // Auth.revokeAuthorization affects the session
    if (FB.Auth && method === 'auth_revokeauthorization') {
      var old_cb = cb;
      cb = function(response) {
        if (response === true) {
          FB.Auth.setAuthResponse(null, 'not_authorized');
        }
        old_cb && old_cb(response);
      };
    }

    params.format = 'json-strings';
    params.api_key = FB._apiKey;
    var domain = FB.ApiServer._readOnlyCalls[method] ? 'api_read' : 'api';
    FB.ApiServer.oauthRequest(domain, 'restserver.php', 'get', params, cb);
  },

  /**
   * Add the oauth parameter, and fire off a request.
   *
   * @access private
   * @param domain {String}   the domain key, one of 'api', 'api_read',
   *                          or 'graph'
   * @param path   {String}   the request path
   * @param method {String}   the http method
   * @param params {Object}   the parameters for the query
   * @param cb     {Function} the callback function to handle the response
   */
  oauthRequest: function(domain, path, method, params, cb) {
    if (!params.access_token && FB.getAccessToken()) {
      params.access_token = FB.getAccessToken();
    }
    params.sdk = 'joey';
    params.pretty = 0; // browser's default to pretty=1, explicitly setting to
                       // 0 will save a few bytes

    // wrap the callback to force fetch login status if we had a bad access
    // token when we made the api call and it hadn't changed between the
    // call firing and the response coming in.
    var oldCb = cb;
    cb = function(response) {
      if (FB.Auth && response && FB.getAccessToken() == params.access_token &&
          (response.error_code === '190' ||
           (response.error &&
            (response.error === 'invalid_token' ||
             response.error.type === 'OAuthException')))) {
        FB.getLoginStatus(null, true);
      }

      oldCb && oldCb(response);
    };

    try {
      FB.ApiServer.jsonp(domain, path, method, FB.JSON.flatten(params), cb);
    } catch (e1_ignore) {
      try {
        if (!FB.initSitevars.corsKillSwitch &&
            FB.ApiServer.corsPost(
          domain, path, method, FB.JSON.flatten(params), cb)) {
          return;
        }
      } catch (e2_ignore) {
        // do nothing... fall back to flash.
      }

      if (FB.Flash.hasMinVersion()) {
        FB.ApiServer.flash(domain, path, method, FB.JSON.flatten(params), cb);
      } else {
        throw new Error('Your browser does not support long connect ' +
            'requests. You can fix this problem by upgrading your browser ' +
            'or installing the latest version of Flash');
      }
    }
  },

  corsPost: function(domain, path, method, params, cb) {
    var url  = FB.getDomain(domain) + path;

    if (domain == 'graph') {
      params.method = method;
    }
    var encoded_params = FB.QS.encode(params);
    var content_type = 'application/x-www-form-urlencoded';
    var request = FB.ApiServer._createCORSRequest('POST', url, content_type);
    if (request) {
      request.onload = function() {
        cb && cb(FB.JSON.parse(request.responseText));
      };
      request.send(encoded_params);
      return true;
    } else {
      return false;
    }
  },

  _createCORSRequest: function(method, url, content_type) {
     if (!window.XMLHttpRequest) {
      return null;
     }
     var xhr = new XMLHttpRequest();
     if ("withCredentials" in xhr) {
       xhr.open(method, url, true);
       xhr.setRequestHeader('Content-type', content_type);
     } else if (window.XDomainRequest) {
       xhr = new XDomainRequest();
       xhr.open(method, url);
     } else {
       xhr = null;
     }
     return xhr;
  },

  /**
   * Basic JSONP Support.
   *
   * @access private
   * @param domain {String}   the domain key, one of 'api', 'api_read',
   *                          or 'graph'
   * @param path   {String}   the request path
   * @param method {String}   the http method
   * @param params {Object}   the parameters for the query
   * @param cb     {Function} the callback function to handle the response
   */
  jsonp: function(domain, path, method, params, cb) {
    var
      g      = FB.guid(),
      script = document.createElement('script');

    // jsonp needs method overrides as the request itself is always a GET
    if (domain === 'graph' && method !== 'get') {
      params.method = method;
    }
    params.callback = 'FB.ApiServer._callbacks.' + g;

    var url = (
      FB.getDomain(domain) + path +
      (path.indexOf('?') > -1 ? '&' : '?') +
      FB.QS.encode(params)
    );
    if (url.length > 2000) {
      throw new Error('JSONP only support a maximum of 2000 bytes of input.');
    }

    // this is the JSONP callback invoked by the response
    FB.ApiServer._callbacks[g] = function(response) {
      cb && cb(response);
      delete FB.ApiServer._callbacks[g];
      script.parentNode.removeChild(script);
    };

    script.src = url;
    document.getElementsByTagName('head')[0].appendChild(script);
  },

  /**
   * Flash based HTTP Client.
   *
   * @access private
   * @param domain {String}   the domain key, one of 'api' or 'graph'
   * @param path   {String}   the request path
   * @param method {String}   the http method
   * @param params {Object}   the parameters for the query
   * @param cb     {Function} the callback function to handle the response
   */
  flash: function(domain, path, method, params, cb) {
    if (!window.FB_OnXdHttpResult) {
      // the SWF calls this global function when a HTTP response is available
      // FIXME: remove global
      window.FB_OnXdHttpResult = function(reqId, data) {
        FB.ApiServer._callbacks[reqId](decodeURIComponent(data));
      };
    }

    FB.Flash.onReady(function() {
      if (domain === 'graph') {
        params.suppress_http_code = 1;
      }
      var
        url  = FB.getDomain(domain) + path,
        body = FB.QS.encode(params);

      if (method === 'get') {
        // convert GET to POST if needed based on URL length
        if (url.length + body.length > 2000) {
          if (domain === 'graph') {
            params.method = 'get';
          }
          method = 'post';
          body = FB.QS.encode(params);
        } else {
          url += (url.indexOf('?') > -1 ? '&' : '?') + body;
          body = '';
        }
      } else if (method !== 'post') {
        // we use method override and do a POST for PUT/DELETE as flash has
        // trouble otherwise
        if (domain === 'graph') {
          params.method = method;
        }
        method = 'post';
        body = FB.QS.encode(params);
      }

      // fire the request
      var reqId = document.XdComm.sendXdHttpRequest(
        method.toUpperCase(), url, body, null);

      // callback
      FB.ApiServer._callbacks[reqId] = function(response) {
        cb && cb(FB.JSON.parse(response));
        delete FB.ApiServer._callbacks[reqId];
      };
    });
  }
});

/*
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
    
	var url = this.options.url.graph + service + access_token;
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
*/