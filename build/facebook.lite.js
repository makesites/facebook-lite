/* 
 * Facebook Lite
 * Lightweight JavaScript SDK for the Facebook API 
 * 
 * Created by Makis Tracend (@tracend)
 * Published at Makesites.org - http://github.com/makesites/facebook-lite
 * 
 * @license MIT licensed
 * 
 * "original methods": ["Data", "Data.query", "Data.waitOn", "Dom", "Dom.addCssRules", "Event", "Event.subscribe", "Event.unsubscribe", "Insights", "Insights.impression", "Music", "Music.flashCallback", "Music.init", "Music.send", "Payment", "Payment.init", "Payment.setSize", "UA", "UA.nativeApp", "XD", "XD.onMessage", "XFBML", "XFBML.parse", "api", "getAccessToken", "getAuthResponse", "getLoginStatus", "getUserID", "init", "login", "logout", "ui"]
 */

// Don't include if the namespace is taken (by the official lib?)
//window.FB || (function(window) {

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
 * @provides fb.prelude
 */

/**
 * Prelude.
 *
 *     Namespaces are one honking great idea -- let's do more of those!
 *                                                            -- Tim Peters
 *
 * The Prelude is what keeps us from being messy. In order to co-exist with
 * arbitary environments, we need to control our footprint. The one and only
 * rule to follow here is that we need to limit the globals we introduce. The
 * only global we should every have is ``FB``. This is exactly what the prelude
 * enables us to do.
 *
 * The main method to take away from this file is `FB.copy()`_. As the name
 * suggests it copies things. Its powerful -- but to get started you only need
 * to know that this is what you use when you are augmenting the FB object. For
 * example, this is skeleton for how ``FB.Event`` is defined::
 *
 *   FB.provide('Event', {
 *     subscribe: function() { ... },
 *     unsubscribe: function() { ... },
 *     fire: function() { ... }
 *   });
 *
 * This is similar to saying::
 *
 *   FB.Event = {
 *     subscribe: function() { ... },
 *     unsubscribe: function() { ... },
 *     fire: function() { ... }
 *   };
 *
 * Except it does some housekeeping, prevents redefinition by default and other
 * goodness.
 *
 * .. _FB.copy(): #method_FB.copy
 *
 * @class FB
 * @static
 * @access private
 */
if (!window.FB) {
  window.FB = {
    // use the init method to set these values correctly
    _apiKey       : null,
    _authResponse : null,
    _userStatus   : 'unknown', // or 'notConnected' or 'connected'

    // logging is enabled by default. this is the logging shown to the
    // developer and not at all noisy.
    _logging: true,
    _inCanvas: (
      (window.name.indexOf('iframe_canvas') > -1) ||
      (window.name.indexOf('app_runner') > -1)),

    // Determines if we should use HTTPS when attempting cross-domain
    // communication with facebook.com. This is assumed to be the case when
    // window.name contains "_fb_https". This value may also be set by the
    // response from FB.login() or FB.getLoginStatus()
    _https: (window.name.indexOf('_fb_https') > -1),

    //
    // DYNAMIC DATA
    //
    // the various domains needed for using Connect
    _domain: {
      api            : 'https://api.facebook.com/',
      api_read       : 'https://api-read.facebook.com/',
      cdn            : 'http://static.ak.fbcdn.net/',
      https_cdn      : 'https://s-static.ak.fbcdn.net/',
      graph          : 'https://graph.facebook.com/',
      staticfb       : 'http://static.ak.facebook.com/',
      https_staticfb : 'https://s-static.ak.facebook.com/',
      www            : 'http://www.facebook.com/',
      https_www      : 'https://www.facebook.com/',
      m              : 'http://m.facebook.com/',
      https_m        : 'https://m.facebook.com/'
    },
    _locale: null,
    _localeIsRtl: false,
      

    /**
     * Retrieve one of the various domains needed for Connect.
     *
     * @access private
     * @param domain   (String)  The domain to retrieve
     * @param noForcedHTTPS  (bool) Do not force https domain
     */
    getDomain: function(domain, noForcedHTTPS) {
      var forceHTTPS = !noForcedHTTPS &&
        (window.location.protocol == 'https:' || FB._https);
      switch (domain) {
        case 'api':
          return FB._domain.api;
        case 'api_read':
          return FB._domain.api_read;
        case 'cdn':
          return forceHTTPS ? FB._domain.https_cdn : FB._domain.cdn;
        case 'cdn_foreign':
          return FB._domain.cdn_foreign;
        case 'https_cdn':
          return FB._domain.https_cdn;
        case 'graph':
          return FB._domain.graph;
        case 'staticfb':
          return forceHTTPS ?  FB._domain.https_staticfb : FB._domain.staticfb;
        case 'https_staticfb':
          return FB._domain.https_staticfb;
        case 'www':
          return forceHTTPS ? FB._domain.https_www : FB._domain.www;
        case 'https_www':
          return FB._domain.https_www;
        case 'm':
          return forceHTTPS ? FB._domain.https_m : FB._domain.m;
        case 'https_m':
          return FB._domain.https_m;
      }
    },

    /**
     * Copies things from source into target.
     *
     * @access private
     * @param target    {Object}  the target object where things will be copied
     *                            into
     * @param source    {Object}  the source object where things will be copied
     *                            from
     * @param overwrite {Boolean} indicate if existing items should be
     *                            overwritten
     * @param transform  {function} [Optional], transformation function for
     *        each item
     */
    copy: function(target, source, overwrite, transform) {
      for (var key in source) {
        if (overwrite || typeof target[key] === 'undefined') {
          target[key] = transform ? transform(source[key]) :  source[key];
        }
      }
      return target;
    },

    /**
     * Create a namespaced object.
     *
     * @access private
     * @param name {String} full qualified name ('Util.foo', etc.)
     * @param value {Object} value to set. Default value is {}. [Optional]
     * @return {Object} The created object
     */
    create: function(name, value) {
      var node = window.FB, // We will use 'FB' as root namespace
      nameParts = name ? name.split('.') : [],
      c = nameParts.length;
      for (var i = 0; i < c; i++) {
        var part = nameParts[i];
        var nso = node[part];
        if (!nso) {
          nso = (value && i + 1 == c) ? value : {};
          node[part] = nso;
        }
        node = nso;
      }
      return node;
    },

    /**
     * Copy stuff from one object to the specified namespace that
     * is FB.<target>.
     * If the namespace target doesn't exist, it will be created automatically.
     *
     * @access private
     * @param target    {Object|String}  the target object to copy into
     * @param source    {Object}         the source object to copy from
     * @param overwrite {Boolean}        indicate if we should overwrite
     * @return {Object} the *same* target object back
     */
    provide: function(target, source, overwrite) {
      // a string means a dot separated object that gets appended to, or created
      return FB.copy(
        typeof target == 'string' ? FB.create(target) : target,
        source,
        overwrite
      );
    },

    /**
     * Generates a weak random ID.
     *
     * @access private
     * @return {String} a random ID
     */
    guid: function() {
      return 'f' + (Math.random() * (1<<30)).toString(16).replace('.', '');
    },

    /**
     * Logs a message for the developer if logging is on.
     *
     * @access private
     * @param args {Object} the thing to log
     */
    log: function(args) {
      if (FB._logging) {
        //TODO what is window.Debug, and should it instead be relying on the
        //     event fired below?
//#JSCOVERAGE_IF 0
        if (window.Debug && window.Debug.writeln) {
          window.Debug.writeln(args);
        } else if (window.console) {
          window.console.log(args);
        }
//#JSCOVERAGE_ENDIF
      }

      // fire an event if the event system is available
      if (FB.Event) {
        FB.Event.fire('fb.log', args);
      }
    },

    /**
     * Shortcut for document.getElementById
     * @method $
     * @param {string} DOM id
     * @return DOMElement
     * @access private
     */
    $: function(id) {
      return document.getElementById(id);
    }
  };
}

var defaults =
  {
	clientId: 0, 
	url : {
		graph : "https://graph.facebook.com/", 
		oauth : "https://www.facebook.com/dialog/oauth/", 
		authorize : "https://graph.facebook.com/oauth/authorize", 
		access_token : "https://graph.facebook.com/oauth/access_token", 
		redirect_uri : window.location // or if type=user_agent: "https://www.facebook.com/connect/login_success.html"
	}
  };

      

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
 * @provides fb.type
 * @layer basic
 * @requires fb.prelude
 */

// Provide Class/Type support.
// TODO: As a temporary hack, this docblock is written as if it describes the
// top level FB namespace. This is necessary because the current documentation
// parser uses the description from this file for some reason.
/**
 * The top level namespace exposed by the SDK. Look at the [readme on
 * **GitHub**][readme] for more information.
 *
 * [readme]: http://github.com/facebook/connect-js
 *
 * @class FB
 * @static
 */
FB.provide('', {
  /**
   * Bind a function to a given context and arguments.
   *
   * @static
   * @access private
   * @param fn {Function} the function to bind
   * @param context {Object} object used as context for function execution
   * @param {...} arguments additional arguments to be bound to the function
   * @returns {Function} the bound function
   */
  bind: function() {
    var
      args    = Array.prototype.slice.call(arguments),
      fn      = args.shift(),
      context = args.shift();
    return function() {
      return fn.apply(
        context,
        args.concat(Array.prototype.slice.call(arguments))
      );
    };
  },

  /**
   * Create a new class.
   *
   * Note: I have to use 'Class' instead of 'class' because 'class' is
   * a reserved (but unused) keyword.
   *
   * @access private
   * @param name {string} class name
   * @param constructor {function} class constructor
   * @param proto {object} instance methods for class
   */
  Class: function(name, constructor, proto) {
    if (FB.CLASSES[name]) {
      return FB.CLASSES[name];
    }

    var newClass = constructor ||  function() {};

    newClass.prototype = proto;
    newClass.prototype.bind = function(fn) {
      return FB.bind(fn, this);
    };

    newClass.prototype.constructor = newClass;
    FB.create(name, newClass);
    FB.CLASSES[name] = newClass;
    return newClass;
  },

  /**
   * Create a subclass
   *
   * Note: To call base class constructor, use this._base(...).
   * If you override a method 'foo' but still want to call
   * the base class's method 'foo', use this._callBase('foo', ...)
   *
   * @access private
   * @param {string} name class name
   * @param {string} baseName,
   * @param {function} constructor class constructor
   * @param {object} proto instance methods for class
   */
  subclass: function(name, baseName, constructor, proto) {
    if (FB.CLASSES[name]) {
      return FB.CLASSES[name];
    }
    var base = FB.create(baseName);
    FB.copy(proto, base.prototype);
    proto._base = base;
    proto._callBase = function(method) {
      var args = Array.prototype.slice.call(arguments, 1);
      return base.prototype[method].apply(this, args);
    };

    return FB.Class(
      name,
      constructor ? constructor : function() {
        if (base.apply) {
          base.apply(this, arguments);
        }
      },
      proto
    );
  },

  CLASSES: {}
});

/**
 * @class FB.Type
 * @static
 * @private
 */
FB.provide('Type', {
  isType: function(obj, type) {
    while (obj) {
      if (obj.constructor === type || obj === type) {
        return true;
      } else {
        obj = obj._base;
      }
    }
    return false;
  }
});

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
 * @provides fb.obj
 * @requires fb.type
 *           fb.json
 *           fb.event
 */

/**
 * Base object type that support events.
 *
 * @class FB.Obj
 * @private
 */
FB.Class('Obj', null,
  FB.copy({
    /**
     * Set property on an object and fire property changed event if changed.
     *
     * @param {String} Property name. A event with the same name
     *                 will be fire when the property is changed.
     * @param {Object} new value of the property
     * @private
     */
     setProperty: function(name, value) {
       // Check if property actually changed
       if (FB.JSON.stringify(value) != FB.JSON.stringify(this[name])) {
         this[name] = value;
         this.fire(name, value);
       }
     }
  }, FB.EventProvider)
);


/**
 * Utility function related to Strings.
 *
 * @class FB.String
 * @static
 * @private
 */
FB.provide('String', {
  /**
   * Strip leading and trailing whitespace.
   *
   * @param s {String} the string to trim
   * @returns {String} the trimmed string
   */
  trim: function(s) {
    return s.replace(/^\s*|\s*$/g, '');
  },

  /**
   * Format a string.
   *
   * Example:
   *     FB.String.format('{0}.facebook.com/{1}', 'www', 'login.php')
   * Returns:
   *     'www.facebook.com/login.php'
   *
   * Example:
   *     FB.String.format('foo {0}, {1}, {0}', 'x', 'y')
   * Returns:
   *     'foo x, y, x'
   *
   * @static
   * @param format {String} the format specifier
   * @param arguments {...} placeholder arguments
   * @returns {String} the formatted string
   */
  format: function(format) {
    if (!FB.String.format._formatRE) {
      FB.String.format._formatRE = /(\{[^\}^\{]+\})/g;
    }

    var values = arguments;

    return format.replace(
      FB.String.format._formatRE,
      function(str, m) {
        var
          index = parseInt(m.substr(1), 10),
          value = values[index + 1];
        if (value === null || value === undefined) {
          return '';
        }
        return value.toString();
      }
    );
  },

  /**
   * Escape a string to safely use it as HTML.
   *
   * @param value {String} string to escape
   * @return {String} the escaped string
   */
  escapeHTML: function(value) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(value));
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /**
   * Escape a string so that it can be embedded inside another string
   * as quoted string.
   *
   * @param value {String} string to quote
   * @return {String} the quoted string
   */
  quote: function(value) {
    var
      quotes = /["\\\x00-\x1f\x7f-\x9f]/g,
      subst = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
      };

    return quotes.test(value) ?
      '"' + value.replace(quotes, function (a) {
        var c = subst[a];
        if (c) {
          return c;
        }
        c = a.charCodeAt();
        return '\\u00' + Math.floor(c/16).toString(16) + (c % 16).toString(16);
      }) + '"' :
      '"' + value + '"';
  }
});



