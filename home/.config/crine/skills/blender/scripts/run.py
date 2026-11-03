import json
import os
import socket
import sys

socket_path = f"{os.environ['XDG_RUNTIME_DIR']}/blender-skill/sock"

client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
client.connect(socket_path)
client.sendall(json.dumps({"code": sys.argv[1]}).encode() + b"\n")

data = b""
while not data.endswith(b"\n"):
    data += client.recv(65536)

print(json.loads(data)["out"])
