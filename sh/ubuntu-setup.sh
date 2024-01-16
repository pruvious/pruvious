#!/bin/bash

# Prompt user to continue
prompt_confirm() {
  while true; do
    echo ""
    echo "==================================================================="
    echo "> Pruvious server setup for Ubuntu 20.04 and 22.04"
    echo "==================================================================="
    echo ""
    echo "This script will do the following:"
    echo "  - Create a new user named 'pruvious' and add it to the sudo group"
    echo "  - Install packages needed for running Nuxt and Pruvious"
    echo "  - Configure the firewall to allow SSH, HTTP, and HTTPS traffic"
    echo ""
    echo "==================================================================="
    echo ""
    read -r -n 1 -p "Do you want to continue? [Y/n] " REPLY
    case $REPLY in
      [yY]|"") echo ; return 0 ;;
      [nN]) echo ; return 1 ;;
      *) printf " \033[31m %s \n\033[0m" "Invalid input"
    esac 
  done
}
prompt_confirm || exit 0

# Create user "pruvious"
sudo adduser --disabled-password --gecos "" pruvious
sudo usermod -aG sudo pruvious
sudo usermod -aG pruvious www-data
sudo echo 'pruvious ALL=(ALL) NOPASSWD: /usr/bin/certbot,/usr/bin/env,/usr/bin/ln,/usr/bin/mv,/usr/bin/mkdir,/usr/bin/rm,/usr/bin/rmdir,/usr/bin/pg_dump,/usr/bin/psql,/usr/bin/tee,/usr/sbin/nginx' | sudo tee /etc/sudoers.d/pruvious > /dev/null
sudo chmod 0440 /etc/sudoers.d/pruvious

# Set up home directory
sudo -u pruvious mkdir /home/pruvious/backups
sudo -u pruvious mkdir /home/pruvious/sites
read -p $'\nEnter webmaster email address (used for SSL certificates from Let\'s encrypt): ' EMAIL; echo $"{ \"count\": 0, \"email\": \"$EMAIL\" }" > /home/pruvious/sites/sites.config.json; unset EMAIL; echo ''
chown pruvious:pruvious /home/pruvious/sites/sites.config.json

# Install packages
sudo apt update
sudo apt install certbot nginx pgloader postgresql postgresql-contrib python3-certbot-nginx ufw unzip zip -y

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx HTTP'
sudo ufw allow 'Nginx HTTPS'
sudo ufw --force enable

# Install NVM, Node.js, and PNPM
su -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash" -s /bin/bash pruvious
sudo -u pruvious bash -c 'source /home/pruvious/.nvm/nvm.sh && nvm install 20.10.0'
sudo -u pruvious bash -c 'source /home/pruvious/.nvm/nvm.sh && nvm alias 20.10.0'
sudo -u pruvious bash -c 'source /home/pruvious/.nvm/nvm.sh && npm install pnpm -g'

# Install pm2
sudo -u pruvious bash -c 'source /home/pruvious/.nvm/nvm.sh && npm install pm2 -g'
sudo -u pruvious env PATH=$PATH:/home/pruvious/.nvm/versions/node/v20.10.0/bin /home/pruvious/.nvm/versions/node/v20.10.0/lib/node_modules/pm2/bin/pm2 startup systemd -u pruvious --hp /home/pruvious

# Configure PostgreSQL
sudo systemctl start postgresql.service
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'pruvious';"

# Create SSH key
sudo -u pruvious mkdir /home/pruvious/.ssh
sudo -u pruvious chmod 0700 /home/pruvious/.ssh
sudo -u pruvious touch /home/pruvious/.ssh/authorized_keys
sudo -u pruvious chmod 0600 /home/pruvious/.ssh/authorized_keys
sudo -u pruvious ssh-keygen -t rsa -N "" -f /home/pruvious/.ssh/id_rsa

# Show next steps
echo ''
echo '==================================================================================================='
echo 'Run the following command in your Nuxt project directory to add this server as a deployment target:'
echo '==================================================================================================='
echo ''
echo "npx pruvious servers add --host=$(ip addr show | awk '/^2: / {p = 1; next} p && /^\s*inet / {gsub(/\/[0-9]+$/, "", $2); print $2; exit}') --name=$(hostname | tr '[:upper:]' '[:lower:]') --private-key='$(sed ':a;N;$!ba;s/\n/\\n/g' /home/pruvious/.ssh/id_rsa)'"

# Add SSH key to authorized_keys
sudo -u pruvious cat /home/pruvious/.ssh/id_rsa.pub >> /home/pruvious/.ssh/authorized_keys
sudo -u pruvious rm /home/pruvious/.ssh/id_rsa
sudo -u pruvious rm /home/pruvious/.ssh/id_rsa.pub