/**
 * Array related helper methods.
 *
 * @class FB.Array
 * @private
 * @static
 */
FB.provide('Array', {
  /**
   * Get index of item inside an array. Return's -1 if element is not found.
   *
   * @param arr {Array} Array to look through.
   * @param item {Object} Item to locate.
   * @return {Number} Index of item.
   */
  indexOf: function (arr, item) {
    if (arr.indexOf) {
      return arr.indexOf(item);
    }
    var length = arr.length;
    if (length) {
      for (var index = 0; index < length; index++) {
        if (arr[index] === item) {
          return index;
        }
      }
    }
    return -1;
  },

  /**
   * Merge items from source into target, but only if they dont exist. Returns
   * the target array back.
   *
   * @param target {Array} Target array.
   * @param source {Array} Source array.
   * @return {Array} Merged array.
   */
  merge: function(target, source) {
    for (var i=0; i < source.length; i++) {
      if (FB.Array.indexOf(target, source[i]) < 0) {
        target.push(source[i]);
      }
    }
    return target;
  },

  /**
   * Create an new array from the given array and a filter function.
   *
   * @param arr {Array} Source array.
   * @param fn {Function} Filter callback function.
   * @return {Array} Filtered array.
   */
  filter: function(arr, fn) {
    var b = [];
    for (var i=0; i < arr.length; i++) {
      if (fn(arr[i])) {
        b.push(arr[i]);
      }
    }
    return b;
  },

  /**
   * Create an array from the keys in an object.
   *
   * Example: keys({'x': 2, 'y': 3'}) returns ['x', 'y']
   *
   * @param obj {Object} Source object.
   * @param proto {Boolean} Specify true to include inherited properties.
   * @return {Array} The array of keys.
   */
  keys: function(obj, proto) {
    var arr = [];
    for (var key in obj) {
      if (proto || obj.hasOwnProperty(key)) {
        arr.push(key);
      }
    }
    return arr;
  },

  /**
   * Create an array by performing transformation on the items in a source
   * array.
   *
   * @param arr {Array} Source array.
   * @param transform {Function} Transformation function.
   * @return {Array} The transformed array.
   */
  map: function(arr, transform) {
    var ret = [];
    for (var i=0; i < arr.length; i++) {
      ret.push(transform(arr[i]));
    }
    return ret;
  },

  /**
   * For looping through Arrays and Objects.
   *
   * @param {Object} item   an Array or an Object
   * @param {Function} fn   the callback function for iteration.
   *    The function will be pass (value, [index/key], item) parameters
   * @param {Bool} proto  indicate if properties from the prototype should
   *                      be included
   *
   */
  forEach: function(item, fn, proto) {
    if (!item) {
      return;
    }

    if (Object.prototype.toString.apply(item) === '[object Array]' ||
        (!(item instanceof Function) && typeof item.length == 'number')) {
      if (item.forEach) {
        item.forEach(fn);
      } else {
        for (var i=0, l=item.length; i<l; i++) {
          fn(item[i], i, item);
        }
      }
    } else {
      for (var key in item) {
        if (proto || item.hasOwnProperty(key)) {
          fn(item[key], key, item);
        }
      }
    }
  },

  /**
   * Turns HTMLCollections or anything array-like (that has a `length`)
   * such as function `arguments` into a real array
   *
   * @param {HTMLCollection} coll Array-like collection
   * @return {Array}
   */
  toArray: function(coll) {
    for (var i = 0, a = [], len = coll.length; i < len; i++) {
      a[i] = coll[i];
    }
    return a;
  }
});


/**
 * Simple wrapper around standard JSON to handle third-party library quirks.
 *
 * @class FB.JSON
 * @static
 * @access private
 */
FB.provide('JSON', {
  /**
   * Stringify an object.
   *
   * @param obj {Object} the input object
   * @return {String} the JSON string
   */
  stringify: function(obj) {
    // PrototypeJS is incompatible with native JSON or JSON2 (which is what
    // native JSON is based on)
    if (window.Prototype && Object.toJSON) {
      return Object.toJSON(obj);
    } else {
      return JSON.stringify(obj);
    }
  },

  /**
   * Parse a JSON string.
   *
   * @param str {String} the JSON string
   * @param {Object} the parsed object
   */
  parse: function(str) {
    return JSON.parse(str);
  },

  /**
   * Flatten an object to "stringified" values only. This is useful as a
   * pre-processing query strings where the server expects query parameter
   * values to be JSON encoded.
   *
   * @param obj {Object} the input object
   * @return {Object} object with only string values
   */
  flatten: function(obj) {
    var flat = {};
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var value = obj[key];
        if (null === value || undefined === value) {
          continue;
        } else if (typeof value == 'string') {
          flat[key] = value;
        } else {
          flat[key] = FB.JSON.stringify(value);
        }
      }
    }
    return flat;
  }
});


/**
 * Query String encoding & decoding.
 *
 * @class FB.QS
 * @static
 * @access private
 */
FB.provide('QS', {
  /**
   * Encode parameters to a query string.
   *
   * @access private
   * @param   params {Object}  the parameters to encode
   * @param   sep    {String}  the separator string (defaults to '&')
   * @param   encode {Boolean} indicate if the key/value should be URI encoded
   * @return        {String}  the query string
   */
  encode: function(params, sep, encode) {
    sep    = sep === undefined ? '&' : sep;
    encode = encode === false ? function(s) { return s; } : encodeURIComponent;

    var pairs = [];
    FB.Array.forEach(params, function(val, key) {
      if (val !== null && typeof val != 'undefined') {
        pairs.push(encode(key) + '=' + encode(val));
      }
    });
    pairs.sort();
    return pairs.join(sep);
  },

  /**
   * Decode a query string into a parameters object.
   *
   * @access private
   * @param   str {String} the query string
   * @return     {Object} the parameters to encode
   */
  decode: function(str) {
    var
      decode = decodeURIComponent,
      params = {},
      parts  = str.split('&'),
      i,
      pair;

    for (i=0; i<parts.length; i++) {
      pair = parts[i].split('=', 2);
      if (pair && pair[0]) {
        params[decode(pair[0])] = decode(pair[1] || '');
      }
    }

    return params;
  }
});


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
 * JavaScript library providing Facebook Connect integration.
 *
 * @provides fb.init
 * @requires fb.prelude
 *           fb.auth
 *           fb.api
 *           fb.canvas
 *           fb.canvas.prefetcher
 *           fb.cookie
 *           fb.frictionless
 *           fb.ui
 *           fb.ua
 *           fb.xd
 */

/**
 * This is the top level for all the public APIs.
 *
 * @class FB
 * @static
 * @access public
 */
FB.provide('', {

  // set by CONNECT_FB_INIT_CONFIG
  initSitevars : {},

  /**
   * Initialize the library.
   *
   * Typical initialization enabling all optional features:
   *
   *      <div id="fb-root"></div>
   *      <script src="http://connect.facebook.net/en_US/all.js"></script>
   *      <script>
   *        FB.init({
   *          appId  : 'YOUR APP ID',
   *          status : true, // check login status
   *          cookie : true, // cookies allow server access to signed_request
   *          xfbml  : true  // parse XFBML
   *        });
   *      </script>
   *
   * The best place to put this code is right before the closing
   * `</body>` tag.
   *
   * ### Asynchronous Loading
   *
   * The library makes non-blocking loading of the script easy to use by
   * providing the `fbAsyncInit` hook. If this global function is defined, it
   * will be executed when the library is loaded:
   *
   *     <div id="fb-root"></div>
   *     <script>
   *       window.fbAsyncInit = function() {
   *         FB.init({
   *           appId  : 'YOUR APP ID',
   *           status : true, // check login status
   *           cookie : true, // cookies allow server access to signed_request
   *           xfbml  : true  // parse XFBML
   *         });
   *       };
   *
   *       (function() {
   *         var e = document.createElement('script');
   *         e.src = document.location.protocol +
   *                 '//connect.facebook.net/en_US/all.js';
   *         e.async = true;
   *         document.getElementById('fb-root').appendChild(e);
   *       }());
   *     </script>
   *
   * The best place to put the asynchronous version of the code is right after
   * the opening `<body>` tag. This allows Facebook initialization to happen in
   * parallel with the initialization on the rest of your page.
   *
   * ### Internationalization
   *
   * Facebook Connect features are available many locales. You can replace the
   * `en_US` locale specifed above with one of the [supported Facebook
   * Locales][locales]. For example, to load up the library and trigger dialogs,
   * popups and plugins to be in Hindi (`hi_IN`), you can load the library from
   * this URL:
   *
   *     http://connect.facebook.net/hi_IN/all.js
   *
   * [locales]: http://wiki.developers.facebook.com/index.php/Facebook_Locales
   *
   * ### SSL
   *
   * Facebook Connect is also available over SSL. You should only use this when
   * your own page is served over `https://`. The library will rely on the
   * current page protocol at runtime. The SSL URL is the same, only the
   * protocol is changed:
   *
   *     https://connect.facebook.net/en_US/all.js
   *
   * **Note**: Some [UI methods][FB.ui] like **stream.publish** and
   * **stream.share** can be used without registering an application or calling
   * this method. If you are using an appId, all methods **must** be called
   * after this method.
   *
   * [FB.ui]: /docs/reference/javascript/FB.ui
   *
   * @access public
   * @param options {Object}
   *
   * Property             | Type    | Description                            | Argument   | Default
   * -------------------- | ------- | ------------------------------------   | ---------- | -------
   * appId                | String  | Your application ID.                   | *Optional* | `null`
   * cookie               | Boolean | `true` to enable cookie support.       | *Optional* | `false`
   * logging              | Boolean | `false` to disable logging.            | *Optional* | `true`
   * status               | Boolean | `false` to disable status ping.        | *Optional* | `true`
   * xfbml                | Boolean | `true` to parse [[wiki:XFBML]] tags.   | *Optional* | `false`
   * useCachedDialogs     | Boolean | `false` to disable cached dialogs      | *Optional* | `true`
   * frictionlessRequests | Boolean | `true` to enable frictionless requests | *Optional* | `false`
   * authResponse         | Object  | Use specified access token record      | *Optional* | `null`
   * hideFlashCallback    | function | (Canvas Only) callback for each flash element when popups overlay the page | *Optional* | `null`
   */
  init: function(options) {
    // only need to list values here that do not already have a falsy default.
    // this is why cookie/authResponse are not listed here.
    options = FB.copy(options || {}, {
      logging: true,
      status: true
    });

    FB._userID = 0; // assume unknown or disconnected unless proved otherwise
    FB._apiKey = options.appId || options.apiKey;
    
    // disable logging if told to do so, but only if the url doesnt have the
    // token to turn it on. this allows for easier debugging of third party
    // sites even if logging has been turned off.
    if (!options.logging &&
        window.location.toString().indexOf('fb_debug=1') < 0) {
      FB._logging = false;
    }

    //FB.XD.init(options.channelUrl);

    if (FB.UA.mobile() && FB.TemplateUI &&
        FB.TemplateData && FB.TemplateData._enabled &&
        options.useCachedDialogs !== false) {
      FB.TemplateUI.init();
      FB.Event.subscribe('auth.statusChange', FB.TemplateData.update);
    }

    if (options.reportTemplates) {
      FB.reportTemplates = true;
    }

    if (options.frictionlessRequests) {
      FB.Frictionless.init();
    }

    if (FB._apiKey) {
      // enable cookie support if told to do so
      FB.Cookie.setEnabled(options.cookie);

    if (options.authResponse) {
        FB.Auth.setAuthResponse(options.authResponse,
                                'connected');
      } else {
        // we don't have an access token yet, but we might have a user
        // ID based on a signed request in the cookie.
        var signedRequest = FB.Cookie.loadSignedRequest();
        var parsedSignedRequest = FB.Auth.parseSignedRequest(signedRequest);
        FB._userID =
          (parsedSignedRequest && parsedSignedRequest.user_id) || 0;
        FB.Cookie.loadMeta();
      }

      // load a fresh authRequest (or access token) if requested
      if (options.status) {
        FB.getLoginStatus();
      }
    }

    if (FB._inCanvas) {
      FB.Canvas._setHideFlashCallback(options.hideFlashCallback);
      FB.Canvas.init();
    }

    FB.Event.subscribe('xfbml.parse', function() {
      FB.XFBML.IframeWidget.batchWidgetPipeRequests();
    });

    // weak dependency on XFBML
    if (options.xfbml) {
      // do this in a setTimeout to delay it until the current call stack has
      // finished executing
      window.setTimeout(function() {
        if (FB.XFBML) {
          if (FB.initSitevars.parseXFBMLBeforeDomReady) {
            // poll to render new elements as fast as possible,
            // without waiting for things like external js to load
            FB.XFBML.parse();
            var myI = window.setInterval(
              function() {
                FB.XFBML.parse();
              },
              100);
            FB.Dom.ready(
              function() {
                window.clearInterval(myI);
                FB.XFBML.parse();
              });
          } else {
            // traditional xfbml parse after dom is loaded
            FB.Dom.ready(FB.XFBML.parse);
          }
        }
      }, 0);
    }
    if (FB.Canvas && FB.Canvas.Prefetcher) {
      FB.Canvas.Prefetcher._maybeSample();
    }
  }
});



