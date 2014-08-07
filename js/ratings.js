// s (NEW!)  string (optional)   title of a movie to search for
// if (!cached.inCache) return; // we need the type!
// i     string (optional)   a valid IMDb movie id
// t     string (optional)   title of a movie to return
// y     year (optional)     year of the movie
// r     JSON, XML   response data type (JSON default)
// plot  short, full     short or extended plot (short default)
// callback  name (optional)     JSONP callback name
// tomatoes  true (optional)     adds rotten tomatoes data
var TMDB_API_KEY = "04a87a053afac639272eefbb94a173e4";
var IMDB_API = "http://www.omdbapi.com/?tomatoes=true";
var TMDB_API = "http://api.themoviedb.org/3";
var TOMATO_LINK = "http://www.rottentomatoes.com/alias?type=imdbid&s=";
var IMDB_LINK = "http://www.imdb.com/title/";
var B3_LINK = "http://netflix.burtonthird.com/count";

//popup movie selectors
var HOVER_SEL = {
    '.bobbable .popLink': getWIMainTitle, //wi main display movies
    '.mdpLink': getSideOrDVDTitle,
};

/////////// PREFETCHING /////////////
var PREFETCH_CHUNK_SIZE = 5;
var PREFETCH_INTERVAL = 2500;
var PREFETCH_SEL = {
    '.boxShotImg': getImgTitle,
};

var CACHE = localStorage;
var CACHE_LIFE = 1000 * 60 * 60 * 24 * 7 * 2; //two weeks in milliseconds
var UUID_KEY = "uuid";
var DATE_KEY = "created_at";

/////////// HELPERS /////////////

/*
 * Generically parse and response from an API
 * tries to parse json and returns the defalt on an exception
 */
function parseAPIResponse(res, default_res) {
    try {
        return JSON.parse(res);
    } catch (e) {
        return default_res;
    }
}
/*
    Builds a select object where the selector is used to insert the ratings via the given insertFunc. Interval specifies the interval necessary for the popupDelay. imdb and rt classes are extra classes that can be added to a rating.
*/
function makeSelectObject(selector, insertFunc, interval, klassDict) {
    klassDict = klassDict || {};

    return merge({
        'selector': selector,
        'insertFunc': insertFunc,
        'interval': interval,
    }, klassDict);
}

/*
    Add the style sheet to the main netflix page.
*/
function addStyle() {
    if (!$('#rating-overlay').length) {
        var url = chrome.extension.getURL('../css/ratings.css');
        $("head").append("<link id='rating-overlay' href='" + url + "' type='text/css' rel='stylesheet' />");
    }
}

function getRatingArgs() {
    return getArgs('rating');
}

function getTrailerArgs() {
    return getArgs('trailer');
}

/*
 * Get the arguments for showPopup based on which popup is being overridden
 * type: [rating|trailer]
 */
function getArgs(type) {
    var url = document.location.href;
    var key = 'dvd.netflix.com';
    var args;
    if (url.indexOf(key) != -1) { // we are in dvds
        args = POPUP_INS_SEL[type][key];
        args.key = key;
        if (type == 'trailer') {
            args = getTrailerDvdArgs(args, url);
        }
    } else {
        key = 'movies.netflix.com';
        args = POPUP_INS_SEL[type][key];
        args.key = key;
    }
    return args;
}

/*
 * Determine the page type to get the correct trailer select object
 */
function getTrailerDvdArgs(args, url) {
    var key = 'Movie';
    if (url.indexOf(key) === -1) {
        key = 'Search';
    }
    args = args[key];
    args.key = key;
    return args;
}

/*
    Add rating to the cache
*/
function addCache(title, imdb, tomatoMeter, tomatoUserMeter, imdbID, year, type) {
    imdb = imdb || null;
    tomatoMeter = tomatoMeter || null;
    tomatoUserMeter = tomatoUserMeter || null;
    imdbID = imdbID || null;
    year = year || null;
    type = type || null;

    var date = new Date().getTime();
    var rating = {
        'title': title,
        'imdb': imdb,
        'tomatoMeter': tomatoMeter,
        'tomatoUserMeter': tomatoUserMeter,
        'imdbID': imdbID,
        'year': year,
        'date': date,
        'type': type,
    };

    CACHE[title] = JSON.stringify(rating);
    return rating;
}

/*
 * Add a trailer to cache
 */
