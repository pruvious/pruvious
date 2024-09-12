# Docker deployment guide

By: [@flexusma](https://github.com/Flexusma)

This guide provides a quick overview and general guidelines on how to deploy your Pruvious instance using Docker.

The supplied Dockerfile builds a production container you can use to run Pruvious on most container runtimes.
As of the time of writing, Docker, Docker Swarm, and Kubernetes (containerd) have been tested and confirmed working.

Some basic knowledge of Docker and docker-compose is expected throughout this guide.
If you want to learn more about Docker and Compose, please check out the official Docker documentation at https://docs.docker.com/get-started/docker-overview/.

## 1. Building the docker image

### Prerequisites

- Ensure that you have Docker installed on your machine.
- Make sure you have the latest version of your Pruvious project code.

### Building the image

To build the Docker image, run the following command in the root of your project:

```bash
docker build -t pruvious-app .
```

This will create a Docker image with the tag `pruvious-app` on your local machine. You can change this tag if you prefer, but make sure to update it in the supplied docker-compose files if you do.

If you plan on running the image on a different machine than the one you built it on, consider pushing the image to a container registry like Docker Hub.

## 2. Deploying via Portainer/Docker-Compose

The supplied docker-compose files in the `/docker` directory are intended to be a starting point to get you up and running with your image.

### Option 1: Local Build (easy way)

Have docker-compose automatically build an image from your current repository and use that in the deployment.
This is the easiest way to deploy Pruvious with a database on a single system.

#### Step 1: Copy /docker/docker-compose.yml to /

Copy the docker-compose.yml to your repository root (run from the root directory of your repository):

```bash
cp ./docker/docker-compose.yml ./
```

#### Step 2: Run docker-compose to build and deploy

Make sure you are using Compose v2 when running this command:

```bash
docker compose up --build
```

If the above command does not work, you might still be using Compose v1. In that case, run the following instead:

```bash
docker-compose up --build
```

You should now see a Pruvious instance with all of your blocks running on port 3000.

To access your application, open a web browser and navigate to `http://localhost:3000`.

### Option 2: Docker Swarm with Traefik (advanced)

See `/docker/docker-compose.traefik.yml`

This option mainly exists to showcase how we (onesrv.net) have deployed Pruvious in production and provide a starting point for people who are looking to deploy in a similar environment.

If you're considering this option, you likely have experience with Docker and related tools. Detailed explanations of Swarm, Traefik, and Portainer are beyond the scope of this guide, but here are some key points to consider:

- Ensure your Swarm cluster is properly set up and configured.
- Adjust the Traefik labels in the docker-compose file to match your domain and SSL certificate settings.
- Review and modify network configurations as needed for your environment.

## Troubleshooting

If you encounter issues during deployment, try the following:

1. Check Docker logs: `docker logs <container_name>`
2. Ensure all required ports are open and not conflicting with other services.
3. Verify that the database connection string in the environment variables is correct.
4. For Swarm deployments, check that all nodes in the cluster are healthy and communicating properly.
