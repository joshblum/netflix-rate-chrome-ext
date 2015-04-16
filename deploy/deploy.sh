#! /bin/bash

#update the manifest count
version=`python deploy/deploy.py`
ROOT=`pwd`

#remove old zip and add new one
cd ../
rm chrome-ext.zip
zip -r chrome-ext.zip netflix-rate-chrome-ext/ -x *.git*

# clean git
cd $ROOT
git add manifest.json
git commit -m "Webstore deploy $version"
git push origin master
