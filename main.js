(function() {
  var flickrPlugin = {};

  flickrPlugin.utils = {
    runHook: function(hook) {
      var args = Array.prototype.slice.apply(arguments, 1);

    }
  };

  // ---------------------------------------------------------------------------

  var FlickrPlugin = flickrPlugin.FlickrPlugin = function(
    domElement, apiKey
  ) {
    this.currentPage = 0;
    this.totalPages = 0;
  };

  FlickrPlugin.prototype.setPage = function(pageNumber) {

  };

  FlickrPlugin.prototype.populate = function() {

  };

  // ---------------------------------------------------------------------------

  var FlickrPluginPager = flickrPlugin.FlickrPluginPager = function(
    domElement, flickrPlugin
  ) {

  };

  FlickrPluginPager.setPage = function(pageNumber) {

  };

  FlickrPluginPager.setTotalPages = function(pageNumber) {

  };

}());
