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
 * Internal Authentication implementation.
 *
 * @class FB.Auth
 * @static
 * @access private
 */
FB.provide('Auth', {
  // pending callbacks for FB.getLoginStatus() calls
  _callbacks: [],
  _xdStorePath: 'xd_localstorage/',

  /**
   * Fetch a fresh login status from the server. This should not ordinarily
   * be called directly; use FB.getLoginStatus instead.
   */
  fetchLoginStatus: function(lsCb) {
    // CORDOVA PATCH
    if (FB.UA.mobile() && window.postMessage && window.localStorage && !FB._nativeInterface) {
           FB.Auth.staticAuthCheck(lsCb);
    } else {
      FB.ui({
          method: 'login.status',
          display: 'none',
          domain: location.hostname
        },
        lsCb
      );
    }
  },

  /**
   * Perform auth check using static endpoint first, then use
   * login_status as backup when static endpoint does not fetch any
   * results.
   */
  staticAuthCheck: function(lsCb) {
    var domain =  FB.getDomain('https_staticfb');
    FB.Content.insertIframe({
      root: FB.Content.appendHidden(''),
      className: 'FB_UI_Hidden',
      url: domain + FB.Auth._xdStorePath,
      onload: function(iframe) {
        var server = frames[iframe.name];
        var guid = FB.guid();
        var handled = false;
        var fn = function(response) {
          if (!handled) {
            handled = true;
            FB.Auth._staticAuthHandler(lsCb, response);
          }
        };

        FB.XD.handler(fn, 'parent', true, guid);
        // In case the static handler doesn't respond in time, we use
        // a timer to trigger a response.
        setTimeout(fn, 500);

        server.postMessage(
          FB.JSON.stringify({
            method: 'getItem',
            params: ['LoginInfo_' + FB._apiKey, /* do_log */ true],
            returnCb: guid
          }),
          domain);
      }
    });
  },

  _staticAuthHandler: function(cb, response) {
    if (response && response.data && response.data.status &&
        response.data.status == 'connected') {
      var r;
      var status = response.data.status;

      if (response.data.https == 1) {
        FB._https = true;
      }

      var authResponse = response.data.authResponse || null;
      r = FB.Auth.setAuthResponse(authResponse, status);
      cb && cb(r);
    } else {
      // finally make the call to login status
      FB.ui({ method: 'login.status', display: 'none' }, cb);
    }
  },

  /**
   * Sets new access token and user status values.  Invokes all the registered
   * subscribers if needed.
   *
   * @access private
   * @param authResponse {Object} the new auth response surrouning the access
   *                              token, user id, signed request, and expiry
   *                              time.
   * @param status       {String} the new status
   * @return             {Object} the "response" object, which is a simple
   *                              dictionary object surrounding the two
   *                              incoming values.
   */
  setAuthResponse: function(authResponse, status) {
    var userID = 0;
    if (authResponse) {
      // if there's an auth record, then there are a few ways we might
      // actually get a user ID out of it.  If an explcit user ID is provided,
      // then go with that.  If there's no explicit user ID, but there's a valid
      // signed request with a user ID inside, then use that as a backup.
      if (authResponse.userID) {
        userID = authResponse.userID;
      } else if (authResponse.signedRequest) {
        var parsedSignedRequest =
          FB.Auth.parseSignedRequest(authResponse.signedRequest);
        if (parsedSignedRequest && parsedSignedRequest.user_id) {
          userID = parsedSignedRequest.user_id;
        }
      }
    }

    var
      login = !FB._userID && authResponse,
      logout = FB._userID && !authResponse,
      both = authResponse && FB._userID != userID,
      authResponseChange = login || logout || both,
      statusChange = status != FB._userStatus;

    var response = {
      authResponse : authResponse,
      status : status
    };

    FB._authResponse = authResponse;
    FB._userID = userID;
    FB._userStatus = status;

    if (logout || both) {
      FB.Event.fire('auth.logout', response);
    }
    if (login || both) {
      FB.Event.fire('auth.login', response);
    }
    if (authResponseChange) {
      FB.Event.fire('auth.authResponseChange', response);
    }
    if (statusChange) {
      FB.Event.fire('auth.statusChange', response);
    }

    // re-setup a timer to refresh the authResponse if needed. we only do this
    // if FB.Auth._loadState exists, indicating that the application relies on
    // the JS to get and refresh authResponse information
    // (vs managing it themselves).
    if (FB.Auth._refreshTimer) {
      window.clearTimeout(FB.Auth._refreshTimer);
      delete FB.Auth._refreshTimer;
    }

    if (FB.Auth._loadState && authResponse) {
      FB.Auth._refreshTimer = window.setTimeout(function() {
        FB.getLoginStatus(null, true); // force refresh
      }, 1200000); // 20 minutes
    }

    return response;
  },

  _getContextType: function() {
    // Set session origin
    // WEB = 1
    // MOBILE_CANVAS = 2
    // NATIVE_MOBILE = 3
    // DESKTOP = 4
    // WEB_CANVAS = 5
    if (FB.UA.nativeApp()) {
      return 3;
    }
    if (FB.UA.mobile()) {
      return 2;
    }
    if (FB._inCanvas) {
      return 5;
    }
    return 1;
  },

  /**
   * This handles receiving an access token from:
   *  - /dialog/oauth
   *
   * Whenever a user is logged in and has connected to the application, the
   * params passed to the supplied callback include:
   *
   *   {
   *     access_token: an access token
   *     expires_in: the number of seconds before the access token expires
   *     code: the authorization code used to generate
   *     signed_request: the code/user_id cookie, provided if and only if
   *             cookies are enabled.
   *   }
   *
   * If the user is logged out, or if the user is logged in and not connected,
   * then the callback gets a smaller param record that includes:
   *
   *   {
   *     error: either 'not_authorized' or 'unknown'
   *   }
   *
   * @access private
   * @param cb                {Function} the callback function.
   * @param frame             {String}   the frame id the callback is tied to.
   * @param target            {String}   'parent' or 'opener' to indicate window
   *                                     relation.
   * @param authResponse {Object}   backup access token record, if not
   *                                     found in response.
   * @param method            {String}   the name of the method invoking this
   * @return                  {String}   the xd url bound to the callback
   */
  xdHandler: function(cb, frame, target, authResponse, method) {
    return FB.UIServer._xdNextHandler(
      FB.Auth.xdResponseWrapper(cb, authResponse, method),
      frame,
      target,
      true);
  },

  /**
   * This handles receiving an access token from:
   *  - /dialog/oauth
   *
   * It updates the internal SDK access token record based on the response
   * and invokes the (optional) user specified callback.
   *
   * Whenever a user is logged in and has connected to the application, the
   * callback gets the following passed to it:
   *
   *   {
   *     access_token: an access token
   *     expires_in: the number of seconds before the access token expires
   *     code: the authorization code used to generate
   *     signed_request: the code/user_id cookie, provided if and only if
   *             cookies are enabled.
   *   }
   *
   * If the user is logged out, or if the user is logged in and not connected,
   * then the callback gets a smaller param record that includes:
   *
   *   {
   *     error: either 'not_authorized' or 'unknown'
   *   }
   *
   * @access private
   * @param cb           {Function} the callback function
   * @param status       {String}   the connect status this handler will
   *                                trigger
   * @param authResponse {Object}   backup access token record, if none
   *                                is found in response
   * @param method       {String}   the name of the method invoking this
   * @return             {Function} the wrapped xd handler function
   */
  xdResponseWrapper: function(cb, authResponse, method) {
    return function(params) {
      if (params.access_token) {
        // Whatever this is a response to, it succeeded
        var parsedSignedRequest =
          FB.Auth.parseSignedRequest(params.signed_request);
        authResponse = {
          accessToken: params.access_token,
          userID: parsedSignedRequest.user_id,
          expiresIn: parseInt(params.expires_in, 10),
          signedRequest: params.signed_request
        };

        if (FB.Cookie.getEnabled()) {
          var expirationTime = authResponse.expiresIn === 0
            ? 0 // make this a session cookie if it's for offline access
            : (new Date()).getTime() + authResponse.expiresIn * 1000;

          var baseDomain = FB.Cookie._domain;
          if (!baseDomain && params.base_domain) {
            // if no base domain was set, and we got a base domain back
            // from the our side, lets use this and prepend . to also
            // cover subdomains (this will actually be added anyway by
            // the browser).
            baseDomain = '.' + params.base_domain;
          }
          FB.Cookie.setSignedRequestCookie(params.signed_request,
                                           expirationTime,
                                           baseDomain);
        }
        FB.Auth.setAuthResponse(authResponse, 'connected');
      } else if (!FB._authResponse && authResponse) {
        // Should currently not be hit since authResponse is a copy of
        // FB._authResponse

        // use the cached version we had access to
        FB.Auth.setAuthResponse(authResponse, 'connected');
      } else if (!(authResponse && method == 'permissions.oauth')) {
        // Do not enter this when we had an authResponse at the time
        // of calling permissions.oauth, and no access_token was returned.
        // This is the case when a TOSed app requests additional perms,
        // but the user skips this.
        var status;
        if (params.error && params.error === 'not_authorized') {
          status = 'not_authorized';
        } else {
          status = 'unknown';
        }
        FB.Auth.setAuthResponse(null, status);
        if (FB.Cookie.getEnabled()) {
          FB.Cookie.clearSignedRequestCookie();
        }
      }

      // Use HTTPS for future requests.
      if (params && params.https == 1 && !FB._https) {
        FB._https = true;
      }

      response = {
        authResponse: FB._authResponse,
        status: FB._userStatus
      };

      cb && cb(response);
    };
  },

  /**
   * Discards the signature part of the signed request
   * (we don't have the secret used to sign it, and we can't
   * expect developers to expose their secret here), and
   * base64URL-decodes and json-decodes the payload portion
   * to return a small dictionary around the authorization code
   * and user id.
   *
   * @return {Object} small JS object housing an authorization
   *         code and the user id.
   */
  parseSignedRequest: function(signed_request) {
    if (!signed_request) {
      return null;
    }

    var boom = signed_request.split('.', 2);
    // boom[0] is a signature that can't be verified here, because
    // we don't (and shouldn't) have client side access to the app secret
    var payload = boom[1];
    var data = FB.Auth.base64URLDecode(payload);
    return FB.JSON.parse(data);
  },

  /**
   * Standard algorithm to decode a packet known to be encoded
   * using the standard base64 encoding algorithm, save for the
   * difference that the packet contains - where there would normally
   * have been a +, and _ where there'd normally be a /.
   *
   * @param {String}
   */
  base64URLDecode: function(input) {
    // +'s and /'s are replaced, by Facebook, with urlencode-safe
    // characters - and _, respectively.  We could just changed the
    // key string, but better to clarify this and then go with the
    // standard key string, in case this code gets lifted and dropped
    // somewhere else.
    input = input.replace(/\-/g, '+').replace(/\_/g, '/');

    // our signed requests aren't automatically 0 mod 4 in length, so we
    // need to pad with some '=' characters to round it out.
    if (input.length % 4 !== 0) {
      var padding = 4 - input.length % 4;
      for (var d = 0; d < padding; d++) {
        input = input + '=';
      }
    }
    var keyStr =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3 = "";
    var enc1, enc2, enc3, enc4 = "";

    for (var i = 0; i < input.length; i += 4) {
      enc1 = keyStr.indexOf(input.charAt(i));
      enc2 = keyStr.indexOf(input.charAt(i + 1));
      enc3 = keyStr.indexOf(input.charAt(i + 2));
      enc4 = keyStr.indexOf(input.charAt(i + 3));
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      output = output + String.fromCharCode(chr1);
      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }
      chr1 = chr2 = chr3 = "";
      enc1 = enc2 = enc3 = enc4 = "";
    }

    return unescape(output);
  }
});

