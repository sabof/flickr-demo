(function() {
  var utils = {
    runHook: function(hookName) {
      var args = Array.prototype.slice.call(arguments, 1);
      var hooks = this.hooks[hookName] || [];
      hooks.forEach(function(hook) {
        hook[0].apply(hook[1], args);
      });
    },

    addHook: function(hookName, handler, object) {
      var hook = this.hooks[hookName] = this.hooks[hookName] || [];
      hook.push([handler, object]);
    },

    extendWithHooks: function(object) {
      object.hooks = {};
      object.addHook = this.addHook;
      object.runHook = this.runHook;
    },

    removeAllChildren: function(domElement) {
      while (domElement.firstChild) {
        domElement.removeChild(domElement.firstChild);
      }
    },

    preloadImages: function(images, callback) {
      var counter = images.length;
      function onComplete() {
        if ( ! --counter ) {
          callback();
        }
      }

      images.forEach(function(url) {
        var imgObj = new Image();
        imgObj.onload = onComplete;
        imgObj.onerror = onComplete;
        imgObj.src = url;
      });
    }

  };

  // ---------------------------------------------------------------------------

  var FlickrImageModel = function(
    data
  ) {
    this.data = data;
  };

  FlickrImageModel.prototype.getTitle = function() {
    return this.data.title;
  };

  FlickrImageModel.prototype.getId = function() {
    return this.data.id;
  };

  FlickrImageModel.prototype.getImage = function(pageNumber) {
    var d = this.data;
    return "http://farm" + d.farm + ".staticflickr.com/" +
      d.server + "/" +
      d.id + "_" +
      d.secret + "_z.jpg";
  };

  FlickrImageModel.prototype.getThumbnail = function(pageNumber) {
    var d = this.data;
    return "http://farm" + d.farm + ".staticflickr.com/" +
      d.server + "/" +
      d.id + "_" +
      d.secret + "_q.jpg";
  };

  // ---------------------------------------------------------------------------

  var FlickrPluginModel = function(apiKey) {
    utils.extendWithHooks(this);
    this.currentPage = 1;
    this.totalPages = 0;
    this.itemsPerPage = 15;
    this.images = [];
    this.lastSeachString = null;
    this.apiKey = apiKey;
    this.currentImage = null;
  };

  FlickrPluginModel.prototype.nextImage = function() {
    var index = this.images.indexOf(this.currentImage);
    if (this.images[index + 1]) {
      this.currentImage = this.images[index + 1];
      this.runHook('currentImageChanged', this.currentImage);
    } else {
      this.gotoNextPage();
    }
  };

  FlickrPluginModel.prototype.previousImage = function(imageId) {
    var index = this.images.indexOf(this.currentImage);
    if (this.images[index - 1]) {
      this.currentImage = this.images[index - 1];
      this.runHook('currentImageChanged', this.currentImage);
    } else {
      this.gotoPreviousPage(true);
    }
  };

  FlickrPluginModel.prototype.getImage = function(imageId) {
    var result,
        found = this.images.some(function(image) {
          if (image.getId() == imageId) {
            result = image;
            return image;
          }
        });
    if (found) {
      return result;
    }
  };

  FlickrPluginModel.prototype.setCurrentImage = function(imageId) {
    var image = this.getImage(imageId);
    if ( ! image) {
      return;
    }
    this.currentImage = image;
    this.runHook('currentImageChanged', image);
  };

  FlickrPluginModel.prototype.getCurrentImage = function(imageId) {
    return this.currentImage;
  };

  FlickrPluginModel.prototype.getCurrentPage = function() {
    return this.currentPage;
  };

  FlickrPluginModel.prototype.getTotalPages = function() {
    return this.totalPages;
  };

  FlickrPluginModel.prototype.gotoPreviousPage = function(_gotoLastImage) {
    var newPage = this.currentPage - 1;
    if (newPage > 0) {
      this.gotoPage(newPage, _gotoLastImage);
    }
  };

  FlickrPluginModel.prototype.gotoNextPage = function(_gotoLastImage) {
    var newPage = this.currentPage + 1;
    if (newPage <= this.totalPages) {
      this.gotoPage(newPage);
    }
  };

  FlickrPluginModel.prototype.gotoLastPage = function(pageNumber) {
    this.gotoPage(this.totalPages);
  };

  FlickrPluginModel.prototype.gotoFirstPage = function(pageNumber) {
    this.gotoPage(1);
  };

  FlickrPluginModel.prototype.gotoPage = function(pageNumber, _gotoLastImage) {
    this.currentPage = pageNumber;
    if (this.lastSeachString) {
      this.search(null, _gotoLastImage);
    }
    this.runHook('currentPageChanged', this.currentPage);
  };

  FlickrPluginModel.prototype.getImages = function() {
    return this.images;
  };

  FlickrPluginModel.prototype._populate = function(data, _gotoLastImage) {
    this.images = data.photo.map(function(imageData) {
      return new FlickrImageModel(
        imageData
      );
    });
    var imageIndex = _gotoLastImage ? this.images.length - 1 : 0;

    this.totalPages = data.pages;
    this.setCurrentImage(this.images[imageIndex].getId());
    this.runHook('currentPageChanged', this.currentPage);
  };

  FlickrPluginModel.prototype.search = function(searchString, _gotoLastImage) {
    searchString = searchString || this.lastSeachString;
    if (searchString !== this.lastSeachString) {
      this.currentPage = 1;
    }

    // FIXME: Add currentPage
    var self = this;
    var url = [
      'http://api.flickr.com/services/rest/?format=json',
      'method=flickr.photos.search',
      'tags=' + encodeURIComponent(searchString),
      'tag_mode=all',
      'per_page=' + this.itemsPerPage,
      'api_key=' + this.apiKey,
      'page=' + this.currentPage
    ].join('&');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function() {
      var json = JSON.parse(
        xhr.responseText
          .replace(/^[^\(]+\(/, '')
          .replace(/\)[^\)]*$/, '')
      );
      self._populate(json.photos, _gotoLastImage);
    };

    xhr.send();
    this.lastSeachString = searchString;
  };

  // ---------------------------------------------------------------------------

  var FlickrPluginPagerView = function(
    domElement, model
  ) {
    this.model = model;
    model.addHook('totalPagesChanged', this._render, this);
    model.addHook('currentPageChanged', this._render, this);
    this.domRoot = domElement;
    this.radius = 5;
  };

  FlickrPluginPagerView.prototype._render = function() {
    var root = this.domRoot;
    utils.removeAllChildren(root);
    var totalPages = this.model.getTotalPages();
    var currentPage = this.model.getCurrentPage();

    var firstPage = Math.max(1, currentPage - this.radius);
    var lastPage = Math.min(totalPages, currentPage + this.radius);

    if (currentPage !== 1) {
      var start = document.createElement('a');
      start.href = '#';
      start.appendChild(
        document.createTextNode('<<')
      );
      start.classList.add('start');
      start.onclick = function() {
        self.model.gotoFirstPage();
        return false;
      };
      root.appendChild(start);

      var previous = document.createElement('a');
      previous.href = '#';
      previous.appendChild(
        document.createTextNode('<')
      );
      previous.classList.add('previous');
      previous.onclick = function() {
        self.model.gotoPreviousPage();
        return false;
      };
      root.appendChild(previous);
    }

    for (var i = firstPage; i <= lastPage; i++) {
      var number = document.createElement('a');
      var self = this;
      number.href = '#';
      number.appendChild(
        document.createTextNode(i)
      );
      if (i == currentPage) {
        number.classList.add('current');
      }

      (function(pageNumber) {
        number.onclick = function() {
          self.model.gotoPage(pageNumber);
          return false;
        };
      } (i));

      root.appendChild(number);
    }

    if (currentPage !== totalPages) {
      var next = document.createElement('a');
      next.href = '#';
      next.appendChild(
        document.createTextNode('>')
      );
      next.classList.add('next');
      next.onclick = function() {
        self.model.gotoNextPage();
        return false;
      };
      root.appendChild(next);

      var end = document.createElement('a');
      end.href = '#';
      end.appendChild(
        document.createTextNode('>>')
      );
      end.classList.add('end');
      end.onclick = function() {
        self.model.gotoLastPage();
        return false;
      };
      root.appendChild(end);
    }
  };

  // ---------------------------------------------------------------------------

  var FlickrPluginGridView = function(
    domElement, model
  ) {
    this.model = model;
    model.addHook('currentPageChanged', this._scheduleRender, this);
    model.addHook('currentImageChanged', this._changeCurrent, this);
    this.domRoot = domElement;
    this.model = model;
  };

  FlickrPluginGridView.prototype._changeCurrent = function(image) {
    var id = image.getId();
    Array.prototype.forEach.call(
      this.domRoot.querySelectorAll('.current'),
      function(domElement) {
        domElement.classList.remove('current');
      }
    );

    var elem = this.domRoot.querySelector('[data-id="' + id + '"]');
    if (elem) {
      elem.parentElement.classList.add('current');
    }
  };

  FlickrPluginGridView.prototype._scheduleRender = function() {
    utils.preloadImages(
      this.model.getImages().map(function(obj) {
        return obj.getThumbnail();
      }),
      this._render.bind(this)
    );
  };

  FlickrPluginGridView.prototype._render = function() {
    var images = this.model.getImages();
    var root = this.domRoot;
    utils.removeAllChildren(root);
    var self = this;

    images.forEach(function(imageObject) {
      var imageContainer = document.createElement('div');
      if (imageObject === self.model.getCurrentImage()) {
        imageContainer.classList.add('current');
      }
      var imageLink = document.createElement('a');
      var id = imageObject.getId();

      imageLink.href = '#';
      imageLink.setAttribute('data-id', id);

      (function(id) {
        imageLink.onclick = function() {
          self.model.setCurrentImage(id);
          return false;
        };
      }(id));

      imageContainer.appendChild(imageLink);

      var image = document.createElement('img');
      imageLink.appendChild(image);
      image.src = imageObject.getThumbnail();

      root.appendChild(imageContainer);

      root.appendChild(
        document.createTextNode(' ')
      );
    });
  };

  // ---------------------------------------------------------------------------

  var FlickrImageView = function(
    domElement, model
  ) {
    this.model = model;
    model.addHook('currentImageChanged', this._scheduleRender, this);
    this.domRoot = domElement;
    this.model = model;
  };

  FlickrImageView.prototype._scheduleRender = function() {
    var self = this;
    utils.preloadImages([
      this.model.getCurrentImage().getImage()
    ], function() {
      self._render();
    });
  };

 FlickrImageView.prototype._render = function() {
   var root = this.domRoot;
   utils.removeAllChildren(root);

   var image = document.createElement('img');
   root.appendChild(image);
   image.src = this.model
     .getCurrentImage()
     .getImage();

 };

  window.flickrPlugin = {
    FlickrPluginModel: FlickrPluginModel,
    FlickrPluginPagerView: FlickrPluginPagerView,
    FlickrPluginGridView: FlickrPluginGridView,
    FlickrImageView: FlickrImageView
  };

}());

// FIXED: Remove non-functional pager arrows
// FIXED: Main image arrows
// FIXED: Share button image
// FIXED: Search button
// FIXED: Main image title