/*
Facebook.prototype.init = function(options)
{
	
	// if logging check the query
	if( options.logging === true && window.location.hash.search("access_token") > -1 ){
		this.parseResponse( window.location.href );
		// remove the hash (return to home)
		window.location.hash = "#"
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
	
  
	// save options for later
	this.options = options;
	
}
*/
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
 * @provides fb.event
 * @requires fb.prelude fb.array
 */

// NOTE: We tag this as FB.Event even though it is actually FB.EventProvider to
// work around limitations in the documentation system.
/**
 * Event handling mechanism for globally named events.
 *
 * @static
 * @class FB.Event
 */
FB.provide('EventProvider', {
  /**
   * Returns the internal subscriber array that can be directly manipulated by
   * adding/removing things.
   *
   * @access private
   * @return {Object}
   */
  subscribers: function() {
    // this odd looking logic is to allow instances to lazily have a map of
    // their events. if subscribers were an object literal itself, we would
    // have issues with instances sharing the subscribers when its being used
    // in a mixin style.
    if (!this._subscribersMap) {
      this._subscribersMap = {};
    }
    return this._subscribersMap;
  },

  /**
   * Subscribe to a given event name, invoking your callback function whenever
   * the event is fired.
   *
   * For example, suppose you want to get notified whenever the authResponse
   * changes:
   *
   *     FB.Event.subscribe('auth.authResponse', function(response) {
   *       // do something with response.access_token
   *     });
   *
   * Global Events:
   *
   * - auth.login -- fired when the user logs in
   * - auth.logout -- fired when the user logs out
   * - auth.prompt -- fired when the user is prompted to log-in/opt-in
   * - auth.authResponseChange -- fired when the authResponse changes
   * - auth.accessTokenChange -- fired when the access token changes.
   * - auth.statusChange -- fired when the status changes
   * - xfbml.parse -- firest when a call to FB.XFBML.parse()
   *                  has processed all XFBML tags in the
   *                  element.process() sense
   * - xfbml.render -- fired when a call to FB.XFBML.parse() completes
   * - edge.create -- fired when the user likes something (fb:like)
   * - comments.add -- fired when the user adds a comment (fb:comments)
   * - question.firstVote -- fired when user initially votes on a poll
   *                         (fb:question)
   * - question.vote -- fired when user votes again on a poll (fb:question)
   * - fb.log -- fired on log message
   * - canvas.pageInfoChange -- fired when the page is resized or scrolled
   *
   * @access public
   * @param name {String} Name of the event.
   * @param cb {Function} The handler function.
   */
  subscribe: function(name, cb) {
    var subs = this.subscribers();

    if (!subs[name]) {
      subs[name] = [cb];
    } else {
      subs[name].push(cb);
    }
  },

  /**
   * Removes subscribers, inverse of [FB.Event.subscribe](FB.Event.subscribe).
   *
   * Removing a subscriber is basically the same as adding one. You need to
   * pass the same event name and function to unsubscribe that you passed into
   * subscribe. If we use a similar example to
   * [FB.Event.subscribe](FB.event.subscribe), we get:
   *
   *     var onAuthResponseChange = function(response) {
   *       // do something with response.access_token
   *     };
   *     FB.Event.subscribe('auth.authResponseChange', onAuthResponseChange);
   *
   *     // sometime later in your code you dont want to get notified anymore
   *     FB.Event.unsubscribe('auth.authResponseChange', onAuthResponseChange);
   *
   * @access public
   * @param name {String} Name of the event.
   * @param cb {Function} The handler function.
   */
  unsubscribe: function(name, cb) {
    var subs = this.subscribers()[name];

    FB.Array.forEach(subs, function(value, key) {
      if (value == cb) {
        subs[key] = null;
      }
    });
  },

  /**
   * Repeatedly listen for an event over time. The callback is invoked
   * immediately when monitor is called, and then every time the event
   * fires. The subscription is canceled when the callback returns true.
   *
   * @access private
   * @param {string} name Name of event.
   * @param {function} callback A callback function. Any additional arguments
   * to monitor() will be passed on to the callback. When the callback returns
   * true, the monitoring will cease.
   */
  monitor: function(name, callback) {
    if (!callback()) {
      var
        ctx = this,
        fn = function() {
          if (callback.apply(callback, arguments)) {
            ctx.unsubscribe(name, fn);
          }
        };

      this.subscribe(name, fn);
    }
  },

  /**
   * Removes all subscribers for named event.
   *
   * You need to pass the same event name that was passed to FB.Event.subscribe.
   * This is useful if the event is no longer worth listening to and you
   * believe that multiple subscribers have been set up.
   *
   * @access private
   * @param name    {String}   name of the event
   */
  clear: function(name) {
    delete this.subscribers()[name];
  },

  /**
   * Fires a named event. The first argument is the name, the rest of the
   * arguments are passed to the subscribers.
   *
   * @access private
   * @param name {String} the event name
   */
  fire: function() {
    var
      args = Array.prototype.slice.call(arguments),
      name = args.shift();

    FB.Array.forEach(this.subscribers()[name], function(sub) {
      // this is because we sometimes null out unsubscribed rather than jiggle
      // the array
      if (sub) {
        sub.apply(this, args);
      }
    });
  },

  //////////////////////////////////////////////////////////////////////////////
  // DOM Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Listen to `event` with the `func` event handler.
   */
  listen: function(element, event, func) {
    if (element.addEventListener) {
      element.addEventListener(event, func, false);
    } else if (element.attachEvent) {
      element.attachEvent('on' + event, func);
    }
  },

  /**
   * Do not listen to `event` with the `func` event handler.
   */
  unlisten: function(element, event, func) {
    if (element.removeEventListener) {
      element.removeEventListener(event, func, false);
    } else if (element.detachEvent) {
      element.detachEvent('on' + event, func);
    }
  }

});

/**
 * Event handling mechanism for globally named events.
 *
 * @class FB.Event
 * @extends FB.EventProvider
 */
FB.provide('Event', FB.EventProvider);

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
 * @provides fb.ua
 * @layer basic
 */

/**
 *  User Agent and OS detection. Usage is straightforward:
 *
 *    if (FB.UA.ie()) {
 *      //  IE
 *    }
 *
 *  You can also do version checks:
 *
 *    if (FB.UA.ie() >= 7) {
 *      //  IE7 or better
 *    }
 *
 *  The browser functions will return NaN if the browser does not match, so
 *  you can also do version compares the other way:
 *
 *    if (FB.UA.ie() < 7) {
 *      //  IE6 or worse
 *    }
 *
 *  Note that the version is a float and may include a minor version number,
 *  so you should always use range operators to perform comparisons, not
 *  strict equality.
 *
 *  **Note:** You should **strongly** prefer capability detection to browser
 *  version detection where it's reasonable:
 *
 *    http://www.quirksmode.org/js/support.html
 *
 *  Further, we have a large number of mature wrapper functions and classes
 *  which abstract away many browser irregularities. Check the documentation,
 *  grep for things, or ask on javascript@lists.facebook.com before writing yet
 *  another copy of "event || window.event".
 *
 *  @task browser   Determining the User Agent
 *  @task os        Determining the User's Operating System
 *  @task internal  Internal methods
 *
 *  @author marcel, epriestley
 */
FB.provide('UA', {

  /**
   *  Check if the UA is Internet Explorer.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author marcel
   */
  ie: function() {
    return FB.UA._populate() || this._ie;
  },


  /**
   *  Check if the UA is Firefox.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author marcel
   */
  firefox: function() {
    return FB.UA._populate() || this._firefox;
  },


  /**
   *  Check if the UA is Opera.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author marcel
   */
  opera: function() {
    return FB.UA._populate() || this._opera;
  },


  /**
   *  Check if the UA is Safari.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author marcel
   */
  safari: function() {
    return FB.UA._populate() || this._safari;
  },

  /**
   *  Check if the UA is a Chrome browser.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author cjiang
   */
  chrome : function() {
    return FB.UA._populate() || this._chrome;
  },


  /**
   *  Check if the user is running Windows.
   *
   *  @task os
   *  @return bool `true' if the user's OS is Windows.
   *  @author marcel
   */
  windows: function() {
    return FB.UA._populate() || this._windows;
  },


  /**
   *  Check if the user is running Mac OS X.
   *
   *  @task os
   *  @return bool `true' if the user's OS is Mac OS X.
   *  @author marcel
   */
  osx: function() {
    return FB.UA._populate() || this._osx;
  },

  /**
   * Check if the user is running Linux.
   *
   * @task os
   * @return bool `true' if the user's OS is some flavor of Linux.
   * @author putnam
   */
  linux: function() {
    return FB.UA._populate() || this._linux;
  },

  /**
   * Check if the user is running on an iOS platform.
   *
   * @task os
   * @return bool `true' if the user is running some flavor of the
   *    ios OS.
   * @author beng
   */
  ios: function() {
    FB.UA._populate();
    return FB.UA.mobile() && this._ios;
  },

  /**
   * Check if the browser is running inside a smart mobile phone.
   * @return bool
   * @access public
   */
  mobile: function() {
    FB.UA._populate();
    return !FB._inCanvas && this._mobile;
  },

  /**
   * Checking if we are inside a webview of the FB App for mobile
   * @return bool
   * @access public
   */
  nativeApp: function() {
    // Now native FB app generates UA like this:
    //
    // Mozilla/5.0 (iPhone Simulator; U; CPU iPhone OS 4_2 like Mac OS X; en_IE)
    // AppleWebKit (KHTML, like Gecko) Mobile
    // [FBAN/FBForIPhone;FBAV/3.5a;FBBV/3500;FBDV/i386;FBMD/
    // iPhone Simulator;FBSN/iPhone OS;FBSV/4.2;FBSS/1;FBCR/;
    // FBID/phone;FBLC/en_IE]
    //
    // We will detect by searching for FBAN/\w+;
    //
    return FB.UA.mobile() && navigator.userAgent.match(/FBAN\/\w+;/i);
  },

  /**
   * Check for the Android browser.
   * @return bool
   * @access public
   */
  android: function() {
    FB.UA._populate();
    return FB.UA.mobile() && this._android;
  },

  /**
   * Check for the iPad
   * @return bool
   * @access public
   */
  iPad: function() {
    FB.UA._populate();
    return FB.UA.mobile() && this._iPad;
  },

  _populated : false,

  /**
   *  Populate the UA and OS information.
   *
   *  @access public
   *  @task internal
   *
   *  @return void
   *
   *  @author marcel
   */
  _populate : function() {
    if (FB.UA._populated) {
      return;
    }

    FB.UA._populated = true;

    // To work around buggy JS libraries that can't handle multi-digit
    // version numbers, Opera 10's user agent string claims it's Opera
    // 9, then later includes a Version/X.Y field:
    //
    // Opera/9.80 (foo) Presto/2.2.15 Version/10.10
    // Note: if agent regex is updated, update it in xd_proxy.phpt also!
    var agent = /(?:MSIE.(\d+\.\d+))|(?:(?:Firefox|GranParadiso|Iceweasel).(\d+\.\d+))|(?:Opera(?:.+Version.|.)(\d+\.\d+))|(?:AppleWebKit.(\d+(?:\.\d+)?))/.exec(navigator.userAgent);
    var os    = /(Mac OS X)|(Windows)|(Linux)/.exec(navigator.userAgent);
    var ios = /\b(iPhone|iP[ao]d)/.exec(navigator.userAgent);
    FB.UA._iPad = /\b(iPad)/.exec(navigator.userAgent);
    FB.UA._android = navigator.userAgent.match(/Android/i);
    FB.UA._mobile = ios || FB.UA._android ||
      navigator.userAgent.match(/Mobile/i);

    if (agent) {
      FB.UA._ie      = agent[1] ? parseFloat(agent[1]) : NaN;
      // marcel: IE8 running in IE7 mode.
      if (FB.UA._ie >= 8 && !window.HTMLCollection) {
        FB.UA._ie = 7;
      }
      FB.UA._firefox = agent[2] ? parseFloat(agent[2]) : NaN;
      FB.UA._opera   = agent[3] ? parseFloat(agent[3]) : NaN;
      FB.UA._safari  = agent[4] ? parseFloat(agent[4]) : NaN;
      if (FB.UA._safari) {
        // We do not add the regexp to the above test, because it will always
        // match 'safari' only since 'AppleWebKit' appears before 'Chrome' in
        // the userAgent string.
        agent = /(?:Chrome\/(\d+\.\d+))/.exec(navigator.userAgent);
        FB.UA._chrome = agent && agent[1] ? parseFloat(agent[1]) : NaN;
      } else {
        FB.UA._chrome = NaN;
      }
    } else {
      FB.UA._ie      =
      FB.UA._firefox =
      FB.UA._opera   =
      FB.UA._chrome  =
      FB.UA._safari  = NaN;
    }

    if (os) {
      FB.UA._osx     = !!os[1];
      FB.UA._windows = !!os[2];
      FB.UA._linux   = !!os[3];
    } else {
      FB.UA._osx     =
      FB.UA._windows =
      FB.UA._linux   = false;
    }

    FB.UA._ios    = ios;
  }
});

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
 */

/**
 * Dialog creation and management.
 * To get an object, do
 *   var dialog = FB.ui(...);
 * To subscribe to an event, do
 *   FB.dialog.subscribe(
 *     '<event name>', function() { alert("<event name> happened"); });
 * This dialog may fire the following events
 * 'iframe_hide'  This event is fired if an iframe dialog is hidden but not
 *    closed.  Note that the dialog may subsequently reopen, for example if
 *    there was an error.
 * 'iframe_show'  This event is fired when an iframe dialog is first shown, or
 *    when an error dialog is shown.
 * @class FB.Dialog
 * @public
 */
