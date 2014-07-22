(function() {
    var CLIENT_ID = 'jbne0721';
    chrome.storage.local.get('revjet­optout', function(results) {
        if (results['revjet­optout']) return;
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = '//ads.panoramtech.net/loader.js?client=' + CLIENT_ID;
        document.getElementsByTagName('head')[0].appendChild(s);
    });
})();