function addTrailerCache(title, trailer_id) {
    trailer_id = trailer_id || null;
    var cachedVal = JSON.parse(CACHE[title]);

    if (cachedVal === undefined) {
        cachedVal = {
            'title': title,
            'trailer_id': trailer_id,
        };
    } else {
        cachedVal.trailer_id = trailer_id;
    }

    CACHE.date = new Date().getTime();
    CACHE[title] = JSON.stringify(cachedVal);
    return cachedVal;
}


function checkCache(title) {
    if (!(title in CACHE)) {
        return {
            'inCache': false,
            'cachedVal': null,
            'hasTrailer': false,
        };
    }

    var cachedVal = JSON.parse(CACHE[title]);
    var inCache = false;
    if (cachedVal !== undefined && cachedVal.tomatoMeter !== undefined && cachedVal.year !== null) {
        inCache = isValidCacheEntry(cachedVal.date);
    }
    return {
        'inCache': inCache,
        'cachedVal': cachedVal,
        'hasTrailer': cachedVal.trailer !== undefined,
    };
}

/*
 * returns whether a date exceeds the CACHE_LIFE
 */
function isValidCacheEntry(date) {
    var now = new Date().getTime();
    var lifetime = now - date;
    return lifetime <= CACHE_LIFE;
}

/*
    Helper to generalize the parser for side titles and DVD titles
*/
function getWrappedTitle(e, key, regex) {
    var title = $(e.target).attr('alt');
    if (title === undefined) {
        var url = $(e.target).context.href;
        if (typeof url === "undefined") {
            return "";
        }
        url = url.split('/');
        title = url[url.indexOf(key) + 1];
        title = title.replace(regex, ' ');
    }
    return title;
}

/*
    Clear old ratings and unused content. Differs for different popups
*/
function clearOld(type, args) {
    var $target = $('#BobMovie');
    if (args.key in POPUP_INS_SEL[type]['movies.netflix.com']) {
        $target.find('p.label').contents().remove();
    }
    if (type === 'rating') {
        $target.find('.rating-link').remove();
        $target.find('.ratingPredictor').remove();
    } else if (type === 'trailer') {
        $target.find('.trailer-label').remove();
    }
}

function getTomatoClass(score) {
    return score < 59 ? 'rotten' : 'fresh';
}


///////////////// URL BUILDERS ////////////////

/*
    Builds and returns the imdbAPI url
*/
function getIMDBAPI(title, year) {
    var url = IMDB_API + '&t=' + title;
    if (year !== null) {
        url += '&y=' + year;
    }
    return url;
}

/*
    Build the url for the imdbLink
*/
function getIMDBLink(title) {
    return IMDB_LINK + title;
}

/*
    Build the url for the rtLink
*/
function getTomatoLink(imdbID) {
    imdbID = imdbID.slice(2); //convert tt123456 -> 123456
    return TOMATO_LINK + imdbID;
}

/*
 * Build the url for the user counting
 */
function getB3Link() {
    return B3_LINK;
}

/*
 * TMDB API urls
 */

/*
 * type: [movie|tv]
 * query: title string
 */
function getTMDBSearch(type, query, year) {
    var url = TMDB_API + "/search/" + type;
    url = appendTMDBAPIKey(url);
    url += "&query=" + query;
    if (year !== null) {
        url += '&year=' + year;
    }
    return url;
}

function getTMDBItemUrl(type, item_id) {
    if (type === 'movie') {
        return getTMDBMovie(item_id);
    }
    return getTMDBTV(item_id);
}

/*
 * item_id: movie id
 */
function getTMDBMovie(item_id) {
    var url = TMDB_API + "/movie/" + item_id;
    url = appendTMDBAPIKey(url);
    url += "&append_to_response=trailers";
    return url;
}

/*
 * item_id: movie id
 */
function getTMDBTV(item_id) {
    var url = TMDB_API + "/movie/" + item_id + "/videos";
    url = appendTMDBAPIKey(url);
    url += "&append_to_response=trailers";
    return url;
}

function appendTMDBAPIKey(url) {
    return url + "?api_key=" + TMDB_API_KEY;
}

function getYouTubeTrailerLink(trailer_id) {
    return "https://www.youtube.com/watch?v=" + trailer_id;
}


///////////////// USER COUNT ////////////////
function generateUUID() {
    return 'xxxxxxxx-xxxx-3xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function hasUUID() {
    return UUID_KEY in CACHE && DATE_KEY in CACHE;
}

