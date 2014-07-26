.PHONY: lint, extension

lint:
	jshint js/ratings.js

extension:
	./deploy/deploy.sh