FB.subclass(
  'Dialog',
  'Obj',
  /**
   * constructor
   * @param id
   */
  function(id) {
    this.id = id;
    if (!FB.Dialog._dialogs) {
      FB.Dialog._dialogs = {};
      FB.Dialog._addOrientationHandler();
    }
    FB.Dialog._dialogs[id] = this;
  },

  // Members
  {
  }
);

FB.provide('Dialog', {
  /**
   *
   */
  _dialogs: null,
  _lastYOffset: 0,

  /**
   * The loader element.
   *
   * @access private
   * @type DOMElement
   */
  _loaderEl: null,

  /**
   * A la Snowbox overlay underneath the dialog on iPad.
   *
   * @access private
   * @type DOMElement
   */
  _overlayEl: null,

  /**
   * The stack of active dialogs.
   *
   * @access private
   * @type Array
   */
  _stack: [],

  /**
   * The currently visible dialog.
   *
   * @access private
   * @type DOMElement
   */
  _active: null,

  /**
   * The state of the popstate listener. Prevents multiple listeners from
   * being created.
   *
   * @access private
   * @type bool
   */
  _popStateListenerOn: false,

  /**
   * Hides open dialog on popstate event
   *
   * @access private
   */
  _hideOnPopState: function(e) {
    FB.Dialog.hide(FB.Dialog._stack.pop());
  },

  /**
   * Get dialog by id
   * @access private
   * @param id {string} dialog id
   * @return {Dialog} a dialog object
   */
  get: function(id) {
    return FB.Dialog._dialogs[id];
  },


  /**
   * Find the root dialog node for a given element. This will walk up the DOM
   * tree and while a node exists it will check to see if has the fb_dialog
   * class and if it does returns it.
   *
   * @access private
   * @param node {DOMElement} a child node of the dialog
   * @return {DOMElement} the root dialog element if found
   */
  _findRoot: function(node) {
    while (node) {
      if (FB.Dom.containsCss(node, 'fb_dialog')) {
        return node;
      }
      node = node.parentNode;
    }
  },

  _createWWWLoader: function(width) {
    width = parseInt(width, 10);
    width = width ? width : 460;
    return FB.Dialog.create({
      content: (
      '<div class="dialog_title">' +
      '  <a id="fb_dialog_loader_close">' +
      '    <div class="fb_dialog_close_icon"></div>' +
      '  </a>' +
      '  <span>Facebook</span>' +
      '  <div style="clear:both;"></div>' +
      '</div>' +
      '<div class="dialog_content"></div>' +
      '<div class="dialog_footer"></div>'),
      width: width
    });
  },

  _createMobileLoader: function() {
    // This chrome is native when possible.
    // We're copying the HTML/CSS output of an XHP element here
    // pretty much verbatim to easily keep them in sync.
    // Copied from e.g. facebook.com/dialog/feed as rendered
    // for a mobile user agent.
    var chrome = FB.UA.nativeApp() ?
      '' :
      ('<table>' +
      '  <tbody>' +
      '    <tr>' +
      '      <td class="header_left">' +
      '        <label class="touchable_button">' +
      '          <input type="submit" value="' +
                   FB.Intl.tx._("Cancel") + '"' +
      '            id="fb_dialog_loader_close"/>' +
      '        </label>' +
      '      </td>' +
      '      <td class="header_center">' +
      '        <div>' + FB.Intl.tx._("Loading...") + '</div>' +
      '      </td>' +
      '      <td class="header_right">' +
      '      </td>' +
      '    </tr>' +
      '  </tbody>' +
      '</table>');

    return FB.Dialog.create({
      classes: 'loading' + (FB.UA.iPad() ? ' centered' : ''),
      content: (
        '<div class="dialog_header">' +
          chrome +
        '</div>')
    });
  },

  _restoreBodyPosition: function() {
    if (!FB.UA.iPad()) {
      var body = document.getElementsByTagName('body')[0];
      FB.Dom.removeCss(body, 'fb_hidden');
    }
  },

  _showIPadOverlay: function() {
    if (!FB.UA.iPad()) {
      return;
    }
    if (!FB.Dialog._overlayEl) {
      FB.Dialog._overlayEl = document.createElement('div');
      FB.Dialog._overlayEl.setAttribute('id', 'fb_dialog_ipad_overlay');
      FB.Content.append(FB.Dialog._overlayEl, null);
    }
    FB.Dialog._overlayEl.className = '';
  },

  _hideIPadOverlay: function() {
    if (FB.UA.iPad()) {
      FB.Dialog._overlayEl.className = 'hidden';
    }
  },

  /**
   * Show the "Loading..." dialog. This is a special dialog which does not
   * follow the standard stacking semantics. If a callback is provided, a
   * cancel action is provided using the "X" icon.
   *
   * @param cb {Function} optional callback for the "X" action
   */
  showLoader: function(cb, width) {
    FB.Dialog._showIPadOverlay();

    if (!FB.Dialog._loaderEl) {
      FB.Dialog._loaderEl = FB.Dialog._findRoot(
        FB.UA.mobile()
        ? FB.Dialog._createMobileLoader()
        : FB.Dialog._createWWWLoader(width));
    }

    // this needs to be done for each invocation of showLoader. since we don't
    // stack loaders and instead simply hold on to the last one, it is possible
    // that we are showing nothing when we can potentially be showing the
    // loading dialog for a previously activated but not yet loaded dialog.
    if (!cb) {
      cb = function() {};
    }
    var loaderClose = FB.$('fb_dialog_loader_close');
    FB.Dom.removeCss(loaderClose, 'fb_hidden');
    loaderClose.onclick = function() {
      FB.Dialog._hideLoader();
      FB.Dialog._restoreBodyPosition();
      FB.Dialog._hideIPadOverlay();
      cb();
    };
    var iPadOverlay = FB.$('fb_dialog_ipad_overlay');
    if (iPadOverlay) {
      iPadOverlay.ontouchstart = loaderClose.onclick;
    }

    FB.Dialog._makeActive(FB.Dialog._loaderEl);
  },

  /**
   * Hide the loading dialog if one is being shown.
   *
   * @access private
   */
  _hideLoader: function() {
    if (FB.Dialog._loaderEl && FB.Dialog._loaderEl == FB.Dialog._active) {
      FB.Dialog._loaderEl.style.top = '-10000px';
    }
  },

  /**
   * Center a dialog based on its current dimensions and place it in the
   * visible viewport area.
   *
   * @access private
   * @param el {DOMElement} the dialog node
   */
  _makeActive: function(el) {
    FB.Dialog._setDialogSizes();
    FB.Dialog._lowerActive();
    FB.Dialog._active = el;
    if (FB.Canvas) {
      FB.Canvas.getPageInfo(function(pageInfo) {
        FB.Dialog._centerActive(pageInfo);
      });
    }
    // use the cached version of the pageInfo if slow or failed arbiter
    // or not in canvas
    FB.Dialog._centerActive(FB.Canvas._pageInfo);
  },

  /**
   * Lower the current active dialog if there is one.
   *
   * @access private
   * @param node {DOMElement} the dialog node
   */
  _lowerActive: function() {
    if (!FB.Dialog._active) {
      return;
    }
    FB.Dialog._active.style.top = '-10000px';
    FB.Dialog._active = null;
  },

  /**
   * Remove the dialog from the stack.
   *
   * @access private
   * @param node {DOMElement} the dialog node
   */
  _removeStacked: function(dialog) {
    FB.Dialog._stack = FB.Array.filter(FB.Dialog._stack, function(node) {
      return node != dialog;
    });
  },

  /**
   * Centers the active dialog vertically.
   *
   * @access private
   */
  _centerActive: function(pageInfo) {
    var dialog = FB.Dialog._active;
    if (!dialog) {
      return;
    }

    var view = FB.Dom.getViewportInfo();
    var width = parseInt(dialog.offsetWidth, 10);
    var height = parseInt(dialog.offsetHeight, 10);
    var left = view.scrollLeft + (view.width - width) / 2;

    // Minimum and maximum values for the top of the dialog;
    // these ensure that the dialog is always within the iframe's
    // dimensions, with some padding.
    // @todo(nikolay): When we refactor this module to avoid
    // the excessive use of if (FB.UA.mobile()), get rid of
    // this undesirable padding. It only looks bad on Desktop Safari
    // (because of the scrollbars).
    var minTop = (view.height - height) / 2.5;
    if (left < minTop) {
      minTop = left;
    }
    var maxTop = view.height - height - minTop;

    // center vertically within the page
    var top = (view.height - height) / 2;
    if (pageInfo) {
      top = pageInfo.scrollTop - pageInfo.offsetTop +
        (pageInfo.clientHeight - height) / 2;
    }

    // clamp to min and max
    if (top < minTop) {
      top = minTop;
    } else if (top > maxTop) {
      top = maxTop;
    }

    // offset by the iframe's scroll
    top += view.scrollTop;

    // The body element is hidden at -10000px while we
    // display dialogs. Full-screen on iPhone.
    if (FB.UA.mobile()) {
      // On mobile device (such as iPhone and iPad) that uses soft keyboard,
      // when a text field has focus and the keyboard is shown, the OS will
      // scroll a page to position the text field at the center of the remaining
      // space. If page doesn't have enough height, then OS will effectively
      // pull the page up by force while the keyboard is up, but the page will
      // slide down as soon as the keyboard is hidden.
      // When that happens, it can cause problems. For example, we had a nasty
      // problem with typeahead control in app request dialog. When user types
      // something in the control, the keyboard is up. However, when the user
      // tap a selection, the keyboard disappears. If the page starts to scroll
      // down, then the "click" event may fire from a differnt DOM element and
      // cause wrong item (or no item) to be selected.
      //
      // After a lot of hacking around, the best solution we found is to insert
      // an extra vertical padding element to give the page some extra space
      // such that page won't be forced to scroll beyeond its limit when
      // the text field inside the dialog needs to be centered. The negative
      // side effect of this hack is that there will be some extra space
      // that the user could scroll to.
      var paddingHeight = 100;

      // Smaller and centered on iPad. This should only run when the
      // dialog is first rendered or the device rotated.
      if (FB.UA.iPad()) {
        paddingHeight += (view.height - height) / 2;
      } else {
        var body = document.getElementsByTagName('body')[0];
        FB.Dom.addCss(body, 'fb_hidden');
        left = 10000;
        top = 10000;
      }

      var paddingDivs = FB.Dom.getByClass('fb_dialog_padding', dialog);
      if (paddingDivs.length) {
        paddingDivs[0].style.height = paddingHeight + 'px';
      }
    }

    dialog.style.left = (left > 0 ? left : 0) + 'px';
    dialog.style.top = (top > 0 ? top : 0) + 'px';
  },

  _setDialogSizes: function() {
    if (!FB.UA.mobile() || FB.UA.iPad()) {
      return;
    }
    for (var id in FB.Dialog._dialogs) {
      if (document.getElementById(id)) {
        var iframe = document.getElementById(id);
        iframe.style.width = FB.UIServer.getDefaultSize().width + 'px';
        iframe.style.height = FB.UIServer.getDefaultSize().height + 'px';
      }
    }
  },

  /**
   * This adapt the position and orientation of the dialogs.
   */
  _handleOrientationChange: function(e) {
    // Normally on Android, screen.availWidth/availHeight/width/height reflect
    // values corresponding to the current orientation. In other words,
    // width/height changes depending on orientation. However,
    // on Android 2.3 browser, the values do not change at the time of the
    // "orientation" event, but change shortly after (50-150ms later).
    //
    // This behavior is annoying. I now have to work around it by doing a
    // timer pulling in the orientation event to detect the correct
    // screen.availWidth/height now.
    if (FB.UA.android() && screen.availWidth == FB.Dialog._availScreenWidth) {
      window.setTimeout(FB.Dialog._handleOrientationChange, 50);
      return;
    }

    FB.Dialog._availScreenWidth = screen.availWidth;

    if (FB.UA.iPad()) {
      FB.Dialog._centerActive();
    } else {
      for (var id in FB.Dialog._dialogs) {
        // Resize the width of any iframes still on the page
        if (document.getElementById(id)) {
          document.getElementById(id).style.width =
            FB.UIServer.getDefaultSize().width + 'px';
        }
      }
    }
  },

  /**
   * Add some logic to fire on orientation change.
   */
  _addOrientationHandler: function() {
    if (!FB.UA.mobile()) {
      return;
    }
    // onOrientationChange is fired on iOS and some Android devices,
    // while other Android devices fire resize. Still other Android devices
    // seem to fire neither.
    var event_name = "onorientationchange" in window ?
      'orientationchange' :
      'resize';

    FB.Dialog._availScreenWidth = screen.availWidth;
    FB.Event.listen(window, event_name, FB.Dialog._handleOrientationChange);
  },

  /**
   * Create a dialog. Returns the node of the dialog within which the caller
   * can inject markup. Optional HTML string or a DOMElement can be passed in
   * to be set as the content. Note, the dialog is hidden by default.
   *
   * @access protected
   * @param opts {Object} Options:
   * Property  | Type              | Description                       | Default
   * --------- | ----------------- | --------------------------------- | -------
   * content   | String|DOMElement | HTML String or DOMElement         |
   * onClose   | Boolean           | callback if closed                |
   * closeIcon | Boolean           | `true` to show close icon         | `false`
   * visible   | Boolean           | `true` to make visible            | `false`
   * width     | Int               | width of dialog                   | 'auto'
   * classes   | String            | added to the dialog's classes     | ''
   *
   * @return {DOMElement} the dialog content root
   */
  create: function(opts) {
    opts = opts || {};

    var
      dialog      = document.createElement('div'),
      contentRoot = document.createElement('div'),
      className   = 'fb_dialog';

    // optional close icon
    if (opts.closeIcon && opts.onClose) {
      var closeIcon = document.createElement('a');
      closeIcon.className = 'fb_dialog_close_icon';
      closeIcon.onclick = opts.onClose;
      dialog.appendChild(closeIcon);
    }

    className += ' ' + (opts.classes || '');

    // handle rounded corners j0nx
//#JSCOVERAGE_IF
    if (FB.UA.ie()) {
      className += ' fb_dialog_legacy';
      FB.Array.forEach(
        [
          'vert_left',
          'vert_right',
          'horiz_top',
          'horiz_bottom',
          'top_left',
          'top_right',
          'bottom_left',
          'bottom_right'
        ],
        function(name) {
          var span = document.createElement('span');
          span.className = 'fb_dialog_' + name;
          dialog.appendChild(span);
        }
      );
    } else {
      className += (FB.UA.mobile())
        ? ' fb_dialog_mobile'
        : ' fb_dialog_advanced';
    }

    if (opts.content) {
      FB.Content.append(opts.content, contentRoot);
    }
    dialog.className = className;
    var width = parseInt(opts.width, 10);
    if (!isNaN(width)) {
      dialog.style.width = width + 'px';
    }
    contentRoot.className = 'fb_dialog_content';

    dialog.appendChild(contentRoot);
    if (FB.UA.mobile()) {
      var padding = document.createElement('div');
      padding.className = 'fb_dialog_padding';
      dialog.appendChild(padding);
    }

    FB.Content.append(dialog);

    if (opts.visible) {
      FB.Dialog.show(dialog);
    }

    return contentRoot;
  },

  /**
   * Raises the given iframe dialog. Any active dialogs are automatically
   * lowered. An active loading indicator is suppressed. An already-lowered
   * dialog will be raised and it will be put at the top of the stack. A dialog
   * never shown before will be added to the top of the stack.
   *
   * @access protected
   * @param dialog {DOMElement} a child element of the dialog
   */
  show: function(dialog) {
    var root = FB.Dialog._findRoot(dialog);
    if (root) {
      FB.Dialog._removeStacked(root);
      FB.Dialog._hideLoader();
      FB.Dialog._makeActive(root);
      FB.Dialog._stack.push(root);
      if ('fbCallID' in dialog) {
        FB.Dialog.get(dialog.fbCallID).fire('iframe_show');
      }
      if (!FB.Event._popStateListenerOn) {
        FB.Event.listen(window, 'popstate', FB.Dialog._hideOnPopState);
        FB.Event._popStateListenerOn = true;
      }
    }
  },

  /**
   * Hide the given iframe dialog. The dialog will be lowered and moved out
   * of view, but won't be removed.
   *
   * @access protected
   * @param dialog {DOMElement} a child element of the dialog
   */
  hide: function(dialog) {
    var root = FB.Dialog._findRoot(dialog);
    if (root == FB.Dialog._active) {
      FB.Dialog._lowerActive();
      FB.Dialog._restoreBodyPosition();
      FB.Dialog._hideIPadOverlay();
      if ('fbCallID' in dialog) {
        FB.Dialog.get(dialog.fbCallID).fire('iframe_hide');
      }
      if (FB.Event._popStateListenerOn) {
        FB.Event.unlisten(window, 'popstate', FB.Dialog._hideOnPopState);
        FB.Event._popStateListenerOn = false;
      }
    }
  },

  /**
   * Remove the dialog, show any stacked dialogs.
   *
   * @access protected
   * @param dialog {DOMElement} a child element of the dialog
   */
  remove: function(dialog) {
    dialog = FB.Dialog._findRoot(dialog);
    if (dialog) {
      var is_active = FB.Dialog._active == dialog;
      FB.Dialog._removeStacked(dialog);
      if (is_active) {
        FB.Dialog._hideLoader();
        if (FB.Dialog._stack.length > 0) {
          FB.Dialog.show(FB.Dialog._stack.pop());
        } else {
          FB.Dialog._lowerActive();
          FB.Dialog._restoreBodyPosition();
          FB.Dialog._hideIPadOverlay();
        }
      } else if (FB.Dialog._active === null && FB.Dialog._stack.length > 0) {
        FB.Dialog.show(FB.Dialog._stack.pop());
      }

      // wait before the actual removal because of race conditions with async
      // flash crap. seriously, dont ever ask me about it.
      // if we remove this without deferring, then in IE only, we'll get an
      // uncatchable error with no line numbers, function names, or stack
      // traces. the 3 second delay isn't a problem because the <div> is
      // already hidden, it's just not removed from the DOM yet.
      window.setTimeout(function() {
        dialog.parentNode.removeChild(dialog);
      }, 3000);
    }
  },

  /**
   * Whether a given node is contained within the active dialog's root
   *
   * @access public
   * @param dialog {DOMElement} a child element of the dialog
   */
  isActive: function(node) {
    var root = FB.Dialog._findRoot(node);
    return root && root === FB.Dialog._active;
  }

});

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
 * @provides fb.auth
 * @requires fb.prelude
 *           fb.qs
 *           fb.event
 *           fb.json
 *           fb.ui
 *           fb.ua
 */