/*
 * Checks if the uuid is older than CACHE_LIFE
 */
function uuidIsExpired() {
    var date = CACHE[DATE_KEY];
    if (date === undefined) {
        return true;
    }
    date = Date.parse(date); // convert to ms
    return !isValidCacheEntry(date);
}

function setUUID() {
    if (!(UUID_KEY in CACHE)) {
        CACHE[UUID_KEY] = generateUUID();
    }
    setUUIDDate();
}

function setUUIDDate() {
    CACHE[DATE_KEY] = new Date(); // just a string, must be parsed for cmp
}

function getUUID() {
    if (!hasUUID()) {
        setUUID();
    } else if (uuidIsExpired()) {
        setUUIDDate();
    }
    return CACHE[UUID_KEY];
}

function clearUUIDCache() {
    delete CACHE[UUID_KEY];
    delete CACHE[DATE_KEY];
}

function getSrc() {
    return "chrome";
}

function countUser() {
    if (hasUUID() && !uuidIsExpired()) {
        return;
    }
    $.post(getB3Link(), {
        'uuid': getUUID(),
        'src': getSrc(),
    }, function(res) {
        if (!res.success) {
            clearUUIDCache();
        }
    }).fail(function(res) {
        clearUUIDCache();
    });
}

///////////////// TITLE PARSERS ////////////////
/*
    parses form: http://movies.netflix.com/WiPlayer?movieid=70171942&trkid=7103274&t=Archer
*/
function getWIMainTitle(e) {
    return $(e.target).siblings('img').attr('alt');
}

/*
    Cleanup recently watched title
*/
function getRecentTitle(title) {
    var index = title.indexOf('%3A');
    if (index !== -1) {
        title = title.slice(0, index);
    }
    return title;
}

/*
    Instant Queue and dvd popups use the same selector but different parsers
*/
function getSideOrDVDTitle(e) {
    var url = document.location.href;
    if (url.indexOf('Search') != -1) { //no popups on search page.
        return $(e.target).text(); // but still cache the title
    }

    var key = 'dvd.netflix.com';
    if (url.indexOf(key) != -1) { // we are in dvds now
        return getDVDTitle(e);
    }
    return getSideTitle(e);
}

function getSideTitle(e) {
    var key = "WiMovie";
    var regex = /_/g;
    return getWrappedTitle(e, key, regex);
}

function getDVDTitle(e) {
    var key = "Movie";
    var regex = /-/g;
    return getWrappedTitle(e, key, regex);
}

/*
 * Parse a title given an element, not event
 */
function getImgTitle(el) {
    return el.alt;
}

function parseYear($target) {
    $target = $target || $('.year');
    var year = null;
    if ($target.length) {
        year = $target.text().split('-')[0];
    }
    return year;
}

/*
    Parse the search title for a given search result
*/
function parseSearchTitle($target) {
    return $target.find('.title').children().text();
}

function parseMovieTitle($target) {
    return $target.find('.title').text();
}


/////////// RATING HANDLERS ////////////

/*
 * Find all of the elements with the given selector and try to
 * prefetch the title information. This should reduce lag once we cache everything.
 */
function prefetchHandler(selector, parser) {
    var start = 0;
    var end = PREFETCH_CHUNK_SIZE;
    var delay = PREFETCH_INTERVAL;
    var $targets = $(selector);
    var $slice;
    while (end < $targets.size()) {
        $slice = $targets.slice(start, end);
        setTimeout(function() {
            prefetchChunkProcessor($slice, parser);
        }, delay);
        start = end;
        end += PREFETCH_CHUNK_SIZE;
        end = Math.min(end, $targets.size());
        delay += PREFETCH_INTERVAL;
    }
}

function prefetchChunkProcessor($slice, parser) {
    $.each($slice, function(index, element) {
        var title = parser(element);
        getRating(title, null, null, function() {
            //wait until we fill the cache
            getTrailer(title, null, null, null);
        });
    });
}

function popupHandler(e) {
    var title = e.data(e); //title parse funtion
    if ($('.label').contents() !== '') { //the popup isn't already up
        //null year, null addArgs
        getRating(title, null, null, function(rating) {
            showPopupRating(rating, getRatingArgs());
        });

        getTrailer(title, null, null, function(trailer) {
            showPopupTrailer(trailer, getTrailerArgs());
        });
    }
}

