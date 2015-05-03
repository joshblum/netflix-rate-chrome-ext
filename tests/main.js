/* global chrome */

require.config({
  baseUrl: 'spec/', 
  paths: {
      'jasmine': ['../../tests/lib/jasmine-2.3.0/jasmine'],
      'jasmine-html': ['../../tests/lib/jasmine-2.3.0/jasmine-html'],
      'jasmine-boot': ['../../tests/lib/jasmine-2.3.0/boot'],
      'ratings': ['../../js/ratings'],
      'jquery': ['../../libs/jquery-2.0.3.min']
  },
  shim: {
    'jasmine-html': {
      deps : ['jasmine']
    },
    'jasmine-boot': {
      deps : ['jasmine', 'jasmine-html']
    },
    'ratings': {
      deps : ['jquery']
    }
  }
});

require(['jasmine-boot'], function () {
  chrome = new Object();
  chrome.extension = new Object();
  chrome.extension.getURL = function () {return "../css/ratings.css";};
  
  require(['ratingsSpec'], function(){
    //trigger Jasmine
    window.onload();
  });
});