# Docker deployment guide

This guide will give you a quick overview and general guidelines on how to deploy your pruvious instance using docker.

The supplied Dockerfile builds a production container you can use to run pruvious on most container runtimes.
As of the time of writing, Docker, Docker Swarm and Kubernetes (containerd) have been tested.

Some basic knowledge of docker and docker-compose is expected throughout this guide.
If you want to learn more about docker and compose feel free to check out the docker documentation at https://docs.docker.com/get-started/docker-overview/.


# 1. Building the docker image

## Prerequisites

    Ensure that you have Docker installed on your machine.

### Building the image

To build the Docker image, run the following command in the root of your project:

```bash
docker build -t pruvious-app .
```
This will create a Docker image with the tag `pruvious-app` on your local machine. You can change this tag if you like, but make sure to change it in the supplied docker-compose files.
If you plan on running the image on another machine than the one you built it on, please consider pushing the image to a container registry like docker hub.

# 2. Deploying via Portainer/Docker-Compose

The supplied docker-compose files in the `/docker` directory are supposed to be a starting point to get you up and running with your image.

## Option 1: Local Build (easy way)
Have docker-compose automatically build an image from your current repository, and use that in the deployment.
This is the easiest way to deploy pruvious with a database on a system.

### Step 1: Copy /docker/docker-compose.yml to /
Copy the docker-compose.yml to your repository root (run from the root directory of you repository):
```bash
cp ./docker/docker-compose.yml ./
```

### Step 2: Run docker-compose to build and deploy
Make sure you are using compose v2 when running this
```bash
docker compose up --build
```
If above command does not work, you might still be using compose v1. Run the following instead:
```bash
docker-compose up --build
```

### Congrats
You should now see a pruvious instance with all of your blocks on port 3000 :)


## Option 2: Docker Swarm with traefik (hard)
See `/docker/docker-compose.traefik.yml`

This option mainly exists to showcase how we (onesrv.net) have deployed pruvious in production and provide a starting point for people who are looking to deploy in a similar environment.
If you are reading this, you probably know your fair share of docker and other tools. Going into detail on swarm, traefik and portainer would be too much for here.
