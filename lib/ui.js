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