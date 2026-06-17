#!/bin/bash

echo "Obteniendo IPs actualizadas de MongoDB Atlas vía Cloudflare..."

NODE1="ac-9hkstf2-shard-00-00.b7ulcvl.mongodb.net"
NODE2="ac-9hkstf2-shard-00-01.b7ulcvl.mongodb.net"
NODE3="ac-9hkstf2-shard-00-02.b7ulcvl.mongodb.net"

# Bypass total: Consultamos directo a la IP de Cloudflare (1.1.1.1) sin validar certs (-k)
IP1=$(curl -s -k -H "accept: application/dns-json" "https://1.1.1.1/dns-query?name=$NODE1&type=A" | grep -o '"data":"[^"]*"' | grep -v '[a-zA-Z]' | cut -d'"' -f4 | head -n 1)
IP2=$(curl -s -k -H "accept: application/dns-json" "https://1.1.1.1/dns-query?name=$NODE2&type=A" | grep -o '"data":"[^"]*"' | grep -v '[a-zA-Z]' | cut -d'"' -f4 | head -n 1)
IP3=$(curl -s -k -H "accept: application/dns-json" "https://1.1.1.1/dns-query?name=$NODE3&type=A" | grep -o '"data":"[^"]*"' | grep -v '[a-zA-Z]' | cut -d'"' -f4 | head -n 1)

echo "Nuevas IPs detectadas: $IP1, $IP2, $IP3"

# Seguro anti-fallos: Si las variables están vacías, detenemos el script aquí
if [ -z "$IP1" ] || [ -z "$IP2" ] || [ -z "$IP3" ]; then
    echo "ERROR: La red bloqueó la consulta a Cloudflare o no hay internet. Abortando."
    exit 1
fi

# Detener y borrar el contenedor viejo
isula rm -f api_cafeteria 2>/dev/null

echo "Levantando contenedor con IPs actualizadas..."
isula run -d --network host --name api_cafeteria \
  --add-host=$NODE1:$IP1 \
  --add-host=$NODE2:$IP2 \
  --add-host=$NODE3:$IP3 \
  -v /opt/cafeteria:/app \
  --env-file /opt/cafeteria/.env \
  api-cafeteria:latest \
  uvicorn main:app --host 0.0.0.0 --port 8010

echo "¡Contenedor arriba! Verificando en 3 segundos..."
sleep 3
curl -X GET http://localhost:8010/test-db
