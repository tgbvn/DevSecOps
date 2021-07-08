#!/bin/bash
while !</dev/tcp/$DB_HOST/$DB_PORT; do sleep 1; done; npm start