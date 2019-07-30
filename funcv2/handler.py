import os
import requests
from git import Repo
import boto3
import subprocess
import shutil

client = boto3.client('codecommit')

def clone(repoName):
    localDir=f'/tmp/{repoName}'
    try:
        shutil.rmtree(localDir)
    except:
        pass
    repoUrl = f"https://github.com/msimpsonnz/{repoName}.git"
    localRepo = Repo.clone_from(repoUrl, localDir)
    print(f'Cloned repo: {repoName}')
    remoteRepo = getOrMakeRepo(repoName)
    print("Created remote repo")
    remote = localRepo.create_remote(name=remoteRepo['repositoryName'], url=remoteRepo['cloneUrlHttp'])
    print('Created remote')
    remote.push(refspec='master:master')
    print('Pushed to master')

def getOrMakeRepo(repoName):
    try:
        ccRepo = client.get_repository(repositoryName=repoName)
    except client.exceptions.RepositoryDoesNotExistException:
        ccRepo = client.create_repository(repositoryName=repoName)
    except:
        print("Somthing else has gone wrong accessing CodeCommit")
        raise Exception("Somthing else has gone wrong accessing CodeCommit")

    print(ccRepo)
    return ccRepo['repositoryMetadata']

#def run(event, context):
#Get a list of repos
repoUrl = requests.get('https://raw.githubusercontent.com/msimpsonnz/gitbackup/master/repo.json')
#Parse JSON
repoList = repoUrl.json()

#Run over each repo
for repoName in repoList["repos"]:
    print(repoName)
    clone(repoName)