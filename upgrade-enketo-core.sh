#!/bin/sh

cd webforms/src/lib/enketo-core
git fetch
git checkout master
git submodule update --init --recursive
cd ../../../..
