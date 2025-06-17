dir=/etc/pacman.d
temp=/tmp/mirrorlist

echo "Updating mirrors..."
rate-mirrors --save=$temp arch > /dev/null 2>&1
sudo mv $temp $dir/mirrorlist
echo "Saved $dir/mirrorlist"

echo "Updating cachyos mirrors..."
rate-mirrors --save=$temp cachyos > /dev/null 2>&1
sudo mv $temp $dir/cachyos-mirrorlist
echo "Saved $dir/cachyos-mirrorlist"

sudo cp $dir/cachyos-mirrorlist $dir/cachyos-v3-mirrorlist
sudo sed -i 's|/$arch/|/$arch_v3/|g' $dir/cachyos-v3-mirrorlist
echo "Saved $dir/cachyos-v3-mirrorlist"