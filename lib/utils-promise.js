
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
