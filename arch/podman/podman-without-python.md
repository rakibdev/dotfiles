## cd criu && makepkg -si

podman -> criu -> python. dummy criu avoids pulling python for podman

## sudo pacman -S podman docker-compose

docker-compose because podman-compose written in python

## use podman with docker-compose

1. sudo systemctl enable --now podman.socket
2. podman info and find .sock e.g. /run/user/1000/podman/podman.sock
3. export DOCKER_HOST="unix:///run/user/1000/podman/podman.sock" in .zshrc
