#!/bin/bash
# sam package \
#     --template-file ./func/template.yaml \
#     --s3-bucket mjs-personal-s3 \
#     --output-template-file ./func/packaged-template.yaml \
#     --profile personal

# sam deploy \
#     --template-file ./func/packaged-template.yaml \
#     --stack-name git-backup-stack \
#     --capabilities CAPABILITY_IAM \
#     --profile personal

cd ./func/package
zip -r9 ${OLDPWD}/function.zip .
cd ../
zip -g function.zip handler.py credential-helper.py .gitconfig

aws lambda update-function-code --function-name git-backup --zip-file fileb://function.zip --profile personal
