.PHONY: lint extension

lint:
	-jshint -c .jshintrc --exclude-path .jshintignore .

extension: lint
	./deploy/deploy.sh
