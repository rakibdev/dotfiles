#!/bin/bash
DIR="/tmp/double-click-fix"
mkdir -p $DIR
cp $(dirname "$0")/* $DIR
cd $DIR
makepkg -f
sudo pacman -U --noconfirm double-click-fix-1.0-1-x86_64.pkg.tar.zst
sudo systemctl restart double-click-fix
rm -rf $DIR