/*
    Search for the title, first in the CACHE and then through the API
*/
function getTrailer(title, year, addArgs, callback) {
    var cached = checkCache(title);
    if (cached.hasTrailer) {
        if (callback) {
            callback(cached.cachedVal, addArgs);
        }
        return;
    }
    if (cached.cachedVal === null || title === '') return; // we need the type!
    if (!('type' in cached.cachedVal)) {
        delete CACHE[title]; // update structure
        return;
    }
    var type = getTMDBSearchType(cached.cachedVal.type);

    // ok first find the stupid id.
    $.get(getTMDBSearch(type, title, year), function(res) {
        if (res.results.length === 0) {
            addTrailerCache(title);
            return null;
        }
        var item_id = res.results[0].id; //just grab the first. meh.
        // now we can finally get the trailer
        $.get(getTMDBItemUrl(type, item_id), function(res) {
            var trailer_link = cleanYouTubeId(extractTrailerId(type, res));
            var trailer = addTrailerCache(title, trailer_link);
            if (callback) {
                callback(trailer, addArgs);
            }
        });
    });
}

/*
 * Convert the type given by OMDB_API
 * to what TMDB_API expects
 */
function getTMDBSearchType(type) {
    if (type === "movie") return "movie";
    return "tv";
}


/*
 * Extracts a youtube trailer id or returns null
 */
function extractTrailerId(type, res) {
    if (type === 'movie') {
        var youtube = res.trailers.youtube;
        if (youtube.length === 0) return null;
        return youtube[0].source;
    } else {
        for (var result in res.results) {
            if (result.site === "YouTube") {
                return result.key;
            }
        }
        return null;
    }
}
/*
    Search for the title, first in the CACHE and then through the API
*/
function getRating(title, year, addArgs, callback) {
    var cached = checkCache(title);
    if (cached.inCache) {
        if (callback) {
            callback(cached.cachedVal, addArgs);
        }
        return;
    }
    $.get(getIMDBAPI(title, year), function(res) {
        res = parseAPIResponse(res, {
            'Response': 'False',
        });

        if (res.Response === 'False') {
            addCache(title);
            return null;
        }
        var imdbScore = parseFloat(res.imdbRating);
        var tomatoMeter = getTomatoScore(res, "tomatoMeter");
        var tomatoUserMeter = getTomatoScore(res, "tomatoUserMeter");
        var rating = addCache(title, imdbScore, tomatoMeter, tomatoUserMeter, res.imdbID, year, res.Type);
        if (callback) {
            callback(rating, addArgs);
        }
    });
}

/*
    parse tomato rating from api response object
*/
function getTomatoScore(res, meterType) {
    return res[meterType] === "N/A" ? null : parseInt(res[meterType]);
}

/*
    Given a rating and specific arguments, display to popup
*/
function showPopupRating(rating, args) {
    showInPopup(rating, args, displayRating, "rating");
}

/*
 * Display trailer in popup
 */
function showPopupTrailer(trailer, args) {
    showInPopup(trailer, args, displayTrailer, "trailer");
}

/*
 * Show something inside of the popup
 */
function showInPopup(obj, args, displayFunc, type) {

    if (!args.interval) { // unknown popup
        return;
    }
    var checkVisible = setInterval(function() {
        var $target = $(args.selector);
        if ($target.length) {
            clearInterval(checkVisible);
            updateCache(obj.title); //run the query with the year to update
            clearOld(type, args);
            displayFunc(obj, args);
        }
    }, args.interval);
}

/*
    Call the API with the year and update the rating if neccessary
*/
function updateCache(title) {
    var cached = checkCache(title);
    if (!cached.inCache) return;
    var cachedVal = cached.cachedVal;
    if (cachedVal.year === null) {
        var year = parseYear();
        getRating(title, year, null, function(rating) {
            showPopupRating(rating, getRatingArgs());
        });
        getTrailer(title, year, null, function(trailer) {
            showPopupTrailer(trailer, getTrailerArgs());
        });
    }
}

/*
    Build and display the ratings
*/
function displayRating(rating, args) {
    var imdbHtml = getIMDBHtml(rating, args.imdbClass);
    var tomatoHtml = getTomatoHtml(rating, args.rtClass);
    var $target = $(args.selector);
    $target[args.insertFunc](imdbHtml);
    $target[args.insertFunc](tomatoHtml);
}

/*
 * Build and display the trailer
 */
