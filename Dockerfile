FROM node:16-bullseye

RUN mkdir viz

COPY ./src ./viz/src
COPY ./*json ./viz/
COPY ./*js ./viz/

WORKDIR ./viz/
RUN npm install

EXPOSE 4200
CMD ["npm", "run", "start"]
#CMD ["bash"]
