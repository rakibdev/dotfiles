#!/bin/bash

dir=~/Downloads/scripts
source $dir/utils.sh

cursorDir=~/Downloads/cursor-ai
apiUrl="https://cursor.uuid.site/api/versions"

info "Fetching latest Cursor version..."
response=$(curl -s "$apiUrl")
if [ $? -ne 0 ]; then
    error "Unable to fetch version information"
    exit 1
fi

downloadUrl=$(echo "$response" | jq -r '.versions[0].linux.x64')
if [ "$downloadUrl" == "null" ] || [ -z "$downloadUrl" ]; then
    error "Unable to parse download URL"
    exit 1
fi

version=$(echo "$response" | jq -r '.versions[0].version')
info "Latest version: $version"
info "Download URL: $downloadUrl"

# Create cursor directory
mkdir -p "$cursorDir"
cd "$cursorDir"

# Check for existing AppImage files
appImageFile=$(echo "$downloadUrl" | sed 's/.*\///g')
existingAppImage=$(ls Cursor-*.AppImage 2>/dev/null | head -n 1)

if [ -n "$existingAppImage" ]; then
    info "Found existing AppImage: $existingAppImage"
    appImageFile="$existingAppImage"
else
    # Download AppImage
    info "Downloading $appImageFile..."
    aria2c -o "$appImageFile" "$downloadUrl"
    if [ $? -ne 0 ]; then
        error "Download error"
        exit 1
    fi
fi

# Make AppImage executable and extract
chmod +x "$appImageFile"
info "Extracting AppImage..."
./"$appImageFile" --appimage-extract > /dev/null
if [ $? -ne 0 ]; then
    error "Extraction error"
    exit 1
fi

# Move contents from squashfs-root/usr to top level
info "Moving extracted files..."
if [ -d "squashfs-root/usr" ]; then
    mv squashfs-root/usr/* .
    if [ $? -eq 0 ]; then
        info "Files moved successfully"
    else
        error "Unable to move files"
        exit 1
    fi
else
    error "Expected directory structure not found"
    exit 1
fi

# Cleanup
info "Cleaning up..."
rm -rf squashfs-root
rm "$appImageFile"

info "Cursor $version extracted to $cursorDir" 