FB.provide('UIServer.Methods', {
  'permissions.oauth': {
    url       : 'dialog/oauth',
    size      : { width: (FB.UA.mobile() ? null : 627),
                  height: (FB.UA.mobile() ? null : 326) },
    transform : function(call) {
      if (!FB._apiKey) {
        FB.log('FB.login() called before FB.init().');
        return;
      }

      // if an access token is already available and no additional
      // params are being requested (via a scope attribute within the params)
      // then the callback should be pinged directly without the round trip.
      if (FB._authResponse && !call.params.scope) {
        FB.log('FB.login() called when user is already connected.');
        call.cb && call.cb({ status: FB._userStatus,
                             authResponse: FB._authResponse });
        return;
      }

      var
        cb = call.cb,
        id = call.id;
      delete call.cb;
      FB.copy(
        call.params, {
          client_id : FB._apiKey,
          redirect_uri : FB.URI.resolve(
            FB.Auth.xdHandler(
              cb,
              id,
              'opener',
              FB._authResponse,
              'permissions.oauth')),
          origin : FB.Auth._getContextType(),
          response_type: 'token,signed_request',
          domain: location.hostname
        });

      return call;
    }
  },

  'auth.logout': {
    url       : 'logout.php',
    transform : function(call) {
      if (!FB._apiKey) {
        FB.log('FB.logout() called before calling FB.init().');
      } else if (!FB._authResponse) {
        FB.log('FB.logout() called without an access token.');
      } else {
        call.params.next = FB.Auth.xdHandler(call.cb,
                                             call.id,
                                             'parent',
                                             FB._authResponse);
        return call;
      }
    }
  },

  'login.status': {
    url       : 'dialog/oauth',
    transform : function(call) {
      var
        cb = call.cb,
        id = call.id;
      delete call.cb;
      FB.copy(call.params, {
        client_id : FB._apiKey,
        redirect_uri : FB.Auth.xdHandler(cb,
                                         id,
                                         'parent',
                                         FB._authResponse),
        origin : FB.Auth._getContextType(),
        response_type : 'token,signed_request,code',
        domain: location.hostname
      });

      return call;
    }
  }
});