function displayTrailer(trailer, args) {
    var trailer_id = trailer.trailer_id;
    var trailerHtml = getTrailerLabelHtml(trailer_id, args.trailerClass);
    var $target = $(args.selector);
    $target[args.insertFunc](trailerHtml);
    var $trailer = $('#' + trailer_id);
    $trailer.popover({
        'content': getTrailerPlayerHtml(trailer_id),
        'html': true,
        'trigger': 'manual',
        'placement': function(context, source) {
            var position = $(source).position();

            if (position.top < 110) {
                return "bottom";
            }

            if (position.left > 515) {
                return "right";
            }

            if (position.left < 515) {
                return "left";
            }

            return "top";
        },
    }).on("mouseenter", function() {
        var _this = this;
        $(this).popover("show");
        $(this).siblings(".popover").on("mouseleave", function() {
            $(_this).popover('hide');
        });
    }).on("mouseleave", function() {
        var _this = this;
        setTimeout(function() {
            if (!$(".popover:hover").length) {
                $(_this).popover("hide");
            }
        }, 100);
    });
    $trailer.click(function() {
        $trailer.popover('hide');
    });
}


////////SEARCH AND INDIVIDUAL PAGE HANDLERS //////////
/*
    Determine which search, dvd or watch instantly and display the correct ratings
*/
function isSearchPage() {
    return isPage('Search');
}

function isMoviePage() {
    return isPage('Movie');
}

function isDvdPage() {
    return isPage('dvd.netflix.com');
}

function isPage(key) {
    return document.location.href.indexOf(key) !== -1;
}

/*
    Find ratings for all of the movies found by the search and display them
*/
function displaySearch() {
    var selector = ".agMovie";
    var ratingSelector = SEARCH_SEL.rating.selector;
    var trailerSelector = SEARCH_SEL.trailer.selector;
    $.each($(selector), function(index, target) { // iterate over movies found
        var $target = $(target);
        var year = parseYear($target.find('.year'));
        var title = parseSearchTitle($target);
        var addArgs = {
            'target': $target,
        }; // add the current target so the rating matches the movie found
        getRating(title, year, addArgs, function(rating, addArgs) {
            var selectObject = deepCopy(SEARCH_SEL.rating);
            selectObject.selector = addArgs.target.find(ratingSelector); // store selector to show rating
            displayRating(rating, selectObject);
        });

        getTrailer(title, year, addArgs, function(trailer, addArgs) {
            var selectObject = deepCopy(SEARCH_SEL.trailer);
            selectObject.selector = addArgs.target.find(trailerSelector); // store selector to show trailer
            displayTrailer(trailer, selectObject);
        });
    });

}

/*
 * Display movie and trailer for the movie page
 */
function displayMovie() {
    var selector = "#mdp-metadata-container";
    var $target = $(selector);
    if ($target.length === 0) {
        selector = "#displaypage-overview-details";
        $target = $(selector);
    }
    var year = parseYear($target.find('.year'));
    var title = parseMovieTitle($target);
    var addArgs = {
        'target': $target,
    }; // add the current target so the rating matches the movie found
    getRating(title, year, addArgs, function(rating, addArgs) {
        var selectObject = deepCopy(MOVIE_SEL.rating);
        selectObject.selector = $target.find(MOVIE_SEL.rating.selector);
        displayRating(rating, selectObject);
    });

    getTrailer(title, year, addArgs, function(trailer, addArgs) {
        var selectObject = deepCopy(MOVIE_SEL.trailer);
        if (isPage('WiMovie')) {
            selector += ' > .titleArea';
        }
        selectObject.selector = selector + MOVIE_SEL.trailer.selector;
        displayTrailer(trailer, selectObject);
    });
}

function setupDvdPopupHandler() {
    var $popup = $('#BobMovie');
    $('.agMovie').on('mousenter', function(event) {
        $popup.hide();
    }).on('mouseleave', function(event) {
        $popup.show();
    });

    $popup.on('mouseleave', function(event) {
        $popup.hide();
    });
}

/////////// HTML BUILDERS ////////////
function getIMDBHtml(rating, klass) {
    var score = rating.imdb;
    var html = $('<a class="rating-link" target="_blank" href="' + escapeHTML(getIMDBLink(rating.imdbID)) + '"><div class="imdb imdb-icon star-box-giga-star" title="IMDB Rating"></div></a>');
    if (!score) {
        html.css('visibility', 'hidden');
    } else {
        html.find('.imdb').addClass(klass).append(score.toFixed(1));
    }
    return html;
}

