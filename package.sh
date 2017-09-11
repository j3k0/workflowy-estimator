#!/bin/sh

rm -fr workflowy-estimator workflowy-estimator.zip
mkdir -p workflowy-estimator

cp \
  LICENSE README.md \
  manifest.json \
  wfe_icon.png \
  workflowy-estimator.js \
  jquery.min.js \
  debounce.js \
  workflowy-estimator

zip -r workflowy-estimator.zip workflowy-estimator
rm -fr workflowy-estimator
