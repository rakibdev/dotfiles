dir=/etc/pacman.d
temp=/tmp/mirrorlist

echo "Updating mirrors..."
rate-mirrors --save=$temp arch > /dev/null 2>&1
sudo mv $temp $dir/mirrorlist
echo "Saved $dir/mirrorlist"