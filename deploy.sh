#!/bin/bash
# deploy.sh

# Build the Angular project
echo "Building the Angular project..."
ng build --configuration=production

#echo "Patching .htaccess file..."
#cp ./.htaccess ./dist/fonoteca/browser/.htaccess
# chown campus:www-data ./dist/browser/.htaccess

# Upload to remote server
echo "Uploading files to the remote server..."
rsync -avz -e "ssh -p 40322" --delete dist/cruce-game/ root@pontes.ro:/var/www/campus/dev
# Check if the upload was successful
if [ $? -eq 0 ]; then
    echo "Files uploaded successfully."
else
    echo "Error uploading files. Please check your connection and try again."
    exit 1
fi
