
FROM node:lts-alpine
# FROM node:11.14.0-alpine
# Create app directory

RUN apk update
RUN apk upgrade

RUN mkdir -p /usr/src/app
# Set workdirr
WORKDIR /usr/src/app
# Install app dependencies
COPY package.json /usr/src/app/
#RUN npm install grpc --build-from-source

# Bundle app source
COPY . /usr/src/app

RUN yarn install
RUN yarn build

# Expose P 3000
EXPOSE 3000

# Start service
CMD [ "yarn", "start" ]
# CMD [ "yarn", "run", "serve" ]

