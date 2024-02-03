# open https://fonts.googleapis.com/css2?family=Google+Sans and download latin variant.
# woff2_decompress requires woff2 package.

for file in *.woff2; do
    woff2_decompress $file
    rm $file
done