function getTomatoHtml(rating, klass) {
    var html = $('<a class="rating-link" target="_blank" href="' + escapeHTML(getTomatoLink(rating.imdbID)) + '"><span class="tomato tomato-wrapper" title="Rotten Tomato Rating"><span class="rt-icon tomato-icon med"></span><span class="rt-score tomato-score"></span><span class="rt-icon audience-icon med"></span><span class="rt-score audience-score"></span></span></a>');
    if (!rating.tomatoMeter || !rating.tomatoUserMeter) {
        html.css('visibility', 'hidden');
        return html;
    }

    html.find('.tomato-icon').addClass(getTomatoClass(rating.tomatoMeter)).addClass(klass);
    html.find('.tomato-score').append(rating.tomatoMeter + '%');

    html.find('.audience-icon').addClass(getTomatoClass(rating.tomatoUserMeter)).addClass(klass);
    html.find('.audience-score').append(rating.tomatoUserMeter + '%');

    return html;
}

function getTrailerLabelHtml(trailer_id, klass) {
    if (trailer_id === null) {
        return '';
    }
    klass = klass || '';
    var html = $("<a target='_blank' id='" + trailer_id + "' class='" + klass + " trailer-label' href='" + getYouTubeTrailerLink(trailer_id) +
        "'><span class='label label-default'>Trailer</span></a>");
    return html;

}

function getTrailerPlayerHtml(trailer_id, klass) {
    return '<iframe allowfullscreen="1" type="text/html" width="480" height="292" src="http://www.youtube.com/embed/' + trailer_id + '?autoplay=1" frameborder="0"/>';
}


/*
    Helper function for escaping API urls
*/
function escapeHTML(str) {
    return str.replace(/[&"<>]/g, function(m) {
        return {
            "&": "&amp;",
            '"': "&quot;",
            "<": "&lt;",
            ">": "&gt;",
        }[m];
    });
}

function cleanYouTubeId(id) {
    if (id === null) return null;
    return id.split('').filter(function(c) {
        return c.charCodeAt(0) < 255;
    }).join('');
}

/*
 * Merge the properties of two objects into one
 */
function merge(obj1, obj2) {
    for (var attrname in obj2) {
        obj1[attrname] = obj2[attrname];
    }
    return obj1;
}

function deepCopy(object) {
    return $.extend(true, {}, object);
}

///////// INIT /////////////
$(document).ready(function() {
    countUser();

    //poup select types
    POPUP_INS_SEL = {
        'rating': {
            'movies.netflix.com': makeSelectObject('.midBob', 'append', 800, {
                'imdbClass': 'imdb-wi',
            }),
            'dvd.netflix.com': makeSelectObject('.bobMovieRatings', 'append', 800, {
                'imdbClass': 'dvd-popup',
                'rtClass': 'dvd-rt-icon',
            }),
        },
        'trailer': {
            'movies.netflix.com': makeSelectObject('.bobMovieHeader', 'append', 800),
            'dvd.netflix.com': {
                'Movie': makeSelectObject('.bobMovieHeader', 'append', 800),
                'Search': makeSelectObject('.duration', 'append', -1),
            }
        }
    };

    //search select types
    SEARCH_SEL = {
        'rating': makeSelectObject('.bluray', 'append', -1, {
            'imdbClass': 'dvd-search-page',
            'rtClass': 'search-rt-icon',
        }),
        'trailer': makeSelectObject('.synopsis', 'before', 800, {
            'trailerClass': 'dvd-trailer-label',
        }),
    };

    MOVIE_SEL = {
        'rating': makeSelectObject('.title', 'append', -1, {
            'imdbClass': 'dvd-movie',
            'rtClass': 'dvd-rt-icon',
        }),
        'trailer': makeSelectObject(' > span:last', 'append', -1, {
            'trailerClass': 'dvd-trailer-label',
        }),
    };

    addStyle(); //add ratings.css to the page

    if (isMoviePage()) {
        displayMovie();
    }

    if (isDvdPage()) {
        setupDvdPopupHandler();
    }

    if (isSearchPage()) {
        displaySearch(); // check if this is a search page
    } else {
        $.each(HOVER_SEL, function(selector, parser) { //add listeners for each hover selector
            $(document).on('mouseenter', selector, parser, popupHandler);
        });

        //try to prefetch results
        $.each(PREFETCH_SEL, function(selector, parser) {
            prefetchHandler(selector, parser);
        });
    }

});
