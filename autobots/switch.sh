#!/usr/bin/env bash
# Bash script for switching Kubernetes containers.
echo Hope you know what your doing!
echo Please enter version tag!
read version
echo your version tag is $version
# Confirm that new containers should be set in production
echo Do you want to switch it to production? y/n
read -p "Are you sure? " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # do dangerous stuffkubectl set image deployment/rettfinans rettfinans=gcr.io/master-backend/rettfinans:d99f56c49c174db286cff2f10b49f04b7575f7bb
    echo Okey Boss, here we go!
    kubectl set image deployment/rettfinans rettfinans=gcr.io/master-backend/rettfinans:$version
fi
echo Load have been delivered.
echo Mission completed
#kubectl set image deployment/rettfinans rettfinans=gcr.io/master-backend/rettfinans:d99f56c49c174db286cff2f10b49f04b7575f7bb