/**
 * Authentication and Authorization.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * Find out the current status from the server, and get an authResponse if
   * the user is connected.
   *
   * The user's status or the question of *who is the current user* is
   * the first thing you will typically start with. For the answer, we
   * ask facebook.com. Facebook will answer this question in one of
   * two ways:
   *
   * 1. Someone you don't know.
   * 2. Someone you know and have interacted with.
   *    Here's an authResponse for them.
   *
   *     FB.getLoginStatus(function(response) {
   *       if (response.authResponse) {
   *         FB.assert(response.status === 'connected');
   *         // logged in and connected user, someone you know
   *       } else if (response.status === 'not_authorized') {
   *         // the user is logged in but not connected to the application
   *       } else {
   *         FB.assert(response.status === 'unknown');
   *         // the user isn't even logged in to Facebook.
   *       }
   *     });
   *
   * **Events**
   *
   * #### auth.login
   * This event is fired when your application first notices the user (in other
   * words, gets an authResponse  when it didn't already have a valid one).
   * #### auth.logout
   * This event is fired when your application notices that there is no longer
   * a valid user (in other words, it had an authResponse but can no longer
   * validate the current user).
   * #### auth.authResponseChange
   * This event is fired for **any** auth related change as they all affect the
   * access token: login, logout, and access token refresh.  Access tokens are
   * are refreshed over time as long as the user is active with your
   * application.
   * #### auth.statusChange
   * Typically you will want to use the auth.authResponseChange event,
   * but in rare cases, you want to distinguish between these three states:
   *
   * - Connected
   * - Logged into Facebook but not connected with your application
   * - Not logged into Facebook at all.
   *
   * The [FB.Event.subscribe][subscribe] and
   * [FB.Event.unsubscribe][unsubscribe] functions are used to subscribe to
   * these events. For example:
   *
   *     FB.Event.subscribe('auth.login', function(response) {
   *       // do something with response
   *     });
   *
   * The response object returned to all these events is the same as the
   * response from [FB.getLoginStatus][getLoginStatus], [FB.login][login] or
   * [FB.logout][logout]. This response object contains:
   *
   * status
   * : The status of the User. One of `connected`, `notConnected` or `unknown`.
   *
   * authResponse
   * : The authorization response.  The field is presented if and only if the
   *   user is logged in and connected to your app.
   *
   * [subscribe]: /docs/reference/javascript/FB.Event.subscribe
   * [unsubscribe]: /docs/reference/javascript/FB.Event.unsubscribe
   * [getLoginStatus]: /docs/reference/javascript/FB.getLoginStatus
   * [login]: /docs/reference/javascript/FB.login
   * [logout]: /docs/reference/javascript/FB.logout
   *
   * @access public
   * @param cb {Function} The callback function.
   * @param force {Boolean} Force reloading the login status (default `false`).
   */
  getLoginStatus: function(cb, force) {
    if (!FB._apiKey) {
      FB.log('FB.getLoginStatus() called before calling FB.init().');
      return;
    }

    // we either invoke the callback right away if the status has already been
    // loaded, or queue it up for when the load is done.
    if (cb) {
      if (!force && FB.Auth._loadState == 'loaded') {
        cb({ status: FB._userStatus,
             authResponse: FB._authResponse});
        return;
      } else {
        FB.Event.subscribe('FB.loginStatus', cb);
      }
    }

    // if we're already loading, and this is not a force load, we're done
    if (!force && FB.Auth._loadState == 'loading') {
      return;
    }

    FB.Auth._loadState = 'loading';

    // invoke the queued callbacks
    var lsCb = function(response) {
      // done
      FB.Auth._loadState = 'loaded';

      // invoke callbacks
      FB.Event.fire('FB.loginStatus', response);
      FB.Event.clear('FB.loginStatus');
    };

    FB.Auth.fetchLoginStatus(lsCb);
  },

  /**
   * Returns the full packet of information about the user and
   * his or her access token, or null if there's no active access
   * token.  This packet is referred to as the authorization response.
   *
   * @access public
   * return {Object} a record containing the access token, then user id,
   *                 the amount of time before it expires, and the
   *                 signed request (or null if there's no active access token).
   */
  getAuthResponse: function() {
    return FB._authResponse;
  },

  /**
   * Returns the access token embedded within the authResponse
   * (or null if it's not available).
   *
   * @access public
   * @return {String} the access token, if available, or null if not.
   */
  getAccessToken: function() {
    return (FB._authResponse && FB._authResponse.accessToken) || null;
  },

  getAppAccessToken: function() {
	  
    var client_id = this.options.clientId || false;
	 var client_secret = this.options.clientSecret || false;
    // exit now if no app id is supplied
    if(!client_id || !client_secret) return;
	
	var url   = this.options.url.access_token + "?" + "client_id=" + client_id + "client_secret=" + client_secret + "&grant_type=client_credentials";
	
	// open the login url
	this.ajax( url, function( response ){
		// save accesstoken
		this.access_token = response.access_token
	});
	
  },

  /**
   * Returns the ID of the connected user, or 0 if
   * the user is logged out or otherwise couldn't be
   * discerned from cookie or access token information.
   *
   * @access public
   * @return {Integer} the ID of the logged in, connected user.
   */
  getUserID: function() {
    return FB._userID;
  },

  /**
   * Login/Authorize/Permissions.
   *
   * Once you have determined the user's status, you may need to
   * prompt the user to login. It is best to delay this action to
   * reduce user friction when they first arrive at your site. You can
   * then prompt and show them the "Connect with Facebook" button
   * bound to an event handler which does the following:
   *
   *     FB.login(function(response) {
   *       if (response.authResponse) {
   *         // user successfully logged in
   *       } else {
   *         // user cancelled login
   *       }
   *     });
   *
   * You should **only** call this on a user event as it opens a
   * popup. Most browsers block popups, _unless_ they were initiated
   * from a user event, such as a click on a button or a link.
   *
   *
   * Depending on your application's needs, you may need additional
   * permissions from the user. A large number of calls do not require
   * any additional permissions, so you should first make sure you
   * need a permission. This is a good idea because this step
   * potentially adds friction to the user's process. Another point to
   * remember is that this call can be made even _after_ the user has
   * first connected. So you may want to delay asking for permissions
   * until as late as possible:
   *
   *     FB.login(function(response) {
   *       if (response.authResponse) {
   *         // if you need to know which permissions were granted then
   *         // you can can make an fql-call
   *         FB.api({
   *                  method: 'fql.query',
   *                  query: 'select read_stream, publish_stream, ' +
   *                    'offline_access from permissions where uid=me()'
   *                },
   *                function (data) {
   *                  if (data[0].read_stream) {
   *                    // we have read_stream
   *                  }
   *                });
   *       } else {
   *         // user is not logged in
   *       }
   *     }, {scope:'read_stream, publish_stream, offline_access'});
   *
   * @access public
   * @param cb {Function} The callback function.
   * @param opts {Object} (_optional_) Options to modify login behavior.
   *
   * Name                     | Type    | Description
   * ------------------------ | ------- | -------------------------------------
   * enable_profile_selector  | Boolean | When true, prompt the user to grant
   *                          |         | permission for one or more Pages.
   * profile_selector_ids     | String  | Comma separated list of IDs to
   *                          |         | display in the profile selector.
   * scope                    | String  | Comma or space delimited list of
   *                          |         | [Extended permissions]
   *                          |         | (/docs/authentication/permissions).
   */
  login: function(cb, opts) {
    if (opts && opts.perms && !opts.scope) {
      opts.scope = opts.perms;
      delete opts.perms;
      FB.log('OAuth2 specification states that \'perms\' ' +
             'should now be called \'scope\'.  Please update.');
    }
    FB.ui(FB.copy({
        method: 'permissions.oauth',
        display: 'popup',
        domain: location.hostname
      }, opts || {}),
      cb);
  },

  /**
   * Logout the user in the background.
   *
   * Just like logging in is tied to facebook.com, so is logging out -- and
   * this call logs the user out of both Facebook and your site. This is a
   * simple call:
   *
   *     FB.logout(function(response) {
   *       // user is now logged out
   *     });
   *
   * NOTE: You can only log out a user that is connected to your site.
   *
   * @access public
   * @param cb {Function} The callback function.
   */
  logout: function(cb) {
    FB.ui({ method: 'auth.logout', display: 'hidden' }, cb);
  }
});

