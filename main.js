(function() {
  var flickrPlugin = {};

  flickrPlugin.utils = {
    runHook: function(hookName) {
      var args = Array.prototype.slice.apply(arguments, 1);
      var hooks = this.hooks[hookName] || [];
      hooks.forEach(function(hook) {
        hook[1].apply(hook[0], args);
      });
    },

    addHook: function(hookName, object, handler) {
      var hook = this.hooks[hookName] = this.hooks[hookName] || [];
      hook.push([object, handler]);
    },

    extendWithHooks: function(object) {
      object.hooks = {};
      object.addHook = this.addHook;
      object.runHook = this.runHook;
    }
  };

  // ---------------------------------------------------------------------------

  var FlickrPlugin = flickrPlugin.FlickrPlugin = function(
    domElement, apiKey
  ) {
    flickrPlugin.utils.extendWithHooks(this);
    this.currentPage = 0;
    this.totalPages = 0;
  };

  FlickrPlugin.prototype.setCurrentPage = function(pageNumber) {

  };

  FlickrPlugin.prototype.populate = function(data) {

  };

  // ---------------------------------------------------------------------------

  var FlickrPluginPager = flickrPlugin.FlickrPluginPager = function(
    // FIXME?: Change to "pageable"
    domElement, flickrPlugin
  ) {
    flickrPlugin.addHook('totalPagesChanged', this, this.setTotalPages);
    flickrPlugin.addHook('currentPageChanged', this, this.setTotalPages);

  };

  FlickrPluginPager.setCurrentPage = function(pageNumber) {

  };

  FlickrPluginPager.setTotalPages = function(pageNumber) {

  };

}());
