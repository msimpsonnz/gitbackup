#!/bin/bash
read -p 'Email: ' EMAIL
echo $EMAIL
read -p 'LayerAWSCLI: ' LayerAWSCLI
echo $LayerAWSCLI

cd ./sam
sam build --base-dir ../func --parameter-overrides ParameterKey=LayerAWSCLI,ParameterValue=$LayerAWSCLI
sam package \
    --output-template-file packaged-template.yaml \
    --s3-bucket mjs-personal-s3 \
    --profile personal

sam deploy \
    --template-file packaged-template.yaml \
    --stack-name git-backup-stack \
    --capabilities CAPABILITY_IAM \
    --profile personal \
    --parameter-overrides NotificationEmail=$EMAIL LayerAWSCLI=$LayerAWSCLI

# cd ./func/package
# zip -r9 ${OLDPWD}/function.zip .
# cd ../
# zip -g function.zip handler.py .gitconfig

# aws lambda update-function-code --function-name git-backup --zip-file fileb://function.zip --profile personal