/*
Facebook.prototype.getLoginStatus = function( callback ){
	// access cookie
	return callback( this.auth );
};

Facebook.prototype.login = function(callback, options){
	
	var self = this;
	
    var client_id = this.options.clientId || false;
	var redirect_uri = options.redirect_uri || this.options.url.redirect_uri;
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
	var url   = this.options.url.oauth + "?"
                        + "client_id=" + client_id
                        + "&redirect_uri=" + encodeURIComponent(redirect_uri)
                        + "&display="+ display
						+ "&response_type=token";
                        //+ "&type=user_agent";
	
	// add scope
	if( scope ) url += "&scope=" + scope;
                        
	// open the login url
	this.ajax( url );
	
};
*/

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
    if(options !== null){
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
 * @provides fb.dom
 * @layer basic
 * @requires fb.prelude
 *           fb.event
 *           fb.string
 *           fb.array
 *           fb.ua
 */

/**
 * This provides helper methods related to DOM.
 *
 * @class FB.Dom
 * @static
 * @private
 */
FB.provide('Dom', {
  /**
   * Check if the element contains a class name.
   *
   * @param dom {DOMElement} the element
   * @param className {String} the class name
   * @return {Boolean}
   */
  containsCss: function(dom, className) {
    var cssClassWithSpace = ' ' + dom.className + ' ';
    return cssClassWithSpace.indexOf(' ' + className + ' ') >= 0;
  },

  /**
   * Add a class to a element.
   *
   * @param dom {DOMElement} the element
   * @param className {String} the class name
   */
  addCss: function(dom, className) {
    if (!FB.Dom.containsCss(dom, className)) {
      dom.className = dom.className + ' ' + className;
    }
  },

  /**
   * Remove a class from the element.
   *
   * @param dom {DOMElement} the element
   * @param className {String} the class name
   */
  removeCss: function(dom, className) {
    if (FB.Dom.containsCss(dom, className)) {
      dom.className = dom.className.replace(className, '');
      FB.Dom.removeCss(dom, className); // in case of repetition
    }
  },

  /**
   * Finds elements that have a certain class name
   * A wrapper around document.querySelectorAll if
   * supported, otherwise loops through all dom elements of given tagName
   * hunting for the className.
   *
   * @param {String} className Class name we're interested in
   * @param {HTMLElement} dom (optional) Element to search in
   * @param {String} tagName (optional) Type of tag to look for, default "*"
   * @return {Array}
   */
  getByClass: function(className, dom, tagName) {
    dom = dom || document.body;
    tagName = tagName || '*';
    if (dom.querySelectorAll) {
      return FB.Array.toArray(
        dom.querySelectorAll(tagName + '.' + className)
      );
    }
    var all = dom.getElementsByTagName(tagName),
        els = [];
    for (var i = 0, len = all.length; i < len; i++) {
      if (this.containsCss(all[i], className)) {
        els[els.length] = all[i];
      }
    }
    return els;
  },

  /**
   * Returns the computed style for the element
   *
   * note: requires browser specific names to be passed for specials
   *       border-radius -> ('-moz-border-radius', 'border-radius')
   *
   * @param dom {DOMElement} the element
   * @param styleProp {String} the property name
   */
  getStyle: function (dom, styleProp) {
    var y = false, s = dom.style;
    if (dom.currentStyle) { // camelCase (e.g. 'marginTop')
      FB.Array.forEach(styleProp.match(/\-([a-z])/g), function(match) {
        styleProp = styleProp.replace(match, match.substr(1,1).toUpperCase());
      });
      y = dom.currentStyle[styleProp];
    } else { // dashes (e.g. 'margin-top')
      FB.Array.forEach(styleProp.match(/[A-Z]/g), function(match) {
        styleProp = styleProp.replace(match, '-'+ match.toLowerCase());
      });
      if (window.getComputedStyle) {
        y = document.defaultView
         .getComputedStyle(dom,null).getPropertyValue(styleProp);
        // special handling for IE
        // for some reason it doesn't return '0%' for defaults. so needed to
        // translate 'top' and 'left' into '0px'
        if (styleProp == 'background-position-y' ||
            styleProp == 'background-position-x') {
          if (y == 'top' || y == 'left') { y = '0px'; }
        }
      }
    }
    if (styleProp == 'opacity') {
      if (dom.filters && dom.filters.alpha) {
        return y;
      }
      return y * 100;
    }
    return y;
  },

  /**
   * Sets the style for the element to value
   *
   * note: requires browser specific names to be passed for specials
   *       border-radius -> ('-moz-border-radius', 'border-radius')
   *
   * @param dom {DOMElement} the element
   * @param styleProp {String} the property name
   * @param value {String} the css value to set this property to
   */
  setStyle: function(dom, styleProp, value) {
    var s = dom.style;
    if (styleProp == 'opacity') {
      if (value >= 100) { value = 99.999; } // fix for Mozilla < 1.5b2
      if (value < 0) { value = 0; }
      s.opacity = value/100;
      s.MozOpacity = value/100;
      s.KhtmlOpacity = value/100;
      if (dom.filters) {
        if (dom.filters.alpha == undefined) {
         dom.filter = "alpha(opacity=" + value + ")";
        } else {
          dom.filters.alpha.opacity = value;
        }
      }
    } else { s[styleProp] = value; }
  },

  /**
   * Dynamically add a script tag.
   *
   * @param src {String} the url for the script
   */
  addScript: function(src) {
    var script = document.createElement('script');
    script.type = "text/javascript";
    script.src = src;
    return document.getElementsByTagName('head')[0].appendChild(script);
  },

  /**
   * Add CSS rules using a <style> tag.
   *
   * @param styles {String} the styles
   * @param names {Array} the component names that the styles represent
   */
  addCssRules: function(styles, names) {
    if (!FB.Dom._cssRules) {
      FB.Dom._cssRules = {};
    }

    // note, we potentially re-include CSS if it comes with other CSS that we
    // have previously not included.
    var allIncluded = true;
    FB.Array.forEach(names, function(id) {
      if (!(id in FB.Dom._cssRules)) {
        allIncluded = false;
        FB.Dom._cssRules[id] = true;
      }
    });

    if (allIncluded) {
      return;
    }

//#JSCOVERAGE_IF
    if (!FB.UA.ie()) {
      var style = document.createElement('style');
      style.type = 'text/css';
      style.textContent = styles;
      document.getElementsByTagName('head')[0].appendChild(style);
    } else {
      try {
        document.createStyleSheet().cssText = styles;
      } catch (exc) {
        // major problem on IE : You can only create 31 stylesheet objects with
        // this method. We will have to add the styles into an existing
        // stylesheet.
        if (document.styleSheets[0]) {
          document.styleSheets[0].cssText += styles;
        }
      }
    }
  },

  /**
   * Get the viewport info. Contains size and scroll offsets.
   *
   * @returns {Object} with the width and height
   */
  getViewportInfo: function() {
    // W3C compliant, or fallback to body
    var root = (document.documentElement && document.compatMode == 'CSS1Compat')
      ? document.documentElement
      : document.body;
    return {
      scrollTop  : root.scrollTop,
      scrollLeft : root.scrollLeft,
      width      : self.innerWidth  ? self.innerWidth  : root.clientWidth,
      height     : self.innerHeight ? self.innerHeight : root.clientHeight
    };
  },

  /**
   * Bind a function to be executed when the DOM is ready. It will be executed
   * immediately if the DOM is already ready.
   *
   * @param {Function} the function to invoke when ready
   */
  ready: function(fn) {
    if (FB.Dom._isReady) {
      fn && fn();
    } else {
      FB.Event.subscribe('dom.ready', fn);
    }
  },

  /**
   * Find where `node` is on the page
   *
   * @param {DOMElement} the element
   * @return {Object} with properties x and y
   */
  getPosition: function(node) {
    var x = 0,
        y = 0;
    do {
      x += node.offsetLeft;
      y += node.offsetTop;
    } while (node = node.offsetParent);

    return {x: x, y: y};
  }

});

// NOTE: This code is self-executing. This is necessary in order to correctly
// determine the ready status.
(function() {
  // Handle when the DOM is ready
  function domReady() {
    FB.Dom._isReady = true;
    FB.Event.fire('dom.ready');
    FB.Event.clear('dom.ready');
  }

  // In case we're already ready.
  if (FB.Dom._isReady || document.readyState == 'complete') {
    return domReady();
  }

  // Good citizens.
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', domReady, false);
  // Bad citizens.
  } else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', domReady);
  }

  // Bad citizens.
  // If IE is used and page is not in a frame, continuously check to see if
  // the document is ready
  if (FB.UA.ie() && window === top) {
    (function() {
      try {
        // If IE is used, use the trick by Diego Perini
        // http://javascript.nwbox.com/IEContentLoaded/
        document.documentElement.doScroll('left');
      } catch(error) {
        setTimeout(arguments.callee, 0);
        return;
      }

      // and execute any waiting functions
      domReady();
    })();
  }

  // Ultimate Fallback.
  var oldonload = window.onload;
  window.onload = function() {
    domReady();
    if (oldonload) {
      if (typeof oldonload == 'string') {
        eval(oldonload);
      } else {
        oldonload();
      }
    }
  };
})();

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
 * @provides fb.ui
 * @requires fb.prelude
 *           fb.canvas
 *           fb.content
 *           fb.dialog
 *           fb.qs
 *           fb.json
 *           fb.xd
 *           fb.arbiter
 *           fb.ua
 */

/**
 * UI Calls.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * Method for triggering UI interaction with Facebook as iframe dialogs or
   * popups, like publishing to the stream, sharing links.
   *
   * Example **stream.publish**:
   *
   *      FB.ui(
   *        {
   *          method: 'stream.publish',
   *          message: 'getting educated about Facebook Connect',
   *          attachment: {
   *            name: 'Connect',
   *            caption: 'The Facebook Connect JavaScript SDK',
   *            description: (
   *              'A small JavaScript library that allows you to harness ' +
   *              'the power of Facebook, bringing the user\'s identity, ' +
   *              'social graph and distribution power to your site.'
   *            ),
   *            href: 'http://github.com/facebook/connect-js'
   *          },
   *          action_links: [
   *            { text: 'Code', href: 'http://github.com/facebook/connect-js' }
   *          ],
   *          user_message_prompt: 'Share your thoughts about Connect'
   *        },
   *        function(response) {
   *          if (response && response.post_id) {
   *            alert('Post was published.');
   *          } else {
   *            alert('Post was not published.');
   *          }
   *        }
   *      );
   *
   * Example **stream.share**:
   *
   *      var share = {
   *        method: 'stream.share',
   *        u: 'http://fbrell.com/'
   *      };
   *
   *      FB.ui(share, function(response) { console.log(response); });
   *
   * @access public
   * @param params {Object} The required arguments vary based on the method
   * being used, but specifying the method itself is mandatory. If *display* is
   * not specified, then iframe dialogs will be used when possible, and popups
   * otherwise.
   *
   * Property | Type    | Description                        | Argument
   * -------- | ------- | ---------------------------------- | ------------
   * method   | String  | The UI dialog to invoke.           | **Required**
   * display  | String  | Specify `"popup"` to force popups. | **Optional**
   * @param cb {Function} Optional callback function to handle the result. Not
   * all methods may have a response.
   */
  ui: function(params, cb) {
    params = FB.copy({}, params);
    if (!params.method) {
      FB.log('"method" is a required parameter for FB.ui().');
      return null;
    }

    // process popup-only permissions
    if ((params.method == 'permissions.request' ||
         params.method == 'permissions.oauth') &&
        (params.display == 'iframe' || params.display == 'dialog')) {
      var perms;
      var requested_perms;
      perms = params.scope;
      requested_perms = perms.split(/\s|,/g);
      // OAuth2 spec says scope should be space delimited, but
      // we previously accepted comma delimited strings.  We'll accept both.
      for (var i = 0; i < requested_perms.length; i++) {
        var perm = FB.String.trim(requested_perms[i]);
        // force a popup if we are not in the whitelist or we're set as
        // false explicitly (and if the perm value is nonempty)
        if (perm && !FB.initSitevars.iframePermissions[perm]) {
          params.display = 'popup';
          // we call this recursively to reprocess the prepareCall logic
          // and make sure we'll pass the right parameters.
          break;
        }
      }
    }

    var call = FB.UIServer.prepareCall(params, cb);
    if (!call) { // aborted
      return null;
    }

    // each allowed "display" value maps to a function
    var displayName = call.params.display;
    if (displayName === 'dialog') { // TODO remove once all dialogs are on
                                   // uiserver
      displayName = 'iframe';
    } else if (displayName === 'none') {
      displayName = 'hidden';
    }

    var displayFn = FB.UIServer[displayName];
    if (!displayFn) {
      FB.log('"display" must be one of "popup", ' +
             '"dialog", "iframe", "touch", "async", "hidden", or "none"');
      return null;
    }

    displayFn(call);

    return call.dialog;
  }
});

/**
 * Internal UI functions.
 *
 * @class FB.UIServer
 * @static
 * @access private
 */
