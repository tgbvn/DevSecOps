FROM node
WORKDIR /usr/src/app
COPY src/package*.json ./
RUN npm install
COPY src/ .
EXPOSE 3000
ADD src/start.sh /usr/local/bin/start.sh
RUN chmod 0755 /usr/local/bin/start.sh
CMD ["/usr/local/bin/start.sh"]

