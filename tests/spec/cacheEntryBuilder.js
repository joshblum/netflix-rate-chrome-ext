define([], function(){
	var cacheEntryBuilder = (function () {
	  
	var withExpiredDate = function withExpiredDate() {
	this.cacheEntry.date = this.now - CACHE_LIFE - 1;
		return this;
	};
  
	var withOldestValidDate = function withOldestValidDate() {
		this.cacheEntry.date = this.now - CACHE_LIFE;
		return this;
	};
  
  	var withFutureDate = function withFutureDate() {
		this.cacheEntry.date = this.now + 1;
		return this;
	};
	
	var withoutCacheVersion = function withoutCacheVersion() {
		delete this.cacheEntry.date;
		return this;
	};
	
	var withoutTrailerId = function withoutTrailerId() {
		delete this.cacheEntry.trailerId;
		return this;
	};
	
	var withObsoleteCacheVersion = function withObsoleteCacheVersion() {
		this.cacheEntry.cacheVersion = CACHE_VERSION + 5;
		return this;
	};
	
	var build = function build() {
		return this.cacheEntry;
	};
  
	var CacheEntryBuilder = function CacheEntryBuilder (now) {
		this.now = now;
		
		this.cacheEntry = {
			date : now,
			cacheVersion : CACHE_VERSION,
			title: 'Nice title',
			trailerId: '1234'
		};
	};
	  
	CacheEntryBuilder.prototype.withExpiredDate = withExpiredDate;
	CacheEntryBuilder.prototype.withOldestValidDate = withOldestValidDate;
	CacheEntryBuilder.prototype.withFutureDate = withFutureDate;
	CacheEntryBuilder.prototype.withoutCacheVersion = withoutCacheVersion;
	CacheEntryBuilder.prototype.withoutTrailerId = withoutTrailerId;
	CacheEntryBuilder.prototype.withObsoleteCacheVersion = withObsoleteCacheVersion;
	CacheEntryBuilder.prototype.build = build;
		
	return {
	    CacheEntryBuilder: CacheEntryBuilder
	};
	}());
	
	return cacheEntryBuilder;
});