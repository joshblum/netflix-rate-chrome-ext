#! /bin/bash

#update the manifest count
python deploy/deploy.py

#remove old zip and add new one
cd ../
rm chrome-ext.zip
zip -r chrome-ext.zip netflix-rate-chrome-ext/