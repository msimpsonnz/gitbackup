import os
import requests
from git import Repo
import boto3

#session = boto3.Session(profile_name='personal')
#client = session.client('codecommit')
client = boto3.client('codecommit')
debug = False

def clone(repoName):
    localDir=f'/tmp/{repoName}'
    os.mkdir(localDir)
    repoUrl = f"https://github.com/msimpsonnz/{repoName}.git"
    localRepo = Repo.clone_from(repoUrl, localDir)
    remoteRepo = getOrMakeRepo(repoName)
    print("Created remote repo")
    remote = localRepo.create_remote(name=remoteRepo['repositoryName'], url=remoteRepo['cloneUrlHttp'])
    remote.push(refspec='master:master')

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

def run(event, context):
    #Get a list of repos
    repoUrl = requests.get('https://raw.githubusercontent.com/msimpsonnz/gitbackup/master/repo.json')
    #Parse JSON
    repoList = repoUrl.json()

    #Run over each repo
    for repoName in repoList["repos"]:
        print(repoName)
        clone(repoName)