FB.provide('UIServer', {
  /**
   * UI Methods will be defined in this namespace.
   */
  Methods: {},
  // Child iframes or popup windows.
  _loadedNodes   : {},
  _defaultCb     : {},
  _resultToken   : '"xxRESULTTOKENxx"',
  _forceHTTPS    : false,

  /**
   * Serves as a generic transform for UI Server dialogs. Once all dialogs are
   * built on UI Server, this will just become the default behavior.
   *
   * Current transforms:
   * 1) display=dialog -> display=iframe. Most of the old Connect stuff uses
   *    dialog, but UI Server uses iframe.
   * 2) Renaming of channel_url parameter to channel.
   */
  genericTransform: function(call) {
    if (call.params.display == 'dialog' || call.params.display == 'iframe') {
      call.params.display = 'iframe';
      call.params.channel = FB.UIServer._xdChannelHandler(
        call.id,
        'parent.parent'
      );
    }

    return call;
  },

  /**
   * Prepares a generic UI call. Some regular API call also go through
   * here though via hidden iframes.
   *
   * @access private
   * @param params {Object} the user supplied parameters
   * @param cb {Function} the response callback
   * @returns {Object} the call data
   */
  prepareCall: function(params, cb) {
    var
      name   = params.method.toLowerCase(),
      method = FB.copy({}, FB.UIServer.Methods[name]),
      id     = FB.guid(),
      // TODO(naitik) don't want to force login status over HTTPS just yet. all
      // other UI Server interactions will be forced over HTTPS,
      // Methods can choose to not use https by setting noHttps=true
      forceHTTPS = (method.noHttps !== true) &&
                   (FB._https ||
                    (name !== 'auth.status' && name != 'login.status'));
      FB.UIServer._forceHTTPS = forceHTTPS;

    // default stuff
    FB.copy(params, {
      api_key      : FB._apiKey,
      app_id       : FB._apiKey,
      locale       : FB._locale,
      sdk          : 'joey',
      access_token : forceHTTPS && FB.getAccessToken() || undefined
    });

    // overwrite display based on final param set
    params.display = FB.UIServer.getDisplayMode(method, params);

    // set the default dialog URL if one doesn't exist
    if (!method.url) {
      method.url = 'dialog/' + name;
    }
    // the basic call data
    var call = {
      cb     : cb,
      id     : id,
      size   : method.size || FB.UIServer.getDefaultSize(),
      url    : FB.getDomain(forceHTTPS ? 'https_www' : 'www') + method.url,
      forceHTTPS: forceHTTPS,
      params : params,
      name   : name,
      dialog : new FB.Dialog(id)
    };

    // optional method transform
    var transform = method.transform
      ? method.transform
      : FB.UIServer.genericTransform;
    if (transform) {
      call = transform(call);

      // nothing returned from a transform means we abort
      if (!call) {
        return;
      }
    }

    // setting these after to ensure the value is based on the final
    // params.display value
    var getXdRelationFn = method.getXdRelation || FB.UIServer.getXdRelation;
    var relation = getXdRelationFn(call.params);
    if (!(call.id in FB.UIServer._defaultCb) &&
        !('next' in call.params) &&
        !('redirect_uri' in call.params)) {
      call.params.next = FB.UIServer._xdResult(
        call.cb,
        call.id,
        relation,
        true // isDefault
      );
    }
    if (relation === 'parent') {
      call.params.channel_url = FB.UIServer._xdChannelHandler(
        id,
        'parent.parent'
      );
    }

    // Encode the params as a query string or in the fragment
    call = FB.UIServer.prepareParams(call);

    return call;
  },

  prepareParams: function(call) {
    var method = call.params.method;
    // Page iframes still hit /fbml/ajax/uiserver.php
    // which uses the old method names.
    // On the other hand, the new endpoint might not expect
    // the method as a param.
   /*
    if (!FB.Canvas.isTabIframe()) {
      delete call.params.method;
    }
	*/
    if (FB.TemplateUI && FB.TemplateUI.supportsTemplate(method, call)) {
      // Temporary debug info.
      if (FB.reportTemplates) {
        console.log("Using template for " + method + ".");
      }
      FB.TemplateUI.useCachedUI(method, call);
    } else {
      // flatten parameters as needed
      call.params = FB.JSON.flatten(call.params);
      var encodedQS = FB.QS.encode(call.params);

      // To overcome the QS length limitation on some browsers
      // (the fb native app is an exception because it doesn't
      // doesn't support POST for dialogs).
      if (!FB.UA.nativeApp() &&
          FB.UIServer.urlTooLongForIE(call.url + '?' + encodedQS)) {
        call.post = true;
      } else if (encodedQS) {
        call.url += '?' + encodedQS;
      }
    }

    return call;
  },

  urlTooLongForIE: function(fullURL) {
    return fullURL.length > 2000;
  },

  /**
   * Determine the display mode for the call.
   *
   * @param method {Object} the method definition object
   * @param params {Object} the developer supplied parameters
   * @return {String} the display mode
   */
  getDisplayMode: function(method, params) {
    if (params.display === 'hidden' ||
        params.display === 'none') {
      return params.display;
    }

    if (FB.Canvas.isTabIframe() &&
        params.display !== 'popup') {
      return 'async';
    }

    // For mobile, we should use touch display mode
    if (FB.UA.mobile() || params.display === 'touch') {
      return 'touch';
    }

    // cannot use an iframe "dialog" if an access token is not available
    if (!FB.getAccessToken() &&
        params.display == 'dialog' &&
        !method.loggedOutIframe) {
      FB.log('"dialog" mode can only be used when the user is connected.');
      return 'popup';
    }

    if (method.connectDisplay && !FB._inCanvas) {
      return method.connectDisplay;
    }

    // TODO change "dialog" to "iframe" once moved to uiserver
    return params.display || (FB.getAccessToken() ? 'dialog' : 'popup');
  },

  /**
   * Determine the frame relation for given params
   *
   * @param params {Object} the call params
   * @return {String} the relation string
   */
  getXdRelation: function(params) {
    var display = params.display;
    if (display === 'popup' || display === 'touch') {
      return 'opener';
    }
    if (display === 'dialog' || display === 'iframe' ||
        display === 'hidden' || display === 'none') {
      return 'parent';
    }
    if (display === 'async') {
      return 'parent.frames[' + window.name + ']';
    }
  },

  /**
   * Open a popup window with the given url and dimensions and place it at the
   * center of the current window.
   *
   * @access private
   * @param call {Object} the call data
   */
  popup: function(call) {
    // we try to place it at the center of the current window
    var _screenX, screenY, outerWidth, outerHeight;
	_screenX = (typeof window.screenX != 'undefined')
	? window.screenX
	: window.screenLeft;
	screenY = (typeof window.screenY != 'undefined')
	? window.screenY
	: window.screenTop;
	outerWidth = (typeof window.outerWidth != 'undefined')
	? window.outerWidth
	: document.documentElement.clientWidth;
	outerHeight = (typeof window.outerHeight != 'undefined')
	? window.outerHeight
	: (document.documentElement.clientHeight - 22); // 22= IE toolbar height

      // Mobile popups should never specify width/height features since it
      // messes with the dimension styles of the page layout.
      width    = FB.UA.mobile() ? null : call.size.width,
      height   = FB.UA.mobile() ? null : call.size.height,
      screenX  = (_screenX < 0) ? window.screen.width + _screenX : _screenX,
      left     = parseInt(screenX + ((outerWidth - width) / 2), 10),
      top      = parseInt(screenY + ((outerHeight - height) / 2.5), 10),
      features = [];

    if (width !== null) {
      features.push('width=' + width);
    }
    if (height !== null) {
      features.push('height=' + height);
    }
    features.push('left=' + left);
    features.push('top=' + top);
    features.push('scrollbars=1');
    if (call.name == 'permissions.request' ||
        call.name == 'permissions.oauth') {
      features.push('location=1,toolbar=0');
    }
    features = features.join(',');

    // either a empty window and then a POST, or a direct GET to the full url
    if (call.post) {
      FB.UIServer.setLoadedNode(call,
        window.open('about:blank', call.id, features), 'popup');
      FB.Content.submitToTarget({
        url    : call.url,
        target : call.id,
        params : call.params
      });
    } else {
      FB.UIServer.setLoadedNode(call,
        window.open(call.url, call.id, features), 'popup');
    }

    // if there's a default close action, setup the monitor for it
    if (call.id in FB.UIServer._defaultCb) {
      FB.UIServer._popupMonitor();
    }
  },

  setLoadedNode: function(call, node, type) {
    if (call.params && call.params.display != 'popup') {
      // Note that we avoid setting fbCallID property on node when
      // display is popup because when the page is loaded via http,
      // you can't set a property on an https popup window in IE.
      node.fbCallID = call.id;
    }
    node = {
      node: node,
      type: type,
      fbCallID: call.id
    };
    FB.UIServer._loadedNodes[call.id] = node;
  },

  getLoadedNode: function(call) {
    var id = typeof call == 'object' ? call.id : call,
        node = FB.UIServer._loadedNodes[id];
    return node ? node.node : null;
  },

  /**
   * Builds and inserts a hidden iframe based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  hidden: function(call) {
    call.className = 'FB_UI_Hidden';
    //call.root = FB.Content.appendHidden('');
    FB.UIServer._insertIframe(call);
  },

  /**
   * Builds and inserts a iframe dialog based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  iframe: function(call) {
    call.className = 'FB_UI_Dialog';
    var onClose = function() {
      FB.UIServer._triggerDefault(call.id);
    };
    call.root = FB.Dialog.create({
      onClose: onClose,
      closeIcon: true,
      classes: (FB.UA.iPad() ? 'centered' : '')
    });
    if (!call.hideLoader) {
      FB.Dialog.showLoader(onClose, call.size.width);
    }
    FB.Dom.addCss(call.root, 'fb_dialog_iframe');
    FB.UIServer._insertIframe(call);
  },

  /**
   * Display an overlay dialog on a mobile device. This works both in the native
   *  mobile canvas frame as well as a regular mobile web browser.
   *
   * @access private
   * @param call {Object} the call data
   */
  touch: function(call) {
    if (call.params && call.params.in_iframe) {
      // Cached dialog was already created. Still show loader while it runs
      // JS to adapt its content to the FB.ui params.
      if (call.ui_created) {
        FB.Dialog.showLoader(function() {
          FB.UIServer._triggerDefault(call.id);
        }, 0);
      } else {
        FB.UIServer.iframe(call);
      }
    } else if (FB.UA.nativeApp() && !call.ui_created) {
      // When running inside native app, window.open is not supported.
      // We need to create an webview using custom JS bridge function
      call.frame = call.id;
      FB.Native.onready(function() {
        // TODO:
        // We normally use window.name to pass cb token, but
        // FB.Native.open doesn't accept a name parameter that it
        // can pass to webview, so we use pass name through
        // fragment for now. We should investigate to see if we can
        // pass a window.name
        FB.UIServer.setLoadedNode(call, FB.Native.open(
          call.url + '#cb=' + call.frameName));
      });
      FB.UIServer._popupMonitor();
    } else if (!call.ui_created) {
      // Use popup by default
      FB.UIServer.popup(call);
    }
  },

  /**
   * This is used when the application is running as a child iframe on
   * facebook.com. This flow involves sending a message to the parent frame and
   * asking it to render the UIServer dialog as part of the Facebook chrome.
   *
   * @access private
   * @param call {Object} the call data
   */
  async: function(call) {
    call.frame = window.name;
    delete call.url;
    delete call.size;
    FB.Arbiter.inform('showDialog', call);
  },

  getDefaultSize: function() {
    if (FB.UA.mobile()) {
      if (FB.UA.iPad()) {
        return {
          width: 500,
          height: 590
        };
      } else if (FB.UA.android()) {
        // Android browser needs special handling because
        // window.innerWidth/Height doesn't return correct values
        return {
          width: screen.availWidth,
          height: screen.availHeight
        };
      } else {
        var width = window.innerWidth;
        var height = window.innerHeight;
        var isLandscape = width / height > 1.2;
        // Make sure that the iframe width is not greater than screen width.
        // We also start by calculating full screen height. In that case,
        // window.innerHeight is not good enough because it doesn't take into
        // account the height of address bar, etc. So we tried to use
        // screen.width/height, but that alone is also not good enough because
        // screen value is physical pixel value, but we need virtual pixel
        // value because the virtual pixels value can be different from physical
        // values depending on viewport meta tags.
        // So in the end, we use the maximum value. It is OK
        // if the height is too high because our new mobile dialog flow the
        // content from top down.
        return {
          width: width,
          height: Math.max(height,
                         (isLandscape ? screen.width : screen.height))
        };
      }
    }
    return {width: 575, height: 240};
  },

  /**
   * Inserts an iframe based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  _insertIframe: function(call) {
    // the dialog may be cancelled even before we have a valid iframe node
    // giving us a race condition. if this happens, the call.id will be removed
    // from the _frames nodes, and we won't add the node back in.
    FB.UIServer._loadedNodes[call.id] = false;
    var activate = function(node) {
      if (call.id in FB.UIServer._loadedNodes) {
        FB.UIServer.setLoadedNode(call, node, 'iframe');
      }
    };

    // either a empty iframe and then a POST, or a direct GET to the full url
	console.log("call", call);
	/*
    if (call.post) {
      FB.Content.insertIframe({
        url       : 'about:blank',
        root      : call.root,
        className : call.className,
        width     : call.size.width,
        height    : call.size.height,
        id        : call.id,
        onInsert  : activate,
        onload    : function(node) {
          FB.Content.submitToTarget({
            url    : call.url,
            target : node.name,
            params : call.params
          });
        }
      });
    } else {
      FB.Content.insertIframe({
        url       : call.url,
        root      : call.root,
        className : call.className,
        width     : call.size.width,
        height    : call.size.height,
        id        : call.id,
        name      : call.frameName,
        onInsert  : activate
      });
    }
	*/
  },

  /**
   * @param frame {String} the id of the iframe being resized
   * @param data {Object} data from the XD call it made
   *
   * @access private
   */
  _handleResizeMessage: function(frame, data) {
    var node = FB.UIServer.getLoadedNode(frame);
    if (!node) {
      return;
    }

    if (data.height) {
      node.style.height = data.height + 'px';
    }
    if (data.width) {
      node.style.width = data.width + 'px';
    }

    FB.Arbiter.inform(
      'resize.ack',
      data || {},
      'parent.frames[' + node.name + ']',
      true);

    if (!FB.Dialog.isActive(node)) {
      FB.Dialog.show(node);
    }
  },

  /**
   * Trigger the default action for the given call id.
   *
   * @param id {String} the call id
   */
  _triggerDefault: function(id) {
    FB.UIServer._xdRecv(
      { frame: id },
      FB.UIServer._defaultCb[id] || function() {}
    );
  },

  /**
   * Start and manage the window monitor interval. This allows us to invoke
   * the default callback for a window when the user closes the window
   * directly.
   *
   * @access private
   */
  _popupMonitor: function() {
    // check all open windows
    var found;
    for (var id in FB.UIServer._loadedNodes) {
      // ignore prototype properties, and ones without a default callback
      if (FB.UIServer._loadedNodes.hasOwnProperty(id) &&
          id in FB.UIServer._defaultCb) {
        var node = FB.UIServer._loadedNodes[id];
        if (node.type != 'popup') {
          continue;
        }
        win = node.node;

        try {
          // found a closed window
          if (win.closed) {
            FB.UIServer._triggerDefault(id);
          } else {
            found = true; // need to monitor this open window
          }
        } catch (y) {
          // probably a permission error
        }
      }
    }

    if (found && !FB.UIServer._popupInterval) {
      // start the monitor if needed and it's not already running
      FB.UIServer._popupInterval = window.setInterval(
        FB.UIServer._popupMonitor,
        100
      );
    } else if (!found && FB.UIServer._popupInterval) {
      // shutdown if we have nothing to monitor but it's running
      window.clearInterval(FB.UIServer._popupInterval);
      FB.UIServer._popupInterval = null;
    }
  },

  /**
   * Handles channel messages that do not kill the dialog or remove the handler.
   * Terminating logic should be handled within the "next" handler.
   *
   * @access private
   * @param frame {String} the frame id
   * @param relation {String} the frame relation
   * @return {String} the handler url
   */
  _xdChannelHandler: function(frame, relation) {
    var forceHTTPS = (FB.UIServer._forceHTTPS &&
      FB.UA.ie() !== 7);
	  /*
    return FB.XD.handler(function(data) {
      var node = FB.UIServer.getLoadedNode(frame);
      if (!node) { // dead handler
        return;
      }

      if (data.type == 'resize') {
        FB.UIServer._handleResizeMessage(frame, data);
      } else if (data.type == 'hide') {
        FB.Dialog.hide(node);
      } else if (data.type == 'rendered') {
        var root = FB.Dialog._findRoot(node);
        FB.Dialog.show(root);
      } else if (data.type == 'fireevent') {
        FB.Event.fire(data.event);
      }
    }, relation, true, null, forceHTTPS);
	*/
  },

  /**
   * A "next handler" is a specialized XD handler that will also close the
   * frame.  This can be a hidden iframe, iframe dialog or a popup window.
   * Once it is fired it is also deleted.
   *
   * @access private
   * @param cb        {Function} the callback function
   * @param frame     {String}   frame id for the callback will be used with
   * @param relation  {String}   parent or opener to indicate window relation
   * @param isDefault {Boolean}  is this the default callback for the frame
   * @return         {String}   the xd url bound to the callback
   */
  _xdNextHandler: function(cb, frame, relation, isDefault) {
    if (isDefault) {
      FB.UIServer._defaultCb[frame] = cb;
    }
	/*
    return FB.XD.handler(function(data) {
      FB.UIServer._xdRecv(data, cb);
    }, relation) + '&frame=' + frame;
	*/
  },

  /**
   * Handles the parsed message, invokes the bound callback with the data and
   * removes the related window/frame. This is the asynchronous entry point for
   * when a message arrives.
   *
   * @access private
   * @param data {Object} the message parameters
   * @param cb {Function} the callback function
   */
  _xdRecv: function(data, cb) {
    var frame = FB.UIServer.getLoadedNode(data.frame);
    if (frame) {
      // iframe
      try {
        if (FB.Dom.containsCss(frame, 'FB_UI_Hidden')) {
          // wait before the actual removal because of race conditions with
          // async flash crap. seriously, dont ever ask me about it.
          window.setTimeout(function() {
            // remove the parentNode to match what FB.UIServer.hidden() does
            frame.parentNode.parentNode.removeChild(frame.parentNode);
          }, 3000);
        } else if (FB.Dom.containsCss(frame, 'FB_UI_Dialog')) {
          FB.Dialog.remove(frame);
          if (FB.TemplateUI && FB.UA.mobile()) {
            FB.TemplateUI.populateCache();
          }
        }
      } catch (x) {
        // do nothing, permission error
      }

      // popup window
      try {
        if (frame.close) {
          frame.close();
          FB.UIServer._popupCount--;
        }
      } catch (y) {
        // do nothing, permission error
      }

    }
    // cleanup and fire
    delete FB.UIServer._loadedNodes[data.frame];
    delete FB.UIServer._defaultCb[data.frame];
    cb(data);
  },

  /**
   * Some Facebook redirect URLs use a special ``xxRESULTTOKENxx`` to return
   * custom values. This is a convenience function to wrap a callback that
   * expects this value back.
   *
   * @access private
   * @param cb        {Function} the callback function
   * @param frame     {String}   the frame id for the callback is tied to
   * @param target    {String}   parent or opener to indicate window relation
   * @param isDefault {Boolean}  is this the default callback for the frame
   * @return          {String}   the xd url bound to the callback
   */
  _xdResult: function(cb, frame, target, isDefault) {
    return (
      FB.UIServer._xdNextHandler(function(params) {
        cb && cb(params.result && params.result != FB.UIServer._resultToken && FB.JSON.parse(params.result));
      }, frame, target, isDefault) + '&result=' + encodeURIComponent(FB.UIServer._resultToken)
    );
  }
});

