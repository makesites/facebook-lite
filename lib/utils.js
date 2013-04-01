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

