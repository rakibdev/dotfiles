# open https://fonts.googleapis.com/css2?family=Google+Sans and download latin variant.

for file in *.woff2; do
    woff2_decompress $file
    rm $file
done