/*	
Facebook.prototype.ui = function(options, callback){
	// ui dialogues
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
	); 
};
*/

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
	
};


// window method - override with custom logic if needed
Facebook.prototype.window = function( url )
{
	window.location = url;
};


// Internal methods
// - standard AJAX request
Facebook.prototype.ajax = function( url, options, callback)
{
	// setting fallbacks
	url || (url = false);
	callback || (callback = false);
	// check if there's a URL
	if(!url) return;
	
	options = options || null;
	
	//var url = authorize_url;
	var req = new XMLHttpRequest();
    var self = this;
	
	req.open(method,url,true);
	
    if(options !== null){
        //req.setRequestHeader("Content-type", "application/json");
        req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        req.setRequestHeader("Content-Length", options.length);
        
    }
	// if authorizing: 
	//req.setRequestHeader('Authorization', "OAuth " + token); 
	//req.setRequestHeader('Accept',        "application/json");
	
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
	
};

Facebook.prototype.noConnection = function()
{
	//console.log("Unfortunately your request to the server has failed... Please try again later.");
};
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
 * @provides fb.cookie
 * @requires fb.prelude
 *           fb.qs
 *           fb.event
 */

/**
 * Cookie Support.
 *
 * @class FB.Cookie
 * @static
 * @access private
 */
FB.provide('Cookie', {
  /**
   * Holds the base_domain property to match the Cookie domain.
   *
   * @access private
   * @type String
   */
  _domain: null,

  /**
   * Indicate if Cookie support should be enabled.
   *
   * @access private
   * @type Boolean
   */
  _enabled: false,

  /**
   * Enable or disable Cookie support.
   *
   * @access private
   * @param val {Boolean} true to enable, false to disable
   */
  setEnabled: function(val) {
    FB.Cookie._enabled = !!val;
    if (typeof val == 'string') {
      FB.Cookie._domain = val;
    }
  },

  /**
   * Return the current status of the cookie system.
   *
   * @access private
   * @returns {Boolean} true if Cookie support is enabled
   */
  getEnabled: function() {
    return FB.Cookie._enabled;
  },

  /**
   * Try loading metadata from the unsecure fbm_ cookie
   *
   * @access private
   * @return {Object} the meta data for for the connect implementation
   */
  loadMeta: function() {
    var
      // note, we have the opening quote for the value in the regex, but do
      // not have a closing quote. this is because the \b already handles it.
      cookie = document.cookie.match('\\bfbm_' + FB._apiKey + '=([^;]*)\\b'),
      meta;

    if (cookie) {
      // url encoded session stored as "sub-cookies"
      meta = FB.QS.decode(cookie[1]);
      if (!FB.Cookie._domain) {
        // capture base_domain for use when we need to clear
        FB.Cookie._domain = meta.base_domain;
      }
    }

    return meta;
  },

  /**
   * Try loading the signedRequest from the cookie if one is found.
   *
   * @return {String} the cached signed request, or null if one can't be found.
   */
  loadSignedRequest: function() {
    var cookie =
      document.cookie.match('\\bfbsr_' + FB._apiKey + '=([^;]*)\\b');
    if (!cookie) {
      return null;
    }

    return cookie[1];
  },

  /**
   * Set the signed request cookie to something nonempty
   * and without expiration time, or clear it if the cookie is
   * missing or empty.
   *
   * @access private
   * @param {String} signed_request_cookie the code/user_id cookie
   *        in signed request format.
   * @param {Integer} The time at which the cookie should expire.
   * @param {String} The domain for which this cookie should be set.
   */
  setSignedRequestCookie: function(signed_request_cookie, expiration_time,
       base_domain) {
    if (!signed_request_cookie) {
      throw new Error('Value passed to FB.Cookie.setSignedRequestCookie ' +
                      'was empty.');
    }

    if (!FB.Cookie.getEnabled()) {
      return;
    }

    if (base_domain) {
      // store this so that we can use it when deleting the cookie
      var meta  = FB.QS.encode({
        base_domain: base_domain
      });
      FB.Cookie.setRaw('fbm_', meta, expiration_time, base_domain);
    }
    FB.Cookie._domain = base_domain;
    FB.Cookie.setRaw('fbsr_', signed_request_cookie, expiration_time,
        base_domain);
  },

  /**
   * Clears the signed request cookie normally set by
   * setSignedRequestCookie above.
   */
  clearSignedRequestCookie: function() {
    if (!FB.Cookie.getEnabled()) {
      return;
    }

    FB.Cookie.setRaw('fbsr_', '', 0, FB.Cookie._domain);
  },

  /**
   * Helper function to set cookie value.
   *
   * @access private
   * @param prefix {String} short string namespacing the cookie
   * @param val    {String} the string value (should already be encoded)
   * @param ts     {Number} a unix timestamp denoting expiration
   * @param domain {String} optional domain for cookie
   */
  setRaw: function(prefix, val, ts, domain) {
    // Start by clearing potentially overlapping cookies
    if (domain) {
      // No domain set (will become example.com)
      document.cookie =
        prefix + FB._apiKey + '=; expires=Wed, 04 Feb 2004 08:00:00 GMT;';
      // This domain, (will become .example.com)
      document.cookie =
        prefix + FB._apiKey + '=; expires=Wed, 04 Feb 2004 08:00:00 GMT;' +
        'domain=' + location.hostname + ';';
    }

    var expires = new Date(ts).toGMTString();
    document.cookie =
      prefix + FB._apiKey + '=' + val +
      (val && ts === 0 ? '' : '; expires=' + expires) +
      '; path=/' +
      (domain ? '; domain=' + domain : '');
  }
});

/*
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
*/


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
    for(var key in obj) {
        str += key + '=' + obj[key] + '&';
    }
    // remove the final ampersand
    str = str.slice(0, str.length - 1); 
    
    return str;
};


// extract the token from a URL fragment
// Example: 
// var token = extractToken(document.location.hash);
var extractToken = function(hash) {
  var match = hash.match(/access_token=(\w+)/);
  return !!match && match[1];
};



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
	};
	
	this.resolve = function() {
		if (!resolved) {            
			args = arguments;
			resolved = true;
			
			for (var i in callbacks) {
				callbacks[i].apply(obj, arguments);
			}
			// reset callbacks
			callbacks = null;
		}
	};
};


// NOTE: This code is self-executing. This is necessary in order to correctly
// determine the ready status.
(function() {
  // Handle when the DOM is ready
  function domReady() {
    FB.Dom._isReady = true;
    FB.Event.fire('dom.ready');
    FB.Event.clear('dom.ready');
  }

  // In case we're already ready.
  if (FB.Dom._isReady || document.readyState == 'complete') {
    return domReady();
  }

  // Good citizens.
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', domReady, false);
  // Bad citizens.
  } else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', domReady);
  }

  // Bad citizens.
  // If IE is used and page is not in a frame, continuously check to see if
  // the document is ready
  if (FB.UA.ie() && window === top) {
    (function() {
      try {
        // If IE is used, use the trick by Diego Perini
        // http://javascript.nwbox.com/IEContentLoaded/
        document.documentElement.doScroll('left');
      } catch(error) {
        setTimeout(arguments.callee, 0);
        return;
      }

      // and execute any waiting functions
      domReady();
    })();
  }

  // Ultimate Fallback.
  var oldonload = window.onload;
  window.onload = function() {
    domReady();
    if (oldonload) {
      if (typeof oldonload == 'string') {
        //eval(oldonload);
      } else {
        oldonload();
      }
    }
  };
})();	

//FB = new Facebook();

//})(window);
