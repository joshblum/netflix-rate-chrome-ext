// s (NEW!)	 string (optional)	 title of a movie to search for
// i	 string (optional)	 a valid IMDb movie id
// t	 string (optional)	 title of a movie to return
// y	 year (optional)	 year of the movie
// r	 JSON, XML	 response data type (JSON default)
// plot	 short, full	 short or extended plot (short default)
// callback	 name (optional)	 JSONP callback name
// tomatoes	 true (optional)	 adds rotten tomatoes data
var IMDB_API =  "http://www.omdbapi.com/?tomatoes=true&t=";
var HOVER_SEL = '.bobbable .popLink';
var CACHE = {};
var POPUP_SEL = ".midBob";

function getIMDBAPI(title) {
	return IMDB_API + title
}

function getRTAPI(title) {
	title = encodeURIComponent(title);
	return RT_API + "&q=" + title
}

function getTitle(e) {
	var url = $(e.target).context.href;
	title = url.split('&t=')[1]
	title = decodeURIComponent(title).replace(/\+/g, ' ');
	return title
}

function addCache(title, imdb, tomato) {
	var rating = {
		'imdb' : imdb,
		'tomato' : tomato,
	}

	CACHE[title] = rating;
	return rating
}

function getRating(title, callback) {
	if (title in CACHE) {
		callback(CACHE[title])
	}
	$.get(getIMDBAPI(title), function(res){
		res = JSON.parse(res)
		if (res.Response === 'False'){
			addCache(title, null, null)
			return null
		}
		var IMDBscore = parseFloat(res.imdbRating);
		var tomatoScore = res.tomatoUserMeter === "N/A" ? null : parseInt(res.tomatoUserMeter);
		var rating = addCache(title, IMDBscore, tomatoScore);
		callback(rating)
	})
}

function showRatings(ratings) {
	var html = '<div>'
	$(POPUP_SEL).prepend()
}

$(document).on('mouseenter', HOVER_SEL, function(e){
	var title = getTitle(e)
	getRating(title, function(rating){
		console.log(rating)
	});
	console.log(CACHE)
})
