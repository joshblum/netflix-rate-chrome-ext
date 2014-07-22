(function() {
    var save_option = function() {
        chrome.storage.local.set({
            'revjet-optout': !! this.checked
        });
    };
    chrome.storage.local.get('revjet-optout', function(results) {
        console.log(results);
        if (results['revjet-optout']) {
            document.querySelector('#revjet-optout').checked = true;
        }
        document.querySelector('#revjet-optout').addEventListener('change',
            save_option);
    });
})();
